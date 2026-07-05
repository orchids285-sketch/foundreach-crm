import { type ApplicationManifest } from 'twenty-shared/application';

// Resolve the ordered gallery image paths from a manifest application,
// preferring the new `galleryImages` ({ path, position }[]) field and falling
// back to the deprecated `screenshots` (string[]) field.
export const toGalleryImagePaths = (
  application: ApplicationManifest | undefined,
): string[] => {
  const galleryImages = application?.galleryImages;

  if (galleryImages && galleryImages.length > 0) {
    return [...galleryImages]
      .sort((a, b) => a.position - b.position)
      .map((galleryImage) => galleryImage.path);
  }

  return application?.screenshots ?? [];
};
