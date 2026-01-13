import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { softDeleteMiddleware } from './soft-delete.middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    
    // Register soft delete middleware
    this.$use(softDeleteMiddleware);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    // Delete all records in reverse order of dependencies
    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && key[0] !== '_',
    ) as string[];
    return Promise.all(
      models.map((modelKey) => {
        const model = (this as any)[modelKey];
        return model?.deleteMany ? model.deleteMany() : Promise.resolve();
      }),
    );
  }
}
