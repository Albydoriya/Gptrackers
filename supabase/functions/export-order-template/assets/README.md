# Export Template Assets

This directory contains logo image files used as source assets for order export templates.

## Important: Logo Embedding System

Due to Supabase Edge Functions running on Deno Deploy, logos cannot be loaded from the filesystem at runtime. Instead, logos must be embedded as base64 strings in the code bundle.

## Current Logo Files

- **HPI Logo**: `hpi-logo.png` (191 x 37 pixels, PNG format)
- **Generic Logo**: Not yet implemented

## Adding a New Logo

To add a new logo for a template:

1. Place your logo image in this directory (e.g., `supplier-logo.png`)
2. Convert the logo to base64:
   ```bash
   base64 -w 0 supabase/functions/export-order-template/assets/supplier-logo.png
   ```
3. Open `../logoAssets.ts` and add the base64 string to the `LOGO_ASSETS` object:
   ```typescript
   export const LOGO_ASSETS: Record<string, string> = {
     hpi: "iVBORw0KG...",  // existing
     supplier: "YOUR_BASE64_STRING_HERE",  // new
   };
   ```
4. Deploy the updated edge function

## Logo Requirements

- Supported formats: PNG, JPEG
- Recommended dimensions: Keep aspect ratio reasonable for Excel headers
- Maximum file size: Keep under 500KB for base64 efficiency
- The logo will be embedded in cells A1:B2 of the Excel export

## Notes

- Logos are stored as base64 strings in `logoAssets.ts`
- If a logo is not found, exports will still work without it
- The physical image files in this directory are for reference only
- Logos are embedded directly into the Excel file for offline viewing
