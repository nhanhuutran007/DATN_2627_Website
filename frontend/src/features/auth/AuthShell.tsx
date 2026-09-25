import Image from "next/image";

import { Icon } from "@/components/ui/Icon";

type AuthShellProps = {
  title: string;
  lead: string;
  image: { src: string; alt: string };
  children: React.ReactNode;
};

const promises = [
  "Hồ sơ gây quỹ được kiểm duyệt trước khi công khai",
  "Khoản ủng hộ chỉ được ghi nhận khi thanh toán xác nhận",
  "Theo dõi sổ cái và báo cáo chi tiêu của từng dự án",
];

/** Bố cục chung cho trang đăng nhập / đăng ký. */
export function AuthShell({ title, lead, image, children }: AuthShellProps) {
  return (
    <main className="auth">
      <section className="auth-side" aria-hidden="true">
        <Image className="auth-side-img" src={image.src} alt="" fill priority sizes="(max-width: 960px) 0px, 45vw" />
        <div className="auth-side-inner">
          <span className="pill pill-light">Góp Mầm</span>
          <p className="auth-side-title">Gây quỹ cộng đồng minh bạch cho dự án xã hội và khởi nghiệp</p>
          <ul>
            {promises.map((item) => (
              <li key={item}><Icon name="check" size={16} /> {item}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="auth-lead">{lead}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
