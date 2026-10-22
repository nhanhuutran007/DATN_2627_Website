"use client";

import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";
import { downloadBackup, fetchBackupStatus, restoreBackup, type BackupStatus, type RestoreBackupResult } from "@/lib/api/admin";

/** Phải khớp `RESTORE_CONFIRMATION` ở backend. */
const RESTORE_CONFIRMATION = "KHÔI PHỤC";
/** Quá số ngày này chưa sao lưu thì nhắc. */
const STALE_DAYS = 7;

type BackupPreview = {
  createdAt: string;
  schemaVersion: string | null;
  tables: Array<{ name: string; rows: number }>;
  rows: number;
};

const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);
const dateTime = (value: string) => new Date(value).toLocaleString("vi-VN");

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
}

/** Đọc file sao lưu ngay trên trình duyệt để admin xem trước nội dung trước khi ghi đè. */
async function readPreview(file: File): Promise<BackupPreview> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  const gzipped = head[0] === 0x1f && head[1] === 0x8b;
  const text = gzipped
    ? await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text()
    : await file.text();
  const data = JSON.parse(text) as { format?: string; createdAt?: string; schemaVersion?: string | null; tables?: Record<string, unknown[]> };
  if (data.format !== "gopmam-backup" || !data.tables || typeof data.tables !== "object") {
    throw new Error("Đây không phải file sao lưu của hệ thống.");
  }
  const tables = Object.entries(data.tables)
    .map(([name, rows]) => ({ name, rows: Array.isArray(rows) ? rows.length : 0 }))
    .sort((a, b) => b.rows - a.rows || a.name.localeCompare(b.name));
  return {
    createdAt: data.createdAt ?? "",
    schemaVersion: data.schemaVersion ?? null,
    tables,
    rows: tables.reduce((sum, table) => sum + table.rows, 0),
  };
}

/** Sao lưu toàn bộ dữ liệu ra file và khôi phục (ghi đè) từ file sao lưu. */
export function BackupManager() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  /** Thời điểm tải trạng thái, dùng tính số ngày chưa sao lưu (không gọi Date.now() khi render). */
  const [checkedAt, setCheckedAt] = useState(0);
  const [busy, setBusy] = useState<"export" | "restore" | null>(null);
  const [exportNotice, setExportNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [backupFirst, setBackupFirst] = useState(true);
  const [confirm, setConfirm] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restored, setRestored] = useState<RestoreBackupResult | null>(null);

  const loadStatus = useCallback(() => {
    fetchBackupStatus()
      .then((result) => {
        setStatus(result);
        setCheckedAt(Date.now());
      })
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const last = status?.lastBackup ?? null;
  const daysSinceLast = last ? Math.floor((checkedAt - new Date(last.createdAt).getTime()) / 86_400_000) : null;
  const stale = status !== null && (daysSinceLast === null || daysSinceLast >= STALE_DAYS);
  // Chỉ chặn khi biết chắc cả hai phiên bản; thiếu thông tin thì để backend kiểm tra.
  const schemaMismatch = Boolean(preview && status?.schemaVersion && preview.schemaVersion !== status.schemaVersion);

  const exportNow = async () => {
    setBusy("export");
    setExportNotice(null);
    try {
      await downloadBackup();
      setExportNotice({ tone: "ok", text: "Đã tạo và tải bản sao lưu về máy." });
      loadStatus();
    } catch (err) {
      setExportNotice({ tone: "error", text: errorText(err, "Không tạo được bản sao lưu.") });
    } finally {
      setBusy(null);
    }
  };

  const chooseFile = async (chosen: File | null) => {
    setFile(chosen);
    setPreview(null);
    setPreviewError(null);
    setRestoreError(null);
    setRestored(null);
    setConfirm("");
    if (!chosen) return;
    if (status && chosen.size > status.maxBytes) {
      setPreviewError(`File quá lớn (${fileSize(chosen.size)}); tối đa ${fileSize(status.maxBytes)}.`);
      return;
    }
    try {
      setPreview(await readPreview(chosen));
    } catch (err) {
      setPreviewError(err instanceof SyntaxError ? "File sao lưu không phải JSON hợp lệ." : err instanceof Error ? err.message : "Không đọc được file.");
    }
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (busy === null) void chooseFile(event.dataTransfer.files?.[0] ?? null);
  };

  const restore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || schemaMismatch || confirm.trim() !== RESTORE_CONFIRMATION) return;
    setBusy("restore");
    setRestoreError(null);
    try {
      if (backupFirst) await downloadBackup();
      setRestored(await restoreBackup(file, confirm.trim()));
      setFile(null);
      setPreview(null);
      setConfirm("");
    } catch (err) {
      setRestoreError(errorText(err, "Khôi phục thất bại, dữ liệu hiện tại được giữ nguyên."));
    } finally {
      setBusy(null);
      loadStatus();
    }
  };

  return (
    <section className="admin-card admin-table-card" id="sao-luu">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Hệ thống</p>
          <h2>
            {status === null
              ? "Sao lưu & khôi phục dữ liệu"
              : last
                ? `Sao lưu gần nhất: ${dateTime(last.createdAt)}`
                : "Chưa có bản sao lưu nào"}
          </h2>
          {last && (
            <p className="backup-last">
              {last.by && <>bởi {last.by}</>}
              {last.rows !== null && <> · {last.rows.toLocaleString("vi-VN")} dòng</>}
              {last.bytes !== null && <> · {fileSize(last.bytes)}</>}
            </p>
          )}
        </div>
      </div>

      {stale && (
        <p className="backup-stale" role="status">
          <Icon name="shield" size={15} />
          {last
            ? `Đã ${daysSinceLast} ngày chưa sao lưu. Nên tạo bản sao lưu mới.`
            : "Hệ thống chưa từng được sao lưu. Nên tạo bản sao lưu đầu tiên."}
        </p>
      )}

      <div className="export-grid">
        <article>
          <h3>Tạo bản sao lưu</h3>
          <p>
            Tải về toàn bộ dữ liệu hiện tại (tài khoản, chiến dịch, giao dịch, bình luận, nhật ký…) dưới dạng một file
            <code> .json.gz</code>. Ảnh tải lên không nằm trong file, chỉ có đường dẫn tới ảnh.
            Cần nhập mã xác minh gửi qua email.
          </p>
          <button className="button button-primary button-sm backup-export" type="button" disabled={busy !== null} onClick={exportNow}>
            {busy === "export" ? "Đang sao lưu…" : "Tải bản sao lưu"}
          </button>
          {exportNotice && (
            <p className={exportNotice.tone === "ok" ? "admin-notice" : "form-error"} role="status">{exportNotice.text}</p>
          )}
        </article>

        <article className="backup-restore-card">
          <h3>Khôi phục từ bản sao lưu</h3>
          <p>
            <b>Ghi đè toàn bộ dữ liệu hiện tại</b> bằng dữ liệu trong file. Dữ liệu phát sinh sau thời điểm sao lưu sẽ mất.
            Nếu có lỗi giữa chừng, hệ thống giữ nguyên dữ liệu cũ. Cần nhập mã xác minh gửi qua email.
          </p>
          <label
            className={`backup-drop${dragging ? " is-dragging" : ""}${busy !== null ? " is-disabled" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={drop}
          >
            <input
              className="sr-only"
              type="file"
              accept=".gz,.json,application/gzip,application/json"
              disabled={busy !== null}
              onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
            />
            <Icon name="database" size={20} />
            {file ? (
              <span><b>{file.name}</b><small>{fileSize(file.size)} · bấm để chọn file khác</small></span>
            ) : (
              <span>
                <b>Kéo thả file sao lưu vào đây hoặc bấm để chọn</b>
                <small>.json.gz hoặc .json{status ? ` · tối đa ${fileSize(status.maxBytes)}` : ""}</small>
              </span>
            )}
          </label>
          {previewError && <p className="form-error" role="alert">{previewError}</p>}
        </article>
      </div>

      {restored && (
        <div className="admin-notice backup-done" role="status">
          <span>
            Đã khôi phục {restored.rows.toLocaleString("vi-VN")} dòng trong {restored.tables} bảng từ bản sao lưu lúc {dateTime(restored.createdAt)}.
            Phiên đăng nhập có thể không còn hợp lệ nếu tài khoản của bạn khác trong bản sao lưu.
          </span>
          <button className="button button-outline button-sm" type="button" onClick={() => window.location.reload()}>Tải lại trang</button>
        </div>
      )}

      {preview && file && (
        <form className="backup-restore" onSubmit={restore}>
          <h3>Nội dung file {file.name}</h3>
          <dl className="review-facts">
            <div><dt>Sao lưu lúc</dt><dd>{preview.createdAt ? dateTime(preview.createdAt) : "—"}</dd></div>
            <div><dt>Tổng số dòng</dt><dd>{preview.rows.toLocaleString("vi-VN")}<small>{preview.tables.length} bảng</small></dd></div>
            <div><dt>Phiên bản cấu trúc</dt><dd className="backup-schema">{preview.schemaVersion ?? "—"}</dd></div>
          </dl>
          {schemaMismatch && (
            <p className="form-error" role="alert">
              File thuộc cấu trúc CSDL khác ({preview.schemaVersion ?? "không rõ"}, hiện tại {status?.schemaVersion}) nên không thể
              khôi phục. Hãy dùng bản sao lưu tạo từ phiên bản hệ thống hiện tại.
            </p>
          )}
          <ul className="backup-tables">
            {preview.tables.map((table) => (
              <li key={table.name}><code>{table.name}</code><span>{table.rows.toLocaleString("vi-VN")}</span></li>
            ))}
          </ul>

          {!schemaMismatch && (
            <>
              <label className="backup-check">
                <input type="checkbox" checked={backupFirst} onChange={(event) => setBackupFirst(event.target.checked)} />
                Tải bản sao lưu dữ liệu hiện tại về máy trước khi khôi phục (khuyên dùng)
              </label>
              <label className="field">
                <span>Gõ <b>{RESTORE_CONFIRMATION}</b> để xác nhận ghi đè toàn bộ dữ liệu</span>
                <input value={confirm} autoComplete="off" disabled={busy !== null} onChange={(event) => setConfirm(event.target.value)} />
              </label>
              {restoreError && <p className="form-error" role="alert">{restoreError}</p>}
              <button
                className="button button-primary backup-danger"
                type="submit"
                disabled={busy !== null || confirm.trim() !== RESTORE_CONFIRMATION}
              >
                {busy === "restore" ? "Đang khôi phục…" : "Khôi phục dữ liệu"}
              </button>
            </>
          )}
        </form>
      )}

      <p className="risk-footnote">
        <Icon name="shield" size={15} /> File sao lưu chứa dữ liệu cá nhân (email, số điện thoại, mật khẩu đã băm): chỉ lưu ở nơi an toàn.
        Mỗi lần sao lưu và khôi phục đều được ghi nhật ký kiểm toán.
      </p>
    </section>
  );
}
