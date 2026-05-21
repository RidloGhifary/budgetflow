import type { Category } from "@prisma/client";

export function toCategoryResponse(category: Category) {
  return {
    id: category.id,
    userId: category.userId,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt
  };
}
