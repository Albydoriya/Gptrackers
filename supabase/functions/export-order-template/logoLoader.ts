export interface LogoData {
  buffer: ArrayBuffer;
  extension: 'png' | 'jpeg';
  width?: number;
  height?: number;
}

// Import logos as static assets using import.meta.resolve
// This ensures they are bundled with the Edge Function
export async function loadLogo(templateType: string): Promise<LogoData | null> {
  try {
    const logoFileName = templateType.toLowerCase() === 'hpi' ? 'hpi-logo.png' : 'generic-logo.png';
    
    // Use import.meta.resolve to get the correct path that works in Deno Deploy
    const logoUrl = new URL(`./assets/${logoFileName}`, import.meta.url);
    
    // Read the file using fetch which works better in Edge Runtime
    const response = await fetch(logoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const extension = logoFileName.endsWith('.png') ? 'png' : 'jpeg';

    return {
      buffer: arrayBuffer,
      extension,
      width: 200,
      height: 100,
    };
  } catch (error) {
    console.warn(`Logo file not found for template ${templateType}:`, error);
    return null;
  }
}

export function hasLogoSupport(templateType: string): boolean {
  return templateType.toLowerCase() === 'hpi' || templateType.toLowerCase() === 'generic';
}
