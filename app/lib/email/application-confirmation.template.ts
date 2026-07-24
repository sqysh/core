export const applicationConfirmationTemplate = (firstName: string, userId: string, url: string) => {
  const year = new Date().getFullYear()
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received — Coastal Referral Exchange</title>
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
                Application Received
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
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Hi <strong style="color: #0c1e2e;">${firstName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Thank you for applying to Coastal Referral Exchange. We've received your application and our team will review it shortly.
              </p>

              <!-- What happens next -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left: 3px solid #0284c7; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0 0 10px 0; color: #0c1e2e; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      What Happens Next
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${[
                        'Sit tight — our team will review your application and reach out if we need anything',
                        'A background check will be performed — typically 1–3 business days',
                        "Once a decision has been made you'll receive a final email letting you know if you've been accepted into the chapter"
                      ]
                        .map(
                          (step, i) => `
                      <tr>
                        <td style="padding: 4px 0; vertical-align: top; width: 20px;">
                          <span style="color: #0284c7; font-size: 10px; font-family: 'SF Mono', 'Fira Code', monospace; font-weight: 600;">0${i + 1}</span>
                        </td>
                        <td style="padding: 4px 0 4px 8px; color: #64748b; font-size: 13px; line-height: 1.5;">
                          ${step}
                        </td>
                      </tr>`
                        )
                        .join('')}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
                <tr>
                    <td>
                    <a href="${url}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                        View Your Application →
                    </a>
                    </td>
                </tr>
              </table>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                Questions? Reply to this email or contact <a href="mailto:greg@sqysh.com" style="color: #0284c7; text-decoration: none; font-weight: 600;">Sqysh</a>.
              </p>
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
