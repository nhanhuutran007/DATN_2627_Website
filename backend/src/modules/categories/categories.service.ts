import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { Campaign } from "../campaigns/entities/campaign.entity";
import type { User } from "../users/entities/user.entity";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import { Category } from "./entities/category.entity";

export type CategoryWithCount = Category & { campaignCount: number };

/** So khớp tên không phân biệt hoa thường/khoảng trắng thừa (chặn trùng kiểu "Y tế" và "y tế "). */
function nameKey(name: string): string {
  return name.trim().toLocaleLowerCase("vi");
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly auditService: AuditService,
  ) {}

  /** Danh mục đang nhận chiến dịch — dùng cho form tạo chiến dịch và bộ lọc. */
  listActive(): Promise<Category[]> {
    return this.categoryRepo.find({ where: { isActive: true }, order: { sortOrder: "ASC", name: "ASC" } });
  }

  /** Toàn bộ danh mục kèm số chiến dịch đang dùng (admin). */
  async listAll(): Promise<CategoryWithCount[]> {
    const [categories, counts] = await Promise.all([
      this.categoryRepo.find({ order: { sortOrder: "ASC", name: "ASC" } }),
      this.campaignRepo
        .createQueryBuilder("c")
        .select("c.category", "category")
        .addSelect("COUNT(*)", "count")
        .groupBy("c.category")
        .getRawMany<{ category: string; count: string | number }>(),
    ]);
    const byName = new Map(counts.map((row) => [row.category, Number(row.count)]));
    return categories.map((category) => Object.assign(category, { campaignCount: byName.get(category.name) ?? 0 }));
  }

  /** Chặn tạo/sửa chiến dịch với lĩnh vực không tồn tại hoặc đã ngừng nhận dự án. */
  async assertUsable(name: string): Promise<void> {
    const category = await this.categoryRepo.findOne({ where: { name: name.trim() } });
    if (!category || !category.isActive) {
      throw new BadRequestException("Lĩnh vực không hợp lệ hoặc đã ngừng nhận chiến dịch mới.");
    }
  }

  async create(dto: CreateCategoryDto, admin: User): Promise<Category> {
    await this.assertUniqueName(dto.name);
    const saved = await this.categoryRepo.save(
      this.categoryRepo.create({
        name: dto.name,
        description: dto.description || null,
        sortOrder: dto.sortOrder ?? (await this.nextSortOrder()),
        isActive: true,
      }),
    );
    await this.auditService.record({
      userId: admin.id,
      action: "category.create",
      entity: "category",
      entityId: saved.id,
      newValues: { name: saved.name, sortOrder: saved.sortOrder },
    });
    return saved;
  }

  /** Đổi tên thì cập nhật luôn `campaigns.category` trong cùng giao dịch. */
  async update(id: string, dto: UpdateCategoryDto, admin: User): Promise<Category> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    const track = (field: keyof UpdateCategoryDto, before: unknown, after: unknown) => {
      if (after === undefined || before === after) return false;
      oldValues[field] = before;
      newValues[field] = after;
      return true;
    };

    const oldName = category.name;
    const renamed = dto.name !== undefined && dto.name !== oldName;
    if (renamed && nameKey(dto.name as string) !== nameKey(oldName)) {
      await this.assertUniqueName(dto.name as string);
    }
    track("name", oldName, dto.name);
    track("description", category.description ?? null, dto.description === undefined ? undefined : dto.description || null);
    track("sortOrder", category.sortOrder, dto.sortOrder);
    track("isActive", category.isActive, dto.isActive);
    if (Object.keys(newValues).length === 0) {
      return category;
    }
    if (dto.isActive === false && category.isActive) {
      const active = await this.categoryRepo.count({ where: { isActive: true } });
      if (active <= 1) {
        throw new ConflictException("Phải còn ít nhất một lĩnh vực đang nhận chiến dịch.");
      }
    }

    Object.assign(category, newValues);
    let movedCampaigns = 0;
    const saved = await this.categoryRepo.manager.transaction(async (manager) => {
      const result = await manager.save(Category, category);
      if (renamed) {
        const update = await manager.update(Campaign, { category: oldName }, { category: category.name });
        movedCampaigns = update.affected ?? 0;
      }
      return result;
    });
    await this.auditService.record({
      userId: admin.id,
      action: "category.update",
      entity: "category",
      entityId: saved.id,
      oldValues,
      newValues: renamed ? { ...newValues, movedCampaigns } : newValues,
    });
    return saved;
  }

  private async assertUniqueName(name: string): Promise<void> {
    const all = await this.categoryRepo.find({ select: { id: true, name: true } });
    if (all.some((category) => nameKey(category.name) === nameKey(name))) {
      throw new ConflictException("Đã có lĩnh vực trùng tên.");
    }
  }

  private async nextSortOrder(): Promise<number> {
    const max = await this.categoryRepo.maximum("sortOrder");
    return (max ?? -1) + 1;
  }
}
