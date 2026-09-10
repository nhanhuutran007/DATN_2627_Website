import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand-column">
          <Link className="brand brand-inverse" href="/">
            <span className="brand-mark"><Icon name="leaf" size={23} /></span>
            <span className="brand-copy"><b>GÓP MẦM</b><small>Góp niềm tin · Gieo thay đổi</small></span>
          </Link>
          <p>Nền tảng kết nối những ý tưởng tử tế với cộng đồng sẵn lòng chung tay, có theo dõi tiến độ và minh bạch nguồn quỹ.</p>
          <div className="footer-cert"><Icon name="shield" size={20} /> Thanh toán sandbox · Không lưu dữ liệu thẻ</div>
        </div>
        <div>
          <h2>Khám phá</h2>
          <Link href="/du-an">Tất cả dự án</Link>
          <Link href="/du-an?category=Môi+trường">Môi trường</Link>
          <Link href="/du-an?category=Khởi+nghiệp">Khởi nghiệp</Link>
          <Link href="/du-an?category=Giáo+dục">Giáo dục</Link>
        </div>
        <div>
          <h2>Dành cho bạn</h2>
          <Link href="/tao-chien-dich">Bắt đầu chiến dịch</Link>
          <Link href="/dashboard">Trung tâm chủ dự án</Link>
          <Link href="/#cach-hoat-dong">Cách hoạt động</Link>
          <Link href="/#minh-bach">Cam kết minh bạch</Link>
        </div>
        <div>
          <h2>Nhận tin tốt mỗi tuần</h2>
          <p>Những dự án mới và báo cáo tác động, gửi vừa đủ.</p>
          <form className="newsletter-form">
            <label className="sr-only" htmlFor="newsletter-email">Email nhận bản tin</label>
            <input id="newsletter-email" type="email" placeholder="Email của bạn" />
            <button type="submit" aria-label="Đăng ký"><Icon name="arrow-right" /></button>
          </form>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Góp Mầm · Sản phẩm demo đồ án tốt nghiệp</span>
        <span>Điều khoản · Quyền riêng tư · Trung tâm trợ giúp</span>
      </div>
    </footer>
  );
}
