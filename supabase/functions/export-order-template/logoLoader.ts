export interface LogoData {
  buffer: ArrayBuffer;
  extension: 'png' | 'jpeg';
  width?: number;
  height?: number;
}

const LOGO_FILES = {
  hpi: 'hpi-logo.png',
  generic: 'generic-logo.png',
};

export async function loadLogo(templateType: string): Promise<LogoData | null> {
  try {
    const logoFileName = templateType.toLowerCase() === 'hpi' ? LOGO_FILES.hpi : LOGO_FILES.generic;
    const logoPath = new URL(`./assets/${logoFileName}`, import.meta.url).pathname;

    const fileData = await Deno.readFile(logoPath);

    const extension = logoFileName.endsWith('.png') ? 'png' : 'jpeg';

    return {
      buffer: fileData.buffer,
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
