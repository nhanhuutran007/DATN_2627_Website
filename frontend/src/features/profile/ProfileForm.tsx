"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { AiConsentSettings } from "@/features/ai-consent/AiConsentSettings";
import { AccountShell } from "@/features/profile/AccountShell";
import { ApiError, logoutAllRequest, resolveMediaUrl } from "@/lib/api";
import { ACCEPTED_IMAGE_TYPES, uploadImage, validateImageFile } from "@/lib/api/media";
import { fetchMyProfile, updateMyProfile, type MyProfile, type ProfileUpdate } from "@/lib/api/users";
import { useAuthUser, useIsAuthenticated } from "@/lib/auth";

const ROLE_LABEL: Record<MyProfile["role"], string> = {
  user: "Người ủng hộ",
  campaign_owner: "Chủ dự án",
  admin: "Quản trị viên",
};

const PHONE_PATTERN = /^\+?[0-9 .-]{8,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIO_MAX = 500;

function toForm(profile: MyProfile): ProfileUpdate {
  return {
    name: profile.name,
    avatar: profile.avatar ?? "",
    bio: profile.bio ?? "",
    phone: profile.phone ?? "",
    organization: profile.organization ?? "",
    contactEmail: profile.contactEmail ?? "",
    contactPhone: profile.contactPhone ?? "",
    contactAddress: profile.contactAddress ?? "",
  };
}

type FieldErrors = Partial<Record<keyof ProfileUpdate, string>>;

function validate(form: ProfileUpdate): FieldErrors {
  const errors: FieldErrors = {};
  const name = form.name.trim();
  if (name.length < 2) errors.name = "Họ tên cần ít nhất 2 ký tự.";
  else if (name.length > 100) errors.name = "Họ tên tối đa 100 ký tự.";
  if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) errors.phone = "Số điện thoại chưa đúng định dạng (8–20 chữ số).";
  if (form.organization.trim().length > 255) errors.organization = "Tên tổ chức tối đa 255 ký tự.";
  if (form.bio.trim().length > BIO_MAX) errors.bio = `Giới thiệu tối đa ${BIO_MAX} ký tự.`;
  if (form.contactEmail.trim() && !EMAIL_PATTERN.test(form.contactEmail.trim())) errors.contactEmail = "Email chưa đúng định dạng.";
  if (form.contactPhone.trim() && !PHONE_PATTERN.test(form.contactPhone.trim())) errors.contactPhone = "Số điện thoại chưa đúng định dạng (8–20 chữ số).";
  if (form.contactAddress.trim().length > 300) errors.contactAddress = "Địa chỉ tối đa 300 ký tự.";
  return errors;
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 413) return "Ảnh tối đa 5 MB.";
    if (error.status === 429) return "Bạn thao tác quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"];
  return letters.join("").toUpperCase();
}

function memberSince(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : `Thành viên từ ${date.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}`;
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; profile: MyProfile };

/** Trang "Cài đặt › Tài khoản" (theo GoFundMe /account/profile): ảnh đại diện, từng dòng thông tin sửa tại chỗ, bảo mật, quyền riêng tư. */
export function ProfileForm() {
  const loggedIn = useIsAuthenticated();
  const authUser = useAuthUser();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  const fetchProfile = useCallback(() => {
    fetchMyProfile()
      .then((profile) => setLoad({ status: "ready", profile }))
      .catch((err: unknown) => setLoad({ status: "error", message: messageFor(err) }));
  }, []);

  useEffect(() => {
    if (loggedIn) fetchProfile();
  }, [loggedIn, fetchProfile]);

  if (!loggedIn) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="user" size={28} /></span>
        <h1>Đăng nhập để xem hồ sơ</h1>
        <p>Hồ sơ giúp cộng đồng biết bạn là ai khi bạn tạo chiến dịch, ủng hộ hoặc bình luận.</p>
        <div className="gate-actions">
          <Link className="button button-primary" href="/dang-nhap?next=/ho-so">Đăng nhập</Link>
          <Link className="button button-outline" href="/dang-ky">Tạo tài khoản</Link>
        </div>
      </main>
    );
  }

  if (load.status !== "ready") {
    return (
      <AccountShell active="account">
        {load.status === "loading" ? (
          <div className="profile-skeleton" role="status" aria-label="Đang tải hồ sơ">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <div className="form-error" role="alert">
            {load.message}{" "}
            <button className="link-inline" type="button" onClick={() => { setLoad({ status: "loading" }); fetchProfile(); }}>
              Thử lại
            </button>
          </div>
        )}
      </AccountShell>
    );
  }

  return (
    <ProfileView
      profile={load.profile}
      onSaved={(profile) => setLoad({ status: "ready", profile })}
      aiUser={authUser}
    />
  );
}

type ProfileViewProps = {
  profile: MyProfile;
  onSaved: (profile: MyProfile) => void;
  aiUser: ReturnType<typeof useAuthUser>;
};

type EditableField = "name" | "organization" | "phone" | "bio" | "contactEmail" | "contactPhone" | "contactAddress";

const PUBLIC_CONTACT_HINT = "Công khai: hiện khi người đã đăng nhập bấm \"Liên hệ\" ở trang dự án của bạn. Để trống nếu không muốn công khai.";

const FIELDS: Record<EditableField, { label: string; empty: string; hint?: string; maxLength: number; autoComplete?: string; type?: string; multiline?: boolean; placeholder?: string }> = {
  name: { label: "Họ tên", empty: "", maxLength: 100, autoComplete: "name", hint: "Hiển thị với cộng đồng khi bạn tạo chiến dịch, ủng hộ hoặc bình luận." },
  organization: { label: "Tổ chức / nhóm", empty: "Chưa có tổ chức", maxLength: 255, autoComplete: "organization", placeholder: "VD: CLB Tình nguyện Xanh" },
  phone: { label: "Số điện thoại", empty: "Chưa có số điện thoại", maxLength: 20, autoComplete: "tel", type: "tel", placeholder: "VD: 0912 345 678", hint: "Riêng tư: chỉ bạn và quản trị viên thấy." },
  bio: { label: "Giới thiệu ngắn", empty: "Thêm vài dòng giới thiệu về bạn", maxLength: BIO_MAX, multiline: true, placeholder: "Bạn là ai, quan tâm tới lĩnh vực nào…" },
  contactEmail: { label: "Email liên hệ công khai", empty: "Chưa công khai", maxLength: 255, autoComplete: "email", type: "email", placeholder: "VD: lienhe@duan.vn", hint: PUBLIC_CONTACT_HINT },
  contactPhone: { label: "Điện thoại liên hệ công khai", empty: "Chưa công khai", maxLength: 20, autoComplete: "tel", type: "tel", placeholder: "VD: 0912 345 678", hint: PUBLIC_CONTACT_HINT },
  contactAddress: { label: "Địa chỉ liên hệ công khai", empty: "Chưa công khai", maxLength: 300, autoComplete: "street-address", placeholder: "VD: 12 Lê Lợi, TP. Huế", hint: PUBLIC_CONTACT_HINT },
};

const FIELD_ORDER: EditableField[] = ["name", "organization", "phone", "bio", "contactEmail", "contactPhone", "contactAddress"];

function ProfileView({ profile, onSaved, aiUser }: ProfileViewProps) {
  const router = useRouter();
  const dialog = useDialog();
  const fileRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState<ProfileUpdate>(() => toForm(profile));
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [draft, setDraft] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // Tự ẩn thông báo sau vài giây.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /** Lưu toàn bộ hồ sơ (API cập nhật cả object); trả về true nếu thành công. */
  const persist = async (next: ProfileUpdate, successText: string): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await updateMyProfile(profile.id, {
        name: next.name.trim(),
        avatar: next.avatar.trim(),
        bio: next.bio.trim(),
        phone: next.phone.trim(),
        organization: next.organization.trim(),
        contactEmail: next.contactEmail.trim(),
        contactPhone: next.contactPhone.trim(),
        contactAddress: next.contactAddress.trim(),
      });
      setSaved(toForm(result));
      onSaved(result);
      setToast({ tone: "ok", text: successText });
      return true;
    } catch (err) {
      setToast({ tone: "error", text: messageFor(err) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (field: EditableField) => {
    setEditing(field);
    setDraft(saved[field]);
    setFieldError("");
  };

  const cancelEdit = () => {
    setEditing(null);
    setFieldError("");
  };

  const saveField = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const next = { ...saved, [editing]: draft };
    const found = validate(next)[editing];
    if (found) {
      setFieldError(found);
      return;
    }
    if (draft.trim() === saved[editing].trim()) {
      cancelEdit();
      return;
    }
    if (await persist(next, `Đã lưu ${FIELDS[editing].label.toLocaleLowerCase("vi")}.`)) cancelEdit();
  };

  // Ảnh đại diện lưu ngay khi tải lên/gỡ.
  const onPickAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setToast({ tone: "error", text: invalid });
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadImage(file, "avatar");
      await persist({ ...saved, avatar: uploaded.url }, "Đã cập nhật ảnh đại diện.");
    } catch (err) {
      setToast({ tone: "error", text: messageFor(err) });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    const ok = await dialog.confirm({
      title: "Gỡ ảnh đại diện?",
      message: "Hồ sơ sẽ hiển thị chữ cái đầu của tên bạn thay cho ảnh.",
      confirmLabel: "Gỡ ảnh",
      tone: "danger",
    });
    if (ok) await persist({ ...saved, avatar: "" }, "Đã gỡ ảnh đại diện.");
  };

  const logoutEverywhere = async () => {
    const ok = await dialog.confirm({
      title: "Đăng xuất khỏi mọi thiết bị?",
      message: "Mọi phiên đăng nhập của tài khoản, kể cả trên thiết bị này, sẽ bị thu hồi. Bạn cần đăng nhập lại.",
      confirmLabel: "Đăng xuất tất cả",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await logoutAllRequest();
      router.push("/dang-nhap");
    } catch (err) {
      setToast({ tone: "error", text: messageFor(err) });
    }
  };

  const avatarUrl = saved.avatar ? resolveMediaUrl(saved.avatar) : "";
  const isAdmin = profile.role === "admin";

  return (
    <AccountShell active="account">
      <section className="account-avatar" aria-labelledby="account-avatar-title">
        <h2 id="account-avatar-title" className="account-label">Ảnh đại diện</h2>
        <div className="account-avatar-body">
          <div className={`account-avatar-circle${uploading ? " is-busy" : ""}`}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh người dùng tải lên, đường dẫn động
              <img src={avatarUrl} alt={`Ảnh đại diện của ${saved.name}`} />
            ) : (
              <span aria-hidden="true">{initials(saved.name)}</span>
            )}
          </div>
          <div className="account-avatar-actions">
            <button className="account-pill" type="button" disabled={uploading || busy} onClick={() => fileRef.current?.click()}>
              {uploading ? "Đang tải…" : avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}
            </button>
            {avatarUrl && (
              <button className="account-pill account-pill-danger" type="button" disabled={uploading || busy} onClick={() => void removeAvatar()}>
                Gỡ ảnh
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            tabIndex={-1}
            aria-hidden="true"
            onChange={onPickAvatar}
          />
        </div>
      </section>

      <div className="account-rows">
        {FIELD_ORDER.map((field) => {
          const meta = FIELDS[field];
          const value = saved[field].trim();
          const inputId = `account-${field}`;
          return (
            <section className="account-row" key={field} aria-labelledby={`${inputId}-label`}>
              <div className="account-row-main">
                <h2 id={`${inputId}-label`} className="account-label">{meta.label}</h2>
                {editing === field ? (
                  <form className="account-edit" onSubmit={saveField} noValidate>
                    <label className="sr-only" htmlFor={inputId}>{meta.label}</label>
                    {meta.multiline ? (
                      <textarea
                        id={inputId}
                        rows={4}
                        value={draft}
                        maxLength={meta.maxLength}
                        placeholder={meta.placeholder}
                        aria-invalid={Boolean(fieldError)}
                        autoFocus
                        onChange={(event) => { setDraft(event.target.value); setFieldError(""); }}
                      />
                    ) : (
                      <input
                        id={inputId}
                        type={meta.type ?? "text"}
                        value={draft}
                        maxLength={meta.maxLength}
                        autoComplete={meta.autoComplete}
                        placeholder={meta.placeholder}
                        aria-invalid={Boolean(fieldError)}
                        autoFocus
                        onChange={(event) => { setDraft(event.target.value); setFieldError(""); }}
                      />
                    )}
                    {meta.multiline && <small className="account-hint">{draft.trim().length}/{meta.maxLength}</small>}
                    {meta.hint && <small className="account-hint">{meta.hint}</small>}
                    {fieldError && <small className="field-error" role="alert">{fieldError}</small>}
                    <div className="account-edit-actions">
                      <button className="account-pill" type="button" disabled={busy} onClick={cancelEdit}>Hủy</button>
                      <button className="account-pill account-pill-solid" type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu"}</button>
                    </div>
                  </form>
                ) : (
                  <p className={`account-value${value ? "" : " is-empty"}`}>{value || meta.empty}</p>
                )}
              </div>
              {editing !== field && (
                <button className="account-pill" type="button" disabled={busy || (editing !== null)} onClick={() => startEdit(field)}>
                  {value ? "Sửa" : "Thêm"}
                </button>
              )}
            </section>
          );
        })}

        <section className="account-row is-readonly" aria-labelledby="account-email-label">
          <div className="account-row-main">
            <h2 id="account-email-label" className="account-label">Email</h2>
            <p className="account-value">
              {profile.email}{" "}
              {profile.emailVerified ? (
                <span className="tag tag-green">Đã xác minh</span>
              ) : (
                <span className="tag tag-amber">Chưa xác minh</span>
              )}
            </p>
            <small className="account-hint">Email dùng để đăng nhập, không đổi được tại đây.</small>
          </div>
        </section>

        <section className="account-row is-readonly" aria-labelledby="account-role-label">
          <div className="account-row-main">
            <h2 id="account-role-label" className="account-label">Vai trò</h2>
            <p className="account-value">{ROLE_LABEL[profile.role]}</p>
            {memberSince(profile.createdAt) && <small className="account-hint">{memberSince(profile.createdAt)}</small>}
          </div>
        </section>

        {isAdmin && (
          <section className="account-row" aria-labelledby="account-admin-label">
            <div className="account-row-main">
              <h2 id="account-admin-label" className="account-label">Quyền quản trị</h2>
              <p className="account-value">Duyệt chiến dịch, xử lý báo cáo vi phạm, hoàn tiền và xem nhật ký kiểm toán.</p>
            </div>
            <Link className="account-pill" href="/admin">Mở trang quản trị</Link>
          </section>
        )}

        <section className="account-row" aria-labelledby="account-password-label">
          <div className="account-row-main">
            <h2 id="account-password-label" className="account-label">Mật khẩu</h2>
            <p className="account-value account-secret" aria-label="Đã đặt mật khẩu">●●●●●●●●●●</p>
          </div>
          <Link className="account-pill" href="/doi-mat-khau">Đổi</Link>
        </section>

        <section className="account-row" aria-labelledby="account-sessions-label">
          <div className="account-row-main">
            <h2 id="account-sessions-label" className="account-label">Phiên đăng nhập</h2>
            <p className="account-value">Nghi lộ mật khẩu hoặc đã đăng nhập ở máy lạ? Đăng xuất khỏi mọi thiết bị.</p>
          </div>
          <button className="account-pill" type="button" onClick={() => void logoutEverywhere()}>Đăng xuất</button>
        </section>

        {aiUser && <AiConsentSettings user={aiUser} />}
      </div>

      {!isAdmin && (
        <p className="account-foot">
          Muốn khóa hoặc xóa tài khoản? Hãy liên hệ quản trị viên Góp Mầm. Xem thêm{" "}
          <Link href="/chinh-sach-bao-mat">Chính sách quyền riêng tư</Link>.
        </p>
      )}

      {toast && (
        <div className={`profile-toast ${toast.tone === "ok" ? "is-ok" : "is-error"}`} role={toast.tone === "ok" ? "status" : "alert"}>
          <Icon name={toast.tone === "ok" ? "check" : "x"} size={16} />
          {toast.text}
        </div>
      )}
    </AccountShell>
  );
}
