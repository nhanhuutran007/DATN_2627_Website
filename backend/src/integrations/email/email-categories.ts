/**
 * Các loại email hệ thống gửi tới người dùng. Admin bật/tắt từng loại (hoặc tắt tất cả) ở mục
 * "Cài đặt email"; loại bị tắt chỉ ghi log, thông báo trong web vẫn được tạo như thường.
 */
export type EmailCategoryGroup = "account" | "campaign" | "donation" | "other";

export type EmailCategoryInfo = {
  key: string;
  group: EmailCategoryGroup;
  label: string;
  description: string;
  /** Có thể gửi cùng lúc tới nhiều người (vd. khi dự án hết hạn) — dễ làm hết hạn mức gửi trong ngày. */
  bulk: boolean;
};

export const EMAIL_CATEGORY_GROUPS: Array<{ key: EmailCategoryGroup; label: string }> = [
  { key: "account", label: "Tài khoản & bảo mật" },
  { key: "campaign", label: "Chiến dịch" },
  { key: "donation", label: "Ủng hộ & hoàn tiền" },
  { key: "other", label: "Khác" },
];

export const EMAIL_CATEGORIES = [
  {
    key: "account_verification",
    group: "account",
    label: "Xác minh email tài khoản",
    description: "Link xác minh gửi khi đăng ký hoặc khi người dùng bấm gửi lại.",
    bulk: false,
  },
  {
    key: "password_reset",
    group: "account",
    label: "Đặt lại mật khẩu",
    description: "Link đặt lại mật khẩu khi người dùng chọn “Quên mật khẩu”.",
    bulk: false,
  },
  {
    key: "password_changed",
    group: "account",
    label: "Báo đã đổi mật khẩu",
    description: "Thư báo sau khi mật khẩu được đổi hoặc đặt lại thành công.",
    bulk: false,
  },
  {
    key: "step_up_code",
    group: "account",
    label: "Mã xác minh thao tác (OTP)",
    description:
      "Mã 6 số trước thao tác nhạy cảm: đổi mật khẩu, yêu cầu hoàn tiền, admin duyệt hoàn/rút tiền, đổi vai trò hoặc xóa tài khoản.",
    bulk: false,
  },
  {
    key: "campaign_owner",
    group: "campaign",
    label: "Xét duyệt & trạng thái chiến dịch (chủ dự án)",
    description: "Chiến dịch được duyệt, bị từ chối, cần bổ sung, tạm dừng, tiếp tục hoặc kết thúc.",
    bulk: false,
  },
  {
    key: "campaign_backers",
    group: "campaign",
    label: "Trạng thái chiến dịch gửi người ủng hộ",
    description: "Báo người ủng hộ và người theo dõi khi chiến dịch tạm dừng, tiếp tục hoặc kết thúc.",
    bulk: true,
  },
  {
    key: "campaign_updates",
    group: "campaign",
    label: "Bài cập nhật & tiến độ",
    description: "Bài cập nhật, hoàn thành mốc, báo cáo chi tiêu và đổi kế hoạch — gửi mọi người theo dõi dự án.",
    bulk: true,
  },
  {
    key: "follow_reminder",
    group: "campaign",
    label: "Nhắc dự án sắp kết thúc",
    description: "Nhắc người theo dõi (chưa ủng hộ) khi dự án còn dưới 48 giờ.",
    bulk: true,
  },
  {
    key: "donation_receipt",
    group: "donation",
    label: "Xác nhận ủng hộ (người ủng hộ)",
    description: "Ủng hộ thành công hoặc đã ghi nhận cam kết.",
    bulk: false,
  },
  {
    key: "donation_received",
    group: "donation",
    label: "Có khoản ủng hộ mới (chủ dự án)",
    description: "Báo chủ dự án mỗi khi có khoản ủng hộ được xác nhận.",
    bulk: false,
  },
  {
    key: "pledge_settlement",
    group: "donation",
    label: "Quyết toán cam kết khi dự án kết thúc",
    description:
      "Đã trừ tiền, trừ tiền thất bại, không bị trừ tiền, cam kết bị hủy, bổ sung tài khoản nhận hoàn — gửi từng người ủng hộ khi dự án chốt.",
    bulk: true,
  },
  {
    key: "refunds",
    group: "donation",
    label: "Kết quả yêu cầu hoàn tiền",
    description: "Yêu cầu hoàn tiền được duyệt (đã hoàn) hoặc bị từ chối.",
    bulk: false,
  },
  {
    key: "organizations",
    group: "other",
    label: "Tổ chức & cộng tác viên",
    description: "Kết quả xác minh tổ chức, lời mời cộng tác và thay đổi quyền thành viên.",
    bulk: false,
  },
  {
    key: "comments",
    group: "other",
    label: "Bình luận",
    description: "Có người trả lời bình luận của bạn.",
    bulk: false,
  },
  {
    key: "other",
    group: "other",
    label: "Thông báo hệ thống khác",
    description: "Các email thông báo còn lại chưa thuộc nhóm nào ở trên.",
    bulk: false,
  },
] as const satisfies readonly EmailCategoryInfo[];

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number]["key"];

export const EMAIL_CATEGORY_KEYS: EmailCategory[] = EMAIL_CATEGORIES.map((c) => c.key);

export function isEmailCategory(value: string): value is EmailCategory {
  return (EMAIL_CATEGORY_KEYS as string[]).includes(value);
}

export function emailCategoryLabel(category: EmailCategory): string {
  return EMAIL_CATEGORIES.find((c) => c.key === category)?.label ?? category;
}
