"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { ImageUploader } from "@/features/media/ImageUploader";
import { ApiError } from "@/lib/api";
import {
  createPost,
  deletePost,
  fetchCampaignPosts,
  POST_CONTENT_MAX,
  POST_CONTENT_MIN,
  POST_TITLE_MAX,
  updatePost,
  type ApiPost,
  type PostInput,
  type PostVisibility,
} from "@/lib/api/posts";
import { formatDay } from "@/lib/format";

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (err.status === 429) return "Bạn đăng bài quá nhanh. Vui lòng thử lại sau.";
    return err.message;
  }
  return fallback;
}

const EMPTY: PostInput = { title: "", content: "", imageUrl: "", visibility: "public" };

/** Chủ dự án soạn, sửa, xóa bài cập nhật ("Cập nhật #N") trong bảng điều khiển. */
export function PostManager({ campaignId }: { campaignId: string }) {
  const dialog = useDialog();
  const [posts, setPosts] = useState<ApiPost[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<ApiPost | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let active = true;
    fetchCampaignPosts(campaignId, 0, 50)
      .then((page) => {
        if (!active) return;
        setPosts(page.items);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (active) setLoadError(errorText(err, "Không tải được bài cập nhật."));
      });
    return () => {
      active = false;
    };
  }, [campaignId, reloadKey]);

  const remove = async (post: ApiPost) => {
    const ok = await dialog.confirm({
      title: `Xóa "Cập nhật #${post.number}"?`,
      message: "Bài và lượt thích sẽ bị xóa vĩnh viễn. Số thứ tự của các bài khác giữ nguyên.",
      confirmLabel: "Xóa bài",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deletePost(post.id);
      if (editing?.id === post.id) setEditing(null);
      reload();
    } catch (err) {
      setLoadError(errorText(err, "Không xóa được bài."));
    }
  };

  return (
    <div className="post-manager">
      <PostForm
        key={editing?.id ?? "new"}
        initial={editing ?? undefined}
        onCancel={editing ? () => setEditing(null) : undefined}
        onSubmit={async (input) => {
          if (editing) await updatePost(editing.id, input);
          else await createPost(campaignId, input);
          setEditing(null);
          reload();
        }}
      />

      <div className="post-manager-list">
        <h3>Bài đã đăng</h3>
        {loadError && <p className="form-error" role="alert">{loadError}</p>}
        {posts === null && !loadError && <p className="hint" role="status">Đang tải…</p>}
        {posts?.length === 0 && <p className="hint">Chưa có bài nào. Bài đầu tiên sẽ là “Cập nhật #1”.</p>}
        {posts && posts.length > 0 && (
          <ul>
            {posts.map((post) => (
              <li key={post.id}>
                <div>
                  <b>#{post.number} · {post.title}</b>
                  <span className="hint">
                    {formatDay(post.createdAt)} · {post.visibility === "backers" ? "Chỉ người ủng hộ" : "Công khai"} · {post.likeCount} lượt thích
                  </span>
                </div>
                <div className="post-manager-actions">
                  <button className="button button-ghost button-sm" type="button" onClick={() => setEditing(post)}>Sửa</button>
                  <button className="button button-ghost button-sm" type="button" onClick={() => remove(post)}>Xóa</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type PostFormProps = {
  initial?: ApiPost;
  onSubmit: (input: PostInput) => Promise<void>;
  onCancel?: () => void;
};

function PostForm({ initial, onSubmit, onCancel }: PostFormProps) {
  const id = useId();
  const [form, setForm] = useState<PostInput>(() =>
    initial
      ? { title: initial.title, content: initial.content ?? "", imageUrl: initial.imageUrl ?? "", visibility: initial.visibility }
      : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const length = form.content.trim().length;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (form.title.trim().length < 3) return setError("Tiêu đề cần ít nhất 3 ký tự.");
    if (length < POST_CONTENT_MIN) return setError(`Nội dung cần ít nhất ${POST_CONTENT_MIN} ký tự.`);
    setBusy(true);
    setError("");
    try {
      await onSubmit({ ...form, title: form.title.trim(), content: form.content.trim() });
      setForm(EMPTY);
    } catch (err) {
      setError(errorText(err, "Không lưu được bài. Vui lòng thử lại."));
    } finally {
      setBusy(false);
    }
  };

  const setVisibility = (visibility: PostVisibility) => setForm((current) => ({ ...current, visibility }));

  return (
    <form className="progress-form" onSubmit={submit} noValidate>
      <h3>{initial ? `Sửa "Cập nhật #${initial.number}"` : "Đăng bài cập nhật mới"}</h3>
      <p className="hint">
        Kể cho người ủng hộ biết dự án đang ra sao: tin vui, khó khăn, ảnh hậu trường, thay đổi kế hoạch. Báo cáo chi tiêu kèm chứng từ vẫn đăng ở mục Tiến độ.
      </p>
      <label className="field">
        <span>Tiêu đề</span>
        <input
          value={form.title}
          maxLength={POST_TITLE_MAX}
          placeholder="Ví dụ: Đã nhận lô sách đầu tiên!"
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
        />
      </label>
      <label className="field">
        <span>Nội dung</span>
        <textarea
          rows={8}
          value={form.content}
          maxLength={POST_CONTENT_MAX}
          aria-describedby={`${id}-count`}
          onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
        />
        <small id={`${id}-count`} className="hint">
          {length}/{POST_CONTENT_MAX} ký tự · để trống một dòng giữa các đoạn
        </small>
      </label>
      <ImageUploader
        label="Ảnh minh họa (không bắt buộc)"
        value={form.imageUrl ?? ""}
        purpose="progress_image"
        disabled={busy}
        onChange={(url) => setForm((current) => ({ ...current, imageUrl: url }))}
      />
      <fieldset className="post-visibility">
        <legend>Ai được đọc bài này?</legend>
        <label>
          <input type="radio" name={`${id}-visibility`} checked={form.visibility === "public"} onChange={() => setVisibility("public")} />
          <span><b>Công khai</b> · mọi người đều đọc được, người theo dõi cũng nhận thông báo</span>
        </label>
        <label>
          <input type="radio" name={`${id}-visibility`} checked={form.visibility === "backers"} onChange={() => setVisibility("backers")} />
          <span><b>Chỉ người ủng hộ</b> · người khác chỉ thấy tiêu đề</span>
        </label>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="post-manager-actions">
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? "Đang lưu…" : initial ? "Lưu thay đổi" : "Đăng bài"}
        </button>
        {onCancel && (
          <button className="button button-ghost" type="button" disabled={busy} onClick={onCancel}>Hủy sửa</button>
        )}
      </div>
    </form>
  );
}
