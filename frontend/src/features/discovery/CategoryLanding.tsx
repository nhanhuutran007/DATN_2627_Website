import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Icon, type IconName } from "@/components/ui/Icon";
import { apiCampaignToView, fetchCampaigns, imageByCategory } from "@/lib/api/campaigns";
import { coverByKey } from "@/lib/covers";
import { campaigns as mockCampaigns, type Campaign } from "@/lib/data/campaigns";

import { CategoryCampaignGrid } from "./CategoryCampaignGrid";

const PAGE_SIZE = 9;

const VALUE_PROPS: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: "rocket", title: "Dễ dàng", text: "Ủng hộ nhanh chóng chỉ với vài bước." },
  { icon: "receipt", title: "Minh bạch", text: "Mọi khoản ủng hộ đã xác nhận đều có trong sổ cái công khai, chi tiêu báo cáo theo từng mốc." },
  { icon: "shield", title: "Đáng tin cậy", text: "Hồ sơ được kiểm duyệt trước khi công khai và ai cũng có thể báo cáo vi phạm." },
];

async function loadCategory(category: string): Promise<{ live: boolean; items: Campaign[]; total: number }> {
  try {
    const response = await fetchCampaigns({ category, sort: "popular", limit: PAGE_SIZE });
    return { live: true, items: response.items.map(apiCampaignToView), total: response.total };
  } catch {
    const items = mockCampaigns.filter((campaign) => campaign.category === category);
    return { live: false, items, total: items.length };
  }
}

/** Trang một lĩnh vực, theo bố cục GoFundMe Discover (vd. /discover/medical-fundraiser). */
export async function CategoryLanding({ category }: { category: string }) {
  const { live, items, total } = await loadCategory(category);
  const label = category.toLocaleLowerCase("vi");
  const cover = coverByKey(imageByCategory(category));

  return (
    <>
      <section className="container category-hero" aria-labelledby="category-title">
        <div className="category-hero-copy">
          <Breadcrumbs items={[{ href: "/du-an", label: "Khám phá dự án" }, { label: category }]} />
          <h1 id="category-title">Khám phá dự án {label} trên Góp Mầm</h1>
          <p>Ủng hộ những dự án bạn quan tâm, hoặc tạo chiến dịch cho cộng đồng của bạn.</p>
          <Link className="hero-button hero-button-primary" href="/tao-chien-dich">Tạo chiến dịch</Link>
          {!live && <p className="sample-flag">Dữ liệu mẫu — không kết nối được máy chủ</p>}
        </div>
        <div className="category-hero-media">
          <Image src={cover.src} alt={cover.alt} fill priority sizes="(max-width: 900px) 100vw, 360px" />
        </div>
      </section>

      <section className="container category-browse" aria-labelledby="category-browse-title">
        <h2 id="category-browse-title">Duyệt dự án {label}</h2>
        {/* Đổi lĩnh vực (vd. link ở footer) vẫn cùng trang /du-an: khóa theo lĩnh vực để lưới tạo lại
            với danh sách mới và chạy lại hiệu ứng hiện dần, thay vì giữ thẻ của lĩnh vực cũ. */}
        <CategoryCampaignGrid key={category} category={category} initialItems={items} total={total} pageSize={PAGE_SIZE} live={live} />
      </section>

      <section className="category-values" aria-labelledby="category-values-title">
        <div className="container">
          <h2 id="category-values-title">Nơi gây quỹ dễ dàng, minh bạch và đáng tin cậy</h2>
          <ul>
            {VALUE_PROPS.map((item) => (
              <li key={item.title}>
                <Icon name={item.icon} size={32} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
