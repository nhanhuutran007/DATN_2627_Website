"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { AiConsentSettings } from "@/features/ai-consent/AiConsentSettings";
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
const BIO_MAX = 500;

function toForm(profile: MyProfile): ProfileUpdate {
  return {
    name: profile.name,
    avatar: profile.avatar ?? "",
    bio: profile.bio ?? "",
    phone: profile.phone ?? "",
    organization: profile.organization ?? "",
  };
}

function sameForm(a: ProfileUpdate, b: ProfileUpdate): boolean {
  return (Object.keys(a) as Array<keyof ProfileUpdate>).every((key) => a[key].trim() === b[key].trim());
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

/** Trang hồ sơ: thẻ nhận diện, thông tin cá nhân, bảo mật và quyền riêng tư. */
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
      <main className="container profile-page">
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
      </main>
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

function ProfileView({ profile, onSaved, aiUser }: ProfileViewProps) {
  const router = useRouter();
  const dialog = useDialog();
  const formId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState<ProfileUpdate>(() => toForm(profile));
  const [form, setForm] = useState<ProfileUpdate>(() => toForm(profile));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const dirty = !sameForm(form, saved);

  // Tự ẩn thông báo sau vài giây.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const update = (field: keyof ProfileUpdate, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const persist = async (next: ProfileUpdate, successText: string) => {
    setBusy(true);
    try {
      const result = await updateMyProfile(profile.id, {
        name: next.name.trim(),
        avatar: next.avatar.trim(),
        bio: next.bio.trim(),
        phone: next.phone.trim(),
        organization: next.organization.trim(),
      });
      const fresh = toForm(result);
      setSaved(fresh);
      setForm((current) => ({ ...current, ...fresh }));
      onSaved(result);
      setToast({ tone: "ok", text: successText });
    } catch (err) {
      setToast({ tone: "error", text: messageFor(err) });
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setToast({ tone: "error", text: "Vui lòng kiểm tra lại các trường được đánh dấu." });
      return;
    }
    await persist(form, "Đã lưu thông tin hồ sơ.");
  };

  // Ảnh đại diện lưu ngay khi tải lên/gỡ (không cần bấm Lưu), giữ nguyên các trường đang sửa.
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
      setForm((current) => ({ ...current, avatar: uploaded.url }));
      await persist({ ...saved, avatar: uploaded.url }, "Đã cập nhật ảnh đại diện.");
    } catch (err) {
      setToast({ tone: "error", text: messageFor(err) });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setForm((current) => ({ ...current, avatar: "" }));
    await persist({ ...saved, avatar: "" }, "Đã gỡ ảnh đại diện.");
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
  const bioLength = form.bio.trim().length;

  return (
    <main className="profile-page">
      <section className="profile-hero" aria-labelledby={`${formId}-name`}>
        <div className="profile-hero-cover" aria-hidden="true" />
        <div className="container profile-hero-inner">
          <div className="profile-avatar-wrap">
            <div className={`profile-avatar${uploading ? " is-busy" : ""}`}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh người dùng tải lên, đường dẫn động
                <img src={avatarUrl} alt={`Ảnh đại diện của ${saved.name}`} />
              ) : (
                <span aria-hidden="true">{initials(saved.name)}</span>
              )}
            </div>
            <button
              className="profile-avatar-edit"
              type="button"
              disabled={uploading || busy}
              aria-label={avatarUrl ? "Đổi ảnh đại diện" : "Tải ảnh đại diện"}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="image" size={16} />
            </button>
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

          <div className="profile-identity">
            <p className="profile-kicker">Hồ sơ cá nhân</p>
            <h1 id={`${formId}-name`}>{saved.name}</h1>
            <ul className="profile-badges">
              <li><span className="tag tag-blue">{ROLE_LABEL[profile.role]}</span></li>
              <li>
                <Icon name="message" size={15} /> {profile.email}{" "}
                {profile.emailVerified ? (
                  <span className="tag tag-green">Đã xác minh</span>
                ) : (
                  <span className="tag tag-amber">Chưa xác minh</span>
                )}
              </li>
              {saved.organization && <li><Icon name="users" size={15} /> {saved.organization}</li>}
              {memberSince(profile.createdAt) && <li><Icon name="clock" size={15} /> {memberSince(profile.createdAt)}</li>}
            </ul>
            <div className="profile-hero-actions">
              <button className="button button-sm button-white" type="button" disabled={uploading || busy} onClick={() => fileRef.current?.click()}>
                {uploading ? "Đang tải ảnh…" : avatarUrl ? "Đổi ảnh" : "Tải ảnh đại diện"}
              </button>
              {avatarUrl && (
                <button className="button button-sm button-ghost-white" type="button" disabled={uploading || busy} onClick={removeAvatar}>
                  Gỡ ảnh
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container profile-grid">
        <form id={formId} className="profile-card" onSubmit={submit} noValidate aria-labelledby={`${formId}-info`}>
          <header className="profile-card-head">
            <h2 id={`${formId}-info`}>Thông tin cá nhân</h2>
            <p>Họ tên, tổ chức và phần giới thiệu hiển thị với cộng đồng. Số điện thoại chỉ bạn và quản trị viên thấy.</p>
          </header>

          <div className="profile-fields">
            <label className="field">
              <span>Họ tên</span>
              <input
                value={form.name}
                maxLength={100}
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => update("name", event.target.value)}
              />
              {errors.name && <small className="field-error">{errors.name}</small>}
            </label>
            <label className="field">
              <span>Tổ chức / nhóm <small>(không bắt buộc)</small></span>
              <input
                value={form.organization}
                maxLength={255}
                autoComplete="organization"
                placeholder="VD: CLB Tình nguyện Xanh"
                aria-invalid={Boolean(errors.organization)}
                onChange={(event) => update("organization", event.target.value)}
              />
              {errors.organization && <small className="field-error">{errors.organization}</small>}
            </label>
            <label className="field">
              <span>Số điện thoại <small>(riêng tư)</small></span>
              <input
                type="tel"
                value={form.phone}
                maxLength={20}
                autoComplete="tel"
                placeholder="VD: 0912 345 678"
                aria-invalid={Boolean(errors.phone)}
                onChange={(event) => update("phone", event.target.value)}
              />
              {errors.phone && <small className="field-error">{errors.phone}</small>}
            </label>
            <label className="field">
              <span>Email</span>
              <input value={profile.email} disabled readOnly />
              <small className="hint">Email dùng để đăng nhập, không đổi được tại đây.</small>
            </label>
            <label className="field profile-field-wide">
              <span>Giới thiệu ngắn</span>
              <textarea
                rows={4}
                value={form.bio}
                maxLength={BIO_MAX}
                placeholder="Bạn là ai, quan tâm tới lĩnh vực nào…"
                aria-invalid={Boolean(errors.bio)}
                onChange={(event) => update("bio", event.target.value)}
              />
              <small className={`profile-counter${bioLength > BIO_MAX * 0.9 ? " is-near" : ""}`}>{bioLength}/{BIO_MAX}</small>
              {errors.bio && <small className="field-error">{errors.bio}</small>}
            </label>
          </div>

          <div className={`profile-savebar${dirty ? " is-visible" : ""}`} aria-hidden={!dirty}>
            <span>Bạn có thay đổi chưa lưu</span>
            <div>
              <button
                className="button button-sm button-ghost"
                type="button"
                disabled={busy || !dirty}
                tabIndex={dirty ? 0 : -1}
                onClick={() => { setForm(saved); setErrors({}); }}
              >
                Hoàn tác
              </button>
              <button className="button button-sm button-primary" type="submit" disabled={busy || !dirty} tabIndex={dirty ? 0 : -1}>
                {busy ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </form>

        <aside className="profile-side">
          <section className="profile-card" aria-labelledby={`${formId}-security`}>
            <header className="profile-card-head">
              <h2 id={`${formId}-security`}>Bảo mật</h2>
            </header>
            <ul className="profile-settings">
              <li>
                <span className="profile-settings-ico"><Icon name="shield" size={18} /></span>
                <div>
                  <b>Mật khẩu</b>
                  <small>Nên đổi định kỳ, không dùng lại mật khẩu ở trang khác.</small>
                </div>
                <Link className="button button-sm button-outline" href="/doi-mat-khau">Đổi</Link>
              </li>
              <li>
                <span className="profile-settings-ico"><Icon name="users" size={18} /></span>
                <div>
                  <b>Phiên đăng nhập</b>
                  <small>Nghi lộ mật khẩu hoặc đã đăng nhập ở máy lạ? Đăng xuất khỏi mọi thiết bị.</small>
                </div>
                <button className="button button-sm button-outline" type="button" onClick={logoutEverywhere}>Đăng xuất</button>
              </li>
            </ul>
          </section>

          {aiUser && <AiConsentSettings user={aiUser} />}

          <Link className="profile-side-link" href="/dashboard">
            <Icon name="chart" size={18} />
            <span>Về trang quản lý chiến dịch và khoản ủng hộ</span>
            <Icon name="arrow-right" size={16} />
          </Link>
        </aside>
      </div>

      {toast && (
        <div className={`profile-toast ${toast.tone === "ok" ? "is-ok" : "is-error"}`} role={toast.tone === "ok" ? "status" : "alert"}>
          <Icon name={toast.tone === "ok" ? "check" : "x"} size={16} />
          {toast.text}
        </div>
      )}
    </main>
  );
}
