import type { RequestHandler } from "express";
import { sendErrorPage } from "./errors.ts";
import { timingSafeEqual } from "node:crypto";
export function validateRequestOrigin(appOrigin: string): RequestHandler {
  return (req, res, next) => {
    if (req.method !== "POST") return next();
    if (req.headers.origin) {
      if (req.headers.origin === appOrigin) return next();
      else
        return sendErrorPage(
          res,
          403,
          "Forbidden",
          "The request did not come from the app.",
        );
    }

    // Fall back to Referer when Origin is absent; reject if neither matches.
    try {
      if (
        req.headers.referer &&
        new URL(req.headers.referer as string).origin === appOrigin
      ) {
        return next();
      }
    } catch {
      // An invalid Referer is rejected below.
    }

    return sendErrorPage(
      res,
      403,
      "Forbidden",
      "The request did not come from the app.",
    );
  };
}

export function csrfTokensMatch(expected: string, actual: unknown): boolean {
  if (typeof actual !== "string") {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
