import { Logger } from '@nestjs/common';

import { DataSource, QueryRunner } from 'typeorm';

import { type ApplicationRegistrationSourceType } from 'src/engine/core-modules/application/application-registration/enums/application-registration-source-type.enum';
import { buildApplicationManifestStoragePath } from 'src/engine/core-modules/application/application-registration/utils/build-application-manifest-storage-path.util';
import { FileStorageDriverFactory } from 'src/engine/core-modules/file-storage/file-storage-driver.factory';
import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { SlowInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/slow-instance-command.interface';

type ApplicationRegistrationRow = {
  id: string;
  sourceType: ApplicationRegistrationSourceType;
  latestAvailableVersion: string | null;
  manifest: Record<string, unknown>;
};

@RegisteredInstanceCommand('2.19.0', 1783231279591, { type: 'slow' })
export class BackfillManifestStoragePathOnApplicationRegistrationSlowInstanceCommand
  implements SlowInstanceCommand
{
  private readonly logger = new Logger(
    BackfillManifestStoragePathOnApplicationRegistrationSlowInstanceCommand.name,
  );

  constructor(
    private readonly fileStorageDriverFactory: FileStorageDriverFactory,
  ) {}

  async runDataMigration(dataSource: DataSource): Promise<void> {
    const rows: ApplicationRegistrationRow[] = await dataSource.query(
      `SELECT id, "sourceType", "latestAvailableVersion", "manifest" FROM "core"."applicationRegistration" WHERE "manifest" IS NOT NULL AND "manifestStoragePath" IS NULL`,
    );

    const driver = this.fileStorageDriverFactory.getCurrentDriver();

    for (const row of rows) {
      const serializedManifest = JSON.stringify(row.manifest);

      const storagePath = buildApplicationManifestStoragePath({
        applicationRegistrationId: row.id,
        sourceType: row.sourceType,
        version: row.latestAvailableVersion,
        serializedManifest,
      });

      try {
        await driver.writeFile({
          filePath: storagePath,
          sourceFile: Buffer.from(serializedManifest, 'utf-8'),
          mimeType: 'application/json',
        });

        await dataSource.query(
          `UPDATE "core"."applicationRegistration" SET "manifestStoragePath" = $1 WHERE id = $2`,
          [storagePath, row.id],
        );
      } catch (error) {
        this.logger.warn(
          `Failed to backfill manifest storage path for application registration ${row.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE "core"."applicationRegistration" SET "manifestStoragePath" = NULL',
    );
  }
}
