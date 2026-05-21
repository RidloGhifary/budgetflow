import type { CategoryType, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { DEFAULT_CATEGORIES } from "./category.defaults";

interface CategoryFilters {
  userId: string;
  type?: CategoryType;
}

interface CreateCategoryData {
  userId: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

interface UpdateCategoryData {
  name?: string;
  type?: CategoryType;
  icon?: string | null;
  color?: string | null;
}

export function findCategories(filters: CategoryFilters) {
  const where: Prisma.CategoryWhereInput = {
    userId: filters.userId,
    ...(filters.type ? { type: filters.type } : {})
  };

  return prisma.category.findMany({
    where,
    orderBy: [{ type: "asc" }, { name: "asc" }]
  });
}

export function findCategoryById(userId: string, id: string) {
  return prisma.category.findFirst({
    where: {
      id,
      userId
    }
  });
}

export function createCategory(data: CreateCategoryData) {
  return prisma.category.create({
    data
  });
}

export async function updateCategory(userId: string, id: string, data: UpdateCategoryData) {
  await prisma.category.updateMany({
    where: {
      id,
      userId
    },
    data
  });

  return findCategoryById(userId, id);
}

export function deleteCategory(userId: string, id: string) {
  return prisma.category.deleteMany({
    where: {
      id,
      userId
    }
  });
}

export function seedDefaultCategories(userId: string) {
  return prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({
      userId,
      ...category
    })),
    skipDuplicates: true
  });
}
