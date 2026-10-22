"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { PAGE_SIZE, Pagination, pageSlice } from "@/components/ui/Pagination";
import { ApiError } from "@/lib/api";
import { downloadCampaignStatsCsv, downloadDailyDonationsCsv } from "@/lib/api/admin";
import { createCategory, fetchAdminCategories, reorderCategories, updateCategory, type AdminCategory } from "@/lib/api/categories";

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Quản trị nội dung: danh mục lĩnh vực và xuất thống kê ẩn danh. */
export function CategoryManager({ onShowCampaigns }: { onShowCampaigns?: (category: string) => void }) {
  const dialog = useDialog();
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [page, setPage] = useState(0);
  const [requestKey, setRequestKey] = useState(0);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminCategories()
      .then((items) => {
        if (active) setCategories(items);
      })
      .catch((err: unknown) => {
        if (active) setNotice({ tone: "error", text: errorText(err, "Không tải được danh mục.") });
      });
    return () => {
      active = false;
    };
  }, [requestKey]);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    setNotice(null);
    try {
      await action();
      setRequestKey((value) => value + 1);
      setNotice({ tone: "ok", text: success });
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không lưu được thay đổi.") });
    } finally {
      setBusy(null);
    }
  };

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = name.trim();
    if (value.length < 2) return;
    void run("create", async () => {
      await createCategory({ name: value });
      setName("");
    }, `Đã thêm lĩnh vực “${value}”.`);
  };

  const rename = async (category: AdminCategory) => {
    const result = await dialog.prompt({
      title: "Đổi tên lĩnh vực",
      message: category.campaignCount > 0
        ? <>{category.campaignCount} chiến dịch đang thuộc <b>{category.name}</b> sẽ được chuyển sang tên mới.</>
        : <>Đổi tên lĩnh vực <b>{category.name}</b>.</>,
      label: "Tên mới",
      defaultValue: category.name,
      minLength: 2,
      maxLength: 100,
      confirmLabel: "Đổi tên",
    });
    if (!result || result.value.trim() === category.name) return;
    const value = result.value.trim();
    void run(category.id, () => updateCategory(category.id, { name: value }), `Đã đổi “${category.name}” thành “${value}”.`);
  };

  const toggle = async (category: AdminCategory) => {
    const confirmed = await dialog.confirm(
      category.isActive
        ? {
          title: "Ngừng nhận chiến dịch mới",
          message: (
            <>
              Không cho tạo chiến dịch mới trong lĩnh vực <b>{category.name}</b>.
              {category.campaignCount > 0 && <> {category.campaignCount} chiến dịch hiện có vẫn giữ nguyên.</>} Có thể mở lại bất cứ lúc nào.
            </>
          ),
          confirmLabel: "Ngừng nhận",
          tone: "danger",
        }
        : {
          title: "Mở lại lĩnh vực",
          message: <>Lĩnh vực <b>{category.name}</b> sẽ xuất hiện lại trong form tạo chiến dịch và bộ lọc.</>,
          confirmLabel: "Mở lại",
        },
    );
    if (!confirmed) return;
    void run(
      category.id,
      () => updateCategory(category.id, { isActive: !category.isActive }),
      category.isActive
        ? `Đã ngừng nhận chiến dịch mới cho “${category.name}”; chiến dịch cũ giữ nguyên.`
        : `Đã mở lại lĩnh vực “${category.name}”.`,
    );
  };

  const move = (index: number, delta: -1 | 1) => {
    if (!categories || !categories[index + delta]) return;
    const ids = categories.map((category) => category.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    // Gửi cả danh sách để backend đổi thứ tự trong một giao dịch, không để lệch/trùng thứ tự.
    void run(categories[index].id, () => reorderCategories(ids), "Đã cập nhật thứ tự hiển thị.");
  };

  const activeCount = categories?.filter((category) => category.isActive).length ?? 0;

  return (
    <section className="admin-card admin-table-card" id="danh-muc">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Nội dung</p>
          <h2>{categories ? `${categories.length} lĩnh vực · ${activeCount} đang nhận` : "Lĩnh vực chiến dịch"}</h2>
        </div>
        <form className="category-create" onSubmit={create}>
          <label className="sr-only" htmlFor="new-category">Tên lĩnh vực mới</label>
          <input id="new-category" placeholder="Tên lĩnh vực mới" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          <button className="button button-primary button-sm" type="submit" disabled={busy === "create" || name.trim().length < 2}>Thêm</button>
        </form>
      </div>
      {notice && (
        <p className={notice.tone === "ok" ? "admin-notice" : "form-error"} role={notice.tone === "ok" ? "status" : "alert"}>{notice.text}</p>
      )}
      <div className="table-scroll">
        <table>
          <thead><tr><th title="Thứ tự hiển thị">#</th><th>Lĩnh vực</th><th>Chiến dịch</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {categories === null ? (
              <tr><td colSpan={5}><span className="table-muted">Đang tải…</span></td></tr>
            ) : (
              pageSlice(categories, page).map((category, pageIndex) => {
                // Vị trí trong toàn danh sách (dùng cho sắp xếp), không phải trong trang.
                const index = page * PAGE_SIZE + pageIndex;
                return (
                <tr key={category.id} className={category.isActive ? undefined : "category-inactive"}>
                  <td className="table-muted">{index + 1}</td>
                  <td><b>{category.name}</b></td>
                  <td>
                    {category.campaignCount > 0 && onShowCampaigns ? (
                      <button
                        className="link-inline"
                        type="button"
                        title={`Xem các chiến dịch thuộc ${category.name}`}
                        onClick={() => onShowCampaigns(category.name)}
                      >
                        {category.campaignCount.toLocaleString("vi-VN")} chiến dịch
                      </button>
                    ) : (
                      <span className="table-muted">{category.campaignCount.toLocaleString("vi-VN")} chiến dịch</span>
                    )}
                  </td>
                  <td>
                    <span className={`table-status ${category.isActive ? "success" : "failed"}`}>
                      {category.isActive ? "Đang nhận" : "Ngừng nhận"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions category-actions">
                      <span className="category-move">
                        <button type="button" aria-label={`Đưa ${category.name} lên`} title="Đưa lên" disabled={index === 0 || busy !== null} onClick={() => move(index, -1)}>↑</button>
                        <button type="button" aria-label={`Đưa ${category.name} xuống`} title="Đưa xuống" disabled={index === categories.length - 1 || busy !== null} onClick={() => move(index, 1)}>↓</button>
                      </span>
                      <button type="button" disabled={busy === category.id} onClick={() => rename(category)}>Đổi tên</button>
                      <button
                        className={category.isActive ? "table-danger-action" : undefined}
                        type="button"
                        disabled={busy === category.id}
                        onClick={() => void toggle(category)}
                      >
                        {category.isActive ? "Ngừng nhận" : "Mở lại"}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {categories && <Pagination page={page} total={categories.length} onChange={setPage} />}
      <p className="risk-footnote">
        <Icon name="shield" size={15} /> Thứ tự (#) là thứ tự lĩnh vực trong bộ lọc trang khám phá và form tạo chiến dịch. Ngừng nhận: không cho tạo chiến dịch mới trong lĩnh vực, chiến dịch cũ giữ nguyên. Đổi tên cập nhật luôn các chiến dịch. Mọi thay đổi được ghi nhật ký kiểm toán.
      </p>
    </section>
  );
}

export function StatsExport() {
  const [today] = useState(() => isoDay(new Date()));
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState<"campaigns" | "daily" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (kind: "campaigns" | "daily") => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "campaigns") await downloadCampaignStatsCsv();
      else await downloadDailyDonationsCsv({ from, to });
    } catch (err) {
      setError(errorText(err, "Không xuất được CSV."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="admin-card admin-table-card" id="xuat-thong-ke">
      <div className="card-heading">
        <div><p className="eyebrow">Báo cáo</p><h2>Xuất thống kê</h2></div>
      </div>
      <div className="export-grid">
        <article>
          <h3>Theo chiến dịch</h3>
          <p>Mục tiêu, số đã huy động, tỷ lệ đạt, lượt ủng hộ/xem, tiến độ mốc và chi đã báo cáo của mọi chiến dịch.</p>
          <button className="button button-primary button-sm" type="button" disabled={busy !== null} onClick={() => download("campaigns")}>
            {busy === "campaigns" ? "Đang xuất…" : "Tải CSV chiến dịch"}
          </button>
        </article>
        <article>
          <h3>Ủng hộ theo ngày</h3>
          <p>Số lượt và số tiền ủng hộ thành công/đã hoàn theo từng ngày (giờ Việt Nam) và lĩnh vực.</p>
          <div className="recon-filter">
            <label className="field"><span>Từ ngày</span><input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
            <label className="field"><span>Đến ngày</span><input type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} /></label>
            <button className="button button-primary button-sm" type="button" disabled={busy !== null} onClick={() => download("daily")}>
              {busy === "daily" ? "Đang xuất…" : "Tải CSV theo ngày"}
            </button>
          </div>
        </article>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="risk-footnote">
        <Icon name="shield" size={15} /> File chỉ chứa số liệu tổng hợp: không tên, email, số điện thoại hay danh tính người ủng hộ; chủ dự án được giả danh (mã CDA-…). Mỗi lần xuất được ghi nhật ký kiểm toán.
      </p>
    </section>
  );
}
