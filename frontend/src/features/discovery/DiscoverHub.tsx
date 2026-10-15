import Link from "next/link";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api";
import { apiCampaignToView, fetchCampaigns } from "@/lib/api/campaigns";
import { categoryIcon } from "@/lib/covers";
import { campaigns as mockCampaigns, type Campaign } from "@/lib/data/campaigns";

const PER_CATEGORY = 3;

type CategoryGroup = { name: string; total: number; items: Campaign[] };

type HubData = { live: boolean; groups: CategoryGroup[] };

export function categoryHref(name: string): string {
  return `/du-an?category=${encodeURIComponent(name)}`;
}

async function loadHub(): Promise<HubData> {
  try {
    const categories = await api.get<Array<{ name: string }>>("/categories");
    const groups = await Promise.all(
      categories.map(async ({ name }) => {
        const response = await fetchCampaigns({ category: name, sort: "popular", limit: PER_CATEGORY });
        return { name, total: response.total, items: response.items.map(apiCampaignToView) };
      }),
    );
    return { live: true, groups };
  } catch {
    const names = Array.from(new Set(mockCampaigns.map((campaign) => campaign.category)));
    const groups = names.map((name) => {
      const items = mockCampaigns.filter((campaign) => campaign.category === name);
      return { name, total: items.length, items: items.slice(0, PER_CATEGORY) };
    });
    return { live: false, groups };
  }
}

/** Trang khám phá kiểu GoFundMe Discover: lưới lĩnh vực, rồi vài dự án tiêu biểu của từng lĩnh vực. */
export async function DiscoverHub() {
  const { live, groups } = await loadHub();
  const withProjects = groups.filter((group) => group.items.length > 0);

  return (
    <>
      <section className="container discover-hero" aria-labelledby="discover-title">
        <h1 id="discover-title">Khám phá dự án theo lĩnh vực</h1>
        <p>
          Cộng đồng đang gây quỹ cho những điều họ tâm huyết. Mọi dự án ở đây đều đã được quản trị viên duyệt trước khi
          công khai.
        </p>
        <div className="discover-hero-actions">
          <Link className="hero-button hero-button-primary" href="/tao-chien-dich">Tạo chiến dịch</Link>
          <Link className="hero-button hero-button-outline" href="/tim-kiem">Xem tất cả dự án</Link>
        </div>
        {!live && <p className="sample-flag">Dữ liệu mẫu — không kết nối được máy chủ</p>}
      </section>

      <nav className="container discover-cats" aria-label="Lĩnh vực">
        <ul>
          {groups.map((group) => (
            <li key={group.name}>
              <Link className="discover-cat" href={categoryHref(group.name)}>
                <span className="discover-cat-icon"><Icon name={categoryIcon(group.name)} size={44} /></span>
                <span className="discover-cat-name">{group.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="container discover-groups">
        {withProjects.length === 0 ? (
          <p className="muted-center">Chưa có dự án nào được công khai.</p>
        ) : (
          withProjects.map((group, index) => (
            <section className="discover-group" key={group.name} aria-labelledby={`nhom-${index}`}>
              <h2 id={`nhom-${index}`}>Dự án {group.name.toLocaleLowerCase("vi")}</h2>
              <div className="card-grid">
                {group.items.map((campaign) => <CampaignCard campaign={campaign} key={campaign.slug} />)}
              </div>
              <div className="discover-more">
                <Link className="button button-outline" href={categoryHref(group.name)}>
                  {group.total > group.items.length
                    ? `Xem tất cả ${group.total.toLocaleString("vi-VN")} dự án`
                    : `Xem lĩnh vực ${group.name.toLocaleLowerCase("vi")}`}
                </Link>
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
