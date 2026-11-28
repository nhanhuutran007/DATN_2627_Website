import type { Metadata } from "next";
import Link from "next/link";

import { PageBanner } from "@/components/layout/PageBanner";
import { Icon } from "@/components/ui/Icon";
import { fetchSupportContact, hasSupportContact, type SupportContact } from "@/lib/api/support";

export const metadata: Metadata = {
  title: "Liên hệ hỗ trợ",
  description: "Kênh liên hệ đội ngũ quản trị Góp Mầm: hỗ trợ tài khoản, ủng hộ, hoàn tiền, báo cáo vi phạm.",
  alternates: { canonical: "/lien-he" },
};

// Thông tin do quản trị viên cập nhật trong trang quản trị: luôn đọc bản mới nhất.
export const dynamic = "force-dynamic";

async function loadContact(): Promise<SupportContact | null> {
  try {
    return await fetchSupportContact();
  } catch {
    return null;
  }
}

const telHref = (phone: string) => `tel:${phone.replace(/[^0-9+]/g, "")}`;

/** Trang liên hệ hỗ trợ (TC_CAMP_016): thông tin do admin cập nhật ở mục "Liên hệ hỗ trợ". */
export default async function SupportContactPage() {
  const contact = await loadContact();
  const ready = hasSupportContact(contact);

  return (
    <main>
      <PageBanner title="Liên hệ hỗ trợ" crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Liên hệ hỗ trợ" }]}>
        <p className="page-banner-lead">
          Cần hỗ trợ về tài khoản, khoản ủng hộ, hoàn tiền hay muốn báo cáo một chiến dịch? Đội ngũ quản trị Góp Mầm phản hồi qua các kênh dưới đây.
        </p>
      </PageBanner>
      <div className="container block-tight policy">
        {ready ? (
          <section>
            <h2>Kênh liên hệ</h2>
            <ul className="support-channels">
              {contact.email && (
                <li>
                  <Icon name="mail" size={18} />
                  <span>Email</span>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </li>
              )}
              {contact.phone && (
                <li>
                  <Icon name="message" size={18} />
                  <span>Điện thoại</span>
                  <a href={telHref(contact.phone)}>{contact.phone}</a>
                </li>
              )}
              {contact.address && (
                <li>
                  <Icon name="location" size={18} />
                  <span>Địa chỉ</span>
                  <b>{contact.address}</b>
                </li>
              )}
              {contact.workingHours && (
                <li>
                  <Icon name="clock" size={18} />
                  <span>Giờ làm việc</span>
                  <b>{contact.workingHours}</b>
                </li>
              )}
              {contact.socialUrl && (
                <li>
                  <Icon name="share" size={18} />
                  <span>Mạng xã hội</span>
                  <a href={contact.socialUrl} target="_blank" rel="noopener noreferrer nofollow">{contact.socialUrl}</a>
                </li>
              )}
            </ul>
            {contact.note && <p className="pre-line">{contact.note}</p>}
          </section>
        ) : (
          <section>
            <h2>Kênh liên hệ</h2>
            <p>Thông tin liên hệ đang được cập nhật. Trong lúc chờ, bạn có thể dùng hộp hỏi đáp nhanh ở góc màn hình.</p>
          </section>
        )}

        <section>
          <h2>Trước khi liên hệ</h2>
          <ul>
            <li>Vấn đề với một chiến dịch (thông tin sai, nghi lừa đảo): dùng nút <b>Báo cáo chiến dịch</b> ở trang dự án để quản trị viên xử lý nhanh hơn.</li>
            <li>Muốn nhận lại tiền: gửi yêu cầu hoàn tiền từ <Link href="/dashboard">biên nhận khoản ủng hộ</Link> của bạn.</li>
            <li>Hỏi về một dự án cụ thể: bấm <b>Liên hệ</b> ở trang dự án để xem liên hệ của người tổ chức.</li>
            <li>Yêu cầu khóa tài khoản: gửi email từ chính địa chỉ email đăng nhập để chúng tôi xác minh. Muốn xóa tài khoản, bạn tự xóa trong Cài đặt tài khoản.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
