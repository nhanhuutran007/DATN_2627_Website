import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import type { User } from "../users/entities/user.entity";
import { SupportContact, UpdateSupportContactDto } from "./dto/support-contact.dto";
import { PlatformSetting } from "./entities/platform-setting.entity";

export const SUPPORT_CONTACT_KEY = "support_contact";

const FIELDS = ["email", "phone", "address", "workingHours", "socialUrl", "note"] as const;
type Field = (typeof FIELDS)[number];

const EMPTY: Record<Field, string> = { email: "", phone: "", address: "", workingHours: "", socialUrl: "", note: "" };

/**
 * Thông tin liên hệ hỗ trợ của nền tảng (TC_CAMP_016): admin cập nhật trên giao diện, mọi người xem ở
 * /lien-he, header/footer và chính sách quyền riêng tư. Chưa cấu hình thì trả về các trường rỗng.
 */
@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settingRepo: Repository<PlatformSetting>,
    private readonly auditService: AuditService,
  ) {}

  async getContact(): Promise<SupportContact> {
    const row = await this.settingRepo.findOne({ where: { key: SUPPORT_CONTACT_KEY } });
    return { ...this.parse(row?.value), updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null };
  }

  async updateContact(dto: UpdateSupportContactDto, admin: User): Promise<SupportContact> {
    const row = await this.settingRepo.findOne({ where: { key: SUPPORT_CONTACT_KEY } });
    const current = this.parse(row?.value);
    const next = { ...current };
    for (const field of FIELDS) {
      const value = dto[field];
      if (value !== undefined) next[field] = value.trim();
    }
    const saved = await this.settingRepo.save({
      key: SUPPORT_CONTACT_KEY,
      value: JSON.stringify(next),
      updatedBy: admin.id,
    });
    await this.auditService.record({
      userId: admin.id,
      action: "admin.support_contact.update",
      entity: "platform_setting",
      entityId: SUPPORT_CONTACT_KEY,
      oldValues: current,
      newValues: next,
    });
    return { ...next, updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : new Date().toISOString() };
  }

  /** Giá trị hỏng hoặc thiếu trường không làm vỡ trang công khai: rơi về chuỗi rỗng. */
  private parse(value: string | undefined): Record<Field, string> {
    if (!value) return { ...EMPTY };
    try {
      const raw = JSON.parse(value) as Partial<Record<Field, unknown>>;
      const result = { ...EMPTY };
      for (const field of FIELDS) {
        if (typeof raw[field] === "string") result[field] = raw[field] as string;
      }
      return result;
    } catch {
      return { ...EMPTY };
    }
  }
}
