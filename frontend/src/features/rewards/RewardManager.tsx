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

import { emptyTier, tiersToPayloads, validateTiers, type DraftTier } from "./RewardTiersEditor";

type LoadState = "loading" | "ready" | "error";

function message(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Quản lý mức quà của một chiến dịch đã có (trang quản lý của chủ dự án). */
export function RewardManager({ campaignId, closed }: { campaignId: string; closed: boolean }) {
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState<DraftTier>({ ...emptyTier });
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

  const toggle = async (tier: RewardTier) => {
    setBusy(tier.id);
    setError("");
    try {
      const updated = await updateRewardTier(tier.id, { isActive: !tier.isActive });
      setTiers((prev) => prev.map((t) => (t.id === tier.id ? updated : t)));
      setNotice(updated.isActive ? `Đã mở lại mức "${tier.title}".` : `Đã ngừng nhận mức "${tier.title}".`);
    } catch (err) {
      setError(message(err, "Không cập nhật được mức quà."));
    } finally {
      setBusy(null);
    }
  };

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = validateTiers([draft]);
    const [payload] = tiersToPayloads([draft]);
    if (invalid || !payload) {
      setError(invalid || "Vui lòng nhập thông tin mức quà.");
      return;
    }
    setBusy("new");
    setError("");
    try {
      const created = await createRewardTier(campaignId, { ...payload, sortOrder: tiers.length });
      setTiers((prev) => [...prev, created]);
      setDraft({ ...emptyTier });
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

  return (
    <div className="reward-manager">
      {tiers.length === 0 ? (
        <p className="hint">Chiến dịch chưa có mức quà nào.</p>
      ) : (
        <ul className="reward-manager-list">
          {tiers.map((tier) => (
            <li key={tier.id} className={tier.isActive ? "" : "is-off"}>
              <div>
                <b>{tier.title}</b> <span className="num">· từ {formatVnd(tier.minAmount)}</span>
                <small>
                  Đã nhận {tier.claimedCount}
                  {tier.quantityLimit !== null ? `/${tier.quantityLimit} suất` : " suất (không giới hạn)"}
                  {!tier.isActive && " · đang ngừng nhận"}
                </small>
              </div>
              {!closed && (
                <button className="button button-outline button-sm" type="button" disabled={busy === tier.id} onClick={() => toggle(tier)}>
                  {tier.isActive ? "Ngừng nhận" : "Mở lại"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!closed && tiers.length < 10 && (
        <form className="reward-add" onSubmit={add}>
          <p className="reward-add-title">Thêm mức quà</p>
          <div className="field-row">
            <label className="field field-span-2">
              <span>Tên mức</span>
              <input value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label className="field">
              <span>Ủng hộ từ (VNĐ)</span>
              <input type="number" min={20000} step={10000} value={draft.minAmount} onChange={(e) => setDraft({ ...draft, minAmount: e.target.value })} />
            </label>
            <label className="field">
              <span>Số suất</span>
              <input type="number" min={1} placeholder="Không giới hạn" value={draft.limit} onChange={(e) => setDraft({ ...draft, limit: e.target.value })} />
            </label>
            <label className="field field-span-4">
              <span>Mô tả phần quà</span>
              <input value={draft.description} maxLength={1000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
          </div>
          <button className="button button-primary button-sm" type="submit" disabled={busy === "new"}>
            {busy === "new" ? "Đang thêm…" : "Thêm mức"}
          </button>
        </form>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && !error && <p className="form-notice" role="status">{notice}</p>}

      <div className="reward-claims">
        <p className="reward-add-title">Người nhận quà ({claims.length})</p>
        {claims.length === 0 ? (
          <p className="hint">Chưa có khoản ủng hộ nào kèm quà được xác nhận.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th scope="col">Người ủng hộ</th><th scope="col">Phần quà</th><th scope="col" className="num">Số tiền</th><th scope="col">Ngày</th></tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.donationId}>
                    <td>{claim.backerName}</td>
                    <td>{claim.tierTitle}</td>
                    <td className="num">{formatVnd(claim.amount)}</td>
                    <td className="nowrap">{claim.completedAt ? new Date(claim.completedAt).toLocaleDateString("vi-VN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
