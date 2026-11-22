"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError, resolveMediaUrl } from "@/lib/api";
import { useAuthUser } from "@/lib/auth";
import { fetchCampaignPosts, likePost, unlikePost, type ApiPost } from "@/lib/api/posts";
import { formatDateTime, formatDay } from "@/lib/format";

import { PostComments } from "./PostComments";

const PAGE_SIZE = 5;
/** Bài dài hơn chừng này ký tự được thu gọn, bấm "Đọc tiếp" để mở. */
const COLLAPSE_AT = 600;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ApiPost[]; total: number };

type CampaignPostsProps = {
  campaignId: string;
  organizer: string;
  heading: { id: string; title: string };
  initialSize?: number;
};

/** Bảng tin "Cập nhật" của chiến dịch: bài đăng đánh số, có bài riêng cho người ủng hộ. */
export function CampaignPosts({ campaignId, organizer, heading, initialSize = 2 }: CampaignPostsProps) {
  const user = useAuthUser();
  const [state, setState] = useState<State>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [requestKey, setRequestKey] = useState(0);

  // Tải lại khi đăng nhập/đăng xuất: bài riêng mở/khóa theo người xem.
  const userId = user?.id ?? null;
  useEffect(() => {
    let active = true;
    fetchCampaignPosts(campaignId, 0, initialSize)
      .then((page) => {
        if (active) setState({ status: "ready", items: page.items, total: page.total });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: error instanceof ApiError ? error.message : "Không tải được bài cập nhật." });
      });
    return () => {
      active = false;
    };
  }, [campaignId, initialSize, requestKey, userId]);

  const loadMore = async () => {
    if (state.status !== "ready") return;
    setLoadingMore(true);
    try {
      const page = await fetchCampaignPosts(campaignId, state.items.length, PAGE_SIZE);
      setState({ status: "ready", items: [...state.items, ...page.items], total: page.total });
    } catch {
      // Giữ danh sách hiện có; bấm lại được.
    } finally {
      setLoadingMore(false);
    }
  };

  const replace = (next: ApiPost) =>
    setState((current) =>
      current.status === "ready" ? { ...current, items: current.items.map((item) => (item.id === next.id ? next : item)) } : current,
    );

  const total = state.status === "ready" ? state.total : 0;
  let body: ReactNode;
  if (state.status === "loading") {
    body = <p className="hint" role="status">Đang tải bài cập nhật…</p>;
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
    body = <p className="hint">Người tổ chức chưa đăng bài cập nhật nào.</p>;
  } else {
    const remaining = state.total - state.items.length;
    body = (
      <>
        <ol className="post-feed list-reveal">
          {state.items.map((post) => (
            <PostCard key={post.id} post={post} campaignId={campaignId} organizer={organizer} signedIn={Boolean(user)} onChange={replace} />
          ))}
        </ol>
        {remaining > 0 && (
          <button className="button button-outline section-more" type="button" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? "Đang tải…" : `Xem thêm ${remaining} bài cập nhật`}
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <h2 id={heading.id}>
        {heading.title}
        {total > 0 && <span className="section-count">{total}</span>}
      </h2>
      {body}
    </>
  );
}

type PostCardProps = {
  post: ApiPost;
  campaignId: string;
  organizer: string;
  signedIn: boolean;
  onChange: (post: ApiPost) => void;
};

function PostCard({ post, campaignId, organizer, signedIn, onChange }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const long = (post.content?.length ?? 0) > COLLAPSE_AT;
  const shown = post.content && long && !expanded ? `${post.content.slice(0, COLLAPSE_AT).trimEnd()}…` : post.content;
  const loginHref = `/dang-nhap?next=${encodeURIComponent(`/du-an/${campaignId}#cap-nhat`)}`;

  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const next = post.liked ? await unlikePost(post.id) : await likePost(post.id);
      onChange({ ...post, ...next });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thực hiện được. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="post-card" id={`cap-nhat-${post.number}`}>
      <p className="post-number">
        Cập nhật #{post.number}
        {post.visibility === "backers" && <span className="post-badge">Dành cho người ủng hộ</span>}
      </p>
      <h3 className="post-title">{post.title}</h3>
      <div className="post-head">
        <span className="organizer-avatar" aria-hidden="true">{organizer.charAt(0).toUpperCase()}</span>
        <div>
          <span>{organizer} · Người tổ chức</span>
          <time dateTime={post.createdAt} title={formatDateTime(post.createdAt)}>
            {formatDay(post.createdAt)}
            {post.editedAt && <span className="post-edited"> · đã chỉnh sửa</span>}
          </time>
        </div>
      </div>

      {post.locked ? (
        <div className="post-locked">
          <Icon name="shield" size={20} />
          <div>
            <p><b>Bài này chỉ dành cho người ủng hộ.</b></p>
            <p className="hint">
              {signedIn ? "Ủng hộ dự án để đọc các bài cập nhật riêng của người tổ chức." : "Đăng nhập nếu bạn đã ủng hộ, hoặc ủng hộ để đọc bài này."}
            </p>
            <div className="post-locked-actions">
              <Link className="button button-primary button-sm" href={`/du-an/${encodeURIComponent(campaignId)}/ung-ho`}>Ủng hộ dự án</Link>
              {!signedIn && <Link className="button button-outline button-sm" href={loginHref}>Đăng nhập</Link>}
            </div>
          </div>
        </div>
      ) : (
        <>
          {post.imageUrl && (
            <div className="timeline-photo post-photo">
              <Image src={resolveMediaUrl(post.imageUrl)} alt={`Ảnh của bài cập nhật #${post.number}`} fill sizes="(max-width: 700px) 100vw, 640px" unoptimized />
            </div>
          )}
          <div className="post-body">
            {shown?.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
          {long && (
            <button className="link-inline" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Thu gọn" : "Đọc tiếp"}
            </button>
          )}
        </>
      )}

      <div className="post-actions">
        {signedIn ? (
          <button
            className={post.liked ? "post-like is-liked" : "post-like"}
            type="button"
            aria-pressed={post.liked}
            disabled={busy || post.locked}
            onClick={toggleLike}
          >
            <Icon name="heart" size={16} /> {post.liked ? "Đã thích" : "Thích"}
            {post.likeCount > 0 && <span className="num"> · {post.likeCount}</span>}
          </button>
        ) : (
          <span className="post-like-count">
            <Icon name="heart" size={16} /> {post.likeCount} lượt thích · <Link href={loginHref}>Đăng nhập</Link> để thích
          </span>
        )}
        {!post.locked && (
          <button
            className={commentsOpen ? "post-like is-liked" : "post-like"}
            type="button"
            aria-expanded={commentsOpen}
            aria-controls={`binh-luan-${post.id}`}
            onClick={() => setCommentsOpen((value) => !value)}
          >
            <Icon name="message" size={16} /> Bình luận
            {post.commentCount > 0 && <span className="num"> · {post.commentCount}</span>}
          </button>
        )}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {commentsOpen && !post.locked && (
        <div id={`binh-luan-${post.id}`}>
          <PostComments post={post} onCountChange={(delta) => onChange({ ...post, commentCount: Math.max(0, post.commentCount + delta) })} />
        </div>
      )}
    </li>
  );
}
