import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { OrganizationCard } from "@/features/organizations/OrganizationCard";
import {
  ORGANIZATION_TYPE_LABEL,
  fetchOrganizations,
  type OrganizationPage,
  type OrganizationType,
} from "@/lib/api/organizations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tổ chức đã xác minh",
  description: "Danh bạ quỹ và tổ chức xã hội đã được Góp Mầm xác minh giấy tờ. Ủng hộ hoặc mở chiến dịch gây quỹ cho tổ chức bạn tin tưởng.",
  alternates: { canonical: "/to-chuc" },
};

const PAGE_SIZE = 12;

type DirectoryPageProps = {
  searchParams: Promise<{ q?: string | string[]; loai?: string | string[]; trang?: string | string[] }>;
};

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function isType(value: string): value is OrganizationType {
  return value in ORGANIZATION_TYPE_LABEL;
}

function pageHref(q: string, type: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("loai", type);
  if (page > 0) params.set("trang", String(page + 1));
  const qs = params.toString();
  return `/to-chuc${qs ? `?${qs}` : ""}`;
}

/** Danh bạ công khai: chỉ tổ chức đã được quản trị viên xác minh (API tự lọc). */
export default async function OrganizationDirectoryPage({ searchParams }: DirectoryPageProps) {
  const params = await searchParams;
  const q = single(params.q).slice(0, 100);
  const rawType = single(params.loai);
  const type = isType(rawType) ? rawType : "";
  const page = Math.max(0, (Number.parseInt(single(params.trang), 10) || 1) - 1);

  let result: OrganizationPage | null = null;
  try {
    result = await fetchOrganizations({ q: q || undefined, type: type || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  } catch {
    result = null;
  }
  const lastPage = result ? Math.max(0, Math.ceil(result.total / PAGE_SIZE) - 1) : 0;

  return (
    <main className="org-directory">
      <section className="org-directory-hero">
        <div className="container">
          <span className="start-badge"><Icon name="shield" size={14} /> Đã đối chiếu giấy tờ pháp lý</span>
          <h1>Tổ chức đã xác minh</h1>
          <p>Ủng hộ trực tiếp hoặc mở chiến dịch gây quỹ cho quỹ, tổ chức xã hội bạn tin tưởng.</p>
          <form className="org-directory-search" action="/to-chuc" role="search">
            <label>
              <Icon name="search" size={18} />
              <span className="sr-only">Tên tổ chức</span>
              <input type="search" name="q" defaultValue={q} placeholder="Tìm theo tên tổ chức…" maxLength={100} />
            </label>
            <select name="loai" defaultValue={type} aria-label="Loại hình tổ chức">
              <option value="">Mọi loại hình</option>
              {Object.entries(ORGANIZATION_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button className="button button-primary" type="submit">Tìm</button>
          </form>
        </div>
      </section>

      <section className="container org-directory-body" aria-live="polite">
        {result === null ? (
          <p className="empty-box" role="alert">Không tải được danh bạ tổ chức. Vui lòng thử lại sau.</p>
        ) : result.items.length === 0 ? (
          <div className="empty-box">
            <p>{q || type ? "Không có tổ chức đã xác minh nào khớp bộ lọc." : "Chưa có tổ chức nào được xác minh."}</p>
            {(q || type) && <Link className="button button-outline button-sm" href="/to-chuc">Xóa bộ lọc</Link>}
          </div>
        ) : (
          <>
            <p className="org-directory-count">{result.total.toLocaleString("vi-VN")} tổ chức</p>
            <div className="org-grid">
              {result.items.map((organization) => <OrganizationCard key={organization.id} organization={organization} />)}
            </div>
            {lastPage > 0 && (
              <nav className="org-directory-pages" aria-label="Phân trang">
                {page > 0 ? <Link className="button button-outline button-sm" href={pageHref(q, type, page - 1)}>Trang trước</Link> : <span />}
                <span>Trang {page + 1}/{lastPage + 1}</span>
                {page < lastPage ? <Link className="button button-outline button-sm" href={pageHref(q, type, page + 1)}>Trang sau</Link> : <span />}
              </nav>
            )}
          </>
        )}
      </section>

      <section className="cta-band" aria-labelledby="org-dir-cta">
        <div className="container cta-inner">
          <div>
            <h2 id="org-dir-cta">Bạn đại diện cho một tổ chức?</h2>
            <p>Đăng ký miễn phí để được xác minh và nhận gây quỹ từ cộng đồng.</p>
          </div>
          <Link className="button button-white button-lg" href="/danh-cho-to-chuc">Dành cho tổ chức</Link>
        </div>
      </section>
    </main>
  );
}
