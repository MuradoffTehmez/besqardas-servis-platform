/** Vahid xəta formatı (PRD §65.2): { code, message, fieldErrors } — `message` açarı cavabda lokallaşdırılır. */

export class ApiErrorException extends Error {
  constructor(
    public status: number,
    public code: string,
    public messageKey: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(messageKey);
  }
}

export function apiError(status: number, code: string, messageKey: string, fieldErrors?: Record<string, string[]>) {
  return new ApiErrorException(status, code, messageKey, fieldErrors);
}
