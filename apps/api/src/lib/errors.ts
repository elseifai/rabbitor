export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(message = "Resource not found"): AppError {
  return new AppError(404, "NOT_FOUND", message);
}

export function unauthorized(message = "Unauthorized"): AppError {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden"): AppError {
  return new AppError(403, "FORBIDDEN", message);
}

export function badRequest(message: string, code = "BAD_REQUEST"): AppError {
  return new AppError(400, code, message);
}

export function conflict(message: string): AppError {
  return new AppError(409, "CONFLICT", message);
}
