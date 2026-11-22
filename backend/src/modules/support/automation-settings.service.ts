import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import type { User } from "../users/entities/user.entity";
import { UpdateAutomationSettingsDto } from "./dto/automation-settings.dto";
import { PlatformSetting } from "./entities/platform-setting.entity";

export const AUTOMATION_SETTINGS_KEY = "automation";

/**
 * - `manual_all`: mọi chiến dịch phải được admin bấm duyệt trước khi công khai; duyệt tự động chỉ
 *   chấm điểm và xếp hàng đợi (mặc định).
 * - `auto_low_risk`: hồ sơ qua đủ các bước kiểm tra và rủi ro thấp được tự phát hành; còn lại chờ admin.
 */
export type CampaignReviewMode = "manual_all" | "auto_low_risk";

/** Hoàn tiền tự động không có cấu hình: luôn chạy cho dự án không đạt mục tiêu (xem `FinanceService.tryAutoRefund`). */
export type AutomationSettings = {
  campaignReviewMode: CampaignReviewMode;
  updatedAt: string | null;
};

export const DEFAULT_AUTOMATION: Omit<AutomationSettings, "updatedAt"> = {
  campaignReviewMode: "manual_all",
};

@Injectable()
export class AutomationSettingsService {
  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settingRepo: Repository<PlatformSetting>,
    private readonly auditService: AuditService,
  ) {}

  async get(): Promise<AutomationSettings> {
    const row = await this.settingRepo.findOne({ where: { key: AUTOMATION_SETTINGS_KEY } });
    return { ...this.parse(row?.value), updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null };
  }

  async update(dto: UpdateAutomationSettingsDto, admin: User): Promise<AutomationSettings> {
    const row = await this.settingRepo.findOne({ where: { key: AUTOMATION_SETTINGS_KEY } });
    const current = this.parse(row?.value);
    const next = {
      campaignReviewMode: dto.campaignReviewMode ?? current.campaignReviewMode,
    };
    const saved = await this.settingRepo.save({
      key: AUTOMATION_SETTINGS_KEY,
      value: JSON.stringify(next),
      updatedBy: admin.id,
    });
    await this.auditService.record({
      userId: admin.id,
      action: "admin.automation.update",
      entity: "platform_setting",
      entityId: AUTOMATION_SETTINGS_KEY,
      oldValues: current,
      newValues: next,
    });
    return { ...next, updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : new Date().toISOString() };
  }

  /** Giá trị hỏng/thiếu rơi về mặc định an toàn (duyệt thủ công). */
  private parse(value: string | undefined): Omit<AutomationSettings, "updatedAt"> {
    if (!value) return { ...DEFAULT_AUTOMATION };
    try {
      const raw = JSON.parse(value) as Partial<Record<keyof AutomationSettings, unknown>>;
      return { campaignReviewMode: raw.campaignReviewMode === "auto_low_risk" ? "auto_low_risk" : "manual_all" };
    } catch {
      return { ...DEFAULT_AUTOMATION };
    }
  }
}
