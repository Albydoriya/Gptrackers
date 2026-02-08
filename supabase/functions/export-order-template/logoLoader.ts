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
    const base64Data = getLogoBase64(templateType);

    if (!base64Data) {
      console.warn(`No logo found for template ${templateType}`);
      return null;
    }

    const arrayBuffer = base64ToArrayBuffer(base64Data);
    const extension = 'png';

    return {
      buffer: arrayBuffer,
      extension,
      width: 191,
      height: 37,
    };
  } catch (error) {
    console.warn(`Failed to load logo for template ${templateType}:`, error);
    return null;
  }
}

export function hasLogoSupport(templateType: string): boolean {
  return templateType.toLowerCase() === 'hpi' || templateType.toLowerCase() === 'generic';
}
