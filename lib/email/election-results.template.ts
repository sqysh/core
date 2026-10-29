import { POSITION_ORDER, POSITIONS } from '@/lib/constants/leadership.constants'
import { BALLOT_QUESTIONS } from '@/lib/constants/questions.constants'
import { LeadershipPosition, QuestionAnswer } from '@prisma/client'

export interface QuestionTally {
  key: string
  total: number
  counts: Record<QuestionAnswer, number>
}

export function electionResultsTemplate(
  firstName: string,
  year: number,
  holders: Partial<Record<LeadershipPosition, string[]>>,
  questions: QuestionTally[]
) {
  const rows = POSITION_ORDER.map((p) => {
    const names = holders[p]?.join(', ') ?? '—'
    const meta = POSITIONS[p]
    return `
      <tr>
        <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:11px;font-family:monospace;letter-spacing:0.15em;text-transform:uppercase;color:#7c3aed;padding-bottom:3px;">
                ${meta.label}${!meta.isElected ? ' · appointed' : ''}
              </td>
            </tr>
            <tr>
              <td style="font-size:17px;font-weight:700;color:#0f172a;line-height:1.35;">${names}</td>
            </tr>
          </table>
        </td>
      </tr>`
  }).join('')

  const questionBlocks = questions
    .map((q) => {
      const def = BALLOT_QUESTIONS.find((b) => b.key === q.key)
      if (!def) return ''

      const top = Math.max(...def.options.map((o) => q.counts[o.value] ?? 0))

      const bars = def.options
        .map((o) => {
          const count = q.counts[o.value] ?? 0
          const pct = q.total ? Math.round((count / q.total) * 100) : 0
          const leading = count === top && count > 0
          return `
          <tr>
            <td style="padding:4px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="90" style="font-size:12px;font-family:monospace;letter-spacing:0.08em;text-transform:uppercase;color:${leading ? '#7c3aed' : '#94a3b8'};">
                    ${o.label}
                  </td>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
                      <tr>
                        <td width="${pct}%" style="background:${leading ? '#7c3aed' : '#cbd5e1'};height:14px;font-size:0;line-height:0;">&nbsp;</td>
                        <td style="font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                  <td width="34" align="right" style="font-size:15px;font-weight:700;color:${leading ? '#0f172a' : '#94a3b8'};">
                    ${count}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
        })
        .join('')

      return `
      <tr><td style="padding:0 0 22px;">
        <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#0f172a;line-height:1.4;">${def.title}</p>
        <p style="margin:0 0 9px;font-size:11px;font-family:monospace;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;">
          ${q.total} responded
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">${bars}</table>
      </td></tr>`
    })
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <tr><td style="padding:0 0 28px;">
          <p style="margin:0;font-size:11px;font-family:monospace;letter-spacing:0.2em;text-transform:uppercase;color:#7c3aed;">
            Coastal Referral Exchange
          </p>
        </td></tr>

        <tr><td style="padding:0 0 8px;">
          <h1 style="margin:0;font-size:30px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;line-height:1.1;">
            Your ${year}&ndash;${year + 1} leadership.
          </h1>
        </td></tr>

        <tr><td style="padding:0 0 26px;">
            <p style="margin:0;font-size:15px;color:#475569;line-height:1.65;">
                Hey ${firstName}, here are the results from this morning.
            </p>
        </td></tr>

        <tr><td style="padding:0 0 30px;">
          <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>

        ${
          questionBlocks
            ? `<tr><td style="padding:0 0 12px;">
                 <p style="margin:0;font-size:11px;font-family:monospace;letter-spacing:0.18em;text-transform:uppercase;color:#7c3aed;">
                   Group questions
                 </p>
               </td></tr>
               ${questionBlocks}`
            : ''
        }

        <tr><td style="padding:10px 0 30px;">
            <p style="margin:0;font-size:15px;color:#475569;line-height:1.65;">
                Thanks to everyone who served this past year, and to everyone stepping into a new seat. New terms start at next Thursday's meeting.
            </p>
        </td></tr>

        <tr><td style="padding-top:22px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:10px;font-family:monospace;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;">
            Coastal Referral Exchange
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim()
}
