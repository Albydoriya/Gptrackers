# GoParts Legal Documents

This directory contains the Privacy Policy and Terms of Service for GoParts, designed to be hosted on GitHub Pages.

## 📁 Files Included

- `index.html` - Landing page with links to both legal documents
- `privacy-policy.html` - Comprehensive privacy policy
- `terms-of-service.html` - Complete terms of service
- `styles.css` - Consistent styling for all pages
- `README.md` - This file with setup instructions

## 🚀 Setup Instructions

### Step 1: Create a New GitHub Repository

1. Go to [GitHub](https://github.com) and sign in to your account
2. Click the "+" icon in the top-right corner and select "New repository"
3. Name your repository (e.g., `goparts-legal` or `goparts-policies`)
4. Set the repository to **Public** (required for GitHub Pages on free accounts)
5. Check "Add a README file" (optional)
6. Click "Create repository"

### Step 2: Upload Files to GitHub

#### Option A: Using GitHub Web Interface

1. In your new repository, click "Add file" → "Upload files"
2. Drag and drop all files from this `legal-pages` directory:
   - `index.html`
   - `privacy-policy.html`
   - `terms-of-service.html`
   - `styles.css`
3. Add a commit message: "Add legal documents"
4. Click "Commit changes"

#### Option B: Using Git Command Line

```bash
# Clone your new repository
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME

# Copy all files from legal-pages directory to the repository
cp /path/to/legal-pages/* .

# Add, commit, and push
git add .
git commit -m "Add legal documents"
git push origin main
```

### Step 3: Enable GitHub Pages

1. In your GitHub repository, click "Settings" (top menu)
2. Scroll down the left sidebar and click "Pages"
3. Under "Source", select "Deploy from a branch"
4. Under "Branch", select "main" and "/ (root)"
5. Click "Save"
6. Wait 1-3 minutes for deployment to complete
7. GitHub will display your URL: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

### Step 4: Verify Deployment

Test all three pages:
- Landing page: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`
- Privacy Policy: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/privacy-policy.html`
- Terms of Service: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/terms-of-service.html`

### Step 5: Customize the Documents

Before publishing, you MUST update the following placeholders:

#### In privacy-policy.html:
- Replace `[YOUR-EMAIL@COMPANY.COM]` with your actual contact email

#### In terms-of-service.html:
- Replace `[YOUR-EMAIL@COMPANY.COM]` with your actual contact email
- Replace `[YOUR-JURISDICTION]` with your legal jurisdiction (e.g., "California, USA" or "Ontario, Canada")

#### In index.html:
- Replace `[YOUR-EMAIL@COMPANY.COM]` with your actual contact email
- Replace `[YOUR-APP-URL]` with your GoParts application URL

### Step 6: Update Google OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" → "OAuth consent screen"
4. Click "Edit App"
5. Scroll to "App domain" section
6. Add your URLs:
   - **Application home page**: Your GoParts app URL
   - **Privacy Policy URL**: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/privacy-policy.html`
   - **Terms of Service URL**: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/terms-of-service.html`
7. Click "Save and Continue"
8. Submit for verification if needed

## 🎨 Customization

### Changing Colors

To match your brand colors, edit `styles.css` and modify these CSS variables:

```css
:root {
    --primary-color: #2563eb;      /* Main brand color */
    --primary-hover: #1d4ed8;      /* Hover state */
    --secondary-color: #64748b;    /* Secondary actions */
    --text-color: #1e293b;         /* Main text */
    --text-light: #64748b;         /* Light text */
}
```

### Adding Your Logo

To add a logo to the landing page, edit `index.html`:

```html
<header class="landing-header">
    <img src="logo.png" alt="GoParts Logo" style="max-width: 200px; margin-bottom: 1rem;">
    <h1>GoParts Legal Documents</h1>
    <p class="subtitle">Internal Procurement & Parts Management System</p>
</header>
```

Then upload `logo.png` to your repository.

## 🔄 Updating Documents

When you need to update the legal documents:

1. Edit the HTML files in your repository
2. Update the "Last Updated" date
3. Commit and push changes
4. GitHub Pages will automatically redeploy (takes 1-3 minutes)
5. Consider notifying users of material changes

## 📱 Custom Domain (Optional)

To use a custom domain like `policies.goparts.com`:

1. Purchase a domain or use a subdomain of your existing domain
2. In your repository, create a file named `CNAME` (no extension)
3. Add your custom domain to the CNAME file:
   ```
   policies.goparts.com
   ```
4. Configure DNS with your domain registrar:
   - Add a CNAME record pointing to `YOUR-USERNAME.github.io`
5. Wait for DNS propagation (up to 24 hours)
6. In GitHub Pages settings, verify the custom domain is detected
7. Enable "Enforce HTTPS" once the domain is verified

## 🔒 Security Notes

- Always use HTTPS URLs (GitHub Pages provides free SSL certificates)
- Keep your repository public (required for free GitHub Pages)
- Legal documents don't contain sensitive information, so public hosting is appropriate
- Regularly review and update documents to comply with changing regulations

## 📋 Maintenance Checklist

- [ ] Replace all placeholder text before going live
- [ ] Verify all links work correctly
- [ ] Test on mobile devices
- [ ] Test in different browsers
- [ ] Review for spelling and grammar
- [ ] Have legal counsel review documents (recommended)
- [ ] Update Google OAuth consent screen URLs
- [ ] Add links from your main application
- [ ] Set up calendar reminder to review annually

## 🆘 Troubleshooting

### Pages not loading after deployment
- Wait 5-10 minutes, GitHub Pages can take time to deploy
- Check that your repository is public
- Verify the branch and folder settings in GitHub Pages settings
- Check for any typos in file names (case-sensitive)

### CSS styles not applying
- Make sure `styles.css` is in the same directory as HTML files
- Check browser console for 404 errors
- Clear your browser cache

### 404 errors on GitHub Pages
- Ensure file names are exactly: `index.html`, `privacy-policy.html`, `terms-of-service.html`
- File names are case-sensitive on GitHub Pages
- Check that files are in the root directory, not a subfolder

## 📞 Support

If you need help with setup, consult:
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Pages Quickstart](https://docs.github.com/en/pages/quickstart)
- [Google OAuth Consent Screen](https://support.google.com/cloud/answer/10311615)

## 📄 License

These documents are templates for internal business use. Customize them to fit your specific needs and have them reviewed by legal counsel before deployment.

---

**Created for GoParts** - Internal Procurement & Parts Management System
