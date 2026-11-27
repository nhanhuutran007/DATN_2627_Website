import { deepEqual, equal, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { CampaignFaqsService } from "../src/modules/campaign-faqs/campaign-faqs.service";
import { CreateCampaignFaqDto } from "../src/modules/campaign-faqs/dto/campaign-faq.dto";
import { CampaignFaq } from "../src/modules/campaign-faqs/entities/campaign-faq.entity";
import type { CampaignsService } from "../src/modules/campaigns/campaigns.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { UserRole } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";
const OWNER = { id: "11111111-1111-4111-8111-111111111111", role: UserRole.CAMPAIGN_OWNER } as any;
const STRANGER = { id: "22222222-2222-4222-8222-222222222222", role: UserRole.USER } as any;

describe("CampaignFaqsService", () => {
  let rows: CampaignFaq[];
  let status: CampaignStatus;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let service: CampaignFaqsService;

  beforeEach(() => {
    rows = [];
    status = CampaignStatus.ACTIVE;
    audit = makeAuditRecorder();
    const repo: any = {
      find: async ({ where }: any) =>
        rows.filter((row) => row.campaignId === where.campaignId).sort((a, b) => a.sortOrder - b.sortOrder),
      findOne: async ({ where }: any) => rows.find((row) => row.id === where.id) ?? null,
      count: async ({ where }: any) => rows.filter((row) => row.campaignId === where.campaignId).length,
      create: (data: any) => Object.assign(new CampaignFaq(), data),
      save: async (row: any) => {
        if (!row.id) {
          row.id = `faq-${rows.length + 1}`;
          row.updatedAt = new Date();
          rows.push(row);
        }
        return row;
      },
      delete: async ({ id }: any) => {
        rows = rows.filter((row) => row.id !== id);
      },
    };
    const campaignsService = {
      findById: async () => ({ id: CAMPAIGN_ID, ownerId: OWNER.id, status }),
    } as unknown as CampaignsService;
    service = new CampaignFaqsService(repo, campaignsService, audit.service);
  });

  it("chủ dự án thêm, sửa, xóa câu hỏi; danh sách công khai theo thứ tự", async () => {
    const first = await service.create(CAMPAIGN_ID, { question: "Khi nào giao quà?", answer: "Tháng 3 năm sau." }, OWNER);
    await service.create(CAMPAIGN_ID, { question: "Có giao ra nước ngoài?", answer: "Hiện chỉ giao trong nước." }, OWNER);
    deepEqual(
      (await service.listPublic(CAMPAIGN_ID)).map((faq) => faq.question),
      ["Khi nào giao quà?", "Có giao ra nước ngoài?"],
    );
    const updated = await service.update(first.id, { answer: "Dự kiến tháng 4 năm sau." }, OWNER);
    equal(updated.answer, "Dự kiến tháng 4 năm sau.");
    await service.remove(first.id, OWNER);
    equal((await service.listPublic(CAMPAIGN_ID)).length, 1);
    deepEqual(
      audit.entries.map((entry) => entry.action),
      ["campaign_faq.create", "campaign_faq.create", "campaign_faq.update", "campaign_faq.delete"],
    );
  });

  it("người khác không sửa được; dự án đã kết thúc thì khóa", async () => {
    await rejects(service.create(CAMPAIGN_ID, { question: "Câu hỏi?", answer: "Trả lời." }, STRANGER), ForbiddenException);
    status = CampaignStatus.SUCCESS;
    await rejects(service.create(CAMPAIGN_ID, { question: "Câu hỏi?", answer: "Trả lời." }, OWNER), ConflictException);
  });

  it("bản nháp chưa công khai: chỉ người quản lý xem được", async () => {
    status = CampaignStatus.DRAFT;
    await service.create(CAMPAIGN_ID, { question: "Câu hỏi nháp?", answer: "Trả lời nháp." }, OWNER);
    await rejects(service.listPublic(CAMPAIGN_ID), NotFoundException);
    equal((await service.listForManage(CAMPAIGN_ID, OWNER)).length, 1);
  });

  it("kiểm tra độ dài câu hỏi và câu trả lời", async () => {
    const errors = await validate(plainToInstance(CreateCampaignFaqDto, { question: "  Hi ", answer: "ok" }));
    deepEqual(errors.map((error) => error.property).sort(), ["answer", "question"]);
  });
});
