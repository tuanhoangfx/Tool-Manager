const REF = "zurfouqanjcubgneuctp";
const urls = process.argv.slice(2);
if (!urls.length) urls.push("https://databox.infi.io.vn", "https://tool-manager-ao2vxtwb1-tuanhoangfxs-projects.vercel.app");

for (const origin of urls) {
  const html = await fetch(`${origin}/index.html?cb=${Date.now()}`).then((r) => r.text());
  const m = html.match(/assets\/(index-[^"]+\.js)/);
  if (!m) {
    console.log(origin, "NO_BUNDLE");
    continue;
  }
  const js = await fetch(`${origin}/assets/${m[1]}?cb=${Date.now()}`).then((r) => r.text());
  console.log(origin, m[1], js.includes(REF) ? "TWOFA=YES" : "TWOFA=NO");
}
