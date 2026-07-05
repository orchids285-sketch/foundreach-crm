// Application logos and gallery images must be images. Public assets as a whole
// can be any static file, so this check is applied per-asset (to the logo and
// gallery entries) rather than as a folder-wide restriction.
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.avif',
]);

export const isImageFilePath = (filePath: string): boolean => {
  const lastDotIndex = filePath.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return false;
  }

  return ALLOWED_IMAGE_EXTENSIONS.has(
    filePath.slice(lastDotIndex).toLowerCase(),
  );
};
