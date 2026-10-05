"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";
import {
  COMMENT_MAX,
  deleteComment,
  fetchComments,
  postComment,
  type CampaignCommentView,
  type CommentKind,
} from "@/lib/api/comments";
import { REPORT_REASON_LABEL, submitReport, type ReportReason } from "@/lib/api/reports";
import { useAuthUser, type AuthUser } from "@/lib/auth";
import { timeAgo } from "@/lib/time";

const PAGE_SIZE = 10;

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (err.status === 409) return "Bạn đã có một báo cáo đang chờ xử lý cho bình luận này.";
    if (err.status === 429) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    return err.message;
  }
  return fallback;
}

type ComposerProps = {
  campaignId: string;
  parentId?: string;
  autoFocus?: boolean;
  onPosted: (comment: CampaignCommentView) => void;
  onCancel?: () => void;
};

function Composer({ campaignId, parentId, autoFocus, onPosted, onCancel }: ComposerProps) {
  const id = useId();
  const [kind, setKind] = useState<CommentKind>("question");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const length = content.trim().length;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (length < 2 || busy) return;
    setBusy(true);
    setError("");
    try {
      const posted = await postComment(campaignId, { content: content.trim(), ...(parentId ? { parentId } : { kind }) });
      setContent("");
      onPosted(posted);
    } catch (err) {
      setError(errorText(err, "Không gửi được. Vui lòng thử lại."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`comment-composer ${parentId ? "is-reply" : ""}`} onSubmit={submit}>
      {!parentId && (
        <div className="comment-kind" role="radiogroup" aria-label="Loại nội dung">
          {(["question", "comment"] as CommentKind[]).map((value) => (
            <label key={value} className={kind === value ? "is-active" : ""}>
              <input type="radio" name={`${id}-kind`} value={value} checked={kind === value} onChange={() => setKind(value)} />
              {value === "question" ? "Đặt câu hỏi" : "Bình luận"}
            </label>
          ))}
        </div>
      )}
      <label className="sr-only" htmlFor={`${id}-content`}>{parentId ? "Nội dung trả lời" : "Nội dung"}</label>
      <textarea
        id={`${id}-content`}
        rows={parentId ? 2 : 3}
        maxLength={COMMENT_MAX}
        value={content}
        autoFocus={autoFocus}
        placeholder={parentId ? "Viết câu trả lời…" : kind === "question" ? "Bạn muốn hỏi chủ dự án điều gì?" : "Chia sẻ suy nghĩ của bạn về dự án…"}
        onChange={(e) => setContent(e.target.value)}
      />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="comment-composer-actions">
        <small>{length}/{COMMENT_MAX}</small>
        {onCancel && <button className="button button-ghost button-sm" type="button" onClick={onCancel}>Huỷ</button>}
        <button className="button button-primary button-sm" type="submit" disabled={busy || length < 2}>
          {busy ? "Đang gửi…" : parentId ? "Trả lời" : "Gửi"}
        </button>
      </div>
    </form>
  );
}

function ReportCommentForm({ campaignId, commentId, onDone }: { campaignId: string; commentId: string; onDone: () => void }) {
  const id = useId();
  const [reason, setReason] = useState<ReportReason>("inappropriate");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const tooShort = description.trim().length < 10;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (tooShort || busy) return;
    setBusy(true);
    setError("");
    try {
      await submitReport({ campaignId, commentId, reason, description: description.trim() });
      setSent(true);
    } catch (err) {
      setError(errorText(err, "Không gửi được báo cáo."));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="comment-report" role="status">
        <p className="report-success"><Icon name="check" size={16} /> Đã gửi báo cáo. Quản trị viên sẽ xem xét; bình luận không bị ẩn tự động.</p>
        <button className="button button-outline button-sm" type="button" onClick={onDone}>Đóng</button>
      </div>
    );
  }

  return (
    <form className="comment-report" onSubmit={submit} noValidate>
      <label className="form-field">
        <span>Lý do</span>
        <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
          {(Object.keys(REPORT_REASON_LABEL) as ReportReason[]).map((value) => (
            <option key={value} value={value}>{REPORT_REASON_LABEL[value]}</option>
          ))}
        </select>
      </label>
      <label className="form-field" htmlFor={`${id}-desc`}>
        <span>Mô tả (tối thiểu 10 ký tự)</span>
        <textarea id={`${id}-desc`} rows={2} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="comment-composer-actions">
        <button className="button button-ghost button-sm" type="button" onClick={onDone}>Huỷ</button>
        <button className="button button-primary button-sm" type="submit" disabled={busy || tooShort}>{busy ? "Đang gửi…" : "Gửi báo cáo"}</button>
      </div>
    </form>
  );
}

type ItemProps = {
  comment: CampaignCommentView;
  campaignId: string;
  user: AuthUser | null;
  isReply?: boolean;
  onReplyPosted?: (reply: CampaignCommentView) => void;
  onDeleted: (id: string) => void;
};

function CommentItem({ comment, campaignId, user, isReply, onReplyPosted, onDeleted }: ItemProps) {
  const [mode, setMode] = useState<"none" | "reply" | "report">("none");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const mine = user?.id === comment.author.id;
  const dialog = useDialog();

  const remove = async () => {
    const ok = await dialog.confirm({
      title: "Xóa bình luận?",
      message: "Bình luận và các trả lời bên dưới sẽ không còn hiển thị. Thao tác không hoàn tác được.",
      confirmLabel: "Xóa bình luận",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteComment(comment.id);
      onDeleted(comment.id);
    } catch (err) {
      setError(errorText(err, "Không xóa được bình luận."));
      setDeleting(false);
    }
  };

  return (
    <article className={`comment ${isReply ? "is-reply" : ""} ${comment.isOwner ? "is-owner" : ""}`} aria-label={`${comment.kind === "question" ? "Câu hỏi" : "Bình luận"} của ${comment.author.name}`}>
      <span className="comment-avatar" aria-hidden="true">{comment.author.name.charAt(0).toUpperCase()}</span>
      <div className="comment-body">
        <header className="comment-meta">
          <b>{comment.author.name}</b>
          {comment.isOwner && <span className="tag tag-green">Chủ dự án</span>}
          {comment.kind === "question" && <span className="tag">Câu hỏi</span>}
          <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
        </header>
        <p className="comment-text">{comment.content}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {user && (
          <div className="comment-actions">
            {!isReply && <button type="button" className="link-button" onClick={() => setMode(mode === "reply" ? "none" : "reply")}>Trả lời</button>}
            {mine ? (
              <button type="button" className="link-button" disabled={deleting} onClick={remove}>{deleting ? "Đang xóa…" : "Xóa"}</button>
            ) : (
              <button type="button" className="link-button" onClick={() => setMode(mode === "report" ? "none" : "report")}>Báo cáo</button>
            )}
          </div>
        )}
        {mode === "reply" && onReplyPosted && (
          <Composer
            campaignId={campaignId}
            parentId={comment.id}
            autoFocus
            onPosted={(reply) => { onReplyPosted(reply); setMode("none"); }}
            onCancel={() => setMode("none")}
          />
        )}
        {mode === "report" && <ReportCommentForm campaignId={campaignId} commentId={comment.id} onDone={() => setMode("none")} />}
        {comment.replies.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} campaignId={campaignId} user={user} isReply onDeleted={onDeleted} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

type LoadState = "loading" | "ready" | "error";

/** Hỏi đáp & bình luận công khai trên trang chiến dịch. */
export function CampaignComments({ campaignId }: { campaignId: string }) {
  const user = useAuthUser();
  const [items, setItems] = useState<CampaignCommentView[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchComments(campaignId, 0, PAGE_SIZE)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, reloadKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await fetchComments(campaignId, items.length, PAGE_SIZE);
      setItems((prev) => [...prev, ...page.items.filter((c) => !prev.some((p) => p.id === c.id))]);
      setTotal(page.total);
    } catch {
      setState("error");
    } finally {
      setLoadingMore(false);
    }
  };

  const removeById = (id: string) => {
    setItems((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== id) })),
    );
    setTotal((t) => (items.some((c) => c.id === id) ? Math.max(0, t - 1) : t));
  };

  return (
    <div className="comments">
      {user ? (
        <Composer
          campaignId={campaignId}
          onPosted={(comment) => {
            setItems((prev) => [comment, ...prev]);
            setTotal((t) => t + 1);
          }}
        />
      ) : (
        <p className="comment-login">
          <Link href={`/dang-nhap?next=/du-an/${encodeURIComponent(campaignId)}`}>Đăng nhập</Link> để đặt câu hỏi hoặc bình luận.
        </p>
      )}

      {state === "loading" && <p className="hint" role="status">Đang tải bình luận…</p>}
      {state === "error" && (
        <p className="form-error" role="alert">
          Không tải được bình luận.{" "}
          <button className="link-button" type="button" onClick={() => { setState("loading"); setReloadKey((k) => k + 1); }}>Thử lại</button>
        </p>
      )}
      {state === "ready" && items.length === 0 && <p className="hint">Chưa có câu hỏi hay bình luận nào. Hãy là người đầu tiên!</p>}

      {items.length > 0 && (
        <div className="comment-list">
          {items.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              campaignId={campaignId}
              user={user}
              onDeleted={removeById}
              onReplyPosted={(reply) =>
                setItems((prev) => prev.map((c) => (c.id === comment.id ? { ...c, replies: [...c.replies, reply] } : c)))
              }
            />
          ))}
        </div>
      )}

      {state === "ready" && items.length < total && (
        <div className="notification-more">
          <button className="button button-outline button-sm" type="button" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? "Đang tải…" : `Xem thêm (${total - items.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
