"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { ImageUploader } from "@/features/media/ImageUploader";
import { ApiError, AUTH_EVENT, hasSession, logoutAllRequest } from "@/lib/api";
import { fetchMyProfile, updateMyProfile, type MyProfile, type ProfileUpdate } from "@/lib/api/users";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(AUTH_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const ROLE_LABEL: Record<MyProfile["role"], string> = {
  user: "Người ủng hộ",
  campaign_owner: "Chủ dự án",
  admin: "Quản trị viên",
};

const PHONE_PATTERN = /^\+?[0-9 .-]{8,20}$/;

function toForm(profile: MyProfile): ProfileUpdate {
  return {
    name: profile.name,
    avatar: profile.avatar ?? "",
    bio: profile.bio ?? "",
    phone: profile.phone ?? "",
    organization: profile.organization ?? "",
  };
}

function validate(form: ProfileUpdate): string {
  const name = form.name.trim();
  if (name.length < 2) return "Họ tên cần ít nhất 2 ký tự.";
  if (name.length > 100) return "Họ tên tối đa 100 ký tự.";
  if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) return "Số điện thoại không hợp lệ.";
  if (form.organization.trim().length > 255) return "Tên tổ chức tối đa 255 ký tự.";
  if (form.bio.trim().length > 500) return "Giới thiệu tối đa 500 ký tự.";
  return "";
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 429) return "Bạn thao tác quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; profile: MyProfile };

export function ProfileForm() {
  const router = useRouter();
  // `null` khi render trên server: chưa biết trạng thái đăng nhập (localStorage).
  const loggedIn = useSyncExternalStore(subscribe, hasSession, () => null);

  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [form, setForm] = useState<ProfileUpdate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const fetchProfile = useCallback(() => {
    fetchMyProfile()
      .then((profile) => {
        setLoad({ status: "ready", profile });
        setForm(toForm(profile));
      })
      .catch((err: unknown) => setLoad({ status: "error", message: messageFor(err) }));
  }, []);

  const retry = () => {
    setLoad({ status: "loading" });
    fetchProfile();
  };

  useEffect(() => {
    if (loggedIn) fetchProfile();
  }, [loggedIn, fetchProfile]);

  if (loggedIn === null) {
    return <p className="hint">Đang tải…</p>;
  }

  if (!loggedIn) {
    return (
      <div className="form">
        <p className="form-error" role="alert">Bạn cần đăng nhập để xem và sửa hồ sơ.</p>
        <Link className="button button-primary button-block" href="/dang-nhap?next=/ho-so">Đăng nhập</Link>
      </div>
    );
  }

  if (load.status === "loading" || !form) {
    if (load.status === "error") {
      return (
        <div className="form">
          <p className="form-error" role="alert">{load.message}</p>
          <button className="button button-outline button-block" type="button" onClick={retry}>Thử lại</button>
        </div>
      );
    }
    return <p className="hint" role="status">Đang tải hồ sơ…</p>;
  }

  const profile = load.status === "ready" ? load.profile : null;

  const update = (field: keyof ProfileUpdate, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    setSaved(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    setError("");
    setSaved(false);
    const invalid = validate(form);
    if (invalid) return setError(invalid);

    setBusy(true);
    try {
      const next = await updateMyProfile(profile.id, {
        name: form.name.trim(),
        avatar: form.avatar.trim(),
        bio: form.bio.trim(),
        phone: form.phone.trim(),
        organization: form.organization.trim(),
      });
      setLoad({ status: "ready", profile: next });
      setForm(toForm(next));
      setSaved(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const logoutEverywhere = async () => {
    setLogoutBusy(true);
    setLogoutError("");
    try {
      await logoutAllRequest();
      router.push("/dang-nhap");
    } catch (err) {
      setLogoutError(messageFor(err));
      setLogoutBusy(false);
    }
  };

  return (
    <>
      <form className="form" onSubmit={submit} noValidate>
        {profile && (
          <dl className="profile-meta">
            <div>
              <dt>Email</dt>
              <dd>
                {profile.email}{" "}
                {profile.emailVerified ? (
                  <span className="tag tag-green">Đã xác minh</span>
                ) : (
                  <span className="tag tag-amber">Chưa xác minh</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Vai trò</dt>
              <dd>{ROLE_LABEL[profile.role]}</dd>
            </div>
          </dl>
        )}

        <ImageUploader
          label="Ảnh đại diện"
          value={form.avatar}
          onChange={(url) => update("avatar", url)}
          purpose="avatar"
          disabled={busy}
          hint="Ảnh vuông hiển thị rõ nhất."
        />

        <label className="field">
          <span>Họ tên</span>
          <input
            required
            value={form.name}
            maxLength={100}
            autoComplete="name"
            onChange={(event) => update("name", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Tổ chức / nhóm <small>(không bắt buộc)</small></span>
          <input
            value={form.organization}
            maxLength={255}
            autoComplete="organization"
            onChange={(event) => update("organization", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Số điện thoại <small>(chỉ bạn và quản trị viên thấy)</small></span>
          <input
            type="tel"
            value={form.phone}
            maxLength={20}
            autoComplete="tel"
            placeholder="VD: 0912 345 678"
            onChange={(event) => update("phone", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Giới thiệu ngắn <small>({form.bio.length}/500)</small></span>
          <textarea
            rows={4}
            value={form.bio}
            maxLength={500}
            onChange={(event) => update("bio", event.target.value)}
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}
        {saved && <p className="form-notice" role="status">Đã lưu hồ sơ.</p>}

        <button className="button button-primary button-block" type="submit" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu hồ sơ"}
        </button>
        <p className="form-switch">
          <Link href="/doi-mat-khau">Đổi mật khẩu</Link> · <Link href="/dashboard">Về trang quản lý</Link>
        </p>
      </form>

      <section className="profile-sessions" aria-labelledby="phien-dang-nhap">
        <h2 id="phien-dang-nhap">Phiên đăng nhập</h2>
        <p className="hint">
          Nếu bạn từng đăng nhập trên máy lạ hoặc nghi lộ mật khẩu, hãy đăng xuất khỏi mọi thiết bị
          (kể cả thiết bị này).
        </p>
        {logoutError && <p className="form-error" role="alert">{logoutError}</p>}
        {confirmLogoutAll ? (
          <div className="profile-confirm" role="group" aria-label="Xác nhận đăng xuất mọi thiết bị">
            <button className="button button-primary" type="button" disabled={logoutBusy} onClick={logoutEverywhere}>
              {logoutBusy ? "Đang đăng xuất…" : "Xác nhận đăng xuất tất cả"}
            </button>
            <button className="button button-ghost" type="button" disabled={logoutBusy} onClick={() => setConfirmLogoutAll(false)}>
              Hủy
            </button>
          </div>
        ) : (
          <button className="button button-outline button-block" type="button" onClick={() => setConfirmLogoutAll(true)}>
            Đăng xuất khỏi mọi thiết bị
          </button>
        )}
      </section>
    </>
  );
}
