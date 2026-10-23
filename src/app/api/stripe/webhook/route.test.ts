import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { connectPglite, migrate, type Db } from "@/db/client";

let db: Db;
vi.mock("@/db/client", async (orig) => ({ ...(await orig<typeof import("@/db/client")>()), getDb: async () => db }));

const SECRET = "whsec_test_secret";
const env = { ...process.env };

beforeAll(async () => {
  db = await connectPglite();
  await migrate(db);
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
}, 30_000);

afterAll(() => {
  process.env = env;
});

const post = (body: string, sig?: string) =>
  new Request("http://localhost/api/stripe/webhook", { method: "POST", body, headers: sig ? { "stripe-signature": sig } : {} });

describe("Stripe webhook", () => {
  it("rejects a request without a valid signature", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated", data: { object: {} } });
    expect((await POST(post(body))).status).toBe(400);
    expect((await POST(post(body, "t=1,v1=bad"))).status).toBe(400);
  });

  it("accepts a signed event", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ id: "evt_signed", object: "event", type: "invoice.paid", data: { object: {} } });
    const sig = new Stripe("sk_test_dummy").webhooks.generateTestHeaderString({ payload: body, secret: SECRET });
    const res = await POST(post(body, sig));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });
});
