# Next Steps: Publishing Your Legal Documents

## What You've Got

I've created all the necessary files for your Privacy Policy and Terms of Service:

1. **privacy-policy.html** - Comprehensive privacy policy tailored for GoParts
2. **terms-of-service.html** - Complete terms of service for your application
3. **index.html** - Professional landing page with links to both documents
4. **styles.css** - Clean, responsive styling for all pages
5. **README.md** - Detailed setup instructions

## What You Need To Do

### 1. Create a GitHub Repository (5 minutes)

1. Go to [github.com](https://github.com) and sign in
2. Click the "+" icon (top-right) → "New repository"
3. Name it something like `goparts-legal` or `goparts-policies`
4. Make it **Public** (required for free GitHub Pages)
5. Click "Create repository"

### 2. Upload Files (5 minutes)

**Easy Way (No Git Knowledge Required):**
1. In your new repository, click "uploading an existing file"
2. Drag and drop these 4 files from the `legal-pages` folder:
   - `index.html`
   - `privacy-policy.html`
   - `terms-of-service.html`
   - `styles.css`
3. Click "Commit changes"

**Command Line Way (If You Know Git):**
```bash
cd /path/to/legal-pages
git init
git add .
git commit -m "Add legal documents"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

### 3. Enable GitHub Pages (2 minutes)

1. In your repository, click "Settings"
2. Click "Pages" in the left sidebar
3. Under "Source", select "Deploy from a branch"
4. Select branch: "main" and folder: "/ (root)"
5. Click "Save"
6. Wait 2-3 minutes for deployment
7. Your URL will be: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

### 4. Customize Before Going Live (10 minutes)

**IMPORTANT: Replace these placeholders in your files:**

#### In privacy-policy.html:
- Find: `[YOUR-EMAIL@COMPANY.COM]`
- Replace with: Your actual contact email

#### In terms-of-service.html:
- Find: `[YOUR-EMAIL@COMPANY.COM]`
- Replace with: Your actual contact email
- Find: `[YOUR-JURISDICTION]`
- Replace with: Your jurisdiction (e.g., "California, USA")

#### In index.html:
- Find: `[YOUR-EMAIL@COMPANY.COM]`
- Replace with: Your actual contact email
- Find: `[YOUR-APP-URL]`
- Replace with: Your GoParts app URL

#### In LoginPage.tsx (already updated):
- Find: `YOUR-USERNAME.github.io/YOUR-REPO-NAME`
- Replace with: Your actual GitHub Pages URL

After making these changes, commit them to GitHub:
```bash
git add .
git commit -m "Update contact information and URLs"
git push
```

### 5. Update Google OAuth Consent Screen (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your GoParts project
3. Navigate to "APIs & Services" → "OAuth consent screen"
4. Click "Edit App"
5. Scroll to "App domain" section
6. Add these URLs:
   - **Privacy Policy URL**: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/privacy-policy.html`
   - **Terms of Service URL**: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/terms-of-service.html`
7. Click "Save and Continue"

### 6. Test Everything (5 minutes)

Visit these URLs and verify they work:
- Landing page: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`
- Privacy Policy: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/privacy-policy.html`
- Terms: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/terms-of-service.html`

Check:
- All links work correctly
- No placeholder text remains
- Pages look good on mobile
- Footer links are clickable

## Total Time Required

**Approximately 30-35 minutes** to complete all steps.

## Need Help?

Refer to the detailed `README.md` in the `legal-pages` folder for:
- Troubleshooting common issues
- Custom domain setup (optional)
- Styling customization
- Maintenance checklist

## Legal Review

**HIGHLY RECOMMENDED:** Have a lawyer review these documents before going live. While they're comprehensive templates, your specific business needs may require customization.

## Questions?

Check out these resources:
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Google OAuth Setup Guide](https://support.google.com/cloud/answer/10311615)

---

Once you complete these steps, your Google OAuth consent screen will be fully compliant and ready for user verification!
