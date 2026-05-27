import { Router } from "express";

import { aiRouter } from "../modules/ai/ai.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { budgetRouter } from "../modules/budgets/budget.routes";
import { categoryRouter } from "../modules/categories/category.routes";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes";
import { debtRouter } from "../modules/debts/debt.routes";
import { financialHealthRouter } from "../modules/financial-health/financial-health.routes";
import { goalRouter } from "../modules/goals/goal.routes";
import { reportRouter } from "../modules/reports/report.routes";
import { transactionRouter } from "../modules/transactions/transaction.routes";
import { walletRouter } from "../modules/wallets/wallet.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/wallets", walletRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/transactions", transactionRouter);
apiRouter.use("/budgets", budgetRouter);
apiRouter.use("/debts", debtRouter);
apiRouter.use("/goals", goalRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/financial-health", financialHealthRouter);
apiRouter.use("/reports", reportRouter);
