import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Dành cho tổ chức",
  description:
    "Đăng ký trang tổ chức trên Góp Mầm: được xác minh, nhận gây quỹ từ cộng đồng và công khai tiến độ, chi tiêu cho người ủng hộ.",
  alternates: { canonical: "/danh-cho-to-chuc" },
};

type Step = { title: string; text: string; mock: ReactNode };

const steps: Step[] = [
  {
    title: "Gửi hồ sơ tổ chức",
    text: "Điền thông tin tổ chức, sứ mệnh, liên hệ và tải ảnh giấy phép hoặc quyết định thành lập.",
    mock: (
      <div className="start-mock">
        <p className="start-mock-label">Số giấy phép</p>
        <p className="start-mock-big">123/QĐ-UBND</p>
      </div>
    ),
  },
  {
    title: "Quản trị viên xác minh",
    text: "Quản trị viên đối chiếu giấy tờ rồi xác minh, yêu cầu bổ sung hoặc từ chối kèm lý do rõ ràng.",
    mock: (
      <div className="start-mock">
        <p className="start-mock-label">Trạng thái hồ sơ</p>
        <div className="start-mock-row">
          <span className="start-mock-badge"><Icon name="shield" size={18} /></span>
          <span><b>Đã xác minh</b><small>Hiển thị công khai</small></span>
          <span className="start-mock-ok"><Icon name="check" size={14} /></span>
        </div>
      </div>
    ),
  },
  {
    title: "Cộng đồng gây quỹ giúp bạn",
    text: "Tổ chức có trang riêng; bất kỳ ai cũng có thể mở chiến dịch gây quỹ cho tổ chức nhân dịp sinh nhật, sự kiện hay tưởng nhớ.",
    mock: (
      <div className="start-mock start-mock-share">
        <span className="start-mock-float start-mock-float-a" aria-hidden="true"><Icon name="heart" size={14} /></span>
        <p className="start-mock-label">Gây quỹ cho tổ chức</p>
        <p className="start-mock-big">Chạy 21 km vì trẻ em</p>
      </div>
    ),
  },
  {
    title: "Minh bạch với người ủng hộ",
    text: "Mỗi chiến dịch có sổ cái công khai, cập nhật tiến độ và chứng từ chi tiêu như mọi dự án trên Góp Mầm.",
    mock: (
      <div className="start-mock">
        <p className="start-mock-title">Sổ cái công khai</p>
        <div className="start-mock-row">
          <span className="start-mock-badge"><Icon name="receipt" size={18} /></span>
          <span><b>Đã xác nhận</b><small>Theo giao dịch thật</small></span>
          <span className="start-mock-ok"><Icon name="check" size={14} /></span>
        </div>
      </div>
    ),
  },
];

const benefits: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: "shield", title: "Huy hiệu đã xác minh", text: "Người ủng hộ thấy tổ chức đã được quản trị viên đối chiếu giấy tờ pháp lý, tăng niềm tin khi đóng góp." },
  { icon: "users", title: "Người ủng hộ gây quỹ thay bạn", text: "Tình nguyện viên, nhà hảo tâm mở chiến dịch riêng cho tổ chức, đưa sứ mệnh của bạn đến những người chưa biết tới." },
  { icon: "chart", title: "Theo dõi mọi chiến dịch", text: "Trang tổ chức tổng hợp số chiến dịch và số tiền đã huy động (chỉ tính giao dịch đã được xác nhận)." },
  { icon: "receipt", title: "Minh bạch dòng tiền", text: "Sổ cái, tiến độ theo mốc và chứng từ chi tiêu công khai — điều người ủng hộ cần để yên tâm." },
];

const faqs: Array<{ question: string; answer: string }> = [
  {
    question: "Tổ chức nào có thể đăng ký?",
    answer:
      "Quỹ xã hội, quỹ từ thiện, tổ chức phi chính phủ hoặc phi lợi nhuận, doanh nghiệp xã hội, trường học và cơ sở y tế có giấy phép hoặc quyết định thành lập hợp lệ.",
  },
  {
    question: "Cần chuẩn bị giấy tờ gì?",
    answer:
      "Số giấy phép/quyết định thành lập, cơ quan cấp và một ảnh chụp rõ giấy tờ đó. Ảnh giấy phép chỉ người đại diện và quản trị viên xem được, không hiển thị công khai.",
  },
  {
    question: "Đăng ký trang tổ chức có mất phí không?",
    answer: "Không. Góp Mầm không thu phí đăng ký hay duy trì trang tổ chức.",
  },
  {
    question: "Ai được phép gây quỹ cho tổ chức của tôi?",
    answer:
      "Sau khi tổ chức được xác minh, mọi tài khoản đều có thể tạo chiến dịch gây quỹ cho tổ chức. Chiến dịch vẫn phải qua kiểm duyệt như mọi dự án khác trước khi công khai.",
  },
  {
    question: "Nếu hồ sơ bị yêu cầu bổ sung thì sao?",
    answer:
      "Bạn sẽ nhận thông báo kèm ghi chú của quản trị viên. Sửa hồ sơ trong trang “Tổ chức của tôi” và lưu lại là hồ sơ được gửi xét lại.",
  },
];

export default function ForOrganizationsPage() {
  return (
    <main className="start-page">
      <section className="start-hero" aria-labelledby="org-title">
        <div className="container start-hero-inner">
          <div className="start-hero-copy">
            <h1 id="org-title">Mở rộng tầm ảnh hưởng của tổ chức bạn</h1>
            <p>
              Đăng ký trang tổ chức miễn phí để được xác minh, nhận gây quỹ từ cộng đồng và cho người ủng hộ thấy rõ
              từng đồng được dùng vào đâu.
            </p>
            <div className="start-hero-cta">
              <Link className="button button-primary button-lg" href="/to-chuc/dang-ky">Đăng ký tổ chức</Link>
              <Link className="start-hero-link" href="/to-chuc/cua-toi">Tổ chức của tôi</Link>
            </div>
          </div>
          <div className="start-hero-media">
            <Image
              src="/images/cover-health.webp"
              alt="Khám mắt miễn phí cho người dân tại một điểm khám cộng đồng"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 560px"
            />
          </div>
        </div>
      </section>

      <section className="start-why" aria-labelledby="loi-ich-title">
        <div className="container">
          <div className="start-head">
            <span className="start-badge"><Icon name="check" size={14} /> Miễn phí cho tổ chức</span>
            <h2 id="loi-ich-title">Công cụ gây quỹ dành cho tổ chức</h2>
            <p>Mọi điều cần để cộng đồng đồng hành cùng sứ mệnh của bạn, trên một nền tảng minh bạch.</p>
          </div>
          <ul className="start-reasons org-benefits">
            {benefits.map((item) => (
              <li key={item.title}>
                <Icon name={item.icon} size={40} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="start-steps" aria-labelledby="quy-trinh-title">
        <div className="container">
          <div className="start-head">
            <h2 id="quy-trinh-title">Bốn bước để bắt đầu</h2>
            <p>Hồ sơ được con người xem xét — không có quyết định tự động nào.</p>
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

      <section className="start-faq" aria-labelledby="org-faq-title">
        <div className="container start-faq-inner">
          <h2 id="org-faq-title">Câu hỏi thường gặp</h2>
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

      <section className="cta-band" aria-labelledby="org-cta-title">
        <div className="container cta-inner">
          <div>
            <h2 id="org-cta-title">Sẵn sàng đưa tổ chức của bạn lên Góp Mầm?</h2>
            <p>Chuẩn bị số giấy phép và ảnh chụp giấy tờ, việc đăng ký chỉ mất vài phút.</p>
          </div>
          <Link className="button button-white button-lg" href="/to-chuc/dang-ky">Đăng ký tổ chức</Link>
        </div>
      </section>
    </main>
  );
}
