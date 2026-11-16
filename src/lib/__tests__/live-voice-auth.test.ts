import { describe, expect, it } from "vitest";
import { createLiveVoiceTicket, verifyLiveVoiceTicket } from "../live-voice-auth";

const USER_ID = "6f7de10d-70a1-4f36-a536-b1a984f67a24";
const SECRET = "test-only-live-voice-secret";

describe("live voice authorization", () => {
  it("accepts a fresh ticket for the authenticated user", async () => {
    const now = Date.now();
    const ticket = await createLiveVoiceTicket(USER_ID, SECRET, now);
    await expect(verifyLiveVoiceTicket(ticket, SECRET, now + 1000)).resolves.toBe(USER_ID);
  });

  it("rejects an expired ticket", async () => {
    const now = Date.now();
    const ticket = await createLiveVoiceTicket(USER_ID, SECRET, now);
    await expect(verifyLiveVoiceTicket(ticket, SECRET, now + 91_000)).resolves.toBeNull();
  });

  it("rejects tampering and a different signing secret", async () => {
    const now = Date.now();
    const ticket = await createLiveVoiceTicket(USER_ID, SECRET, now);
    await expect(verifyLiveVoiceTicket(`${ticket}x`, SECRET, now)).resolves.toBeNull();
    await expect(verifyLiveVoiceTicket(ticket, "another-secret", now)).resolves.toBeNull();
  });
});
