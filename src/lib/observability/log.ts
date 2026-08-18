import "server-only";

/**
 * Structured server logging.
 *
 * Emits one JSON object per line so hosted log drains (Vercel, Datadog, a
 * Sentry transport) can parse and alert on it, rather than the free-text
 * console.error calls that only help someone reading a terminal.
 *
 * Deliberately dependency-free: adding an APM SDK is a real decision with a
 * bundle and a vendor attached. When you take it, `report()` is the single
 * place to forward from.
 */

type Level = "info" | "warn" | "error";

export interface LogContext {
  /** Which subsystem — "generate", "billing", "auth". */
  scope: string;
  /** Stable identifier for the kind of event, for grouping and alerting. */
  event: string;
  /** Never log note content or anything a student wrote. */
  uid?: string;
  [key: string]: unknown;
}

function emit(level: Level, context: LogContext, error?: unknown) {
  const payload: Record<string, unknown> = {
    level,
    ts: new Date().toISOString(),
    ...context,
  };

  if (error instanceof Error) {
    payload.error = { name: error.name, message: error.message };
    // Stacks are noisy in aggregation but essential when triaging, so keep
    // them on errors only.
    if (level === "error") payload.stack = error.stack;
    if ("code" in error) payload.code = String((error as { code?: unknown }).code);
  } else if (error !== undefined) {
    payload.error = { message: String(error) };
  }

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (context: LogContext) => emit("info", context),
  warn: (context: LogContext, error?: unknown) => emit("warn", context, error),
  /**
   * Something a human needs to look at. This is the hook to forward to an
   * error tracker when you add one.
   */
  error: (context: LogContext, error?: unknown) => emit("error", context, error),
};
