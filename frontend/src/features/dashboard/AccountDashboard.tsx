"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { EmailVerificationNotice } from "@/features/auth/EmailVerificationNotice";
import { MyDonations, type MyDonation } from "@/features/finance/MyDonations";
import { MyFollows } from "@/features/follows/MyFollows";
import { api } from "@/lib/api";
import { fetchMyCampaigns, type ApiCampaign } from "@/lib/api/campaigns";
import { fetchMyFollows, type FollowedCampaign } from "@/lib/api/follows";
import { useAuthUser, useRedirectAdmin } from "@/lib/auth";
import { formatVnd } from "@/lib/format";
import { OwnerCampaigns } from "./OwnerCampaigns";

type Tab = "donations" | "follows" | "campaigns";

/** Hash cũ (link từ biên nhận, hộp hỗ trợ…) → tab tương ứng. */
const HASH_TABS: Record<string, Tab> = {
  "#ung-ho-cua-toi": "donations",
  "#dang-theo-doi": "follows",
  "#chien-dich": "campaigns",
};

function tabFromHash(): Tab | null {
  if (typeof window === "undefined") return null;
  return HASH_TABS[window.location.hash] ?? null;
}

/** Chữ cái đại diện khi chưa có ảnh: chữ đầu của tên gọi (từ cuối trong họ tên Việt). */
function avatarLetter(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.at(-1)?.[0] ?? "?").toUpperCase();
}

/**
 * Trang cá nhân sau đăng nhập (bố cục theo trang "Your impact" của GoFundMe):
 * tổng số đã ủng hộ ở trên, bên dưới là các tab khoản ủng hộ / dự án theo dõi / chiến dịch của bạn.
 */
export function AccountDashboard() {
  const user = useAuthUser();
  const redirecting = useRedirectAdmin();
  const [donations, setDonations] = useState<MyDonation[]>([]);
  const [follows, setFollows] = useState<FollowedCampaign[]>([]);
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<Tab | null>(tabFromHash);

  useEffect(() => {
    const onHashChange = () => {
      const next = tabFromHash();
      if (next) setTab(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const loadAll = useCallback(async () => {
    const [donationList, followPage, campaignPage] = await Promise.all([
      api.get<MyDonation[]>("/donations/mine"),
      fetchMyFollows(50),
      fetchMyCampaigns({ sort: "latest", limit: 100 }),
    ]);
    return { donationList, follows: followPage.items, campaigns: campaignPage.items };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadAll()
      .then((data) => {
        if (cancelled) return;
        setDonations(data.donationList);
        setFollows(data.follows);
        setCampaigns(data.campaigns);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [user, loadAll]);

  const reloadCampaigns = useCallback(async () => {
    const page = await fetchMyCampaigns({ sort: "latest", limit: 100 });
    setCampaigns(page.items);
  }, []);

  const retry = () => {
    setState("loading");
    loadAll()
      .then((data) => {
        setDonations(data.donationList);
        setFollows(data.follows);
        setCampaigns(data.campaigns);
        setState("ready");
      })
      .catch(() => setState("error"));
  };

  const impact = useMemo(() => {
    const completed = donations.filter((d) => d.status === "completed");
    return {
      total: completed.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      campaigns: new Set(completed.map((d) => d.campaignId)).size,
      count: completed.length,
    };
  }, [donations]);

  const isOwner = user?.role === "campaign_owner" || campaigns.length > 0;
  // Chủ dự án mặc định mở tab chiến dịch; người ủng hộ mở tab khoản ủng hộ.
  const defaultTab: Tab = isOwner && campaigns.length > 0 ? "campaigns" : "donations";
  const activeTab: Tab = tab === "campaigns" && !isOwner ? defaultTab : tab ?? defaultTab;
  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    ...(isOwner ? [{ id: "campaigns" as const, label: "Chiến dịch của bạn", count: campaigns.length }] : []),
    { id: "donations", label: "Khoản ủng hộ", count: donations.length },
    { id: "follows", label: "Đang theo dõi", count: follows.length },
  ];

  if (redirecting) return null;

  if (!user) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="user" size={28} /></span>
        <h1>Đăng nhập để xem trang của bạn</h1>
        <p>Theo dõi các khoản đã ủng hộ, dự án đang quan tâm và chiến dịch bạn tổ chức.</p>
        <div className="gate-actions">
          <Link className="button button-primary" href="/dang-nhap?next=/dashboard">Đăng nhập</Link>
          <Link className="button button-outline" href="/dang-ky">Tạo tài khoản</Link>
        </div>
      </main>
    );
  }

  const ready = state === "ready";

  return (
    <main className="impact">
      <section className="impact-hero" aria-labelledby="impact-title">
        <div className="impact-hero-inner">
          <span className="impact-avatar" aria-hidden="true">{avatarLetter(user.name)}</span>
          <h1 id="impact-title" className="impact-greeting">Xin chào, {user.name}</h1>
          <p className="impact-amount num" aria-live="polite">{ready ? formatVnd(impact.total) : "—"}</p>
          <p className="impact-caption">Tổng số tiền bạn đã ủng hộ (chỉ tính khoản đã được xác nhận)</p>

          <div className="impact-stats">
            <div>
              <span className="impact-stat-value"><Icon name="heart" size={18} /> <b className="num">{ready ? impact.campaigns : "—"}</b></span>
              <small>Dự án đã ủng hộ</small>
            </div>
            <div>
              <span className="impact-stat-value"><Icon name="receipt" size={18} /> <b className="num">{ready ? impact.count : "—"}</b></span>
              <small>Lượt ủng hộ thành công</small>
            </div>
            <div>
              <span className="impact-stat-value"><Icon name="bell" size={18} /> <b className="num">{ready ? follows.length : "—"}</b></span>
              <small>Dự án đang theo dõi</small>
            </div>
          </div>

          {ready && impact.count === 0 && (
            <div className="impact-cta">
              <h2>Gieo mầm đầu tiên của bạn</h2>
              <p>Khi bạn ủng hộ một dự án, số tiền và các dự án bạn đồng hành sẽ hiện ở đây.</p>
              <Link href="/du-an">Tìm dự án để ủng hộ <Icon name="arrow-right" size={15} /></Link>
            </div>
          )}

          <Link className="impact-create" href="/tao-chien-dich">Tạo chiến dịch</Link>
        </div>
      </section>

      <section className="impact-activity" aria-labelledby="activity-title">
        <EmailVerificationNotice user={user} />
        <h2 id="activity-title">Hoạt động của bạn</h2>

        <div className="impact-tabs" role="tablist" aria-label="Hoạt động của bạn">
          {tabs.map((item) => (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              className="impact-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === item.id}
              aria-controls={`panel-${item.id}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {ready && <span className="impact-tab-count num">{item.count}</span>}
            </button>
          ))}
        </div>

        <div className="impact-panel" id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {state === "loading" && <p className="hint" role="status">Đang tải…</p>}
          {state === "error" && (
            <div className="form-error" role="alert">
              Không tải được dữ liệu.{" "}
              <button className="link-inline" type="button" onClick={retry}>Thử lại</button>
            </div>
          )}
          {ready && activeTab === "donations" && (
            <MyDonations
              items={donations}
              onChange={(updated) => setDonations((list) => list.map((d) => (d.id === updated.id ? updated : d)))}
            />
          )}
          {ready && activeTab === "follows" && (
            <MyFollows
              items={follows}
              onRemove={(campaignId) => setFollows((list) => list.filter((f) => f.campaign.id !== campaignId))}
            />
          )}
          {ready && activeTab === "campaigns" && <OwnerCampaigns campaigns={campaigns} reload={reloadCampaigns} />}
        </div>
      </section>
    </main>
  );
}
