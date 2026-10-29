import { POSITION_ORDER, POSITIONS } from '@/lib/constants/leadership.constants'
import { LeadershipPosition } from '@prisma/client'

export function electionReminderTemplate(
  firstName: string,
  year: number,
  currentHolders: Partial<Record<LeadershipPosition, string[]>>
) {
  const ballot = POSITION_ORDER.filter((p) => POSITIONS[p].isElected)
    .map((p) => {
      const holders = currentHolders[p]?.join(', ')
      return `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:15px;font-weight:700;color:#0f172a;">${POSITIONS[p].label}</td>
              <td align="right" style="font-size:11px;font-family:monospace;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;white-space:nowrap;">
                ${POSITIONS[p].seats} ${POSITIONS[p].seats === 1 ? 'seat' : 'seats'}
              </td>
            </tr>
            ${
              holders
                ? `
            <tr>
              <td colspan="2" style="padding-top:3px;font-size:12px;color:#94a3b8;">
                Currently ${holders}
              </td>
            </tr>`
                : `
            <tr>
              <td colspan="2" style="padding-top:3px;font-size:12px;color:#7c3aed;">
                New position
              </td>
            </tr>`
            }
          </table>
        </td>
      </tr>`
    })
    .join('')

  const appointed = POSITION_ORDER.filter((p) => !POSITIONS[p].isElected)
    .map((p) => {
      const holders = currentHolders[p]?.join(', ')
      const changing = holders && holders !== 'Gregory Row'
      return `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:15px;font-weight:700;color:#94a3b8;">${POSITIONS[p].label}</td>
              <td align="right" style="font-size:11px;font-family:monospace;letter-spacing:0.12em;text-transform:uppercase;color:#cbd5e1;white-space:nowrap;">
                Sqysh
              </td>
            </tr>
            ${
              changing
                ? `
            <tr>
              <td colspan="2" style="padding-top:3px;font-size:12px;color:#cbd5e1;">
                Taking over from ${holders}
              </td>
            </tr>`
                : ''
            }
          </table>
        </td>
      </tr>`
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
            The election is tomorrow.
          </h1>
        </td></tr>

        <tr><td style="padding:0 0 24px;">
          <p style="margin:0;font-size:15px;color:#475569;line-height:1.65;">
            Hey ${firstName}, we're electing leadership for the ${year}&ndash;${year + 1} season at tomorrow's meeting. Voting happens live in the room during the 10-minute presentation.
          </p>
        </td></tr>

        <tr><td style="padding:0 0 22px;">
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
        </td></tr>

        <tr><td style="padding:0 0 10px;">
          <p style="margin:0;font-size:11px;font-family:monospace;letter-spacing:0.18em;text-transform:uppercase;color:#7c3aed;">
            On the ballot
          </p>
        </td></tr>

        <tr><td style="padding:0 0 26px;">
          <table width="100%" cellpadding="0" cellspacing="0">${ballot}</table>
        </td></tr>

        <tr><td style="padding:0 0 8px;">
          <p style="margin:0;font-size:11px;font-family:monospace;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;">
            Not on the ballot
          </p>
        </td></tr>

        <tr><td style="padding:0 0 26px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${appointed}
          </table>
        </td></tr>

        <tr>
          <td style="padding:0 0 26px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="background:#f5f3ff;padding:18px 20px;border-left:2px solid #7c3aed;">
                <p style="margin:0 0 6px;font-size:11px;font-family:monospace;letter-spacing:0.18em;text-transform:uppercase;color:#7c3aed;">
                  Two things before you come
                </p>
                <p style="margin:0 0 10px;font-size:14px;color:#0f172a;line-height:1.6;">
                  <strong>1.</strong> Make sure you can sign into the app tonight. If you can't get in, reply to this email and I'll sort it out before the morning.
                </p>
                <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;">
                  <strong>2.</strong> Have your phone with you. The ballot opens on your screen when we start.
                </p>
              </td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 0 14px;">
            <p style="margin:0;font-size:15px;color:#475569;line-height:1.65;">
              This sets the leadership for the next year, so the more of us in the room the better. Think about who you want in each seat before you get there.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 0 30px;">
            <p style="margin:0;font-size:15px;color:#475569;line-height:1.65;">
              Can't make it tomorrow? Reply and I'll send you a link so you can vote beforehand.
            </p>
          </td>
        </tr>

        <tr><td style="padding-top:22px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:10px;font-family:monospace;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;">
            Thursday 7:00 AM &middot; 25 N Common St, Lynn
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim()
}
