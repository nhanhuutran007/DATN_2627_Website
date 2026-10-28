import { deepEqual, equal, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { NotFoundException } from "@nestjs/common";

import { CampaignsService } from "../src/modules/campaigns/campaigns.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { OrganizationStatus } from "../src/modules/organizations/entities/organization.entity";

const ID = "44444444-4444-4444-8444-444444444444";

function serviceWith(campaign: unknown) {
  const repo = { findOne: async () => campaign };
  return new CampaignsService(repo as any, {} as any, {} as any);
}

const owner = {
  name: "Nguyễn Văn A",
  email: "dang-nhap@example.com",
  phone: "0900000000",
  contactEmail: "lienhe@example.com",
  contactPhone: "",
  contactAddress: "12 Lê Lợi, Huế",
};

const organization = {
  name: "Quỹ Mầm Xanh",
  slug: "quy-mam-xanh",
  email: "quy@example.com",
  phone: "0234 000 000",
  address: "Huế",
  website: null,
  status: OrganizationStatus.VERIFIED,
};

describe("CampaignsService.getContact", () => {
  it("chỉ trả liên hệ công khai, không lộ email đăng nhập hay số điện thoại tài khoản", async () => {
    const contact = await serviceWith({ id: ID, status: CampaignStatus.ACTIVE, owner, organization }).getContact(ID);
    deepEqual(contact.owner, { name: "Nguyễn Văn A", email: "lienhe@example.com", phone: null, address: "12 Lê Lợi, Huế" });
    equal(contact.organization?.slug, "quy-mam-xanh");
  });

  it("ẩn liên hệ tổ chức không còn được xác minh", async () => {
    const contact = await serviceWith({
      id: ID,
      status: CampaignStatus.ACTIVE,
      owner,
      organization: { ...organization, status: OrganizationStatus.SUSPENDED },
    }).getContact(ID);
    equal(contact.organization, null);
  });

  it("chiến dịch chưa công khai thì không trả liên hệ", async () => {
    await rejects(
      serviceWith({ id: ID, status: CampaignStatus.PENDING, owner, organization: null }).getContact(ID),
      NotFoundException,
    );
  });
});
