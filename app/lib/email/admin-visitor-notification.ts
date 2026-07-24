export const adminVisitorNotificationTemplate = (
  adminName: string,
  applicantName: string,
  applicantEmail: string,
  reviewUrl: string
) => {
  const year = new Date().getFullYear()
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Application — Coastal Referral Exchange</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding: 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; margin: 0 auto; background: #ffffff; border-top: 3px solid #0284c7;">

          <tr>
            <td style="padding: 28px 32px 20px;">
              <p style="margin: 0 0 4px 0; color: #0284c7; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                Coastal Referral Exchange
              </p>
              <h1 style="margin: 0; color: #0c1e2e; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
                New Application
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #e0f2fe;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Hi <strong style="color: #0c1e2e;">${adminName}</strong>, a new application has been submitted and is waiting for your review.
              </p>

              <!-- Applicant details -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left: 3px solid #0284c7; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 4px 0; border-bottom: 1px solid #e0f2fe;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="color: #94a3b8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; font-family: 'SF Mono', 'Fira Code', monospace; width: 60px; padding-bottom: 4px;">Name</td>
                              <td style="color: #0c1e2e; font-size: 14px; font-weight: 700; padding-bottom: 4px;">${applicantName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="color: #94a3b8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; font-family: 'SF Mono', 'Fira Code', monospace; width: 60px; padding-top: 4px;">Email</td>
                              <td style="color: #0c1e2e; font-size: 14px; padding-top: 4px;">${applicantEmail}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td>
                    <a href="${reviewUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                      Review Application →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 14px 16px; background-color: #f0f9ff; border: 1px solid #e0f2fe;">
                    <p style="margin: 0 0 6px 0; color: #0c1e2e; font-size: 12px; font-weight: 600;">
                      Button not working? Copy and paste this link:
                    </p>
                    <p style="margin: 0; word-break: break-all; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; color: #0284c7;">
                      ${reviewUrl}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #e0f2fe;">
              <p style="margin: 0; color: #cbd5e1; font-size: 11px; font-family: 'SF Mono', 'Fira Code', monospace; letter-spacing: 0.08em;">
                © ${year} Coastal Referral Exchange
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
