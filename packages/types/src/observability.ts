/**
 * Error reporting hygiene shared by the browser and the server
 * (docs/16-DEPLOYMENT.md §Observability). Two jobs, both pure:
 *
 * 1. `scrubText` — nothing that identifies a person leaves the process in
 *    an error report or an alert: email addresses, phone numbers, bearer
 *    tokens, signed URLs and secret-looking query parameters are replaced
 *    before the text reaches Sentry or Telegram. A user is referred to by
 *    id only.
 * 2. `errorFingerprint` — one bug that fires two hundred times is one
 *    alert, so errors are grouped by what they are rather than by the ids
 *    and numbers inside their message.
 */

const REPLACEMENTS: Array<[RegExp, string]> = [
  // A signed or tokenised URL: keep where it points, drop its query.
  [/\b(https?:\/\/[^\s?#"'<>]+)\?[^\s#"'<>]*/gi, "$1?[redacted]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]"],
  [
    /\b(token|access_token|refresh_token|secret|password|passwd|signature|api_?key|code|session|cookie)(["']?\s*[=:]\s*["']?)[^\s&"',;]+/gi,
    "$1$2[redacted]",
  ],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
  // Israeli mobile and landline numbers, local or international form.
  [/(?:\+972[-\s]?|\b0)(?:[23489]|5\d|7\d)[-\s]?\d{3}[-\s]?\d{4}\b/g, "[phone]"],
];

export function scrubText(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REPLACEMENTS) out = out.replace(pattern, replacement);
  return out;
}

/** The same message with its variable parts (ids, numbers, quoted values) folded. */
export function normalizeErrorMessage(message: string): string {
  return scrubText(message)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "#")
    .replace(/\b(?=[a-z0-9]*\d)[a-z0-9]{16,}\b/gi, "#")
    .replace(/\d+/g, "#")
    .replace(/"[^"]{0,200}"|'[^']{0,200}'/g, "…")
    .trim()
    .slice(0, 200);
}

/**
 * The first stack frame that is ours, without its column, so a rebuild
 * that shifts a column does not split a group.
 */
export function topStackFrame(stack: string | undefined): string {
  if (!stack) return "";
  const frames = stack
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("at ") || /@/.test(l));
  const own = frames.find((l) => !l.includes("node_modules") && !l.includes("node:")) ?? frames[0] ?? "";
  return own.replace(/:\d+\)?$/, "").replace(/\?[^\s:)]*/g, "");
}

export function errorFingerprint(parts: { source: string; name: string; message: string; stack?: string }): string {
  return [parts.source, parts.name, normalizeErrorMessage(parts.message), topStackFrame(parts.stack)].join("|");
}
