"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { ApiError } from "@/lib/api";
import {
  fetchMembers,
  inviteMember,
  NO_PERMISSIONS,
  PERMISSIONS,
  removeMember,
  updateMember,
  type MemberPermissions,
  type OrganizationMember,
  type PermissionKey,
} from "@/lib/api/organization-members";

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (err.status === 429) return "Bạn mời quá nhiều lần. Vui lòng thử lại sau.";
    return err.message;
  }
  return fallback;
}

/** Người đại diện mời cộng tác viên, gán chức danh và từng quyền, gỡ hoặc thu hồi lời mời. */
export function OrganizationTeamManager({ organizationId }: { organizationId: string }) {
  const id = useId();
  const dialog = useDialog();
  const [members, setMembers] = useState<OrganizationMember[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [permissions, setPermissions] = useState<MemberPermissions>({ ...NO_PERMISSIONS, postUpdates: true });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetchMembers(organizationId)
      .then((list) => {
        if (active) setMembers(list);
      })
      .catch((err: unknown) => {
        if (active) setLoadError(errorText(err, "Không tải được danh sách cộng tác viên."));
      });
    return () => {
      active = false;
    };
  }, [organizationId]);

  const replace = (next: OrganizationMember) =>
    setMembers((list) => (list ?? []).map((member) => (member.id === next.id ? next : member)));

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!email.trim() || title.trim().length < 2) {
      setError("Nhập email tài khoản Góp Mầm và chức danh (ít nhất 2 ký tự).");
      return;
    }
    setBusy("invite");
    setError("");
    setNotice("");
    try {
      const created = await inviteMember(organizationId, { email: email.trim(), title: title.trim(), permissions });
      setMembers((list) => [...(list ?? []), created]);
      setEmail("");
      setTitle("");
      setNotice(`Đã gửi lời mời tới ${created.user.name}. Họ cần chấp nhận trước khi có quyền.`);
    } catch (err) {
      setError(errorText(err, "Không gửi được lời mời."));
    } finally {
      setBusy("");
    }
  };

  const toggle = async (member: OrganizationMember, key: PermissionKey) => {
    setBusy(member.id);
    setError("");
    try {
      replace(await updateMember(organizationId, member.id, { permissions: { [key]: !member.permissions[key] } }));
    } catch (err) {
      setError(errorText(err, "Không cập nhật được quyền."));
    } finally {
      setBusy("");
    }
  };

  const remove = async (member: OrganizationMember) => {
    const pending = member.status === "pending";
    const ok = await dialog.confirm({
      title: pending ? `Thu hồi lời mời gửi ${member.user.name}?` : `Gỡ ${member.user.name} khỏi đội ngũ?`,
      message: pending
        ? "Người này sẽ không thể chấp nhận lời mời nữa."
        : "Người này mất mọi quyền với tổ chức và các chiến dịch của tổ chức ngay lập tức.",
      confirmLabel: pending ? "Thu hồi" : "Gỡ cộng tác viên",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(member.id);
    setError("");
    try {
      await removeMember(organizationId, member.id);
      setMembers((list) => (list ?? []).filter((item) => item.id !== member.id));
    } catch (err) {
      setError(errorText(err, "Không gỡ được cộng tác viên."));
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="team-manager" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Cộng tác viên</h3>
      <p className="hint">
        Mời người cùng vận hành tổ chức và chọn từng việc họ được làm. Quyền áp dụng cho các chiến dịch của tổ chức do bạn
        hoặc cộng tác viên tạo; cộng tác viên hiện tên và chức danh trên trang công khai.
      </p>

      {loadError && <p className="form-error" role="alert">{loadError}</p>}
      {members === null && !loadError && <p className="hint" role="status">Đang tải…</p>}
      {members && members.length > 0 && (
        <ul className="team-list">
          {members.map((member) => (
            <li key={member.id} className="team-row">
              <div className="team-person">
                <span className="organizer-avatar" aria-hidden="true">{member.user.name.charAt(0).toUpperCase()}</span>
                <div>
                  <b>{member.user.name}</b>
                  <span className="hint">
                    {member.title} · {member.user.email}
                    {member.status === "pending" && <span className="tag tag-amber team-pending">Chờ chấp nhận</span>}
                  </span>
                </div>
              </div>
              <fieldset className="team-perms" disabled={busy === member.id}>
                <legend className="sr-only">Quyền của {member.user.name}</legend>
                {PERMISSIONS.map((permission) => (
                  <label key={permission.key} title={permission.hint}>
                    <input type="checkbox" checked={member.permissions[permission.key]} onChange={() => toggle(member, permission.key)} />
                    <span>{permission.label}</span>
                  </label>
                ))}
              </fieldset>
              <button className="link-button" type="button" disabled={busy === member.id} onClick={() => remove(member)}>
                {member.status === "pending" ? "Thu hồi lời mời" : "Gỡ"}
                <span className="sr-only"> {member.user.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {members?.length === 0 && <p className="hint">Chưa có cộng tác viên nào.</p>}

      <form className="team-invite" onSubmit={invite} noValidate>
        <h4>Mời cộng tác viên</h4>
        <div className="team-invite-row">
          <label className="field">
            <span>Email tài khoản Góp Mầm</span>
            <input type="email" autoComplete="off" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@example.com" />
          </label>
          <label className="field">
            <span>Chức danh</span>
            <input maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vd. Điều phối truyền thông" />
          </label>
        </div>
        <fieldset className="team-perms team-perms-invite">
          <legend>Quyền được giao</legend>
          {PERMISSIONS.map((permission) => (
            <label key={permission.key}>
              <input
                type="checkbox"
                checked={permissions[permission.key]}
                onChange={() => setPermissions((current) => ({ ...current, [permission.key]: !current[permission.key] }))}
              />
              <span><b>{permission.label}</b> <small>{permission.hint}</small></span>
            </label>
          ))}
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
        <button className="button button-primary button-sm" type="submit" disabled={busy === "invite"}>
          {busy === "invite" ? "Đang gửi…" : "Gửi lời mời"}
        </button>
      </form>
    </section>
  );
}
