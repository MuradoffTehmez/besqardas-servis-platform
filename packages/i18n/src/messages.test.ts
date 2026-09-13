import { describe, expect, it } from "vitest";
import { loadMessages } from "./messages";
import { formatDateTime, formatMoney } from "./format";
import az from "../messages/az.json";
import ru from "../messages/ru.json";
import en from "../messages/en.json";
describe("demo translations and formatting", () => {
  it("contains the same nonempty UI keys in all three languages", () => {
    for (const messages of [ru, en]) {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(az).sort());
      expect(Object.values(messages).every((value) => value.trim().length > 0)).toBe(true);
    }
    expect(loadMessages("en").book).toBe("Book a service");
  });
  it("formats a UTC day boundary in Baku and preserves zero money", () => {
    expect(formatDateTime("2026-09-13T21:30:00Z", "en")).toBe("14.09.2026 01:30");
    expect(formatMoney({ amount: "0.00", currency: "AZN" }, "en")).toContain("0.00");
  });
});
