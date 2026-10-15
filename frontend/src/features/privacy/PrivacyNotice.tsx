"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

/** Đổi giá trị này khi nội dung chính sách thay đổi để thông báo hiện lại với mọi người. */
const NOTICE_VERSION = "2026-10-15";
const STORAGE_KEY = "gopmam.privacyNotice";
const CHANGE_EVENT = "gopmam:privacy-notice";

/** Trình duyệt chặn localStorage (chế độ riêng tư…): chỉ nhớ trong phiên trang hiện tại. */
let acceptedInMemory = false;

function readAccepted(): boolean {
  if (acceptedInMemory) return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === NOTICE_VERSION;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function accept(): void {
  acceptedInMemory = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, NOTICE_VERSION);
  } catch {
    // Không lưu được thì lần sau thông báo hiện lại; không ảnh hưởng việc dùng trang.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Thông báo quyền riêng tư ở lần truy cập đầu tiên (theo trình duyệt). */
export function PrivacyNotice() {
  // Trên server coi như đã đồng ý để không render thông báo rồi mới ẩn khi hydrate.
  const accepted = useSyncExternalStore(subscribe, readAccepted, () => true);
  if (accepted) return null;

  return (
    <section className="privacy-notice" role="region" aria-labelledby="privacy-notice-title">
      <div className="privacy-notice-body">
        <p id="privacy-notice-title" className="privacy-notice-title">Thông tin quyền riêng tư</p>
        <p className="privacy-notice-text">
          Góp Mầm dùng bộ nhớ của trình duyệt để giữ phiên đăng nhập, ghi nhớ lựa chọn của bạn và đếm lượt xem dự án
          không bị trùng. Chúng tôi không dùng cookie quảng cáo hay công cụ theo dõi của bên thứ ba. Khi tiếp tục sử
          dụng trang hoặc bấm “Đồng ý”, bạn đồng ý với cách sử dụng này như mô tả trong Chính sách quyền riêng tư.
        </p>
      </div>
      <div className="privacy-notice-actions">
        <button className="button button-primary" type="button" onClick={accept}>
          Đồng ý
        </button>
        <Link className="privacy-notice-link" href="/chinh-sach-bao-mat">
          Xem chính sách quyền riêng tư
        </Link>
      </div>
    </section>
  );
}
