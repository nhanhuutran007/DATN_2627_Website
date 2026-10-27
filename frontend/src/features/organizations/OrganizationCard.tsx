import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { ORGANIZATION_TYPE_LABEL, type Organization } from "@/lib/api/organizations";
import { formatVndShort } from "@/lib/format";
import { OrganizationLogo } from "./OrganizationLogo";

/** Thẻ tổ chức đã xác minh ở danh bạ: logo, loại hình, sứ mệnh ngắn và số liệu gây quỹ đã xác nhận. */
export function OrganizationCard({ organization }: { organization: Organization }) {
  const href = `/to-chuc/${encodeURIComponent(organization.slug)}`;
  return (
    <article className="org-card">
      <div className="org-card-head">
        <OrganizationLogo organization={organization} />
        <div>
          <h3><Link href={href}>{organization.name}</Link></h3>
          <p><Icon name="shield" size={13} /> Đã xác minh · {organization.province}</p>
        </div>
      </div>
      <p className="org-card-type">{ORGANIZATION_TYPE_LABEL[organization.type]}</p>
      <p className="org-card-mission">{organization.mission}</p>
      <p className="org-card-stats">
        <span><b>{formatVndShort(organization.totalRaised ?? 0)}</b> đã huy động</span>
        <span><b>{organization.campaignCount ?? 0}</b> chiến dịch</span>
      </p>
    </article>
  );
}
