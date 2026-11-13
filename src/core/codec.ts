/** Small helpers for text codes (bridge codes, level codes). Pure, no browser objects except btoa/atob. */

/** Bytes (0-255) to base64url without padding: only A-Z a-z 0-9 - _ (safe in ids and codes). */
export const toB64 = (bytes: number[]): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const fromB64 = (text: string): number[] | null => {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return [...bin].map((c) => c.charCodeAt(0));
  } catch {
    return null;
  }
};

/** Small checksum so typos in a pasted code are caught. */
export const checksum = (text: string): string => {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 46656;
  return h.toString(36).padStart(3, '0');
};
