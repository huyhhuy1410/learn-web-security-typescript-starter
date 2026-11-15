import type { CookieOptions, Response } from "express";

const SESSION_COOKIE_NAME = "session_id";

const sessionCookieOptions = {
  path: "/",
  expires: new Date(0),
  httpOnly: true,
  secure: true,
  sameSite: "lax",
} satisfies CookieOptions;

type CookieSession = {
  token: string;
  expires_at: string;
};

export function setSessionCookie(
  response: Response,
  session: CookieSession,
): void {
  sessionCookieOptions.expires = new Date(session.expires_at); // your DB string
  response.cookie(SESSION_COOKIE_NAME, session.token, sessionCookieOptions);
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
}
