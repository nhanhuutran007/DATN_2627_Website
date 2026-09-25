import Image from "next/image";
import Link from "next/link";

type Crumb = { href?: string; label: string };

type PageBannerProps = {
  title: string;
  crumbs: Crumb[];
  image?: { src: string; alt: string };
  children?: React.ReactNode;
};

/** Banner đầu trang con: ảnh nền phủ tối, tiêu đề H1 và breadcrumb (có schema BreadcrumbList cho SEO). */
export function PageBanner({ title, crumbs, image, children }: PageBannerProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: crumb.href } : {}),
    })),
  };

  return (
    <section className="page-banner">
      <Image
        className="page-banner-img"
        src={image?.src ?? "/images/cover-mangrove.webp"}
        alt=""
        fill
        priority
        sizes="100vw"
        unoptimized={image?.src.startsWith("http")}
      />
      <div className="container page-banner-inner">
        <nav className="banner-crumbs" aria-label="Vị trí trang">
          {crumbs.map((crumb, index) => (
            <span key={crumb.label}>
              {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
              {index < crumbs.length - 1 && <span aria-hidden="true"> / </span>}
            </span>
          ))}
        </nav>
        <h1>{title}</h1>
        {children}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}
