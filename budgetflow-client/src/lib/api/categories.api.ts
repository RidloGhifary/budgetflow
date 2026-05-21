import { apiRequest } from "@/lib/api/http";
import type { ApiEnvelope, Category, CategoryType } from "@/types/api";

export interface CategoryInput {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
}

export const categoriesApi = {
  list() {
    return apiRequest<ApiEnvelope<{ categories: Category[] }>>("/categories");
  },

  create(input: CategoryInput) {
    return apiRequest<ApiEnvelope<{ category: Category }>>("/categories", {
      method: "POST",
      body: input
    });
  },

  update(id: string, input: CategoryInput) {
    return apiRequest<ApiEnvelope<{ category: Category }>>(`/categories/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  delete(id: string) {
    return apiRequest<ApiEnvelope<null>>(`/categories/${id}`, {
      method: "DELETE"
    });
  }
};
