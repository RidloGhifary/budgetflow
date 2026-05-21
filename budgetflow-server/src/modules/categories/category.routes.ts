import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate-request";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory
} from "./category.controller";
import { categoryQuerySchema, createCategorySchema, updateCategorySchema } from "./category.validators";

export const categoryRouter = Router();

categoryRouter.use(requireAuth);

categoryRouter.get("/", validateQuery(categoryQuerySchema), getCategories);
categoryRouter.post("/", validateBody(createCategorySchema), createCategory);
categoryRouter.get("/:id", getCategory);
categoryRouter.patch("/:id", validateBody(updateCategorySchema), updateCategory);
categoryRouter.delete("/:id", deleteCategory);
