import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { FAQ_ITEMS } from "@/features/support/faq";
import { api } from "@/lib/api";
import { apiCampaignToView, fetchCampaigns, fetchPlatformStats, type PlatformStats } from "@/lib/api/campaigns";
import { categoryIcon } from "@/lib/covers";
import type { Campaign } from "@/lib/data/campaigns";
import { formatVndShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bắt đầu gây quỹ",
  description:
    "Cách bắt đầu một chiến dịch gây quỹ trên Góp Mầm: soạn hồ sơ, được kiểm duyệt, chia sẻ để nhận ủng hộ và báo cáo chi tiêu minh bạch.",
  alternates: { canonical: "/bat-dau-gay-quy" },
};

/** Dùng khi không tải được danh mục từ server. */
const FALLBACK_CATEGORIES = ["Giáo dục", "Môi trường", "Nông nghiệp", "Y tế", "Khởi nghiệp", "Công nghệ"];

type StartData = { stats: PlatformStats | null; campaigns: Campaign[]; categories: string[] };

async function loadStart(): Promise<StartData> {
  const [stats, campaigns, categories] = await Promise.all([
    fetchPlatformStats().catch(() => null),
    fetchCampaigns({ status: "active", sort: "popular", limit: 6 })
      .then((page) => page.items.map(apiCampaignToView))
      .catch(() => []),
    api
      .get<Array<{ name: string; isActive: boolean }>>("/categories")
      .then((items) => items.filter((item) => item.isActive).map((item) => item.name))
      .catch(() => FALLBACK_CATEGORIES),
  ]);
  return { stats, campaigns, categories: categories.length > 0 ? categories : FALLBACK_CATEGORIES };
}

type Step = { title: string; text: string; mock: ReactNode };

const steps: Step[] = [
  {
    title: "Tạo hồ sơ chiến dịch",
    text: "Trình soạn 8 bước giúp bạn viết câu chuyện, đặt mục tiêu, lập kế hoạch theo mốc và ngân sách. Lưu nháp bất cứ lúc nào.",
    mock: (
      <div className="start-mock">
        <p className="start-mock-title">Dự án của bạn thuộc lĩnh vực nào?</p>
        <div className="start-mock-chips">
          {(["Giáo dục", "Môi trường", "Y tế"] as const).map((name) => (
            <span key={name}><Icon name={categoryIcon(name)} size={22} />{name}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Được quản trị viên xét duyệt",
    text: "Quản trị viên kiểm tra nội dung và kế hoạch sử dụng quỹ, rồi duyệt, yêu cầu bổ sung hoặc từ chối kèm lý do.",
    mock: (
      <div className="start-mock">
        <p className="start-mock-label">Trạng thái hồ sơ</p>
        <div className="start-mock-row">
          <span className="start-mock-badge"><Icon name="shield" size={18} /></span>
          <span><b>Đã duyệt</b><small>Sẵn sàng phát hành</small></span>
          <span className="start-mock-ok"><Icon name="check" size={14} /></span>
        </div>
      </div>
    ),
  },
  {
    title: "Chia sẻ và nhận ủng hộ",
    text: "Gửi liên kết dự án cho bạn bè, cộng đồng. Mỗi khoản ủng hộ chỉ được cộng khi cổng thanh toán xác nhận.",
    mock: (
      <div className="start-mock start-mock-share">
        <span className="start-mock-float start-mock-float-a" aria-hidden="true">f</span>
        <span className="start-mock-float start-mock-float-b" aria-hidden="true"><Icon name="message" size={14} /></span>
        <p className="start-mock-label">Chia sẻ dự án</p>
        <p className="start-mock-big">Sao chép liên kết <Icon name="copy" size={18} /></p>
      </div>
    ),
  },
  {
    title: "Báo cáo tiến độ, chi tiêu",
    text: "Đăng cập nhật theo từng mốc, khai khoản chi kèm ảnh chứng từ để người ủng hộ thấy tiền được dùng vào đâu.",
    mock: (
      <div className="start-mock">
        <p className="start-mock-title">Khoản chi mốc 1</p>
        <div className="start-mock-row">
          <span className="start-mock-badge"><Icon name="receipt" size={18} /></span>
          <span><b>12.000.000 ₫</b><small>2 chứng từ</small></span>
          <span className="start-mock-ok"><Icon name="check" size={14} /></span>
        </div>
      </div>
    ),
  },
];

const reasons: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: "shield", title: "Hồ sơ được kiểm duyệt", text: "Chiến dịch chỉ công khai sau khi quản trị viên duyệt, giúp người ủng hộ yên tâm hơn." },
  { icon: "receipt", title: "Minh bạch dòng tiền", text: "Sổ cái công khai, chi tiêu kèm chứng từ, thay đổi kế hoạch đều có lý do." },
  { icon: "wallet", title: "Thanh toán bằng mã QR", text: "Người ủng hộ chuyển khoản qua SePay; Góp Mầm không lưu thông tin thẻ hay tài khoản." },
  { icon: "chart", title: "Số liệu cho chủ dự án", text: "Theo dõi lượt xem, tỷ lệ chuyển đổi, người theo dõi và tiến độ ngay trên bảng điều khiển." },
  { icon: "sparkles", title: "Gợi ý AI có giải thích", text: "Ước lượng khả năng thành công kèm gợi ý cải thiện, chỉ để tham khảo — con người quyết định." },
];

/** Câu hỏi riêng của trang này; phần còn lại lấy từ bộ hỏi đáp chung của hộp hỗ trợ. */
const faqs: Array<{ question: string; answer: string }> = [
  {
    question: "Ai có thể tạo chiến dịch trên Góp Mầm?",
    answer:
      "Mọi tài khoản đã đăng nhập (trừ tài khoản quản trị) đều có thể soạn và gửi duyệt chiến dịch cho dự án xã hội hoặc khởi nghiệp của mình, của nhóm hay tổ chức.",
  },
  {
    question: "Có mất phí để tạo chiến dịch không?",
    answer: "Không. Góp Mầm không thu phí tạo, lưu nháp hay gửi duyệt chiến dịch.",
  },
  ...FAQ_ITEMS.filter((item) => ["tao-chien-dich", "xet-duyet", "minh-bach", "thanh-toan"].includes(item.id)),
  {
    question: "Sau khi chiến dịch được phát hành, tôi cần làm gì?",
    answer:
      "Chia sẻ liên kết dự án, trả lời hỏi đáp và đăng cập nhật theo từng mốc. Nếu một mốc quá hạn mà chưa có cập nhật, hệ thống sẽ nhắc bạn. Muốn đổi kế hoạch sau khi phát hành, bạn phải ghi lý do và người ủng hộ sẽ được thông báo.",
  },
];

export default async function StartFundraisingPage() {
  const { stats, campaigns, categories } = await loadStart();
  const headline =
    stats && stats.totalRaised > 0
      ? `${formatVndShort(stats.totalRaised)} đã được ủng hộ cho các dự án cộng đồng`
      : "Gây quỹ minh bạch cho dự án của bạn";

  return (
    <main className="start-page">
      <section className="start-hero" aria-labelledby="start-title">
        <div className="container start-hero-inner">
          <div className="start-hero-copy">
            <h1 id="start-title">Bắt đầu gây quỹ trên Góp Mầm</h1>
            <p>
              Mọi thứ bạn cần để chiến dịch thành công: trình soạn hồ sơ từng bước, kiểm duyệt minh bạch, thanh toán
              bằng mã QR và công cụ báo cáo tiến độ.
            </p>
            <div className="start-hero-cta">
              <Link className="button button-primary button-lg" href="/tao-chien-dich">Tạo chiến dịch</Link>
              <a className="start-hero-link" href="#cac-buoc">Xem các bước</a>
            </div>
          </div>
          <div className="start-hero-media">
            <Image
              src="/images/cover-library.webp"
              alt="Học sinh vùng cao trong lớp học ở Bát Xát, Lào Cai"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 560px"
            />
          </div>
        </div>
      </section>

      <section className="start-steps" id="cac-buoc" aria-labelledby="cac-buoc-title">
        <div className="container">
          <div className="start-head">
            <span className="start-badge"><Icon name="check" size={14} /> Không thu phí tạo chiến dịch</span>
            <h2 id="cac-buoc-title">{headline}</h2>
            <p>Chỉ với vài bước, dự án của bạn có thể đến với những người sẵn lòng chung tay.</p>
          </div>
          <ol className="start-step-grid">
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

      <section className="start-why" aria-labelledby="vi-sao-title">
        <div className="container">
          <div className="start-head">
            <h2 id="vi-sao-title">Vì sao gây quỹ trên Góp Mầm?</h2>
            <p>Nền tảng được xây dựng để người ủng hộ luôn biết tiền của mình đang ở đâu và được dùng vào việc gì.</p>
            <Link className="button button-outline start-pill-button" href="/tao-chien-dich">Tạo chiến dịch</Link>
          </div>
          <ul className="start-reasons">
            {reasons.map((reason) => (
              <li key={reason.title}>
                <Icon name={reason.icon} size={40} />
                <h3>{reason.title}</h3>
                <p>{reason.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {campaigns.length > 0 && (
        <section className="block block-soft" aria-labelledby="dang-gay-quy-title">
          <div className="container">
            <div className="start-head">
              <h2 id="dang-gay-quy-title">Ủng hộ với sự an tâm</h2>
              <p>Các chiến dịch đang gây quỹ đều đã qua kiểm duyệt và công khai sổ cái giao dịch.</p>
            </div>
            <div className="card-grid">
              {campaigns.map((campaign) => <CampaignCard campaign={campaign} key={campaign.slug} />)}
            </div>
            <div className="block-more"><Link className="button button-outline" href="/du-an">Xem tất cả dự án</Link></div>
          </div>
        </section>
      )}

      <section className="start-causes" aria-labelledby="linh-vuc-title">
        <div className="container">
          <div className="start-head">
            <h2 id="linh-vuc-title">Gây quỹ cho mọi lĩnh vực</h2>
            <p>Chọn lĩnh vực của dự án để bắt đầu soạn hồ sơ ngay.</p>
          </div>
          <ul className="start-cause-grid">
            {categories.map((name) => (
              <li key={name}>
                <Link href={`/tao-chien-dich?linh-vuc=${encodeURIComponent(name)}`}>
                  <Icon name={categoryIcon(name)} size={44} />
                  <span>{name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="start-faq" aria-labelledby="hoi-dap-title">
        <div className="container start-faq-inner">
          <h2 id="hoi-dap-title">Câu hỏi thường gặp</h2>
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

      <section className="cta-band" aria-labelledby="start-cta-title">
        <div className="container cta-inner">
          <div>
            <h2 id="start-cta-title">Sẵn sàng gieo mầm cho dự án của bạn?</h2>
            <p>Soạn hồ sơ từng bước, lưu nháp bất cứ lúc nào và gửi để quản trị viên xét duyệt.</p>
          </div>
          <Link className="button button-white button-lg" href="/tao-chien-dich">Tạo chiến dịch ngay</Link>
        </div>
      </section>
    </main>
  );
}
