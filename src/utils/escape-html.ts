// Anything typed by a person (message bodies, client and practice names)
// must be escaped before it goes into an HTML email.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeHtmlWithBreaks(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}
