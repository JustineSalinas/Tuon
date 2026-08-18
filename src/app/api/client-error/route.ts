import { NextResponse } from "next/server";

import { log } from "@/lib/observability/log";

/**
 * Receives errors that happened in the browser.
 *
 * Without this, a crash on a student's phone is invisible — the prefill bug
 * that broke every generation was only found by reading a local dev log.
 *
 * Unauthenticated on purpose: an error boundary often fires precisely when
 * auth is broken. That makes it abusable as a log-spam target, so the payload
 * is strictly bounded and nothing here touches the database.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: unknown;
      digest?: unknown;
      route?: unknown;
    };

    const clip = (value: unknown, max: number) =>
      typeof value === "string" ? value.slice(0, max) : undefined;

    log.error({
      scope: "client",
      event: "unhandled_error",
      message: clip(body.message, 500),
      digest: clip(body.digest, 100),
      route: clip(body.route, 200),
      userAgent: request.headers.get("user-agent")?.slice(0, 200),
    });
  } catch {
    // A malformed report is not worth an error of its own.
  }

  // Always 204: the client must not retry or surface a failure here.
  return new NextResponse(null, { status: 204 });
}
