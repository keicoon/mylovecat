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

Deployment check:

```bash
npm run check:deploy
```

This builds the GitHub Pages artifact and verifies:

- GitHub Pages base path asset references
- PWA manifest scope/start URL
- service worker scope-relative URLs
- no deployed source maps
- no `console.*`/`debugger` statements in deployable text assets
- AdSense client/slot format and `ads.txt` when AdSense is enabled

Recommended hosting options:

| Host | Build command | Output directory | Notes |
|---|---|---|---|
| GitHub Pages project site | `npm run build:pages` | `dist` | Use the included GitHub Actions workflow. The app is served under `/mylovecat/`. |
| GitHub Pages custom domain | `npm run build` | `dist` | Use root base path when the domain points directly to this app. |
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

## AdSense Publisher Lock

The client bundle can never hide a publisher id. To prevent accidental or unauthorized redeploys with a different publisher id in this repository, set `deploy.config.json` after AdSense approval:

```json
{
  "adsense": {
    "lockedClient": "ca-pub-0000000000000000"
  }
}
```

When `VITE_ADSENSE_CLIENT` is set and does not match `lockedClient`, the production build fails.

The build also generates `dist/ads.txt` when AdSense is enabled:

```text
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

For AdSense, prefer a custom domain or a GitHub Pages user/organization root site so `https://your-domain.example/ads.txt` is available at the domain root. A project page such as `https://user.github.io/mylovecat/` can host the app, but `ads.txt` verification is tied to the site domain root.

## AdSense Review Checklist

Before applying:

- Use a real HTTPS domain.
- Publish original public content, not only the app screen.
- Keep `/privacy` and `/terms` reachable.
- Add a contact method before production review.
- Do not place ads inside the daily record input flow initially.
- Update the privacy policy with Google advertising/cookie disclosure after enabling AdSense.
- If serving ads to users in the EEA, UK, or Switzerland, use a Google-certified CMP as required by Google's EU user consent policy.
- Lock the approved publisher id in `deploy.config.json`.
- Protect `deploy.config.json`, `.github/workflows/`, and `scripts/` with branch protection or required review before production use.

## Official References

- GitHub Pages security/deploy notes: `docs/github-pages-security.md`
- Vite static deploy: https://vite.dev/guide/static-deploy.html
- GitHub Pages custom workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Vercel rewrites: https://vercel.com/docs/rewrites
- Netlify rewrites: https://docs.netlify.com/routing/redirects/rewrites-proxies/
- Cloudflare Pages redirects: https://developers.cloudflare.com/pages/configuration/redirects/
- AdSense eligibility: https://support.google.com/adsense/answer/9724
- AdSense code: https://support.google.com/adsense/answer/9274019
- Google Publisher Policies: https://support.google.com/adsense/answer/10502938
- EU user consent policy: https://support.google.com/adsense/answer/7670013
