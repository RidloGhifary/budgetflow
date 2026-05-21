import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate-request";
import { createWallet, deleteWallet, getWallet, getWallets, updateWallet } from "./wallet.controller";
import { createWalletSchema, updateWalletSchema, walletQuerySchema } from "./wallet.validators";

export const walletRouter = Router();

walletRouter.use(requireAuth);

walletRouter.get("/", validateQuery(walletQuerySchema), getWallets);
walletRouter.post("/", validateBody(createWalletSchema), createWallet);
walletRouter.get("/:id", getWallet);
walletRouter.patch("/:id", validateBody(updateWalletSchema), updateWallet);
walletRouter.delete("/:id", deleteWallet);
