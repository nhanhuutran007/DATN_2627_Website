"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import {
  fetchEmailSettings,
  updateEmailSettings,
  type EmailCategorySetting,
  type EmailSettings,
  type EmailSettingsPatch,
} from "@/lib/api/emailSettings";
import { formatDateTime } from "@/lib/format";

type Notice = { tone: "ok" | "error"; text: string } | null;

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function Switch({
  checked,
  disabled,
  labelId,
  descId,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  labelId: string;
  descId?: string;
  onChange: () => void;
}) {
  return (
    <label className="account-switch">
      <input
        type="checkbox"
        role="switch"
        aria-labelledby={labelId}
        aria-describedby={descId}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="account-switch-track" aria-hidden="true" />
      <span className="sr-only">{checked ? "Đang bật" : "Đang tắt"}</span>
    </label>
  );
}

/**
 * Admin bật/tắt từng loại email hệ thống gửi người dùng, hoặc tắt tất cả — để không đốt hết hạn mức gửi
 * của nhà cung cấp (vd. Resend 100 thư/ngày) khi đang thử nghiệm. Thông báo trong web vẫn tạo như thường.
 */
export function EmailSettingsManager() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    let active = true;
    fetchEmailSettings()
      .then((value) => active && setSettings(value))
      .catch((err: unknown) => active && setError(errorText(err, "Không tải được cài đặt email.")));
    return () => {
      active = false;
    };
  }, []);

  const save = async (patch: EmailSettingsPatch, success: string) => {
    setBusy(true);
    setNotice(null);
    try {
      setSettings(await updateEmailSettings(patch));
      setNotice({ tone: "ok", text: success });
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không lưu được cài đặt email.") });
    } finally {
      setBusy(false);
    }
  };

  const setAll = (value: boolean) => {
    if (!settings) return;
    const categories = Object.fromEntries(settings.categories.map((c) => [c.key, value]));
    void save({ categories }, value ? "Đã bật mọi loại email." : "Đã tắt mọi loại email.");
  };

  const setBulk = (value: boolean) => {
    if (!settings) return;
    const categories = Object.fromEntries(settings.categories.filter((c) => c.bulk).map((c) => [c.key, value]));
    void save({ categories }, value ? "Đã bật các email gửi hàng loạt." : "Đã tắt các email gửi hàng loạt.");
  };

  const toggle = (category: EmailCategorySetting) => {
    const next = !category.enabled;
    void save({ categories: { [category.key]: next } }, `${next ? "Đã bật" : "Đã tắt"} email “${category.label}”.`);
  };

  if (error) {
    return (
      <section className="admin-card">
        <p className="form-error" role="alert">{error}</p>
      </section>
    );
  }
  if (!settings) {
    return (
      <section className="admin-card">
        <p className="hint">Đang tải cài đặt email…</p>
      </section>
    );
  }

  const enabledCount = settings.categories.filter((c) => c.enabled).length;
  const total = settings.categories.length;
  const otpOff = !settings.enabled || settings.categories.some((c) => c.key === "step_up_code" && !c.enabled);

  return (
    <div className="email-settings">
      <section className="admin-card email-master" aria-labelledby="email-master-title">
        <div className="email-master-row">
          <div>
            <h2 id="email-master-title">Gửi email cho người dùng</h2>
            <p className="email-category-desc" id="email-master-desc">Email bị tắt không gửi đi; thông báo trong web vẫn hiện.</p>
          </div>
          <Switch
            checked={settings.enabled}
            disabled={busy}
            labelId="email-master-title"
            descId="email-master-desc"
            onChange={() =>
              void save({ enabled: !settings.enabled }, settings.enabled ? "Đã tắt toàn bộ email." : "Đã bật lại email.")
            }
          />
        </div>
        <div className="email-master-foot">
          <span
            className={`stat-flag ${settings.enabled ? "is-ok" : "is-warn"}`}
            title={settings.updatedAt ? `Cập nhật lần cuối ${formatDateTime(settings.updatedAt)}` : undefined}
          >
            {settings.enabled ? `Đang gửi ${enabledCount}/${total} loại` : "Đang tắt toàn bộ"}
          </span>
          <div className="email-master-actions">
            <button type="button" className="button button-outline button-sm" disabled={busy} onClick={() => setBulk(false)}>
              Tắt email hàng loạt
            </button>
            <button type="button" className="button button-outline button-sm" disabled={busy} onClick={() => setAll(false)}>
              Tắt tất cả loại
            </button>
            <button type="button" className="button button-outline button-sm" disabled={busy} onClick={() => setAll(true)}>
              Bật tất cả loại
            </button>
          </div>
        </div>
        {otpOff && (
          <p className="email-warning" role="note">Mã OTP đang tắt — thao tác cần mã xác minh sẽ không nhận được email.</p>
        )}
        {notice && (
          <p className={notice.tone === "ok" ? "admin-notice" : "form-error"} role={notice.tone === "ok" ? "status" : "alert"}>
            {notice.text}
          </p>
        )}
      </section>

      <section className={`admin-card email-groups${settings.enabled ? "" : " is-muted"}`} aria-label="Từng loại email">
        {settings.groups.map((group) => {
          const items = settings.categories.filter((c) => c.group === group.key);
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="email-group">
              <h3 id={`email-group-${group.key}`}>{group.label}</h3>
              <ul className="email-category-list" aria-labelledby={`email-group-${group.key}`}>
                {items.map((category) => (
                  // Mô tả chi tiết chỉ hiện khi rê chuột, để danh sách gọn.
                  <li key={category.key} className="email-category" title={category.description}>
                    <p className="email-category-title" id={`email-cat-${category.key}`}>
                      {category.label}
                      {category.bulk && <span className="stat-flag is-warn">Hàng loạt</span>}
                    </p>
                    <Switch
                      checked={category.enabled}
                      disabled={busy}
                      labelId={`email-cat-${category.key}`}
                      onChange={() => toggle(category)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
