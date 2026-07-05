import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.19.0', 1783090000001)
export class CreateApplicationGalleryImageCoreTableFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "core"."applicationGalleryImage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fileId" uuid NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        "applicationId" uuid,
        "applicationRegistrationId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_applicationGalleryImage_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_APPLICATION_GALLERY_IMAGE_SINGLE_OWNER" CHECK (("applicationId" IS NOT NULL AND "applicationRegistrationId" IS NULL) OR ("applicationId" IS NULL AND "applicationRegistrationId" IS NOT NULL)),
        CONSTRAINT "FK_applicationGalleryImage_fileId" FOREIGN KEY ("fileId") REFERENCES "core"."file"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_applicationGalleryImage_applicationId" FOREIGN KEY ("applicationId") REFERENCES "core"."application"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_applicationGalleryImage_applicationRegistrationId" FOREIGN KEY ("applicationRegistrationId") REFERENCES "core"."applicationRegistration"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_APPLICATION_GALLERY_IMAGE_APPLICATION_ID"
        ON "core"."applicationGalleryImage" ("applicationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_APPLICATION_GALLERY_IMAGE_APPLICATION_REGISTRATION_ID"
        ON "core"."applicationGalleryImage" ("applicationRegistrationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_APPLICATION_GALLERY_IMAGE_APPLICATION_REGISTRATION_ID"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_APPLICATION_GALLERY_IMAGE_APPLICATION_ID"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "core"."applicationGalleryImage"`,
    );
  }
}
