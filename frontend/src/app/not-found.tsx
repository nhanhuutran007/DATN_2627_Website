import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Không tìm thấy trang",
  robots: { index: false },
};

/** Trang 404 chung: URL không khớp route nào hoặc một trang gọi `notFound()`. */
export default function NotFound() {
  return (
    <main className="container status-page">
      <div>
        <p className="status-code num" aria-hidden="true">404</p>
        <h1>Không tìm thấy trang</h1>
        <p>Trang bạn tìm không tồn tại, đã được gỡ hoặc đường dẫn bị gõ sai. Bạn có thể quay về trang chủ hoặc xem các dự án đang gây quỹ.</p>
        <div className="status-actions">
          <Link className="button button-primary" href="/">Về trang chủ</Link>
          <Link className="button button-outline" href="/du-an">Khám phá dự án</Link>
        </div>
      </div>
    </main>
  );
}
