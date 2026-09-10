import Link from "next/link";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { campaigns, categoryMeta } from "@/lib/data/campaigns";

const trustItems = [
  { icon: "shield" as const, title: "Hồ sơ được kiểm duyệt", text: "Xác minh chủ dự án trước khi phát hành" },
  { icon: "receipt" as const, title: "Minh bạch nguồn quỹ", text: "Tiến độ và chứng từ được cập nhật theo mốc" },
  { icon: "wallet" as const, title: "Thanh toán an toàn", text: "Mô phỏng sandbox, không lưu dữ liệu thẻ" },
  { icon: "message" as const, title: "Cộng đồng đồng hành", text: "Theo dõi, đặt câu hỏi và nhận cập nhật" },
];

const steps = [
  { number: "01", title: "Khám phá điều bạn tin", text: "Tìm kiếm theo lĩnh vực, địa điểm hoặc nhận gợi ý phù hợp từ hệ thống." },
  { number: "02", title: "Góp sức thật dễ dàng", text: "Chọn số tiền, kiểm tra thông tin và hoàn tất qua cổng thanh toán thử nghiệm." },
  { number: "03", title: "Theo dấu từng thay đổi", text: "Nhận cập nhật, xem chứng từ và tiến độ sử dụng nguồn quỹ sau chiến dịch." },
];

export default function Home() {
  const featured = campaigns.slice(0, 4);
  const recommended = campaigns.slice(2, 5);

  return (
    <main>
      <section className="home-hero">
        <div className="container home-hero-grid">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-light"><span /> Nền tảng gây quỹ minh bạch</p>
            <h1>Mỗi ý tưởng tử tế<br /><em>đều xứng đáng</em><br />được bắt đầu.</h1>
            <p className="hero-lead">Kết nối những dự án xã hội và khởi nghiệp giàu tác động với cộng đồng sẵn lòng chung tay.</p>
            <div className="hero-actions">
              <Link className="button button-light" href="/du-an">Khám phá dự án <Icon name="arrow-right" size={19} /></Link>
              <Link className="button button-ghost-light" href="/tao-chien-dich">Bắt đầu gây quỹ</Link>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack"><i>M</i><i>A</i><i>H</i><i>+</i></div>
              <p><b>12.500+ người</b><span>đã cùng tạo nên thay đổi</span></p>
            </div>
          </div>
          <div className="hero-visual" aria-label="Những dự án cộng đồng tiêu biểu">
            <div className="hero-atlas" />
            <div className="hero-float-card hero-float-top"><Icon name="sparkles" size={18} /><span><b>Gợi ý thông minh</b> theo điều bạn quan tâm</span></div>
            <div className="hero-float-card hero-float-bottom"><span className="float-check"><Icon name="check" size={16} /></span><span><b>96% minh bạch</b> hồ sơ và tiến độ đã xác minh</span></div>
          </div>
        </div>
        <div className="hero-dots" aria-hidden="true"><i /><i className="active" /><i /></div>
      </section>

      <section className="trust-strip" id="minh-bach">
        <div className="container trust-grid">
          {trustItems.map((item) => (
            <article key={item.title}>
              <span><Icon name={item.icon} size={24} /></span>
              <div><h2>{item.title}</h2><p>{item.text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-featured">
        <div className="container">
          <SectionHeading
            eyebrow="Đang nhận được nhiều sự quan tâm"
            title="Dự án nổi bật"
            description="Những chiến dịch đã qua kiểm duyệt và đang tạo ra tác động rõ ràng."
            href="/du-an"
          />
          <div className="campaign-grid">
            {featured.map((campaign) => <CampaignCard campaign={campaign} key={campaign.slug} />)}
          </div>
        </div>
      </section>

      <section className="section section-categories">
        <div className="container">
          <SectionHeading eyebrow="Bạn muốn chung tay ở đâu?" title="Gieo mầm theo lĩnh vực" />
          <div className="category-grid">
            {categoryMeta.map((category) => (
              <Link
                className={`category-card atlas atlas-${category.image}`}
                href={`/du-an?category=${encodeURIComponent(category.name.split(" & ")[0])}`}
                key={category.name}
              >
                <div className="category-overlay" />
                <span className="category-icon"><Icon name={category.icon} size={26} /></span>
                <div><h3>{category.name}</h3><p>{category.description}</p></div>
                <span className="category-arrow"><Icon name="arrow-right" size={20} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="impact-banner">
        <div className="container impact-banner-inner">
          <div>
            <p className="eyebrow eyebrow-light">Tác động đang được tạo ra</p>
            <h2>Không chỉ là một khoản tiền.<br />Đó là một lời tin tưởng.</h2>
          </div>
          <div className="impact-stats">
            <article><strong>18,6 <small>tỷ</small></strong><span>đồng đã huy động*</span></article>
            <article><strong>326</strong><span>dự án cộng đồng*</span></article>
            <article><strong>91%</strong><span>báo cáo đúng hạn*</span></article>
          </div>
        </div>
        <p className="demo-note container">* Số liệu mô phỏng phục vụ bản demo đồ án.</p>
      </section>

      <section className="section ai-section">
        <div className="container">
          <div className="ai-heading-row">
            <SectionHeading
              eyebrow="Dành riêng cho bạn"
              title="Có thể bạn sẽ quan tâm"
              description="Danh sách demo minh họa cách AI giải thích lý do gợi ý và tự động chuyển sang dự án phổ biến khi dịch vụ gián đoạn."
            />
            <div className="ai-label"><Icon name="sparkles" size={18} /> Gợi ý có giải thích</div>
          </div>
          <div className="campaign-grid campaign-grid-three">
            {recommended.map((campaign) => <CampaignCard campaign={campaign} key={campaign.slug} showAiReason />)}
          </div>
        </div>
      </section>

      <section className="section how-section" id="cach-hoat-dong">
        <div className="container how-grid">
          <div className="how-intro">
            <p className="eyebrow">Đơn giản nhưng có trách nhiệm</p>
            <h2>Từ một cú nhấp<br />đến một thay đổi thật.</h2>
            <p>Góp Mầm đặt minh bạch vào giữa toàn bộ hành trình, từ khi bạn chọn dự án đến khi dự án báo cáo kết quả.</p>
            <Link className="text-link" href="/du-an">Chọn dự án đầu tiên <Icon name="arrow-right" size={18} /></Link>
          </div>
          <div className="steps-list">
            {steps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="owner-cta-section">
        <div className="container owner-cta">
          <div>
            <p className="eyebrow eyebrow-light">Bạn đang ấp ủ một dự án?</p>
            <h2>Đừng để một ý tưởng tốt<br />chỉ nằm trên giấy.</h2>
            <p>Tạo hồ sơ từng bước, nhận đánh giá hỗ trợ từ AI và gửi tới đội ngũ kiểm duyệt.</p>
          </div>
          <Link className="button button-light button-large" href="/tao-chien-dich">Bắt đầu chiến dịch <Icon name="arrow-right" /></Link>
          <div className="owner-cta-shape"><Icon name="rocket" size={88} /></div>
        </div>
      </section>
    </main>
  );
}
