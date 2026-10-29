import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (
    !path.length ||
    ![
      "config",
      "books",
      "web-search",
      "recommendations",
      "me",
      "feedback",
      "sessions",
      "admin",
      "paths",
      "evaluation",
      "auth",
    ].includes(path[0]) ||
    path.some((p) => !p || p.includes(".."))
  )
    return NextResponse.json({ detail: "Unknown API route." }, { status: 404 });
  if (!["GET", "HEAD"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const expectedOrigin =
      process.env.APP_ORIGIN ||
      `${req.nextUrl.protocol}//${req.headers.get("host")}`;
    if (origin && origin !== expectedOrigin)
      return NextResponse.json(
        { detail: "Invalid request origin." },
        { status: 403 },
      );
  }
  const supplied = req.cookies.get("shelfsense-device")?.value;
  const valid =
    !!supplied &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      supplied,
    );
  const device = valid ? supplied! : randomUUID();
  const headers = new Headers({
    "x-device-id": device,
    "x-gateway-secret": process.env.GATEWAY_SECRET || "local-demo-only",
  });
  const localSession = req.cookies.get("shelfsense-session")?.value;
  if (localSession) headers.set("x-local-session", localSession);
  for (const name of ["content-type", "authorization"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const body = ["GET", "HEAD"].includes(req.method)
      ? undefined
      : await req.arrayBuffer();
    if (body && body.byteLength > 1_100_000)
      return NextResponse.json(
        { detail: "Request is too large." },
        { status: 413 },
      );
    const result = await fetch(
      `${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/v1/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`,
      {
        method: req.method,
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(85000),
      },
    );
    const isAccountMutation =
      path[0] === "auth" &&
      ["signup", "login", "recover", "logout"].includes(path[1]);
    let accountData: Record<string, unknown> | null = null;
    if (isAccountMutation) accountData = await result.json();
    const token = accountData?.session_token;
    if (accountData) delete accountData.session_token;
    const response = new NextResponse(
      accountData ? JSON.stringify(accountData) : result.body,
      {
        status: result.status,
        headers: {
          "Content-Type":
            result.headers.get("content-type") || "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
    if (result.ok && typeof token === "string")
      response.cookies.set("shelfsense-session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        maxAge: 7 * 24 * 3600,
        path: "/",
      });
    if (result.ok && path[0] === "auth" && path[1] === "logout")
      response.cookies.set("shelfsense-session", "", {
        httpOnly: true,
        maxAge: 0,
        path: "/",
      });
    if (!valid)
      response.cookies.set("shelfsense-device", device, {
        httpOnly: true,
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    return response;
  } catch {
    return NextResponse.json(
      {
        detail:
          "The library service is unavailable. Please start the Python backend and try again.",
      },
      { status: 503 },
    );
  }
}
export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
