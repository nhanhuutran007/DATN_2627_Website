/**
 * Câu hỏi thường gặp cho hộp hỗ trợ ở góc màn hình. Câu trả lời soạn sẵn, phải khớp nghiệp vụ thật
 * (thời hạn hoàn tiền: REFUND_WINDOW_DAYS ở finance.service; đơn chờ: DONATION_PENDING_TTL_MINUTES;
 * khóa đăng nhập: MAX_LOGIN_ATTEMPTS, LOGIN_LOCK_MINUTES ở users.service; mức tối thiểu: MIN_AMOUNT
 * ở DonationPanel).
 */
export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  link?: { href: string; label: string };
  /** Kèm danh sách lĩnh vực lấy từ máy chủ (mỗi lĩnh vực là một link lọc dự án). */
  showCategories?: boolean;
  /** Câu xã giao: vẫn trả lời khi người dùng gõ, nhưng không hiện trong danh sách gợi ý. */
  hidden?: boolean;
  /**
   * Từ khóa (viết không dấu) để khớp câu hỏi người dùng tự gõ. Tránh từ quá chung ("la gi",
   * "dang nhap") vì sẽ kéo câu hỏi khác về đây; câu cụ thể dùng cụm dài hơn để thắng câu chung.
   */
  keywords: string[];
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "gioi-thieu",
    question: "Góp Mầm là gì?",
    answer:
      "Góp Mầm là nền tảng gây quỹ cộng đồng cho dự án xã hội và khởi nghiệp. Mỗi chiến dịch được quản trị viên xét duyệt trước khi gây quỹ, số tiền huy động được tính từ giao dịch đã xác nhận và chủ dự án phải báo cáo chi tiêu kèm chứng từ.",
    link: { href: "/du-an", label: "Khám phá dự án" },
    keywords: ["gop mam", "gop mam la gi", "gioi thieu", "website nay", "trang web nay", "uy tin"],
  },
  {
    id: "linh-vuc",
    question: "Góp Mầm có những lĩnh vực nào?",
    answer:
      "Góp Mầm nhận chiến dịch ở các lĩnh vực dưới đây. Bấm vào một lĩnh vực để xem các dự án đang gây quỹ trong lĩnh vực đó.",
    link: { href: "/du-an", label: "Khám phá tất cả dự án" },
    showCategories: true,
    keywords: ["linh vuc", "danh muc", "chu de", "the loai", "nganh", "loai du an", "category"],
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
    id: "ung-ho-chi-tiet",
    question: "Ủng hộ tối thiểu bao nhiêu? Có ủng hộ ẩn danh được không?",
    answer:
      "Mỗi lần ủng hộ tối thiểu 20.000đ. Trong form ủng hộ, bạn có thể đánh dấu “Ủng hộ ẩn danh” để tên bạn không hiện trên sổ cái công khai của dự án, và gửi kèm lời nhắn tới chủ dự án (tối đa 500 ký tự). Bạn vẫn cần đăng nhập để hệ thống gửi biên nhận cho bạn.",
    keywords: [
      "toi thieu", "it nhat", "bao nhieu tien", "ung ho toi thieu",
      "an danh", "giau ten", "khong hien ten", "ung ho an danh", "loi nhan",
    ],
  },
  {
    id: "qua-tri-an",
    question: "Quà tri ân là gì?",
    answer:
      "Một số chiến dịch tặng quà theo mức ủng hộ để cảm ơn người ủng hộ. Mỗi mức quà có số tiền tối thiểu và có thể giới hạn số suất. Bạn chọn mức quà ngay trong form ủng hộ khi số tiền đủ điều kiện. Nếu mức quà vừa hết suất đúng lúc giao dịch được xác nhận, khoản ủng hộ vẫn được ghi nhận nhưng không kèm quà.",
    keywords: ["qua tri an", "qua tang", "phan qua", "muc qua", "nhan qua", "reward"],
  },
  {
    id: "thanh-toan",
    question: "Có những phương thức thanh toán nào?",
    answer:
      "Bạn ủng hộ bằng chuyển khoản qua cổng thanh toán SePay (quét mã QR bằng ứng dụng ngân hàng bất kỳ). Hiện Góp Mầm chưa tích hợp riêng ví MoMo hay ZaloPay. Giao dịch được ghi nhận sau khi SePay xác nhận đã nhận tiền. Góp Mầm không lưu thông tin thẻ hay tài khoản ngân hàng dùng để thanh toán.",
    keywords: [
      "thanh toan", "phuong thuc", "chuyen khoan", "tra tien", "sepay", "vi demo", "the tin dung",
      "ngan hang", "ma qr", "momo", "zalopay", "vnpay", "bang momo", "bang zalopay", "bang vnpay", "bang the",
    ],
  },
  {
    id: "cho-xac-nhan",
    question: "Đã thanh toán nhưng giao dịch vẫn chờ xác nhận?",
    answer:
      "Giao dịch chỉ được ghi nhận sau khi máy chủ xác minh với cổng thanh toán, việc này thường mất vài giây. Trang chờ tự kiểm tra lại định kỳ. Đơn chưa thanh toán sẽ hết hạn sau 30 phút; nếu bạn đã trả tiền thì hệ thống vẫn đối soát và ghi nhận khoản ủng hộ.",
    link: { href: "/dashboard#ung-ho-cua-toi", label: "Xem khoản ủng hộ của tôi" },
    keywords: [
      "cho xac nhan", "chua xac nhan", "chua ghi nhan", "da thanh toan", "het han", "pending", "mat tien",
      "chuyen tien roi", "da chuyen tien", "chua thay", "chua cong", "chua cap nhat",
    ],
  },
  {
    id: "bien-nhan",
    question: "Xem lịch sử ủng hộ và biên nhận ở đâu?",
    answer:
      "Vào “Trang của tôi”, mục “Khoản ủng hộ của tôi” liệt kê mọi lần bạn ủng hộ. Mỗi khoản đã xác nhận có biên nhận điện tử ghi số tiền, thời điểm, dự án và mã giao dịch. Khoản đang chờ thanh toán hoặc đã hủy chưa có biên nhận.",
    link: { href: "/dashboard#ung-ho-cua-toi", label: "Mở khoản ủng hộ của tôi" },
    keywords: [
      "bien nhan", "hoa don", "chung nhan", "receipt", "lich su ung ho", "khoan ung ho cua toi",
      "da ung ho", "ung ho cua toi",
    ],
  },
  {
    id: "hoan-tien",
    question: "Tôi có thể yêu cầu hoàn tiền không?",
    answer:
      "Có. Bạn gửi yêu cầu hoàn tiền từ trang biên nhận trong vòng 7 ngày sau khi ủng hộ, hoặc bất cứ lúc nào nếu chiến dịch không đạt mục tiêu hay bị hủy. Nếu bạn thanh toán qua SePay, hãy nhập tài khoản ngân hàng nhận hoàn để quản trị viên chuyển khoản trả lại. Quản trị viên sẽ xem xét và thông báo kết quả cho bạn.",
    link: { href: "/dashboard#ung-ho-cua-toi", label: "Mở danh sách biên nhận" },
    keywords: [
      "hoan tien", "tra lai", "rut tien", "refund", "huy ung ho", "lay lai tien", "doi lai tien",
      "khong dat muc tieu", "bi huy",
    ],
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
    keywords: [
      "xet duyet", "duyet", "kiem duyet", "tu choi", "bo sung", "phe duyet", "gia han",
      "sua chien dich", "doi muc tieu", "thay doi muc tieu",
    ],
  },
  {
    id: "to-chuc",
    question: "Tổ chức đăng ký trên Góp Mầm thế nào?",
    answer:
      "Vào “Dành cho tổ chức” rồi bấm đăng ký tổ chức, điền hồ sơ và giấy tờ pháp lý. Quản trị viên xác minh hồ sơ và thông báo kết quả cho bạn. Sau khi được xác minh, tổ chức có trang riêng và người dùng có thể mở chiến dịch gây quỹ cho tổ chức đó.",
    link: { href: "/danh-cho-to-chuc", label: "Dành cho tổ chức" },
    keywords: [
      "to chuc", "dang ky to chuc", "xac minh to chuc", "quy tu thien", "hoi nhom", "doanh nghiep",
      "phap nhan",
    ],
  },
  {
    id: "minh-bach",
    question: "Làm sao biết tiền được dùng đúng mục đích?",
    answer:
      "Mỗi dự án có sổ cái giao dịch công khai và mục “Nhật ký tiến độ & chi tiêu”. Khi khai chi, chủ dự án phải đính kèm ảnh chứng từ; mọi thay đổi kế hoạch đều ghi lý do và được thông báo cho người ủng hộ.",
    keywords: [
      "minh bach", "chi tieu", "dung dung muc dich", "chung tu", "so cai", "tien do", "co that khong",
      "tin tuong", "dang tin",
    ],
  },
  {
    id: "theo-doi",
    question: "Theo dõi dự án để làm gì?",
    answer:
      "Bấm “Theo dõi” trên trang dự án để nhận thông báo khi dự án đăng cập nhật tiến độ, khai chi tiêu, thay đổi kế hoạch hoặc kết thúc gây quỹ, kể cả khi bạn chưa ủng hộ. Danh sách dự án đang theo dõi nằm trong “Trang của tôi”.",
    link: { href: "/dashboard", label: "Mở Trang của tôi" },
    keywords: ["theo doi", "follow", "nhan thong bao", "thong bao du an"],
  },
  {
    id: "bao-cao",
    question: "Tôi thấy một chiến dịch đáng ngờ thì làm gì?",
    answer:
      "Trên trang dự án, bấm “Báo cáo vi phạm” và chọn lý do. Báo cáo được chuyển vào hàng đợi kiểm duyệt, quản trị viên sẽ xem xét và có thể tạm dừng chiến dịch nếu cần.",
    keywords: ["bao cao vi pham", "vi pham", "lua dao", "bi lua", "dang ngo", "gian lan", "to cao", "scam"],
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
    id: "tai-khoan",
    question: "Làm sao để đăng ký tài khoản?",
    answer:
      "Bấm “Đăng nhập” và nhập email. Nếu email chưa có tài khoản, bạn chuyển sang bước tạo tài khoản với họ tên và mật khẩu; đánh dấu “người gây quỹ” nếu bạn muốn tạo chiến dịch. Bạn cũng có thể dùng nút Google khi nút này hiển thị. Sau đó mở email xác minh để kích hoạt; chưa nhận được thì vào “Trang của tôi” bấm gửi lại.",
    link: { href: "/dang-ky", label: "Tạo tài khoản" },
    keywords: [
      "dang ky", "tao tai khoan", "mo tai khoan", "lap tai khoan", "xac minh email", "email xac minh",
      "kich hoat", "google", "gmail",
    ],
  },
  {
    id: "quen-mat-khau",
    question: "Tôi quên mật khẩu hoặc không đăng nhập được?",
    answer:
      "Dùng chức năng “Quên mật khẩu” để nhận email chứa liên kết đặt lại mật khẩu. Nếu nhập sai mật khẩu 5 lần liên tiếp, tài khoản bị tạm khóa 15 phút rồi tự mở lại. Đã đăng nhập thì bạn đổi mật khẩu trong “Cài đặt tài khoản”.",
    link: { href: "/quen-mat-khau", label: "Đặt lại mật khẩu" },
    keywords: [
      "quen mat khau", "mat khau", "dat lai", "khong dang nhap duoc", "pass", "password", "doi mat khau",
      "bi khoa", "khoa tai khoan",
    ],
  },
  {
    id: "chao-hoi",
    question: "Xin chào",
    answer:
      "Chào bạn! Mình là trợ lý tự động của Góp Mầm. Bạn có thể hỏi về cách ủng hộ, thanh toán, hoàn tiền, tạo chiến dịch, hoặc chọn một câu gợi ý bên dưới.",
    hidden: true,
    keywords: ["xin chao", "chao", "hello", "hi", "alo", "chao ban", "co ai khong"],
  },
  {
    id: "cam-on",
    question: "Cảm ơn",
    answer: "Rất vui được giúp bạn! Nếu còn thắc mắc, bạn cứ hỏi tiếp nhé.",
    hidden: true,
    keywords: ["cam on", "thank", "thanks", "thank you", "ok cam on"],
  },
];

/** Câu hiện trong hàng gợi ý và danh sách "Xem tất cả" (bỏ câu xã giao). */
export const VISIBLE_FAQ_ITEMS = FAQ_ITEMS.filter((item) => !item.hidden);

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
 * khớp theo ranh giới từ để "ai" không trùng với "tai". Câu xã giao chỉ thắng khi không có câu
 * nghiệp vụ nào khớp, để "chào, cho hỏi cách ủng hộ" vẫn ra câu trả lời về ủng hộ.
 * Trả về null nếu không khớp được.
 */
export function matchFaq(input: string): FaqItem | null {
  const text = ` ${normalizeText(input)} `;
  if (text.trim().length === 0) return null;
  let best: FaqItem | null = null;
  let bestScore = 0;
  let smallTalk: FaqItem | null = null;
  for (const item of FAQ_ITEMS) {
    const score = item.keywords.reduce(
      (sum, keyword) => (text.includes(` ${keyword} `) ? sum + keyword.split(" ").length : sum),
      0,
    );
    if (score === 0) continue;
    if (item.hidden) {
      smallTalk ??= item;
    } else if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best ?? smallTalk;
}
