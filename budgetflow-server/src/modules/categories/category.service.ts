import { ConflictError, NotFoundError } from "../../utils/app-error";
import { isPrismaForeignKeyConstraintError, isPrismaUniqueConstraintError } from "../../utils/prisma-error";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { getChangedFields } from "../audit-logs/audit-log.sanitizer";
import {
  createCategory,
  deleteCategory,
  findCategories,
  findCategoryById,
  updateCategory
} from "./category.repository";
import { toCategoryResponse } from "./category.mapper";
import type { CategoryQueryInput, CreateCategoryInput, UpdateCategoryInput } from "./category.validators";

export async function listCategories(userId: string, filters: CategoryQueryInput) {
  const categories = await findCategories({
    userId,
    type: filters.type
  });

  return categories.map(toCategoryResponse);
}

export async function createUserCategory(userId: string, input: CreateCategoryInput, context?: AuditRequestContext) {
  const category = await createCategory({
    userId,
    name: input.name,
    type: input.type,
    icon: input.icon,
    color: input.color
  }).catch(handleCategoryConflict);
  const snapshot = categorySnapshot(category);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.CATEGORY_CREATED,
    afterSnapshot: snapshot,
    context,
    entityId: category.id,
    entityType: AUDIT_ENTITY_TYPES.CATEGORY,
    userId
  });

  return toCategoryResponse(category);
}

export async function getUserCategory(userId: string, id: string) {
  const category = await findCategoryById(userId, id);

  if (!category) {
    throw new NotFoundError("Category was not found");
  }

  return toCategoryResponse(category);
}

export async function updateUserCategory(userId: string, id: string, input: UpdateCategoryInput, context?: AuditRequestContext) {
  const category = await findCategoryById(userId, id);

  if (!category) {
    throw new NotFoundError("Category was not found");
  }

  const updatedCategory = await updateCategory(userId, id, {
    name: input.name,
    type: input.type,
    icon: input.icon,
    color: input.color
  }).catch(handleCategoryConflict);

  if (!updatedCategory) {
    throw new NotFoundError("Category was not found");
  }

  const beforeSnapshot = categorySnapshot(category);
  const afterSnapshot = categorySnapshot(updatedCategory);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.CATEGORY_UPDATED,
    afterSnapshot,
    beforeSnapshot,
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.CATEGORY,
    metadata: {
      changedFields: getChangedFields(beforeSnapshot, afterSnapshot)
    },
    userId
  });

  return toCategoryResponse(updatedCategory);
}

export async function deleteUserCategory(userId: string, id: string, context?: AuditRequestContext) {
  const category = await findCategoryById(userId, id);

  if (!category) {
    throw new NotFoundError("Category was not found");
  }

  await deleteCategory(userId, id).catch((error: unknown) => {
    if (isPrismaForeignKeyConstraintError(error)) {
      throw new ConflictError("Category cannot be deleted while it has transactions or budgets");
    }

    throw error;
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.CATEGORY_DELETED,
    beforeSnapshot: categorySnapshot(category),
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.CATEGORY,
    userId
  });
}

function categorySnapshot(category: {
  color?: string | null;
  icon?: string | null;
  id: string;
  name: string;
  type: string;
}) {
  return {
    color: category.color,
    icon: category.icon,
    id: category.id,
    name: category.name,
    type: category.type
  };
}

function handleCategoryConflict(error: unknown): never {
  if (isPrismaUniqueConstraintError(error)) {
    throw new ConflictError("Category name already exists for this type");
  }

  throw error;
}
