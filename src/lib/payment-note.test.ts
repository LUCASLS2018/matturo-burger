import { describe, expect, it } from "vitest";
import { paymentFromNotes, replacePaymentNote } from "./payment-note";

describe("payment note", () => {
  it("switches cash to Multibanco keeping other notes", () => {
    const notes = "Pagamento: Dinheiro — paga com 20,00 € (troco 5,00 €)\nSem cebola";
    const next = replacePaymentNote(notes, "Multibanco");
    expect(paymentFromNotes(next)).toBe("Multibanco");
    expect(next).toContain("Sem cebola");
    expect(next).not.toContain("Dinheiro");
  });
});
