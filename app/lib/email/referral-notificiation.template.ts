const referralNotificationTemplate = (giverName: string, fullUrl: string) => {
  const year = new Date().getFullYear()
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Referral from ${giverName}</title>
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
                New Referral
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
                <strong style="color: #0c1e2e;">${giverName}</strong> just sent you a referral. Tap the button below to see the details.
            </p>
              <a href="${fullUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                View Referral →
              </a>
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

export default referralNotificationTemplate
