/** Shared helpers: detect TWOFA anon key embedded in production Vite bundle. */
export function hasTwofaAnonInBundle(js) {
  const empty = /zurfouqanjcubgneuctp\.supabase\.co",\w+=""/.test(js);
  if (empty) return { ok: false, reason: "empty anon binding" };
  const withJwt = /zurfouqanjcubgneuctp\.supabase\.co",\w+="(eyJ[^"]+)"/.test(js);
  if (withJwt) return { ok: true, reason: "jwt embedded" };
  const jwtNear = js.includes("zurfouqanjcubgneuctp") && /zurfouqanjcubgneuctp[\s\S]{0,120}eyJ/.test(js);
  return { ok: jwtNear, reason: jwtNear ? "jwt near ref" : "pattern miss" };
}
