import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Quản trị hệ thống" };

const adminStats = [
  { label: "Tài khoản", value: "12.684", note: "+426 tháng này", icon: "users" as const, tone: "blue" },
  { label: "Chiến dịch công khai", value: "326", note: "18 đang chờ duyệt", icon: "rocket" as const, tone: "orange" },
  { label: "Tài trợ đã xác minh", value: "18,6 tỷ", note: "+8,2% so với tháng trước", icon: "wallet" as const, tone: "green" },
  { label: "Cảnh báo cần xem", value: "09", note: "3 mức ưu tiên cao", icon: "shield" as const, tone: "red" },
];

export default function AdminPage() {
  return (
    <main className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-profile"><span>Q</span><div><b>Quản trị viên</b><small>admin@gopmam.vn</small></div></div>
          <nav aria-label="Điều hướng quản trị">
            <a className="active" href="#tong-quan"><Icon name="chart" size={19} /> Tổng quan</a>
            <a href="#cho-duyet"><Icon name="document" size={19} /> Duyệt chiến dịch <i>18</i></a>
            <a href="#rui-ro"><Icon name="shield" size={19} /> Cảnh báo rủi ro <i>9</i></a>
            <a href="#giao-dich"><Icon name="receipt" size={19} /> Giao dịch</a>
            <a href="#nguoi-dung"><Icon name="users" size={19} /> Người dùng</a>
            <a href="#noi-dung"><Icon name="message" size={19} /> Báo cáo nội dung</a>
          </nav>
          <div className="admin-policy"><Icon name="shield" size={22} /><p><b>AI không tự động xử phạt</b><span>Mọi cảnh báo phải có quản trị viên xem xét và lưu lý do quyết định.</span></p></div>
        </aside>

        <div className="admin-content" id="tong-quan">
          <header className="admin-content-header"><div><p className="eyebrow">Bảng điều khiển</p><h1>Tổng quan hệ thống</h1><span>Dữ liệu mô phỏng cập nhật lúc 09:09 · 09/09/2026</span></div><div><button className="button button-outline" type="button"><Icon name="document" size={17} /> Xuất báo cáo</button><Link className="button button-primary" href="/">Xem trang người dùng</Link></div></header>

          <section className="admin-stat-grid">
            {adminStats.map((stat) => <article key={stat.label}><span className={`stat-icon ${stat.tone}`}><Icon name={stat.icon} /></span><div><small>{stat.label}</small><strong>{stat.value}</strong><em>{stat.note}</em></div></article>)}
          </section>

          <div className="admin-primary-grid">
            <section className="admin-card admin-chart-card">
              <div className="card-heading"><div><p className="eyebrow">Dòng tiền đã xác minh</p><h2>Tài trợ theo tháng</h2></div><select aria-label="Năm thống kê"><option>2026</option><option>2025</option></select></div>
              <div className="admin-chart-summary"><strong>4,82 tỷ ₫</strong><span><i /> Tài trợ thành công</span><span><i /> Hoàn tiền</span></div>
              <div className="line-chart" aria-label="Biểu đồ tài trợ mô phỏng"><svg viewBox="0 0 700 220" role="img"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f06a3b" stopOpacity=".22"/><stop offset="1" stopColor="#f06a3b" stopOpacity="0"/></linearGradient></defs><path className="chart-grid-line" d="M20 30H680M20 80H680M20 130H680M20 180H680"/><path className="chart-area" d="M20 170C80 164 96 105 150 121S223 145 270 102 345 70 390 88s80 26 126-27 92-37 164-45V205H20Z"/><path className="chart-line" d="M20 170C80 164 96 105 150 121S223 145 270 102 345 70 390 88s80 26 126-27 92-37 164-45"/></svg><div><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>T8</span><span>T9</span></div></div>
            </section>

            <section className="admin-card review-overview-card">
              <div className="card-heading"><div><p className="eyebrow">Hàng chờ xét duyệt</p><h2>18 hồ sơ</h2></div><a href="#cho-duyet">Xem tất cả</a></div>
              <div className="donut-wrap"><div className="donut"><span><b>18</b><small>tổng hồ sơ</small></span></div><ul><li><i className="orange" /><span>Chiến dịch mới</span><b>8</b></li><li><i className="green" /><span>Hồ sơ chủ dự án</span><b>6</b></li><li><i className="yellow" /><span>Thay đổi quan trọng</span><b>4</b></li></ul></div>
              <div className="review-sla"><Icon name="clock" size={18} /><span><b>Thời gian xử lý trung bình: 1,8 ngày</b><small>Trong cam kết phản hồi dưới 3 ngày làm việc</small></span></div>
            </section>
          </div>

          <section className="admin-card admin-table-card" id="cho-duyet">
            <div className="card-heading"><div><p className="eyebrow">Ưu tiên hôm nay</p><h2>Chiến dịch chờ duyệt</h2></div><button className="filter-button" type="button">Tất cả trạng thái <Icon name="chevron-down" size={14} /></button></div>
            <div className="table-scroll"><table><thead><tr><th>Chiến dịch</th><th>Chủ dự án</th><th>Mục tiêu</th><th>Điểm hồ sơ</th><th>Chờ từ</th><th>Trạng thái</th><th /></tr></thead><tbody>
              <tr><td><span className="table-project-image atlas atlas-library" /><b>Phòng học số cho trẻ em vùng xa</b></td><td>Ánh Dương Foundation</td><td>280 triệu ₫</td><td><span className="score high">88</span></td><td>6 giờ</td><td><span className="table-status pending">Chờ duyệt</span></td><td><button type="button">Xem hồ sơ</button></td></tr>
              <tr><td><span className="table-project-image atlas atlas-startup" /><b>Xưởng tái chế nhựa cộng đồng</b></td><td>Green Loop</td><td>420 triệu ₫</td><td><span className="score medium">72</span></td><td>1 ngày</td><td><span className="table-status changes">Cần bổ sung</span></td><td><button type="button">Xem hồ sơ</button></td></tr>
              <tr><td><span className="table-project-image atlas atlas-health" /><b>Tủ thuốc cho bản nhỏ</b></td><td>Y Bác sĩ Trẻ</td><td>160 triệu ₫</td><td><span className="score high">91</span></td><td>2 ngày</td><td><span className="table-status pending">Chờ duyệt</span></td><td><button type="button">Xem hồ sơ</button></td></tr>
            </tbody></table></div>
          </section>

          <section className="admin-card risk-card" id="rui-ro">
            <div className="card-heading"><div><p className="eyebrow">Human-in-the-loop</p><h2>Cảnh báo rủi ro cần xem xét</h2></div><span className="model-version"><Icon name="sparkles" size={15} /> rules-v0.1 + anomaly-demo-v0.1</span></div>
            <div className="risk-list">
              <article><span className="risk-level high">Cao</span><div><h3>Chuỗi giao dịch lặp trong thời gian ngắn</h3><p>8 lần thanh toán cùng giá trị trong 4 phút · Chiến dịch GM-C26-0112</p><small><b>Bằng chứng:</b> tần suất cao, 6 giao dịch thất bại, dấu vết thiết bị trùng</small></div><div><button type="button">Xem bằng chứng</button><span>Chưa xử lý</span></div></article>
              <article><span className="risk-level medium">Vừa</span><div><h3>Giá trị tài trợ lệch đáng kể so với lịch sử</h3><p>Khoản tài trợ cao gấp 14 lần trung vị của tài khoản</p><small><b>Bằng chứng:</b> tài khoản hoạt động 2 ngày, chưa xác minh lại</small></div><div><button type="button">Xem bằng chứng</button><span>Chờ xác minh</span></div></article>
            </div>
            <p className="risk-footnote"><Icon name="shield" size={15} /> Cảnh báo chỉ giúp ưu tiên kiểm tra. Không tự động khóa tài khoản, tạm dừng chiến dịch hay công khai cáo buộc.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
