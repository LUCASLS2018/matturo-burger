import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "./stripe-webhook";

async function testHeader(payload: string, timestamp: number) {
  const secret = "whsec_test_fixture";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = [...new Uint8Array(signed)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { secret, header: `t=${timestamp},v1=${hex}` };
}

describe("verifyStripeSignature", () => {
  it("accepts a current valid signature", async () => {
    const payload = JSON.stringify({ id: "evt_test" });
    const { secret, header } = await testHeader(payload, Math.floor(Date.now() / 1000));
    expect(await verifyStripeSignature(payload, header, secret)).toBe(true);
  });

  it("rejects an invalid signature and an expired timestamp", async () => {
    const payload = JSON.stringify({ id: "evt_test" });
    const now = Math.floor(Date.now() / 1000);
    const { secret, header } = await testHeader(payload, now);
    expect(await verifyStripeSignature(payload, `t=${now},v1=${"0".repeat(64)}`, secret)).toBe(false);
    expect(await verifyStripeSignature(payload, header.replace(`t=${now}`, `t=${now - 1000}`), secret)).toBe(false);
  });
});
