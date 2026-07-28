interface UserDirectoryEntry {
  id: string
  name: string
  email: string
  phone: string | null
  company: string
  industry: string
}

interface DirectoryPDFOptions {
  title?: string
  subtitle?: string
  chapterName?: string
  colorScheme?: 'default' | 'professional' | 'nautical'
}

const MOST_WANTED_INDUSTRIES = [
  {
    industry: 'Divorce Attorney',
    reason: 'High referral volume — every member knows someone going through a transition.'
  },
  { industry: 'Electrician', reason: 'Constant demand across residential and commercial projects.' },
  { industry: 'Plumber', reason: 'Emergency and renovation work generates steady year-round referrals.' },
  { industry: 'Commercial Insurance', reason: 'Protects every business in the room — a natural fit for the chapter.' },
  {
    industry: 'Photographer',
    reason:
      'Every business needs headshots, events, and marketing content — referrals come from every seat at the table.'
  },
  { industry: 'Marketing / Branding', reason: "Every member's clients need visibility — endless referral surface." },
  {
    industry: 'Commercial Cleaning',
    reason: 'Every office, retail space, and commercial property in the chapter is a potential client.'
  },
  {
    industry: 'Chiropractor',
    reason: 'High visit frequency means strong referral relationships — pairs well with the physical therapist seat.'
  },
  {
    industry: 'Physical Therapist',
    reason: 'Healthcare referrals are frequent and trusted — strong relationship builder.'
  },
  { industry: 'Pest Control', reason: 'Residential and commercial demand is consistent and highly referable.' }
]

export const buildDirectoryDoc = async (users: UserDirectoryEntry[], options: DirectoryPDFOptions = {}) => {
  const { jsPDF } = await import('jspdf')

  const { title = 'Member Directory', subtitle = 'Coastal Referral Exchange', colorScheme = 'nautical' } = options

  const doc = new jsPDF('portrait', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  let yPosition = 0

  // ── Color Palettes ──────────────────────────────────────────────
  const palette: Record<
    string,
    {
      primary: [number, number, number]
      accent: [number, number, number]
      headerBg: [number, number, number]
      rowAlt: [number, number, number]
      text: [number, number, number]
      muted: [number, number, number]
      border: [number, number, number]
      white: [number, number, number]
    }
  > = {
    nautical: {
      primary: [14, 116, 144], // cyan-700
      accent: [6, 182, 212], // cyan-500
      headerBg: [14, 116, 144],
      rowAlt: [236, 254, 255], // cyan-50
      text: [17, 24, 39],
      muted: [107, 114, 128],
      border: [165, 243, 252], // cyan-200
      white: [255, 255, 255]
    },
    professional: {
      primary: [30, 64, 175],
      accent: [99, 102, 241],
      headerBg: [30, 64, 175],
      rowAlt: [245, 245, 255],
      text: [17, 24, 39],
      muted: [107, 114, 128],
      border: [209, 213, 219],
      white: [255, 255, 255]
    },
    default: {
      primary: [31, 41, 55],
      accent: [75, 85, 99],
      headerBg: [31, 41, 55],
      rowAlt: [243, 244, 246],
      text: [17, 24, 39],
      muted: [107, 114, 128],
      border: [209, 213, 219],
      white: [255, 255, 255]
    }
  }

  const colors = palette[colorScheme]

  // ── Helpers ─────────────────────────────────────────────────────
  const addPageIfNeeded = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage()
      drawPageHeader()
    }
  }

  const setFont = (
    style: 'normal' | 'bold' | 'italic',
    size: number,
    color: [number, number, number] = colors.text
  ) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }

  const drawHRule = (y: number, color: [number, number, number] = colors.border, thickness = 0.3) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(thickness)
    doc.line(margin, y, pageWidth - margin, y)
  }

  // ── Cover Page ──────────────────────────────────────────────────
  const drawCoverPage = () => {
    // Navy header band
    doc.setFillColor(...colors.primary)
    doc.rect(0, 0, pageWidth, 70, 'F')

    // Gold accent strip
    doc.setFillColor(...colors.accent)
    doc.rect(0, 70, pageWidth, 2.5, 'F')

    // Anchor icon (simple unicode stand-in drawn with lines)
    // Decorative corner marks
    const markSize = 6
    doc.setDrawColor(...colors.accent)
    doc.setLineWidth(1)
    // top-left
    doc.line(margin, margin, margin + markSize, margin)
    doc.line(margin, margin, margin, margin + markSize)
    // top-right
    doc.line(pageWidth - margin, margin, pageWidth - margin - markSize, margin)
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + markSize)

    // Title block
    setFont('bold', 28, colors.white)
    doc.text(title, pageWidth / 2, 36, { align: 'center' })

    setFont('normal', 13, colors.accent)
    doc.text(subtitle, pageWidth / 2, 48, { align: 'center' })

    // Stats band
    yPosition = 100

    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, yPosition, contentWidth, 28, 2, 2, 'F')
    doc.setDrawColor(...colors.border)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin, yPosition, contentWidth, 28, 2, 2, 'S')

    const industries = [...new Set(users.map((u) => u.industry).filter(Boolean))]

    const stats = [
      { label: 'Total Members', value: String(users.length) },
      { label: 'Industries', value: String(industries.length) },
      {
        label: 'Generated',
        value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      }
    ]

    const colW = contentWidth / stats.length
    stats.forEach((stat, i) => {
      const x = margin + colW * i + colW / 2
      setFont('bold', 16, colors.primary)
      doc.text(stat.value, x, yPosition + 11, { align: 'center' })
      setFont('normal', 7.5, colors.muted)
      doc.text(stat.label.toUpperCase(), x, yPosition + 19, { align: 'center' })
    })

    yPosition += 44

    // Industry breakdown
    setFont('bold', 10, colors.primary)
    doc.text('INDUSTRIES REPRESENTED', margin, yPosition)
    drawHRule(yPosition + 2, colors.accent, 0.8)
    yPosition += 8

    const industryCounts: Record<string, number> = {}
    users.forEach((u) => {
      if (u.industry) industryCounts[u.industry] = (industryCounts[u.industry] || 0) + 1
    })
    const sorted = Object.entries(industryCounts).sort((a, b) => b[1] - a[1])

    const tagCols = 3
    const tagW = contentWidth / tagCols
    const tagH = 8
    sorted.forEach(([industry, count], i) => {
      const col = i % tagCols
      const row = Math.floor(i / tagCols)
      const tx = margin + col * tagW
      const ty = yPosition + row * (tagH + 3)

      doc.setFillColor(...colors.rowAlt)
      doc.setDrawColor(...colors.border)
      doc.setLineWidth(0.2)
      doc.roundedRect(tx, ty, tagW - 3, tagH, 1, 1, 'FD')

      setFont('normal', 8, colors.text)
      doc.text(industry, tx + 4, ty + 5.2)
    })

    const tagRows = Math.ceil(sorted.length / tagCols)
    yPosition += tagRows * (tagH + 3) + 8

    // Footer note
    setFont('italic', 8, colors.muted)
    doc.text('Confidential — for internal use only', pageWidth / 2, pageHeight - 12, { align: 'center' })
  }

  // ── Per-page running header ─────────────────────────────────────
  const drawPageHeader = () => {
    doc.setFillColor(...colors.primary)
    doc.rect(0, 0, pageWidth, 12, 'F')

    doc.setFillColor(...colors.accent)
    doc.rect(0, 12, pageWidth, 1, 'F')

    setFont('bold', 8, colors.white)
    doc.text(title, margin, 8)

    setFont('normal', 7, [180, 195, 220])
    doc.text(subtitle, pageWidth - margin, 8, { align: 'right' })

    yPosition = 20
  }

  // ── Directory Table ─────────────────────────────────────────────
  const drawDirectoryTable = () => {
    // Column definitions
    const cols = {
      name: { label: 'NAME', x: margin, w: 36 },
      company: { label: 'COMPANY', x: margin + 36, w: 36 },
      industry: { label: 'INDUSTRY', x: margin + 72, w: 30 },
      email: { label: 'EMAIL', x: margin + 102, w: 48 },
      phone: { label: 'PHONE', x: margin + 150, w: 32 }
    }

    const rowH = 9
    const headerH = 8

    const drawTableHeader = () => {
      doc.setFillColor(...colors.headerBg)
      doc.rect(margin, yPosition, contentWidth, headerH, 'F')

      setFont('bold', 7, colors.white)
      Object.values(cols).forEach((col) => {
        doc.text(col.label, col.x + 2, yPosition + 5.2)
      })

      yPosition += headerH
    }

    drawTableHeader()

    users.forEach((user, i) => {
      addPageIfNeeded(rowH + 2)

      // Re-draw header if we just added a page
      const needsHeader = yPosition === 20
      if (needsHeader) drawTableHeader()

      // Alternating row bg
      if (i % 2 === 0) {
        doc.setFillColor(...colors.rowAlt)
        doc.rect(margin, yPosition, contentWidth, rowH, 'F')
      }

      // Bottom rule
      doc.setDrawColor(...colors.border)
      doc.setLineWidth(0.15)
      doc.line(margin, yPosition + rowH, pageWidth - margin, yPosition + rowH)

      const textY = yPosition + 6

      // Name — bold
      setFont('bold', 8, colors.text)
      doc.text(doc.splitTextToSize(user.name, cols.name.w - 3)[0], cols.name.x + 2, textY)

      // Company
      setFont('normal', 8, colors.text)
      doc.text(doc.splitTextToSize(user.company || '—', cols.company.w - 3)[0], cols.company.x + 2, textY)

      // Industry — muted
      setFont('normal', 7.5, colors.muted)
      doc.text(doc.splitTextToSize(user.industry || '—', cols.industry.w - 3)[0], cols.industry.x + 2, textY)

      // Email — accent color, slightly smaller
      setFont('normal', 7, colors.primary)
      doc.text(doc.splitTextToSize(user.email, cols.email.w - 3)[0], cols.email.x + 2, textY)

      // Phone
      setFont('normal', 7.5, colors.text)
      doc.text(user.phone || '—', cols.phone.x + 2, textY)

      yPosition += rowH
    })
  }

  const drawMostWantedPage = () => {
    doc.addPage()
    drawPageHeader()

    // Title block
    doc.setFillColor(14, 116, 144)
    doc.rect(margin, yPosition, contentWidth, 18, 'F')

    setFont('bold', 14, colors.white)
    doc.text('Most Wanted Industries', margin + 4, yPosition + 7)

    setFont('normal', 8, [165, 243, 252])
    doc.text('These are the seats our chapter is actively looking to fill.', margin + 4, yPosition + 14)

    yPosition += 24

    MOST_WANTED_INDUSTRIES.forEach((item, i) => {
      addPageIfNeeded(24)

      const isEven = i % 2 === 0

      // Row background
      doc.setFillColor(...(isEven ? colors.rowAlt : colors.white))
      doc.rect(margin, yPosition, contentWidth, 20, 'F')

      // Left accent bar
      doc.setFillColor(...colors.accent)
      doc.rect(margin, yPosition, 3, 20, 'F')

      // Number badge
      doc.setFillColor(14, 116, 144)
      doc.circle(margin + 8, yPosition + 10, 4, 'F')
      setFont('bold', i === 9 ? 6 : 7.5, colors.white)
      doc.text(String(i + 1), margin + 8, yPosition + 11, { align: 'center' })

      // Industry name
      setFont('bold', 10, colors.primary)
      doc.text(item.industry, margin + 16, yPosition + 8)

      // Reason
      setFont('normal', 7.5, colors.muted)
      doc.text(item.reason, margin + 16, yPosition + 15, { maxWidth: contentWidth - 20 })

      // Bottom border
      doc.setDrawColor(...colors.border)
      doc.setLineWidth(0.2)
      doc.line(margin, yPosition + 20, pageWidth - margin, yPosition + 20)

      yPosition += 22
    })

    // Footer callout
    yPosition += 6
    doc.setFillColor(236, 254, 255)
    doc.setDrawColor(6, 182, 212)
    doc.setLineWidth(0.4)
    doc.roundedRect(margin, yPosition, contentWidth, 14, 2, 2, 'FD')

    setFont('bold', 8, [14, 116, 144])
    doc.text('Know someone in one of these industries? Bring them in as a guest!', pageWidth / 2, yPosition + 9, {
      align: 'center'
    })
  }

  // ── Footer on all pages ─────────────────────────────────────────
  const addFooters = () => {
    const pageCount = doc.getNumberOfPages()
    for (let p = 2; p <= pageCount; p++) {
      doc.setPage(p)
      doc.setFillColor(...colors.primary)
      doc.rect(0, pageHeight - 10, pageWidth, 10, 'F')

      setFont('normal', 7, [180, 195, 220])
      doc.text('Coastal Referral Exchange — Confidential', margin, pageHeight - 4)

      setFont('normal', 7, [180, 195, 220])
      doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, pageHeight - 4, { align: 'right' })
    }
  }

  // ── Build ────────────────────────────────────────────────────────
  drawCoverPage()
  doc.addPage()
  drawPageHeader()
  drawDirectoryTable()
  yPosition += 8

  // Attention banner
  doc.setFillColor(...colors.accent)
  doc.rect(margin, yPosition, contentWidth, 10, 'F')

  setFont('bold', 8, colors.white)
  doc.text('⚠  Member order reflects the ten-minute presentation schedule.', margin + 4, yPosition + 6.5)

  yPosition += 18

  drawMostWantedPage()
  addFooters()

  return doc
}

// Browser download
export const generateMemberDirectoryPDF = async (users: UserDirectoryEntry[], options: DirectoryPDFOptions = {}) => {
  const doc = await buildDirectoryDoc(users, options)
  const dateStr = new Date().toISOString().slice(0, 10)
  doc.save(`CORE-Directory-${dateStr}.pdf`)
}

// Server buffer (for API route)
export const generateMemberDirectoryPDFBuffer = async (
  users: UserDirectoryEntry[],
  options: DirectoryPDFOptions = {}
): Promise<Buffer> => {
  const doc = await buildDirectoryDoc(users, options)
  return Buffer.from(doc.output('arraybuffer'))
}
