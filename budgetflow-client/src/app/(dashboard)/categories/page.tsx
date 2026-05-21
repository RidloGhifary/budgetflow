"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Tags, Trash2 } from "lucide-react";

import { CategoryForm } from "@/components/categories/category-form";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import { getFriendlyApiError } from "@/lib/api/http";
import { categoryTypeLabels } from "@/lib/labels";
import type { CategoryFormValues } from "@/lib/validation/categories";
import { useToast } from "@/providers/toast-provider";
import type { Category, CategoryType } from "@/types/api";

export default function CategoriesPage() {
  const { categories, createCategory, deleteCategory, errorMessage, isLoading, reload, updateCategory } = useCategories();
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groupedCategories = useMemo(
    () => ({
      income: categories.filter((category) => category.type === "INCOME"),
      expense: categories.filter((category) => category.type === "EXPENSE")
    }),
    [categories]
  );

  const openCreateForm = () => {
    setEditingCategory(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (category: Category) => {
    setEditingCategory(category);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
    setFormError(null);
  };

  const normalizeCategoryInput = (values: CategoryFormValues) => ({
    name: values.name,
    type: values.type,
    icon: values.icon?.trim() || (editingCategory ? null : undefined),
    color: values.color?.trim() || (editingCategory ? null : undefined)
  });

  const handleSubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, normalizeCategoryInput(values));
        showToast({ title: "Category updated", variant: "success" });
      } else {
        await createCategory(normalizeCategoryInput(values));
        showToast({ title: "Category created", variant: "success" });
      }

      closeForm();
    } catch (error) {
      const message = getFriendlyApiError(error, editingCategory ? "updateCategory" : "createCategory");
      setFormError(message);
      showToast({ title: "Category was not saved", description: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(`Delete ${category.name}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setDeletingId(category.id);

    try {
      await deleteCategory(category.id);
      showToast({ title: "Category deleted", variant: "success" });
    } catch (error) {
      showToast({
        title: "Category was not deleted",
        description: getFriendlyApiError(error, "deleteCategory"),
        variant: "error"
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize income and expense categories for transactions, budgets, and reports."
        actions={
          <>
            <Button disabled={isLoading} onClick={() => void reload()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreateForm} type="button">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </>
        }
      />

      {isFormOpen ? (
        <SectionCard
          title={editingCategory ? "Edit category" : "Create category"}
          description="Categories are grouped by income or expense for transactions, budgets, reports, and cash-flow views."
        >
          <div className="space-y-4">
            {formError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            ) : null}
            <CategoryForm category={editingCategory} isSubmitting={isSubmitting} onCancel={closeForm} onSubmit={handleSubmit} />
          </div>
        </SectionCard>
      ) : null}

      {isLoading ? <CategorySkeleton /> : null}

      {!isLoading && errorMessage ? (
        <SectionCard title="Could not load categories" description={errorMessage}>
          <Button onClick={() => void reload()} type="button">
            Retry
          </Button>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && categories.length === 0 ? (
        <SectionCard
          title="No categories yet"
          description="Add categories to keep future transactions organized."
          action={
            <Button onClick={openCreateForm} type="button">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">Income and expense categories will appear in separate groups after they are created.</p>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && categories.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <CategorySection
            categories={groupedCategories.income}
            deletingId={deletingId}
            onDelete={handleDelete}
            onEdit={openEditForm}
            onCreate={openCreateForm}
            type="INCOME"
          />
          <CategorySection
            categories={groupedCategories.expense}
            deletingId={deletingId}
            onDelete={handleDelete}
            onEdit={openEditForm}
            onCreate={openCreateForm}
            type="EXPENSE"
          />
        </div>
      ) : null}
    </div>
  );
}

interface CategorySectionProps {
  categories: Category[];
  deletingId: string | null;
  onCreate: () => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  type: CategoryType;
}

function CategorySection({ categories, deletingId, onCreate, onDelete, onEdit, type }: CategorySectionProps) {
  return (
    <SectionCard
      title={`${categoryTypeLabels[type]} Categories`}
      description={`${categories.length} ${type.toLowerCase()} categor${categories.length === 1 ? "y" : "ies"}`}
      action={
        <Button onClick={onCreate} size="sm" type="button" variant="outline">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      }
    >
      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
          No {type.toLowerCase()} categories yet.
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => {
            const accentColor = category.color || "#007F68";

            return (
              <div key={category.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary"
                    style={{ color: accentColor }}
                  >
                    <Tags className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{category.icon || "No icon"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusBadge status={category.type} />
                  <Button aria-label={`Edit ${category.name}`} onClick={() => onEdit(category)} size="icon" type="button" variant="ghost">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    aria-label={`Delete ${category.name}`}
                    disabled={deletingId === category.id}
                    onClick={() => onDelete(category)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    {deletingId === category.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function CategorySkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-56 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((__, itemIndex) => (
              <div key={itemIndex} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
