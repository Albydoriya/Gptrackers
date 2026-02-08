export interface LogoData {
  buffer: ArrayBuffer;
  extension: 'png' | 'jpeg';
  width?: number;
  height?: number;
}

interface CachedLogo extends LogoData {
  timestamp: number;
}

const logoCache = new Map<string, CachedLogo>();
const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

const LOGO_CONFIG: Record<string, { path: string; width: number; height: number; extension: 'png' | 'jpeg' }> = {
  hpi: {
    path: 'logos/hpi-logo.png',
    width: 191,
    height: 37,
    extension: 'png',
  },
  generic: {
    path: 'logos/generic-logo.png',
    width: 200,
    height: 50,
    extension: 'png',
  },
};

function isCacheValid(cachedLogo: CachedLogo): boolean {
  return Date.now() - cachedLogo.timestamp < CACHE_EXPIRATION_MS;
}

function getCachedLogo(templateType: string): LogoData | null {
  const cached = logoCache.get(templateType);
  if (cached && isCacheValid(cached)) {
    console.log(`[Logo Cache] Cache hit for ${templateType}`);
    return {
      buffer: cached.buffer,
      extension: cached.extension,
      width: cached.width,
      height: cached.height,
    };
  }

  if (cached) {
    console.log(`[Logo Cache] Cache expired for ${templateType}, removing`);
    logoCache.delete(templateType);
  }

  return null;
}

function setCachedLogo(templateType: string, logoData: LogoData): void {
  logoCache.set(templateType, {
    ...logoData,
    timestamp: Date.now(),
  });
  console.log(`[Logo Cache] Cached logo for ${templateType}`);
}

async function fetchLogoFromStorage(templateType: string): Promise<LogoData | null> {
  const config = LOGO_CONFIG[templateType];
  if (!config) {
    console.warn(`[Logo Loader] No logo configuration found for template ${templateType}`);
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    console.error('[Logo Loader] SUPABASE_URL environment variable not set');
    return null;
  }

  const storageUrl = `${supabaseUrl}/storage/v1/object/public/company-assets/${config.path}`;

  console.log(`[Logo Loader] Fetching logo from storage: ${storageUrl}`);

  let retries = 2;
  while (retries > 0) {
    try {
      const response = await fetch(storageUrl);

      if (!response.ok) {
        console.error(`[Logo Loader] Failed to fetch logo: ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          console.error(`[Logo Loader] Logo not found at path: ${config.path}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      console.log(`[Logo Loader] Successfully fetched logo (${arrayBuffer.byteLength} bytes)`);

      return {
        buffer: arrayBuffer,
        extension: config.extension,
        width: config.width,
        height: config.height,
      };
    } catch (error) {
      retries--;
      console.warn(`[Logo Loader] Fetch attempt failed (${retries} retries left):`, error);

      if (retries === 0) {
        console.error(`[Logo Loader] All fetch attempts failed for ${templateType}`);
        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return null;
}

export async function loadLogo(templateType: string): Promise<LogoData | null> {
  try {
    const normalizedType = templateType.toLowerCase();

    if (!LOGO_CONFIG[normalizedType]) {
      console.warn(`[Logo Loader] No logo support for template ${templateType}`);
      return null;
    }

    const cachedLogo = getCachedLogo(normalizedType);
    if (cachedLogo) {
      return cachedLogo;
    }

    const logoData = await fetchLogoFromStorage(normalizedType);

    if (logoData) {
      setCachedLogo(normalizedType, logoData);
    }

    return logoData;
  } catch (error) {
    console.error(`[Logo Loader] Failed to load logo for template ${templateType}:`, error);
    return null;
  }
}

export function hasLogoSupport(templateType: string): boolean {
  return templateType.toLowerCase() in LOGO_CONFIG;
}
