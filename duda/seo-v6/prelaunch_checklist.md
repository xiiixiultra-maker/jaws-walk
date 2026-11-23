# JAWS Podiatry v6 — Pre-Launch Checklist & Deployment Runbook

**Target Domain:** `https://www.jawspodiatry.com` (Duda Classic Editor 2.0, project `jaws3` / `a3cddd9a`)  
**Default Launch Build:** Deploy **`code/pages/held/*.html` (12 launch-ready pages)** first. Keep `/foot-feminization` and `/foot-and-toe-tuck` unpublished Drafts in Duda until Attorney & Trademark clearance, then switch to `code/pages/full/*.html`.

---

## 1. Designer (Remmy / Saibot Studio)

### 1.1 Content Pages v6 Deployment (`held/` vs. `full/`)
- [ ] Paste the 12 rebuilt HTML widgets from `jaws-v6-upgrade/code/pages/held/*.html` into their corresponding Duda pages (replacing the Nov 15 widgets).
- [ ] Keep `/foot-feminization` and `/foot-and-toe-tuck` as **Draft (unpublished)** in Duda and excluded from navigation menus; ensure all 12 launch-ready pages contain zero links to `/foot-feminization` or `/foot-and-toe-tuck` (verified in `held/`).
- [ ] Confirm `held/about.html` reflects Dr. Wagner's **Fellowship** (*Minimally invasive foot and ankle surgery, under Dr. Orlando Nunez, MD, DPM*), omits the unverified ABMSP dual-board bullet, and uses the attorney-safe headings (`Surgical credentials and board certification`, `Education and surgical training`).
- [ ] Verify Duda `<style>` rendering in live Chrome DevTools on preview: confirm zero `&gt;` / `&lt;` escaping, `--top` sticky offset (`82px` phone / `94px` tablet / `101px` desktop), `.jp-toc a b` contrast (`#7A5636` on `#F7F6F3`), `#jp-dock` auto-hiding whenever any `.jp-btn` enters the bottom 30% of the viewport, and zero duplicate `#jp-dock` nodes.

### 1.2 Gallery Deep-Linking & Home Page Alignment
- [ ] Update `code/home/jaws-real-results.html` to parse `?filter=<key>` from `location.hash` (e.g., `/#jrr?filter=bunion`) and `location.search` on load so `"See real results"` links from procedure pages automatically activate the matching filter chip (`brachy`, `short`, `length`, `hammertoe`, `bunion`, `corn`, `sculpt`, `fem`).
- [ ] Update `code/home/jaws-home-v5.html` per held-launch rules until cleared:
  - [ ] Remove/hold the 2 links to `/foot-and-toe-tuck` on the Home page.
  - [ ] Confirm Practice/Attorney decision on holding the `"Foot feminization"` filter chip (19 cases) and `"Skinny Toe Tuck"` labels (46 occurrences) in `jaws-real-results.html`.
  - [ ] Add the insurance/financing disclosure (`"We do not take insurance. We do offer financing, through CareCredit and Cherry, subject to their approval."`) and consistent `"podiatric physician"` license wording on Home.
  - [ ] Refresh Dr. Wagner's YouTube subscriber & view figures (`1.78M` subscribers / `1.1B` views read Oct 31, 2026) immediately before launch.
  - [ ] Strengthen the beach film section per Dr. Wagner's Nov 22 feedback, and apply `site.css` header polish if scheduled.

### 1.3 Cloudflare R2 CDN Migration (Replaces GitHub Pages `xiiixiultra-maker.github.io/jaws-walk/`)
GitHub Pages imposes a **100 GB/month soft bandwidth limit**, lacks a commercial SLA, and sits under a personal account (the hero video alone is ~6 MB per desktop load, plus ~25 MB across ~920 walk frames). Migrate all 50+ external assets to a **Practice-owned Cloudflare R2 bucket** before running paid ads or launching:

1. **Provision Bucket & Custom Domain (Practice + Designer):**
   - Create R2 bucket `jaws-podiatry-assets` in JAWS Podiatry's Cloudflare account.
   - Connect a custom subdomain on `jawspodiatry.com` (e.g., `https://assets.jawspodiatry.com/`) with Cloudflare Proxy (orange cloud) enabled.
2. **Upload Asset Directories Preserving Path Structure:**
   - `/fonts/` (`ApfelGrotezk-Regular.woff2`, `ApfelGrotezk-Mittel.woff2`, `ApfelGrotezk-Fett.woff2`)
   - `/office/` (all `.webp` portraits, room renders, `sign-loop-*.mp4`)
   - `/hollywood/` (4 hero `.mp4` encodes + 4 `.webp` posters)
   - `/press/` (all 9 press logo `.webp` masks: `bet`, `essence`, `herald`, `newbeauty`, `nypost`, `telemundo`, `univision`, `vanidades`, `vibe`)
   - `/beach/` (`line-0..3[t|w].webp` + `scrub/` frames)
   - `/tools3d/` (instrument and award-plaque sprites)
   - `/` (`walk.js`, `walk-data.js`, and all `tall/` + `wide/` walk frames)
3. **Configure R2 CORS Policy (REQUIRED for CSS `mask-image` & Webfonts):**
   - Without CORS, Chrome/Safari block CSS `-webkit-mask` / `mask` press logos (`jaws-home-v5.html`) and `@font-face` `.woff2` files across origins.
   - Set bucket CORS rule:
     ```json
     [
       {
         "AllowedOrigins": [
           "https://www.jawspodiatry.com",
           "https://jawspodiatry.com",
           "https://my.rocketwebsitez.com",
           "https://jaws3.multiscreensite.com"
         ],
         "AllowedMethods": ["GET", "HEAD"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 86400
       }
     ]
     ```
   - Also set an HTTP Response Header Transform Rule on `assets.jawspodiatry.com/*`:
     - `Access-Control-Allow-Origin: *`
     - `Cache-Control: public, max-age=31536000, immutable` (for `/fonts/*`, `/office/*`, `/hollywood/*`, `/press/*`, `/beach/*`, `/tools3d/*`, `/tall/*`, `/wide/*`).
     - For `/walk.js` and `/walk-data.js`, either version filenames/query params (`walk.js?v=6.0`) or set a shorter TTL (`public, max-age=3600, stale-while-revalidate=86400`).
4. **Rewrite URLs & Verify:**
   - Replace `https://xiiixiultra-maker.github.io/jaws-walk/` with `https://assets.jawspodiatry.com/` across `jaws-page-v6.css`, `build_pages.py` (and source templates), `site.css`, `jaws-home-v5.html`, and `walk.js`.
   - Rebuild all pages (`python build_pages.py`), re-paste into Duda, and verify in Chrome DevTools Network tab: `0` requests to `github.io`, `200 OK` on fonts/masks/videos, and `Access-Control-Allow-Origin: *` + `Cache-Control: public, max-age=31536000, immutable` present in response headers.

### 1.4 Required Open-License Attribution (CC BY 4.0 + OFL)
Currently the **CC BY 4.0** credit for NVIDIA SimReady Assets sits only in an HTML comment in `jaws-home-v5.html`. Add a visible credit in the Duda global footer (or dedicated `/credits` / `/terms-of-use` / colophon section):

```html
<!-- Required CC BY 4.0 + OFL Attribution Snippet -->
<p class="jaws-credits">
  3D surgical instrument models adapted from
  <a href="https://docs.omniverse.nvidia.com/simready/latest/index.html" target="_blank" rel="noopener">NVIDIA SimReady Assets</a>,
  licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>,
  rendered in gold. Typography: Bodoni Moda (OFL) and Apfel Grotezk by Collletttivo (OFL).
</p>
```

---

## 2. Agency (Higher Images)

### 2.1 Booking Form & Topic Pre-Fill (`/booking`)
- [ ] Replace the `.jb-slot` placeholder inside `/booking` (`code/booking/jaws-booking-placeholder.html`) with the production **GoHighLevel** booking embed.
- [ ] Configure the form/embed to read `?topic=<slug>` from the query string (e.g., `/booking?topic=brachybalancing`, `/booking?topic=bunion-surgery`) to pre-populate the procedure-of-interest field while keeping plain `/booking` functional.
- [ ] Verify Practice-approved TCPA SMS/phone consent checkbox and privacy notice appear above the submit button.

### 2.2 Titles, Meta Descriptions & Business Info in Duda
- [ ] Populate `<title>` and `<meta name="description">` for all live pages verbatim from `seo/page_titles_descriptions_DRAFT.csv` (keep `/foot-feminization` and `/foot-and-toe-tuck` unpublished Drafts until cleared).
- [ ] Fill out Duda **Site Settings → Business Info** with exact NAP:
  - Name: `JAWS Podiatry`
  - Street Address: `3700 Washington St, Suite 403, Hollywood, FL 33021`
  - Phone: `(954) 922-7333`
  - Hours: `Monday–Friday, 9:00 AM – 5:00 PM`

### 2.3 Structured Data & Social Meta (`seo/schema_jsonld_pack.html`)
- [ ] Inject `MedicalClinic` and `Physician` JSON-LD site-wide (or in Home & About Head HTML).
- [ ] Inject `FAQPage` JSON-LD into Home (`/`) Head HTML (already verified 1:1 verbatim with all 7 Home FAQs).
- [ ] Inject page-specific `BreadcrumbList` + `MedicalProcedure` JSON-LD blocks into each of the 10 launch-ready procedure pages (leave `5.11` & `5.12` `[HELD]` blocks uninjected until Attorney/Trademark sign-off).
- [ ] Add Open Graph (`og:title`, `og:description`, `og:image` `1200x630`, `og:url`) and Twitter Card `<meta>` tags + `<link rel="canonical">` per page.
- [ ] Re-validate live published pages with Google Rich Results Test and Schema Markup Validator.

### 2.4 Legal Pages & Global Footer Links
- [ ] Migrate and publish the 3 WordPress legal pages onto Duda:
  - `/privacy-policy`
  - `/terms-of-use` (consolidate `/terms-of-use-2/` here)
  - `/medical-disclaimer`
- [ ] Turn the footer's plain-text `"Privacy policy"` into a real hyperlink to `/privacy-policy`, and add links to `/terms-of-use`, `/medical-disclaimer`, Accessibility support/statement, and the CC BY 4.0 / OFL attribution notice.

### 2.5 301 Redirects (`seo/redirects_301_complete.csv`)
- [ ] Import/configure all **271** URL mappings from `seo/redirects_301_complete.csv` in Duda **URL Redirects** (all `P0` and `P1` redirects mandatory at cutover).
- [ ] **Pre-Cutover P2 Traffic Audit:** Before switching DNS, pull the last 12 months of Google Search Console clicks/impressions, GA4 organic landing pages, and Ahrefs/Semrush backlinks for the 202 `P2` URLs (especially `/services/*` and general podiatry blog posts). Retain, refresh, or build dedicated cosmetic/podiatric replacements for any `P2` URL driving meaningful qualified traffic or backlinks instead of blind consolidation to `/`.

### 2.6 Analytics, Privacy & Post-Publish Checks
- [ ] Install GA4, Google Tag Manager, and Meta Pixel on Home and content pages — **strictly EXCLUDE `/booking`** so health consultation details and submission events are never leaked to ad platforms.
- [ ] Verify post-publish that `noindex` preview tags and `multiscreensite.com` canonicals are gone, `https://www.jawspodiatry.com/sitemap.xml` lists only live canonical URLs (excluding held drafts), and submit the new sitemap in Google Search Console.

---

## 3. Practice (Dr. Abraham Wagner & Staff)

- [ ] **Cloudflare Account:** Open/confirm the Cloudflare account and R2 billing in JAWS Podiatry's name and grant Designer access for asset migration.
- [ ] **Gallery Case Audit (`#jrr`):** Confirm procedure label, operating surgeon (note intro states *"Dr. Wagner's own patients"*), and signed HIPAA/marketing patient photo authorization for every one of the 129 cases.
- [ ] **Fix Card 84:** Supply the missing left *"Before"* photo for Card 84 in `#jrr`, or remove Card 84 prior to launch.
- [ ] **Copy & Clinical Proofread:** Review and sign off on all 12 `held/*.html` pages and Home page copy, specifically verifying clinical statements (e.g., *"no pins, screws or plates"*, anesthesia/walking descriptions, recovery framing).
- [ ] **Press Logos Substantiation:** Confirm documentation/archived appearances exist for every outlet shown in *"As seen in"* (BET, Essence, Miami Herald, NewBeauty, NY Post, Telemundo, Univision, Vanidades, Vibe).
- [ ] **TCPA & Out-of-Town Flow:** Approve exact TCPA SMS/phone consent language for the GoHighLevel form, confirm current YouTube subscriber/view numbers, and decide on content/ownership for any future Out-of-Town Patients guide.

---

## 4. Attorney (Healthcare, Advertising & IP Counsel)

- [ ] **Florida Podiatry Advertising Rule & Licensure (`Fla. Admin. Code 64B18-14.004(3)` & `s. 456.072(1)(t), Fla. Stat.`):**
  - [ ] Confirm all visible copy, captions, and schemas properly identify `"Dr. Abraham Wagner, DPM, podiatric physician"`, contain zero quality/superiority claims (`(3)(c)-(e)`), zero promised outcomes, and zero `"micro-"` / `"microsurgery"` misrepresentations (`(3)(a)`).
- [ ] **Board Certification Claim (`about.html`):**
  - [ ] Review whether Florida `64B18-14.004(3)(i)` permits advertising `"Diplomate, American Board of Multiple Specialties in Podiatry"` (`ABMSP`) and `"dual board certification"`. Keep `held/about.html` (ABPM only) live until formally cleared.
- [ ] **Foot Feminization Hold (`s. 456.52, Fla. Stat.`):**
  - [ ] Review `/foot-feminization` (`code/pages/full/foot-feminization.html`) and the Home gallery's `"Foot feminization"` filter chip (19 cases) against Florida statutory restrictions. Keep `/foot-feminization` unpublished until cleared.
- [ ] **Trademark Clearance (`"Skinny Foot Tuck™"` / `"Skinny Toe Tuck™"` / `"Brachybalancing™"`):**
  - [ ] Clear potential conflict with USPTO Class 44 mark `SKINNY BIKINI TUCK` before publishing `/foot-and-toe-tuck` or leaving `"Skinny Toe Tuck"` labels live inside `#jrr` (46 instances in `jaws-real-results.html`).
  - [ ] Confirm pending trademark usage of `Brachybalancing™` (`™`, not `®`).
- [ ] **Out-of-State Virtual Consultations:**
  - [ ] Review `"Virtual consultations: Start from home, wherever you live"` against multi-state telehealth/medical licensure laws (consider adding clarifying language that virtual consultations are educational/pre-surgical screenings and medical/surgical care is rendered in Florida).
- [ ] **HIPAA / HHS OCR Online Tracking & Photo Consents:**
  - [ ] Confirm keeping GA4/GTM/Meta Pixel off `/booking` satisfies tracking-technology posture, and review whether procedure-page ad pixels require consent/Privacy Policy disclosures.
  - [ ] Approve updated `/privacy-policy`, `/terms-of-use`, `/medical-disclaimer`, patient photo authorizations, and FTC Endorsement Guides compliance on `#reviews` + `"Individual results vary"` / `"never retouched"` copy.
- [ ] **ADA / WCAG 2.2 AA Risk Review:**
  - [ ] Confirm publication of an Accessibility Statement and contact method in the footer.
