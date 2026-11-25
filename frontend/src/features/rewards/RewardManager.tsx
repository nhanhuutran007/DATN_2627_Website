import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "@/lib/api";
import {
  createRewardTier,
  fetchManagedRewardTiers,
  fetchRewardClaims,
  updateRewardTier,
  type RewardClaim,
  type RewardTier,
} from "@/lib/api/rewards";
import { formatVnd } from "@/lib/format";

import { RewardCard } from "./RewardCard";
import { draftToPayload, emptyTier, RewardTierFields, tierToDraft, validateTiers, type DraftTier } from "./RewardTiersEditor";

type LoadState = "loading" | "ready" | "error";

const CLAIM_STATUS: Record<string, { label: string; tone: string }> = {
  completed: { label: "Đã thanh toán", tone: "tag-green" },
  pledged: { label: "Cam kết · chưa trả tiền", tone: "tag-amber" },
  awaiting_payment: { label: "Chờ thanh toán", tone: "tag-amber" },
  charge_failed: { label: "Trừ tiền thất bại", tone: "tag-red" },
};

function message(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Quản lý mức quà của một chiến dịch đã có: xem trước thẻ quà như người ủng hộ thấy,
 * sửa/ngừng nhận từng mức, thêm mức mới, và danh sách người nhận quà (backer report).
 */
export function RewardManager({ campaignId, closed }: { campaignId: string; closed: boolean }) {
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState<DraftTier>({ ...emptyTier, items: [] });
  const [editing, setEditing] = useState<{ id: string; draft: DraftTier } | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchManagedRewardTiers(campaignId), fetchRewardClaims(campaignId)])
      .then(([t, c]) => {
        if (cancelled) return;
        setTiers(t);
        setClaims(c);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, reloadKey]);

  const replace = (updated: RewardTier) => setTiers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

  const toggle = async (tier: RewardTier) => {
    setBusy(tier.id);
    setError("");
    try {
      const updated = await updateRewardTier(tier.id, { isActive: !tier.isActive });
      replace(updated);
      setNotice(updated.isActive ? `Đã mở lại mức "${tier.title}".` : `Đã ngừng nhận mức "${tier.title}".`);
    } catch (err) {
      setError(message(err, "Không cập nhật được mức quà."));
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const invalid = validateTiers([editing.draft]);
    if (invalid) {
      setError(invalid);
      return;
    }
    const original = tiers.find((t) => t.id === editing.id);
    const payload = draftToPayload(editing.draft);
    // Sau khi có người chọn, không gửi lại số tiền (máy chủ chặn đổi số tiền khi đã phát hành).
    if (original && Number(original.minAmount) === payload.minAmount) delete (payload as { minAmount?: number }).minAmount;
    setBusy(editing.id);
    setError("");
    try {
      const updated = await updateRewardTier(editing.id, payload);
      replace(updated);
      setEditing(null);
      setNotice(`Đã lưu mức "${updated.title}".`);
    } catch (err) {
      setError(message(err, "Không lưu được mức quà."));
    } finally {
      setBusy(null);
    }
  };

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = validateTiers([draft]);
    if (invalid || !draft.title.trim()) {
      setError(invalid || "Vui lòng nhập thông tin mức quà.");
      return;
    }
    setBusy("new");
    setError("");
    try {
      const created = await createRewardTier(campaignId, draftToPayload(draft, tiers.length));
      setTiers((prev) => [...prev, created]);
      setDraft({ ...emptyTier, items: [] });
      setAdding(false);
      setNotice(`Đã thêm mức "${created.title}".`);
    } catch (err) {
      setError(message(err, "Không thêm được mức quà."));
    } finally {
      setBusy(null);
    }
  };

  if (state === "loading") return <p className="hint" role="status">Đang tải mức quà…</p>;
  if (state === "error") {
    return (
      <p className="form-error" role="alert">
        Không tải được mức quà.{" "}
        <button className="link-button" type="button" onClick={() => { setState("loading"); setReloadKey((k) => k + 1); }}>Thử lại</button>
      </p>
    );
  }

  const shippingClaims = claims.filter((claim) => claim.recipient);

  return (
    <div className="reward-manager">
      {tiers.length === 0 ? (
        <p className="hint">Chiến dịch chưa có mức quà nào.</p>
      ) : (
        <ul className="reward-manager-grid">
          {tiers.map((tier) => (
            <li key={tier.id}>
              {editing?.id === tier.id ? (
                <form className="reward-edit" onSubmit={saveEdit}>
                  <RewardTierFields
                    tier={editing.draft}
                    lockAmount={tier.claimedCount > 0}
                    onChange={(next) => setEditing({ id: tier.id, draft: next })}
                  />
                  <div className="own-actions">
                    <button className="button button-primary button-sm" type="submit" disabled={busy === tier.id}>
                      {busy === tier.id ? "Đang lưu…" : "Lưu mức quà"}
                    </button>
                    <button className="button button-ghost button-sm" type="button" onClick={() => setEditing(null)}>Hủy</button>
                  </div>
                </form>
              ) : (
                <RewardCard
                  tier={tier}
                  action={
                    !closed && (
                      <div className="own-actions">
                        <button className="button button-outline button-sm" type="button" onClick={() => { setEditing({ id: tier.id, draft: tierToDraft(tier) }); setError(""); }}>
                          Sửa
                        </button>
                        <button className="button button-ghost button-sm" type="button" disabled={busy === tier.id} onClick={() => toggle(tier)}>
                          {tier.isActive ? "Ngừng nhận" : "Mở lại"}
                        </button>
                      </div>
                    )
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!closed && tiers.length < 10 && (
        adding ? (
          <form className="reward-add" onSubmit={add}>
            <p className="reward-add-title">Thêm mức quà</p>
            <RewardTierFields tier={draft} onChange={setDraft} />
            <div className="own-actions">
              <button className="button button-primary button-sm" type="submit" disabled={busy === "new"}>
                {busy === "new" ? "Đang thêm…" : "Thêm mức"}
              </button>
              <button className="button button-ghost button-sm" type="button" onClick={() => setAdding(false)}>Hủy</button>
            </div>
          </form>
        ) : (
          <button className="button button-outline button-sm reward-add-open" type="button" onClick={() => setAdding(true)}>
            + Thêm mức quà
          </button>
        )
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && !error && <p className="form-notice" role="status">{notice}</p>}

      <div className="reward-claims">
        <p className="reward-add-title">
          Người nhận quà ({claims.length}){shippingClaims.length > 0 && ` · ${shippingClaims.length} cần gửi tận nơi`}
        </p>
        {claims.length > 0 && (
          <p className="hint">
            Gồm cả khoản đang cam kết (chưa trừ tiền). Chỉ gửi quà cho khoản “Đã thanh toán”; thông tin gửi quà không chia sẻ cho bên khác.
          </p>
        )}
        {claims.length === 0 ? (
          <p className="hint">Chưa có khoản ủng hộ nào kèm quà.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Người ủng hộ</th>
                  <th scope="col">Phần quà</th>
                  <th scope="col" className="num">Số tiền</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày</th>
                  <th scope="col">Gửi quà tới</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => {
                  const status = CLAIM_STATUS[claim.status ?? "completed"] ?? { label: claim.status ?? "", tone: "" };
                  return (
                    <tr key={claim.donationId}>
                      <td>{claim.backerName}</td>
                      <td>{claim.tierTitle}</td>
                      <td className="num">{formatVnd(claim.amount)}</td>
                      <td><span className={`tag ${status.tone}`}>{status.label}</span></td>
                      <td className="nowrap">{claim.completedAt ? new Date(claim.completedAt).toLocaleDateString("vi-VN") : "—"}</td>
                      <td>
                        {claim.recipient ? (
                          <>
                            <b>{claim.recipient.name}</b> · <a href={`tel:${claim.recipient.phone.replace(/[^0-9+]/g, "")}`}>{claim.recipient.phone}</a>
                            <br />
                            {claim.recipient.address}
                          </>
                        ) : (
                          <span className="hint">Không cần giao, hoặc khoản cũ chưa có địa chỉ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
