import { api } from "../api";

export type OrganizationType = "charity_fund" | "ngo" | "social_enterprise" | "education" | "health" | "other";
export type OrganizationStatus = "pending" | "needs_info" | "verified" | "rejected" | "suspended";

export const ORGANIZATION_TYPE_LABEL: Record<OrganizationType, string> = {
  charity_fund: "Quỹ xã hội, quỹ từ thiện",
  ngo: "Tổ chức phi chính phủ, phi lợi nhuận",
  social_enterprise: "Doanh nghiệp xã hội",
  education: "Trường học, cơ sở giáo dục",
  health: "Bệnh viện, cơ sở y tế",
  other: "Tổ chức khác",
};

export const ORGANIZATION_STATUS_LABEL: Record<OrganizationStatus, { label: string; tone: string }> = {
  pending: { label: "Chờ xác minh", tone: "tag-amber" },
  needs_info: { label: "Cần bổ sung", tone: "tag-amber" },
  verified: { label: "Đã xác minh", tone: "tag-green" },
  rejected: { label: "Không được chấp nhận", tone: "tag-red" },
  suspended: { label: "Tạm ngưng", tone: "tag-red" },
};

export type Organization = {
  id: string;
  slug: string;
  name: string;
  type: OrganizationType;
  registrationNumber: string;
  issuedBy: string;
  category?: string | null;
  mission: string;
  website?: string | null;
  email: string;
  phone: string;
  address: string;
  province: string;
  logoUrl?: string | null;
  representativeTitle: string;
  status: OrganizationStatus;
  verifiedAt?: string | null;
  submittedAt: string;
  createdAt: string;
  /** Chỉ có ở API của người đại diện và admin. */
  documentUrl?: string;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  /** Kèm theo ở danh bạ công khai và danh sách admin. */
  campaignCount?: number;
  totalRaised?: number;
  representative?: { id: string; name: string; email?: string } | null;
};

export type OrganizationPayload = {
  name: string;
  type: OrganizationType;
  registrationNumber: string;
  issuedBy: string;
  category?: string;
  mission: string;
  website?: string;
  email: string;
  phone: string;
  address: string;
  province: string;
  logoUrl?: string;
  documentUrl: string;
  representativeTitle: string;
};

export type OrganizationPage = { items: Organization[]; total: number; limit: number; offset: number };

/** Tổ chức đã chọn trong form tạo chiến dịch (đủ để hiển thị lại và gửi `organizationId`). */
export type PickedOrganization = { id: string; slug: string; name: string; logoUrl: string | null; province?: string };

export function toPicked(organization: Organization): PickedOrganization {
  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
    logoUrl: organization.logoUrl ?? null,
    province: organization.province,
  };
}

export type ReviewDecision = "verified" | "needs_info" | "rejected" | "suspended";

export function fetchOrganizations(query: { q?: string; type?: OrganizationType; limit?: number; offset?: number } = {}): Promise<OrganizationPage> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.type) params.set("type", query.type);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  const qs = params.toString();
  return api.get<OrganizationPage>(`/organizations${qs ? `?${qs}` : ""}`);
}

export function fetchOrganization(slug: string): Promise<Organization> {
  return api.get<Organization>(`/organizations/${encodeURIComponent(slug)}`);
}

export function fetchMyOrganizations(): Promise<Organization[]> {
  return api.get<Organization[]>("/organizations/mine");
}

export function createOrganization(payload: OrganizationPayload): Promise<Organization> {
  return api.post<Organization>("/organizations", payload);
}

export function updateOrganization(id: string, payload: Partial<OrganizationPayload>): Promise<Organization> {
  return api.patch<Organization>(`/organizations/${encodeURIComponent(id)}`, payload);
}

export function fetchAdminOrganizations(query: { status?: OrganizationStatus | "open" | ""; q?: string; limit?: number; offset?: number }): Promise<OrganizationPage> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  params.set("limit", String(query.limit ?? 20));
  if (query.offset) params.set("offset", String(query.offset));
  return api.get<OrganizationPage>(`/admin/organizations?${params.toString()}`);
}

export function reviewOrganization(id: string, status: ReviewDecision, notes?: string): Promise<Organization> {
  return api.patch<Organization>(`/admin/organizations/${encodeURIComponent(id)}/review`, { status, notes });
}
