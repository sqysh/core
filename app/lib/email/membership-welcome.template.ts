export const membershipWelcomeTemplate = (
  firstName: string,
  amountPaid: string,
  paidOn: string,
  nextRoomDuesDate: string,
  dashboardUrl: string,
  receiptUrl?: string
) => {
  const year = new Date().getFullYear()

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CORE</title>
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
                Membership Confirmed
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
                You're In
              </p>
              <p style="margin: 0 0 16px 0; color: #0c1e2e; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">
                Welcome, ${firstName}.
              </p>
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Your CORE membership is active. Here is your receipt for today's payment and what is coming up next.
              </p>
            </td>
          </tr>

          <!-- Receipt -->
          <tr>
            <td style="padding: 0 32px;">
              <p style="margin: 0 0 12px 0; color: #0284c7; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                Today's Payment
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e0f2fe;">
                <tr style="background-color: #f0f9ff;">
                  <td style="padding: 14px 16px; border-bottom: 1px solid #e0f2fe;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 14px; font-weight: 700;">Annual Admission</p>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 11px; font-family: 'SF Mono', 'Fira Code', monospace;">Charged ${paidOn}</p>
                  </td>
                  <td style="padding: 14px 16px; border-bottom: 1px solid #e0f2fe; text-align: right; white-space: nowrap;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums;">${amountPaid}</p>
                    <p style="margin: 4px 0 0 0; color: #0284c7; font-size: 10px; font-family: 'SF Mono', 'Fira Code', monospace; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700;">Paid</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What happens next -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <p style="margin: 0 0 16px 0; color: #0284c7; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                What Happens Next
              </p>

              <div style="margin-bottom: 16px; padding: 14px 16px; border-left: 2px solid #0284c7; background-color: #f0f9ff;">
                <p style="margin: 0 0 4px 0; color: #0c1e2e; font-size: 14px; font-weight: 700;">
                  Room Dues — $60 per quarter
                </p>
                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                  First charge on <strong style="color: #0c1e2e;">${nextRoomDuesDate}</strong>, then automatically every three months.
                </p>
              </div>

              <div style="margin-bottom: 16px; padding: 14px 16px; border-left: 2px solid #cbd5e1; background-color: #f8fafc;">
                <p style="margin: 0 0 4px 0; color: #0c1e2e; font-size: 14px; font-weight: 700;">
                  Annual Renewal — $365 per year
                </p>
                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                  Renews automatically one year from today. We will email you before any charge.
                </p>
              </div>

              <div style="padding: 14px 16px; border-left: 2px solid #cbd5e1; background-color: #f8fafc;">
                <p style="margin: 0 0 4px 0; color: #0c1e2e; font-size: 14px; font-weight: 700;">
                  Card On File
                </p>
                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                  Saved securely with Stripe and used for all future charges. Update it anytime from your dashboard.
                </p>
              </div>
            </td>
          </tr>

          <!-- Get started -->
          <tr>
            <td style="padding: 28px 32px 8px;">
              <p style="margin: 0 0 12px 0; color: #0284c7; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                Get Started
              </p>
              <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Complete your profile and explore the directory. Members who fill out their profile in the first week get connected with other members much faster.
              </p>
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                Go to Dashboard →
              </a>
            </td>
          </tr>

          ${
            receiptUrl
              ? `
          <tr>
            <td style="padding: 16px 32px 24px;">
              <a href="${receiptUrl}" style="color: #0284c7; text-decoration: none; font-size: 12px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace; text-transform: uppercase; letter-spacing: 0.1em;">
                View Stripe Receipt →
              </a>
            </td>
          </tr>
          `
              : `
          <tr>
            <td style="padding: 16px 32px 24px;"></td>
          </tr>
          `
          }

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
