"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { Pagination, pageSlice } from "@/components/ui/Pagination";
import { ApiError } from "@/lib/api";
import { downloadCampaignStatsCsv, downloadDailyDonationsCsv } from "@/lib/api/admin";
import { foldVietnamese } from "@/lib/api/campaigns";
import { createCategory, fetchAdminCategories, reorderCategories, updateCategory, type AdminCategory } from "@/lib/api/categories";
import { ACCEPTED_IMAGE_TYPES, uploadImage, validateImageFile } from "@/lib/api/media";
import { categoryCover, categoryIcon } from "@/lib/covers";

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Ngày theo lịch địa phương dạng yyyy-mm-dd (toISOString lệch ngày trước 7h sáng giờ VN). */
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

type CategoryStatusFilter = "" | "active" | "inactive";

/** Hậu tố tiêu đề theo bộ lọc trạng thái, vd. "25 lĩnh vực đang nhận chiến dịch". */
const CATEGORY_STATUS_SUFFIX: Record<CategoryStatusFilter, string> = {
  "": "",
  active: " đang nhận chiến dịch",
  inactive: " ngừng nhận chiến dịch",
};

/** Quản trị nội dung: danh mục lĩnh vực và xuất thống kê ẩn danh. */
export function CategoryManager({ onShowCampaigns }: { onShowCampaigns?: (category: string) => void }) {
  const dialog = useDialog();
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>("");
  const [requestKey, setRequestKey] = useState(0);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageTarget, setImageTarget] = useState<AdminCategory | null>(null);

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

  const pickImage = (category: AdminCategory) => {
    setImageTarget(category);
    fileInput.current?.click();
  };

  const uploadCategoryImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const category = imageTarget;
    if (!file || !category) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setNotice({ tone: "error", text: invalid });
      return;
    }
    void run(category.id, async () => {
      const uploaded = await uploadImage(file, "category_image");
      await updateCategory(category.id, { imageUrl: uploaded.url });
    }, `Đã cập nhật ảnh đại diện cho “${category.name}”.`);
  };

  const resetImage = async (category: AdminCategory) => {
    const confirmed = await dialog.confirm({
      title: "Dùng lại ảnh mặc định",
      message: <>Bỏ ảnh đã tải lên của lĩnh vực <b>{category.name}</b> và dùng lại ảnh minh họa có sẵn.</>,
      confirmLabel: "Dùng ảnh mặc định",
    });
    if (!confirmed) return;
    void run(category.id, () => updateCategory(category.id, { imageUrl: "" }), `Đã dùng lại ảnh mặc định cho “${category.name}”.`);
  };

  const move = (index: number, delta: -1 | 1) => {
    if (!categories || !categories[index + delta]) return;
    const ids = categories.map((category) => category.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    // Gửi cả danh sách để backend đổi thứ tự trong một giao dịch, không để lệch/trùng thứ tự.
    void run(categories[index].id, () => reorderCategories(ids), "Đã cập nhật thứ tự hiển thị.");
  };

  const folded = foldVietnamese(keyword.trim());
  const visible = (categories ?? []).filter((category) => {
    if (statusFilter === "active" && !category.isActive) return false;
    if (statusFilter === "inactive" && category.isActive) return false;
    return !folded || foldVietnamese(category.name).includes(folded);
  });
  const filtering = Boolean(folded || statusFilter);

  return (
    <section className="admin-card admin-table-card" id="danh-muc">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Nội dung</p>
          <h2>{categories ? `${visible.length} lĩnh vực${CATEGORY_STATUS_SUFFIX[statusFilter]}` : "Lĩnh vực chiến dịch"}</h2>
        </div>
        <form className="category-create" onSubmit={create}>
          <label className="sr-only" htmlFor="new-category">Tên lĩnh vực mới</label>
          <input id="new-category" placeholder="Tên lĩnh vực mới" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          <button className="button button-primary button-sm" type="submit" disabled={busy === "create" || name.trim().length < 2}>Thêm</button>
        </form>
      </div>
      <div className="admin-filter-bar">
        <input
          className="filter-button admin-filter-search"
          type="search"
          placeholder="Tìm lĩnh vực theo tên…"
          aria-label="Tìm lĩnh vực"
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setPage(0);
          }}
        />
        <select
          className="filter-button"
          aria-label="Lọc theo trạng thái nhận chiến dịch"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as CategoryStatusFilter);
            setPage(0);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang nhận chiến dịch</option>
          <option value="inactive">Ngừng nhận chiến dịch</option>
        </select>
        {filtering && (
          <button
            className="link-inline"
            type="button"
            onClick={() => {
              setKeyword("");
              setStatusFilter("");
              setPage(0);
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>
      {notice && (
        <p className={notice.tone === "ok" ? "admin-notice" : "form-error"} role={notice.tone === "ok" ? "status" : "alert"}>{notice.text}</p>
      )}
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        tabIndex={-1}
        aria-hidden="true"
        onChange={uploadCategoryImage}
      />
      <div className="table-scroll">
        <table>
          <thead><tr><th title="Thứ tự hiển thị">#</th><th>Ảnh</th><th>Lĩnh vực</th><th>Chiến dịch</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {categories === null ? (
              <tr><td colSpan={6}><span className="table-muted">Đang tải…</span></td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={6}><span className="table-muted">Không có lĩnh vực nào khớp bộ lọc.</span></td></tr>
            ) : (
              pageSlice(visible, page).map((category) => {
                // Vị trí trong toàn danh sách (dùng cho sắp xếp và cột #), không phải trong trang đang lọc.
                const index = categories.indexOf(category);
                const cover = categoryCover(category.name, category.imageUrl);
                return (
                <tr key={category.id} className={category.isActive ? undefined : "category-inactive"}>
                  <td className="table-muted">{index + 1}</td>
                  <td>
                    <span className="category-thumb" title={cover ? (cover.uploaded ? "Ảnh đã tải lên" : "Ảnh minh họa mặc định") : "Chưa có ảnh"}>
                      {cover ? (
                        <Image src={cover.src} alt={`Ảnh lĩnh vực ${category.name}`} fill sizes="72px" unoptimized={cover.uploaded} />
                      ) : (
                        <Icon name={categoryIcon(category.name)} size={20} />
                      )}
                    </span>
                  </td>
                  <td>
                    <b>{category.name}</b>
                    <span className="category-image-source">{category.imageUrl ? "Ảnh đã tải lên" : cover ? "Ảnh mặc định" : "Chưa có ảnh"}</span>
                  </td>
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
                        <button type="button" aria-label={`Đưa ${category.name} lên`} title="Đưa lên" disabled={filtering || index === 0 || busy !== null} onClick={() => move(index, -1)}>↑</button>
                        <button type="button" aria-label={`Đưa ${category.name} xuống`} title="Đưa xuống" disabled={filtering || index === categories.length - 1 || busy !== null} onClick={() => move(index, 1)}>↓</button>
                      </span>
                      <button type="button" disabled={busy === category.id} onClick={() => rename(category)}>Đổi tên</button>
                      <button type="button" disabled={busy === category.id} onClick={() => pickImage(category)}>Đổi ảnh</button>
                      {category.imageUrl && (
                        <button type="button" disabled={busy === category.id} onClick={() => void resetImage(category)}>Ảnh mặc định</button>
                      )}
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
      {categories && <Pagination page={page} total={visible.length} onChange={setPage} />}
      <p className="risk-footnote">
        <Icon name="shield" size={15} /> Thứ tự (#) là thứ tự lĩnh vực trong bộ lọc trang khám phá và form tạo chiến dịch. Ngừng nhận: không cho tạo chiến dịch mới trong lĩnh vực, chiến dịch cũ giữ nguyên. Đổi tên cập nhật luôn các chiến dịch. Đổi ảnh: ảnh đại diện ở trang khám phá và trang lĩnh vực (JPEG/PNG/WebP, tối đa 5 MB, nên dùng ảnh ngang 3:2). Mọi thay đổi được ghi nhật ký kiểm toán.
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
      <p className="risk-footnote">
        <Icon name="clock" size={15} /> Ngày ghi dạng năm-tháng-ngày theo giờ Việt Nam. Mở bằng Excel mà cột ngày hiện <code>#####</code> là do cột hẹp: bấm đúp vào mép tiêu đề cột để nới rộng.
      </p>
    </section>
  );
}
