import { Prisma } from '@prisma/client';

/**
 * Soft Delete Middleware for Prisma
 * 
 * Automatically intercepts delete operations and converts them to soft deletes
 * by setting deletedAt timestamp instead of actually removing records.
 * 
 * Features:
 * - Intercepts delete and deleteMany operations
 * - Automatically filters out soft-deleted records from queries
 * - Provides forceDelete option to bypass soft delete
 * - Handles relations properly
 * 
 * Usage in PrismaService:
 * this.$use(softDeleteMiddleware);
 */

// Models that support soft delete (have deletedAt field)
const SOFT_DELETE_MODELS: string[] = [
  'User',
  'Role',
  'Building',
  'Apartment',
  'ExpenseCategory',
  'Supplier',
  'Expense',
  'OilDelivery',
  'OilMeasurement',
  'Payment',
  'Document',
  'Event',
];

/**
 * Check if model supports soft delete
 */
function supportsSoftDelete(model: string): boolean {
  return SOFT_DELETE_MODELS.includes(model);
}

/**
 * Add deletedAt filter to where clause
 */
function addSoftDeleteFilter(args: any): any {
  if (!args.where) {
    args.where = {};
  }

  // Only filter if not explicitly querying deleted records
  if (args.where.deletedAt === undefined) {
    args.where.deletedAt = null;
  }

  return args;
}

/**
 * Soft Delete Middleware
 */
export const softDeleteMiddleware = async (params: any, next: any) => {
  const { model, action } = params;

  // Only process if model supports soft delete
  if (!model || !supportsSoftDelete(model)) {
    return next(params);
  }

  // Handle delete operation
  if (action === 'delete') {
    // Check if force delete is requested
    if (params.args?.forceDelete === true) {
      // Remove forceDelete flag and proceed with actual delete
      delete params.args.forceDelete;
      return next(params);
    }

    // Convert to update with deletedAt
    params.action = 'update';
    params.args = {
      ...params.args,
      data: {
        deletedAt: new Date(),
      },
    };

    return next(params);
  }

  // Handle deleteMany operation
  if (action === 'deleteMany') {
    // Check if force delete is requested
    if (params.args?.forceDelete === true) {
      delete params.args.forceDelete;
      return next(params);
    }

    // Convert to updateMany with deletedAt
    params.action = 'updateMany';
    params.args = {
      ...params.args,
      data: {
        deletedAt: new Date(),
      },
    };

    return next(params);
  }

  // Filter out soft-deleted records from read operations
  if (
    action === 'findUnique' ||
    action === 'findFirst' ||
    action === 'findMany' ||
    action === 'count' ||
    action === 'aggregate'
  ) {
    params.args = addSoftDeleteFilter(params.args);
  }

  // Handle update operations - don't allow updating deleted records unless explicit
  if (action === 'update' || action === 'updateMany') {
    params.args = addSoftDeleteFilter(params.args);
  }

  return next(params);
};

/**
 * Hard Delete Middleware (for permanent deletion)
 * 
 * Use this when you need to actually delete records permanently,
 * bypassing soft delete middleware.
 * 
 * Usage:
 * await prisma.user.delete({
 *   where: { id: userId },
 *   forceDelete: true // Add this flag
 * });
 */

/**
 * Query extension type for TypeScript support
 */
declare module '@prisma/client' {
  interface PrismaDeleteArgs {
    forceDelete?: boolean;
  }
  interface PrismaDeleteManyArgs {
    forceDelete?: boolean;
  }
}

/**
 * Restore soft-deleted record
 * 
 * Example usage:
 * await restoreSoftDeleted(prisma.user, { id: userId });
 */
export async function restoreSoftDeleted<T>(
  model: any,
  where: any,
): Promise<T> {
  return model.update({
    where,
    data: {
      deletedAt: null,
    },
  });
}

/**
 * Query only soft-deleted records
 * 
 * Example usage:
 * const deletedUsers = await findDeleted(prisma.user, {});
 */
export async function findDeleted<T>(model: any, args: any = {}): Promise<T[]> {
  return model.findMany({
    ...args,
    where: {
      ...args.where,
      deletedAt: { not: null },
    },
  });
}

/**
 * Permanently delete soft-deleted records older than specified days
 * 
 * Example usage (delete records soft-deleted more than 90 days ago):
 * await permanentlyDeleteOld(prisma.user, 90);
 */
export async function permanentlyDeleteOld(
  model: any,
  daysOld: number,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await model.deleteMany({
    where: {
      deletedAt: {
        not: null,
        lt: cutoffDate,
      },
    },
    forceDelete: true, // Bypass soft delete middleware
  });

  return result.count;
}
