"use client";

import { useEffect, useState } from "react";

import { ApiError, api, getStoredUser, updateStoredUser, type AuthUser } from "@/lib/api";
import { updateAiConsent } from "@/lib/api/ai";

type MeResponse = { aiTrackingConsent?: boolean; aiConsentUpdatedAt?: string | null };

/** Dòng công tắc đồng ý cá nhân hóa gợi ý AI ở trang Cài đặt › Tài khoản. */
export function AiConsentSettings({ user }: { user: AuthUser }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const enabled = Boolean(user.aiTrackingConsent);

  // Đồng bộ với server (lựa chọn có thể đã đổi ở thiết bị khác).
  useEffect(() => {
    let cancelled = false;
    api
      .get<MeResponse>("/users/me")
      .then((me) => {
        const stored = getStoredUser();
        if (cancelled || !stored) return;
        const consent = Boolean(me.aiTrackingConsent);
        const decided = me.aiConsentUpdatedAt != null;
        if (stored.aiTrackingConsent !== consent || stored.aiConsentDecided !== decided) {
          updateStoredUser({ ...stored, aiTrackingConsent: consent, aiConsentDecided: decided });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await updateAiConsent(!enabled);
      setMessage({
        tone: "ok",
        text: result.aiTrackingConsent
          ? "Đã bật gợi ý cá nhân hóa."
          : `Đã tắt gợi ý cá nhân hóa và xóa ${result.deletedEventCount.toLocaleString("vi-VN")} lượt ghi nhận hành vi.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof ApiError ? error.message : "Không lưu được lựa chọn, vui lòng thử lại.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="account-row" aria-labelledby="ai-consent-settings">
      <div className="account-row-main">
        <h2 id="ai-consent-settings" className="account-label">Gợi ý cá nhân hóa</h2>
        <p className="account-value" id="ai-consent-desc">
          Khi bật, các dự án bạn xem được ghi nhận để gợi ý dự án phù hợp hơn. Tắt đi sẽ xóa lịch sử đã ghi; gợi ý khi
          đó dựa trên độ phổ biến chung.
        </p>
        {message && (
          <p className={message.tone === "ok" ? "form-notice" : "form-error"} role="status">{message.text}</p>
        )}
      </div>
      <label className="account-switch">
        <input
          type="checkbox"
          role="switch"
          aria-labelledby="ai-consent-settings"
          aria-describedby="ai-consent-desc"
          checked={enabled}
          disabled={busy}
          onChange={() => void toggle()}
        />
        <span className="account-switch-track" aria-hidden="true" />
        <span className="sr-only">{enabled ? "Đang bật" : "Đang tắt"}</span>
      </label>
    </section>
  );
}
