# Upsize website: how to publish and write news

The website now builds automatically on Netlify. You write blog posts and press releases in a free editor at **upsizeproperty.com/admin**, with no code and no monthly fee.

## One-off setup (about 20 minutes)

1. **Create a free GitHub account** at github.com (if you don't have one).
2. **Create a new private repository** called `upsize-website`.
3. **Upload the website files:** unzip this folder and upload everything inside it (`build.js`, `netlify.toml`, `package.json`, the `src` and `content` folders) to the repository. On github.com: *Add file → Upload files*, drag the files in, then *Commit changes*.
4. **Connect Netlify to GitHub:** in Netlify, open your site → *Site configuration → Build & deploy → Link repository* → choose GitHub → `upsize-website`. Netlify reads `netlify.toml` itself: build command `node build.js`, publish folder `dist`.
5. **Turn on the editor login:** in Netlify → *Site configuration → Access & security → OAuth* → *Install provider* → **GitHub**. Follow Netlify's link to create a GitHub OAuth app (homepage URL `https://www.upsizeproperty.com`, callback URL `https://api.netlify.com/auth/done`), then paste the Client ID and Secret into Netlify.
6. **Point the editor at your repository:** open `src/admin/config.yml` and change
   `repo: YOUR-GITHUB-USERNAME/upsize-website` to your real GitHub username, e.g. `repo: alexbalan/upsize-website`. Commit the change.

Done. Go to **https://www.upsizeproperty.com/admin**, click *Login with GitHub*, and you can write.

## Writing a post

1. Open `/admin` → **News, blog and press releases** → **New Post**.
2. Fill in:
   - **Title**: include the service and town, e.g. *"New EPDM flat roof in Bourne: before and after"*.
   - **Category**: *Blog* (guides, project stories) or *Press release* (company news).
   - **Summary**: 1–2 sentences, max 160 characters. Google and AI tools show this.
   - **Main image + description**: a real job photo and what it shows.
   - **Article**: write normally. Use *Heading 2* for sections.
3. Click **Save**, then set the status to **Ready** and **Publish**. Netlify rebuilds the site in about a minute.

Each published post automatically:

- gets its own page at `/news/your-title`
- appears on the News page and in the "Latest guides and company news" block on the homepage
- is added to the sitemap, the RSS feed (`/news/feed.xml`) and the AI summary file (`/llms.txt`)
- gets Google article markup (BlogPosting or NewsArticle)

## Ideas that help you rank for roofing

- One post per finished roofing job: *"[Job] in [Town]"* with 3–6 photos, what you found, what you did, and how long it took.
- Seasonal guides: *"Preparing your roof for winter in Peterborough"*, *"Storm damage: what to do first"*.
- Press releases: accreditations (CHAS, Constructionline, NFRC), new contracts (with permission), new staff or vans.

Aim for **2 posts a month**. Consistency matters more than length.

## Optional: AI writing help

The editor works with any AI writing tool. Draft in Claude or ChatGPT, paste the result into the Article box, then check every fact, price and claim before publishing. Advertising rules apply to blog posts too.

---

# Where the form answers go

The website has 3 forms, all handled by **Netlify Forms**, which is included with your Netlify account:

| Form | Page | Name in Netlify |
|---|---|---|
| Request a free quote | Every page (contact section) | `enquiry` |
| Weekend Roof Clinic application or nomination | /community | `roof-clinic` |
| Supply chain and careers application (with file upload) | /careers | `supply-chain` |

After sending, visitors see the **/thank-you** page, which Google is told not to list.

## Switch it on (once, 5 minutes)

1. Netlify → your site → **Forms** → click **Enable form detection** if you see the button, then deploy the site again so Netlify can find the 3 forms.
2. **Get every submission by email:** Netlify → **Site configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email notification**. Enter `alex@upsizeproperty.com` and choose *Any form*. You can also add one per form, for example sending supply chain applications to a different inbox later.
3. **Spam:** a hidden trap field already blocks most bots, and Netlify filters the rest. Anything flagged appears under *Forms → Spam*. Check it now and then.
4. **Uploaded files** (insurance certificates, CVs) are listed with each supply chain submission in Netlify. Download them from there.

## Limits to know

Netlify's free plan includes a monthly allowance of form submissions and file-upload storage. Check *Forms → Usage* in Netlify for your plan's current limits. If you outgrow it, upgrade or ask me to connect the forms to Google Sheets or your email instead.

## Data protection

- The forms link to the **Privacy & cookie policy** (`/privacy-policy`). Check the suggested retention periods in it before launch.
- Download and delete old submissions in line with the policy, for example enquiries that didn't go ahead after 24 months.
- Most UK businesses that handle personal data must pay the ICO data protection fee (from £52 a year). Check at ico.org.uk/fee.
