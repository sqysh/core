import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from './getErrorMessage'
import { createLog } from './createLog'

interface ErrorHandlerOptions {
  error: any
  req: NextRequest
  action: string
  statusCode?: number
}

interface StackFrame {
  function?: string
  file?: string
  line?: number
  column?: number
}

/**
 * Parses an Error.stack string into an array of structured frames.
 * Handles both V8 (Chrome/Node) and SpiderMonkey (Firefox) stack formats.
 */
function parseStack(error: any): StackFrame[] {
  if (!error || typeof error !== 'object' || !error.stack) return []

  const stack = String(error.stack)
  const lines = stack.split('\n').slice(1) // skip the first line (error message itself)

  return lines
    .map((line): StackFrame | null => {
      const trimmed = line.trim()
      if (!trimmed) return null

      // V8 format: "at functionName (file:line:column)"
      // or:        "at file:line:column"
      const v8Match = trimmed.match(/^at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/)
      if (v8Match) {
        const [, fn, file, line, column] = v8Match
        return {
          function: fn?.trim() || '<anonymous>',
          file: file.trim(),
          line: Number(line),
          column: Number(column)
        }
      }

      // SpiderMonkey format: "functionName@file:line:column"
      const spiderMatch = trimmed.match(/^(.+?)?@(.+?):(\d+):(\d+)$/)
      if (spiderMatch) {
        const [, fn, file, line, column] = spiderMatch
        return {
          function: fn?.trim() || '<anonymous>',
          file: file.trim(),
          line: Number(line),
          column: Number(column)
        }
      }

      return null
    })
    .filter((frame): frame is StackFrame => frame !== null)
    .slice(0, 5) // limit to top 5 frames — usually enough to identify the issue
}

export async function handleApiError({
  error,
  req,
  action,
  statusCode = 500
}: ErrorHandlerOptions): Promise<NextResponse> {
  const errorMessage = getErrorMessage(error) || error?.message || 'An unexpected error occurred'

  await createLog('error', `${action} failed: ${error?.message ?? 'unknown'}`, {
    errorLocation: parseStack(error),
    errorMessage: error?.message,
    errorName: error?.name || 'UnknownError',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    action
  })

  return NextResponse.json(
    {
      message: `${action} failed`,
      error: errorMessage
    },
    { status: statusCode }
  )
}
