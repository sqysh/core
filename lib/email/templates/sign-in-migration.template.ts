// ─── Sign-in migration emails ──────────────────────────────────────────────────
// Two variants, picked by whether the member has any UserEmail rows.
//
//   signInActionRequiredTemplate — no sign-in account on file. Hard deadline.
//   signInHeadsUpTemplate        — already covered. Informational only.

export const signInActionRequiredTemplate = (firstName: string, deadline: string) => {
  const year = new Date().getFullYear()
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Action Needed — Coastal Referral Exchange</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding: 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; margin: 0 auto; background: #ffffff; border-top: 3px solid #b45309;">

          <tr>
            <td style="padding: 28px 32px 20px;">
              <p style="margin: 0 0 4px 0; color: #b45309; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                Coastal Referral Exchange
              </p>
              <h1 style="margin: 0; color: #0c1e2e; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
                Action Needed
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
              <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                CORE is moving to Google as the only way to sign in. The email link option goes away on <strong style="color: #0c1e2e;">${deadline}</strong>.
              </p>

              <!-- Warning callout -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left: 3px solid #b45309; background-color: #fffbeb; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0 0 6px 0; color: #b45309; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      No Google Account On File
                    </p>
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; line-height: 1.55;">
                      Without one, you won't be able to reach your dashboard after ${deadline}.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Try this first -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left: 3px solid #0284c7; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0 0 6px 0; color: #0c1e2e; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      Try This First
                    </p>
                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.55;">
                      If your work email runs on Google Workspace, it already works as a Google account — nothing to create. Reply with that address and you're done.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left: 3px solid #0284c7; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0 0 10px 0; color: #0c1e2e; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      Otherwise — About Two Minutes
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${[
                        'Go to accounts.google.com/signup',
                        'Enter your name',
                        'Pick a username — this becomes your Gmail address',
                        'Choose a password',
                        'Add a phone number and confirm the code they text you',
                        'Accept the terms'
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

              <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                You never have to use the Gmail inbox. It just acts as your key to get into CORE.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td>
                    <a href="https://accounts.google.com/signup" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                      Create a Google Account →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                <strong style="color: #0c1e2e;">Send me the address once you have it</strong> and I'll add it to your profile. After that, signing in is one click.
              </p>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                Questions, or want me to walk you through it? Reply here or contact <a href="mailto:greg@sqysh.com" style="color: #0284c7; text-decoration: none; font-weight: 600;">Sqysh</a>.
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

export const signInHeadsUpTemplate = (firstName: string, deadline: string) => {
  const year = new Date().getFullYear()
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signing In — Coastal Referral Exchange</title>
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
                A Note About Signing In
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
                Small change worth knowing about. As of <strong style="color: #0c1e2e;">${deadline}</strong>, Google is the only way to sign in to CORE — the email link option is going away.
              </p>

              <!-- All set callout -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left: 3px solid #059669; background-color: #ecfdf5; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0 0 6px 0; color: #047857; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      Nothing For You To Do
                    </p>
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; line-height: 1.55;">
                      Your Google account is already on file. You'll click "Sign in with Google" like usual.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Optional tip -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left: 3px solid #0284c7; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0 0 6px 0; color: #0c1e2e; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      If You Use More Than One
                    </p>
                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.55;">
                      You can add other Google accounts under Profile → Sign-In Accounts, and use any of them to get in. Handy if your browser tends to default to a different account than you expect.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                Any trouble getting in, reply here or contact <a href="mailto:greg@sqysh.com" style="color: #0284c7; text-decoration: none; font-weight: 600;">Sqysh</a>.
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
