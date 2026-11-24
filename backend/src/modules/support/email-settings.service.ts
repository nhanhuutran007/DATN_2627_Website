import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import {
  EMAIL_CATEGORIES,
  EMAIL_CATEGORY_GROUPS,
  EMAIL_CATEGORY_KEYS,
  isEmailCategory,
  type EmailCategory,
  type EmailCategoryInfo,
} from "../../integrations/email/email-categories";
import type { EmailPolicy } from "../../integrations/email/policy-email.gateway";
import type { User } from "../users/entities/user.entity";
import { UpdateEmailSettingsDto } from "./dto/email-settings.dto";
import { PlatformSetting } from "./entities/platform-setting.entity";

export const EMAIL_SETTINGS_KEY = "email";

/** Đọc lại cấu hình sau tối đa ngần này (một đợt gửi hàng loạt không truy vấn DB cho mỗi thư). */
const CACHE_MS = 15_000;

type StoredEmailSettings = {
  /** Công tắc tổng: `false` = không gửi email nào. */
  enabled: boolean;
  categories: Record<EmailCategory, boolean>;
};

export type EmailSettings = {
  enabled: boolean;
  categories: Array<EmailCategoryInfo & { enabled: boolean }>;
  groups: typeof EMAIL_CATEGORY_GROUPS;
  updatedAt: string | null;
};

function allOn(): Record<EmailCategory, boolean> {
  return Object.fromEntries(EMAIL_CATEGORY_KEYS.map((key) => [key, true])) as Record<EmailCategory, boolean>;
}

/** Mặc định gửi tất cả (giữ nguyên hành vi trước khi có cài đặt). */
export const DEFAULT_EMAIL_SETTINGS: StoredEmailSettings = { enabled: true, categories: allOn() };

/** Giá trị hỏng/thiếu rơi về mặc định; loại email mới thêm sau này mặc định bật. */
export function parseEmailSettings(value: string | undefined | null): StoredEmailSettings {
  if (!value) return { enabled: true, categories: allOn() };
  try {
    const raw = JSON.parse(value) as { enabled?: unknown; categories?: Record<string, unknown> };
    const categories = allOn();
    for (const key of EMAIL_CATEGORY_KEYS) {
      if (raw.categories?.[key] === false) categories[key] = false;
    }
    return { enabled: raw.enabled !== false, categories };
  } catch {
    return { enabled: true, categories: allOn() };
  }
}

@Injectable()
export class EmailSettingsService implements EmailPolicy {
  private cache: { value: StoredEmailSettings; at: number } | null = null;

  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settingRepo: Repository<PlatformSetting>,
    private readonly auditService: AuditService,
  ) {}

  async isEnabled(category: EmailCategory): Promise<boolean> {
    const settings = await this.load();
    return settings.enabled && settings.categories[category] !== false;
  }

  async get(): Promise<EmailSettings> {
    const row = await this.settingRepo.findOne({ where: { key: EMAIL_SETTINGS_KEY } });
    return this.view(parseEmailSettings(row?.value), row?.updatedAt ?? null);
  }

  async update(dto: UpdateEmailSettingsDto, admin: User): Promise<EmailSettings> {
    const unknown = Object.keys(dto.categories ?? {}).filter((key) => !isEmailCategory(key));
    if (unknown.length > 0) throw new BadRequestException(`Loại email không hợp lệ: ${unknown.join(", ")}`);
    const values = Object.values(dto.categories ?? {});
    if (values.some((v) => typeof v !== "boolean")) throw new BadRequestException("Giá trị bật/tắt phải là true hoặc false.");

    const row = await this.settingRepo.findOne({ where: { key: EMAIL_SETTINGS_KEY } });
    const current = parseEmailSettings(row?.value);
    const next: StoredEmailSettings = {
      enabled: dto.enabled ?? current.enabled,
      categories: { ...current.categories, ...(dto.categories as Partial<Record<EmailCategory, boolean>> | undefined) },
    };
    const saved = await this.settingRepo.save({ key: EMAIL_SETTINGS_KEY, value: JSON.stringify(next), updatedBy: admin.id });
    this.cache = { value: next, at: Date.now() };
    await this.auditService.record({
      userId: admin.id,
      action: "admin.email_settings.update",
      entity: "platform_setting",
      entityId: EMAIL_SETTINGS_KEY,
      oldValues: current,
      newValues: next,
    });
    return this.view(next, saved.updatedAt ?? new Date());
  }

  private async load(): Promise<StoredEmailSettings> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const row = await this.settingRepo.findOne({ where: { key: EMAIL_SETTINGS_KEY } });
    const value = parseEmailSettings(row?.value);
    this.cache = { value, at: Date.now() };
    return value;
  }

  private view(settings: StoredEmailSettings, updatedAt: Date | string | null): EmailSettings {
    return {
      enabled: settings.enabled,
      categories: EMAIL_CATEGORIES.map((c) => ({ ...c, enabled: settings.categories[c.key] })),
      groups: EMAIL_CATEGORY_GROUPS,
      updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
    };
  }
}
