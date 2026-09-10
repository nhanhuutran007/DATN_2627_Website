"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import {
  apiCampaignToView,
  fetchMyCampaigns,
  type ApiCampaign,
} from "@/lib/api/campaigns";
import { useAuthUser } from "@/lib/auth";
import {
  campaigns as mockCampaigns,
  campaignProgress,
  formatCurrency,
  type Campaign,
} from "@/lib/data/campaigns";

type Aggregate = {
  totalRaised: number;
  totalBackers: number;
  totalViews: number;
  activeCount: number;
};

function toViewList(list: ApiCampaign[]): Campaign[] {
  return list.map(apiCampaignToView);
}

function aggregate(campaigns: ApiCampaign[]): Aggregate {
  return campaigns.reduce<Aggregate>(
    (acc, campaign) => {
      acc.totalRaised += Number(campaign.currentAmount ?? 0);
      acc.totalBackers += Number(campaign.backerCount ?? 0);
      acc.totalViews += Number(campaign.viewCount ?? 0);
      if (campaign.status === "active" || campaign.status === "approved") {
        acc.activeCount += 1;
      }
      return acc;
    },
    { totalRaised: 0, totalBackers: 0, totalViews: 0, activeCount: 0 },
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function OwnerDashboard() {
  const user = useAuthUser();
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchMyCampaigns({ sort: "latest", limit: 100 });
        if (cancelled) return;
        setCampaigns(response.items);
        setLoadState("ready");
      } catch {
        if (cancelled) return;
        setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return (
      <main className="dashboard-page">
        <section className="container dashboard-login-gate">
          <span className="confirmation-icon"><Icon name="shield" size={28} /></span>
          <h1>Bạn cần đăng nhập để quản lý dự án.</h1>
          <p>Đăng nhập để xem số liệu chiến dịch, cập nhật tiến độ và phản hồi cộng đồng.</p>
          <div>
            <Link className="button button-primary" href="/dang-nhap?next=/dashboard">Đăng nhập</Link>
            <Link className="button button-outline" href="/du-an">Khám phá dự án</Link>
          </div>
        </section>
      </main>
    );
  }

  if (loadState === "loading") {
    return (
      <main className="dashboard-page">
        <section className="container dashboard-loading" aria-live="polite">
          <span className="ai-orb"><Icon name="sparkles" size={24} /></span>
          <p>Đang tải dữ liệu chiến dịch…</p>
        </section>
      </main>
    );
  }

  const items: ApiCampaign[] = campaigns;
  const viewItems: Campaign[] =
    loadState === "ready"
      ? toViewList(campaigns)
      : (mockCampaigns as unknown as Campaign[]).slice(0, 3);

  // Nếu API lỗi, dùng mock để trang không trống (hiển thị ghi chú demo)
  const isFallback = loadState === "error";
  const stats = isFallback
    ? viewItems.reduce<Aggregate>(
        (acc, campaign) => {
          acc.totalRaised += campaign.raised;
          acc.totalBackers += campaign.backers;
          if (campaign.status === "Đang gây quỹ" || campaign.status === "Sắp kết thúc") {
            acc.activeCount += 1;
          }
          return acc;
        },
        { totalRaised: 0, totalBackers: 0, totalViews: 0, activeCount: 0 },
      )
    : aggregate(items);
  const activeCampaign = viewItems.find((item) => item.status === "Đang gây quỹ" || item.status === "Sắp kết thúc");
  const firstTaskCount = 3;

  return (
    <main className="dashboard-page">
      <section className="dashboard-top">
        <div className="container dashboard-title-row">
          <div>
            <p className="eyebrow">Trung tâm chủ dự án</p>
            <h1>{greeting()}, {user.name.split(" ").slice(-1)[0]}!</h1>
            <p>{isFallback ? "Hệ thống chưa kết nối được. Hiển thị dữ liệu mẫu phục vụ demo." : items.length > 0 ? `Bạn đang quản lý ${items.length} chiến dịch.` : "Tạo chiến dịch đầu tiên để bắt đầu hành trình."}</p>
          </div>
          <div>
            <Link className="button button-outline" href={activeCampaign ? `/du-an/${activeCampaign.slug}` : "/du-an"}>Xem trang công khai</Link>
            <Link className="button button-primary" href="/tao-chien-dich">+ Tạo chiến dịch</Link>
          </div>
        </div>
      </section>

      <section className="container dashboard-content">
        <div className="stat-grid">
          <article>
            <span className="stat-icon orange"><Icon name="wallet" /></span>
            <div><small>Đã huy động</small><strong>{formatCurrency(stats.totalRaised)}</strong><em>từ các chiến dịch</em></div>
          </article>
          <article>
            <span className="stat-icon green"><Icon name="users" /></span>
            <div><small>Người tài trợ</small><strong>{stats.totalBackers.toLocaleString("vi-VN")}</strong><em>{items.length} chiến dịch</em></div>
          </article>
          <article>
            <span className="stat-icon blue"><Icon name="chart" /></span>
            <div><small>Lượt xem</small><strong>{stats.totalViews.toLocaleString("vi-VN")}</strong><em>tổng hợp tất cả dự án</em></div>
          </article>
          <article>
            <span className="stat-icon yellow"><Icon name="clock" /></span>
            <div><small>Đang gây quỹ</small><strong>{stats.activeCount}</strong><em>{isFallback ? "dữ liệu mẫu" : "chiến dịch hoạt động"}</em></div>
          </article>
        </div>

        <section className="dashboard-card campaign-list-card">
          <div className="card-heading">
            <div><p className="eyebrow">Các chiến dịch của bạn</p><h2>Danh sách dự án</h2></div>
            {isFallback && <span className="demo-badge">Dữ liệu mẫu</span>}
          </div>
          <div className="campaign-list">
            {viewItems.length === 0 ? (
              <div className="campaign-list-empty">
                <p>Chưa có chiến dịch nào. Hãy tạo chiến dịch đầu tiên để bắt đầu.</p>
                <Link className="button button-primary" href="/tao-chien-dich">+ Tạo chiến dịch</Link>
              </div>
            ) : (
              viewItems.map((campaign) => {
                const progress = campaignProgress(campaign);
                return (
                  <div className="campaign-list-row" key={campaign.slug}>
                    <div className={`active-campaign-image atlas atlas-${campaign.image}`} />
                    <div className="campaign-list-info">
                      <div><span className={`status-pill status-${campaign.status.replace(/\s+/g, "-").toLowerCase()}`}>{campaign.status}</span><small>Mã GM-{campaign.slug.slice(0, 6).toUpperCase()}</small></div>
                      <h3>{campaign.title}</h3>
                      <ProgressBar value={progress} />
                      <div className="active-progress-info"><span><b>{formatCurrency(campaign.raised)}</b> / {formatCurrency(campaign.target)}</span><strong>{progress}%</strong></div>
                    </div>
                    <div className="active-campaign-actions">
                      <Link className="button button-outline" href={`/du-an/${campaign.slug}`}>Chi tiết</Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {!isFallback && (
          <section className="dashboard-card transparency-mini">
            <div className="card-heading"><div><p className="eyebrow">Minh bạch</p><h2>Số liệu sinh từ giao dịch</h2></div></div>
            <ul>
              <li><Icon name="check" size={15} /> Số tiền đã huy động được tính từ giao dịch đã xác minh</li>
              <li><Icon name="check" size={15} /> Người tài trợ đếm theo đơn hoàn thành, không nhập tay</li>
              <li><Icon name="check" size={15} /> Thay đổi quan trọng được ghi lại vào lịch sử hệ thống</li>
            </ul>
          </section>
        )}

        <div className="dashboard-task-reminder">
          <span className="task-icon urgent"><Icon name="clock" size={18} /></span>
          <div>
            <b>{firstTaskCount} việc cần chú ý hôm nay</b>
            <p>Cập nhật tiến độ mốc gần nhất để cộng đồng tài trợ luôn theo dõi được.</p>
          </div>
          <Link className="text-link" href={activeCampaign ? `/du-an/${activeCampaign.slug}` : "/tao-chien-dich"}>Xử lý <Icon name="arrow-right" size={17} /></Link>
        </div>
      </section>
    </main>
  );
}