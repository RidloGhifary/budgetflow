import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import { getAuditRequestContext } from "../audit-logs/audit-log.context";
import {
  createUserCategory,
  deleteUserCategory,
  getUserCategory,
  listCategories,
  updateUserCategory
} from "./category.service";
import type { CategoryQueryInput, CreateCategoryInput, UpdateCategoryInput } from "./category.validators";

export const getCategories = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const categories = await listCategories(userId, req.query as CategoryQueryInput);

  return sendSuccess(res, {
    message: "Categories retrieved",
    data: { categories }
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const category = await createUserCategory(userId, req.body as CreateCategoryInput, getAuditRequestContext(req));

  return sendSuccess(res, {
    statusCode: 201,
    message: "Category created",
    data: { category }
  });
});

export const getCategory = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const category = await getUserCategory(userId, req.params.id);

  return sendSuccess(res, {
    message: "Category retrieved",
    data: { category }
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const category = await updateUserCategory(userId, req.params.id, req.body as UpdateCategoryInput, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Category updated",
    data: { category }
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  await deleteUserCategory(userId, req.params.id, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Category deleted",
    data: null
  });
});
