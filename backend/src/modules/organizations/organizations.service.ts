import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Like, Not, Repository, type FindOptionsWhere } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import type { User } from "../users/entities/user.entity";
import {
  AdminOrganizationQueryDto,
  CreateOrganizationDto,
  OrganizationQueryDto,
  ReviewOrganizationDto,
  UpdateOrganizationDto,
} from "./dto/organization.dto";
import { Organization, OrganizationStatus } from "./entities/organization.entity";

/** Một tài khoản đại diện tối đa chừng này tổ chức (không tính hồ sơ bị từ chối). */
export const MAX_ORGANIZATIONS_PER_USER = 3;

/** Trùng đường dẫn cố định của frontend (`/to-chuc/dang-ky`, `/to-chuc/cua-toi`). */
const RESERVED_SLUGS = ["dang-ky", "cua-toi"];

/** Thông tin pháp lý: khóa sau khi xác minh, muốn đổi phải liên hệ admin. */
const LEGAL_FIELDS = ["name", "type", "registrationNumber", "issuedBy", "documentUrl", "representativeTitle"] as const;

/** Hồ sơ còn "sống" (chặn trùng số giấy phép); hồ sơ bị từ chối không giữ chỗ. */
const ACTIVE_STATUSES = [
  OrganizationStatus.PENDING,
  OrganizationStatus.NEEDS_INFO,
  OrganizationStatus.VERIFIED,
  OrganizationStatus.SUSPENDED,
];

/**
 * Chiến dịch hiện trong danh sách công khai (khớp `PUBLIC_STATUSES` của CampaignsService) — số chiến dịch
 * và tổng đã huy động trên trang tổ chức phải khớp đúng các chiến dịch người xem thấy.
 */
const PUBLISHED_CAMPAIGN_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.SUCCESS,
  CampaignStatus.ENDED,
];

/**
 * Ma trận quyết định của admin: chờ xác minh → xác minh / yêu cầu bổ sung / từ chối;
 * đang chờ bổ sung vẫn xác minh hoặc từ chối được; đã xác minh ⇄ tạm ngưng.
 */
const REVIEW_TRANSITIONS: Record<OrganizationStatus, OrganizationStatus[]> = {
  [OrganizationStatus.PENDING]: [OrganizationStatus.VERIFIED, OrganizationStatus.NEEDS_INFO, OrganizationStatus.REJECTED],
  [OrganizationStatus.NEEDS_INFO]: [OrganizationStatus.VERIFIED, OrganizationStatus.REJECTED],
  [OrganizationStatus.VERIFIED]: [OrganizationStatus.SUSPENDED],
  [OrganizationStatus.SUSPENDED]: [OrganizationStatus.VERIFIED],
  [OrganizationStatus.REJECTED]: [],
};

const REVIEW_MESSAGES: Record<OrganizationStatus, { title: string; message: string } | null> = {
  [OrganizationStatus.VERIFIED]: {
    title: "Tổ chức đã được xác minh",
    message: "Trang tổ chức đã hiển thị công khai và mọi người có thể bắt đầu gây quỹ cho tổ chức của bạn.",
  },
  [OrganizationStatus.NEEDS_INFO]: {
    title: "Hồ sơ tổ chức cần bổ sung",
    message: "Quản trị viên cần thêm thông tin để xác minh tổ chức. Xem ghi chú và cập nhật hồ sơ.",
  },
  [OrganizationStatus.REJECTED]: {
    title: "Hồ sơ tổ chức chưa được chấp nhận",
    message: "Hồ sơ đăng ký tổ chức không đạt yêu cầu xác minh. Xem lý do trong trang tổ chức của bạn.",
  },
  [OrganizationStatus.SUSPENDED]: {
    title: "Tổ chức tạm ngưng nhận gây quỹ",
    message: "Trang tổ chức tạm ẩn và không nhận chiến dịch mới. Xem lý do trong trang tổ chức của bạn.",
  },
  [OrganizationStatus.PENDING]: null,
};

export type OrganizationStats = { campaignCount: number; totalRaised: number };
export type OrganizationWithStats = Organization & OrganizationStats;
export type OrganizationList<T = Organization> = { items: T[]; total: number; limit: number; offset: number };

/** Chuỗi URL từ tên tiếng Việt: "Quỹ Bảo trợ Trẻ em" → "quy-bao-tro-tre-em". */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
  return slug || "to-chuc";
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Danh bạ công khai: chỉ tổ chức đã xác minh, kèm số chiến dịch và tổng đã huy động. */
  async listPublic(query: OrganizationQueryDto): Promise<OrganizationList<OrganizationWithStats>> {
    const limit = query.limit ?? 12;
    const offset = query.offset ?? 0;
    const where: FindOptionsWhere<Organization> = {
      status: OrganizationStatus.VERIFIED,
      ...(query.type ? { type: query.type } : {}),
      ...(query.q ? { name: Like(`%${escapeLike(query.q)}%`) } : {}),
    };
    const [items, total] = await this.organizationRepo.findAndCount({
      where,
      order: { verifiedAt: "DESC", name: "ASC" },
      skip: offset,
      take: limit,
    });
    return { items: await this.withStats(items), total, limit, offset };
  }

  /** Trang tổ chức công khai theo slug (hoặc id); chưa xác minh thì coi như không tồn tại. */
  async findPublic(slugOrId: string): Promise<OrganizationWithStats> {
    const organization = await this.organizationRepo.findOne({
      where: [
        { slug: slugOrId, status: OrganizationStatus.VERIFIED },
        { id: slugOrId, status: OrganizationStatus.VERIFIED },
      ],
    });
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }
    const [withStats] = await this.withStats([organization]);
    return withStats;
  }

  listMine(user: User): Promise<Organization[]> {
    return this.organizationRepo.find({ where: { representativeId: user.id }, order: { createdAt: "DESC" } });
  }

  async create(dto: CreateOrganizationDto, user: User): Promise<Organization> {
    const owned = await this.organizationRepo.count({
      where: { representativeId: user.id, status: Not(OrganizationStatus.REJECTED) },
    });
    if (owned >= MAX_ORGANIZATIONS_PER_USER) {
      throw new ConflictException(`Mỗi tài khoản đại diện tối đa ${MAX_ORGANIZATIONS_PER_USER} tổ chức.`);
    }
    await this.assertRegistrationAvailable(dto.registrationNumber);

    const saved = await this.organizationRepo.save(
      this.organizationRepo.create({
        ...dto,
        slug: await this.uniqueSlug(dto.name),
        category: dto.category || null,
        website: dto.website || null,
        logoUrl: dto.logoUrl || null,
        representativeId: user.id,
        status: OrganizationStatus.PENDING,
        submittedAt: new Date(),
      }),
    );
    await this.auditService.record({
      userId: user.id,
      action: "organization.create",
      entity: "organization",
      entityId: saved.id,
      newValues: { name: saved.name, registrationNumber: saved.registrationNumber, type: saved.type },
    });
    return saved;
  }

  /**
   * Người đại diện sửa hồ sơ. Đã xác minh/tạm ngưng: chỉ sửa thông tin giới thiệu.
   * Đang chờ bổ sung hoặc bị từ chối: lưu là gửi lại hồ sơ (về `pending`) để admin xét tiếp.
   */
  async update(id: string, dto: UpdateOrganizationDto, user: User): Promise<Organization> {
    const organization = await this.findOwned(id, user);
    const locked = organization.status === OrganizationStatus.VERIFIED || organization.status === OrganizationStatus.SUSPENDED;

    const current = organization as unknown as Record<string, unknown>;
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    for (const [field, raw] of Object.entries(dto)) {
      if (raw === undefined) continue;
      const value = raw === "" && ["website", "logoUrl", "category"].includes(field) ? null : raw;
      if (current[field] === value) continue;
      if (locked && (LEGAL_FIELDS as readonly string[]).includes(field)) {
        throw new BadRequestException("Thông tin pháp lý đã được xác minh, vui lòng liên hệ quản trị viên để thay đổi.");
      }
      oldValues[field] = current[field] ?? null;
      newValues[field] = value;
    }
    if (Object.keys(newValues).length === 0) {
      return organization;
    }
    if (newValues.registrationNumber !== undefined) {
      await this.assertRegistrationAvailable(newValues.registrationNumber as string, organization.id);
    }

    Object.assign(organization, newValues);
    if (newValues.name !== undefined && !organization.verifiedAt) {
      organization.slug = await this.uniqueSlug(organization.name, organization.id);
    }
    const resubmitted =
      organization.status === OrganizationStatus.NEEDS_INFO || organization.status === OrganizationStatus.REJECTED;
    if (resubmitted) {
      organization.status = OrganizationStatus.PENDING;
      organization.submittedAt = new Date();
    }
    const saved = await this.organizationRepo.save(organization);
    await this.auditService.record({
      userId: user.id,
      action: resubmitted ? "organization.resubmit" : "organization.update",
      entity: "organization",
      entityId: saved.id,
      oldValues,
      newValues,
    });
    return saved;
  }

  /** Hàng chờ của admin; `open` = đang chờ admin xử lý (cũ nhất trước). */
  async adminList(query: AdminOrganizationQueryDto): Promise<OrganizationList<OrganizationWithStats>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const status = query.status === "open" ? OrganizationStatus.PENDING : query.status;
    const where: FindOptionsWhere<Organization> = {
      ...(status ? { status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.q ? { name: Like(`%${escapeLike(query.q)}%`) } : {}),
    };
    const [items, total] = await this.organizationRepo.findAndCount({
      where,
      relations: { representative: true },
      order: status === OrganizationStatus.PENDING ? { submittedAt: "ASC" } : { submittedAt: "DESC" },
      skip: offset,
      take: limit,
    });
    return { items: await this.withStats(items), total, limit, offset };
  }

  async review(id: string, dto: ReviewOrganizationDto, admin: User): Promise<Organization> {
    const organization = await this.organizationRepo.findOneBy({ id });
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }
    // Xung đột lợi ích: admin không tự xác minh tổ chức mình đại diện.
    if (organization.representativeId === admin.id) {
      throw new ForbiddenException("Admins cannot review their own organizations");
    }
    if (!REVIEW_TRANSITIONS[organization.status].includes(dto.status)) {
      throw new ConflictException(`Cannot move organization from "${organization.status}" to "${dto.status}"`);
    }
    const notes = dto.notes?.trim() ?? "";
    if (dto.status !== OrganizationStatus.VERIFIED && notes.length < 10) {
      throw new BadRequestException("Cần ghi rõ lý do (ít nhất 10 ký tự) để người đại diện biết phải làm gì.");
    }

    const previousStatus = organization.status;
    const now = new Date();
    organization.status = dto.status;
    organization.reviewNotes = notes || null;
    organization.reviewedBy = admin.id;
    organization.reviewedAt = now;
    if (dto.status === OrganizationStatus.VERIFIED && !organization.verifiedAt) {
      organization.verifiedAt = now;
    }
    const saved = await this.organizationRepo.save(organization);
    await this.auditService.record({
      userId: admin.id,
      action: "organization.review",
      entity: "organization",
      entityId: saved.id,
      oldValues: { status: previousStatus },
      newValues: { status: saved.status, notes: notes || null },
    });

    const content = REVIEW_MESSAGES[saved.status];
    if (content) {
      await this.notificationsService.notify({
        userId: saved.representativeId,
        type: NotificationType.SYSTEM,
        title: `${content.title}: ${saved.name}`,
        message: notes ? `${content.message} Ghi chú: ${notes}` : content.message,
        link: saved.status === OrganizationStatus.VERIFIED ? `/to-chuc/${saved.slug}` : "/to-chuc/cua-toi",
        relatedId: saved.id,
        email: true,
      });
    }
    return saved;
  }

  /** Chiến dịch chỉ được gây quỹ cho tổ chức đã xác minh. */
  async assertCanReceiveCampaigns(organizationId: string): Promise<Organization> {
    const organization = await this.organizationRepo.findOneBy({ id: organizationId });
    if (!organization || organization.status !== OrganizationStatus.VERIFIED) {
      throw new BadRequestException("Tổ chức không tồn tại hoặc chưa được xác minh để nhận gây quỹ.");
    }
    return organization;
  }

  private async findOwned(id: string, user: User): Promise<Organization> {
    const organization = await this.organizationRepo.findOneBy({ id });
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }
    if (organization.representativeId !== user.id) {
      throw new ForbiddenException("Only the organization representative can edit it");
    }
    return organization;
  }

  private async assertRegistrationAvailable(registrationNumber: string, exceptId?: string): Promise<void> {
    const existing = await this.organizationRepo.findOne({
      where: { registrationNumber: registrationNumber.trim(), status: In(ACTIVE_STATUSES) },
      select: { id: true },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException("Số giấy phép này đã được một hồ sơ tổ chức khác đăng ký.");
    }
  }

  private async uniqueSlug(name: string, exceptId?: string): Promise<string> {
    const base = slugify(name);
    for (let suffix = 1; suffix < 100; suffix += 1) {
      const candidate = suffix === 1 ? base : `${base}-${suffix}`;
      if (RESERVED_SLUGS.includes(candidate)) continue;
      const taken = await this.organizationRepo.findOne({ where: { slug: candidate }, withDeleted: true, select: { id: true } });
      if (!taken || taken.id === exceptId) return candidate;
    }
    throw new ConflictException("Không tạo được đường dẫn cho tổ chức, vui lòng đổi tên.");
  }

  /** Gắn số chiến dịch đã công khai và tổng tiền đã xác nhận (một truy vấn GROUP BY cho cả trang). */
  private async withStats(items: Organization[]): Promise<OrganizationWithStats[]> {
    if (items.length === 0) return [];
    const rows = await this.campaignRepo
      .createQueryBuilder("c")
      .select("c.organizationId", "organizationId")
      .addSelect("COUNT(*)", "campaignCount")
      .addSelect("COALESCE(SUM(c.currentAmount), 0)", "totalRaised")
      .where("c.organizationId IN (:...ids)", { ids: items.map((item) => item.id) })
      .andWhere("c.status IN (:...statuses)", { statuses: PUBLISHED_CAMPAIGN_STATUSES })
      .groupBy("c.organizationId")
      .getRawMany<{ organizationId: string; campaignCount: string | number; totalRaised: string | number }>();
    const byId = new Map(rows.map((row) => [row.organizationId, row]));
    return items.map((item) => {
      const row = byId.get(item.id);
      return Object.assign(item, {
        campaignCount: Number(row?.campaignCount ?? 0),
        totalRaised: Number(row?.totalRaised ?? 0),
      });
    });
  }
}
