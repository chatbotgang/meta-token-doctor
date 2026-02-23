# Meta Token Doctor

Diagnose and fix Meta (Facebook/WhatsApp) webhook subscription issues.

**[Live App](https://chatbotgang.github.io/meta-token-doctor/)**

## What It Does

- Validates access tokens (type, scopes, expiry, granular permissions)
- Shows app-level webhook subscriptions and their status
- Discovers WhatsApp Business Accounts from token scopes and business hierarchy
- Checks WABA and Facebook Page subscription status
- One-click subscribe for individual or all missing subscriptions
- Displays phone numbers with quality, throughput, and messaging limits

## Usage

1. Open the [live app](https://chatbotgang.github.io/meta-token-doctor/)
2. Enter your Meta App ID, App Secret, and a User/System User access token
3. Click **Start Diagnosis**
4. Review results — click **Subscribe** or **Fix All** to resolve missing subscriptions

## Security

All credentials are stored in **browser memory only** (never localStorage, cookies, or any server). API calls go directly from your browser to `graph.facebook.com` — no credentials are transmitted to any other server. Tokens are cleared on page refresh.

Note: Tokens (including the App Secret as part of the app token) are passed as URL query parameters per Graph API convention and are visible in browser DevTools. Use on trusted devices only.

## Prerequisites

- A [Meta App](https://developers.facebook.com/apps/) with webhook products configured
- A System User or User access token with relevant permissions (`whatsapp_business_management`, `pages_show_list`, etc.) — see [Facebook API spec](docs/spec/facebook-api.md) for details

## Development

```bash
npm install       # Install dependencies
npm run dev       # Start dev server
npm run build     # Type-check + production build
npm run preview   # Preview production build
```

## Deployment

Automated via GitHub Actions on push to `main`. See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Architecture

See [`docs/spec/`](docs/spec/) for detailed specs (architecture, Facebook API integration, component reference).

## License

[MIT](LICENSE) — Crescendo Lab
