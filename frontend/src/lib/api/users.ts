import { api, getStoredUser, updateStoredUser } from "../api";

/** Hồ sơ của chính người dùng (`GET /users/me`, có email/số điện thoại). */
export type MyProfile = {
  id: string;
  name: string;
  email: string;
  role: "user" | "campaign_owner" | "admin";
  emailVerified: boolean;
  avatar?: string | null;
  bio?: string | null;
  phone?: string | null;
  organization?: string | null;
  createdAt: string;
};

export type ProfileUpdate = {
  name: string;
  avatar: string;
  bio: string;
  phone: string;
  organization: string;
};

export function fetchMyProfile(): Promise<MyProfile> {
  return api.get<MyProfile>("/users/me");
}

/** Lưu hồ sơ; đồng bộ tên hiển thị trong phiên (header dùng tên này). */
export async function updateMyProfile(id: string, update: ProfileUpdate): Promise<MyProfile> {
  const saved = await api.patch<MyProfile>(`/users/${id}`, update);
  const stored = getStoredUser();
  if (stored && stored.id === saved.id && stored.name !== saved.name) {
    updateStoredUser({ ...stored, name: saved.name });
  }
  return saved;
}
