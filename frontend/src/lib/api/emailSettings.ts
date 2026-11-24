import { api } from "../api";

export type EmailCategoryGroup = "account" | "campaign" | "donation" | "other";

export type EmailCategorySetting = {
  key: string;
  group: EmailCategoryGroup;
  label: string;
  description: string;
  /** Có thể gửi cùng lúc tới nhiều người (dễ làm hết hạn mức gửi trong ngày). */
  bulk: boolean;
  enabled: boolean;
};

export type EmailSettings = {
  /** Công tắc tổng: tắt thì không gửi email nào. */
  enabled: boolean;
  categories: EmailCategorySetting[];
  groups: Array<{ key: EmailCategoryGroup; label: string }>;
  updatedAt: string | null;
};

export type EmailSettingsPatch = {
  enabled?: boolean;
  categories?: Record<string, boolean>;
};

export function fetchEmailSettings(): Promise<EmailSettings> {
  return api.get<EmailSettings>("/admin/email-settings");
}

export function updateEmailSettings(patch: EmailSettingsPatch): Promise<EmailSettings> {
  return api.patch<EmailSettings>("/admin/email-settings", patch);
}
