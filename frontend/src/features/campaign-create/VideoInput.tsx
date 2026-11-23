"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { VideoPlayer } from "@/components/campaign/VideoPlayer";
import { ApiError } from "@/lib/api";
import { ACCEPTED_VIDEO_TYPES, uploadVideo, validateVideoFile } from "@/lib/api/media";
import { isUploadedVideo, videoSource } from "@/lib/video";

type Mode = "youtube" | "upload";

type VideoInputProps = {
  /** Link YouTube hoặc đường dẫn video đã tải lên; rỗng = không có video. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/**
 * Video giới thiệu dự án (không bắt buộc): dán link YouTube hoặc tải file MP4/MOV/WebM ≤ 100 MB.
 * Cả hai đều phát ngay trên trang dự án; ở đây có xem trước.
 */
export function VideoInput({ value, onChange, disabled }: VideoInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<Mode>(value && isUploadedVideo(value) ? "upload" : "youtube");
  const [link, setLink] = useState(value && !isUploadedVideo(value) ? value : "");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Hủy tải lên dở dang khi rời bước/trang.
  useEffect(() => () => abortRef.current?.abort(), []);

  const uploading = progress !== null;
  const hasVideo = Boolean(videoSource(value));

  const changeLink = (next: string) => {
    setLink(next);
    const trimmed = next.trim();
    if (!trimmed) {
      setError("");
      onChange("");
      return;
    }
    if (videoSource(trimmed)?.kind === "youtube") {
      setError("");
      onChange(trimmed);
    } else {
      setError("Link chưa đúng: hãy dán link video YouTube (youtube.com/watch?v=… hoặc youtu.be/…).");
      onChange("");
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateVideoFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const uploaded = await uploadVideo(file, setProgress, controller.signal);
      onChange(uploaded.url);
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof ApiError ? caught.message : "Không tải được video. Vui lòng thử lại.");
      }
    } finally {
      abortRef.current = null;
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = () => {
    abortRef.current?.abort();
    setLink("");
    setError("");
    onChange("");
  };

  const switchMode = (next: Mode) => {
    if (next === mode || uploading) return;
    setMode(next);
    setError("");
  };

  return (
    <div className="field video-input">
      <span className="create-q-label">Video giới thiệu <small>(không bắt buộc)</small></span>
      <p className="hint">
        Nên dài 1–3 phút. 30 giây đầu hãy nói rõ ai cần giúp và số tiền dùng vào việc gì. Video phát ngay trên trang dự án.
      </p>

      <div className="video-input-modes" role="tablist" aria-label="Cách thêm video">
        <button type="button" role="tab" aria-selected={mode === "youtube"} disabled={disabled || uploading} onClick={() => switchMode("youtube")}>
          Dán link YouTube
        </button>
        <button type="button" role="tab" aria-selected={mode === "upload"} disabled={disabled || uploading} onClick={() => switchMode("upload")}>
          Tải video lên
        </button>
      </div>

      {mode === "youtube" && (
        <input
          id={`${id}-link`}
          type="url"
          inputMode="url"
          placeholder="https://www.youtube.com/watch?v=…"
          value={link}
          disabled={disabled}
          aria-label="Link video YouTube"
          aria-invalid={Boolean(error) || undefined}
          onChange={(event) => changeLink(event.target.value)}
        />
      )}

      {mode === "upload" && !uploading && !(hasVideo && isUploadedVideo(value)) && (
        <button className="video-input-drop" type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <Icon name="video" size={26} />
          <b>Chọn file video</b>
          <span>MP4, MOV hoặc WebM · tối đa 100 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={ACCEPTED_VIDEO_TYPES.join(",")}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void pickFile(event.target.files?.[0])}
      />

      {uploading && (
        <div className="video-input-progress" role="status">
          <span>Đang tải video lên… {Math.round((progress ?? 0) * 100)}%</span>
          <span className="goal-estimate-bar" aria-hidden="true">
            <span style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
          </span>
          <button className="button button-ghost button-sm" type="button" onClick={() => abortRef.current?.abort()}>
            Hủy
          </button>
        </div>
      )}

      {hasVideo && !uploading && (
        <div className="video-input-preview">
          <VideoPlayer url={value} title="Xem trước video giới thiệu" />
          <button className="button button-ghost button-sm" type="button" disabled={disabled} onClick={remove}>
            Gỡ video
          </button>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
