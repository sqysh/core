export const visitorInviteTemplate = ({
  visitorFirstName,
  invitedByName,
  visitDate,
  presenterName,
  presenterCompany
}: {
  visitorFirstName: string
  invitedByName: string
  visitDate: string
  presenterName?: string | null
  presenterCompany?: string | null
}) => {
  const year = new Date().getFullYear()
  const isVisitorDay = Boolean(presenterName)

  // Visitor Day schedule (with feature presentation)
  const visitorDaySchedule = `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">7:00 AM</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">Arrive</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">Doors open — come early, grab some food, and get settled.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">7:00–7:15</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">Open Networking</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">Mingle with members before the meeting kicks off.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">7:15 AM</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">Meeting Starts</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">Brendan opens the meeting and introduces the group. Leadership introduces themselves, followed by our Guiding Light's memorable moment and an Education Moment from Page.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">Commercials</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">60-Second Commercials</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">Each member shares a quick 60-second intro. Visitors go after the members — you'll have a moment to introduce yourself to the room.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">Feature</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">Feature Presentation</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">One of our invited guests takes the spotlight for an in-depth presentation on their business and expertise. Afterward, select members share upcoming events from other professional groups they belong to.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 8px 0; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">Round Up</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">Group Round-Up</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">We go around the room and share recent wins — referrals passed, face-to-face meetings held, and thank-yous for closed business.</p>
                  </td>
                </tr>`

  // Regular Thursday schedule (no feature presentation)
  const regularSchedule = `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">7:00 AM</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">Arrive</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">Doors open — come early, grab some food, and get settled.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">7:00–7:15</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">Open Networking</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">Mingle with members before the meeting kicks off.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">7:15 AM</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">Meeting Starts</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">Brendan opens the meeting and introduces the group. Leadership introduces themselves, followed by our Guiding Light's memorable moment and an Education Moment from Page.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">Commercials</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">60-Second Commercials</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">Each member shares a quick 60-second intro about what they do and the kind of referrals they're looking for. As a visitor, you'll have a moment to introduce yourself to the room too.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 8px 0; width: 80px; vertical-align: top;">
                    <p style="margin: 0; color: #0284c7; font-size: 11px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace;">Round Up</p>
                  </td>
                  <td style="padding: 8px 0 8px 16px; vertical-align: top;">
                    <p style="margin: 0; color: #0c1e2e; font-size: 13px; font-weight: 700;">Group Round-Up</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">We go around the room and share recent wins — referrals passed, face-to-face meetings held, and thank-yous for closed business.</p>
                  </td>
                </tr>`

  const presenterBlock = isVisitorDay
    ? `
          <tr>
            <td style="padding: 0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f0f9ff; border-left: 3px solid #0284c7;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0 0 4px 0; color: #0284c7; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      Feature Presentation
                    </p>
                    <p style="margin: 0; color: #0c1e2e; font-size: 14px; font-weight: 700;">
                      ${presenterName}${presenterCompany ? ` <span style="font-weight: 400; color: #64748b;">· ${presenterCompany}</span>` : ''}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : ''

  const headerEyebrow = isVisitorDay ? 'Visitor Day' : 'Weekly Meeting'
  const headerTitle = isVisitorDay ? "You're Invited to Visitor Day" : "You're Invited to Visit"
  const intro = isVisitorDay
    ? `Hi <strong style="color: #0c1e2e;">${visitorFirstName}</strong>, <strong style="color: #0c1e2e;">${invitedByName}</strong> has invited you to our Visitor Day on <strong style="color: #0c1e2e;">${visitDate}</strong>. It's our biggest meeting of the quarter — featuring a presentation from one of our guests and a chance to see the group in action. Here's everything you need to know.`
    : `Hi <strong style="color: #0c1e2e;">${visitorFirstName}</strong>, <strong style="color: #0c1e2e;">${invitedByName}</strong> has invited you to visit our weekly meeting on <strong style="color: #0c1e2e;">${visitDate}</strong>. We'd love to have you — here's everything you need to know.`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to CORE</title>
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
                Coastal Referral Exchange · ${headerEyebrow}
              </p>
              <h1 style="margin: 0; color: #0c1e2e; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
                ${headerTitle}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #e0f2fe;"></div>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 24px 32px 20px;">
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.7;">
                ${intro}
              </p>
            </td>
          </tr>

          <!-- Location -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8fafc; border: 1px solid #e0f2fe;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0 0 4px 0; color: #0284c7; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                      Location
                    </p>
                    <p style="margin: 0; color: #0c1e2e; font-size: 14px; font-weight: 700;">
                      25 N Common St, Lynn, MA 01902
                    </p>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">
                      Food and refreshments will be available.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Schedule -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 12px 0; color: #0284c7; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; font-family: 'SF Mono', 'Fira Code', monospace;">
                Meeting Schedule
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${isVisitorDay ? visitorDaySchedule : regularSchedule}
              </table>
            </td>
          </tr>

          <!-- Presenter block (conditional) -->
          ${presenterBlock}

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
