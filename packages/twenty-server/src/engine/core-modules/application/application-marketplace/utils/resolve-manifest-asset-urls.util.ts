import { type Manifest } from 'twenty-shared/application';

const isAbsoluteUrl = (url: string): boolean =>
  url.startsWith('http://') || url.startsWith('https://');

// Rewrites the manifest's bundled asset paths (logo + gallery images) into
// resolved display URLs using the provided builder. Absolute URLs are left
// untouched. Both the canonical fields (`logoPath`, `galleryImages`) and the
// deprecated ones (`logoUrl`, `screenshots`) are resolved for backward
// compatibility.
export const resolveManifestAssetUrls = (
  manifest: Manifest,
  urlBuilder: (filePath: string) => string,
): Manifest => {
  const resolveUrl = (url: string): string =>
    isAbsoluteUrl(url) ? url : urlBuilder(url);

  return {
    ...manifest,
    application: {
      ...manifest.application,
      logoUrl: manifest.application.logoUrl
        ? resolveUrl(manifest.application.logoUrl)
        : undefined,
      logoPath: manifest.application.logoPath
        ? resolveUrl(manifest.application.logoPath)
        : undefined,
      screenshots: (manifest.application.screenshots ?? []).map(resolveUrl),
      galleryImages: (manifest.application.galleryImages ?? []).map(
        (galleryImage) => ({
          ...galleryImage,
          path: resolveUrl(galleryImage.path),
        }),
      ),
    },
  };
};
