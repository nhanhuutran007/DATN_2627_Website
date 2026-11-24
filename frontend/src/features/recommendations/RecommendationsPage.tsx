"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { fetchAiRecommendations, type AiRecommendationView, type AiRecommendSource } from "@/lib/api/ai";
import { spreadCategoryImages } from "@/lib/api/campaigns";
import { useAuthUser } from "@/lib/auth";

const SOURCE_LABEL: Record<AiRecommendSource, string> = {
  COLLABORATIVE: "dựa trên những người ủng hộ có quan tâm giống bạn",
  CONTENT: "dựa trên lĩnh vực bạn đã xem và ủng hộ",
  COLD_START: "theo các lĩnh vực được cộng đồng quan tâm nhiều (bạn chưa có nhiều hoạt động)",
  POPULAR_FALLBACK: "dịch vụ gợi ý tạm gián đoạn, đang hiện các dự án được ủng hộ nhiều",
};

type State = { status: "loading" } | { status: "error" } | { status: "ready"; data: AiRecommendationView };

/**
 * "Gợi ý cho bạn" (như Recommended for you của Kickstarter), mở từ menu tài khoản: các dự án
 * đang gây quỹ AI gợi ý, mỗi thẻ kèm lý do.
 */
export function RecommendationsPage() {
  const user = useAuthUser();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetchAiRecommendations({ limit: 12 })
      .then((data) => active && setState({ status: "ready", data }))
      .catch(() => active && setState({ status: "error" }));
    return () => {
      active = false;
    };
  }, [user?.id]);

  return (
    <main className="container recs-page">
      <header className="recs-head">
        <h1>Gợi ý cho bạn</h1>
        <p>
          Các dự án đang gây quỹ mà Góp Mầm nghĩ bạn sẽ quan tâm
          {state.status === "ready" && state.data.source ? `, ${SOURCE_LABEL[state.data.source]}` : ""}. Gợi ý chỉ để tham khảo.
        </p>
        {!user && (
          <p className="hint">
            <Link href="/dang-nhap?next=%2Fgoi-y-cho-ban">Đăng nhập</Link> để nhận gợi ý theo lĩnh vực bạn đã xem và ủng hộ.
          </p>
        )}
        {user && !user.aiTrackingConsent && (
          <p className="hint">
            Bật &quot;Cá nhân hóa gợi ý&quot; trong <Link href="/ho-so">Cài đặt tài khoản</Link> để gợi ý sát với bạn hơn.
          </p>
        )}
      </header>

      {state.status === "loading" && <p className="hint" role="status">Đang tìm dự án phù hợp…</p>}
      {state.status === "error" && <p className="form-error" role="alert">Chưa tải được gợi ý. Vui lòng thử lại sau.</p>}
      {state.status === "ready" && state.data.items.length === 0 && (
        <p className="hint">
          Hiện chưa có dự án đang gây quỹ để gợi ý. <Link href="/tim-kiem">Xem tất cả dự án</Link>.
        </p>
      )}
      {state.status === "ready" && state.data.items.length > 0 && (
        <div className="card-grid results-enter">
          {spreadCategoryImages(state.data.items.map((item) => item.campaign)).map((campaign) => (
            <CampaignCard campaign={campaign} key={campaign.slug} showAiReason />
          ))}
        </div>
      )}
    </main>
  );
}
