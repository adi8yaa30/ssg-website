# SSG website: live while we build

**Domain:** https://ssgofficial.com (DNS at Hostinger). The misspelled ssgoffical.com is also owned and should redirect here.
**Hosting:** GitHub Pages. The `website/` folder of `main` auto-deploys on every push (`.github/workflows/pages.yml`).
**Status (24 Nov 2026):** the home page is live and finished. Every other page shows an "under construction" screen until its real version is ready.

---

## 1. How it works

The idea is that the public site is always in a finished state. What's live is either a complete page or a polite "under construction" screen, never a half-built page.

| What visitors see | File | Indexed by Google? |
|---|---|---|
| Home page (intro, products, mission, process, contact) | `website/index.html` | **Yes**. It's the only page in `sitemap.xml` |
| "About Us / Careers / Terms / Privacy is under construction" | `website/coming-soon.html#about` (`#careers`, `#terms`, `#privacy`) | No (`noindex`) |
| Page not found | `website/404.html` | No |
| About page (in progress, not linked from anywhere) | `website/about.html` | No (`noindex` + blocked in `robots.txt`) |

All "About Us" links in the nav, the mobile menu, the process section and the footer point to `coming-soon.html#about`. Careers, Terms and Privacy point to their own `#…` versions. The page reads the `#` and shows the right name. Instagram, Facebook, LinkedIn and the brochure still show a "coming soon" toast, because we don't have those links or the PDF yet.

### Branches

| Branch | Purpose |
|---|---|
| `main` | **Live site.** Anything merged here is public within ~1 minute. |
| `about-page` (and one branch per new page) | A page being built. Work happens here and is never merged half-done. |

To preview a page in progress, run the dev server (`python3 -m http.server 5173 --directory website`) on that branch and open `http://localhost:5173/<page>.html`.

---

## 2. Launching a finished page (checklist)

Do this for each page (About, Careers, Divisions, etc.) once the client has approved it:

1. **Finish the page on its branch.** Check it on phone (390 px), tablet (768 px) and desktop (1440 px) in Chrome, Safari and Firefox.
2. **SEO head**, copied from `index.html` and adapted:
   - a unique `<title>` of 50–60 characters, with the main keyword first and "Shree Shyam Group (SSG)" at the end
   - a unique `<meta name="description">` of 140–160 characters
   - `<link rel="canonical" href="https://ssgofficial.com/<page>.html">`
   - `og:url`, `og:title`, `og:description`, `og:image` (1200×630)
   - change `noindex, follow` to `index, follow`
   - exactly one `<h1>`, and meaningful `alt` text on every image
3. **Swap the links.** Replace `coming-soon.html#<page>` with `<page>.html` everywhere (`grep -rn "coming-soon.html#about" website`).
4. **Unblock it.** Remove the page's `Disallow:` line from `website/robots.txt`.
5. **Add it to `website/sitemap.xml`** with today's `lastmod`.
6. **Merge the branch into `main`.** It goes live on push.
7. **In Google Search Console:** use URL Inspection → Request indexing for the new page.

When there are no under-construction pages left, delete `coming-soon.html`.

---

## 3. SEO: what's done

- **Title and description** target the searches the client wants to win: *solar street lights Guwahati / Assam*, *high mast lights*, *Northeast India*.
- **Canonical URL** set to `https://ssgofficial.com/`. Copies on other addresses (for example `adi8yaa30.github.io`) all point Google to the real domain.
- **Structured data (JSON-LD):** `Organization`, `LocalBusiness` (address, both phone numbers, email, areas served, product types) and `WebSite`. This makes the business eligible for Google's knowledge panel and local results.
- **Social previews:** Open Graph and Twitter tags with a 1200×630 image of the showroom (`assets/og-image.jpg`), for WhatsApp, LinkedIn, Facebook and X.
- **Icons:** `favicon.ico`, 192/512 px PNGs, `apple-touch-icon.png` and `site.webmanifest`.
- **`robots.txt`** and **`sitemap.xml`** at the site root.
- **`noindex`** on every placeholder page, so Google never lists an "under construction" page.
- **Real 404 page** in the site's style.
- All images have `alt` text, there's one `h1` ("Powering India's streets."), and the headings are in order.

## 4. SEO: still to do (needs the client or the domain)

| # | Task | Who | Notes |
|---|---|---|---|
| 1 | **Point ssgofficial.com at GitHub Pages** | Whoever controls the domain | See section 6 |
| 2 | Set the custom domain in GitHub → Settings → Pages, then tick **Enforce HTTPS** | Us | Only once DNS is live |
| 3 | **Google Search Console**: verify `ssgofficial.com` (DNS TXT record) and submit `https://ssgofficial.com/sitemap.xml` | Us + domain owner | |
| 4 | **Bing Webmaster Tools**: import the site from Search Console | Us | 5 minutes |
| 5 | **Google Business Profile** for "Shree Shyam Group", Jyotikuchi, Guwahati, with the website set to ssgofficial.com | Client | Matters most for local searches like "solar street light near me" |
| 6 | Real Instagram / Facebook / LinkedIn URLs | Client | Then add them to the footer and as `sameAs` in the JSON-LD |
| 7 | Brochure PDF | Client | Then remove `data-brochure` and link the file |
| 8 | **The footer says `www.ssginfo.com`**. Should it be ssgofficial.com, or is ssginfo.com an older site? | Client | If it's an old site, redirect it (301) to ssgofficial.com so its Google ranking carries over |
| 9 | Google Analytics 4 or Plausible | Client decision | Needs a privacy note once Privacy is built |

## 5. Performance and browsers

Measured on a simulated mid-range phone (390 px, 4× slower CPU, 1.6 Mbps slow 4G), first visit:

| | Before | After |
|---|---|---|
| Data on first load | 961 KB | 886 KB |
| Largest content painted | 2.1 s | 1.9 s |
| Page loaded | 5.4 s | 4.6 s |
| Main thread blocked | ~45 ms | ~45 ms |
| Layout shift | 0 | 0 |

Changes made:
- On phones, the intro poster is preloaded with the HTML instead of after the scripts.
- The partner logos (lower down the page) now load lazily.
- Earlier in November, the long black screen after the store intro on desktop was fixed (hero shaders are now pre-compiled correctly).

How each device gets the site:
- **Desktop with WebGL:** the live 3D store intro and 3D hero.
- **Phones, low-power devices and anything without WebGL:** a pre-rendered video and poster, with an image hero.
- **Reduced motion:** a still poster and a gentle fade.

**Browsers supported:** Chrome/Edge 111+, Safari 16.4+ (iOS 16.4+), Firefox 121+. The CSS already has `-webkit-` prefixes for Safari (backdrop blur, masks). Older browsers get the static version: no 3D, no motion, and all content still readable.

Before each launch, retest with Chrome DevTools → Lighthouse (Mobile), and on a real iPhone in Safari.

## 6. Connecting ssgofficial.com (one-time, at the domain registrar)

Add these DNS records:

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | adi8yaa30.github.io |

Then in GitHub, go to repo **Settings → Pages → Custom domain**, enter `ssgofficial.com` and save. When the DNS check turns green, tick **Enforce HTTPS**. Also verify the domain under your GitHub account (Settings → Pages → Verified domains) so no one else can claim it.

`404.html` uses root paths (`/css/…`), so it shows correctly once the site is on ssgofficial.com. On the temporary `github.io/ssg-website/` address it shows unstyled.

## 7. Build order (suggested)

1. **About Us**: mostly built on `about-page`. Next to launch once approved.
2. **Products**: one page per product line, each its own search target (e.g. "all-in-one solar street light Assam").
3. **Divisions / Projects**: case studies with photos and locations (good for local SEO).
4. **Careers, Terms, Privacy**: simple text pages. Privacy is needed before analytics or the quote form store data.
