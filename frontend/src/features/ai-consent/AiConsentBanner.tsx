"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api";
import { updateAiConsent } from "@/lib/api/ai";
import { useAuthUser } from "@/lib/auth";

/**
 * Lời mời đồng ý cá nhân hóa gợi ý, chỉ hiện với người đã đăng nhập và chưa
 * từng chọn. Mặc định không ghi nhận gì cho tới khi người dùng bấm "Đồng ý".
 */
export function AiConsentBanner() {
  const user = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.aiConsentDecided) {
    return null;
  }

  const choose = async (consent: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await updateAiConsent(consent);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không lưu được lựa chọn, vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ai-consent-banner" aria-labelledby="ai-consent-title">
      <div className="container ai-consent-inner">
        <div>
          <p id="ai-consent-title" className="ai-consent-title">Gợi ý dự án theo sở thích của bạn?</p>
          <p className="ai-consent-text">
            Nếu đồng ý, Góp Mầm sẽ ghi nhận các dự án bạn xem để gợi ý dự án phù hợp hơn. Chúng tôi không ghi nhận
            gì khi bạn chưa đồng ý, và bạn có thể tắt bất cứ lúc nào trong Trang quản lý (lịch sử đã ghi sẽ bị xóa).
          </p>
          {error && <p className="ai-consent-error" role="alert">{error}</p>}
        </div>
        <div className="ai-consent-actions">
          <button className="button button-primary button-sm" type="button" disabled={busy} onClick={() => void choose(true)}>
            Đồng ý
          </button>
          <button className="button button-ghost button-sm" type="button" disabled={busy} onClick={() => void choose(false)}>
            Không, cảm ơn
          </button>
        </div>
      </div>
    </section>
  );
}
