# Environment Setup - Personal Hub Monorepo

This document explains how to configure environment variables for the Personal Hub monorepo.

## 📋 Overview

All packages in this monorepo (`warranties`, `portfolio`, `home-contracts`) share **a single `.env.local` file in the root directory**.

```
personal-hub/                 ← Root of monorepo
├── .env.example             ← Template
├── .env.local               ← Your credentials (NOT committed to git)
├── packages/
│   ├── warranties/
│   ├── portfolio/
│   └── home-contracts/
```

Each package's `vite.config.ts` is configured to look for `.env` files in the **root directory** using:

```typescript
envDir: path.resolve(__dirname, "../../"),
```

## 🔧 Quick Setup

### 1. Create `.env.local` from template

```bash
cd personal-hub                    # Root of the project
cp .env.example .env.local
```

### 2. Fill in your credentials

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → API**
4. Copy **Project URL** and **anon (public) key**

### 3. Restart dev server

```bash
npm run dev    # Will now pick up .env.local from root
```

## ✅ Verification

To verify that environment variables are loaded correctly:

### Via Browser Console

Open any package in dev mode and check:

```javascript
console.log(import.meta.env.VITE_SUPABASE_URL)     // Should show your URL
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY) // Should show your key
```

### Via Terminal

```bash
# In the root or any package directory
echo $VITE_SUPABASE_URL
```

## 📦 What Each Package Accesses

All three SPAs access the same environment variables:

| Package | Env Used | Purpose |
|---------|----------|---------|
| `warranties` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Warranty management, receipts storage |
| `portfolio` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Investment tracking (if implemented) |
| `home-contracts` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Contract management, price history |

## ⚠️ Important Notes

### DO NOT commit `.env.local`
This file contains sensitive credentials and should **never be committed to git**. It's listed in `.gitignore`.

### DO NOT create `.env.local` in individual packages
Each package is configured to look in the **root** directory only. Creating `.env.local` in `packages/warranties/.env.local` will **not work**.

### Environment Variables in Vite
In Vite, all environment variables must be prefixed with `VITE_` to be exposed to the browser. Server-only variables don't get the prefix.

## 🐛 Troubleshooting

### "Supabase credentials not configured"

**Problem**: App shows "Supabase credentials not configured" error

**Solution**:
1. ✅ Check that `.env.local` exists in the **root** (not in `packages/xyz/`)
2. ✅ Verify both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. ✅ Restart the dev server after creating `.env.local`
4. ✅ Check browser console for what values it actually has

```javascript
// In browser console
import.meta.env.VITE_SUPABASE_URL      // Must not be undefined
import.meta.env.VITE_SUPABASE_ANON_KEY // Must not be undefined
```

### Variables not updating after editing `.env.local`

**Problem**: Changed `.env.local` but app still shows old values

**Solution**:
1. Kill the dev server (Ctrl+C)
2. Delete the Vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```
3. Restart dev server:
   ```bash
   npm run dev
   ```

### Different packages seeing different environment values

**Problem**: `warranties` sees the correct URL but `home-contracts` doesn't

**Solution**: 
1. Confirm `.env.local` is in the **root**, not in individual packages
2. Check that each package's `vite.config.ts` has `envDir: path.resolve(__dirname, "../../")`
3. Restart all dev servers

## 🔐 Security

### For Development
- `.env.local` is local-only and not committed to git
- Credentials are only exposed to the browser (via Vite's `VITE_` prefix)
- Supabase RLS is configured to allow anonymous access (review security policies)

### For Production
- Never hardcode credentials in source code
- Use environment secrets in your deployment platform
- Rotate keys regularly in Supabase Dashboard

## 📚 Related Documentation

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase Client Setup](https://supabase.com/docs/reference/javascript/initializing)
- [Monorepo Best Practices](https://www.npmjs.com/package/monorepo-cli)

---

**Last Updated**: March 2026  
**Status**: ✅ All packages configured for shared `.env`
