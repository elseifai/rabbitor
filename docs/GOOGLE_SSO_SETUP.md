# Google SSO — Manual Setup Guide

Complete these steps before deploying Google Sign-In to local or production.

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project (e.g. `Rabitor Production`)
3. **APIs & Services → OAuth consent screen**
   - User type: **External** (or Internal for Google Workspace only)
   - App name: `Rabitor`
   - Support email: your team email
   - Scopes: `openid`, `email`, `profile`
   - Add test users while the app is in **Testing** mode
4. Publish to **Production** when ready for public sign-in

## 2. Web OAuth client (web + Expo dev)

**APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID → Web application**

| Field | Local | Production |
|-------|-------|------------|
| Authorized JavaScript origins | `http://localhost:3000` | `https://rabitor.elseif.ai` |
| Authorized redirect URIs | `http://localhost:3000/api/auth/google/callback` | `https://rabitor.elseif.ai/api/auth/google/callback` |

Copy **Client ID** and **Client Secret** into web and API env (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

## 3. Mobile OAuth clients (production builds)

Create additional OAuth clients in the same project:

**iOS**
- Bundle IDs: `com.rabbit.mobile`, `com.rabbit.delivery`

**Android**
- Package names: `com.rabbit.mobile`, `com.rabbit.delivery`
- SHA-1: `keytool -list -v -keystore your.keystore`

**Expo Go (local dev)** — add to the **Web client** redirect URIs:
- `https://auth.expo.io/@your-expo-username/rabbit-mobile`
- `https://auth.expo.io/@your-expo-username/rabbit-delivery`

Standalone builds use custom schemes (`rabbit://`, `rabbit-delivery://`) via iOS/Android clients.

## 4. JWT secret

```bash
openssl rand -base64 32
```

Set the same value as `JWT_SECRET` on **web** and **API**.

## 5. Email OTP (optional)

1. [Resend](https://resend.com) → verify domain → API key → `RESEND_API_KEY`
2. `EMAIL_FROM=Rabitor <noreply@elseif.ai>`

## 6. Production DNS

- `https://rabitor.elseif.ai` → Next.js web
- `https://api.rabitor.elseif.ai` → Express API

## 7. Google Maps (optional)

Maps JavaScript API → API key restricted to `rabitor.elseif.ai` → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
