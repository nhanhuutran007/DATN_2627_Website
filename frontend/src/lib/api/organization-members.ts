import { api } from "../api";
import type { ApiCampaignStatus } from "./campaigns";

export type MemberPermissions = {
  editProfile: boolean;
  postUpdates: boolean;
  reportProgress: boolean;
  manageRewards: boolean;
};

export type PermissionKey = keyof MemberPermissions;

/** Nhãn và giải thích từng quyền (như bảng quyền cộng tác viên của Kickstarter). */
export const PERMISSIONS: { key: PermissionKey; label: string; hint: string }[] = [
  { key: "editProfile", label: "Sửa hồ sơ tổ chức", hint: "Giới thiệu, logo, liên hệ — không gồm thông tin pháp lý" },
  { key: "postUpdates", label: "Đăng bài cập nhật", hint: "Viết, sửa, xóa bài “Cập nhật #N” trên chiến dịch của tổ chức" },
  { key: "reportProgress", label: "Báo cáo tiến độ & chi tiêu", hint: "Quản lý mốc, đăng báo cáo kèm chứng từ" },
  { key: "manageRewards", label: "Quản lý quà", hint: "Sửa mức quà, xem danh sách người nhận để gửi quà" },
];

export const NO_PERMISSIONS: MemberPermissions = { editProfile: false, postUpdates: false, reportProgress: false, manageRewards: false };

export type OrganizationMember = {
  id: string;
  organizationId: string;
  user: { id: string; name: string; email: string; avatar: string | null };
  title: string;
  status: "pending" | "active";
  permissions: MemberPermissions;
  invitedAt: string;
  acceptedAt: string | null;
};

export type TeamMember = { name: string; avatar: string | null; title: string; role: "representative" | "collaborator" };

export type Collaboration = {
  memberId: string;
  status: "pending" | "active";
  title: string;
  permissions: MemberPermissions;
  organization: { id: string; slug: string; name: string; logoUrl: string | null; status: string };
  campaigns: { id: string; title: string; status: ApiCampaignStatus; organizationId: string | null }[];
};

const membersPath = (organizationId: string) => `/organizations/${encodeURIComponent(organizationId)}/members`;

export function fetchMembers(organizationId: string): Promise<OrganizationMember[]> {
  return api.get<OrganizationMember[]>(membersPath(organizationId));
}

export function inviteMember(
  organizationId: string,
  input: { email: string; title: string; permissions: MemberPermissions },
): Promise<OrganizationMember> {
  return api.post<OrganizationMember>(membersPath(organizationId), input);
}

export function updateMember(
  organizationId: string,
  memberId: string,
  input: { title?: string; permissions?: Partial<MemberPermissions> },
): Promise<OrganizationMember> {
  return api.patch<OrganizationMember>(`${membersPath(organizationId)}/${encodeURIComponent(memberId)}`, input);
}

export function removeMember(organizationId: string, memberId: string): Promise<{ removed: boolean }> {
  return api.del<{ removed: boolean }>(`${membersPath(organizationId)}/${encodeURIComponent(memberId)}`);
}

export function fetchTeam(slug: string): Promise<TeamMember[]> {
  return api.get<TeamMember[]>(`/organizations/${encodeURIComponent(slug)}/team`);
}

export function fetchMyCollaborations(): Promise<Collaboration[]> {
  return api.get<Collaboration[]>("/users/me/organization-collaborations");
}

export function acceptInvitation(memberId: string): Promise<Collaboration> {
  return api.post<Collaboration>(`/organization-invitations/${encodeURIComponent(memberId)}/accept`);
}

export function declineInvitation(memberId: string): Promise<{ declined: boolean }> {
  return api.post<{ declined: boolean }>(`/organization-invitations/${encodeURIComponent(memberId)}/decline`);
}
