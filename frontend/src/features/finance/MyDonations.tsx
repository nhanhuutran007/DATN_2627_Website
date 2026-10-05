import Link from "next/link";
import { useEffect, useState } from "react";

import { ApiError, api } from "@/lib/api";
import { cancelDonation, type ApiDonation } from "@/lib/api/donations";
import { formatVnd } from "@/lib/format";

const STATUS_LABEL: Record<ApiDonation["status"], { label: string; tone: string }> = {
  completed: { label: "Đã xác nhận", tone: "tag-green" },
  pending: { label: "Đang xử lý", tone: "tag-amber" },
  failed: { label: "Thất bại", tone: "tag-red" },
  refunded: { label: "Đã hoàn tiền", tone: "tag-blue" },
  expired: { label: "Hết hạn thanh toán", tone: "" },
  cancelled: { label: "Đã hủy", tone: "" },
};

type Donation = ApiDonation & { rewardTier?: { title: string } | null };

/** Lịch sử ủng hộ của người dùng hiện tại, kèm link biên nhận. */
export function MyDonations() {
  const [items, setItems] = useState<Donation[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const cancel = async (id: string) => {
    setBusyId(id);
    setActionError("");
    try {
      const updated = await cancelDonation(id);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, status: updated.status } : item)));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Không hủy được giao dịch, vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get<Donation[]>("/donations/mine")
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") return <p className="hint" role="status">Đang tải…</p>;
  if (state === "error") return <p className="form-error" role="alert">Không tải được lịch sử ủng hộ.</p>;
  if (items.length === 0) {
    return (
      <div className="empty-box">
        <p>Bạn chưa ủng hộ chiến dịch nào.</p>
        <Link className="button button-outline" href="/du-an">Khám phá dự án</Link>
      </div>
    );
  }

  return (
    <>
    {actionError && <p className="form-error" role="alert">{actionError}</p>}
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr><th scope="col">Chiến dịch</th><th scope="col" className="num">Số tiền</th><th scope="col">Ngày</th><th scope="col">Trạng thái</th><th scope="col"><span className="sr-only">Biên nhận</span></th></tr>
        </thead>
        <tbody>
          {items.map((d) => {
            const status = STATUS_LABEL[d.status];
            const hasReceipt = d.status === "completed" || d.status === "refunded";
            return (
              <tr key={d.id}>
                <td>
                  {d.campaign ? <Link href={`/du-an/${d.campaign.id}`}>{d.campaign.title}</Link> : "—"}
                  {d.rewardTier && <small className="hint"> · Quà: {d.rewardTier.title}</small>}
                </td>
                <td className="num">{formatVnd(Number(d.amount))}</td>
                <td className="nowrap">{(d.completedAt ?? d.createdAt) ? new Date((d.completedAt ?? d.createdAt) as string).toLocaleDateString("vi-VN") : "—"}</td>
                <td><span className={`tag ${status.tone}`}>{status.label}</span></td>
                <td>
                  {hasReceipt && <Link href={`/bien-nhan/${d.id}`}>Biên nhận</Link>}
                  {d.status === "pending" && (
                    <button className="link-button" type="button" disabled={busyId === d.id} onClick={() => cancel(d.id)}>
                      Hủy<span className="sr-only"> giao dịch {formatVnd(Number(d.amount))}</span>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
