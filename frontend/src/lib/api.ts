import { createClient } from "@supabase/supabase-js";
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && publicKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, publicKey)
    : null;
export async function authHeaders(): Promise<Record<string, string>> {
  const session = supabase
    ? (await supabase.auth.getSession()).data.session
    : null;
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  await ensureDevice();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  for (const [key, value] of Object.entries(await authHeaders()))
    headers.set(key, value);
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers,
    cache: "no-store",
    signal: options.signal || AbortSignal.timeout(85000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      typeof error.detail === "string"
        ? error.detail
        : "The request could not be completed. Check your input and try again.",
    );
  }
  return response.json();
}

let deviceReady: Promise<void> | null = null;
export function ensureDevice(): Promise<void> {
  if (!deviceReady) {
    deviceReady = fetch("/api/auth/me", {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
      .then((response) => {
        if (!response.ok)
          throw new Error("The library service is unavailable.");
      })
      .catch((error) => {
        deviceReady = null;
        throw error;
      });
  }
  return deviceReady;
}
