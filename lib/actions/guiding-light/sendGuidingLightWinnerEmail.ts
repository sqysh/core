'use server'

import { resend } from '@/lib/resend/resend'

interface SendGuidingLightWinnerEmailProps {
  winnerName: string
  winnerEmail: string
  judgedByName: string
  meetingDate: Date
}

export async function sendGuidingLightWinnerEmail({
  winnerName,
  winnerEmail,
  judgedByName,
  meetingDate
}: SendGuidingLightWinnerEmailProps) {
  const firstName = winnerName.split(' ')[0]
  const formattedDate = meetingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York'
  })

  await resend.emails.send({
    from: 'CORE <hello@coastalreferralxchange.com>',
    to: winnerEmail,
    subject: `🏆 You're this week's Guiding Light`,
    html: `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 16px;">
            <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;">

                <!-- Logo -->
                <tr>
                    <td style="padding:0 0 32px;">
                    <p style="margin:0;font-size:11px;font-family:monospace;letter-spacing:0.2em;text-transform:uppercase;color:#0284c7;">
                        Coastal Referral Exchange
                    </p>
                    </td>
                </tr>

                <!-- Trophy -->
                <tr>
                    <td align="center" style="padding:0 0 8px;">
                    <p style="margin:0;font-size:52px;">🏆</p>
                    </td>
                </tr>

                <!-- Heading -->
                <tr>
                    <td align="center" style="padding:0 0 8px;">
                    <p style="margin:0;font-size:11px;font-family:monospace;letter-spacing:0.25em;text-transform:uppercase;color:#64748b;">
                        This Week's Guiding Light
                    </p>
                    <h1 style="margin:8px 0 0;font-size:32px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;line-height:1;">
                        ${firstName}, you won.
                    </h1>
                    </td>
                </tr>

                <!-- Divider -->
                <tr>
                    <td style="padding:24px 0;">
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td style="padding:0 0 24px;">
                    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.65;">
                        Your 60 seconds stood out at the <strong style="color:#0f172a;">${formattedDate}</strong> meeting.
                        <strong style="color:#0f172a;">${judgedByName}</strong> selected you as this week's Guiding Light.
                    </p>
                    <p style="margin:0;font-size:15px;color:#475569;line-height:1.65;">
                        Next week, the torch is yours — you'll judge the 60 seconds and select the next Guiding Light.
                    </p>
                    </td>
                </tr>

                <!-- Next week callout -->
                <tr>
                    <td style="padding:0 0 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                        <td style="border-left:2px solid #0284c7;padding:16px 20px;">
                            <p style="margin:0 0 4px;font-size:10px;font-family:monospace;letter-spacing:0.18em;text-transform:uppercase;color:#0284c7;">
                            Next Thursday
                            </p>
                            <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.5;">
                            You'll open the floor for 60 seconds, listen closely, and at the end — select the member who delivered the best presentation. The group will find out live on the TV.
                            </p>
                        </td>
                        </tr>
                    </table>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding-top:24px;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:10px;font-family:monospace;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;">
                        Coastal Referral Exchange · North Shore Chapter
                    </p>
                    </td>
                </tr>

                </table>
            </td>
            </tr>
        </table>
        </body>
        </html>
        `.trim()
  })
}
