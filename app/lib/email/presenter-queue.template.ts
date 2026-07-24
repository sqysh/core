export const presenterQueueTemplate = (
  memberName: string,
  schedule: { name: string; company: string; date: string; isNext: boolean; type: string }[],
  dashboardUrl: string
) => {
  const year = new Date().getFullYear()

  const rows = schedule
    .slice(0, 8)
    .map((s, i) => {
      const color = s.type === 'off' ? '#ef4444' : s.type === 'visitor' ? '#d97706' : s.isNext ? '#0c1e2e' : '#334155'
      const numColor =
        s.type === 'off' ? '#fca5a5' : s.type === 'visitor' ? '#fbbf24' : s.isNext ? '#0284c7' : '#94a3b8'

      return `
  <tr style="opacity: ${Math.max(0.25, 1 - i * 0.09)};">
    <td style="padding: 10px 16px; border-bottom: 1px solid #e0f2fe; width: 24px;">
      <span style="color: ${numColor}; font-size: 11px; font-family: 'SF Mono', 'Fira Code', monospace; font-weight: 700;">
        ${s.type === 'presenter' ? String(i + 1).padStart(2, '0') : '—'}
      </span>
    </td>
    <td style="padding: 10px 16px; border-bottom: 1px solid #e0f2fe;">
      <p style="margin: 0; color: ${color}; font-size: 14px; font-weight: ${s.isNext ? '800' : '500'};">
        ${s.name}${s.isNext ? ' <span style="color: #0284c7; font-size: 11px; font-family: \'SF Mono\', monospace; text-transform: uppercase; letter-spacing: 0.1em; margin-left: 6px;">Next →</span>' : ''}
      </p>
    </td>
    <td style="padding: 10px 16px; border-bottom: 1px solid #e0f2fe; text-align: right; white-space: nowrap;">
      <span style="color: #64748b; font-size: 12px; font-family: 'SF Mono', 'Fira Code', monospace;">
        ${s.date}
      </span>
    </td>
  </tr>
  `
    })
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presenter Schedule — Coastal Referral Exchange</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding: 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-top: 3px solid #0284c7;">

          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px;">
              <p style="margin: 0 0 4px 0; color: #0284c7; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                Coastal Referral Exchange
              </p>
              <h1 style="margin: 0; color: #0c1e2e; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
                Presenter Schedule
              </h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #e0f2fe;"></div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 32px 16px;">
              <p style="margin: 0 0 6px 0; color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                Hello
              </p>
              <p style="margin: 0 0 16px 0; color: #0c1e2e; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">
                ${memberName},
              </p>
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Here's a look at what's coming up over the next few weeks.
              </p>
            </td>
          </tr>

          <!-- Schedule table -->
          <tr>
            <td style="padding: 0 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e0f2fe;">
                <tr style="background-color: #f0f9ff;">
                  <td style="padding: 8px 16px; border-bottom: 1px solid #e0f2fe;">
                    <span style="color: #0284c7; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">#</span>
                  </td>
                  <td style="padding: 8px 16px; border-bottom: 1px solid #e0f2fe;">
                    <span style="color: #0284c7; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">Member</span>
                  </td>
                  <td style="padding: 8px 16px; border-bottom: 1px solid #e0f2fe; text-align: right;">
                    <span style="color: #0284c7; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">Date</span>
                  </td>
                </tr>
                ${rows}
              </table>

              <!-- Fade overlay -->
              <div style="height: 48px; background: linear-gradient(to bottom, transparent, #ffffff); margin-top: -48px; position: relative; z-index: 1; pointer-events: none;"></div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 8px 32px 24px;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                View Full Schedule →
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #e0f2fe;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 8px;">
              <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 11px; font-family: 'SF Mono', 'Fira Code', monospace; letter-spacing: 0.08em;">
                © ${year} Coastal Referral Exchange
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 20px;">
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                Questions? Contact <a href="mailto:greg@sqysh.com" style="color: #0284c7; text-decoration: none; font-weight: 600;">Sqysh</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}
