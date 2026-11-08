import z from 'zod'
import { POLL_QUESTION_MAX, POLL_MAX_OPTIONS, POLL_MIN_OPTIONS, POLL_OPTION_MAX } from '../constants/poll.constants'

export const pollSchema = z.object({
  question: z
    .string()
    .trim()
    .min(4, 'Ask a real question')
    .max(POLL_QUESTION_MAX, `Keep it under ${POLL_QUESTION_MAX} characters`),
  options: z
    .array(z.string().trim().max(POLL_OPTION_MAX, `Keep each option under ${POLL_OPTION_MAX} characters`))
    .transform((arr) => arr.filter(Boolean))
    .pipe(z.array(z.string()).min(POLL_MIN_OPTIONS, 'Give people at least two choices').max(POLL_MAX_OPTIONS))
    .refine((arr) => new Set(arr.map((s) => s.toLowerCase())).size === arr.length, 'Two options say the same thing')
})

export const newPollFormSchema = z
  .object({
    question: pollSchema.shape.question,
    options: z.array(z.object({ label: z.string() }))
  })
  .refine((v) => v.options.filter((o) => o.label.trim()).length >= POLL_MIN_OPTIONS, {
    message: 'Give people at least two choices',
    path: ['options']
  })
