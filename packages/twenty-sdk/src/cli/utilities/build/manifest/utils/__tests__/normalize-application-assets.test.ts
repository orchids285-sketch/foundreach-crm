import { describe, expect, it } from 'vitest';

import { normalizeApplicationAssets } from '@/cli/utilities/build/manifest/utils/normalize-application-assets';
import { type ApplicationConfig } from '@/sdk/define';

const buildConfig = (config: Record<string, unknown>): ApplicationConfig =>
  config as unknown as ApplicationConfig;

describe('normalizeApplicationAssets', () => {
  it('keeps a bundled logoPath', () => {
    const result = normalizeApplicationAssets(
      buildConfig({ logoPath: 'public/logo.png' }),
    );

    expect(result.logoPath).toBe('public/logo.png');
    expect(result.warnings).toEqual([]);
  });

  it('warns and ignores an absolute logoPath', () => {
    const result = normalizeApplicationAssets(
      buildConfig({ logoPath: 'https://example.com/logo.png' }),
    );

    expect(result.logoPath).toBeUndefined();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('external URL');
  });

  it('migrates a deprecated relative logoUrl with a warning', () => {
    const result = normalizeApplicationAssets(
      buildConfig({ logoUrl: 'public/logo.png' }),
    );

    expect(result.logoPath).toBe('public/logo.png');
    expect(result.warnings[0]).toContain('`logoUrl` is deprecated');
  });

  it('warns and ignores an absolute logoUrl', () => {
    const result = normalizeApplicationAssets(
      buildConfig({ logoUrl: 'https://example.com/logo.png' }),
    );

    expect(result.logoPath).toBeUndefined();
    expect(result.warnings[0]).toContain('external URL');
  });

  it('prefers logoPath over a deprecated logoUrl', () => {
    const result = normalizeApplicationAssets(
      buildConfig({
        logoPath: 'public/logo.png',
        logoUrl: 'public/old.png',
      }),
    );

    expect(result.logoPath).toBe('public/logo.png');
    expect(result.warnings).toEqual([]);
  });

  it('keeps galleryImages as-is', () => {
    const result = normalizeApplicationAssets(
      buildConfig({
        galleryImages: [
          { path: 'public/a.png', position: 0 },
          { path: 'public/b.png', position: 1 },
        ],
      }),
    );

    expect(result.galleryImages).toEqual([
      { path: 'public/a.png', position: 0 },
      { path: 'public/b.png', position: 1 },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('migrates deprecated screenshots to positioned galleryImages with a warning', () => {
    const result = normalizeApplicationAssets(
      buildConfig({ screenshots: ['public/a.png', 'public/b.png'] }),
    );

    expect(result.galleryImages).toEqual([
      { path: 'public/a.png', position: 0 },
      { path: 'public/b.png', position: 1 },
    ]);
    expect(result.warnings[0]).toContain('`screenshots` is deprecated');
  });

  it('warns and drops absolute urls from gallery images', () => {
    const result = normalizeApplicationAssets(
      buildConfig({
        galleryImages: [
          { path: 'public/a.png', position: 0 },
          { path: 'https://example.com/b.png', position: 1 },
        ],
      }),
    );

    expect(result.galleryImages).toEqual([
      { path: 'public/a.png', position: 0 },
    ]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('external URL');
  });

  it('returns an empty gallery when nothing is provided', () => {
    const result = normalizeApplicationAssets(buildConfig({}));

    expect(result.logoPath).toBeUndefined();
    expect(result.galleryImages).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
