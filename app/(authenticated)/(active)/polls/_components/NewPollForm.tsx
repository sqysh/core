import { createPoll } from '@/lib/actions/poll/createPoll'
import { POLL_MAX_OPTIONS, POLL_OPTION_MAX, POLL_QUESTION_MAX } from '@/lib/constants/poll.constants'
import { newPollFormSchema, pollSchema } from '@/lib/schemas/poll.schema'
import { PollInput } from '@/types/poll.types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import z from 'zod'

export type FormValues = z.input<typeof newPollFormSchema>
export const EMPTY: FormValues = { question: '', options: [{ label: '' }, { label: '' }] }

export function NewPollForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<FormValues>({ resolver: zodResolver(newPollFormSchema), defaultValues: EMPTY, mode: 'onSubmit' })
  const { fields, append, remove } = useFieldArray({ control, name: 'options' })
  const question = watch('question')

  const field =
    'w-full border border-border-light bg-transparent px-3 py-2.5 font-nunito text-[15px] text-text-light outline-none focus:border-primary-light dark:border-border-dark dark:text-text-dark dark:focus:border-primary-dark'

  function submit(values: FormValues) {
    setServerError(null)
    const input: PollInput = { question: values.question, options: values.options.map((o) => o.label) }
    const check = pollSchema.safeParse(input)
    if (!check.success) {
      setServerError(check.error.issues[0]?.message ?? 'Check the poll')
      return
    }
    start(async () => {
      const res = await createPoll(input)
      if (!res.success) setServerError(res.error)
      else onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="border border-primary-light/40 dark:border-primary-dark/40">
      <div className="px-4 pt-4 pb-3">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
          New poll
        </p>
        <label className="mt-3 block">
          <span className="sr-only">Question</span>
          <input
            {...register('question')}
            placeholder="What are we deciding?"
            maxLength={POLL_QUESTION_MAX}
            autoFocus
            className={`${field} font-sora text-[17px] font-bold`}
            aria-invalid={!!errors.question}
          />
        </label>
        <div className="mt-1 flex justify-between font-mono text-f11 text-muted-light dark:text-muted-dark">
          <span className="text-red-500">{errors.question?.message}</span>
          <span className="tabular-nums">
            {question.length}/{POLL_QUESTION_MAX}
          </span>
        </div>

        <ul className="mt-3 space-y-2">
          {fields.map((f, i) => (
            <li key={f.id} className="flex gap-2">
              <input
                {...register(`options.${i}.label` as const)}
                placeholder={`Option ${i + 1}`}
                maxLength={POLL_OPTION_MAX}
                className={field}
                aria-label={`Option ${i + 1}`}
              />
              {fields.length > 2 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove option ${i + 1}`}
                  className="px-2 text-muted-light hover:text-red-500 dark:text-muted-dark"
                >
                  <X size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>

        {fields.length < POLL_MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => append({ label: '' })}
            className="mt-2 inline-flex items-center gap-1 font-mono text-f11 tracking-widest uppercase text-muted-light hover:text-primary-light dark:text-muted-dark dark:hover:text-primary-dark"
          >
            <Plus size={12} /> Add option
          </button>
        )}
        {serverError && <p className="mt-3 font-nunito text-f12 text-red-500">{serverError}</p>}
      </div>
      <div className="flex border-t border-border-light dark:border-border-dark">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 font-mono text-f11 tracking-widest uppercase text-muted-light dark:text-muted-dark"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-primary-light py-3 font-sora text-[14px] font-black text-white disabled:opacity-60 dark:bg-primary-dark"
        >
          {pending ? 'Opening' : 'Open the poll'}
        </button>
      </div>
    </form>
  )
}
