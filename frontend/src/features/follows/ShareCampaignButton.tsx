"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";

type ShareCampaignButtonProps = {
  campaignId: string;
  title: string;
  className?: string;
  label?: string;
};

export type ShareChannel = {
  key: string;
  label: string;
  /** Biểu tượng: chữ viết tắt thương hiệu hoặc icon nét chung. */
  glyph: { text: string } | { icon: IconName };
  href: (url: string, text: string) => string;
};

export const SHARE_CHANNELS: ShareChannel[] = [
  { key: "facebook", label: "Facebook", glyph: { text: "f" }, href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { key: "x", label: "X", glyph: { text: "X" }, href: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { key: "linkedin", label: "LinkedIn", glyph: { text: "in" }, href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  { key: "telegram", label: "Telegram", glyph: { icon: "send" }, href: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { key: "whatsapp", label: "WhatsApp", glyph: { icon: "message" }, href: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
  { key: "email", label: "Email", glyph: { icon: "mail" }, href: (url, text) => `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n${url}`)}` },
];

/**
 * Nút "Chia sẻ" mở hộp "Chia sẻ nhanh" (theo mẫu GoFundMe): liên kết dự án kèm nút
 * sao chép, rồi các kênh mạng xã hội/email; thêm bảng chia sẻ của hệ điều hành nếu có.
 */
export function ShareCampaignButton({
  campaignId,
  title,
  className = "button button-outline",
  label = "Chia sẻ",
}: ShareCampaignButtonProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const text = `Cùng ủng hộ dự án "${title}" trên Góp Mầm`;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const show = () => {
    setUrl(`${window.location.origin}/du-an/${encodeURIComponent(campaignId)}`);
    setCanNativeShare(typeof navigator.share === "function");
    setCopied(false);
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Trình duyệt chặn clipboard: chọn sẵn liên kết để người dùng tự sao chép.
      document.getElementById(`${titleId}-link`)?.focus();
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Người dùng đóng bảng chia sẻ: không cần báo gì.
    }
  };

  return (
    <>
      <button className={className} type="button" onClick={show} aria-haspopup="dialog">
        <Icon name="share" size={16} /> {label}
      </button>
      <dialog
        ref={ref}
        className="app-dialog share-dialog"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="share-dialog-head">
          <h2 id={titleId}>Chia sẻ nhanh</h2>
          <button className="share-dialog-close" type="button" aria-label="Đóng" onClick={() => setOpen(false)}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="share-link">
          <label htmlFor={`${titleId}-link`}>Liên kết dự án</label>
          <input id={`${titleId}-link`} readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
          <button type="button" onClick={copy} aria-live="polite">
            <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Đã sao chép" : "Sao chép"}
          </button>
        </div>

        <div className="share-dialog-body">
          <h3>Tiếp cận thêm người ủng hộ</h3>
          <p>Mỗi lượt chia sẻ giúp dự án đến gần mục tiêu hơn — kể cả khi bạn chưa thể ủng hộ.</p>
          <ul className="share-channels">
            {SHARE_CHANNELS.map((channel) => (
              <li key={channel.key}>
                <a
                  className="share-channel"
                  href={channel.href(url, text)}
                  target={channel.key === "email" ? undefined : "_blank"}
                  rel="noopener noreferrer"
                >
                  <span className={`share-glyph share-glyph-${channel.key}`} aria-hidden="true">
                    {"text" in channel.glyph ? channel.glyph.text : <Icon name={channel.glyph.icon} size={20} />}
                  </span>
                  {channel.label}
                </a>
              </li>
            ))}
            {canNativeShare && (
              <li>
                <button className="share-channel" type="button" onClick={nativeShare}>
                  <span className="share-glyph" aria-hidden="true"><Icon name="share" size={20} /></span>
                  Ứng dụng khác
                </button>
              </li>
            )}
          </ul>
        </div>
      </dialog>
    </>
  );
}
