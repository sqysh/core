export type ActionResult<T = null> =
  | { success: true; data: T; error?: never; fieldErrors?: never }
  | {
      success: false
      data?: null
      error: string
      fieldErrors?: Record<string, string[]>
    }
