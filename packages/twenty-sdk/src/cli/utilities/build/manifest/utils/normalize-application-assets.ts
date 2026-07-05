import { type GalleryImageManifest } from 'twenty-shared/application';

import { type ApplicationConfig } from '@/sdk/define';

const isAbsoluteUrl = (value: string): boolean =>
  value.startsWith('http://') || value.startsWith('https://');

// Normalizes the author-facing asset fields into the canonical manifest shape:
// a single `logoPath` and an ordered `galleryImages` list, both referencing
// files bundled in the app `public/` folder. External URLs are no longer
// supported — they are reported as warnings and ignored. The deprecated
// `logoUrl` / `screenshots` fields are accepted for backward compatibility.
export const normalizeApplicationAssets = (
  application: ApplicationConfig,
): {
  logoPath?: string;
  galleryImages: GalleryImageManifest[];
  warnings: string[];
} => {
  const warnings: string[] = [];

  let logoPath = application.logoPath;

  if (logoPath && isAbsoluteUrl(logoPath)) {
    warnings.push(
      `Application logoPath "${logoPath}" is an external URL. External asset URLs are no longer supported and are ignored. Bundle the image in your public/ folder instead.`,
    );
    logoPath = undefined;
  }

  if (!logoPath && application.logoUrl) {
    if (isAbsoluteUrl(application.logoUrl)) {
      warnings.push(
        `Application logoUrl "${application.logoUrl}" is an external URL. External asset URLs are no longer supported and are ignored. Bundle the image in your public/ folder and reference it via logoPath.`,
      );
    } else {
      warnings.push(
        '`logoUrl` is deprecated. Use `logoPath` to reference an image bundled in your public/ folder.',
      );
      logoPath = application.logoUrl;
    }
  }

  const usesDeprecatedScreenshots =
    !application.galleryImages && (application.screenshots?.length ?? 0) > 0;

  if (usesDeprecatedScreenshots) {
    warnings.push(
      '`screenshots` is deprecated. Use `galleryImages` ({ path, position }[]) referencing images bundled in your public/ folder.',
    );
  }

  const rawGalleryImages: GalleryImageManifest[] =
    application.galleryImages ??
    (application.screenshots ?? []).map((path, index) => ({
      path,
      position: index,
    }));

  const galleryImages = rawGalleryImages.filter((image) => {
    if (isAbsoluteUrl(image.path)) {
      warnings.push(
        `Gallery image "${image.path}" is an external URL. External asset URLs are no longer supported and are ignored.`,
      );

      return false;
    }

    return true;
  });

  return { logoPath, galleryImages, warnings };
};
