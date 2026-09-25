export type CampaignStatus =
  | "Đang gây quỹ"
  | "Sắp kết thúc"
  | "Mới phát hành"
  | "Đã đạt mục tiêu"
  | "Bản nháp"
  | "Chờ duyệt"
  | "Cần bổ sung"
  | "Bị từ chối"
  | "Tạm dừng"
  | "Kết thúc"
  | "Đã kết thúc";

export type Campaign = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  location: string;
  owner: string;
  verified: boolean;
  raised: number;
  target: number;
  backers: number;
  daysLeft: number;
  status: CampaignStatus;
  image: "mangrove" | "startup" | "library" | "health";
  /** Ảnh do chủ dự án cung cấp; không có thì giao diện hiển thị dạng chữ, không dùng ảnh minh họa. */
  imageUrl?: string | null;
  /** Ngày kết thúc dạng dd/mm/yyyy. */
  endDate?: string;
  aiReason: string;
  story: string[];
  transparencyScore: number;
  milestones: Array<{
    title: string;
    date: string;
    budget: number;
    status: "Hoàn thành" | "Đang thực hiện" | "Sắp tới";
  }>;
  latestUpdate: {
    date: string;
    title: string;
    excerpt: string;
  };
};

export const campaigns: Campaign[] = [
  {
    slug: "hoi-sinh-rung-ngap-man-can-gio",
    title: "Hồi sinh 10 ha rừng ngập mặn Cần Giờ",
    summary:
      "Cùng cộng đồng địa phương trồng 20.000 cây đước, phục hồi sinh cảnh và tạo sinh kế xanh bền vững.",
    category: "Môi trường",
    location: "Cần Giờ, TP.HCM",
    owner: "Nhóm Mầm Xanh",
    verified: true,
    raised: 368_500_000,
    target: 500_000_000,
    backers: 1248,
    daysLeft: 18,
    status: "Đang gây quỹ",
    image: "mangrove",
    aiReason: "Phù hợp với chủ đề môi trường bạn quan tâm",
    story: [
      "Rừng ngập mặn là vành đai tự nhiên bảo vệ bờ biển, lưu trữ carbon và là nơi sinh sống của nhiều loài bản địa. Sau các đợt xói lở, một phần khu vực trồng thử nghiệm tại Cần Giờ cần được phục hồi bằng cây giống khỏe và quy trình chăm sóc dài hạn.",
      "Nguồn quỹ được dùng cho cây giống, dụng cụ, tập huấn và theo dõi tỷ lệ sống trong 12 tháng. Người dân địa phương trực tiếp tham gia khảo sát, trồng và chăm sóc; mỗi mốc đều có ảnh định vị và báo cáo chi tiêu công khai.",
    ],
    transparencyScore: 96,
    milestones: [
      {
        title: "Khảo sát đất và chọn vùng trồng",
        date: "15/09/2026",
        budget: 45_000_000,
        status: "Hoàn thành",
      },
      {
        title: "Ươm và vận chuyển 20.000 cây giống",
        date: "30/10/2026",
        budget: 190_000_000,
        status: "Đang thực hiện",
      },
      {
        title: "Trồng, gắn mã lô và theo dõi 12 tháng",
        date: "30/11/2027",
        budget: 265_000_000,
        status: "Sắp tới",
      },
    ],
    latestUpdate: {
      date: "06/09/2026",
      title: "Đã hoàn thành khảo sát 4 khu vực ưu tiên",
      excerpt:
        "Đội dự án và đại diện địa phương đã xác nhận độ mặn, nền bùn và tuyến vận chuyển cây giống.",
    },
  },
  {
    slug: "xuong-may-tui-coi-cho-phu-nu",
    title: "Xưởng túi cói tạo sinh kế cho phụ nữ ven biển",
    summary:
      "Trang bị máy móc và đào tạo thiết kế để 30 phụ nữ địa phương có thêm thu nhập ổn định từ vật liệu bản địa.",
    category: "Khởi nghiệp",
    location: "Nga Sơn, Thanh Hóa",
    owner: "Cói Mộc Social Enterprise",
    verified: true,
    raised: 214_000_000,
    target: 300_000_000,
    backers: 642,
    daysLeft: 27,
    status: "Mới phát hành",
    image: "startup",
    aiReason: "Được cộng đồng khởi nghiệp xã hội đánh giá cao",
    story: [
      "Cói Mộc kết nối kỹ thuật đan truyền thống với thiết kế hiện đại để đưa sản phẩm thủ công vào chuỗi bán lẻ có trách nhiệm.",
      "Chiến dịch tài trợ một máy ép, hai máy may công nghiệp và sáu khóa đào tạo, đồng thời dành ngân sách kiểm định chất lượng đầu ra.",
    ],
    transparencyScore: 92,
    milestones: [
      {
        title: "Hoàn thiện bộ mẫu đầu tiên",
        date: "20/10/2026",
        budget: 55_000_000,
        status: "Đang thực hiện",
      },
      {
        title: "Lắp đặt thiết bị xưởng",
        date: "15/12/2026",
        budget: 145_000_000,
        status: "Sắp tới",
      },
      {
        title: "Đào tạo và vận hành thử",
        date: "28/02/2027",
        budget: 100_000_000,
        status: "Sắp tới",
      },
    ],
    latestUpdate: {
      date: "03/09/2026",
      title: "Bộ mẫu thử đã qua vòng góp ý đầu tiên",
      excerpt: "12 mẫu túi mới đang được điều chỉnh để giảm hao hụt nguyên liệu.",
    },
  },
  {
    slug: "thu-vien-nho-tren-non",
    title: "Thư viện nhỏ trên non cho 420 em học sinh",
    summary:
      "Cải tạo phòng đọc, bổ sung 3.000 đầu sách song ngữ và tổ chức câu lạc bộ đọc sách mỗi tuần.",
    category: "Giáo dục",
    location: "Mù Cang Chải, Yên Bái",
    owner: "Dự án Trang Sách Mở",
    verified: true,
    raised: 181_200_000,
    target: 200_000_000,
    backers: 958,
    daysLeft: 5,
    status: "Sắp kết thúc",
    image: "library",
    aiReason: "Sắp đạt mục tiêu và chỉ còn 5 ngày",
    story: [
      "Điểm trường đã có phòng trống nhưng thiếu kệ, ánh sáng và sách phù hợp với nhiều độ tuổi. Giáo viên mong muốn biến căn phòng thành không gian đọc mở sau giờ học.",
      "Mỗi khoản mua sách và thiết bị sẽ được đối chiếu bằng hóa đơn. Danh mục đầu sách được giáo viên và phụ huynh cùng duyệt trước khi đặt mua.",
    ],
    transparencyScore: 98,
    milestones: [
      {
        title: "Khảo sát nhu cầu đọc",
        date: "01/09/2026",
        budget: 8_000_000,
        status: "Hoàn thành",
      },
      {
        title: "Cải tạo phòng và đóng kệ",
        date: "01/11/2026",
        budget: 72_000_000,
        status: "Đang thực hiện",
      },
      {
        title: "Bổ sung sách và vận hành câu lạc bộ",
        date: "15/12/2026",
        budget: 120_000_000,
        status: "Sắp tới",
      },
    ],
    latestUpdate: {
      date: "08/09/2026",
      title: "Phụ huynh cùng chọn danh mục sách đầu tiên",
      excerpt: "Danh sách 1.250 cuốn đầu tiên đã được thống nhất và công khai.",
    },
  },
  {
    slug: "chuyen-xe-kham-benh-vung-cao",
    title: "Chuyến xe khám bệnh miễn phí đến vùng cao",
    summary:
      "Đưa đội ngũ y tế và thuốc thiết yếu đến 6 xã xa trung tâm, ưu tiên người cao tuổi và trẻ em.",
    category: "Y tế",
    location: "Đồng Văn, Hà Giang",
    owner: "Bác sĩ Đồng Hành",
    verified: true,
    raised: 450_000_000,
    target: 450_000_000,
    backers: 1503,
    daysLeft: 0,
    status: "Đã đạt mục tiêu",
    image: "health",
    aiReason: "Chiến dịch y tế có hồ sơ minh bạch nổi bật",
    story: [
      "Sáu xã trong lịch trình cách cơ sở y tế tuyến huyện nhiều giờ di chuyển. Đợt khám tập trung vào sàng lọc bệnh nền và tư vấn chăm sóc sức khỏe ban đầu.",
      "Đội dự án phối hợp với y tế địa phương, chỉ mua thuốc theo danh mục được phê duyệt và công khai số lượt khám sau từng điểm đến.",
    ],
    transparencyScore: 97,
    milestones: [
      {
        title: "Lập danh sách và chuẩn bị vật tư",
        date: "25/09/2026",
        budget: 135_000_000,
        status: "Đang thực hiện",
      },
      {
        title: "Khám lưu động tại 6 xã",
        date: "20/11/2026",
        budget: 245_000_000,
        status: "Sắp tới",
      },
      {
        title: "Theo dõi và công bố báo cáo",
        date: "15/12/2026",
        budget: 70_000_000,
        status: "Sắp tới",
      },
    ],
    latestUpdate: {
      date: "01/09/2026",
      title: "Chiến dịch đã đạt 100% mục tiêu",
      excerpt: "Đội dự án đang hoàn tất đối soát trước khi mua vật tư y tế.",
    },
  },
  {
    slug: "nuoc-sach-cho-diem-truong",
    title: "Nước sạch và bồn rửa tay cho 8 điểm trường",
    summary:
      "Lắp bộ lọc nước, bồn chứa và trạm rửa tay bền vững cho các lớp học vùng khó khăn.",
    category: "Giáo dục",
    location: "Nam Trà My, Quảng Nam",
    owner: "Nước Sạch Học Đường",
    verified: true,
    raised: 126_000_000,
    target: 240_000_000,
    backers: 391,
    daysLeft: 32,
    status: "Đang gây quỹ",
    image: "health",
    aiReason: "Tương tự các dự án bạn từng theo dõi",
    story: [
      "Mùa khô kéo dài làm nguồn nước tại nhiều điểm trường không ổn định. Giải pháp lọc chậm và bồn trữ phù hợp với điều kiện vận hành tại chỗ.",
    ],
    transparencyScore: 90,
    milestones: [
      {
        title: "Kiểm nghiệm nguồn nước",
        date: "10/10/2026",
        budget: 20_000_000,
        status: "Đang thực hiện",
      },
      {
        title: "Lắp đặt 8 cụm thiết bị",
        date: "10/01/2027",
        budget: 220_000_000,
        status: "Sắp tới",
      },
    ],
    latestUpdate: {
      date: "04/09/2026",
      title: "Đã lấy mẫu nước tại 3 điểm đầu tiên",
      excerpt: "Mẫu đang được kiểm tra để chốt cấu hình bộ lọc phù hợp.",
    },
  },
  {
    slug: "hat-giong-ban-dia",
    title: "Ngân hàng hạt giống bản địa cho nông hộ trẻ",
    summary:
      "Bảo tồn giống rau truyền thống và giúp 50 nông hộ trẻ thử nghiệm mô hình canh tác thích ứng khí hậu.",
    category: "Khởi nghiệp",
    location: "Đà Lạt, Lâm Đồng",
    owner: "Hợp tác xã Vườn Nhà",
    verified: true,
    raised: 289_000_000,
    target: 380_000_000,
    backers: 726,
    daysLeft: 14,
    status: "Đang gây quỹ",
    image: "startup",
    aiReason: "Có tác động môi trường và sinh kế cùng lúc",
    story: [
      "Nhiều giống rau bản địa có khả năng chống chịu tốt nhưng đang dần ít được sử dụng. Dự án lưu trữ, kiểm tra nảy mầm và chia sẻ lại hạt giống cho nông hộ trẻ.",
    ],
    transparencyScore: 94,
    milestones: [
      {
        title: "Thu thập và phân loại 40 giống",
        date: "30/11/2026",
        budget: 90_000_000,
        status: "Đang thực hiện",
      },
      {
        title: "Thử nghiệm cùng 50 nông hộ",
        date: "30/05/2027",
        budget: 290_000_000,
        status: "Sắp tới",
      },
    ],
    latestUpdate: {
      date: "02/09/2026",
      title: "14 giống đầu tiên đã được kiểm tra nảy mầm",
      excerpt: "Kết quả và biên bản mẫu đã được đăng trong mục minh chứng.",
    },
  },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

export function campaignProgress(campaign: Campaign): number {
  return Math.min(100, Math.round((campaign.raised / campaign.target) * 100));
}

export function findCampaign(slug: string): Campaign | undefined {
  return campaigns.find((campaign) => campaign.slug === slug);
}
