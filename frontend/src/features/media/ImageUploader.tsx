import Image from "next/image";
import { ChangeEvent, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError, resolveMediaUrl } from "@/lib/api";
import {
  ACCEPTED_IMAGE_TYPES,
  uploadImage,
  validateImageFile,
  type MediaPurpose,
} from "@/lib/api/media";

type ImageUploaderProps = {
  label: string;
  /** `/api/v1/media/...` (ảnh đã tải lên) hoặc link `http(s)://`; rỗng nếu chưa có. */
  value: string;
  onChange: (url: string) => void;
  purpose?: MediaPurpose;
  hint?: string;
  disabled?: boolean;
};

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi tải ảnh.";
    if (error.status === 413) return "Ảnh tối đa 5 MB.";
    if (error.status === 429) return "Bạn tải ảnh quá nhiều lần. Vui lòng thử lại sau ít phút.";
    return error.message;
  }
  return "Không tải được ảnh. Kiểm tra kết nối rồi thử lại.";
}

/** Chọn ảnh từ máy (tải lên kho của hệ thống) hoặc dán link ảnh có sẵn. */
export function ImageUploader({ label, value, onChange, purpose = "campaign_image", hint, disabled }: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [useLink, setUseLink] = useState(() => value.startsWith("http"));

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    setUploading(true);
    try {
      const uploaded = await uploadImage(file, purpose);
      onChange(uploaded.url);
    } catch (err) {
      setError(uploadErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="field image-uploader">
      <span id={`${inputId}-label`}>{label}</span>

      {value ? (
        <div className="image-uploader-preview">
          <div className="image-uploader-frame">
            <Image src={resolveMediaUrl(value)} alt="Ảnh xem trước" fill sizes="(max-width: 700px) 100vw, 480px" unoptimized />
          </div>
          <div className="image-uploader-actions">
            <button className="button button-outline button-sm" type="button" disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>
              <Icon name="image" size={16} /> Đổi ảnh
            </button>
            <button className="button button-ghost button-sm" type="button" disabled={disabled || uploading} onClick={() => { onChange(""); setError(""); }}>
              <Icon name="x" size={16} /> Bỏ ảnh
            </button>
          </div>
        </div>
      ) : useLink ? (
        <input
          type="url"
          aria-labelledby={`${inputId}-label`}
          placeholder="https://…/anh-du-an.jpg"
          disabled={disabled}
          onBlur={(e) => onChange(e.target.value.trim())}
          defaultValue=""
        />
      ) : (
        <button
          className="image-uploader-drop"
          type="button"
          disabled={disabled || uploading}
          aria-describedby={`${inputId}-hint`}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="image" size={26} />
          <b>{uploading ? "Đang tải ảnh lên…" : "Chọn ảnh từ máy"}</b>
          <small>JPEG, PNG hoặc WebP, tối đa 5 MB</small>
        </button>
      )}

      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        tabIndex={-1}
        aria-hidden="true"
        onChange={onPick}
      />

      <p className="sr-only" aria-live="polite">{uploading ? "Đang tải ảnh lên" : value ? "Đã có ảnh" : ""}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!value && (
        <button className="link-button" type="button" disabled={disabled} onClick={() => { setUseLink((v) => !v); setError(""); }}>
          {useLink ? "Tải ảnh từ máy thay vì dán link" : "Hoặc dán link ảnh có sẵn"}
        </button>
      )}
      {hint && <small id={`${inputId}-hint`}>{hint}</small>}
    </div>
  );
}
