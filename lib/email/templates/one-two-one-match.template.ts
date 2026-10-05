export function oneTwoOneMatchTemplate(
  firstName: string,
  partners: { name: string; company: string; email: string; phone: string | null }[]
) {
  const isDouble = partners.length > 1

  const partnerBlocks = partners
    .map(
      (p) => `
    <tr><td style="padding:0 0 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-left:2px solid #0284c7;padding:16px 20px;">
          <p style="margin:0;font-size:20px;font-weight:900;color:#0f172a;letter-spacing:-0.3px;line-height:1.2;">
            ${p.name}
          </p>
          <p style="margin:4px 0 12px;font-size:14px;color:#0284c7;font-weight:600;">
            ${p.company}
          </p>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
            ${p.email}${p.phone ? `<br />${p.phone}` : ''}
          </p>
        </td></tr>
      </table>
    </td></tr>
  `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <tr><td style="padding:0 0 32px;">
          <p style="margin:0;font-size:11px;font-family:monospace;letter-spacing:0.2em;text-transform:uppercase;color:#0284c7;">
            Coastal Referral Exchange
          </p>
        </td></tr>

        <tr><td style="padding:0 0 8px;">
          <h1 style="margin:0;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;line-height:1.1;">
            ${isDouble ? "This week you've got two." : 'Your 1-2-1 this week.'}
          </h1>
        </td></tr>

        <tr><td style="padding:0 0 24px;">
          <p style="margin:0;font-size:15px;color:#475569;line-height:1.65;">
            Hey ${firstName} ${
              isDouble
                ? 'we had an odd number this week, so you drew two partners. Reach out to both and get something on the calendar.'
                : "here's who you're matched with. Reach out and find a time that works for both of you."
            }
          </p>
        </td></tr>

        <tr><td style="padding:0 0 24px;">
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
        </td></tr>

        ${partnerBlocks}

        <tr><td style="padding:8px 0 32px;">
          <p style="margin:0;font-size:15px;color:#475569;line-height:1.65;">
            Coffee, a phone call, or fifteen minutes before Thursday's meeting all count. The point is just to learn enough about each other's business to send a real referral.
          </p>
        </td></tr>

        <tr><td style="padding-top:24px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:10px;font-family:monospace;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;">
            Coastal Referral Exchange · North Shore Chapter
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim()
}
