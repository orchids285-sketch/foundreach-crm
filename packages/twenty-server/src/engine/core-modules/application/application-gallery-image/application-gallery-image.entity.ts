import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { WasIntroducedInUpgrade } from 'src/engine/core-modules/upgrade/decorators/was-introduced-in-upgrade.decorator';

// A gallery image shown on an application's marketplace page. Each row points to
// a stored File and belongs to exactly one owner: either an installed
// Application or an ApplicationRegistration (catalog record). `position`
// determines the display order.
@Entity({ name: 'applicationGalleryImage', schema: 'core' })
@Index('IDX_APPLICATION_GALLERY_IMAGE_APPLICATION_ID', ['applicationId'])
@Index(
  'IDX_APPLICATION_GALLERY_IMAGE_APPLICATION_REGISTRATION_ID',
  ['applicationRegistrationId'],
)
@Check(
  'CHK_APPLICATION_GALLERY_IMAGE_SINGLE_OWNER',
  `("applicationId" IS NOT NULL AND "applicationRegistrationId" IS NULL) OR ("applicationId" IS NULL AND "applicationRegistrationId" IS NOT NULL)`,
)
export class ApplicationGalleryImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  @WasIntroducedInUpgrade({
    upgradeCommandName:
      '2.19.0_CreateApplicationGalleryImageCoreTableFastInstanceCommand_1783090000001',
  })
  fileId: string;

  @ManyToOne(() => FileEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'fileId' })
  file: Relation<FileEntity>;

  @Column({ type: 'integer', default: 0 })
  position: number;

  @Column({ nullable: true, type: 'uuid' })
  applicationId: string | null;

  @ManyToOne(() => ApplicationEntity, (application) => application.galleryImages, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'applicationId' })
  application: Relation<ApplicationEntity> | null;

  @Column({ nullable: true, type: 'uuid' })
  applicationRegistrationId: string | null;

  @ManyToOne(
    () => ApplicationRegistrationEntity,
    (applicationRegistration) => applicationRegistration.galleryImages,
    {
      onDelete: 'CASCADE',
      nullable: true,
    },
  )
  @JoinColumn({ name: 'applicationRegistrationId' })
  applicationRegistration: Relation<ApplicationRegistrationEntity> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
