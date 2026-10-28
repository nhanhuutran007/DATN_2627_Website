"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";
import { fetchSupportMessages, type SupportMessage } from "@/lib/api/donations";
import { formatVnd } from "@/lib/format";
import { timeAgo } from "@/lib/time";

const PAGE_SIZE = 10;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: SupportMessage[]; total: number };

type WordsOfSupportProps = {
  campaignId: string;
  titleId: string;
  /** Chỉ mời ủng hộ khi chiến dịch còn nhận tiền. */
  open: boolean;
};

/**
 * "Lời động viên" (theo mẫu "Words of support" của GoFundMe): lời nhắn công khai
 * người ủng hộ để lại cùng khoản đã xác nhận, mới nhất trước, "Xem thêm" tải tiếp.
 */
export function WordsOfSupport({ campaignId, titleId, open }: WordsOfSupportProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchSupportMessages(campaignId, 0, PAGE_SIZE)
      .then((page) => {
        if (active) setState({ status: "ready", items: page.items, total: page.total });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof ApiError ? error.message : "Không tải được lời động viên.",
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
      const page = await fetchSupportMessages(campaignId, state.items.length, PAGE_SIZE);
      setState({ status: "ready", items: [...state.items, ...page.items], total: page.total });
    } catch {
      // Giữ danh sách hiện có; người dùng bấm lại được.
    } finally {
      setLoadingMore(false);
    }
  };

  const total = state.status === "ready" ? state.total : null;

  return (
    <>
      <h2 id={titleId}>
        Lời động viên
        {total !== null && total > 0 && <span className="section-count">{total}</span>}
      </h2>
      {open && <p className="section-lead">Hãy ủng hộ để gửi lời động viên tới dự án.</p>}

      {state.status === "loading" && <p className="hint" role="status">Đang tải lời động viên…</p>}
      {state.status === "error" && (
        <p className="form-error" role="alert">
          {state.message}{" "}
          <button className="link-inline" type="button" onClick={() => { setState({ status: "loading" }); setRequestKey((key) => key + 1); }}>
            Thử lại
          </button>
        </p>
      )}
      {state.status === "ready" && state.items.length === 0 && (
        <p className="hint">Chưa có lời động viên nào{open ? " — hãy là người đầu tiên." : "."}</p>
      )}
      {state.status === "ready" && state.items.length > 0 && (
        <>
          <ul className="support-list list-reveal">
            {state.items.map((item) => {
              const name = item.donorName ?? "Người ủng hộ ẩn danh";
              return (
                <li className="support-item" key={item.id}>
                  <span className="donor-avatar" aria-hidden="true">
                    {item.donorName ? name.charAt(0).toUpperCase() : <Icon name="heart" size={18} />}
                  </span>
                  <div className="support-body">
                    <b>{name}</b>
                    <span className="support-meta">
                      {formatVnd(item.amount)} · <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
                    </span>
                    <p>{item.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {state.items.length < state.total && (
            <button className="button button-outline section-more" type="button" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? "Đang tải…" : "Xem thêm"}
            </button>
          )}
        </>
      )}
    </>
  );
}
