import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import { getAuditRequestContext } from "../audit-logs/audit-log.context";
import {
  createUserWallet,
  deleteUserWallet,
  getUserWallet,
  listWallets,
  updateUserWallet
} from "./wallet.service";
import type { CreateWalletInput, UpdateWalletInput, WalletQueryInput } from "./wallet.validators";

export const getWallets = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const wallets = await listWallets(userId, req.query as WalletQueryInput);

  return sendSuccess(res, {
    message: "Wallets retrieved",
    data: { wallets }
  });
});

export const createWallet = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const wallet = await createUserWallet(userId, req.body as CreateWalletInput, getAuditRequestContext(req));

  return sendSuccess(res, {
    statusCode: 201,
    message: "Wallet created",
    data: { wallet }
  });
});

export const getWallet = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const wallet = await getUserWallet(userId, req.params.id);

  return sendSuccess(res, {
    message: "Wallet retrieved",
    data: { wallet }
  });
});

export const updateWallet = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const wallet = await updateUserWallet(userId, req.params.id, req.body as UpdateWalletInput, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Wallet updated",
    data: { wallet }
  });
});

export const deleteWallet = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  await deleteUserWallet(userId, req.params.id, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Wallet deleted",
    data: null
  });
});
