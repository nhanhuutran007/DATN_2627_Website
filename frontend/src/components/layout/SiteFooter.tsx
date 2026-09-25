import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

export function SiteFooter() {
  return (
    <footer className="site-footer-new">
      <div className="container footer-cols">
        <div className="footer-about">
          <Link className="logo logo-light" href="/" aria-label="Góp Mầm – Trang chủ">
            <span className="logo-mark"><Icon name="leaf" size={22} /></span>
            <span className="logo-text">GÓP <b>MẦM</b></span>
          </Link>
          <p>
            Nền tảng gây quỹ cộng đồng cho dự án xã hội và khởi nghiệp. Hồ sơ được kiểm duyệt trước khi phát hành,
            giao dịch được xác nhận và chủ dự án báo cáo chi tiêu theo từng mốc.
          </p>
        </div>
        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore">Khám phá</h2>
          <Link href="/du-an">Tất cả dự án</Link>
          <Link href="/du-an?category=Giáo+dục">Giáo dục</Link>
          <Link href="/du-an?category=Môi+trường">Môi trường</Link>
          <Link href="/du-an?category=Khởi+nghiệp">Khởi nghiệp</Link>
        </nav>
        <nav aria-labelledby="footer-owner">
          <h2 id="footer-owner">Chủ dự án</h2>
          <Link href="/tao-chien-dich">Tạo chiến dịch</Link>
          <Link href="/dashboard">Quản lý chiến dịch</Link>
          <Link href="/#quy-trinh">Quy trình gây quỹ</Link>
        </nav>
        <div>
          <h2>Cam kết</h2>
          <ul className="footer-points">
            <li><Icon name="check" size={15} /> Kiểm duyệt trước khi phát hành</li>
            <li><Icon name="check" size={15} /> Sổ cái giao dịch công khai</li>
            <li><Icon name="check" size={15} /> Không lưu dữ liệu thẻ</li>
          </ul>
        </div>
      </div>
      <div className="footer-bar">
        <div className="container footer-bar-inner">
          <span>© 2026 Góp Mầm · Đồ án tốt nghiệp DATN_2627</span>
          <span>Bản demo sử dụng thanh toán sandbox, không phát sinh tiền thật.</span>
        </div>
      </div>
    </footer>
  );
}
