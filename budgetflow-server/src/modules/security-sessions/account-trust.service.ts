import { prisma } from "../../lib/prisma";
import { BadRequestError, UnauthorizedError } from "../../utils/app-error";
import { comparePassword, hashPassword } from "../../utils/password";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import type { ChangePasswordInput, DeleteAccountInput } from "../auth/auth.validators";
import { LOGIN_HISTORY_STATUS, LOGIN_METHODS, recordLoginHistorySafely } from "../auth/login-history.service";
import { confirmSecondFactorForUser } from "../auth/two-factor.service";
import { NOTIFICATION_ENTITY_TYPES, NOTIFICATION_TYPES } from "../notifications/notification.constants";
import { createUserNotificationSafely } from "../notifications/notification.service";

export async function changeUserPassword(userId: string, input: ChangePasswordInput, context: AuditRequestContext) {
  const user = await getUserForAccountAction(userId);

  await confirmPassword(user.passwordHash, input.currentPassword);

  if (await comparePassword(input.newPassword, user.passwordHash)) {
    throw new BadRequestError("Choose a new password that is different from your current password.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) }
  });

  await recordLoginHistorySafely({
    attemptedEmail: user.email,
    metadata: context,
    method: LOGIN_METHODS.PASSWORD_CHANGE,
    sessionId: context.sessionId,
    status: LOGIN_HISTORY_STATUS.SUCCESS,
    userId: user.id
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.ACCOUNT_PASSWORD_CHANGED,
    context,
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: { source: "settings" },
    severity: "WARNING",
    userId: user.id
  });

  await createUserNotificationSafely({
    actionUrl: "/settings",
    category: "SECURITY",
    dedupeKey: `security.password_changed:${user.id}:${new Date().toISOString()}`,
    entityId: user.id,
    entityType: NOTIFICATION_ENTITY_TYPES.USER,
    message: "Your BudgetFlow password was changed.",
    metadata: {},
    severity: "WARNING",
    title: "Password changed",
    type: NOTIFICATION_TYPES.SECURITY_PASSWORD_CHANGED,
    userId: user.id
  });

  return { changed: true };
}

export async function buildAccountDataDownload(userId: string, context: AuditRequestContext) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      twoFactorEnabled: true,
      twoFactorEnabledAt: true,
      twoFactorLastVerifiedAt: true
    }
  });

  if (!user) {
    throw new UnauthorizedError();
  }

  const [
    preferences,
    wallets,
    categories,
    transactions,
    recurringTransactions,
    budgets,
    debts,
    debtPayments,
    savingGoals,
    savingContributions,
    notifications,
    loginHistory,
    auditLogs,
    dataExports,
    dataImports
  ] = await Promise.all([
    prisma.userPreference.findUnique({
      where: { userId },
      select: { privacyModeEnabled: true, createdAt: true, updatedAt: true }
    }),
    prisma.wallet.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }),
    prisma.budget.findMany({
      where: { userId },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }]
    }),
    prisma.debt.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }),
    prisma.debtPayment.findMany({
      where: { userId },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.savingGoal.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }),
    prisma.savingContribution.findMany({
      where: { userId },
      orderBy: [{ contributionDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }),
    prisma.loginHistory.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }),
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        action: true,
        afterSnapshot: true,
        beforeSnapshot: true,
        browser: true,
        correlationId: true,
        createdAt: true,
        deviceType: true,
        entityId: true,
        entityType: true,
        errorMessage: true,
        id: true,
        ipAddress: true,
        metadata: true,
        operatingSystem: true,
        requestId: true,
        result: true,
        sessionId: true,
        severity: true
      }
    }),
    prisma.dataExport.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        completedAt: true,
        createdAt: true,
        downloadedAt: true,
        errorMessage: true,
        expiresAt: true,
        exportType: true,
        failedAt: true,
        fileName: true,
        fileSize: true,
        filters: true,
        format: true,
        id: true,
        mimeType: true,
        requestedAt: true,
        rowCount: true,
        startedAt: true,
        status: true,
        updatedAt: true
      }
    }),
    prisma.dataImport.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        cancelledAt: true,
        completedAt: true,
        confirmedAt: true,
        createdAt: true,
        duplicateRows: true,
        errorMessage: true,
        failedAt: true,
        failedRows: true,
        fileSize: true,
        format: true,
        id: true,
        importType: true,
        importedRows: true,
        invalidRows: true,
        mapping: true,
        mimeType: true,
        options: true,
        originalFileName: true,
        parsedAt: true,
        requestedAt: true,
        rows: {
          select: {
            createdAt: true,
            createdTransactionId: true,
            duplicateKey: true,
            id: true,
            importedAt: true,
            matchedCategoryId: true,
            matchedWalletId: true,
            normalizedData: true,
            rawData: true,
            rowNumber: true,
            skippedReason: true,
            updatedAt: true,
            validationErrors: true,
            validationStatus: true
          },
          orderBy: { rowNumber: "asc" }
        },
        skippedRows: true,
        status: true,
        summary: true,
        totalRows: true,
        updatedAt: true,
        validRows: true
      }
    })
  ]);

  const exportedAt = new Date();
  const payload = toPlainJson({
    account: user,
    auditLogs,
    budgets,
    categories,
    dataExports,
    dataImports,
    debts,
    debtPayments,
    exportedAt,
    exportVersion: 1,
    loginHistory,
    notifications,
    preferences,
    recurringTransactions,
    savingContributions,
    savingGoals,
    transactions,
    wallets
  });

  await recordLoginHistorySafely({
    attemptedEmail: user.email,
    metadata: context,
    method: LOGIN_METHODS.ACCOUNT_DATA_DOWNLOAD,
    sessionId: context.sessionId,
    status: LOGIN_HISTORY_STATUS.SUCCESS,
    userId: user.id
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.ACCOUNT_DATA_DOWNLOADED,
    context,
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: {
      exportVersion: 1,
      sections: Object.keys(payload as Record<string, unknown>)
    },
    userId: user.id
  });

  await createUserNotificationSafely({
    actionUrl: "/settings",
    category: "SECURITY",
    dedupeKey: `security.account_data_downloaded:${user.id}:${exportedAt.toISOString()}`,
    entityId: user.id,
    entityType: NOTIFICATION_ENTITY_TYPES.USER,
    message: "A copy of your BudgetFlow account data was downloaded.",
    metadata: { exportVersion: 1 },
    severity: "INFO",
    title: "Account data downloaded",
    type: NOTIFICATION_TYPES.SECURITY_ACCOUNT_DATA_DOWNLOADED,
    userId: user.id
  });

  return {
    buffer: Buffer.from(JSON.stringify(payload, null, 2), "utf8"),
    fileName: `budgetflow-account-data-${exportedAt.toISOString().slice(0, 10)}.json`,
    mimeType: "application/json"
  };
}

export async function deleteUserAccount(
  userId: string,
  input: DeleteAccountInput,
  context: AuditRequestContext
) {
  const user = await getUserForAccountAction(userId);

  await confirmPassword(user.passwordHash, input.password);

  if (user.twoFactorEnabled) {
    if (!input.code?.trim()) {
      throw new BadRequestError("Enter a 2FA code or recovery code to delete this account.");
    }

    await confirmSecondFactorForUser(user.id, input.code);
  }

  const requestedAt = new Date();

  await recordLoginHistorySafely({
    attemptedEmail: user.email,
    metadata: context,
    method: LOGIN_METHODS.ACCOUNT_DELETE,
    sessionId: context.sessionId,
    status: LOGIN_HISTORY_STATUS.SUCCESS,
    twoFactorPassed: user.twoFactorEnabled,
    twoFactorRequired: user.twoFactorEnabled,
    userId: user.id
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.ACCOUNT_DELETE_REQUESTED,
    context,
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: {
      deletionStrategy: "hard_delete_user_owned_data",
      requestedAt
    },
    severity: "CRITICAL",
    userId: user.id
  });

  await createUserNotificationSafely({
    actionUrl: "/settings",
    category: "SECURITY",
    dedupeKey: `security.account_deleted:${user.id}:${requestedAt.toISOString()}`,
    entityId: user.id,
    entityType: NOTIFICATION_ENTITY_TYPES.USER,
    message: "Your BudgetFlow account deletion was confirmed.",
    metadata: { deletionStrategy: "hard_delete_user_owned_data" },
    severity: "CRITICAL",
    title: "Account deletion confirmed",
    type: NOTIFICATION_TYPES.SECURITY_ACCOUNT_DELETED,
    userId: user.id
  });

  await prisma.$transaction(async (tx) => {
    const [dataImports, recurringTransactions, transactions] = await Promise.all([
      tx.dataImport.findMany({ where: { userId: user.id }, select: { id: true } }),
      tx.recurringTransaction.findMany({ where: { userId: user.id }, select: { id: true } }),
      tx.transaction.findMany({ where: { userId: user.id }, select: { id: true } })
    ]);
    const dataImportIds = dataImports.map((item) => item.id);
    const recurringTransactionIds = recurringTransactions.map((item) => item.id);
    const transactionIds = transactions.map((item) => item.id);

    await tx.dataImportRow.deleteMany({ where: { importId: { in: dataImportIds } } });
    await tx.recurringTransactionOccurrence.deleteMany({
      where: {
        OR: [
          { recurringTransactionId: { in: recurringTransactionIds } },
          { transactionId: { in: transactionIds } }
        ]
      }
    });
    await tx.savingContribution.deleteMany({ where: { userId: user.id } });
    await tx.debtPayment.deleteMany({ where: { userId: user.id } });
    await tx.transaction.deleteMany({ where: { userId: user.id } });
    await tx.recurringTransaction.deleteMany({ where: { userId: user.id } });
    await tx.budget.deleteMany({ where: { userId: user.id } });
    await tx.category.deleteMany({ where: { userId: user.id } });
    await tx.wallet.deleteMany({ where: { userId: user.id } });
    await tx.debt.deleteMany({ where: { userId: user.id } });
    await tx.savingGoal.deleteMany({ where: { userId: user.id } });
    await tx.notification.deleteMany({ where: { userId: user.id } });
    await tx.dataExport.deleteMany({ where: { userId: user.id } });
    await tx.dataImport.deleteMany({ where: { userId: user.id } });
    await tx.backgroundJob.deleteMany({ where: { createdByUserId: user.id } });
    await tx.authSession.deleteMany({ where: { userId: user.id } });
    await tx.twoFactorChallenge.deleteMany({ where: { userId: user.id } });
    await tx.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } });
    await tx.userPreference.deleteMany({ where: { userId: user.id } });
    await tx.loginHistory.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.updateMany({
      where: { OR: [{ userId: user.id }, { actorUserId: user.id }] },
      data: { actorUserId: null, userId: null }
    });
    await tx.user.delete({ where: { id: user.id } });
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.ACCOUNT_DELETED,
    context: {
      ...context,
      actorUserId: undefined,
      sessionId: undefined
    },
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: {
      deletionStrategy: "hard_delete_user_owned_data",
      requestedAt
    },
    severity: "CRITICAL",
    userId: null
  });

  return { deleted: true };
}

async function getUserForAccountAction(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      id: true,
      passwordHash: true,
      twoFactorEnabled: true
    }
  });

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

async function confirmPassword(passwordHash: string, password: string) {
  const passwordMatches = await comparePassword(password, passwordHash);

  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid confirmation.");
  }
}

export function toPlainJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}
