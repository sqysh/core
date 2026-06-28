export const coreTemplate = (memberName: string) => {
  const year = new Date().getFullYear()
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Reminder - Coastal Referral Exchange</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f9ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff;">
    <tr>
      <td style="padding: 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-top: 3px solid #0284c7;">

          <!-- Header -->
          <tr>
            <td style="padding: 28px 28px 20px;">
              <p style="margin: 0 0 4px 0; color: #0284c7; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                Coastal Referral Exchange
              </p>
              <h1 style="margin: 0; color: #0c1e2e; font-size: 26px; font-weight: 800; letter-spacing: -0.03em;">
                Weekly Reminder
              </h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 28px;">
              <div style="height: 1px; background-color: #e0f2fe;"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px 28px;">

              <p style="margin: 0 0 6px 0; color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                Hello
              </p>
              <p style="margin: 0 0 20px 0; color: #0c1e2e; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">
                ${memberName},
              </p>
              <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Don't forget to log this week's activity. Tap a button below to go straight to the right form.
              </p>

              <!-- Face-2-Face -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px; border-left: 3px solid #38bdf8; background-color: #f0f9ff;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0 0 4px 0; color: #0284c7; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      Meeting
                    </p>
                    <p style="margin: 0 0 8px 0; color: #0c1e2e; font-size: 15px; font-weight: 800; letter-spacing: -0.02em;">
                      Face-2-Face
                    </p>
                    <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                      Log a 1-on-1 meeting with a fellow member
                    </p>
                    <a href="https://coastalreferralxchange.com/dashboard?action=f2f"
                       style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                      Log Face-2-Face →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Referral -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px; border-left: 3px solid #22d3ee; background-color: #ecfeff;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0 0 4px 0; color: #0891b2; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      Referral
                    </p>
                    <p style="margin: 0 0 8px 0; color: #0c1e2e; font-size: 15px; font-weight: 800; letter-spacing: -0.02em;">
                      Give a Referral
                    </p>
                    <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                      Pass business to a fellow member
                    </p>
                    <a href="https://coastalreferralxchange.com/dashboard?action=referral"
                       style="display: inline-block; background-color: #0891b2; color: #ffffff; text-decoration: none; padding: 10px 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                      Give a Referral →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Closed Business -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 0; border-left: 3px solid #34d399; background-color: #f0fdf4;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0 0 4px 0; color: #059669; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      Thank You
                    </p>
                    <p style="margin: 0 0 8px 0; color: #0c1e2e; font-size: 15px; font-weight: 800; letter-spacing: -0.02em;">
                      Closed Business
                    </p>
                    <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                      Thank a member for business that closed
                    </p>
                    <a href="https://coastalreferralxchange.com/dashboard?action=closed"
                       style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 10px 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                      Log Closed Business →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 28px;">
              <div style="height: 1px; background-color: #e0f2fe;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px 8px;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px; font-family: 'SF Mono', 'Fira Code', monospace; letter-spacing: 0.08em;">
                This reminder is sent weekly to all active members.
              </p>
              <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 11px; font-family: 'SF Mono', 'Fira Code', monospace; letter-spacing: 0.08em;">
                © ${year} Coastal Referral Exchange
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px 20px;">
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                Questions? Contact <a href="mailto:greg@sqysh.io" style="color: #0284c7; text-decoration: none; font-weight: 600;">Sqysh</a>.
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
