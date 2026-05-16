# Static Deploy and AdSense Preparation

This project is a Vite PWA. The deployable output is the `dist/` directory.

## Static Deploy

Build:

```bash
npm run build
```

Output:

```text
dist/
```

Recommended hosting options:

| Host | Build command | Output directory | Notes |
|---|---|---|---|
| Vercel | `npm run build` | `dist` | `vercel.json` rewrites SPA routes to `index.html`. |
| Netlify | `npm run build` | `dist` | `netlify.toml` and `_redirects` are included. |
| Cloudflare Pages | `npm run build` | `dist` | `_redirects` is copied from `public/`. |

After deploy, open the HTTPS URL on iPhone Safari and use:

```text
Share -> Add to Home Screen
```

## Public Pages

AdSense should not be placed in the private daily-recording flow first. The app now has public content/policy routes:

```text
/about
/guide
/cat-health-log-template
/privacy
/terms
```

These pages are intended for:

- Product explanation
- Useful cat health logging content
- Privacy/terms disclosure
- Future AdSense placement

## AdSense Environment Variables

Copy `.env.example` to `.env.local` when you have approved AdSense values:

```bash
cp .env.example .env.local
```

Set:

```bash
VITE_ADSENSE_CLIENT=ca-pub-0000000000000000
VITE_ADSENSE_SLOT_CONTENT=0000000000
```

Then build and deploy again:

```bash
npm run build
```

When the variables are empty, no AdSense script is loaded. Public pages show reserved ad placeholders only.

## AdSense Review Checklist

Before applying:

- Use a real HTTPS domain.
- Publish original public content, not only the app screen.
- Keep `/privacy` and `/terms` reachable.
- Add a contact method before production review.
- Do not place ads inside the daily record input flow initially.
- Update the privacy policy with Google advertising/cookie disclosure after enabling AdSense.
- If serving ads to users in the EEA, UK, or Switzerland, use a Google-certified CMP as required by Google's EU user consent policy.

## Official References

- Vite static deploy: https://vite.dev/guide/static-deploy.html
- Vercel rewrites: https://vercel.com/docs/rewrites
- Netlify rewrites: https://docs.netlify.com/routing/redirects/rewrites-proxies/
- Cloudflare Pages redirects: https://developers.cloudflare.com/pages/configuration/redirects/
- AdSense eligibility: https://support.google.com/adsense/answer/9724
- AdSense code: https://support.google.com/adsense/answer/9274019
- Google Publisher Policies: https://support.google.com/adsense/answer/10502938
- EU user consent policy: https://support.google.com/adsense/answer/7670013
