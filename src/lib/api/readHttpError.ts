/** Parse `{ error: string }` from failed API responses (403, 500, …). */
export async function readHttpErrorMessage(response: Response): Promise<string> {
  const fallback = `Server error ${response.status}`
  try {
    const data = (await response.json()) as { error?: string }
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim()
  } catch {
    /* not JSON */
  }
  return fallback
}
