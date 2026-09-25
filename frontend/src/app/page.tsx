import Image from "next/image";
import Link from "next/link";

import { AiRecommendations } from "@/components/ai/AiRecommendations";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { CategoryShowcase } from "@/features/discovery/CategoryShowcase";
import {
  apiCampaignToView,
  fetchCampaigns,
  fetchPlatformStats,
  type PlatformStats,
} from "@/lib/api/campaigns";
import { campaigns as mockCampaigns, type Campaign } from "@/lib/data/campaigns";
import { formatVndShort } from "@/lib/format";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type HomeData = {
  live: boolean;
  stats: PlatformStats | null;
  featured: Campaign[];
  all: Campaign[];
  newest: Campaign[];
};

async function loadHome(): Promise<HomeData> {
  try {
    const [featured, all, newest, stats] = await Promise.all([
      fetchCampaigns({ sort: "popular", limit: 3 }),
      fetchCampaigns({ sort: "latest", limit: 24 }),
      fetchCampaigns({ sort: "newest", limit: 3 }),
      fetchPlatformStats().catch(() => null),
    ]);
    return {
      live: true,
      stats,
      featured: featured.items.map(apiCampaignToView),
      all: all.items.map(apiCampaignToView),
      newest: newest.items.map(apiCampaignToView),
    };
  } catch {
    return {
      live: false,
      stats: null,
      featured: mockCampaigns.slice(0, 3),
      all: mockCampaigns,
      newest: mockCampaigns.slice(0, 3),
    };
  }
}

const aboutPoints = [
  "Hồ sơ được kiểm duyệt trước khi phát hành",
  "Tiền chỉ ghi nhận khi thanh toán được xác nhận",
  "Chi tiêu báo cáo theo từng mốc",
  "Sổ cái giao dịch công khai",
  "Người dùng có thể báo cáo vi phạm",
  "Gợi ý AI luôn kèm lý do",
];

const steps = [
  { title: "Chọn dự án và mức ủng hộ", text: "Giao dịch được tạo ở trạng thái chờ, có khóa chống trùng nên bấm nhiều lần cũng chỉ ghi một lần." },
  { title: "Cổng thanh toán xác nhận", text: "Số tiền chỉ được cộng vào chiến dịch khi nhận xác nhận có chữ ký hợp lệ." },
  { title: "Chủ dự án báo cáo theo mốc", text: "Mỗi mốc có ngân sách dự kiến, bài cập nhật và số tiền đã chi." },
  { title: "Quản trị viên giám sát", text: "Mọi thao tác duyệt, tạm dừng, xử lý báo cáo đều được ghi nhật ký." },
];

const features: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: "shield", title: "Kiểm duyệt hồ sơ", text: "Quản trị viên duyệt, yêu cầu bổ sung hoặc từ chối kèm lý do trước khi dự án được công khai." },
  { icon: "receipt", title: "Minh bạch dòng tiền", text: "Mỗi khoản ủng hộ đã xác nhận đều hiện trong sổ cái của chiến dịch." },
  { icon: "chart", title: "Theo dõi tiến độ", text: "Kế hoạch chia theo mốc, có ngân sách và báo cáo chi tiêu thực tế." },
  { icon: "sparkles", title: "AI hỗ trợ có giải thích", text: "Gợi ý dự án và ước lượng khả năng thành công chỉ để tham khảo, không thay con người quyết định." },
];

export default async function Home() {
  const { live, stats, featured, all, newest } = await loadHome();

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Góp Mầm",
    url: siteUrl,
    description: "Nền tảng gây quỹ cộng đồng cho dự án xã hội và khởi nghiệp.",
  };

  const statItems: Array<{ icon: IconName; value: string; label: string }> = stats
    ? [
        { icon: "wallet", value: formatVndShort(stats.totalRaised), label: "Đã huy động (đã xác nhận)" },
        { icon: "users", value: stats.totalBackers.toLocaleString("vi-VN"), label: "Lượt ủng hộ" },
        { icon: "document", value: String(stats.publicCampaigns), label: "Chiến dịch công khai" },
        { icon: "check", value: String(stats.successfulCampaigns), label: "Chiến dịch đạt mục tiêu" },
      ]
    : [];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }} />

      <section className="hero">
        <Image
          className="hero-img"
          src="/images/cover-mangrove.webp"
          alt="Tình nguyện viên cùng người dân trồng cây ngập mặn"
          fill
          priority
          sizes="100vw"
        />
        <div className="container hero-inner">
          <span className="pill pill-light">Nền tảng gây quỹ cộng đồng</span>
          <h1>Chung tay gieo mầm cho dự án cộng đồng</h1>
          <p>
            Góp Mầm kết nối các dự án xã hội và khởi nghiệp với những người sẵn lòng ủng hộ. Mọi chiến dịch đều được
            kiểm duyệt, mọi khoản ủng hộ đều có trong sổ cái công khai.
          </p>
          <div className="hero-cta">
            <Link className="button button-primary button-lg" href="/du-an">Khám phá dự án <Icon name="arrow-right" size={18} /></Link>
            <Link className="button button-ghost-white button-lg" href="/tao-chien-dich">Tạo chiến dịch</Link>
          </div>
        </div>
      </section>

      {!live && (
        <div className="container"><p className="notice-sample">Không kết nối được máy chủ — đang hiển thị dữ liệu mẫu.</p></div>
      )}

      <section className="block" id="gioi-thieu" aria-labelledby="gioi-thieu-title">
        <div className="container about">
          <div className="about-media">
            <div className="about-img about-img-a">
              <Image src="/images/cover-library.webp" alt="Học sinh đọc sách trong thư viện cộng đồng" fill sizes="(max-width: 900px) 60vw, 300px" />
            </div>
            <div className="about-img about-img-b">
              <Image src="/images/cover-startup.webp" alt="Nhóm khởi nghiệp trẻ trao đổi ý tưởng" fill sizes="(max-width: 900px) 60vw, 300px" />
            </div>
            {stats && (
              <p className="about-stamp"><b>{stats.activeCampaigns}</b> chiến dịch đang gây quỹ</p>
            )}
          </div>
          <div className="about-copy">
            <span className="pill">Về Góp Mầm</span>
            <h2 id="gioi-thieu-title">Kết nối dự án tử tế với cộng đồng sẵn lòng chung tay</h2>
            <p>
              Các nhóm làm dự án giáo dục, môi trường, y tế và khởi nghiệp nhỏ có thể đăng hồ sơ gây quỹ. Người ủng hộ
              theo dõi được tiền đã nhận, kế hoạch sử dụng và báo cáo chi tiêu của từng chiến dịch.
            </p>
            <ul className="check-grid">
              {aboutPoints.map((point) => (
                <li key={point}><Icon name="check" size={15} /> {point}</li>
              ))}
            </ul>
            <div className="about-actions">
              <Link className="button button-primary" href="/du-an">Xem dự án</Link>
              <Link className="link-arrow" href="/tao-chien-dich">Bạn có dự án? Tạo chiến dịch <Icon name="arrow-right" size={16} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="block block-soft" aria-labelledby="noi-bat">
        <div className="container">
          <div className="block-head block-head-split">
            <div>
              <span className="pill">Dự án nổi bật</span>
              <h2 id="noi-bat">Các chiến dịch đang được quan tâm</h2>
            </div>
            <p>Những chiến dịch đã qua kiểm duyệt và nhận được nhiều lượt ủng hộ nhất.</p>
          </div>
          {featured.length > 0 ? (
            <div className="card-grid">
              {featured.map((campaign) => <CampaignCard campaign={campaign} key={campaign.slug} />)}
            </div>
          ) : (
            <p className="muted-center">Chưa có chiến dịch nào được phát hành.</p>
          )}
          <div className="block-more"><Link className="button button-outline" href="/du-an">Xem tất cả dự án</Link></div>
        </div>
      </section>

      {statItems.length > 0 && (
        <section className="stats-band" id="minh-bach" aria-label="Số liệu toàn nền tảng">
          <Image className="stats-band-img" src="/images/cover-health.webp" alt="" fill sizes="100vw" />
          <div className="container stats-grid">
            {statItems.map((item) => (
              <div className="stat" key={item.label}>
                <span className="stat-ico"><Icon name={item.icon} size={26} /></span>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <p className="container stats-note">Số liệu lấy trực tiếp từ cơ sở dữ liệu, chỉ tính giao dịch đã được xác nhận.</p>
        </section>
      )}

      <section className="block" aria-labelledby="linh-vuc">
        <div className="container">
          <div className="block-head block-head-center">
            <span className="pill">Lĩnh vực</span>
            <h2 id="linh-vuc">Khám phá dự án theo lĩnh vực</h2>
            <p>Chọn lĩnh vực bạn quan tâm để xem các chiến dịch đang gây quỹ.</p>
          </div>
          <CategoryShowcase campaigns={all} />
        </div>
      </section>

      <section className="block block-soft" id="quy-trinh" aria-labelledby="quy-trinh-title">
        <div className="container process">
          <div className="process-media">
            <Image src="/images/cover-health.webp" alt="Nhân viên y tế thăm khám cho người dân vùng cao" fill sizes="(max-width: 900px) 100vw, 520px" />
          </div>
          <div>
            <span className="pill">Quy trình minh bạch</span>
            <h2 id="quy-trinh-title">Một khoản ủng hộ đi qua những bước nào?</h2>
            <p className="process-lead">Từ lúc bạn bấm ủng hộ đến khi tiền được dùng, mỗi bước đều có dấu vết để kiểm tra lại.</p>
            <ol className="steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="step-no">{index + 1}</span>
                  <div><h3>{step.title}</h3><p>{step.text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="features-dark" aria-labelledby="vi-sao">
        <div className="container features">
          <div className="features-intro">
            <span className="pill">Vì sao chọn Góp Mầm</span>
            <h2 id="vi-sao">Gây quỹ minh bạch, có trách nhiệm</h2>
            <p>Góp Mầm được xây dựng để người ủng hộ luôn biết tiền của mình đang ở đâu và được dùng vào việc gì.</p>
            <Link className="button button-primary" href="/du-an">Ủng hộ một dự án</Link>
          </div>
          <div className="features-grid">
            {features.map((feature) => (
              <article key={feature.title}>
                <span className="feature-icon"><Icon name={feature.icon} size={24} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <AiRecommendations fallback={newest} />

      <section className="cta-band" aria-labelledby="cta-title">
        <div className="container cta-inner">
          <div>
            <h2 id="cta-title">Bạn có một dự án cần gây quỹ?</h2>
            <p>Soạn hồ sơ từng bước, lưu nháp bất cứ lúc nào và gửi để quản trị viên xét duyệt.</p>
          </div>
          <Link className="button button-white button-lg" href="/tao-chien-dich">Tạo chiến dịch ngay</Link>
        </div>
      </section>
    </main>
  );
}
