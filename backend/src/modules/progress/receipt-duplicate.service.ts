import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";

import {
  RiskAlert,
  RiskAlertLevel,
  RiskAlertStatus,
  RiskEntityType,
  RiskMethod,
  type RiskReason,
} from "../admin/entities/risk-alert.entity";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { MediaFile } from "../media/entities/media-file.entity";
import { NEAR_DUPLICATE_MAX_RATIO, perceptualDistance } from "../media/image-fingerprint";
import { MilestoneUpdateAttachment } from "./entities/milestone-update-attachment.entity";
import { MilestoneUpdate } from "./entities/milestone-update.entity";
import { Milestone } from "./entities/milestone.entity";

const DUPLICATE_MESSAGE = "Ảnh chứng từ này đã được dùng cho một báo cáo khác.";
const NEAR_DUPLICATE_WEIGHT = 0.5;

/** Chứng từ đã gắn vào báo cáo, kèm chiến dịch để admin biết trùng với đâu. */
export type AttachedReceipt = {
  url: string;
  contentHash: string;
  perceptualHash: string | null;
  campaignTitle: string;
};

export type NearDuplicate = {
  url: string;
  matched: AttachedReceipt;
};

@Injectable()
export class ReceiptDuplicateService {
  constructor(
    @InjectRepository(MediaFile)
    private readonly mediaRepo: Repository<MediaFile>,
    @InjectRepository(MilestoneUpdateAttachment)
    private readonly attachmentRepo: Repository<MilestoneUpdateAttachment>,
    @InjectRepository(RiskAlert)
    private readonly riskAlertRepo: Repository<RiskAlert>,
  ) {}

  /** Chặn ảnh trùng y hệt; ảnh gần trùng được trả về để cảnh báo, người duyệt quyết định. */
  async check(receipts: Pick<MilestoneUpdateAttachment, "mediaFileId" | "url">[]): Promise<NearDuplicate[]> {
    if (receipts.length === 0) return [];
    const urlById = new Map(receipts.map((receipt) => [receipt.mediaFileId, receipt.url]));
    const files = await this.mediaRepo.find({
      where: { id: In([...urlById.keys()]), contentHash: Not(IsNull()) },
    });
    if (files.length === 0) return [];

    const contentHashes = files.map((file) => file.contentHash);
    if (new Set(contentHashes).size !== contentHashes.length) {
      throw new ConflictException("Một ảnh chứng từ được đính kèm nhiều lần trong báo cáo này.");
    }

    const attached = await this.attachedReceipts();
    const nearDuplicates: NearDuplicate[] = [];
    for (const file of files) {
      if (attached.some((receipt) => receipt.contentHash === file.contentHash)) {
        throw new ConflictException(DUPLICATE_MESSAGE);
      }
      const matched = this.closestMatch(file, attached);
      if (matched) nearDuplicates.push({ url: urlById.get(file.id) ?? "", matched });
    }
    return nearDuplicates;
  }

  /** Mỗi chiến dịch có một cảnh báo chứng từ đang mở; ảnh mới được gộp vào cảnh báo đó. */
  async flag(campaign: Campaign, nearDuplicates: NearDuplicate[]): Promise<void> {
    if (nearDuplicates.length === 0) return;
    const reasons: RiskReason[] = nearDuplicates.map(({ url, matched }) => ({
      group: "receipt",
      label: `Ảnh chứng từ gần giống ảnh đã dùng ở chiến dịch "${matched.campaignTitle}"`,
      weight: NEAR_DUPLICATE_WEIGHT,
      images: { current: url, matched: matched.url },
    }));

    const existing = await this.riskAlertRepo.findOneBy({
      entityType: RiskEntityType.CAMPAIGN,
      entityId: campaign.id,
      method: RiskMethod.RECEIPT,
      status: RiskAlertStatus.OPEN,
    });
    if (existing) {
      existing.reasons = [...existing.reasons, ...reasons];
      existing.evidences = { near_duplicate_receipts: existing.reasons.length };
      await this.riskAlertRepo.save(existing);
      return;
    }
    await this.riskAlertRepo.save(
      this.riskAlertRepo.create({
        entityType: RiskEntityType.CAMPAIGN,
        entityId: campaign.id,
        entityName: campaign.title,
        level: RiskAlertLevel.MEDIUM,
        score: NEAR_DUPLICATE_WEIGHT,
        method: RiskMethod.RECEIPT,
        reasons,
        evidences: { near_duplicate_receipts: reasons.length },
      }),
    );
  }

  private closestMatch(file: MediaFile, attached: AttachedReceipt[]): AttachedReceipt | null {
    if (!file.perceptualHash) return null;
    let closest: AttachedReceipt | null = null;
    let closestDistance = NEAR_DUPLICATE_MAX_RATIO;
    for (const receipt of attached) {
      if (!receipt.perceptualHash) continue;
      const distance = perceptualDistance(file.perceptualHash, receipt.perceptualHash);
      if (distance <= closestDistance) {
        closest = receipt;
        closestDistance = distance;
      }
    }
    return closest;
  }

  /** Chứng từ của mọi chiến dịch: gian lận thường dùng lại hóa đơn giữa các chiến dịch. */
  protected attachedReceipts(): Promise<AttachedReceipt[]> {
    return this.attachmentRepo
      .createQueryBuilder("attachment")
      .innerJoin(MediaFile, "media", "media.id = attachment.mediaFileId")
      .innerJoin(MilestoneUpdate, "update_", "update_.id = attachment.milestoneUpdateId")
      .innerJoin(Milestone, "milestone", "milestone.id = update_.milestoneId")
      .innerJoin(Campaign, "campaign", "campaign.id = milestone.campaignId")
      .where("media.contentHash IS NOT NULL")
      .select("attachment.url", "url")
      .addSelect("media.contentHash", "contentHash")
      .addSelect("media.perceptualHash", "perceptualHash")
      .addSelect("campaign.title", "campaignTitle")
      .getRawMany<AttachedReceipt>();
  }
}
