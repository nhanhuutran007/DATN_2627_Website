"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { ApiError, clearSession } from "@/lib/api";
import { deleteMyAccount, fetchDeletionCheck } from "@/lib/api/users";

const CONFIRM_WORD = "XÓA";

/**
 * Dòng "Xóa tài khoản" ở Cài đặt › Tài khoản. Xóa kiểu Kickstarter: tài khoản được ẩn danh hóa,
 * email được giải phóng để đăng ký lại; lịch sử ủng hộ/bình luận không chuyển sang tài khoản mới.
 * Góp Mầm vẫn giữ mã băm định danh để chống lách lệnh cấm. Cần mã OTP qua email.
 */
export function AccountDeletionSettings() {
  const dialog = useDialog();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const check = await fetchDeletionCheck();
      if (!check.canDelete) {
        await dialog.confirm({
          title: "Chưa thể xóa tài khoản",
          message: (
            <>
              Hãy hoàn tất những việc sau trước khi xóa tài khoản:
              <ul className="account-delete-blockers">
                {check.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            </>
          ),
          confirmLabel: "Đã hiểu",
          cancelLabel: "Đóng",
        });
        return;
      }
      const result = await dialog.prompt({
        title: "Xóa tài khoản Góp Mầm?",
        message: (
          <ul className="account-delete-consequences">
            <li>Bạn sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập lại được tài khoản này.</li>
            <li>Tên của bạn trên bình luận, danh sách ủng hộ… được thay bằng “Người dùng đã xóa”. Lịch sử ủng hộ, bình luận không chuyển sang tài khoản mới.</li>
            <li>Bạn có thể đăng ký lại bằng email này sau đó, nhưng số lần bỏ cam kết trước đây vẫn được tính.</li>
            <li>Góp Mầm vẫn lưu dấu vết đã mã hóa và chứng từ giao dịch theo quy định để giải quyết khiếu nại và chống gian lận. Tài khoản từng bị khóa vì vi phạm không thể đăng ký lại.</li>
          </ul>
        ),
        label: `Gõ ${CONFIRM_WORD} để xác nhận`,
        placeholder: CONFIRM_WORD,
        minLength: CONFIRM_WORD.length,
        maxLength: 20,
        confirmLabel: "Xóa vĩnh viễn",
        cancelLabel: "Giữ tài khoản",
        tone: "danger",
      });
      if (!result) return;
      if (result.value.trim().toUpperCase() !== CONFIRM_WORD) {
        setError(`Bạn cần gõ đúng chữ “${CONFIRM_WORD}” để xác nhận.`);
        return;
      }
      // Máy chủ yêu cầu mã OTP qua email: hộp nhập mã tự mở rồi gửi lại yêu cầu.
      await deleteMyAccount();
      clearSession();
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không xóa được tài khoản, vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="account-row" aria-labelledby="account-delete-label">
      <div className="account-row-main">
        <h2 id="account-delete-label" className="account-label">Xóa tài khoản</h2>
        <p className="account-value">
          Xóa tài khoản và dữ liệu cá nhân của bạn. Lịch sử giao dịch vẫn được lưu ở dạng ẩn danh theo quy định.
        </p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <button className="account-pill account-pill-danger" type="button" disabled={busy} onClick={() => void start()}>
        {busy ? "Đang kiểm tra…" : "Xóa tài khoản"}
      </button>
    </section>
  );
}
