import { resolveMediaUrl } from "@/lib/api";

type OrganizationLogoProps = {
  organization: { name: string; logoUrl?: string | null };
  size?: "sm" | "md" | "lg";
};

/** Logo tổ chức; chưa có logo thì hiện chữ cái đầu của tên. */
export function OrganizationLogo({ organization, size = "md" }: OrganizationLogoProps) {
  return (
    <span className={size === "md" ? "org-logo" : `org-logo org-logo-${size}`} aria-hidden="true">
      {organization.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh người dùng tải lên, đường dẫn động
        <img src={resolveMediaUrl(organization.logoUrl)} alt="" />
      ) : (
        organization.name.trim()[0]?.toUpperCase() ?? "?"
      )}
    </span>
  );
}
