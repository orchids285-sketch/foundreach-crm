import { Module } from '@nestjs/common';

import { RecomputeRollupFieldsJob } from 'src/engine/metadata-modules/field-metadata/jobs/recompute-rollup-fields.job';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';

@Module({
  imports: [TwentyORMModule, WorkspaceManyOrAllFlatEntityMapsCacheModule],
  providers: [RecomputeRollupFieldsJob],
})
export class RollupFieldJobModule {}
