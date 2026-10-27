import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  ORGANIZATION_TYPE_LABEL,
  fetchOrganizations,
  toPicked,
  type Organization,
  type PickedOrganization,
} from "@/lib/api/organizations";
import { OrganizationLogo } from "./OrganizationLogo";

type OrganizationPickerProps = {
  value: PickedOrganization | null;
  onChange: (organization: PickedOrganization | null) => void;
  disabled?: boolean;
};

const SEARCH_DELAY_MS = 300;

/** Tìm và chọn một tổ chức đã xác minh (danh bạ công khai chỉ trả tổ chức verified). */
export function OrganizationPicker({ value, onChange, disabled = false }: OrganizationPickerProps) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Organization[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (value) return;
    let active = true;
    const timer = window.setTimeout(() => {
      fetchOrganizations({ q: q.trim() || undefined, limit: 6 })
        .then((result) => {
          if (!active) return;
          setItems(result.items);
          setFailed(false);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    }, SEARCH_DELAY_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [q, value]);

  if (value) {
    return (
      <div className="org-picked">
        <OrganizationLogo organization={value} size="sm" />
        <span>
          <b>{value.name}</b>
          <small><Icon name="shield" size={13} /> Tổ chức đã xác minh{value.province ? ` · ${value.province}` : ""}</small>
        </span>
        <button type="button" className="link-button" disabled={disabled} onClick={() => onChange(null)}>Đổi tổ chức</button>
      </div>
    );
  }

  return (
    <div className="org-picker">
      <label className="org-picker-search">
        <Icon name="search" size={18} />
        <span className="sr-only">Tìm tổ chức</span>
        <input
          type="search"
          value={q}
          placeholder="Tìm theo tên tổ chức…"
          disabled={disabled}
          onChange={(event) => setQ(event.target.value)}
        />
      </label>
      {failed ? (
        <p className="hint" role="alert">Không tải được danh sách tổ chức. Vui lòng thử lại.</p>
      ) : items === null ? (
        <p className="hint">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="hint">
          Không tìm thấy tổ chức đã xác minh nào{q.trim() ? ` khớp “${q.trim()}”` : ""}. Tổ chức cần{" "}
          <a href="/danh-cho-to-chuc" target="_blank" rel="noopener">đăng ký và được xác minh</a> trước.
        </p>
      ) : (
        <ul className="org-picker-list">
          {items.map((organization) => (
            <li key={organization.id}>
              <button type="button" disabled={disabled} onClick={() => onChange(toPicked(organization))}>
                <OrganizationLogo organization={organization} size="sm" />
                <span>
                  <b>{organization.name}</b>
                  <small>{ORGANIZATION_TYPE_LABEL[organization.type]} · {organization.province}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
