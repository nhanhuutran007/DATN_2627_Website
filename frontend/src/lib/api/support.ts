import { api } from "@/lib/api";

/** Thông tin liên hệ hỗ trợ của Góp Mầm do quản trị viên cập nhật; trường rỗng = chưa công bố. */
export type SupportContact = {
  email: string;
  phone: string;
  address: string;
  workingHours: string;
  socialUrl: string;
  note: string;
  updatedAt: string | null;
};

export type SupportContactPayload = Partial<Omit<SupportContact, "updatedAt">>;

export function fetchSupportContact(): Promise<SupportContact> {
  return api.get<SupportContact>("/support-contact");
}

export function updateSupportContact(payload: SupportContactPayload): Promise<SupportContact> {
  return api.patch<SupportContact>("/admin/support-contact", payload);
}

/** Có ít nhất một kênh liên hệ để hiển thị. */
export function hasSupportContact(contact: SupportContact | null): contact is SupportContact {
  return Boolean(contact && (contact.email || contact.phone || contact.address || contact.socialUrl));
}
