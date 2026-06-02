# Data Box — Supabase Auth URL setup (bklxcjrkhrevdcqjscku)

P0020 signs in on **two** Supabase projects (`signInWorkspaceDual`):

| Plane | Project | Env (P0020 / Vercel) |
|-------|---------|----------------------|
| Tool Hub identity | `fmnrafpzctuhxjaaomzt` | `VITE_HUB_SUPABASE_*` |
| Data Box (Notes, Cookie) | `bklxcjrkhrevdcqjscku` | `VITE_SUPABASE_*` |

Configure **both** projects if login, email confirm, or password reset misbehaves.

**Browser note (2026-05-30):** Account `enzobyczp-dot` only sees project `bklxcjrkhrevdcqjscku`. Hub `fmnrafpzctuhxjaaomzt` lives on another Supabase org — configure Hub Auth URLs while logged into that org (e.g. Tool Hub / `tuanhoangfx` account).

---

## A. Data Box — `bklxcjrkhrevdcqjscku`

Dashboard: https://supabase.com/dashboard/project/bklxcjrkhrevdcqjscku/auth/url-configuration

### 1. Enable Email provider

1. **Authentication** → **Providers** → **Email**
2. Turn **Enable Email provider** ON
3. Recommended for internal tools:
   - **Confirm email**: OFF (faster sign-up) *or* ON if you want inbox verification
   - **Secure email change**: ON
4. **Save**

### 2. URL configuration

1. **Authentication** → **URL Configuration**
2. **Site URL** (primary redirect):

   ```
   https://databox.infix1.io.vn
   ```

3. **Redirect URLs** — add each line (one per row):

   ```
   https://databox.infix1.io.vn/**
   https://databox.infix1.io.vn
   http://127.0.0.1:5177/**
   http://127.0.0.1:5177
   http://localhost:5177/**
   ```

   Wildcard `/**` covers deep links (`/notes`, `/cookie`, query `?screen=`).

4. **Save**

### 3. Optional — password recovery

If you use **Forgot password** on P0020:

- Same redirect list must include production + local URLs above.
- Email templates: **Authentication** → **Email Templates** → reset password link uses Site URL.

### 4. Verify

1. Open https://databox.infix1.io.vn → Sign in
2. DevTools → **Network** → filter `token` or `signup`
3. Requests should go to `https://bklxcjrkhrevdcqjscku.supabase.co/auth/v1/...` with **200** or **400** (bad password), not **Failed to fetch**

---

## B. Tool Hub — `fmnrafpzctuhxjaaomzt`

Dashboard: https://supabase.com/dashboard/project/fmnrafpzctuhxjaaomzt/auth/url-configuration

Same steps; use Tool Hub URLs:

| Field | Value |
|-------|--------|
| Site URL | `https://infix1.io.vn` |
| Redirect URLs | `https://infix1.io.vn/**`, `http://127.0.0.1:5176/**` |

P0020 calls Hub auth **first**; if Hub URLs are wrong, you still see sign-in errors even when Data Box is configured.

---

## C. First login on empty Data Box

| Situation | Action |
|-----------|--------|
| User exists on Hub only | **Sign up** once on P0020 with the **same email** (creates Data Box `auth.users`) |
| Brand-new user | **Sign up** on P0020 (creates both Hub + Data Box) |
| Wrong password | Hub or Data Box returns “Invalid login credentials” (not “Failed to fetch”) |

---

## D. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `Failed to fetch` | Dead/wrong Supabase URL (DNS) | Check `VITE_HUB_*` / `VITE_SUPABASE_*` in Vercel + `.env.local` |
| Invalid login credentials | User not on that project | Sign up on Data Box or reset password |
| Email not confirmed | Confirm email ON | Confirm inbox or disable confirm in Providers |
| Redirect / CORS after OAuth | Missing redirect URL | Add exact origin to Redirect URLs |

---

## Quick links

- Data Box Auth: https://supabase.com/dashboard/project/bklxcjrkhrevdcqjscku/auth/providers
- Data Box URLs: https://supabase.com/dashboard/project/bklxcjrkhrevdcqjscku/auth/url-configuration
- Hub Auth: https://supabase.com/dashboard/project/fmnrafpzctuhxjaaomzt/auth/url-configuration
