export const coreTemplate = (memberName: string) => {
  const year = new Date().getFullYear()

  const actions = [
    {
      label: 'Meeting',
      title: 'Face-2-Face',
      body: 'A 1-on-1 with a fellow member',
      href: 'https://coastalreferralxchange.com/dashboard?action=f2f',
      color: '#0284c7'
    },
    {
      label: 'Referral',
      title: 'Give a Referral',
      body: 'Pass business to a fellow member',
      href: 'https://coastalreferralxchange.com/dashboard?action=referral',
      color: '#0891b2'
    },
    {
      label: 'Thank You',
      title: 'Closed Business',
      body: 'Thank a member for business that closed',
      href: 'https://coastalreferralxchange.com/dashboard?action=closed',
      color: '#059669'
    }
  ]

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Log Your Activities — Coastal Referral Exchange</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
        <tr>
          <td style="padding: 24px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-top: 3px solid #0284c7;">

              <!-- Header -->
              <tr>
                <td style="padding: 22px 24px 14px;">
                  <p style="margin: 0 0 3px 0; color: #0284c7; font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                    Coastal Referral Exchange
                  </p>
                  <h1 style="margin: 0 0 10px 0; color: #0c1e2e; font-size: 23px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.15;">
                    Hey ${memberName} —
                  </h1>
                  <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                    Anything to log from this week? Tap one below.
                  </p>
                </td>
              </tr>

              <!-- Actions -->
              <tr>
                <td style="padding: 0 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${actions
                      .map(
                        (a, i) => `
                    <tr>
                      <td style="border-top: 1px solid #e2e8f0; padding: 0;">
                        <a href="${a.href}" style="display: block; text-decoration: none; padding: 15px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0 0 2px 0; color: ${a.color}; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                                  ${a.label}
                                </p>
                                <p style="margin: 0 0 2px 0; color: #0c1e2e; font-size: 16px; font-weight: 800; letter-spacing: -0.02em;">
                                  ${a.title}
                                </p>
                                <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.4;">
                                  ${a.body}
                                </p>
                              </td>
                              <td width="28" style="vertical-align: middle; text-align: right;">
                                <span style="color: ${a.color}; font-size: 18px; font-weight: 700;">&rarr;</span>
                              </td>
                            </tr>
                          </table>
                        </a>
                      </td>
                    </tr>`
                      )
                      .join('')}
                    <tr>
                      <td style="border-top: 1px solid #e2e8f0; font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 18px 24px 22px;">
                  <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px; line-height: 1.55;">
                    Questions? Just reply, or reach out to <a href="mailto:greg@sqysh.com" style="color: #0284c7; text-decoration: none; font-weight: 600;">Sqysh</a>.
                  </p>
                  <p style="margin: 0; color: #cbd5e1; font-size: 10.5px; font-family: 'SF Mono', 'Fira Code', monospace; letter-spacing: 0.08em;">
                    Sent weekly to all active members · © ${year} Coastal Referral Exchange
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
