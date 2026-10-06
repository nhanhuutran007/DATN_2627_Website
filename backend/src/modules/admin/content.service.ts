import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import type { User } from "../users/entities/user.entity";

/** Trang chủ hiển thị 3 dự án nổi bật; cho chọn dư để xoay vòng. */
export const MAX_FEATURED = 6;

/** Chỉ chiến dịch đang hiển thị công khai mới được chọn nổi bật. */
const FEATURABLE_STATUSES = [CampaignStatus.APPROVED, CampaignStatus.ACTIVE, CampaignStatus.SUCCESS];

/** Quản trị nội dung trang chủ: chọn/bỏ dự án nổi bật (có audit). */
@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly auditService: AuditService,
  ) {}

  async setFeatured(campaignId: string, featured: boolean, admin: User): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOneBy({ id: campaignId });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    if (campaign.isFeatured === featured) {
      return campaign;
    }
    if (featured) {
      if (!FEATURABLE_STATUSES.includes(campaign.status)) {
        throw new BadRequestException("Chỉ chọn nổi bật cho chiến dịch đã duyệt, đang gây quỹ hoặc đã thành công.");
      }
      const current = await this.campaignRepo.count({ where: { isFeatured: true } });
      if (current >= MAX_FEATURED) {
        throw new ConflictException(`Tối đa ${MAX_FEATURED} dự án nổi bật; hãy bỏ chọn một dự án trước.`);
      }
    }

    campaign.isFeatured = featured;
    campaign.featuredAt = featured ? new Date() : null;
    const saved = await this.campaignRepo.save(campaign);
    await this.auditService.record({
      userId: admin.id,
      action: featured ? "campaign.feature" : "campaign.unfeature",
      entity: "campaign",
      entityId: saved.id,
      oldValues: { isFeatured: !featured },
      newValues: { isFeatured: featured },
    });
    return saved;
  }
}
