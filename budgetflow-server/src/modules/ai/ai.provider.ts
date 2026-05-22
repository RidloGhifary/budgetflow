import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { AppError } from "../../utils/app-error";
import type { DashboardAiContext } from "./ai.context";

export interface AiMessage {
  content: string;
  role: "system" | "user";
}

export interface AiProvider {
  generateAnswer(messages: AiMessage[], context: DashboardAiContext): Promise<string>;
}

export function createAiProvider(): AiProvider {
  if (env.ai.provider === "http") {
    return new HttpAiProvider();
  }

  return new MockAiProvider();
}

class MockAiProvider implements AiProvider {
  async generateAnswer(_messages: AiMessage[], context: DashboardAiContext) {
    const { financialSummary, budgetSummary, debtSummary, savingGoalSummary, topExpenseCategory, period } = context;
    const cashFlowTone = financialSummary.netCashFlow >= 0 ? "positive" : "negative";
    const topExpense = topExpenseCategory
      ? `Your top normal expense category is ${topExpenseCategory.categoryName} at ${formatMoney(topExpenseCategory.totalAmount)}.`
      : "No top expense category is available for this period.";
    const budgetLine =
      budgetSummary.overBudgetCount > 0
        ? `${budgetSummary.overBudgetCount} budget categories are over budget.`
        : `Budget usage is ${formatPercent(budgetSummary.overallUsagePercentage)}, with ${formatMoney(budgetSummary.totalRemainingAmount)} remaining.`;
    const debtLine =
      debtSummary.overdueCount > 0 || debtSummary.dueSoonCount > 0
        ? `Watch debts: ${debtSummary.overdueCount} overdue and ${debtSummary.dueSoonCount} due soon.`
        : "No urgent debt due dates are showing.";
    const savingLine = `Saving goals are ${formatPercent(savingGoalSummary.averageProgressPercentage)} funded on average.`;

    return `For ${period.label}, your net cash flow is ${cashFlowTone} at ${formatMoney(financialSummary.netCashFlow)}. ${topExpense} ${budgetLine} ${debtLine} ${savingLine}`;
  }
}

class HttpAiProvider implements AiProvider {
  async generateAnswer(messages: AiMessage[]) {
    if (!env.ai.baseUrl || !env.ai.model) {
      throw new AppError(503, "AI analysis is temporarily unavailable. Please try again later.", "AI_PROVIDER_NOT_CONFIGURED");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.ai.timeoutMs);

    try {
      const response = await fetch(`${env.ai.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        body: JSON.stringify({
          model: env.ai.model,
          messages,
          temperature: 0.2
        }),
        headers: {
          "Content-Type": "application/json",
          ...(env.ai.apiKey ? { Authorization: `Bearer ${env.ai.apiKey}` } : {})
        },
        method: "POST",
        signal: controller.signal
      });

      if (!response.ok) {
        throw new AppError(503, "AI analysis is temporarily unavailable. Please try again later.", "AI_PROVIDER_ERROR");
      }

      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const answer = payload.choices?.[0]?.message?.content?.trim();

      if (!answer) {
        throw new AppError(503, "Unable to analyze your dashboard right now. Please try again.", "AI_PROVIDER_INVALID_RESPONSE");
      }

      return answer;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.warn({ error }, "AI provider request failed");
      throw new AppError(503, "AI analysis is temporarily unavailable. Please try again later.", "AI_PROVIDER_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("id-ID", { currency: "IDR", style: "currency", maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}
