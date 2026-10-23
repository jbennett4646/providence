import "server-only";
import { headers } from "next/headers";

/**
 * The site's address for links we hand out (reset emails, Stripe redirects).
 * SITE_URL wins when set, so a forged Host header can't redirect them.
 */
export async function origin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
