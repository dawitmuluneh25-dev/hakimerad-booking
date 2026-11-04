import { describe, expect, it } from "vitest";
import { declaredTypeMatchesBytes, sniffFileType } from "./file-type.ts";

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);
const html = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");
const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);

describe("sniffFileType", () => {
  it("recognises the four accepted types", () => {
    expect(sniffFileType(pdf)).toBe("application/pdf");
    expect(sniffFileType(jpeg)).toBe("image/jpeg");
    expect(sniffFileType(png)).toBe("image/png");
    expect(sniffFileType(webp)).toBe("image/webp");
  });

  it("rejects content that is not one of them", () => {
    expect(sniffFileType(html)).toBeNull();
    expect(sniffFileType(exe)).toBeNull();
    expect(sniffFileType(new Uint8Array([]))).toBeNull();
  });

  it("needs the full signature, not just a prefix", () => {
    expect(sniffFileType(new Uint8Array([0x25, 0x50]))).toBeNull();
    expect(sniffFileType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    // RIFF alone is also a WAV or an AVI.
    expect(sniffFileType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]))).toBeNull();
  });
});

describe("declaredTypeMatchesBytes", () => {
  it("accepts a truthful declaration", () => {
    expect(declaredTypeMatchesBytes("application/pdf", pdf)).toBe(true);
    expect(declaredTypeMatchesBytes("image/png", png)).toBe(true);
  });

  it("accepts image/jpg as a spelling of image/jpeg", () => {
    expect(declaredTypeMatchesBytes("image/jpg", jpeg)).toBe(true);
  });

  it("rejects a renamed or relabelled file", () => {
    expect(declaredTypeMatchesBytes("application/pdf", html)).toBe(false);
    expect(declaredTypeMatchesBytes("image/png", pdf)).toBe(false);
    expect(declaredTypeMatchesBytes("application/pdf", exe)).toBe(false);
  });
});
