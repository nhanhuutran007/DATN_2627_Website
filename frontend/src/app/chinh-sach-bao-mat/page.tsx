import type { Metadata } from "next";
import Link from "next/link";

import { PageBanner } from "@/components/layout/PageBanner";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư",
  description: "Góp Mầm thu thập dữ liệu gì, lưu gì trên trình duyệt của bạn và bạn kiểm soát dữ liệu của mình ra sao.",
  alternates: { canonical: "/chinh-sach-bao-mat" },
};

type StorageItem = { key: string; where: string; purpose: string; lifetime: string };

/** Mọi thứ Góp Mầm ghi vào trình duyệt; giữ khớp với code trong `lib/api.ts`, `lib/api/campaign-stats.ts`, `features/privacy`. */
const BROWSER_STORAGE: StorageItem[] = [
  {
    key: "gopmam.accessToken, gopmam.refreshToken, gopmam.user",
    where: "localStorage",
    purpose: "Giữ phiên đăng nhập và tên hiển thị của bạn.",
    lifetime: "Xóa khi bạn đăng xuất.",
  },
  {
    key: "gopmam.viewedCampaigns",
    where: "sessionStorage",
    purpose: "Nhớ các dự án vừa xem để không đếm trùng lượt xem.",
    lifetime: "Mất khi đóng tab.",
  },
  {
    key: "gopmam.privacyNotice",
    where: "localStorage",
    purpose: "Ghi nhớ bạn đã xem thông báo quyền riêng tư.",
    lifetime: "Đến khi bạn xóa dữ liệu trang web.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main>
      <PageBanner
        title="Chính sách quyền riêng tư"
        crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Chính sách quyền riêng tư" }]}
      >
        <p className="page-banner-lead">Cập nhật ngày 15/10/2026.</p>
      </PageBanner>
      <div className="container block-tight policy">
        <section>
          <h2>Dữ liệu chúng tôi thu thập</h2>
          <ul>
            <li>
              <strong>Tài khoản:</strong> họ tên, email, số điện thoại (nếu bạn nhập), ảnh đại diện. Mật khẩu chỉ được
              lưu dưới dạng băm, không ai đọc được mật khẩu gốc. Nếu đăng nhập bằng Google, chúng tôi lưu mã tài khoản
              Google và email để liên kết với tài khoản Góp Mầm.
            </li>
            <li>
              <strong>Chiến dịch và nội dung:</strong> hồ sơ chiến dịch, cập nhật tiến độ, chứng từ chi tiêu, bình luận
              và báo cáo vi phạm bạn gửi.
            </li>
            <li>
              <strong>Giao dịch ủng hộ:</strong> số tiền, thời gian, trạng thái và lời nhắn. Thanh toán hiện chạy qua ví
              demo (sandbox); Góp Mầm không lưu thông tin thẻ ngân hàng.
            </li>
          </ul>
        </section>

        <section>
          <h2>Dữ liệu lưu trên trình duyệt của bạn</h2>
          <p>
            Góp Mầm không đặt cookie quảng cáo và không dùng công cụ phân tích hay theo dõi của bên thứ ba. Trang chỉ ghi
            các mục sau vào bộ nhớ trình duyệt:
          </p>
          <div className="policy-table-wrap">
            <table className="policy-table">
              <thead>
                <tr>
                  <th scope="col">Tên</th>
                  <th scope="col">Nơi lưu</th>
                  <th scope="col">Mục đích</th>
                  <th scope="col">Thời hạn</th>
                </tr>
              </thead>
              <tbody>
                {BROWSER_STORAGE.map((item) => (
                  <tr key={item.key}>
                    <td><code>{item.key}</code></td>
                    <td>{item.where}</td>
                    <td>{item.purpose}</td>
                    <td>{item.lifetime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Lượt xem dự án</h2>
          <p>
            Mỗi lượt xem trang dự án được cộng vào số liệu theo ngày của dự án đó. Để không đếm trùng trong 30 phút, máy
            chủ dùng mã tài khoản (nếu bạn đã đăng nhập) hoặc một mã băm từ địa chỉ IP và trình duyệt; địa chỉ IP gốc
            không được lưu lại.
          </p>
        </section>

        <section>
          <h2>Gợi ý dự án theo sở thích</h2>
          <p>
            Góp Mầm chỉ ghi nhận các dự án bạn xem để gợi ý cá nhân hóa khi bạn đã đăng nhập và bấm đồng ý. Bạn có thể
            tắt bất cứ lúc nào trong <Link href="/dashboard">Trang quản lý</Link>; khi tắt, lịch sử đã ghi sẽ bị xóa.
          </p>
        </section>

        <section>
          <h2>Bảo vệ tài khoản</h2>
          <p>
            Tài khoản bị tạm khóa sau nhiều lần đăng nhập sai liên tiếp, các thao tác quan trọng (xét duyệt, hoàn tiền,
            thay đổi vai trò…) được ghi vào nhật ký kiểm toán, và bạn có thể đăng xuất khỏi mọi thiết bị.
          </p>
        </section>

        <section>
          <h2>Quyền của bạn</h2>
          <ul>
            <li>Xem và sửa thông tin cá nhân trong <Link href="/ho-so">Cài đặt tài khoản</Link>.</li>
            <li>Rút lại đồng ý gợi ý cá nhân hóa trong <Link href="/dashboard">Trang quản lý</Link>.</li>
            <li>Xóa dữ liệu Góp Mầm trên trình duyệt bằng cách đăng xuất hoặc xóa dữ liệu trang web trong cài đặt trình duyệt.</li>
            <li>Yêu cầu khóa hoặc xóa tài khoản bằng cách liên hệ quản trị viên Góp Mầm.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
