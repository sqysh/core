import { FormState } from '../VisitorPanel'
import { Modal } from '../Modal'
import { formatPhone } from '@/app/lib/utils/phone.utils'
import { inputCls } from '@/app/lib/constants/member/dashboard.constants'
import { FormField } from '../../../_shared/FormField'

function getUpcomingThursdays(count = 12): { value: string; label: string }[] {
  const thursdays = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find next Thursday (day 4). If today is Thursday, start with today.
  const daysUntilThursday = (4 - today.getDay() + 7) % 7
  const firstThursday = new Date(today)
  firstThursday.setDate(today.getDate() + daysUntilThursday)

  for (let i = 0; i < count; i++) {
    const d = new Date(firstThursday)
    d.setDate(firstThursday.getDate() + i * 7)
    const value = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
    thursdays.push({ value, label })
  }

  return thursdays
}

export function CreateVisitorModal({
  form,
  setForm,
  handleClose,
  errorMsg,
  handleSubmit,
  open,
  status,
  closestVisitorDay
}) {
  const hasVisitorDay = Boolean(closestVisitorDay)
  const thursdayOptions = hasVisitorDay ? [] : getUpcomingThursdays(8)

  function handleChange(key: keyof FormState, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      accentColor="#38bdf8"
      tag={hasVisitorDay ? `Visitor Day — ${closestVisitorDay}` : 'No Visitor Day Scheduled'}
      tagColor="#0284c7"
      title="Log a Visitor"
      submitLabel="Log Visitor"
      onSubmit={handleSubmit}
      pending={status === 'loading'}
      error={errorMsg}
    >
      {!hasVisitorDay && (
        <>
          <p className="text-xs font-nunito text-muted-light dark:text-muted-dark leading-relaxed mb-2">
            There's no Visitor Day on the calendar right now, but you can still bring a guest to any Thursday meeting.
            Pick the date below so the group knows when to expect them.
          </p>
          <FormField id="visitor-date" label="Visit date">
            <select
              id="visitor-date"
              value={form.visitDate || ''}
              onChange={(e) => handleChange('visitDate', e.target.value)}
              className={inputCls}
              required
            >
              <option value="" disabled>
                Select a Thursday
              </option>
              {thursdayOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
        </>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <FormField
          id="visitor-first"
          label="First name"
          value={form.firstName}
          onChange={(e) => handleChange('firstName', e.target.value)}
          placeholder="Jane"
        />
        <FormField
          id="visitor-last"
          label="Last name"
          value={form.lastName}
          onChange={(e) => handleChange('lastName', e.target.value)}
          placeholder="Smith"
        />
      </div>

      <FormField
        id="visitor-email"
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => handleChange('email', e.target.value)}
        placeholder="jane@company.com"
      />
      <FormField
        id="visitor-company"
        label="Company"
        value={form.company}
        onChange={(e) => handleChange('company', e.target.value)}
        placeholder="Smith & Associates"
      />
      <FormField
        id="visitor-industry"
        label="Industry"
        value={form.industry}
        onChange={(e) => handleChange('industry', e.target.value)}
        placeholder="Real Estate"
      />

      <FormField
        id="visitor-phone"
        label="Phone"
        type="tel"
        optional
        value={formatPhone(form.phone)}
        onChange={(e) => handleChange('phone', e.target.value)}
        placeholder="(617) 555-0100"
      />
    </Modal>
  )
}
