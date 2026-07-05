import { type ApplicationVariables } from './applicationVariablesType';
import { type GalleryImageManifest } from './galleryImageManifestType';
import { type ServerVariables } from './server-variables.type';
import { type SyncableEntityOptions } from './syncableEntityOptionsType';
import { type PostInstallLogicFunctionApplicationManifest } from '@/application/postInstallLogicFunctionApplicationType';
import { type PreInstallLogicFunctionApplicationManifest } from '@/application/preInstallLogicFunctionApplicationType';

export type ApplicationManifest = SyncableEntityOptions & {
  defaultRoleUniversalIdentifier: string;
  displayName: string;
  description: string;
  applicationVariables?: ApplicationVariables;
  serverVariables?: ServerVariables;
  author?: string;
  category?: string;
  /**
   * @deprecated Use `logoPath`, a path into the app `public/` folder. External
   * URLs are no longer supported: they are warned about and ignored at build
   * and ingest time. Kept for backward compatibility with older manifests.
   */
  logoUrl?: string;
  logoPath?: string;
  /**
   * @deprecated Use `galleryImages`. Each entry is treated as a `public/` folder
   * path and assigned an incremental position. External URLs are ignored.
   */
  screenshots?: string[];
  galleryImages?: GalleryImageManifest[];
  aboutDescription?: string;
  websiteUrl?: string;
  termsUrl?: string;
  emailSupport?: string;
  issueReportUrl?: string;
  postInstallLogicFunction?: PostInstallLogicFunctionApplicationManifest;
  preInstallLogicFunction?: PreInstallLogicFunctionApplicationManifest;
  /**
   * @deprecated Custom settings tabs are no longer supported. This property is
   * kept for backward compatibility with older manifests but is now ignored.
   * Use typed `applicationVariables` / `serverVariables` instead.
   */
  settingsCustomTabFrontComponentUniversalIdentifier?: string;
  packageJsonChecksum: string | null;
  yarnLockChecksum: string | null;
};
