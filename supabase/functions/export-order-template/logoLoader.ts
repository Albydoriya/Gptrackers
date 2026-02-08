import { getLogoBase64 } from "./logoAssets.ts";

export interface LogoData {
  buffer: ArrayBuffer;
  extension: 'png' | 'jpeg';
  width?: number;
  height?: number;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function loadLogo(templateType: string): Promise<LogoData | null> {
  try {
    const normalizedType = templateType.toLowerCase();

    if (normalizedType !== 'hpi' && normalizedType !== 'generic') {
      console.warn(`No logo support for template ${templateType}`);
      return null;
    }

    const base64Logo = getLogoBase64(normalizedType);
    if (!base64Logo) {
      console.warn(`No logo data found for template ${templateType}`);
      return null;
    }

    if (normalizedType === 'hpi') {
      return {
        buffer: base64ToArrayBuffer(base64Logo),
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
