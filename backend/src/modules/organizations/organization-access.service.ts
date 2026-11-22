import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import type { Campaign } from "../campaigns/entities/campaign.entity";
import { User, UserRole } from "../users/entities/user.entity";
import { MemberStatus, OrganizationMember, OrgPermission, PERMISSION_COLUMN } from "./entities/organization-member.entity";
import { Organization, OrganizationStatus } from "./entities/organization.entity";

/**
 * Kiểm tra quyền dùng chung cho mọi module quản lý chiến dịch. Chủ chiến dịch và admin
 * luôn được phép. Ngoài ra, với chiến dịch của một tổ chức (không bị tạm ngưng) do chính
 * người đại diện tạo, cộng tác viên đang hoạt động có quyền nào thì làm được việc đó.
 * Cộng tác viên không tự tạo chiến dịch cho tổ chức (xem `assertCanReceiveCampaigns`);
 * chiến dịch người khác tạo để gây quỹ cho tổ chức chỉ thuộc về người tạo.
 */
@Injectable()
export class OrganizationAccessService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
  ) {}

  async canOnCampaign(
    campaign: Pick<Campaign, "ownerId" | "organizationId">,
    user: Pick<User, "id" | "role">,
    permission: OrgPermission,
  ): Promise<boolean> {
    if (campaign.ownerId === user.id || user.role === UserRole.ADMIN) return true;
    if (!campaign.organizationId) return false;
    const organization = await this.organizationRepo.findOneBy({ id: campaign.organizationId });
    if (!organization || organization.status === OrganizationStatus.SUSPENDED) return false;
    // Chỉ chiến dịch người đại diện tạo mới là chiến dịch chung của đội ngũ.
    if (organization.representativeId !== campaign.ownerId) return false;
    const member = await this.activeMember(organization.id, user.id);
    return !!member && member[PERMISSION_COLUMN[permission]] === true;
  }

  async assertCanOnCampaign(
    campaign: Pick<Campaign, "ownerId" | "organizationId">,
    user: Pick<User, "id" | "role">,
    permission: OrgPermission,
    message = "Bạn không có quyền thực hiện thao tác này trên chiến dịch.",
  ): Promise<void> {
    if (!(await this.canOnCampaign(campaign, user, permission))) {
      throw new ForbiddenException(message);
    }
  }

  /** Người đại diện, hoặc cộng tác viên đang hoạt động có quyền sửa hồ sơ. */
  async canEditProfile(organization: Organization, user: Pick<User, "id">): Promise<"representative" | "collaborator" | null> {
    if (organization.representativeId === user.id) return "representative";
    const member = await this.activeMember(organization.id, user.id);
    return member?.canEditProfile ? "collaborator" : null;
  }

  activeMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    return this.memberRepo.findOne({ where: { organizationId, userId, status: MemberStatus.ACTIVE } });
  }

  /** Đang là cộng tác viên hoặc có lời mời chờ nhận của tổ chức. */
  isMemberOrInvited(organizationId: string, userId: string): Promise<boolean> {
    return this.memberRepo.exists({ where: { organizationId, userId } });
  }
}
