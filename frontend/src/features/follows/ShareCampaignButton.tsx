"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";

type ShareCampaignButtonProps = {
  campaignId: string;
  title: string;
};

/**
 * Chia sẻ chiến dịch: dùng bảng chia sẻ của hệ điều hành nếu trình duyệt hỗ trợ
 * (điện thoại), nếu không thì sao chép liên kết; kèm nút chia sẻ Facebook.
 */
export function ShareCampaignButton({ campaignId, title }: ShareCampaignButtonProps) {
  const [message, setMessage] = useState("");

  const campaignUrl = () => `${window.location.origin}/du-an/${encodeURIComponent(campaignId)}`;

  const share = async () => {
    const url = campaignUrl();
    setMessage("");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: `Cùng ủng hộ dự án "${title}" trên Góp Mầm`, url });
        return;
      } catch (error) {
        // Người dùng tự đóng bảng chia sẻ: không cần báo gì.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Đã sao chép liên kết dự án.");
    } catch {
      setMessage(`Không sao chép tự động được. Liên kết: ${url}`);
    }
  };

  const openFacebook = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl())}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=640,height=560");
  };

  return (
    <div className="share-box">
      <div className="share-actions">
        <button className="button button-outline" type="button" onClick={share}>
          <Icon name="share" size={16} /> Chia sẻ
        </button>
        <button className="button button-ghost" type="button" onClick={openFacebook} aria-label="Chia sẻ lên Facebook (mở cửa sổ mới)">
          Facebook
        </button>
      </div>
      <p className="hint share-message" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
