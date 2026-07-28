export const oneTwoOneTemplate = (requesterName: string, recipientName: string, fullUrl: string) => {
  const year = new Date().getFullYear()
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Face-2-Face Logged by ${requesterName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding: 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; margin: 0 auto; background: #ffffff; border-top: 3px solid #0284c7;">

          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px;">
              <p style="margin: 0 0 4px 0; color: #0284c7; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                Coastal Referral Exchange
              </p>
              <h1 style="margin: 0; color: #0c1e2e; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
                Face-2-Face Logged
              </h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #e0f2fe;"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                <strong style="color: #0c1e2e;">${requesterName}</strong> logged a Face-2-Face meeting with you. This meeting has been added to both of your activity records.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td>
                    <a href="${fullUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                      View Your Activity →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 14px 16px; background-color: #f0f9ff; border: 1px solid #e0f2fe;">
                    <p style="margin: 0 0 6px 0; color: #0c1e2e; font-size: 12px; font-weight: 600;">
                      Button not working? Copy and paste this link:
                    </p>
                    <p style="margin: 0; word-break: break-all; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; color: #0284c7;">
                      ${fullUrl}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
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
