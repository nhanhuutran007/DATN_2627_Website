const services = [
  {
    name: "Frontend",
    description: "Next.js App Router cho giao diện người dùng và quản trị.",
    status: "Đã khởi tạo",
  },
  {
    name: "Business API",
    description: "NestJS sở hữu nghiệp vụ, phân quyền, giao dịch và audit.",
    status: "Health endpoint",
  },
  {
    name: "AI service",
    description: "FastAPI phục vụ mô hình và metadata có version.",
    status: "Health endpoint",
  },
];

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">DATN · Crowdfunding Platform</p>
        <h1>Bộ khung dự án đã sẵn sàng để phát triển.</h1>
        <p className="lead">
          Hãy triển khai từng chức năng theo vertical slice: giao diện, API,
          migration, phân quyền và kiểm thử đi cùng nhau.
        </p>
      </section>

      <section className="serviceGrid" aria-label="Các dịch vụ trong hệ thống">
        {services.map((service) => (
          <article className="serviceCard" key={service.name}>
            <span>{service.status}</span>
            <h2>{service.name}</h2>
            <p>{service.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
