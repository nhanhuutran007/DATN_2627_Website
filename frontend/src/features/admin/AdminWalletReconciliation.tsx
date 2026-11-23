"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { PAGE_SIZE, Pagination } from "@/components/ui/Pagination";
import { ApiError } from "@/lib/api";
import {
  fetchAdminWalletDetail,
  fetchAdminWallets,
  restoreAdminWallet,
  WALLET_TX_LABEL,
  type WalletBuckets,
  type WalletReconDetail,
  type WalletReconPage,
} from "@/lib/api/wallet";
import { formatDateTime, formatVnd } from "@/lib/format";

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function signedVnd(value: number): string {
  return `${value > 0 ? "+" : "−"}${formatVnd(Math.abs(value))}`;
}

const BUCKET_LABEL: Record<keyof WalletBuckets, string> = {
  balance: "Số dư",
  held: "Đang giữ",
  withdrawing: "Chờ rút",
};
const BUCKET_KEYS = Object.keys(BUCKET_LABEL) as Array<keyof WalletBuckets>;

function describeDiff(diff: WalletBuckets): string {
  return BUCKET_KEYS.filter((key) => diff[key] !== 0)
    .map((key) => `${BUCKET_LABEL[key].toLowerCase()} ${signedVnd(diff[key])}`)
    .join(", ");
}

/**
 * Ví người dùng & đối soát: số tiền mỗi người đang có trong ví, so với số dựng lại từ sổ giao
 * dịch và chứng từ gốc (đơn nạp SePay, khoản ủng hộ, yêu cầu rút). Ví lệch bị khóa tiêu/rút
 * cho tới khi admin xử lý; admin chỉ có thể đưa ví về đúng sổ (cần OTP, ghi nhật ký).
 */
export function AdminWalletReconciliation({ onChanged }: { onChanged?: () => void }) {
  const dialog = useDialog();
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [data, setData] = useState<WalletReconPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<WalletReconDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const detailRef = useRef<HTMLElement>(null);

  const load = useCallback(async (next: { page: number; q: string; issuesOnly: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminWallets({ q: next.q.trim() || undefined, issuesOnly: next.issuesOnly, offset: next.page * PAGE_SIZE, limit: PAGE_SIZE });
      setData(result);
      setPage(next.page);
    } catch (err) {
      setError(errorText(err, "Không tải được danh sách ví."));
    } finally {
      setLoading(false);
    }
  }, []);

  const openDetail = useCallback(async (userId: string) => {
    setSelected(userId);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await fetchAdminWalletDetail(userId));
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không tải được chi tiết ví.") });
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminWallets({ offset: 0, limit: PAGE_SIZE })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        if (active) setError(errorText(err, "Không tải được danh sách ví."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    // Mở từ thông báo "Phát hiện ví lệch sổ" (?user=<id>): xem ngay chi tiết ví đó.
    const fromLink = new URLSearchParams(window.location.search).get("user");
    if (fromLink) {
      fetchAdminWalletDetail(fromLink)
        .then((result) => {
          if (!active) return;
          setSelected(result.userId);
          setDetail(result);
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, []);

  const restore = async () => {
    if (!detail) return;
    const result = await dialog.prompt({
      title: "Đưa ví về đúng sổ giao dịch",
      message: (
        <>
          Ví của <b>{detail.name}</b> sẽ được đặt lại theo sổ: số dư <b>{formatVnd(detail.ledger.balance)}</b>, đang giữ{" "}
          <b>{formatVnd(detail.ledger.held)}</b>, chờ rút <b>{formatVnd(detail.ledger.withdrawing)}</b>. Phần lệch (
          {describeDiff(detail.diff)}) bị loại bỏ. Người dùng nhận thông báo; thao tác được ghi nhật ký kiểm toán.
        </>
      ),
      label: "Lý do (lưu nhật ký)",
      placeholder: "Vd. Số dư bị sửa thẳng trong cơ sở dữ liệu ngày 23/11, không có giao dịch nạp",
      minLength: 10,
      maxLength: 500,
      confirmLabel: "Khôi phục theo sổ",
      tone: "danger",
    });
    if (!result) return;
    setBusy(true);
    setNotice(null);
    try {
      const updated = await restoreAdminWallet(detail.userId, result.value.trim());
      setDetail(updated);
      await load({ page, q: query, issuesOnly });
      onChanged?.();
      setNotice({ tone: "ok", text: `Đã đưa ví của ${detail.name} về đúng sổ giao dịch.` });
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không khôi phục được ví.") });
    } finally {
      setBusy(false);
    }
  };

  const totals = data?.totals;

  return (
    <>
      <section className="admin-card admin-table-card" id="doi-soat-vi">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Tài chính</p>
            <h2>{totals ? `${totals.wallets} ví người dùng` : "Ví người dùng & đối soát"}</h2>
          </div>
          <div className="risk-heading-actions">
            <button
              className="button button-outline button-sm"
              type="button"
              disabled={loading}
              onClick={() => {
                void load({ page, q: query, issuesOnly });
                onChanged?.();
              }}
            >
              <Icon name="scale" size={15} /> {loading ? "Đang kiểm tra…" : "Kiểm tra lại"}
            </button>
          </div>
        </div>
        <p className="table-muted">
          Số dư mỗi ví phải bằng số dựng lại từ sổ giao dịch (nạp − giữ + nhả + hoàn − rút), và mỗi giao dịch phải có chứng từ
          gốc. Ví lệch tự động bị khóa ủng hộ/rút tiền; hệ thống kiểm tra mỗi 10 phút và báo cho quản trị viên.
        </p>

        {totals && (
          <dl className="recon-totals">
            <div>
              <dt>Người dùng đang gửi</dt>
              <dd className="num" title="Tổng số dư + đang giữ + chờ rút của mọi ví: số tiền nền tảng đang giữ hộ">
                {formatVnd(totals.liability)}
              </dd>
              <dd className="stat-meta">Số dư + đang giữ + chờ rút của {totals.wallets} ví</dd>
            </div>
            <div>
              <dt>Theo sổ giao dịch</dt>
              <dd className="num">{formatVnd(totals.ledgerLiability)}</dd>
              <dd>
                {totals.liability === totals.ledgerLiability ? (
                  <span className="stat-flag is-ok">Khớp với số trong ví</span>
                ) : (
                  <span className="stat-flag is-bad">Lệch {signedVnd(totals.liability - totals.ledgerLiability)}</span>
                )}
              </dd>
            </div>
            <div className={totals.mismatched ? "is-alert" : undefined}>
              <dt>Ví lệch sổ</dt>
              <dd className={totals.mismatched ? "recon-bad" : "recon-ok"}>{totals.mismatched}</dd>
              <dd className="stat-meta">
                {totals.mismatched ? "Đang bị khóa ủng hộ/rút tiền" : `Trên tổng ${totals.wallets} ví`}
              </dd>
            </div>
            <div>
              <dt>Dòng tiền qua ví</dt>
              <dd>
                <ul className="stat-lines">
                  <li><span>Đã nạp</span><b className="num">{formatVnd(totals.totalTopup)}</b></li>
                  <li><span>Đã chi cho dự án</span><b className="num">{formatVnd(totals.totalCaptured)}</b></li>
                  <li><span>Đã rút</span><b className="num">{formatVnd(totals.totalWithdrawn)}</b></li>
                </ul>
              </dd>
            </div>
          </dl>
        )}

        <form
          className="admin-filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            void load({ page: 0, q: query, issuesOnly });
          }}
        >
          <input
            className="filter-button admin-filter-search"
            type="search"
            placeholder="Tìm theo tên hoặc email…"
            aria-label="Tìm ví theo tên hoặc email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="filter-button"
            aria-label="Lọc ví"
            value={issuesOnly ? "issues" : ""}
            onChange={(event) => {
              const next = event.target.value === "issues";
              setIssuesOnly(next);
              void load({ page: 0, q: query, issuesOnly: next });
            }}
          >
            <option value="">Tất cả ví</option>
            <option value="issues">Chỉ ví lệch sổ</option>
          </select>
          <button className="button button-primary admin-filter-submit" type="submit">Tìm</button>
        </form>

        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && (
          <p className={notice.tone === "ok" ? "admin-notice" : "admin-notice error"} role={notice.tone === "ok" ? "status" : "alert"}>
            {notice.text}
          </p>
        )}

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th className="num">Đã nạp</th>
                <th className="num" title="Tiền đã trừ hẳn cho dự án đạt mục tiêu">Đã chi cho dự án</th>
                <th className="num">Đã rút</th>
                <th className="num">Số dư</th>
                <th className="num" title="Giữ cho cam kết ủng hộ, chờ dự án kết thúc">Đang giữ</th>
                <th className="num" title="Đã gửi yêu cầu rút, chờ admin chuyển khoản">Chờ rút</th>
                <th>Đối soát</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr><td colSpan={9} className="table-muted" role="status">Đang kiểm tra ví…</td></tr>
              ) : !data || data.items.length === 0 ? (
                <tr><td colSpan={9} className="table-muted">{issuesOnly ? "Không có ví nào lệch sổ." : "Chưa có ví nào."}</td></tr>
              ) : (
                data.items.map((row) => (
                  <tr key={row.userId} className={selected === row.userId ? "is-selected" : undefined}>
                    <td>
                      <b>{row.name}</b>
                      <small>{row.email}</small>
                    </td>
                    <td className="num">{formatVnd(row.totalTopup)}</td>
                    <td className="num">{formatVnd(row.totalCaptured)}</td>
                    <td className="num">{formatVnd(row.totalWithdrawn)}</td>
                    <td className="num"><b>{formatVnd(row.wallet.balance)}</b></td>
                    <td className="num">{formatVnd(row.wallet.held)}</td>
                    <td className="num">{formatVnd(row.wallet.withdrawing)}</td>
                    <td>
                      {row.status === "mismatch" ? (
                        <>
                          <span className="tag tag-red">Lệch</span>
                          <small className="recon-diff">{row.summary}</small>
                        </>
                      ) : (
                        <span className="tag tag-green">Khớp</span>
                      )}
                    </td>
                    <td>
                      <button className="link-inline" type="button" onClick={() => void openDetail(row.userId)}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={page} total={data.total} onChange={(next) => void load({ page: next, q: query, issuesOnly })} />}
        {data && (
          <p className="risk-footnote">
            <Icon name="shield" size={15} /> Kiểm tra lúc {formatDateTime(data.checkedAt)}. Số tiền “Người dùng đang gửi” cần khớp số dư
            tài khoản ngân hàng nhận tiền nạp SePay (đối chiếu sao kê).
          </p>
        )}
      </section>

      {selected && (
        <section className="admin-card admin-table-card wallet-recon-detail" ref={detailRef} aria-live="polite">
          {detailLoading || !detail ? (
            <p className="table-muted" role="status">Đang tải chi tiết ví…</p>
          ) : (
            <>
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Chi tiết ví</p>
                  <h2>{detail.name} <small className="table-muted">{detail.email}</small></h2>
                </div>
                <div className="risk-heading-actions">
                  {detail.canRestore && (
                    <button className="button button-primary button-sm" type="button" disabled={busy} onClick={() => void restore()}>
                      {busy ? "Đang khôi phục…" : "Khôi phục theo sổ"}
                    </button>
                  )}
                  <button className="button button-outline button-sm" type="button" onClick={() => { setSelected(null); setDetail(null); }}>
                    Đóng
                  </button>
                </div>
              </div>

              {detail.status === "mismatch" ? (
                <div className="wallet-recon-alert" role="alert">
                  <div>
                    <h3>Vì sao ví bị khóa ủng hộ/rút tiền</h3>
                    <ul>
                      {detail.changedAfterLastTx && (
                        <li>
                          Số dư bị thay đổi ngoài hệ thống <b>sau giao dịch cuối cùng</b> ({formatDateTime(detail.changedAfterLastTx.at)}):{" "}
                          {describeDiff(detail.changedAfterLastTx.diff)}.
                        </li>
                      )}
                      {detail.firstBreak && (
                        <li>
                          Số dư nhảy ngoài sổ ngay trước giao dịch “{WALLET_TX_LABEL[detail.firstBreak.type].label}” lúc{" "}
                          {formatDateTime(detail.firstBreak.createdAt)}: {describeDiff(detail.firstBreak.jump)}.
                        </li>
                      )}
                      {detail.issues.map((issue, index) => (
                        <li key={`${issue.txId ?? issue.kind}-${index}`}>
                          {issue.message}: {formatVnd(issue.amount)}
                          {issue.at && <> ({formatDateTime(issue.at)})</>}.
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>Cách mở khóa ví</h3>
                    <ol>
                      <li>
                        Xác minh nguồn gốc phần lệch: xem <b>Nhật ký kiểm toán</b> và đối chiếu sao kê tài khoản nhận tiền SePay. Số dư
                        chỉ được tăng qua nạp SePay, nhả cam kết hoặc hoàn tiền — không có cách cộng tay hợp lệ.
                      </li>
                      {detail.canRestore ? (
                        <li>
                          Bấm <b>Khôi phục theo sổ</b> (cần mã OTP gửi về email quản trị, ghi lý do). Ví được đặt lại đúng số theo sổ
                          giao dịch, người dùng nhận thông báo.
                        </li>
                      ) : describeDiff(detail.diff) ? (
                        <li>
                          Chưa khôi phục được: phần tiền ngoài sổ đã được dùng để ủng hộ hoặc rút, nên sổ cho ra số âm. Hãy từ chối các
                          yêu cầu rút đang chờ của người dùng này (mục Rút tiền ví) và hủy các cam kết liên quan, sau đó quay lại bấm{" "}
                          <b>Khôi phục theo sổ</b>. Trong lúc xử lý có thể khóa tài khoản ở mục Người dùng.
                        </li>
                      ) : null}
                      {detail.issues.length > 0 && (
                        <li>
                          Giao dịch không khớp chứng từ (đơn nạp, khoản ủng hộ, yêu cầu rút) không sửa được bằng nút khôi phục: cần
                          đối chiếu với SePay/sao kê và sửa dữ liệu gốc cho khớp.
                        </li>
                      )}
                      <li>
                        Ví <b>tự mở khóa ngay</b> khi số dư khớp sổ: hệ thống kiểm tra lại mỗi lần người dùng ủng hộ hoặc rút tiền,
                        không cần bật lại bằng tay. Bấm “Kiểm tra lại” để xem trạng thái mới.
                      </li>
                    </ol>
                  </div>
                </div>
              ) : (
                <p className="admin-notice" role="status">Ví khớp sổ giao dịch và chứng từ gốc — người dùng ủng hộ và rút tiền bình thường.</p>
              )}

              <div className="wallet-compare" aria-label="So sánh số trong ví với sổ giao dịch">
                {BUCKET_KEYS.map((key) => {
                  const diff = detail.diff[key];
                  return (
                    <section key={key} className={`wallet-compare-card${diff === 0 ? "" : " is-bad"}`}>
                      <h3>{BUCKET_LABEL[key]}</h3>
                      <ul className="stat-lines">
                        <li><span>Trong ví</span><b className="num">{formatVnd(detail.wallet[key])}</b></li>
                        <li><span>Theo sổ giao dịch</span><b className="num">{formatVnd(detail.ledger[key])}</b></li>
                      </ul>
                      <p className={`stat-flag ${diff === 0 ? "is-ok" : "is-bad"}`}>
                        {diff === 0 ? "Khớp" : `Lệch ${signedVnd(diff)}`}
                      </p>
                    </section>
                  );
                })}
              </div>

              <h3 className="wallet-recon-subhead">Sổ giao dịch ({detail.txCount})</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Loại</th>
                      <th className="num">Số tiền</th>
                      <th className="num">Số dư sau</th>
                      <th className="num">Đang giữ sau</th>
                      <th className="num">Chờ rút sau</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.transactions.length === 0 ? (
                      <tr><td colSpan={7} className="table-muted">Ví chưa có giao dịch nào, nhưng có số dư.</td></tr>
                    ) : (
                      detail.transactions.map((tx) => (
                        <tr key={tx.id} className={detail.firstBreak?.txId === tx.id ? "is-selected" : undefined}>
                          <td>{formatDateTime(tx.createdAt)}</td>
                          <td>{WALLET_TX_LABEL[tx.type].label}</td>
                          <td className="num">{WALLET_TX_LABEL[tx.type].sign}{formatVnd(tx.amount)}</td>
                          <td className="num">{formatVnd(tx.balanceAfter)}</td>
                          <td className="num">{formatVnd(tx.heldAfter)}</td>
                          <td className="num">{formatVnd(tx.withdrawingAfter)}</td>
                          <td className="table-muted mono">{tx.note ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
