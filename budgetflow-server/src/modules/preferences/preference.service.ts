import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { NOTIFICATION_ENTITY_TYPES, NOTIFICATION_TYPES } from "../notifications/notification.constants";
import { createUserNotificationSafely } from "../notifications/notification.service";
import { toPreferenceResponse } from "./preference.mapper";
import { createUserPreferences, findUserPreferences, upsertPrivacyMode } from "./preference.repository";
import type { UpdatePrivacyModeInput } from "./preference.validators";

export async function getUserPreferences(userId: string) {
  const preferences = (await findUserPreferences(userId)) ?? (await createUserPreferences(userId));

  return toPreferenceResponse(preferences);
}

export async function updateUserPrivacyMode(userId: string, input: UpdatePrivacyModeInput, context?: AuditRequestContext) {
  const existing = await findUserPreferences(userId);
  const preferences = await upsertPrivacyMode(userId, input.privacyModeEnabled);

  if (existing?.privacyModeEnabled !== preferences.privacyModeEnabled) {
    await recordAuditLogSafely({
      action: preferences.privacyModeEnabled ? AUDIT_ACTIONS.PRIVACY_MODE_ENABLED : AUDIT_ACTIONS.PRIVACY_MODE_DISABLED,
      afterSnapshot: {
        privacyModeEnabled: preferences.privacyModeEnabled
      },
      beforeSnapshot: {
        privacyModeEnabled: existing?.privacyModeEnabled ?? false
      },
      context,
      entityId: userId,
      entityType: AUDIT_ENTITY_TYPES.USER,
      userId
    });

    await createUserNotificationSafely({
      actionUrl: "/settings",
      category: "PRIVACY",
      dedupeKey: `privacy_mode:${preferences.privacyModeEnabled ? "enabled" : "disabled"}:${preferences.updatedAt.toISOString()}`,
      entityId: userId,
      entityType: NOTIFICATION_ENTITY_TYPES.USER,
      message: preferences.privacyModeEnabled
        ? "Sensitive financial values are now hidden across BudgetFlow."
        : "Sensitive financial values are visible again across BudgetFlow.",
      metadata: {
        privacyModeEnabled: preferences.privacyModeEnabled
      },
      severity: "INFO",
      title: preferences.privacyModeEnabled ? "Privacy Mode enabled" : "Privacy Mode disabled",
      type: preferences.privacyModeEnabled ? NOTIFICATION_TYPES.PRIVACY_MODE_ENABLED : NOTIFICATION_TYPES.PRIVACY_MODE_DISABLED,
      userId
    });
  }

  return toPreferenceResponse(preferences);
}
