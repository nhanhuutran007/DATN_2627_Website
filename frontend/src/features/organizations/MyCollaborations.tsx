"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { ImageUploader } from "@/features/media/ImageUploader";
import { FaqManager } from "@/features/campaign-faqs/FaqManager";
import { PostManager } from "@/features/posts/PostManager";
import { ProgressManager } from "@/features/progress/ProgressManager";
import { RewardManager } from "@/features/rewards/RewardManager";
import { ApiError } from "@/lib/api";
import type { ApiCampaignStatus } from "@/lib/api/campaigns";
import {
  acceptInvitation,
  declineInvitation,
  fetchMyCollaborations,
  PERMISSIONS,
  removeMember,
  type Collaboration,
} from "@/lib/api/organization-members";
import { fetchOrganization, updateOrganization, type Organization } from "@/lib/api/organizations";

/** Chiến dịch đã công khai: đăng bài và báo cáo tiến độ được (giống bảng điều khiển chủ dự án). */
const PUBLISHED: ApiCampaignStatus[] = ["approved", "active", "paused", "success", "failed", "ended"];
const CLOSED: ApiCampaignStatus[] = ["success", "failed", "cancelled", "ended"];

type Panel = { campaignId: string; kind: "posts" | "progress" | "rewards" | "faq" } | { campaignId: "profile"; kind: "profile" };

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Lời mời cộng tác đang chờ và các tổ chức mình đang cộng tác (trang Tổ chức của tôi). */
export function MyCollaborations() {
  const dialog = useDialog();
  const [items, setItems] = useState<Collaboration[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [panel, setPanel] = useState<(Panel & { memberId: string }) | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyCollaborations()
      .then((list) => {
        if (active) setItems(list);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!items || items.length === 0) return null;

  const invitations = items.filter((item) => item.status === "pending");
  const active = items.filter((item) => item.status === "active");

  const act = async (item: Collaboration, kind: "accept" | "decline" | "leave") => {
    if (kind === "leave") {
      const ok = await dialog.confirm({
        title: `Rời tổ chức “${item.organization.name}”?`,
        message: "Bạn sẽ mất mọi quyền với tổ chức và các chiến dịch của tổ chức.",
        confirmLabel: "Rời tổ chức",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusy(item.memberId);
    setError("");
    try {
      if (kind === "accept") {
        const accepted = await acceptInvitation(item.memberId);
        setItems((list) => (list ?? []).map((entry) => (entry.memberId === item.memberId ? accepted : entry)));
      } else {
        if (kind === "decline") await declineInvitation(item.memberId);
        else await removeMember(item.organization.id, item.memberId);
        setItems((list) => (list ?? []).filter((entry) => entry.memberId !== item.memberId));
      }
    } catch (err) {
      setError(errorText(err, "Không thực hiện được. Vui lòng thử lại."));
    } finally {
      setBusy("");
    }
  };

  const isOpen = (memberId: string, campaignId: string, kind: Panel["kind"]) =>
    panel?.memberId === memberId && panel.campaignId === campaignId && panel.kind === kind;
  const toggle = (memberId: string, campaignId: string, kind: Panel["kind"]) =>
    setPanel(isOpen(memberId, campaignId, kind) ? null : ({ memberId, campaignId, kind } as Panel & { memberId: string }));

  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}

      {invitations.length > 0 && (
        <section className="collab-section" id="loi-moi" aria-labelledby="loi-moi-title">
          <h2 id="loi-moi-title">Lời mời cộng tác</h2>
          <ul className="org-mine-list">
            {invitations.map((item) => (
              <li className="org-mine-item" key={item.memberId}>
                <p>
                  <b>{item.organization.name}</b> mời bạn làm <b>{item.title}</b>.
                </p>
                <p className="hint">Quyền được giao: {permissionSummary(item)}</p>
                <div className="own-actions">
                  <button className="button button-primary button-sm" type="button" disabled={busy === item.memberId} onClick={() => act(item, "accept")}>
                    Chấp nhận
                  </button>
                  <button className="button button-ghost button-sm" type="button" disabled={busy === item.memberId} onClick={() => act(item, "decline")}>
                    Từ chối
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section className="collab-section" aria-labelledby="cong-tac-title">
          <h2 id="cong-tac-title">Tổ chức bạn cộng tác</h2>
          <ul className="org-mine-list">
            {active.map((item) => {
              const { permissions } = item;
              const verified = item.organization.status === "verified";
              return (
                <li className="org-mine-item" key={item.memberId}>
                  <div className="org-mine-head">
                    <div className="org-mine-title">
                      <h2>{item.organization.name}</h2>
                      <p>{item.title} · {permissionSummary(item)}</p>
                    </div>
                  </div>
                  <div className="own-actions">
                    {verified && (
                      <Link className="button button-outline button-sm" href={`/to-chuc/${item.organization.slug}`}>Trang công khai</Link>
                    )}
                    {permissions.editProfile && verified && (
                      <button
                        className="button button-ghost button-sm"
                        type="button"
                        aria-expanded={isOpen(item.memberId, "profile", "profile")}
                        onClick={() => toggle(item.memberId, "profile", "profile")}
                      >
                        Sửa giới thiệu
                      </button>
                    )}
                    <button className="button button-ghost button-sm" type="button" disabled={busy === item.memberId} onClick={() => act(item, "leave")}>
                      Rời tổ chức
                    </button>
                  </div>
                  {isOpen(item.memberId, "profile", "profile") && <CollaboratorProfileForm slug={item.organization.slug} />}

                  {(permissions.postUpdates || permissions.reportProgress || permissions.manageRewards) && (
                    <div className="collab-campaigns">
                      <h3>Chiến dịch của tổ chức</h3>
                      {item.campaigns.length === 0 && (
                        <p className="hint">Người đại diện chưa tạo chiến dịch nào cho tổ chức.</p>
                      )}
                      <ul>
                        {item.campaigns.map((campaign) => {
                          const published = PUBLISHED.includes(campaign.status);
                          return (
                            <li key={campaign.id}>
                              <div className="collab-campaign-head">
                                <Link href={`/du-an/${campaign.id}`}>{campaign.title}</Link>
                                <div className="own-actions">
                                  {permissions.postUpdates && published && (
                                    <button className="button button-ghost button-sm" type="button" aria-expanded={isOpen(item.memberId, campaign.id, "posts")} onClick={() => toggle(item.memberId, campaign.id, "posts")}>
                                      Bài cập nhật
                                    </button>
                                  )}
                                  {permissions.postUpdates && (
                                    <button className="button button-ghost button-sm" type="button" aria-expanded={isOpen(item.memberId, campaign.id, "faq")} onClick={() => toggle(item.memberId, campaign.id, "faq")}>
                                      FAQ
                                    </button>
                                  )}
                                  {permissions.reportProgress && published && (
                                    <button className="button button-ghost button-sm" type="button" aria-expanded={isOpen(item.memberId, campaign.id, "progress")} onClick={() => toggle(item.memberId, campaign.id, "progress")}>
                                      Tiến độ
                                    </button>
                                  )}
                                  {permissions.manageRewards && (
                                    <button className="button button-ghost button-sm" type="button" aria-expanded={isOpen(item.memberId, campaign.id, "rewards")} onClick={() => toggle(item.memberId, campaign.id, "rewards")}>
                                      Mức quà
                                    </button>
                                  )}
                                </div>
                              </div>
                              {isOpen(item.memberId, campaign.id, "posts") && <PostManager campaignId={campaign.id} />}
                              {isOpen(item.memberId, campaign.id, "faq") && (
                                <FaqManager campaignId={campaign.id} closed={CLOSED.includes(campaign.status)} />
                              )}
                              {isOpen(item.memberId, campaign.id, "progress") && (
                                <ProgressManager campaignId={campaign.id} readOnly={campaign.status === "failed"} />
                              )}
                              {isOpen(item.memberId, campaign.id, "rewards") && (
                                <RewardManager campaignId={campaign.id} closed={CLOSED.includes(campaign.status)} />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

function permissionSummary(item: Collaboration): string {
  const granted = PERMISSIONS.filter((permission) => item.permissions[permission.key]).map((permission) => permission.label);
  return granted.length > 0 ? granted.join(", ") : "chỉ hiển thị trong đội ngũ";
}

type IntroForm = Pick<Organization, "mission" | "email" | "phone" | "address"> & { website: string; logoUrl: string };

/** Cộng tác viên có quyền "Sửa hồ sơ": chỉ phần giới thiệu và liên hệ, không đụng thông tin pháp lý. */
function CollaboratorProfileForm({ slug }: { slug: string }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [form, setForm] = useState<IntroForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetchOrganization(slug)
      .then((org) => {
        if (!active) return;
        setOrganization(org);
        setForm({ mission: org.mission, email: org.email, phone: org.phone, address: org.address, website: org.website ?? "", logoUrl: org.logoUrl ?? "" });
      })
      .catch(() => {
        if (active) setError("Không tải được hồ sơ tổ chức.");
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (!organization || !form) return error ? <p className="form-error" role="alert">{error}</p> : <p className="hint" role="status">Đang tải…</p>;

  const set = (field: keyof IntroForm) => (value: string) => setForm((current) => (current ? { ...current, [field]: value } : current));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await updateOrganization(organization.id, {
        mission: form.mission.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        website: form.website.trim(),
        logoUrl: form.logoUrl,
      });
      setOrganization(saved);
      setNotice("Đã lưu thay đổi.");
    } catch (err) {
      setError(errorText(err, "Không lưu được hồ sơ."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form collab-profile" onSubmit={submit} noValidate>
      <p className="hint">Thông tin pháp lý (tên, số giấy phép, giấy tờ) chỉ người đại diện thay đổi được.</p>
      <ImageUploader label="Logo" value={form.logoUrl} purpose="organization_logo" disabled={busy} onChange={set("logoUrl")} />
      <label className="field">
        <span>Giới thiệu sứ mệnh</span>
        <textarea rows={5} value={form.mission} onChange={(e) => set("mission")(e.target.value)} />
      </label>
      <label className="field">
        <span>Website</span>
        <input value={form.website} onChange={(e) => set("website")(e.target.value)} placeholder="https://" />
      </label>
      <label className="field">
        <span>Email liên hệ</span>
        <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
      </label>
      <label className="field">
        <span>Số điện thoại</span>
        <input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
      </label>
      <label className="field">
        <span>Địa chỉ</span>
        <input value={form.address} onChange={(e) => set("address")(e.target.value)} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}
      <button className="button button-primary button-sm" type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu giới thiệu"}</button>
    </form>
  );
}
