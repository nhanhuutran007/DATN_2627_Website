import { PASSWORD_RULES } from "@/lib/password-policy";

type PasswordRulesProps = {
  value: string;
  id?: string;
};

/**
 * Danh sách yêu cầu mật khẩu cập nhật khi gõ: "•" khi chưa nhập, "✓" xanh khi đạt,
 * "⨉" đỏ khi chưa đạt (cùng cách hiển thị với trang đăng ký của GoFundMe).
 */
export function PasswordRules({ value, id }: PasswordRulesProps) {
  const typed = value.length > 0;
  const passed = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  return (
    <div className="password-rules" id={id}>
      <p className="password-rules-label">Mật khẩu phải có:</p>
      <ul>
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li key={rule.id} className="password-rule" data-valid={typed ? String(ok) : "none"}>
              {rule.label}
              {typed && <span className="sr-only">{ok ? " (đã đạt)" : " (chưa đạt)"}</span>}
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">{typed ? `Đạt ${passed}/${PASSWORD_RULES.length} yêu cầu mật khẩu.` : ""}</p>
    </div>
  );
}
