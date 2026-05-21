"use client";

import { useCallback, useEffect, useState } from "react";

import { categoriesApi, type CategoryInput } from "@/lib/api/categories.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { Category } from "@/types/api";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await categoriesApi.list();
      setCategories(response.data.categories);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadCategories"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const createCategory = useCallback(
    async (input: CategoryInput) => {
      const response = await categoriesApi.create(input);
      await loadCategories();
      return response.data.category;
    },
    [loadCategories]
  );

  const updateCategory = useCallback(
    async (id: string, input: CategoryInput) => {
      const response = await categoriesApi.update(id, input);
      await loadCategories();
      return response.data.category;
    },
    [loadCategories]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await categoriesApi.delete(id);
      await loadCategories();
    },
    [loadCategories]
  );

  return {
    categories,
    isLoading,
    errorMessage,
    reload: loadCategories,
    createCategory,
    updateCategory,
    deleteCategory
  };
}
