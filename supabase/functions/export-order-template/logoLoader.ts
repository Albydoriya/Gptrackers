export interface LogoData {
  buffer: ArrayBuffer;
  extension: 'png' | 'jpeg';
  width?: number;
  height?: number;
}

export async function loadLogo(templateType: string): Promise<LogoData | null> {
  try {
    const normalizedType = templateType.toLowerCase();

    if (normalizedType !== 'hpi' && normalizedType !== 'generic') {
      console.warn(`No logo support for template ${templateType}`);
      return null;
    }

    if (normalizedType === 'hpi') {
      const logoPath = new URL('./assets/hpi-logo.png', import.meta.url).pathname;
      const fileData = await Deno.readFile(logoPath);

      return {
        buffer: fileData.buffer,
        extension: 'png',
        width: 191,
        height: 37,
      };
    }

    return null;
  } catch (error) {
    console.warn(`Failed to load logo for template ${templateType}:`, error);
    return null;
  }
}

export function hasLogoSupport(templateType: string): boolean {
  return templateType.toLowerCase() === 'hpi' || templateType.toLowerCase() === 'generic';
}
