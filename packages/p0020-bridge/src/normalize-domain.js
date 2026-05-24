/** Turn URL or hostname into cookie jar domain (e.g. https://www.facebook.com/ → .facebook.com) */
export function normalizeCookieDomain(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  let host = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      host = new URL(raw).hostname;
    } else {
      host = raw.split("/")[0] ?? raw;
    }
  } catch {
    return null;
  }

  host = host.replace(/^\.+/, "").toLowerCase();
  if (!host || !host.includes(".")) return null;

  const withoutWww = host.replace(/^www\./, "");
  return `.${withoutWww}`;
}
