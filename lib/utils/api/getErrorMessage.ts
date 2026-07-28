export const getErrorMessage = (error: any) => {
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof (error as any).data === 'object' &&
    'message' in (error as any).data
  ) {
    return (error as any).data.message
  }

  return undefined
}
