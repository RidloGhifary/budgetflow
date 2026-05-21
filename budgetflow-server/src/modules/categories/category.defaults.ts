import { CategoryType } from "@prisma/client";

export const DEFAULT_CATEGORIES = [
  { name: "Salary", type: CategoryType.INCOME, icon: "wallet", color: "#007F68" },
  { name: "Freelance", type: CategoryType.INCOME, icon: "briefcase", color: "#10B981" },
  { name: "Bonus", type: CategoryType.INCOME, icon: "sparkles", color: "#2563EB" },
  { name: "Gift", type: CategoryType.INCOME, icon: "gift", color: "#8B5CF6" },
  { name: "Investment", type: CategoryType.INCOME, icon: "trending-up", color: "#0F766E" },
  { name: "Other", type: CategoryType.INCOME, icon: "circle", color: "#7B8794" },
  { name: "Food", type: CategoryType.EXPENSE, icon: "utensils", color: "#007F68" },
  { name: "Transport", type: CategoryType.EXPENSE, icon: "car", color: "#2563EB" },
  { name: "Shopping", type: CategoryType.EXPENSE, icon: "shopping-bag", color: "#EF4444" },
  { name: "Bills", type: CategoryType.EXPENSE, icon: "receipt", color: "#F59E0B" },
  { name: "Health", type: CategoryType.EXPENSE, icon: "heart-pulse", color: "#10B981" },
  { name: "Education", type: CategoryType.EXPENSE, icon: "book-open", color: "#6366F1" },
  { name: "Entertainment", type: CategoryType.EXPENSE, icon: "film", color: "#EC4899" },
  { name: "Rent", type: CategoryType.EXPENSE, icon: "home", color: "#64748B" },
  { name: "Subscription", type: CategoryType.EXPENSE, icon: "repeat", color: "#14B8A6" },
  { name: "Debt Payment", type: CategoryType.EXPENSE, icon: "credit-card", color: "#F97316" },
  { name: "Saving", type: CategoryType.EXPENSE, icon: "piggy-bank", color: "#22C55E" },
  { name: "Other", type: CategoryType.EXPENSE, icon: "circle", color: "#7B8794" }
] as const;
