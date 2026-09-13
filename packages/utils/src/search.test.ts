import { describe, expect, it } from "vitest";
import { compactKey, normalizeSearchText } from "./search";
import { normalizeAzPhone, maskPhone, isValidAzPhone } from "./mask";
describe("Azerbaijani customer input", () => {
  it("normalizes Azerbaijani letters and model separators", () => {
    expect(normalizeSearchText("TƏMİR")).toBe("temir");
    expect(compactKey("LG X-123")).toBe(compactKey("lgx123"));
  });
  it("accepts local phone input and masks the subscriber number", () => {
    expect(normalizeAzPhone("050 123 45 67")).toBe("+994501234567");
    expect(isValidAzPhone("050 123 45 67")).toBe(true);
    expect(isValidAzPhone("050 123")).toBe(false);
    expect(maskPhone("+994501234567")).toBe("+994 (50) ***-**-67");
  });
});
