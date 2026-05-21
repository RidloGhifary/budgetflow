import { ConflictError, NotFoundError } from "../../utils/app-error";
import { isPrismaForeignKeyConstraintError, isPrismaUniqueConstraintError } from "../../utils/prisma-error";
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

export async function createUserCategory(userId: string, input: CreateCategoryInput) {
  const category = await createCategory({
    userId,
    name: input.name,
    type: input.type,
    icon: input.icon,
    color: input.color
  }).catch(handleCategoryConflict);

  return toCategoryResponse(category);
}

export async function getUserCategory(userId: string, id: string) {
  const category = await findCategoryById(userId, id);

  if (!category) {
    throw new NotFoundError("Category was not found");
  }

  return toCategoryResponse(category);
}

export async function updateUserCategory(userId: string, id: string, input: UpdateCategoryInput) {
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

  return toCategoryResponse(updatedCategory);
}

export async function deleteUserCategory(userId: string, id: string) {
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
}

function handleCategoryConflict(error: unknown): never {
  if (isPrismaUniqueConstraintError(error)) {
    throw new ConflictError("Category name already exists for this type");
  }

  throw error;
}
