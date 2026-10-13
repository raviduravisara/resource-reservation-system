type PgError = { code?: string; constraint?: string; cause?: unknown };

function findPgError(error: unknown): PgError | null {
  let current: unknown = error;
  while (current && typeof current === "object") {
    const candidate = current as PgError;
    if (typeof candidate.code === "string" && candidate.code.length === 5) return candidate;
    current = candidate.cause;
  }
  return null;
}

export function isConstraintViolation(error: unknown, constraint: string) {
  return findPgError(error)?.constraint === constraint;
}

export function isForeignKeyViolation(error: unknown) {
  return findPgError(error)?.code === "23503";
}
