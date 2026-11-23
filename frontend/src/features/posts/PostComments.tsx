"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { ApiError } from "@/lib/api";
import { COMMENT_MAX, deleteComment, updateComment, type CampaignCommentView } from "@/lib/api/comments";
import { fetchPostComments, postPostComment, type ApiPost } from "@/lib/api/posts";
import { useAuthUser, type AuthUser } from "@/lib/auth";
import { timeAgo } from "@/lib/time";

const PAGE_SIZE = 10;

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (err.status === 429) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    return err.message;
  }
  return fallback;
}

type ComposerProps = {
  postId: string;
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
  onPosted: (comment: CampaignCommentView) => void;
  onCancel?: () => void;
};

function Composer({ postId, parentId, placeholder, autoFocus, onPosted, onCancel }: ComposerProps) {
  const id = useId();
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
      const posted = await postPostComment(postId, { content: content.trim(), ...(parentId ? { parentId } : {}) });
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
      <label className="sr-only" htmlFor={`${id}-content`}>{parentId ? "Nội dung trả lời" : "Nội dung bình luận"}</label>
      <textarea
        id={`${id}-content`}
        rows={parentId ? 2 : 3}
        maxLength={COMMENT_MAX}
        placeholder={placeholder}
        value={content}
        autoFocus={autoFocus}
        onChange={(event) => setContent(event.target.value)}
      />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="comment-composer-actions">
        <span className="hint">{length}/{COMMENT_MAX}</span>
        {onCancel && <button className="button button-ghost button-sm" type="button" onClick={onCancel}>Huỷ</button>}
        <button className="button button-primary button-sm" type="submit" disabled={busy || length < 2}>
          {busy ? "Đang gửi…" : parentId ? "Trả lời" : "Gửi bình luận"}
        </button>
      </div>
    </form>
  );
}

type EditFormProps = {
  commentId: string;
  initial: string;
  onSaved: (saved: { content: string; editedAt: string | null }) => void;
  onCancel: () => void;
};

/** Sửa bình luận của mình ngay tại chỗ. */
function EditForm({ commentId, initial, onSaved, onCancel }: EditFormProps) {
  const id = useId();
  const [content, setContent] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const length = content.trim().length;
  const unchanged = content.trim() === initial.trim();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (length < 2 || busy) return;
    if (unchanged) {
      onCancel();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await updateComment(commentId, content.trim());
      onSaved(saved);
    } catch (err) {
      setError(errorText(err, "Không lưu được. Vui lòng thử lại."));
      setBusy(false);
    }
  };

  return (
    <form className="comment-composer is-edit" onSubmit={submit}>
      <label className="sr-only" htmlFor={`${id}-edit`}>Sửa bình luận</label>
      <textarea
        id={`${id}-edit`}
        rows={3}
        maxLength={COMMENT_MAX}
        value={content}
        autoFocus
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
      />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="comment-composer-actions">
        <span className="hint">{length}/{COMMENT_MAX}</span>
        <button className="button button-ghost button-sm" type="button" onClick={onCancel}>Huỷ</button>
        <button className="button button-primary button-sm" type="submit" disabled={busy || length < 2}>
          {busy ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
    </form>
  );
}

type ItemProps = {
  comment: CampaignCommentView;
  post: ApiPost;
  user: AuthUser | null;
  isReply?: boolean;
  onReplyPosted?: (reply: CampaignCommentView) => void;
  onDeleted: (id: string) => void;
};

function CommentItem({ comment, post, user, isReply, onReplyPosted, onDeleted }: ItemProps) {
  const dialog = useDialog();
  const [replying, setReplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  // Nội dung sau khi người viết sửa (danh sách cha không phải tải lại).
  const [content, setContent] = useState(comment.content);
  const [editedAt, setEditedAt] = useState(comment.editedAt ?? null);
  const [editing, setEditing] = useState(false);
  const mine = user?.id === comment.author.id;
  const isAdminViewer = user?.role === "admin";
  // Trả lời: người quản lý bài (chủ dự án, quản trị viên, đội ngũ). Người viết thì sửa bình luận của mình.
  const canReply = !isReply && post.canReply;

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
    <article className={`comment ${isReply ? "is-reply" : ""} ${comment.isOwner || comment.isAdmin ? "is-owner" : ""}`} aria-label={`Bình luận của ${comment.author.name}`}>
      <span className="comment-avatar" aria-hidden="true">{comment.author.name.charAt(0).toUpperCase()}</span>
      <div className="comment-body">
        <header className="comment-meta">
          <b>{comment.author.name}</b>
          {comment.isOwner && <span className="tag tag-green">Chủ dự án</span>}
          {comment.isAdmin && <span className="tag tag-blue">Quản trị viên</span>}
          <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
          {editedAt && <span className="comment-edited" title={`Sửa lúc ${new Date(editedAt).toLocaleString("vi-VN")}`}>(đã chỉnh sửa)</span>}
        </header>
        {editing ? (
          <EditForm
            commentId={comment.id}
            initial={content}
            onSaved={(saved) => {
              setContent(saved.content);
              setEditedAt(saved.editedAt);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <p className="comment-text">{content}</p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!editing && (canReply || mine || isAdminViewer) && (
          <div className="comment-actions">
            {canReply && (
              <button type="button" className="link-button" onClick={() => setReplying((value) => !value)}>
                Trả lời
              </button>
            )}
            {mine && (
              <button type="button" className="link-button" onClick={() => { setEditing(true); setReplying(false); setError(""); }}>
                Chỉnh sửa
              </button>
            )}
            {(mine || isAdminViewer) && (
              <button type="button" className="link-button" disabled={deleting} onClick={remove}>{deleting ? "Đang xóa…" : "Xóa"}</button>
            )}
          </div>
        )}
        {replying && onReplyPosted && (
          <Composer
            postId={post.id}
            parentId={comment.id}
            placeholder={`Trả lời ${comment.author.name}…`}
            autoFocus
            onPosted={(reply) => {
              onReplyPosted(reply);
              setReplying(false);
            }}
            onCancel={() => setReplying(false)}
          />
        )}
        {comment.replies.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} post={post} user={user} isReply onDeleted={onDeleted} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

type PostCommentsProps = {
  post: ApiPost;
  /** Báo số bình luận thay đổi (để cập nhật nút "Bình luận (N)" trên bài). */
  onCountChange: (delta: number) => void;
};

/**
 * Bình luận dưới bài cập nhật: chỉ người đã ủng hộ viết bình luận; chủ dự án, quản trị viên
 * (và đội ngũ tổ chức có quyền đăng bài) trả lời. Người viết hỏi thêm được trong luồng của mình.
 */
export function PostComments({ post, onCountChange }: PostCommentsProps) {
  const user = useAuthUser();
  const [items, setItems] = useState<CampaignCommentView[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchPostComments(post.id, 0, PAGE_SIZE)
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setTotal(page.total);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [post.id, reloadKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await fetchPostComments(post.id, items.length, PAGE_SIZE);
      setItems((current) => [...current, ...page.items]);
      setTotal(page.total);
    } catch {
      // Giữ danh sách hiện có; bấm lại được.
    } finally {
      setLoadingMore(false);
    }
  };

  const addRoot = (comment: CampaignCommentView) => {
    setItems((current) => [comment, ...current]);
    setTotal((value) => value + 1);
    onCountChange(1);
  };
  const addReply = (rootId: string) => (reply: CampaignCommentView) => {
    setItems((current) => current.map((item) => (item.id === rootId ? { ...item, replies: [...item.replies, reply] } : item)));
    onCountChange(1);
  };
  const removeComment = (id: string) => {
    const root = items.find((item) => item.id === id);
    // Xóa bình luận gốc thì các trả lời bên dưới cũng không còn hiển thị.
    const removed = root ? 1 + root.replies.length : 1;
    setItems((current) =>
      current
        .filter((item) => item.id !== id)
        .map((item) => ({ ...item, replies: item.replies.filter((reply) => reply.id !== id) })),
    );
    if (root) setTotal((value) => Math.max(0, value - 1));
    onCountChange(-removed);
  };

  const loginHref = `/dang-nhap?next=${encodeURIComponent(`/du-an/${post.campaignId}#cap-nhat-${post.number}`)}`;
  let composerArea;
  if (post.canComment) {
    composerArea = <Composer postId={post.id} placeholder="Viết bình luận cho người tổ chức…" onPosted={addRoot} />;
  } else if (!user) {
    composerArea = (
      <p className="comment-login">
        <Link href={loginHref}>Đăng nhập</Link> nếu bạn đã ủng hộ dự án để bình luận bài cập nhật.
      </p>
    );
  } else if (!post.canReply) {
    composerArea = (
      <p className="comment-login">
        Chỉ người đã ủng hộ mới bình luận được bài cập nhật.{" "}
        <Link href={`/du-an/${encodeURIComponent(post.campaignId)}/ung-ho`}>Ủng hộ dự án</Link>
      </p>
    );
  }

  return (
    <div className="comments post-comments">
      {composerArea}
      {state === "loading" && <p className="hint" role="status">Đang tải bình luận…</p>}
      {state === "error" && (
        <p className="form-error" role="alert">
          Không tải được bình luận.{" "}
          <button className="link-button" type="button" onClick={() => { setState("loading"); setReloadKey((k) => k + 1); }}>Thử lại</button>
        </p>
      )}
      {state === "ready" && items.length === 0 && (
        <p className="hint">{post.canReply ? "Chưa có người ủng hộ nào bình luận bài này." : "Chưa có bình luận nào."}</p>
      )}
      {items.length > 0 && (
        <div className="comment-list">
          {items.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              post={post}
              user={user}
              onReplyPosted={addReply(comment.id)}
              onDeleted={removeComment}
            />
          ))}
        </div>
      )}
      {state === "ready" && items.length < total && (
        <button className="button button-outline button-sm" type="button" disabled={loadingMore} onClick={loadMore}>
          {loadingMore ? "Đang tải…" : `Xem thêm ${total - items.length} bình luận`}
        </button>
      )}
    </div>
  );
}
