# URL Update Checklist for GitHub Pages Files

Before publishing your legal documents on GitHub Pages, you need to update placeholder text in your HTML files. Here's exactly what to change:

## ✅ Application URLs (ALREADY UPDATED)

These have been updated in your GoParts application:
- **LoginPage.tsx** - ✅ Updated with your GitHub Pages URLs
- **ExchangeRateFooter.tsx** - ✅ Updated with your GitHub Pages URLs

## 📝 GitHub Pages Files That Still Need Updates

You need to edit these 3 files in your `goparts-policies` GitHub repository:

### 1. privacy-policy.html

**Line ~240 (Contact Us section):**
```html
<!-- FIND THIS: -->
<p><strong>Email:</strong> [YOUR-EMAIL@COMPANY.COM]</p>

<!-- REPLACE WITH: -->
<p><strong>Email:</strong> your-actual-email@company.com</p>
```

**Line ~246 (Note section):**
```html
<!-- FIND THIS: -->
<p class="note">
  <strong>Note:</strong> Please replace [YOUR-EMAIL@COMPANY.COM] with your actual contact email address before publishing.
</p>

<!-- AFTER UPDATING THE EMAIL ABOVE, YOU CAN DELETE THIS NOTE ENTIRELY -->
```

---

### 2. terms-of-service.html

**Line ~275 (Governing Law section):**
```html
<!-- FIND THIS: -->
<p>
  These Terms shall be governed by and construed in accordance with the laws of [YOUR-JURISDICTION], without regard to its conflict of law provisions.
</p>

<!-- REPLACE WITH: -->
<p>
  These Terms shall be governed by and construed in accordance with the laws of [Your State/Country], without regard to its conflict of law provisions.
</p>

<!-- EXAMPLES:
- California, USA
- New South Wales, Australia
- Ontario, Canada
- England and Wales, UK
-->
```

**Line ~320 (Contact Information section):**
```html
<!-- FIND THIS: -->
<p><strong>Email:</strong> [YOUR-EMAIL@COMPANY.COM]</p>

<!-- REPLACE WITH: -->
<p><strong>Email:</strong> your-actual-email@company.com</p>
```

**Line ~326 (Note section):**
```html
<!-- FIND THIS: -->
<p class="note">
  <strong>Note:</strong> Please replace [YOUR-EMAIL@COMPANY.COM] with your actual contact email address and [YOUR-JURISDICTION] with your legal jurisdiction before publishing.
</p>

<!-- AFTER UPDATING THE EMAIL AND JURISDICTION ABOVE, YOU CAN DELETE THIS NOTE ENTIRELY -->
```

---

### 3. index.html

**Line ~70 (Contact Section):**
```html
<!-- FIND THIS: -->
<p><strong>Email:</strong> [YOUR-EMAIL@COMPANY.COM]</p>
<p class="note"><em>Please replace with your actual contact email before publishing</em></p>

<!-- REPLACE WITH: -->
<p><strong>Email:</strong> your-actual-email@company.com</p>
<!-- DELETE THE NOTE LINE -->
```

**Line ~77 (App Link Section):**
```html
<!-- FIND THIS: -->
<a href="[YOUR-APP-URL]" class="btn btn-secondary">Return to GoParts Application</a>
<p class="note"><em>Replace [YOUR-APP-URL] with your actual application URL</em></p>

<!-- REPLACE WITH: -->
<a href="https://your-app-url.com" class="btn btn-secondary">Return to GoParts Application</a>
<!-- DELETE THE NOTE LINE -->
```

---

## 🚀 How to Make These Changes

### Option 1: Edit Directly on GitHub (Easiest)

1. Go to your repository: `https://github.com/albydoriya/goparts-policies`
2. Click on the file you want to edit (e.g., `privacy-policy.html`)
3. Click the pencil icon (✏️) to edit
4. Use Ctrl+F (or Cmd+F on Mac) to find the placeholders
5. Replace them with your actual information
6. Click "Commit changes" at the bottom
7. Repeat for all 3 files

### Option 2: Edit Locally and Push

If you have the files locally:
```bash
# Edit the files in your text editor
# Then commit and push:
git add .
git commit -m "Update contact information and URLs"
git push origin main
```

---

## 📋 Quick Reference: What to Replace

| Placeholder | Replace With | Found In |
|------------|--------------|----------|
| `[YOUR-EMAIL@COMPANY.COM]` | Your actual email | privacy-policy.html, terms-of-service.html, index.html |
| `[YOUR-JURISDICTION]` | Your legal jurisdiction (e.g., "California, USA") | terms-of-service.html |
| `[YOUR-APP-URL]` | Your GoParts app URL | index.html |

---

## ✅ Verification Checklist

After making changes, verify:
- [ ] No `[PLACEHOLDER]` text remains in any file
- [ ] All email addresses are correct
- [ ] Legal jurisdiction is specified
- [ ] App link works correctly
- [ ] All warning notes have been removed
- [ ] Changes are committed to GitHub
- [ ] GitHub Pages has redeployed (wait 2-3 minutes)
- [ ] Test all 3 URLs:
  - https://albydoriya.github.io/goparts-policies/
  - https://albydoriya.github.io/goparts-policies/privacy-policy.html
  - https://albydoriya.github.io/goparts-policies/terms-of-service.html

---

## 🎯 After Completing Updates

Once all placeholders are replaced:

1. **Update Google OAuth Consent Screen:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" → "OAuth consent screen"
   - Click "Edit App"
   - Add your URLs:
     - **Privacy Policy**: https://albydoriya.github.io/goparts-policies/privacy-policy.html
     - **Terms of Service**: https://albydoriya.github.io/goparts-policies/terms-of-service.html
   - Click "Save and Continue"

2. **Deploy Your Application:**
   - Your GoParts application already has the correct URLs
   - Deploy/redeploy to make the changes live

3. **Legal Review (Recommended):**
   - Have a lawyer review the documents
   - Make any necessary customizations for your specific business needs

---

## 📞 Need Help?

If you're stuck, refer to the main README.md in the legal-pages folder for more detailed instructions.

---

**Your URLs:**
- Landing Page: https://albydoriya.github.io/goparts-policies/
- Privacy Policy: https://albydoriya.github.io/goparts-policies/privacy-policy.html
- Terms of Service: https://albydoriya.github.io/goparts-policies/terms-of-service.html

**Your Application:**
- GoParts app already has these URLs configured ✅
