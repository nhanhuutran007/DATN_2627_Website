"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { fetchCampaignContact, type CampaignContact } from "@/lib/api/campaigns";
import { useAuthUser } from "@/lib/auth";

type ContactOrganizerButtonProps = {
  campaignId: string;
  className?: string;
};

type LoadState = { status: "idle" | "loading" | "error" } | { status: "ready"; contact: CampaignContact };

function ContactRow({ icon, label, value, href }: { icon: IconName; label: string; value: string; href?: string }) {
  return (
    <li className="contact-row">
      <span className="contact-row-icon" aria-hidden="true"><Icon name={icon} size={18} /></span>
      <span>
        <small>{label}</small>
        {href ? <a href={href}>{value}</a> : <b>{value}</b>}
      </span>
    </li>
  );
}

/**
 * Nút "Liên hệ" cạnh "Chia sẻ": hiện liên hệ chủ dự án tự công khai trong Cài đặt và liên hệ của tổ chức
 * thụ hưởng (nếu có). Phải đăng nhập mới xem được để hạn chế dò quét thông tin.
 */
export function ContactOrganizerButton({ campaignId, className = "button button-outline" }: ContactOrganizerButtonProps) {
  const user = useAuthUser();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const show = () => {
    setOpen(true);
    if (!user || state.status === "ready" || state.status === "loading") return;
    setState({ status: "loading" });
    fetchCampaignContact(campaignId)
      .then((contact) => setState({ status: "ready", contact }))
      .catch(() => setState({ status: "error" }));
  };

  const contact = state.status === "ready" ? state.contact : null;
  const owner = contact?.owner;
  const ownerHasContact = Boolean(owner && (owner.email || owner.phone || owner.address));

  return (
    <>
      <button className={className} type="button" onClick={show} aria-haspopup="dialog">
        <Icon name="mail" size={16} /> Liên hệ
      </button>
      <dialog
        ref={ref}
        className="app-dialog share-dialog contact-dialog"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="share-dialog-head">
          <h2 id={titleId}>Liên hệ người tổ chức</h2>
          <button className="share-dialog-close" type="button" aria-label="Đóng" onClick={() => setOpen(false)}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="share-dialog-body">
          {!user ? (
            <div className="contact-gate">
              <p>Đăng nhập để xem thông tin liên hệ người tổ chức đã công khai.</p>
              <Link className="button button-primary" href={`/dang-nhap?next=${encodeURIComponent(`/du-an/${campaignId}`)}`}>
                Đăng nhập
              </Link>
            </div>
          ) : state.status === "loading" || state.status === "idle" ? (
            <p className="hint" role="status">Đang tải…</p>
          ) : state.status === "error" ? (
            <p className="form-error" role="alert">Không tải được thông tin liên hệ. Vui lòng thử lại sau.</p>
          ) : (
            <div className="contact-sections fade-swap">
              <section>
                <h3>{owner?.name}</h3>
                {ownerHasContact && owner ? (
                  <ul className="contact-list">
                    {owner.email && <ContactRow icon="mail" label="Email" value={owner.email} href={`mailto:${owner.email}`} />}
                    {owner.phone && <ContactRow icon="message" label="Điện thoại" value={owner.phone} href={`tel:${owner.phone.replace(/[^\d+]/g, "")}`} />}
                    {owner.address && <ContactRow icon="location" label="Địa chỉ" value={owner.address} />}
                  </ul>
                ) : (
                  <p>
                    Người tổ chức chưa công khai thông tin liên hệ. Bạn có thể đặt câu hỏi ở mục{" "}
                    <a href="#hoi-dap" onClick={() => setOpen(false)}>Hỏi đáp</a>, người tổ chức sẽ nhận được thông báo.
                  </p>
                )}
              </section>

              {contact?.organization && (
                <section>
                  <h3>
                    <Link href={`/to-chuc/${contact.organization.slug}`}>{contact.organization.name}</Link>
                  </h3>
                  <p className="contact-sub">Đơn vị thụ hưởng đã được Góp Mầm xác minh</p>
                  <ul className="contact-list">
                    <ContactRow icon="mail" label="Email" value={contact.organization.email} href={`mailto:${contact.organization.email}`} />
                    <ContactRow
                      icon="message"
                      label="Điện thoại"
                      value={contact.organization.phone}
                      href={`tel:${contact.organization.phone.replace(/[^\d+]/g, "")}`}
                    />
                    <ContactRow icon="location" label="Địa chỉ" value={contact.organization.address} />
                    {contact.organization.website && (
                      <ContactRow icon="share" label="Website" value={contact.organization.website} href={contact.organization.website} />
                    )}
                  </ul>
                </section>
              )}

              <p className="contact-warning">
                <Icon name="shield" size={16} />
                Chỉ ủng hộ qua trang dự án để khoản tiền được xác nhận và ghi vào sổ cái công khai. Góp Mầm không chịu
                trách nhiệm với khoản chuyển trực tiếp cho cá nhân.
              </p>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
