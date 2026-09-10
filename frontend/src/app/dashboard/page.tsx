import type { Metadata } from "next";
import Link from "next/link";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { campaignProgress, campaigns, formatCurrency } from "@/lib/data/campaigns";

export const metadata: Metadata = { title: "Trung tâm chủ dự án" };

const chartData = [32, 46, 39, 68, 54, 82, 72, 93, 76, 61, 47, 58];

export default function OwnerDashboardPage() {
  const campaign = campaigns[0];
  const progress = campaignProgress(campaign);

  return (
    <main className="dashboard-page">
      <section className="dashboard-top">
        <div className="container dashboard-title-row">
          <div><p className="eyebrow">Trung tâm chủ dự án</p><h1>Chào buổi sáng, Mầm Xanh!</h1><p>Chiến dịch của bạn đang đi đúng hướng. Có 3 việc cần chú ý hôm nay.</p></div>
          <div><Link className="button button-outline" href="/du-an/hoi-sinh-rung-ngap-man-can-gio">Xem trang công khai</Link><Link className="button button-primary" href="/tao-chien-dich">+ Tạo chiến dịch</Link></div>
        </div>
      </section>

      <section className="container dashboard-content">
        <div className="stat-grid">
          <article><span className="stat-icon orange"><Icon name="wallet" /></span><div><small>Đã huy động</small><strong>{formatCurrency(campaign.raised)}</strong><em>↑ 12,4% trong 7 ngày</em></div></article>
          <article><span className="stat-icon green"><Icon name="users" /></span><div><small>Người tài trợ</small><strong>{campaign.backers.toLocaleString("vi-VN")}</strong><em>+86 người mới</em></div></article>
          <article><span className="stat-icon blue"><Icon name="chart" /></span><div><small>Lượt xem</small><strong>18.420</strong><em>Tỷ lệ chuyển đổi 6,8%</em></div></article>
          <article><span className="stat-icon yellow"><Icon name="clock" /></span><div><small>Thời gian còn lại</small><strong>{campaign.daysLeft} ngày</strong><em>Đúng tiến độ</em></div></article>
        </div>

        <div className="dashboard-main-grid">
          <section className="dashboard-card performance-card">
            <div className="card-heading"><div><p className="eyebrow">Hiệu suất chiến dịch</p><h2>Nhịp đóng góp 12 ngày gần nhất</h2></div><select aria-label="Khoảng thời gian"><option>12 ngày</option><option>30 ngày</option></select></div>
            <div className="chart-summary"><div><strong>82,4 triệu ₫</strong><span>Đóng góp trong kỳ</span></div><div><i className="legend orange" />Đóng góp xác minh</div><div><i className="legend green" />Lượt theo dõi</div></div>
            <div className="bar-chart" aria-label="Biểu đồ đóng góp 12 ngày">
              {chartData.map((value, index) => <div key={index}><i style={{ height: `${value}%` }} /><span>{index + 1}/9</span></div>)}
            </div>
          </section>

          <aside className="dashboard-card task-card">
            <div className="card-heading"><div><p className="eyebrow">Cần xử lý</p><h2>Việc hôm nay</h2></div><span className="count-badge">3</span></div>
            <ul>
              <li><span className="task-icon urgent"><Icon name="clock" size={18} /></span><div><b>Cập nhật tiến độ mốc 2</b><p>Đến hạn sau 2 ngày</p></div><Icon name="arrow-right" size={17} /></li>
              <li><span className="task-icon"><Icon name="message" size={18} /></span><div><b>Trả lời 5 câu hỏi mới</b><p>Từ cộng đồng tài trợ</p></div><Icon name="arrow-right" size={17} /></li>
              <li><span className="task-icon"><Icon name="document" size={18} /></span><div><b>Bổ sung 2 chứng từ</b><p>Cho khoản chi cây giống</p></div><Icon name="arrow-right" size={17} /></li>
            </ul>
          </aside>
        </div>

        <section className="dashboard-card active-campaign-card">
          <div className="active-campaign-image atlas atlas-mangrove" />
          <div className="active-campaign-info"><div><span className="status-pill">Đang gây quỹ</span><small>Mã GM-C26-0018</small></div><h2>{campaign.title}</h2><ProgressBar value={progress} /><div className="active-progress-info"><span><b>{formatCurrency(campaign.raised)}</b> / {formatCurrency(campaign.target)}</span><strong>{progress}%</strong></div></div>
          <div className="active-campaign-actions"><Link className="button button-outline" href={`/du-an/${campaign.slug}`}>Chi tiết</Link><button className="button button-primary" type="button">Đăng cập nhật</button></div>
        </section>

        <div className="dashboard-bottom-grid">
          <section className="dashboard-card ai-insight-card"><span className="ai-orb"><Icon name="sparkles" size={27} /></span><div><p className="eyebrow">Trợ lý chiến dịch · bản giải thích demo</p><h2>Khả năng đạt mục tiêu đang ở mức tích cực</h2><p>Tốc độ đóng góp tuần này cao hơn trung bình nhóm môi trường. Hồ sơ có kế hoạch rõ và cập nhật đúng hạn; tuy nhiên cần duy trì phản hồi cộng đồng trong 48 giờ.</p><div><span className="positive"><Icon name="check" size={14} /> Kế hoạch đầy đủ</span><span className="positive"><Icon name="check" size={14} /> Tương tác tốt</span><span><Icon name="clock" size={14} /> Cần thêm cập nhật</span></div><small>Kết quả AI chỉ hỗ trợ tham khảo · model demo-success-v0.1</small></div><strong>78<small>%</small></strong></section>
          <section className="dashboard-card transparency-mini"><div className="card-heading"><div><p className="eyebrow">Minh bạch</p><h2>Tình trạng báo cáo</h2></div><span>96/100</span></div><ul><li><Icon name="check" size={15} /> 3/3 mốc có ngân sách</li><li><Icon name="check" size={15} /> Cập nhật gần nhất: 3 ngày trước</li><li><Icon name="clock" size={15} /> 2 chứng từ đang chờ bổ sung</li></ul></section>
        </div>
      </section>
    </main>
  );
}
