'use server'

import { CreateVisitorInput } from '@/types/visitor.types'
import { auth } from '../../auth'
import { emailRegex } from '../../utils/regex'
import { buildLogMessage, getRequestContext } from '../../utils/log.utils'
import { getActor } from '../user/getActor'
import prisma from '@/prisma/client'
import { chapterId } from '../../constants/api/chapterId'
import { createLog } from '../../utils/api/createLog'
import { resend } from '../../resend'
import { visitorInviteTemplate } from '../../email-templates/visitor.template'

export async function createVisitor(input: CreateVisitorInput): Promise<{
  success: boolean
  data?: { id: string }
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'You need to be signed in to add a visitor.' }
  }

  const { firstName, lastName, email, company, industry, phone, visitDate } = input

  // Field-specific validation so the user knows exactly what to fix
  if (!firstName?.trim()) {
    return { success: false, error: 'First name is required.' }
  }
  if (!lastName?.trim()) {
    return { success: false, error: 'Last name is required.' }
  }
  if (!email?.trim()) {
    return { success: false, error: 'Email is required.' }
  }
  if (!emailRegex.test(email)) {
    return { success: false, error: "That email address doesn't look right. Please double-check it." }
  }
  if (!company?.trim()) {
    return { success: false, error: 'Company is required.' }
  }
  if (!industry?.trim()) {
    return { success: false, error: 'Industry is required.' }
  }
  if (!visitDate) {
    return { success: false, error: 'Please select a visit date.' }
  }

  // Normalize date input (handles both YYYY-MM-DD strings and ISO strings)
  const dateOnly = typeof visitDate === 'string' ? visitDate.slice(0, 10) : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return { success: false, error: 'The visit date is invalid. Please pick a Thursday from the list.' }
  }

  const visitDateLocal = new Date(`${dateOnly}T12:00:00`)
  if (isNaN(visitDateLocal.getTime())) {
    return { success: false, error: 'The visit date is invalid. Please pick a Thursday from the list.' }
  }
  if (visitDateLocal.getDay() !== 4) {
    return { success: false, error: 'Visits can only be scheduled for Thursdays.' }
  }

  const [context, actor] = await Promise.all([
    getRequestContext().catch(() => null),
    getActor(session).catch(() => 'Unknown')
  ])

  let createdVisitorId: string | null = null

  try {
    // Step 1: Create the visitor record
    const visitor = await prisma.visitor.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        company: company.trim(),
        industry: industry.trim(),
        phone: phone?.trim() || null,
        visitDate: visitDateLocal,
        chapterId,
        invitedById: session.user.id
      }
    })
    createdVisitorId = visitor.id

    // Step 2: Look up VisitorDay for this Thursday (if one exists, connect it)
    const start = new Date(`${dateOnly}T00:00:00.000Z`)
    const end = new Date(`${dateOnly}T23:59:59.999Z`)

    const visitorDay = await prisma.visitorDay
      .findFirst({
        where: { chapterId, date: { gte: start, lte: end } },
        select: { id: true, presenterName: true, presenterCompany: true }
      })
      .catch((err) => {
        console.error('createVisitor: VisitorDay lookup failed (non-fatal):', err)
        return null
      })

    if (visitorDay) {
      await prisma.visitor
        .update({
          where: { id: visitor.id },
          data: {
            visitorDay: {
              connect: { id: visitorDay.id }
            }
          }
        })
        .catch((err) => {
          console.error('createVisitor: failed to link visitor to VisitorDay (non-fatal):', err)
        })
    }

    // Step 3: Build the date label and send the invite email
    function ordinal(n: number): string {
      const s = ['th', 'st', 'nd', 'rd']
      const v = n % 100
      return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
    }
    const dateLabel = `${visitDateLocal.toLocaleDateString('en-US', { month: 'long' })} ${ordinal(visitDateLocal.getDate())}, ${visitDateLocal.getFullYear()}`

    const emailResult = await resend.emails
      .send({
        from: 'Coastal Referral Exchange <noreply@coastalreferralxchange.com>',
        to: email.trim(),
        bcc: session.user.email,
        subject: `You're invited to CORE on ${dateLabel}`,
        html: visitorInviteTemplate({
          visitorFirstName: firstName.trim(),
          invitedByName: actor,
          visitDate: dateLabel,
          presenterName: visitorDay?.presenterName,
          presenterCompany: visitorDay?.presenterCompany
        })
      })
      .catch((err) => {
        console.error('createVisitor: Resend email failed (non-fatal):', err)
        return null
      })

    // Step 4: Log success (with note if email failed)
    if (context) {
      const emailNote = emailResult ? '' : ' (invite email failed to send)'
      const visitTypeNote = visitorDay ? ' (Visitor Day)' : ' (regular meeting)'
      const logMessage = await buildLogMessage(
        `added visitor ${firstName} ${lastName} (${email})${visitTypeNote}${emailNote}`,
        actor,
        context
      )
      await createLog('info', logMessage, {
        action: 'CREATE_VISITOR',
        entityId: visitor.id,
        userId: session.user.id,
        chapterId,
        emailSent: Boolean(emailResult)
      }).catch(() => null)
    }

    return { success: true, data: { id: visitor.id } }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('createVisitor failed:', err)

    if (context) {
      const logMessage = await buildLogMessage(
        `failed to add visitor ${firstName} ${lastName} (${company}) — ${errorMessage}`,
        actor,
        context
      ).catch(() => `${actor} failed to add visitor ${firstName} ${lastName}: ${errorMessage}`)
      await createLog('error', logMessage, {
        action: 'CREATE_VISITOR',
        userId: session.user.id,
        chapterId,
        errorMessage,
        errorStack: err instanceof Error ? err.stack : undefined,
        visitorCreated: Boolean(createdVisitorId),
        visitorId: createdVisitorId
      }).catch(() => null)
    }

    // Decide what to tell the user based on whether the visitor was actually created
    if (createdVisitorId) {
      return {
        success: true,
        data: { id: createdVisitorId },
        error: 'Visitor was added, but the invite email may not have been sent. You can let them know directly.'
      }
    }

    // Map common Prisma errors to clear messages
    if (errorMessage.includes('Unique constraint')) {
      return { success: false, error: 'This visitor has already been added for that date.' }
    }
    if (errorMessage.includes('Foreign key constraint')) {
      return { success: false, error: 'Something is wrong with your chapter setup. Please contact support.' }
    }

    return {
      success: false,
      error:
        "We couldn't add this visitor right now. Please try again in a moment, or contact support if it keeps happening."
    }
  }
}
