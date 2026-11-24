import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { User, UserRole, UserStatus } from "../users/entities/user.entity";
import {
  CollaborationView,
  InviteMemberDto,
  MemberPermissions,
  MemberPermissionsDto,
  MemberView,
  TeamMemberView,
  UpdateMemberDto,
} from "./dto/organization-member.dto";
import { MemberStatus, OrganizationMember } from "./entities/organization-member.entity";
import { Organization, OrganizationStatus } from "./entities/organization.entity";

/** Trần số cộng tác viên (kể cả lời mời đang chờ) mỗi tổ chức. */
export const MAX_MEMBERS_PER_ORGANIZATION = 20;

function permissionsOf(member: OrganizationMember): MemberPermissions {
  return {
    editProfile: member.canEditProfile,
    postUpdates: member.canPostUpdates,
    reportProgress: member.canReportProgress,
    manageRewards: member.canManageRewards,
  };
}

function applyPermissions(member: Partial<OrganizationMember>, permissions: MemberPermissionsDto, defaults: boolean): void {
  const pick = (value: boolean | undefined, current: boolean | undefined) => value ?? (defaults ? false : current ?? false);
  member.canEditProfile = pick(permissions.editProfile, member.canEditProfile);
  member.canPostUpdates = pick(permissions.postUpdates, member.canPostUpdates);
  member.canReportProgress = pick(permissions.reportProgress, member.canReportProgress);
  member.canManageRewards = pick(permissions.manageRewards, member.canManageRewards);
}

/**
 * Cộng tác viên của tổ chức. Chỉ người đại diện mời/sửa quyền/gỡ; người được mời tự
 * chấp nhận hoặc từ chối; cộng tác viên tự rời được. Mọi thay đổi đều ghi audit.
 */
@Injectable()
export class OrganizationMembersService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Người đại diện và cộng tác viên đang hoạt động xem danh sách (kèm lời mời chờ). */
  async list(organizationId: string, user: User): Promise<MemberView[]> {
    const organization = await this.getOrganization(organizationId);
    const isRepresentative = organization.representativeId === user.id;
    if (!isRepresentative && user.role !== UserRole.ADMIN) {
      const member = await this.memberRepo.findOne({ where: { organizationId, userId: user.id, status: MemberStatus.ACTIVE } });
      if (!member) throw new ForbiddenException("Chỉ đội ngũ tổ chức xem được danh sách cộng tác viên.");
    }
    const members = await this.memberRepo.find({
      where: { organizationId },
      relations: { user: true },
      order: { createdAt: "ASC" },
    });
    return members.map((member) => this.toView(member));
  }

  async invite(organizationId: string, dto: InviteMemberDto, user: User): Promise<MemberView> {
    const organization = await this.getOrganization(organizationId);
    this.assertRepresentative(organization, user);
    if (organization.status === OrganizationStatus.REJECTED || organization.status === OrganizationStatus.SUSPENDED) {
      throw new ConflictException("Tổ chức đang bị từ chối hoặc tạm ngưng nên chưa mời cộng tác viên được.");
    }
    const invitee = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!invitee || invitee.status !== UserStatus.ACTIVE || invitee.role === UserRole.ADMIN) {
      throw new NotFoundException("Không tìm thấy tài khoản Góp Mầm đang hoạt động với email này.");
    }
    if (invitee.id === organization.representativeId) {
      throw new BadRequestException("Người đại diện đã có mọi quyền của tổ chức.");
    }
    if (await this.memberRepo.exists({ where: { organizationId, userId: invitee.id } })) {
      throw new ConflictException("Người này đã là cộng tác viên hoặc đang có lời mời chờ chấp nhận.");
    }
    if ((await this.memberRepo.count({ where: { organizationId } })) >= MAX_MEMBERS_PER_ORGANIZATION) {
      throw new ConflictException(`Mỗi tổ chức tối đa ${MAX_MEMBERS_PER_ORGANIZATION} cộng tác viên.`);
    }

    const member = this.memberRepo.create({
      organizationId,
      userId: invitee.id,
      invitedBy: user.id,
      title: dto.title,
      status: MemberStatus.PENDING,
      acceptedAt: null,
    });
    applyPermissions(member, dto.permissions, true);
    const saved = await this.memberRepo.save(member);
    saved.user = invitee;
    await this.auditService.record({
      userId: user.id,
      action: "organization.member.invite",
      entity: "organization",
      entityId: organizationId,
      newValues: { memberId: saved.id, userId: invitee.id, title: saved.title, permissions: permissionsOf(saved) },
    });
    await this.notificationsService
      .notify({
        userId: invitee.id,
        type: NotificationType.SYSTEM,
        title: "Lời mời cộng tác tổ chức",
        message: `${user.name} mời bạn làm cộng tác viên "${saved.title}" của tổ chức "${organization.name}". Mở trang Tổ chức của tôi để chấp nhận hoặc từ chối.`,
        link: "/to-chuc/cua-toi#loi-moi",
        relatedId: saved.id,
        email: true,
        emailCategory: "organizations",
        emailSubject: `${user.name} mời bạn cộng tác với tổ chức ${organization.name}`,
      })
      .catch(() => undefined);
    return this.toView(saved);
  }

  async update(organizationId: string, memberId: string, dto: UpdateMemberDto, user: User): Promise<MemberView> {
    const organization = await this.getOrganization(organizationId);
    this.assertRepresentative(organization, user);
    const member = await this.getMember(organizationId, memberId);
    const before = { title: member.title, permissions: permissionsOf(member) };
    if (dto.title !== undefined) member.title = dto.title;
    if (dto.permissions) applyPermissions(member, dto.permissions, false);
    const saved = await this.memberRepo.save(member);
    await this.auditService.record({
      userId: user.id,
      action: "organization.member.update",
      entity: "organization",
      entityId: organizationId,
      oldValues: { memberId, ...before },
      newValues: { memberId, title: saved.title, permissions: permissionsOf(saved) },
    });
    return this.toView(saved);
  }

  /** Người đại diện gỡ cộng tác viên (hoặc thu hồi lời mời), hoặc cộng tác viên tự rời. */
  async remove(organizationId: string, memberId: string, user: User): Promise<void> {
    const organization = await this.getOrganization(organizationId);
    const member = await this.getMember(organizationId, memberId);
    const self = member.userId === user.id;
    if (!self) this.assertRepresentative(organization, user);
    await this.memberRepo.delete({ id: member.id });
    await this.auditService.record({
      userId: user.id,
      action: self ? "organization.member.leave" : "organization.member.remove",
      entity: "organization",
      entityId: organizationId,
      oldValues: { memberId, userId: member.userId, title: member.title, status: member.status },
    });
    const notifyUserId = self ? organization.representativeId : member.userId;
    const revokedInvite = !self && member.status === MemberStatus.PENDING;
    await this.notificationsService
      .notify({
        userId: notifyUserId,
        type: NotificationType.SYSTEM,
        title: self
          ? "Cộng tác viên đã rời tổ chức"
          : revokedInvite
            ? "Lời mời cộng tác đã bị thu hồi"
            : "Bạn không còn là cộng tác viên",
        message: self
          ? `${user.name} đã rời vị trí "${member.title}" của tổ chức "${organization.name}".`
          : revokedInvite
            ? `Người đại diện tổ chức "${organization.name}" đã thu hồi lời mời bạn làm cộng tác viên "${member.title}".`
            : `Người đại diện tổ chức "${organization.name}" đã gỡ bạn khỏi vị trí cộng tác viên "${member.title}". Bạn không còn quyền với tổ chức và các chiến dịch của tổ chức.`,
        link: "/to-chuc/cua-toi",
        relatedId: organizationId,
        // Mất quyền (hoặc mất một thành viên đội ngũ) là thay đổi quan trọng nên báo cả qua email.
        email: true,
        emailCategory: "organizations",
        emailSubject: self
          ? `${user.name} đã rời tổ chức ${organization.name}`
          : revokedInvite
            ? `Lời mời cộng tác từ tổ chức ${organization.name} đã bị thu hồi`
            : `Bạn không còn là cộng tác viên của tổ chức ${organization.name}`,
      })
      .catch(() => undefined);
  }

  async accept(memberId: string, user: User): Promise<CollaborationView> {
    const member = await this.getOwnInvitation(memberId, user);
    const updated = await this.memberRepo.update(
      { id: member.id, status: MemberStatus.PENDING },
      { status: MemberStatus.ACTIVE, acceptedAt: new Date() },
    );
    if (!updated.affected) throw new ConflictException("Lời mời đã được xử lý.");
    const organization = await this.getOrganization(member.organizationId);
    await this.auditService.record({
      userId: user.id,
      action: "organization.member.accept",
      entity: "organization",
      entityId: organization.id,
      newValues: { memberId },
    });
    await this.notificationsService
      .notify({
        userId: organization.representativeId,
        type: NotificationType.SYSTEM,
        title: "Cộng tác viên đã nhận lời",
        message: `${user.name} đã nhận lời làm "${member.title}" của tổ chức "${organization.name}".`,
        link: "/to-chuc/cua-toi",
        relatedId: organization.id,
      })
      .catch(() => undefined);
    const [view] = await this.collaborationsOf(user, [member.id]);
    return view;
  }

  async decline(memberId: string, user: User): Promise<void> {
    const member = await this.getOwnInvitation(memberId, user);
    await this.memberRepo.delete({ id: member.id, status: MemberStatus.PENDING });
    const organization = await this.getOrganization(member.organizationId);
    await this.auditService.record({
      userId: user.id,
      action: "organization.member.decline",
      entity: "organization",
      entityId: organization.id,
      oldValues: { memberId },
    });
    await this.notificationsService
      .notify({
        userId: organization.representativeId,
        type: NotificationType.SYSTEM,
        title: "Lời mời cộng tác bị từ chối",
        message: `${user.name} đã từ chối lời mời làm "${member.title}" của tổ chức "${organization.name}".`,
        link: "/to-chuc/cua-toi",
        relatedId: organization.id,
      })
      .catch(() => undefined);
  }

  /** Lời mời đang chờ và tổ chức mình đang cộng tác, kèm chiến dịch được thao tác. */
  async myCollaborations(user: User): Promise<CollaborationView[]> {
    return this.collaborationsOf(user);
  }

  /** Đội ngũ công khai: người đại diện (chức danh trong hồ sơ) rồi cộng tác viên đã nhận lời. */
  async publicTeam(slugOrId: string): Promise<TeamMemberView[]> {
    const organization = await this.organizationRepo.findOne({
      where: [
        { slug: slugOrId, status: OrganizationStatus.VERIFIED },
        { id: slugOrId, status: OrganizationStatus.VERIFIED },
      ],
    });
    if (!organization) throw new NotFoundException("Organization not found");
    const [representative, members] = await Promise.all([
      this.userRepo.findOne({ where: { id: organization.representativeId } }),
      this.memberRepo.find({
        where: { organizationId: organization.id, status: MemberStatus.ACTIVE },
        relations: { user: true },
        order: { acceptedAt: "ASC" },
      }),
    ]);
    return [
      ...(representative
        ? [{ name: representative.name, avatar: representative.avatar ?? null, title: organization.representativeTitle, role: "representative" as const }]
        : []),
      ...members
        .filter((member) => member.user)
        .map((member) => ({ name: member.user!.name, avatar: member.user!.avatar ?? null, title: member.title, role: "collaborator" as const })),
    ];
  }

  private async collaborationsOf(user: User, onlyIds?: string[]): Promise<CollaborationView[]> {
    const members = await this.memberRepo.find({
      where: { userId: user.id, ...(onlyIds ? { id: In(onlyIds) } : {}) },
      relations: { organization: true },
      order: { createdAt: "DESC" },
    });
    const active = members.filter((m) => m.status === MemberStatus.ACTIVE && m.organization);
    // Chiến dịch chung của tổ chức: do người đại diện tạo (cộng tác viên không tự tạo được).
    const campaignsByOrg = new Map<string, Campaign[]>();
    if (active.length > 0) {
      const orgIds = active.map((m) => m.organizationId);
      const campaigns = await this.campaignRepo.find({
        where: { organizationId: In(orgIds) },
        order: { createdAt: "DESC" },
      });
      for (const campaign of campaigns) {
        const org = active.find((m) => m.organizationId === campaign.organizationId)?.organization;
        if (campaign.ownerId !== org?.representativeId || !campaign.organizationId) continue;
        const list = campaignsByOrg.get(campaign.organizationId) ?? [];
        list.push(campaign);
        campaignsByOrg.set(campaign.organizationId, list);
      }
    }
    return members
      .filter((member) => member.organization)
      .map((member) => ({
        memberId: member.id,
        status: member.status,
        title: member.title,
        permissions: permissionsOf(member),
        organization: {
          id: member.organization!.id,
          slug: member.organization!.slug,
          name: member.organization!.name,
          logoUrl: member.organization!.logoUrl ?? null,
          status: member.organization!.status,
        },
        campaigns:
          member.status === MemberStatus.ACTIVE && member.organization!.status !== OrganizationStatus.SUSPENDED
            ? (campaignsByOrg.get(member.organizationId) ?? []).map((c) => ({
                id: c.id,
                title: c.title,
                status: c.status,
                organizationId: c.organizationId ?? null,
              }))
            : [],
      }));
  }

  private toView(member: OrganizationMember): MemberView {
    return {
      id: member.id,
      organizationId: member.organizationId,
      user: {
        id: member.userId,
        name: member.user?.name ?? "",
        email: member.user?.email ?? "",
        avatar: member.user?.avatar ?? null,
      },
      title: member.title,
      status: member.status,
      permissions: permissionsOf(member),
      invitedAt: member.createdAt,
      acceptedAt: member.acceptedAt ?? null,
    };
  }

  private assertRepresentative(organization: Organization, user: User): void {
    if (organization.representativeId !== user.id) {
      throw new ForbiddenException("Chỉ người đại diện được quản lý cộng tác viên.");
    }
  }

  private async getOrganization(id: string): Promise<Organization> {
    const organization = await this.organizationRepo.findOneBy({ id });
    if (!organization) throw new NotFoundException("Organization not found");
    return organization;
  }

  private async getMember(organizationId: string, memberId: string): Promise<OrganizationMember> {
    const member = await this.memberRepo.findOne({ where: { id: memberId, organizationId }, relations: { user: true } });
    if (!member) throw new NotFoundException("Không tìm thấy cộng tác viên.");
    return member;
  }

  private async getOwnInvitation(memberId: string, user: User): Promise<OrganizationMember> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member || member.userId !== user.id) throw new NotFoundException("Không tìm thấy lời mời.");
    if (member.status !== MemberStatus.PENDING) throw new ConflictException("Lời mời đã được xử lý.");
    return member;
  }
}
