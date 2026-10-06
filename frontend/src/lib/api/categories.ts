"use client";

import { useEffect, useState } from "react";

import { api } from "../api";

export type ApiCategory = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type AdminCategory = ApiCategory & { campaignCount: number };

/** Dùng khi chưa tải được danh mục từ server (mất mạng, dữ liệu mẫu). */
export const FALLBACK_CATEGORIES = ["Giáo dục", "Môi trường", "Nông nghiệp", "Y tế", "Khởi nghiệp", "Công nghệ"];

export function fetchCategories(): Promise<ApiCategory[]> {
  return api.get<ApiCategory[]>("/categories");
}

/** Tên các lĩnh vực đang nhận chiến dịch; trả danh sách dự phòng nếu lỗi. */
export function useCategories(): string[] {
  const [names, setNames] = useState<string[]>(FALLBACK_CATEGORIES);
  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((items) => {
        if (active && items.length > 0) setNames(items.map((item) => item.name));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return names;
}

export function fetchAdminCategories(): Promise<AdminCategory[]> {
  return api.get<AdminCategory[]>("/admin/categories");
}

export function createCategory(payload: { name: string; description?: string }): Promise<ApiCategory> {
  return api.post<ApiCategory>("/admin/categories", payload);
}

export function updateCategory(
  id: string,
  payload: Partial<Pick<ApiCategory, "name" | "description" | "sortOrder" | "isActive">>,
): Promise<ApiCategory> {
  return api.patch<ApiCategory>(`/admin/categories/${encodeURIComponent(id)}`, payload);
}
