export function cardReminderTemplate(memberName: string, dashboardUrl: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>Add your card before the first quarterly charge</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Quicksand:wght@500;700&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
  <style type="text/css">
    :root { color-scheme: light only; supported-color-schemes: light; }
    body, table, td { -webkit-text-size-adjust: 100%; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e0f2fe; border-top: 3px solid #0284c7;">
          <tr>
            <td style="padding: 30px 32px 22px;">
              <p style="margin: 0 0 14px 0; color: #0284c7; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'Quicksand', 'SF Mono', monospace;">
                Coastal Referral Exchange
              </p>
              <p style="margin: 0 0 12px 0; font-family: 'Sora', -apple-system, sans-serif; font-size: 22px; font-weight: 800; color: #0c1e2e; letter-spacing: -0.02em;">
                CORE<span style="color: #0284c7;">.</span>
              </p>
              <h1 style="margin: 0; color: #0c1e2e; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; font-family: 'Sora', -apple-system, sans-serif;">
                Quick heads up — add your card
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #e0f2fe; font-size: 0; line-height: 0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 26px 32px;">
              <p style="margin: 0 0 18px 0; color: #0c1e2e; font-size: 15px; line-height: 1.65; font-family: 'Nunito', sans-serif;">
                Hey ${memberName},
              </p>
              <p style="margin: 0 0 18px 0; color: #64748b; font-size: 15px; line-height: 1.65; font-family: 'Nunito', sans-serif;">
                Heads up — the first automated quarterly charge is coming up soon, so this is the time to get your payment card into the system if you haven't already.
              </p>
              <p style="margin: 0 0 26px 0; color: #64748b; font-size: 15px; line-height: 1.65; font-family: 'Nunito', sans-serif;">
                It's quick: head to your dashboard and you'll see it right at the top. Add your card there and you'll be all set — the charge will run automatically when the quarter rolls over, no extra steps.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 4px 0 22px 0;">
                    <a href="${dashboardUrl}"
                       style="display: inline-block; padding: 14px 32px; background-color: #0c1e2e; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; font-family: 'Quicksand', -apple-system, sans-serif; border: 1px solid #0c1e2e;">
                      Add my card &nbsp;&rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 4px 0;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 6px 0; color: #94a3b8; font-size: 11px; font-family: 'Nunito', sans-serif;">
                      Button not working? Just paste this in your browser:
                    </p>
                    <p style="margin: 0; color: #0284c7; font-size: 11px; word-break: break-all; font-family: 'Quicksand', 'SF Mono', monospace;">
                      ${dashboardUrl}
                    </p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left: 3px solid #0284c7; background-color: #f0f9ff; margin: 26px 0 4px 0;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; line-height: 1.6; font-family: 'Nunito', sans-serif;">
                      <strong>Already added your card?</strong> You're good — no need to do anything. This is just a nudge for anyone who hasn't yet.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; color: #64748b; font-size: 15px; line-height: 1.65; font-family: 'Nunito', sans-serif;">
                Thanks, and have a great Fourth — see you on the 9th!<br>
                <span style="color: #94a3b8; font-size: 13px;">&mdash; Greg @ Sqysh</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 32px; border-top: 1px solid #e0f2fe;">
              <p style="margin: 0 0 4px 0; color: #94a3b8; font-size: 11px; font-family: 'Quicksand', 'SF Mono', monospace; letter-spacing: 0.08em;">
                Questions about billing? Just reply to this email.
              </p>
              <p style="margin: 0; color: #cbd5e1; font-size: 11px; font-family: 'Quicksand', 'SF Mono', monospace; letter-spacing: 0.08em;">
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
}
