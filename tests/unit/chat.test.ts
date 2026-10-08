import { describe, expect, it } from "vitest";
import {
  chatMessageIdSchema,
  chatMessageSchema,
  MAX_CHAT_MESSAGE_LENGTH,
} from "@/lib/validation/schemas";
import { firstIssue } from "@/lib/errors";

describe("chatMessageSchema", () => {
  it("accetta un messaggio e toglie gli spazi ai bordi", () => {
    const parsed = chatMessageSchema.parse({ body: "  ci vediamo alle 21  " });
    expect(parsed.body).toBe("ci vediamo alle 21");
  });

  it("rifiuta un messaggio vuoto", () => {
    const result = chatMessageSchema.safeParse({ body: "   " });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toMatch(/scriv/i);
  });

  it("rifiuta i messaggi troppo lunghi", () => {
    const result = chatMessageSchema.safeParse({ body: "a".repeat(MAX_CHAT_MESSAGE_LENGTH + 1) });
    expect(result.success).toBe(false);
  });

  it("accetta esattamente il limite massimo", () => {
    const result = chatMessageSchema.safeParse({ body: "a".repeat(MAX_CHAT_MESSAGE_LENGTH) });
    expect(result.success).toBe(true);
  });
});

describe("chatMessageIdSchema", () => {
  it("accetta un uuid", () => {
    const result = chatMessageIdSchema.safeParse({ id: "4b2a1f4e-9c2d-4f0a-8c3e-1a2b3c4d5e6f" });
    expect(result.success).toBe(true);
  });

  it("rifiuta un id non valido", () => {
    expect(chatMessageIdSchema.safeParse({ id: "non-un-uuid" }).success).toBe(false);
  });
});
