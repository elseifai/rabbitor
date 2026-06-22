# Rabbitor — Work Handoff

This document describes work completed by Claude that is **committed and pushed**
to GitHub but not yet opened as PRs / merged / deployed. Hand this to Cursor (or
run yourself) to verify and ship.

Repo: `github-elseifai:elseifai/rabbitor` · Default branch: `main`

---

## Branch 1 — `feature/sso-signup-login`  (web auth overhaul)

**Head commit:** `89a198c` · pushed ✅

### What it does
Replaces phone/SMS OTP (blocked by Indian DLT) with **email verification
(6-digit OTP + magic sign-in link)** and **Google SSO**, additively, across
ALL roles. Built on the existing `jose` cookie session — `requireSession`,
`RoleGate`, all dashboards unchanged. Phone is now optional.

### Key commits
- Schema: `phone` optional; add `emailVerified`, `googleId`, `EmailVerification` model
- Backend: `apps/web/src/lib/email.ts` (Resend), email OTP + magic link + Google
  OAuth in `lib/auth.ts`, server actions in `actions/auth.ts`,
  `/api/auth/google/{start,callback}`, `/auth/verify` page, AuthContext hydration
- Login UIs migrated to email + Google: merchant (`/merchant/login`),
  shared/delivery (`/auth`), customer (`/login` + profile), admin (`/admin/login`)
- `89a198c` UI bonus: animated add-to-cart (spring morph + count bounce) in
  `apps/web/src/components/products/UnifiedProductCard.tsx`

### REQUIRED before this works in production (set on the VPS / web env)
```
RESEND_API_KEY=...            # from resend.com, for sending emails
EMAIL_FROM="Rabbit <noreply@yourdomain>"   # must be a Resend-verified domain
GOOGLE_CLIENT_ID=...          # Google Cloud console OAuth client
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=http://103.108.117.160:3000   # or https://rabbitor.elseif.ai
```
Google OAuth **Authorized redirect URI** must include:
`<NEXT_PUBLIC_APP_URL>/api/auth/google/callback`

### Ship steps (Cursor / you)
1. `git checkout feature/sso-signup-login && git pull`
2. Run the Prisma migration for the new schema:
   `pnpm --filter @rabbit/database exec prisma migrate deploy`
   (or `prisma db push` against the DB)
3. Verify build: `cd apps/web && pnpm build` (should already pass)
4. Open PR → review → merge to `main`
5. Redeploy the web app on the VPS with the env vars above set
6. Test: email OTP + magic link + Google sign-in for each role

---

## Branch 2 — `feature/mobile-app-redesign`  (native app UI rebuild)

**Head commit:** `4398fc0` · pushed ✅

### What it does
Full UI rebuild of the **customer mobile app** (`apps/mobile`, Expo SDK 53 /
React Native 0.79 / expo-router) to Zepto/Blinkit/Swiggy-level polish. Backend
(`apps/api` + Postgres) is **unchanged** — only the app UI.

### Foundation added
- **NativeWind v4** (Tailwind for React Native) with Rabbitor brand tokens
  (`tailwind.config.js`, `global.css`, `metro.config.js`, babel preset,
  `nativewind-env.d.ts`)
- Libraries: `nativewind`, `tailwindcss`, `expo-image`, `@shopify/flash-list`, `moti`
- Design tokens + helpers in `lib/theme.ts`
- UI kit in `components/ui/`: `Skeleton`, `Chip`, `CartBar`

### Screens redesigned (all on the design system, with skeletons + animations)
| Screen | File |
|---|---|
| Auth (phone OTP) | `app/auth.tsx` |
| Home (location, search, chips, shop cards) | `app/(tabs)/index.tsx` |
| Search (live filter) | `app/search.tsx` |
| Shop detail (animated ADD↔stepper, cart bar) | `app/shop/[id].tsx` |
| Cart (free-delivery tracker, bill, sticky checkout) | `app/cart.tsx` |
| Checkout (address, COD/online, Razorpay preserved) | `app/checkout.tsx` |
| Order tracking (map + status timeline, live socket) | `app/track/[id].tsx` |
| Orders (status cards, refresh) | `app/(tabs)/orders.tsx` |
| Profile (identity card, menu) | `app/(tabs)/profile.tsx` |
| Tab bar (branded) | `app/(tabs)/_layout.tsx` |
| Cards/badges | `components/ProductCard.tsx`, `ShopCard.tsx`, `CartItem.tsx`, `OrderStatusBadge.tsx` |

### Run it (Cursor / you)
```
git checkout feature/mobile-app-redesign && git pull
cd apps/mobile
pnpm install
pnpm start            # press i (iOS), a (Android), or scan QR in Expo Go
# if Metro errors on first run, clear cache:
pnpm start -- --clear
```
- The app calls the API at `http://localhost:4000` by default. Make sure
  `apps/api` is running, OR set the real server:
  `EXPO_PUBLIC_API_URL=https://<your-api-host>` (e.g. in a `.env` or shell).
- `pnpm --filter @rabbit/mobile typecheck` passes (verified).

### Going live (mobile = app builds, NOT a web server)
A native app does not deploy to a URL. To distribute:
```
cd apps/mobile
npx eas build --platform android   # and/or ios
npx eas submit                      # to Play Store / App Store
```
(Requires an Expo/EAS account + store developer accounts.)

---

## Open the PRs
`gh` was not authenticated in Claude's environment, so PRs are not opened yet.
```
gh pr create --base main --head feature/sso-signup-login   --title "Email OTP + magic link + Google SSO across all roles"
gh pr create --base main --head feature/mobile-app-redesign --title "Mobile app UI redesign (NativeWind, Zepto-level)"
```
Or via browser:
- https://github.com/elseifai/rabbitor/pull/new/feature/sso-signup-login
- https://github.com/elseifai/rabbitor/pull/new/feature/mobile-app-redesign

---

## Notes / gotchas

- **NativeWind v4 + Reanimated 3 (fixed in commit after `caa5b2c`).** NativeWind's
  default Babel preset (`react-native-css-interop`) unconditionally loads
  `react-native-worklets/plugin` (Reanimated 4), but this app uses Reanimated
  **3.17**. First `pnpm start` fails to bundle. Fix applied:
  - `babel.config.js` inlines the css-interop Babel plugin + JSX transform
    (`importSource: 'react-native-css-interop'`) and keeps
    `react-native-reanimated/plugin`, **without** the worklets plugin.
  - `react-native-css-interop@0.2.5` added as a direct dependency (so Metro can
    resolve its jsx-runtime).
  - `@types/react` pinned to `^19.0.14` (Expo SDK 53 compatible).
  If you later upgrade to Reanimated 4, revert to the standard
  `presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel']`.

- There is a `git stash` entry on the sso branch holding linter reverts that are
  **not wanted** — safe to drop: `git stash drop`.
- Mobile app uses **phone OTP** (its own `apps/api` `/auth/otp/*` endpoints),
  separate from the web's new email/Google auth. Unifying them later is optional.
- `apps/mobile/AGENTS.md` says to check Expo versioned docs — installed Expo is
  SDK **53** (not 56); use https://docs.expo.dev/versions/v53.0.0/ if needed.
