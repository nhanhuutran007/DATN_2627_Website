"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError, resolveMediaUrl } from "@/lib/api";
import { fetchCampaignUpdates, type ApiCampaignUpdate } from "@/lib/api/progress";
import { formatDateTime, formatVnd } from "@/lib/format";

const PAGE_SIZE = 5;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ApiCampaignUpdate[]; total: number };

/** Nhật ký tiến độ công khai: bài cập nhật theo mốc, khoản chi và chứng từ kèm theo. */
export function ProgressTimeline({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchCampaignUpdates(campaignId, 0, PAGE_SIZE)
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
  }, [campaignId, requestKey]);

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

  if (state.status === "loading") return <p className="hint" role="status">Đang tải nhật ký…</p>;
  if (state.status === "error") {
    return (
      <p className="form-error" role="alert">
        {state.message}{" "}
        <button className="link-inline" type="button" onClick={() => { setState({ status: "loading" }); setRequestKey((key) => key + 1); }}>
          Thử lại
        </button>
      </p>
    );
  }
  if (state.items.length === 0) {
    return <p className="hint">Chủ dự án chưa đăng cập nhật tiến độ nào.</p>;
  }

  return (
    <>
      <ol className="timeline">
        {state.items.map((update) => <TimelineItem key={update.id} update={update} />)}
      </ol>
      {state.items.length < state.total && (
        <button className="button button-outline button-sm timeline-more" type="button" disabled={loadingMore} onClick={loadMore}>
          {loadingMore ? "Đang tải…" : `Xem thêm (${state.total - state.items.length})`}
        </button>
      )}
    </>
  );
}

function TimelineItem({ update }: { update: ApiCampaignUpdate }) {
  const expense = Number(update.expenseAmount ?? 0);
  const receipts = update.attachments ?? [];
  return (
    <li className="timeline-item">
      <div className="timeline-meta">
        <span className="tag">{update.milestoneTitle || "Mốc công việc"}</span>
        {update.createdAt && <time dateTime={update.createdAt}>{formatDateTime(update.createdAt)}</time>}
      </div>
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
