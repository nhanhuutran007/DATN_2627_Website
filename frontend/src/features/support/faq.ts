/**
 * Câu hỏi thường gặp cho hộp hỗ trợ ở góc màn hình. Câu trả lời soạn sẵn, phải khớp nghiệp vụ thật
 * (thời hạn hoàn tiền: REFUND_WINDOW_DAYS ở finance.service; đơn chờ: DONATION_PENDING_TTL_MINUTES).
 */
export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  link?: { href: string; label: string };
  /** Từ khóa (viết không dấu) để khớp câu hỏi người dùng tự gõ. */
  keywords: string[];
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "gioi-thieu",
    question: "Góp Mầm là gì?",
    answer:
      "Góp Mầm là nền tảng gây quỹ cộng đồng cho dự án xã hội và khởi nghiệp. Mỗi chiến dịch được quản trị viên xét duyệt trước khi gây quỹ, số tiền huy động được tính từ giao dịch đã xác nhận và chủ dự án phải báo cáo chi tiêu kèm chứng từ.",
    link: { href: "/du-an", label: "Khám phá dự án" },
    keywords: ["gop mam", "la gi", "gioi thieu", "nen tang", "website"],
  },
  {
    id: "cach-ung-ho",
    question: "Làm sao để ủng hộ một dự án?",
    answer:
      "Mở trang dự án và bấm “Ủng hộ”, chọn số tiền rồi chọn phương thức thanh toán. Bạn cần đăng nhập để ủng hộ. Sau khi thanh toán, trang sẽ tự cập nhật trạng thái và bạn nhận được biên nhận điện tử.",
    link: { href: "/du-an", label: "Chọn dự án để ủng hộ" },
    keywords: ["ung ho", "dong gop", "quyen gop", "tai tro", "donate"],
  },
  {
    id: "thanh-toan",
    question: "Có những phương thức thanh toán nào?",
    answer:
      "Bạn ủng hộ bằng chuyển khoản qua cổng thanh toán SePay (quét mã QR bằng ứng dụng ngân hàng). Giao dịch được ghi nhận sau khi SePay xác nhận đã nhận tiền. Góp Mầm không lưu thông tin thẻ hay tài khoản ngân hàng dùng để thanh toán.",
    keywords: ["thanh toan", "phuong thuc", "chuyen khoan", "sepay", "vi demo", "the tin dung", "ngan hang"],
  },
  {
    id: "cho-xac-nhan",
    question: "Đã thanh toán nhưng giao dịch vẫn chờ xác nhận?",
    answer:
      "Giao dịch chỉ được ghi nhận sau khi máy chủ xác minh với cổng thanh toán, việc này thường mất vài giây. Trang chờ tự kiểm tra lại định kỳ. Đơn chưa thanh toán sẽ hết hạn sau 30 phút; nếu bạn đã trả tiền thì hệ thống vẫn đối soát và ghi nhận khoản ủng hộ.",
    link: { href: "/dashboard#ung-ho-cua-toi", label: "Xem khoản ủng hộ của tôi" },
    keywords: ["cho xac nhan", "chua xac nhan", "chua ghi nhan", "da thanh toan", "het han", "pending", "mat tien"],
  },
  {
    id: "hoan-tien",
    question: "Tôi có thể yêu cầu hoàn tiền không?",
    answer:
      "Có. Bạn gửi yêu cầu hoàn tiền từ trang biên nhận trong vòng 7 ngày sau khi ủng hộ, hoặc bất cứ lúc nào nếu chiến dịch không đạt mục tiêu hay bị hủy. Nếu bạn thanh toán qua SePay, hãy nhập tài khoản ngân hàng nhận hoàn để quản trị viên chuyển khoản trả lại. Quản trị viên sẽ xem xét và thông báo kết quả cho bạn.",
    link: { href: "/dashboard#ung-ho-cua-toi", label: "Mở danh sách biên nhận" },
    keywords: ["hoan tien", "tra lai", "rut tien", "refund", "huy ung ho"],
  },
  {
    id: "tao-chien-dich",
    question: "Làm sao để tạo chiến dịch gây quỹ?",
    answer:
      "Vào “Tạo chiến dịch” và đi qua 8 bước: thông tin chung, mục tiêu và thời hạn, ảnh đại diện, câu chuyện, ngân sách và rủi ro, kế hoạch theo mốc, quà tri ân (không bắt buộc), rồi kiểm tra và gửi duyệt. Bạn cần đăng nhập để lưu nháp hoặc gửi duyệt.",
    link: { href: "/tao-chien-dich", label: "Tạo chiến dịch" },
    keywords: ["tao chien dich", "tao du an", "gay quy", "keu goi", "mo chien dich", "dang du an"],
  },
  {
    id: "xet-duyet",
    question: "Chiến dịch được xét duyệt như thế nào?",
    answer:
      "Quản trị viên kiểm tra nội dung, mục tiêu và kế hoạch sử dụng quỹ, sau đó duyệt, từ chối kèm lý do hoặc yêu cầu bổ sung thông tin. Bạn nhận thông báo trong ứng dụng và qua email. Sau khi phát hành, mục tiêu và thời hạn không thể tự ý thay đổi.",
    link: { href: "/dashboard", label: "Theo dõi chiến dịch của tôi" },
    keywords: ["xet duyet", "duyet", "kiem duyet", "tu choi", "bo sung", "phe duyet"],
  },
  {
    id: "minh-bach",
    question: "Làm sao biết tiền được dùng đúng mục đích?",
    answer:
      "Mỗi dự án có sổ cái giao dịch công khai và mục “Nhật ký tiến độ & chi tiêu”. Khi khai chi, chủ dự án phải đính kèm ảnh chứng từ; mọi thay đổi kế hoạch đều ghi lý do và được thông báo cho người ủng hộ.",
    keywords: ["minh bach", "chi tieu", "dung dung muc dich", "chung tu", "so cai", "tien do"],
  },
  {
    id: "bao-cao",
    question: "Tôi thấy một chiến dịch đáng ngờ thì làm gì?",
    answer:
      "Trên trang dự án, bấm “Báo cáo vi phạm” và chọn lý do. Báo cáo được chuyển vào hàng đợi kiểm duyệt, quản trị viên sẽ xem xét và có thể tạm dừng chiến dịch nếu cần.",
    keywords: ["bao cao", "vi pham", "lua dao", "dang ngo", "gian lan", "to cao"],
  },
  {
    id: "goi-y-ai",
    question: "Gợi ý dự án bằng AI dùng dữ liệu gì của tôi?",
    answer:
      "Gợi ý cá nhân hóa chỉ dùng lịch sử xem và ủng hộ khi bạn đồng ý. Bạn có thể rút lại đồng ý trong phần cài đặt tài khoản, khi đó lịch sử hành vi sẽ bị xóa và gợi ý quay về danh sách dự án phổ biến.",
    link: { href: "/ho-so", label: "Mở cài đặt tài khoản" },
    keywords: ["goi y ai", "tri tue nhan tao", "goi y", "ca nhan hoa", "du lieu", "quyen rieng tu", "dong y"],
  },
  {
    id: "quen-mat-khau",
    question: "Tôi quên mật khẩu thì sao?",
    answer: "Dùng chức năng “Quên mật khẩu” để nhận email chứa liên kết đặt lại mật khẩu.",
    link: { href: "/quen-mat-khau", label: "Đặt lại mật khẩu" },
    keywords: ["quen mat khau", "mat khau", "dat lai", "khong dang nhap duoc", "dang nhap"],
  },
];

/** Bỏ dấu, chữ thường, gộp khoảng trắng để so khớp tiếng Việt gõ có hoặc không dấu. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Tìm câu hỏi thường gặp gần nhất với câu người dùng gõ. Từ khóa dài (nhiều chữ) nặng điểm hơn;
 * khớp theo ranh giới từ để "ai" không trùng với "tai". Trả về null nếu không khớp được.
 */
export function matchFaq(input: string): FaqItem | null {
  const text = ` ${normalizeText(input)} `;
  if (text.trim().length === 0) return null;
  let best: FaqItem | null = null;
  let bestScore = 0;
  for (const item of FAQ_ITEMS) {
    const score = item.keywords.reduce(
      (sum, keyword) => (text.includes(` ${keyword} `) ? sum + keyword.split(" ").length : sum),
      0,
    );
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}
