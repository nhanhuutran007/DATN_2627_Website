import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { FindOperator } from "typeorm";

import type { MemberPermissionsDto } from "../src/modules/organizations/dto/organization-member.dto";
import { MemberStatus, OrgPermission } from "../src/modules/organizations/entities/organization-member.entity";
import { OrganizationStatus } from "../src/modules/organizations/entities/organization.entity";
import { OrganizationAccessService } from "../src/modules/organizations/organization-access.service";
import { OrganizationMembersService } from "../src/modules/organizations/organization-members.service";
import { UserRole, UserStatus, type User } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const REP = "00000000-0000-4000-8000-0000000000a1";
const COLLAB = "00000000-0000-4000-8000-0000000000a2";
const OUTSIDER = "00000000-0000-4000-8000-0000000000a3";
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const ORG = "00000000-0000-4000-8000-0000000000f1";

type Row = Record<string, unknown>;

function matchValue(actual: unknown, expected: unknown): boolean {
  if (expected instanceof FindOperator) {
    if (expected.type === "in") return (expected.value as unknown[]).includes(actual);
    throw new Error(`Unsupported operator ${expected.type}`);
  }
  return actual === expected;
}

function matches(row: Row, where: Row | Row[]): boolean {
  const options = Array.isArray(where) ? where : [where];
  return options.some((w) => Object.entries(w).every(([key, value]) => matchValue(row[key], value)));
}

/** Repository giả trong bộ nhớ, đủ cho các truy vấn của hai service. */
function makeRepo<T extends Row>(rows: T[], relations: Record<string, (row: T) => unknown> = {}) {
  let seq = rows.length;
  const withRelations = (row: T, rel?: Record<string, boolean>) => {
    if (!rel) return row;
    const copy = { ...row } as Row;
    for (const [name, on] of Object.entries(rel)) if (on && relations[name]) copy[name] = relations[name](row);
    return copy as T;
  };
  return {
    rows,
    create: (data: Partial<T>) => ({ ...data }) as T,
    save: async (row: T) => {
      if (!row.id) {
        seq += 1;
        Object.assign(row, { id: `row-${seq}`, createdAt: new Date(2026, 10, 20, 0, 0, seq) });
        rows.push(row);
      } else {
        const existing = rows.find((r) => r.id === row.id);
        if (existing) Object.assign(existing, row);
      }
      return row;
    },
    findOne: async ({ where, relations: rel }: { where: Row | Row[]; relations?: Record<string, boolean> }) => {
      const found = rows.find((r) => matches(r, where));
      return found ? withRelations(found, rel) : null;
    },
    findOneBy: async (where: Row) => rows.find((r) => matches(r, where)) ?? null,
    find: async ({ where, relations: rel }: { where: Row | Row[]; relations?: Record<string, boolean> }) =>
      rows.filter((r) => matches(r, where)).map((r) => withRelations(r, rel)),
    exists: async ({ where }: { where: Row }) => rows.some((r) => matches(r, where)),
    count: async ({ where }: { where: Row }) => rows.filter((r) => matches(r, where)).length,
    update: async (where: Row, patch: Partial<T>) => {
      const found = rows.filter((r) => matches(r, where));
      found.forEach((r) => Object.assign(r, patch));
      return { affected: found.length };
    },
    delete: async (where: Row) => {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i -= 1) if (matches(rows[i], where)) rows.splice(i, 1);
      return { affected: before - rows.length };
    },
  };
}

function makeUser(id: string, role = UserRole.USER): User {
  return { id, role, status: UserStatus.ACTIVE, name: `User ${id.slice(-2)}`, email: `${id.slice(-2)}@x.vn` } as User;
}

describe("Cộng tác viên tổ chức", () => {
  let organization: Row;
  let members: ReturnType<typeof makeRepo>;
  let users: ReturnType<typeof makeRepo>;
  let notifier: ReturnType<typeof makeNotifierRecorder>;
  let access: OrganizationAccessService;
  let service: OrganizationMembersService;

  const rep = makeUser(REP);
  const collab = makeUser(COLLAB);
  const outsider = makeUser(OUTSIDER);

  beforeEach(() => {
    organization = {
      id: ORG,
      slug: "quy-sach",
      name: "Quỹ Sách",
      representativeId: REP,
      representativeTitle: "Giám đốc",
      status: OrganizationStatus.VERIFIED,
      logoUrl: null,
    };
    const orgRepo = makeRepo([organization]);
    users = makeRepo([rep, collab, outsider, makeUser(ADMIN, UserRole.ADMIN)] as unknown as Row[]);
    members = makeRepo<Row>([], {
      user: (row) => users.rows.find((u) => u.id === row.userId),
      organization: () => organization,
    });
    const campaigns = makeRepo<Row>([
      { id: "c-rep", title: "Do đại diện tạo", status: "active", ownerId: REP, organizationId: ORG, createdAt: new Date() },
      { id: "c-out", title: "Người ngoài gây quỹ", status: "active", ownerId: OUTSIDER, organizationId: ORG, createdAt: new Date() },
    ]);
    notifier = makeNotifierRecorder();
    access = new OrganizationAccessService(members as never, orgRepo as never);
    service = new OrganizationMembersService(
      members as never,
      orgRepo as never,
      users as never,
      campaigns as never,
      makeAuditRecorder().service,
      notifier.service,
    );
  });

  const invite = (permissions: MemberPermissionsDto = { postUpdates: true }) =>
    service.invite(ORG, { email: "a2@x.vn", title: "Truyền thông", permissions }, rep);

  it("chỉ người đại diện mời được; email lạ hoặc trùng thì báo lỗi", async () => {
    await rejects(service.invite(ORG, { email: "a2@x.vn", title: "TT", permissions: {} }, outsider), ForbiddenException);
    await rejects(service.invite(ORG, { email: "none@x.vn", title: "TT", permissions: {} }, rep), NotFoundException);
    await rejects(service.invite(ORG, { email: "ad@x.vn", title: "TT", permissions: {} }, rep), NotFoundException);
    const view = await invite();
    equal(view.status, "pending");
    deepEqual(view.permissions, { editProfile: false, postUpdates: true, reportProgress: false, manageRewards: false });
    equal(notifier.notified.at(-1)?.userId, COLLAB);
    await rejects(invite(), ConflictException);
  });

  it("lời mời đang chờ chưa có quyền; nhận lời thì có đúng quyền được gán", async () => {
    const view = await invite({ postUpdates: true });
    const campaign = { ownerId: REP, organizationId: ORG };
    equal(await access.canOnCampaign(campaign, collab, OrgPermission.POST_UPDATES), false);

    const accepted = await service.accept(view.id, collab);
    equal(accepted.status, "active");
    deepEqual(accepted.campaigns.map((c) => c.id), ["c-rep"]);
    equal(notifier.notified.at(-1)?.userId, REP);

    equal(await access.canOnCampaign(campaign, collab, OrgPermission.POST_UPDATES), true);
    equal(await access.canOnCampaign(campaign, collab, OrgPermission.MANAGE_REWARDS), false);
    await rejects(service.accept(view.id, collab), ConflictException);
  });

  it("không có quyền trên chiến dịch người ngoài gây quỹ cho tổ chức, kể cả người đại diện", async () => {
    const view = await invite({ postUpdates: true });
    await service.accept(view.id, collab);
    const outsiderCampaign = { ownerId: OUTSIDER, organizationId: ORG };
    equal(await access.canOnCampaign(outsiderCampaign, collab, OrgPermission.POST_UPDATES), false);
    equal(await access.canOnCampaign(outsiderCampaign, rep, OrgPermission.POST_UPDATES), false);
    equal(await access.canOnCampaign(outsiderCampaign, outsider, OrgPermission.POST_UPDATES), true);
    equal(await access.canOnCampaign(outsiderCampaign, makeUser(ADMIN, UserRole.ADMIN), OrgPermission.POST_UPDATES), true);
  });

  it("chiến dịch cộng tác viên tạo không phải chiến dịch chung; tổ chức tạm ngưng thì cộng tác viên mất quyền", async () => {
    const view = await invite({ reportProgress: true });
    await service.accept(view.id, collab);
    const collabCampaign = { ownerId: COLLAB, organizationId: ORG };
    equal(await access.canOnCampaign(collabCampaign, rep, OrgPermission.REPORT_PROGRESS), false);
    equal(await access.canOnCampaign(collabCampaign, collab, OrgPermission.REPORT_PROGRESS), true);

    const repCampaign = { ownerId: REP, organizationId: ORG };
    equal(await access.canOnCampaign(repCampaign, collab, OrgPermission.REPORT_PROGRESS), true);
    organization.status = OrganizationStatus.SUSPENDED;
    equal(await access.canOnCampaign(repCampaign, collab, OrgPermission.REPORT_PROGRESS), false);
    equal(await access.canOnCampaign(repCampaign, rep, OrgPermission.REPORT_PROGRESS), true);
  });

  it("cộng tác viên (kể cả đang chờ nhận lời) không được tạo chiến dịch cho tổ chức", async () => {
    const { OrganizationsService } = await import("../src/modules/organizations/organizations.service");
    const orgService = new OrganizationsService(
      makeRepo([organization]) as never,
      {} as never,
      {} as never,
      makeAuditRecorder().service,
      notifier.service,
      access,
    );
    equal((await orgService.assertCanReceiveCampaigns(ORG, rep)).id, ORG);
    equal((await orgService.assertCanReceiveCampaigns(ORG, outsider)).id, ORG);

    const view = await invite();
    await rejects(orgService.assertCanReceiveCampaigns(ORG, collab), ForbiddenException);
    await service.accept(view.id, collab);
    await rejects(orgService.assertCanReceiveCampaigns(ORG, collab), ForbiddenException);
  });

  it("sửa quyền, từ chối lời mời, gỡ và tự rời", async () => {
    const view = await invite({ postUpdates: true });
    const updated = await service.update(ORG, view.id, { permissions: { manageRewards: true } }, rep);
    deepEqual(updated.permissions, { editProfile: false, postUpdates: true, reportProgress: false, manageRewards: true });
    await rejects(service.update(ORG, view.id, { title: "X" }, collab), ForbiddenException);

    await service.decline(view.id, collab);
    equal(members.rows.length, 0);

    const again = await invite();
    await service.accept(again.id, collab);
    await rejects(service.remove(ORG, again.id, outsider), ForbiddenException);
    await service.remove(ORG, again.id, collab);
    equal(members.rows.length, 0);
    equal(notifier.notified.at(-1)?.userId, REP);
  });

  it("bị gỡ hoặc bị thu hồi lời mời thì được báo kèm email", async () => {
    const view = await invite();
    await service.accept(view.id, collab);
    await service.remove(ORG, view.id, rep);
    const removed = notifier.notified.at(-1);
    equal(removed?.userId, COLLAB);
    equal(removed?.email, true);
    equal(removed?.title, "Bạn không còn là cộng tác viên");

    const pending = await invite();
    await service.remove(ORG, pending.id, rep);
    const revoked = notifier.notified.at(-1);
    equal(revoked?.userId, COLLAB);
    equal(revoked?.email, true);
    equal(revoked?.title, "Lời mời cộng tác đã bị thu hồi");
  });

  it("đội ngũ công khai: người đại diện trước, chỉ cộng tác viên đã nhận lời", async () => {
    const view = await invite();
    let team = await service.publicTeam("quy-sach");
    deepEqual(team.map((m) => m.role), ["representative"]);
    await service.accept(view.id, collab);
    team = await service.publicTeam("quy-sach");
    deepEqual(team.map((m) => [m.role, m.title]), [["representative", "Giám đốc"], ["collaborator", "Truyền thông"]]);
    ok(!("email" in team[1]));
  });

  it("chỉ đội ngũ xem được danh sách cộng tác viên", async () => {
    const view = await invite();
    await rejects(service.list(ORG, collab), ForbiddenException);
    await service.accept(view.id, collab);
    equal((await service.list(ORG, collab)).length, 1);
    equal((await service.list(ORG, rep))[0].status, MemberStatus.ACTIVE);
    await rejects(service.list(ORG, outsider), ForbiddenException);
  });
});
