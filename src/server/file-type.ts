/**
 * Identifies an upload from its own bytes.
 *
 * The declared Content-Type is a claim made by the browser. A file named
 * `referral.pdf` that actually contains HTML, a script or an executable must not
 * be stored because the client asserted a type, so the bytes are checked before
 * anything reaches the disk. Everything stored is served back with
 * `x-content-type-options: nosniff`, so a mismatch can never be re-interpreted
 * by the recipient.
 */

type Signature = {
  readonly type: string;
  readonly matches: (bytes: Uint8Array) => boolean;
};

function startsWith(bytes: Uint8Array, expected: readonly number[]): boolean {
  if (bytes.byteLength < expected.length) return false;
  return expected.every((value, index) => bytes[index] === value);
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.byteLength < offset + length) return "";
  let out = "";
  for (let index = offset; index < offset + length; index += 1) {
    out += String.fromCharCode(bytes[index] ?? 0);
  }
  return out;
}

const SIGNATURES: readonly Signature[] = [
  // "%PDF"
  { type: "application/pdf", matches: (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46]) },
  // JPEG SOI marker followed by another marker.
  { type: "image/jpeg", matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) },
  {
    type: "image/png",
    matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  // "RIFF" .... "WEBP"
  {
    type: "image/webp",
    matches: (bytes) => startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && asciiAt(bytes, 8, 4) === "WEBP",
  },
];

/** The type the bytes actually are, or null when nothing here recognises them. */
export function sniffFileType(bytes: Uint8Array): string | null {
  for (const signature of SIGNATURES) {
    if (signature.matches(bytes)) return signature.type;
  }
  return null;
}

/**
 * Whether the bytes match the type the client declared. `image/jpg` is treated
 * as `image/jpeg` because some clients send it.
 */
export function declaredTypeMatchesBytes(declared: string, bytes: Uint8Array): boolean {
  const normalised = declared === "image/jpg" ? "image/jpeg" : declared;
  return sniffFileType(bytes) === normalised;
}
