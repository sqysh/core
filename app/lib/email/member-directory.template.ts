export const memberDirectoryTemplate = (memberName: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Member Directory - Coastal Referral Exchange</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="email-bg">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;" class="email-bg">
    <tr>
      <td style="padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px;" class="card-bg">

          <!-- Header -->
          <tr>
            <td style="padding: 24px 20px; border-bottom: 1px solid #e2e8f0;" class="border-light">
              <p style="margin: 0 0 4px 0; color: #64748b; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;" class="text-muted">Coastal Referral Exchange</p>
              <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 600;" class="text-dark">Member Directory</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px 20px;">

              <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;" class="text-gray">
                Hi ${memberName},
              </p>

              <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;" class="text-gray">
                The latest crew roster is ready. Open the directory below to find contact details for every active member — name, company, industry, email, and phone.
              </p>

              <!-- Directory card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin: 0 0 24px 0;" class="border-light">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 16px; width: 40px;">
                          <!-- Anchor icon -->
                          <div style="width: 40px; height: 40px; background: #0f3460; border-radius: 8px; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 40px; font-size: 20px;">
                            ⚓
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0 0 2px 0; color: #0f172a; font-size: 14px; font-weight: 600;" class="text-dark">CORE Member Directory</p>
                          <p style="margin: 0; color: #64748b; font-size: 13px;" class="text-muted">Current as of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </td>
                        <td style="vertical-align: middle; text-align: right;">
                          <span style="background: #dcfce7; color: #16a34a; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.04em;">PDF</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 4px 0 28px 0;">
                    <a href="https://coastalreferralxchange.com/api/pdf/member-directory" style="display: inline-block; background-color: #0f3460; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;" class="button-bg">
                      Open Member Directory
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;" class="text-gray">
                Need assistance? Contact Sqysh.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background: #ffffff; border-top: 1px solid #e2e8f0;" class="footer-bg border-light">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; line-height: 1.5;" class="text-gray">
                This directory is for internal crew use only. Please do not share outside the chapter.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;" class="text-muted">
                © 2026 Coastal Referral Exchange
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
