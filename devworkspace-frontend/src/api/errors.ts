import axios from "axios";

/** Best user-facing message for a failed request: server message, then error message, then fallback. */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(err) && err.response?.data?.message) {
    return err.response.data.message;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}
