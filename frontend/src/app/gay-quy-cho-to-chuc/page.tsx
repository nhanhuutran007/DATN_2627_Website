import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { CharityFundraiserCard } from "@/components/campaign/CharityFundraiserCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { OrganizationCard } from "@/features/organizations/OrganizationCard";
import { apiCampaignToView, fetchCampaigns } from "@/lib/api/campaigns";
import { fetchOrganizations, type Organization } from "@/lib/api/organizations";
import type { Campaign } from "@/lib/data/campaigns";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gây quỹ cho tổ chức",
  description:
    "Mở chiến dịch gây quỹ cho một quỹ hoặc tổ chức xã hội đã được Góp Mầm xác minh — nhân dịp sinh nhật, sự kiện thể thao, ngày cưới hay để tưởng nhớ người thân.",
  alternates: { canonical: "/gay-quy-cho-to-chuc" },
};

const occasions: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: "heart", title: "Sinh nhật", text: "Thay quà sinh nhật bằng lời mời bạn bè cùng ủng hộ tổ chức bạn yêu quý." },
  { icon: "rocket", title: "Thử thách, chạy bộ", text: "Mỗi cây số bạn chạy là một lời kêu gọi ủng hộ cho sứ mệnh của tổ chức." },
  { icon: "sprout", title: "Tưởng nhớ", text: "Lưu giữ kỷ niệm về người thân bằng một chiến dịch cho điều họ từng trân trọng." },
  { icon: "users", title: "Sự kiện, ngày cưới", text: "Kêu gọi khách mời đóng góp cho cộng đồng thay vì tặng quà." },
];

type Step = { title: string; text: string; mock: ReactNode };

const steps: Step[] = [
  {
    title: "Chọn tổ chức đã xác minh",
    text: "Tìm tổ chức trong danh bạ. Mỗi tổ chức đã được quản trị viên đối chiếu giấy phép trước khi xuất hiện ở đây.",
    mock: (
      <div className="start-mock">
        <p className="start-mock-label">Gây quỹ cho</p>
        <div className="start-mock-row">
          <span className="start-mock-badge"><Icon name="shield" size={18} /></span>
          <span><b>Quỹ Học bổng Mầm Xanh</b><small>Tổ chức đã xác minh</small></span>
          <span className="start-mock-ok"><Icon name="check" size={14} /></span>
        </div>
      </div>
    ),
  },
  {
    title: "Kể lý do bạn gây quỹ",
    text: "Đặt mục tiêu, thời hạn và chia sẻ vì sao tổ chức này quan trọng với bạn. Chiến dịch được kiểm duyệt trước khi công khai.",
    mock: (
      <div className="start-mock">
        <p className="start-mock-label">Mục tiêu</p>
        <p className="start-mock-big">20.000.000 ₫</p>
      </div>
    ),
  },
  {
    title: "Chia sẻ và theo dõi minh bạch",
    text: "Bạn bè ủng hộ qua chiến dịch của bạn; sổ cái, tiến độ và chứng từ chi tiêu được công khai như mọi dự án.",
    mock: (
      <div className="start-mock start-mock-share">
        <span className="start-mock-float start-mock-float-a" aria-hidden="true"><Icon name="heart" size={14} /></span>
        <p className="start-mock-label">Đã nhận</p>
        <p className="start-mock-big">12.450.000 ₫</p>
      </div>
    ),
  },
];

const faqs: Array<{ question: string; answer: string }> = [
  {
    question: "Tiền ủng hộ được dùng thế nào?",
    answer:
      "Chiến dịch ghi rõ tổ chức là đơn vị thụ hưởng. Người tổ chức chiến dịch cam kết chuyển và báo cáo chi tiêu theo các mốc đã công bố, kèm chứng từ công khai trên trang chiến dịch.",
  },
  {
    question: "Tôi có cần là thành viên của tổ chức không?",
    answer: "Không. Bất kỳ tài khoản nào cũng có thể gây quỹ cho một tổ chức đã xác minh.",
  },
  {
    question: "Vì sao không thấy tổ chức tôi muốn?",
    answer:
      "Danh bạ chỉ gồm tổ chức đã được xác minh. Bạn có thể giới thiệu tổ chức đó đăng ký tại trang “Dành cho tổ chức”.",
  },
  {
    question: "Chiến dịch có phải qua kiểm duyệt không?",
    answer: "Có. Mọi chiến dịch, kể cả gây quỹ cho tổ chức, đều được quản trị viên xét duyệt trước khi công khai và nhận ủng hộ.",
  },
];

const FUNDRAISERS_PER_PAGE = 6;
/** Số trang tối đa hiện trên thanh phân trang (như GoFundMe chỉ hiện 1–5). */
const MAX_PAGE_LINKS = 5;

type CharityFundraisingPageProps = {
  searchParams: Promise<{ trang?: string | string[] }>;
};

async function loadOrganizations(): Promise<Organization[]> {
  try {
    return (await fetchOrganizations({ limit: 6 })).items;
  } catch {
    return [];
  }
}

async function loadFundraisers(page: number): Promise<{ items: Campaign[]; total: number } | null> {
  try {
    const result = await fetchCampaigns({
      forOrganization: true,
      sort: "popular",
      limit: FUNDRAISERS_PER_PAGE,
      offset: page * FUNDRAISERS_PER_PAGE,
    });
    return { items: result.items.map(apiCampaignToView), total: result.total };
  } catch {
    return null;
  }
}

export default async function CharityFundraisingPage({ searchParams }: CharityFundraisingPageProps) {
  const rawPage = (await searchParams).trang;
  const page = Math.max(0, (Number.parseInt(typeof rawPage === "string" ? rawPage : "", 10) || 1) - 1);
  const [organizations, fundraisers] = await Promise.all([loadOrganizations(), loadFundraisers(page)]);
  const pageCount = fundraisers ? Math.min(MAX_PAGE_LINKS, Math.ceil(fundraisers.total / FUNDRAISERS_PER_PAGE)) : 0;

  return (
    <main className="start-page">
      <section className="start-hero" aria-labelledby="charity-title">
        <div className="container start-hero-inner">
          <div className="start-hero-copy">
            <h1 id="charity-title">Gây quỹ cho tổ chức bạn tin tưởng</h1>
            <p>
              Mở chiến dịch cho một quỹ hoặc tổ chức xã hội đã được xác minh — nhân dịp sinh nhật, một thử thách thể thao hay để
              tưởng nhớ người thân.
            </p>
            <div className="start-hero-cta">
              <Link className="button button-primary button-lg" href="/to-chuc">Chọn tổ chức</Link>
              <Link className="start-hero-link" href="/danh-cho-to-chuc">Bạn đại diện cho tổ chức?</Link>
            </div>
          </div>
          <div className="start-hero-media">
            <Image
              src="/images/cover-library.webp"
              alt="Các em nhỏ đọc sách trong thư viện cộng đồng"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 560px"
            />
          </div>
        </div>
      </section>

      <section className="start-why" aria-labelledby="dip-title">
        <div className="container">
          <div className="start-head">
            <h2 id="dip-title">Dịp nào cũng có thể lan tỏa</h2>
            <p>Biến những khoảnh khắc ý nghĩa của bạn thành sự hỗ trợ cho cộng đồng.</p>
          </div>
          <ul className="start-reasons org-benefits">
            {occasions.map((item) => (
              <li key={item.title}>
                <Icon name={item.icon} size={40} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="start-steps" aria-labelledby="charity-steps-title">
        <div className="container">
          <div className="start-head">
            <h2 id="charity-steps-title">Ba bước để bắt đầu</h2>
          </div>
          <ol className="start-step-grid org-steps-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <div className="start-step-visual">{step.mock}</div>
                <span className="start-step-no">Bước {index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cf-discover" id="kham-pha" aria-labelledby="cf-discover-title">
        <div className="container">
          <div className="start-head">
            <h2 id="cf-discover-title">Khám phá chiến dịch gây quỹ cho tổ chức</h2>
            <p>Đồng hành cùng những chiến dịch đang gây quỹ cho tổ chức bạn quan tâm.</p>
          </div>
          {fundraisers === null ? (
            <p className="empty-box" role="alert">Không tải được danh sách chiến dịch. Vui lòng thử lại sau.</p>
          ) : fundraisers.items.length === 0 ? (
            <div className="empty-box">
              <p>Chưa có chiến dịch nào gây quỹ cho tổ chức. Hãy là người đầu tiên!</p>
              <Link className="button button-primary button-sm" href="/to-chuc">Chọn tổ chức</Link>
            </div>
          ) : (
            <>
              <p className="cf-count">
                Hiển thị {fundraisers.items.length} trên {fundraisers.total.toLocaleString("vi-VN")} kết quả
              </p>
              <div className="cf-grid">
                {fundraisers.items.map((campaign) => <CharityFundraiserCard key={campaign.slug} campaign={campaign} />)}
              </div>
              {pageCount > 1 && (
                <nav className="cf-pages" aria-label="Phân trang chiến dịch">
                  {Array.from({ length: pageCount }, (_, index) => (
                    <Link
                      key={index}
                      href={index === 0 ? "/gay-quy-cho-to-chuc#kham-pha" : `/gay-quy-cho-to-chuc?trang=${index + 1}#kham-pha`}
                      aria-current={index === page ? "page" : undefined}
                      scroll={false}
                    >
                      {index + 1}
                    </Link>
                  ))}
                </nav>
              )}
            </>
          )}
        </div>
      </section>

      <section className="block" aria-labelledby="charity-orgs-title">
        <div className="container">
          <div className="block-head block-head-split">
            <div>
              <span className="pill">Đã xác minh</span>
              <h2 id="charity-orgs-title">Tổ chức đang nhận gây quỹ</h2>
            </div>
            <Link className="button button-outline button-sm" href="/to-chuc">Xem tất cả tổ chức</Link>
          </div>
          {organizations.length > 0 ? (
            <div className="org-grid">
              {organizations.map((organization) => <OrganizationCard key={organization.id} organization={organization} />)}
            </div>
          ) : (
            <p className="empty-box">Chưa có tổ chức nào được xác minh. Hãy quay lại sau nhé.</p>
          )}
        </div>
      </section>

      <section className="start-faq" aria-labelledby="charity-faq-title">
        <div className="container start-faq-inner">
          <h2 id="charity-faq-title">Câu hỏi thường gặp</h2>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>
                {faq.question}
                <Icon name="chevron-down" size={18} />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="cta-band" aria-labelledby="charity-cta-title">
        <div className="container cta-inner">
          <div>
            <h2 id="charity-cta-title">Sẵn sàng gây quỹ cho một tổ chức?</h2>
            <p>Chọn tổ chức, kể câu chuyện của bạn và gửi duyệt chỉ trong vài phút.</p>
          </div>
          <Link className="button button-white button-lg" href="/to-chuc">Chọn tổ chức</Link>
        </div>
      </section>
    </main>
  );
}
