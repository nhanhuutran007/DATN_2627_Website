import Link from "next/link";

type Crumb = { href?: string; label: string };

/** Đường dẫn phân cấp nhỏ ở đầu nội dung (vd. "Khám phá dự án / Giáo dục"); mục cuối là trang hiện tại. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Đường dẫn">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href && index < items.length - 1 ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
