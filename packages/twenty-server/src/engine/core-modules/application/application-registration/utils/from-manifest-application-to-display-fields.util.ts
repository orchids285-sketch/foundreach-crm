import { type ApplicationManifest } from 'twenty-shared/application';

import { toGalleryImagePaths } from 'src/engine/core-modules/application/application-registration/utils/to-gallery-image-paths.util';

export const fromManifestApplicationToDisplayFields = (
  application: ApplicationManifest | undefined,
) => ({
  logo: application?.logoPath ?? application?.logoUrl ?? null,
  description: application?.description ?? null,
  author: application?.author ?? null,
  category: application?.category ?? null,
  websiteUrl: application?.websiteUrl ?? null,
  aboutDescription: application?.aboutDescription ?? null,
  termsUrl: application?.termsUrl ?? null,
  emailSupport: application?.emailSupport ?? null,
  issueReportUrl: application?.issueReportUrl ?? null,
  screenshots: toGalleryImagePaths(application),
});
