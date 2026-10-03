/**
 * LaTeX Sanitization & Escaping for Resurox Web Tailoring (Section 6.1).
 * Strictly neutralizes dynamic strings; whitelist-validates URLs for \href.
 */

const MAP: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  "$": "\\$",
  "#": "\\#",
  "_": "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

export const esc = (s: string): string => {
  if (!s) return "";
  return s
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[\\&%$#_{}~^]/g, (c) => MAP[c] || c);
};

// URLs: whitelist, then escape for \href
export function safeUrl(u: string): string | null {
  if (!u) return null;
  return /^https?:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+$/.test(u)
    ? u.replace(/[%#]/g, (c) => "\\" + c)
    : null;
}
