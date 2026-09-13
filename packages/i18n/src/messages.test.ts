import { describe, expect, it } from "vitest";
import { flattenKeys, loadMessages, lookup, messageSources } from "./messages";
import { formatDateTime, formatMoney } from "./format";

function flatValues(obj: Record<string, unknown>): unknown[] {
  return Object.values(obj).flatMap((v) => (v && typeof v === "object" ? flatValues(v as Record<string, unknown>) : [v]));
}

describe("tərcümələr və formatlama", () => {
  it("üç dildə eyni, boş olmayan açarlar var", () => {
    messageSources.az.forEach((azPart, i) => {
      const keys = flattenKeys(azPart).sort();
      for (const locale of ["ru", "en"] as const) {
        const part = messageSources[locale][i]!;
        expect(flattenKeys(part).sort(), `${locale} fayl #${i}`).toEqual(keys);
        expect(flatValues(part).every((v) => typeof v === "string" && v.trim().length > 0)).toBe(true);
      }
    });
    expect(loadMessages("en").book).toBe("Book a service");
    expect(lookup(loadMessages("ru"), "common.save")).toBeTruthy();
  });

  it("Bakı vaxtı ilə gün sərhədini və sıfır pulu düzgün formatlayır", () => {
    expect(formatDateTime("2026-09-13T21:30:00Z", "en")).toBe("14.09.2026 01:30");
    expect(formatMoney({ amount: "0.00", currency: "AZN" }, "en")).toContain("0.00");
  });
});
