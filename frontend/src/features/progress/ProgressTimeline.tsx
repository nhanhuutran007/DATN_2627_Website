"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError, resolveMediaUrl } from "@/lib/api";
import { fetchCampaignUpdates, type ApiCampaignUpdate } from "@/lib/api/progress";
import { formatDateTime, formatDay, formatVnd } from "@/lib/format";

const PAGE_SIZE = 5;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ApiCampaignUpdate[]; total: number };

type ProgressTimelineProps = {
  campaignId: string;
  /** Số cập nhật tải lần đầu (trang chiến dịch dùng 3 cho gọn); "Xem thêm" tải tiếp từng PAGE_SIZE. */
  initialSize?: number;
  /** Trang chiến dịch: tiêu đề mục kèm số bài (kiểu "Updates" của GoFundMe). */
  heading?: { id: string; title: string };
  /** Có tên người tổ chức → mỗi bài hiện như bài đăng: avatar, ngày, "Tên · Người tổ chức". */
  organizer?: string;
};

/** Nhật ký tiến độ công khai: bài cập nhật theo mốc, khoản chi và chứng từ kèm theo. */
export function ProgressTimeline({ campaignId, initialSize = PAGE_SIZE, heading, organizer }: ProgressTimelineProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchCampaignUpdates(campaignId, 0, initialSize)
      .then((page) => {
        if (active) setState({ status: "ready", items: page.items, total: page.total });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof ApiError ? error.message : "Không tải được nhật ký tiến độ.",
        });
      });
    return () => {
      active = false;
    };
  }, [campaignId, initialSize, requestKey]);

  const loadMore = async () => {
    if (state.status !== "ready") return;
    setLoadingMore(true);
    try {
      const page = await fetchCampaignUpdates(campaignId, state.items.length, PAGE_SIZE);
      setState({ status: "ready", items: [...state.items, ...page.items], total: page.total });
    } catch {
      // Giữ danh sách hiện có; người dùng bấm lại được.
    } finally {
      setLoadingMore(false);
    }
  };

  const total = state.status === "ready" ? state.total : 0;
  const title = heading && (
    <h2 id={heading.id}>
      {heading.title}
      {total > 0 && <span className="section-count">{total}</span>}
    </h2>
  );

  let body: ReactNode;
  if (state.status === "loading") {
    body = <p className="hint" role="status">Đang tải nhật ký…</p>;
  } else if (state.status === "error") {
    body = (
      <p className="form-error" role="alert">
        {state.message}{" "}
        <button className="link-inline" type="button" onClick={() => { setState({ status: "loading" }); setRequestKey((key) => key + 1); }}>
          Thử lại
        </button>
      </p>
    );
  } else if (state.items.length === 0) {
    body = <p className="hint">Chủ dự án chưa đăng cập nhật tiến độ nào.</p>;
  } else {
    const remaining = state.total - state.items.length;
    body = (
      <>
        <ol className={organizer ? "timeline timeline-posts list-reveal" : "timeline list-reveal"}>
          {state.items.map((update) => <TimelineItem key={update.id} update={update} organizer={organizer} />)}
        </ol>
        {remaining > 0 && (
          <button
            className={organizer ? "button button-outline section-more" : "button button-outline button-sm timeline-more"}
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? "Đang tải…" : organizer ? `Xem thêm ${remaining} cập nhật` : `Xem thêm (${remaining})`}
          </button>
        )}
      </>
    );
  }

  return (
    <>
      {title}
      {body}
    </>
  );
}

function TimelineItem({ update, organizer }: { update: ApiCampaignUpdate; organizer?: string }) {
  const expense = Number(update.expenseAmount ?? 0);
  const receipts = update.attachments ?? [];
  return (
    <li className="timeline-item">
      {organizer ? (
        <div className="post-head">
          <span className="organizer-avatar" aria-hidden="true">{organizer.charAt(0).toUpperCase()}</span>
          <div>
            {update.createdAt && <time dateTime={update.createdAt} title={formatDateTime(update.createdAt)}>{formatDay(update.createdAt)}</time>}
            <span>{organizer} · Người tổ chức · {update.milestoneTitle || "Mốc công việc"}</span>
          </div>
        </div>
      ) : (
        <div className="timeline-meta">
          <span className="tag">{update.milestoneTitle || "Mốc công việc"}</span>
          {update.createdAt && <time dateTime={update.createdAt}>{formatDateTime(update.createdAt)}</time>}
        </div>
      )}
      <p className="timeline-content">{update.content}</p>
      {update.imageUrl && (
        <div className="timeline-photo">
          <Image src={resolveMediaUrl(update.imageUrl)} alt="Ảnh hiện trường của bài cập nhật" fill sizes="(max-width: 700px) 100vw, 560px" unoptimized />
        </div>
      )}
      {expense > 0 && (
        <div className="timeline-expense">
          <p>
            <Icon name="receipt" size={16} /> Khoản chi: <b className="num">{formatVnd(expense)}</b>
            <span className="hint"> · {receipts.length} chứng từ</span>
          </p>
          {receipts.length > 0 && (
            <ul className="expense-receipts">
              {receipts.map((receipt, index) => (
                <li key={receipt.id}>
                  <a href={resolveMediaUrl(receipt.url)} target="_blank" rel="noopener noreferrer" aria-label={`Mở chứng từ ${index + 1}${receipt.caption ? `: ${receipt.caption}` : ""} trong tab mới`}>
                    <span className="expense-thumb">
                      <Image src={resolveMediaUrl(receipt.url)} alt="" fill sizes="120px" unoptimized />
                    </span>
                    {receipt.caption && <span className="expense-caption">{receipt.caption}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
