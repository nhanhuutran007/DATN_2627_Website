import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
};

export function SectionHeading({ eyebrow, title, description, href, linkLabel = "Xem tất cả" }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && <Link className="text-link" href={href}>{linkLabel} <Icon name="arrow-right" size={18} /></Link>}
    </div>
  );
}
