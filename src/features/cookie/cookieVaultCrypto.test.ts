import { describe, expect, it } from "vitest";
import { decryptVaultPayload, encryptVaultPayload } from "./cookieVaultCrypto";

describe("cookieVaultCrypto V4", () => {
  it("round-trips cookie jar with same pass + note + domain", async () => {
    const cookies = [
      {
        name: "sid",
        value: "secret-session-12345",
        domain: ".facebook.com",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "lax" as const,
        expirationDate: Math.floor(Date.now() / 1000) + 3600,
      },
    ];
    const enc = await encryptVaultPayload("test-pass", "5b675aab-4a04-442a-a86f-dab37c4e12e4", ".facebook.com", cookies);
    const out = await decryptVaultPayload(
      "test-pass",
      "5b675aab-4a04-442a-a86f-dab37c4e12e4",
      ".facebook.com",
      enc.ciphertext,
      enc.iv,
    );
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("sid");
    expect(out[0].value).toBe("secret-session-12345");
  });
});
