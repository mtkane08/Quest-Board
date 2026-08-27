'use client';

/**
 * Loads the Google Maps JS API script at most once per page, regardless of
 * how many components request it or how many times they re-render/remount.
 * Cached at module scope (not per-component state) since the underlying
 * <script> tag and `window.google` object are themselves page-global.
 */
let mapsPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadGoogleMaps can only run in the browser.'));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__questBoardGoogleMapsLoaded';
    (window as unknown as Record<string, () => void>)[callbackName] = () => {
      resolve(window.google);
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error('Failed to load the Google Maps script.'));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
}
