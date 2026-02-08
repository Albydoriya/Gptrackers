/**
 * Logo Asset Management
 *
 * DEPRECATION NOTICE:
 * Base64-encoded logos have been replaced with Supabase Storage for better quality and maintainability.
 * Logos are now served from the "company-assets" bucket and cached in memory.
 *
 * To add a new logo:
 * 1. Upload the logo file to Supabase Storage: company-assets/logos/{templateType}-logo.png
 * 2. Add configuration in logoLoader.ts LOGO_CONFIG
 * 3. The logo will be automatically fetched and cached when needed
 *
 * Storage Structure:
 * - company-assets/logos/hpi-logo.png
 * - company-assets/logos/generic-logo.png
 *
 * Benefits:
 * - No encoding/decoding corruption
 * - Original high-quality images
 * - Easy to update without code changes
 * - Smaller code bundle size
 * - In-memory caching for performance
 */

// Legacy base64 storage - DEPRECATED
// Kept for reference only, not used in production
export const LOGO_ASSETS: Record<string, string> = {
  hpi: "", // Now served from: company-assets/logos/hpi-logo.png
  generic: "", // Now served from: company-assets/logos/generic-logo.png
};

/**
 * @deprecated Use logoLoader.loadLogo() instead, which fetches from Supabase Storage
 */
export function getLogoBase64(templateType: string): string | null {
  console.warn('[logoAssets] getLogoBase64 is deprecated. Use logoLoader.loadLogo() instead.');
  return null;
}
