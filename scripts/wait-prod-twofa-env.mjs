/** Wait until production bundle embeds 2FA Supabase ref. */
const REF = "zurfouqanjcubgneuctp";
const ORIGIN = "https://databox.infi.io.vn";
const MAX = Number(process.env.WAIT_MAX ?? 30);
const INTERVAL_MS = Number(process.env.WAIT_INTERVAL_MS ?? 15000);

for (let i = 1; i <= MAX; i++) {
  const html = await fetch(`${ORIGIN}/index.html?cb=${Date.now()}`).then((r) => r.text());
  const jsMatch = html.match(/assets\/(index-[^"]+\.js)/);
  if (!jsMatch) {
    console.log(`[${i}/${MAX}] no bundle in index.html`);
  } else {
    const bundleUrl = `${ORIGIN}/assets/${jsMatch[1]}?cb=${Date.now()}`;
    const js = await fetch(bundleUrl).then((r) => r.text());
    const ok = js.includes(REF);
    console.log(`[${i}/${MAX}] ${jsMatch[1]} TWOFA=${ok ? "YES" : "NO"}`);
    if (ok) process.exit(0);
  }
  if (i < MAX) await new Promise((r) => setTimeout(r, INTERVAL_MS));
}
process.exit(1);
