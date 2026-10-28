import type { Metadata } from "next";

import { PageBanner } from "@/components/layout/PageBanner";

export const metadata: Metadata = {
  title: "Nguồn ảnh",
  description: "Tác giả và giấy phép của các ảnh minh họa dùng trên Góp Mầm.",
  alternates: { canonical: "/nguon-anh" },
};

type Credit = {
  file: string;
  usage: string;
  author: string;
  source: string;
  license: string;
  licenseUrl?: string;
};

/** Ảnh chụp tại Việt Nam, lấy từ Wikimedia Commons; giấy phép CC BY/CC BY-SA yêu cầu ghi tác giả và giấy phép. */
const CREDITS: Credit[] = [
  {
    file: "cover-mangrove.webp",
    usage: "Trang chủ, đăng nhập, lĩnh vực Môi trường",
    author: "Tdthanh.imer",
    source: "https://commons.wikimedia.org/wiki/File:Rung_ngap_man.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "cover-startup.webp",
    usage: "Trang chủ, đăng ký, lĩnh vực Khởi nghiệp",
    author: "Ann0611",
    source: "https://commons.wikimedia.org/wiki/File:Toong_Coworking_Space_in_Hanoi.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "cover-library.webp",
    usage: "Danh sách dự án, lĩnh vực Giáo dục",
    author: "USAID Vietnam",
    source:
      "https://commons.wikimedia.org/wiki/File:USAID_supports_deworming_medication_for_school_children_in_Bat_Xat_district_of_Lao_Cai_province_(14240589733).jpg",
    license: "Public domain",
  },
  {
    file: "cover-health.webp",
    usage: "Trang chủ, lĩnh vực Y tế",
    author: "Stephen M. Votaw / U.S. Navy",
    source:
      "https://commons.wikimedia.org/wiki/File:Flickr_-_Official_U.S._Navy_Imagery_-_A_doctor_checks_the_eyesight_of_a_Vietnamese_child..jpg",
    license: "Public domain",
  },
  {
    file: "cover-beach.webp",
    usage: "Lĩnh vực Môi trường; chủ đề dọn rác, tái chế, phân loại rác",
    author: "USAID Vietnam",
    source:
      "https://commons.wikimedia.org/wiki/File:Beach_Clean-up_Day_in_Ha_Long_Bay_(32141235961).jpg",
    license: "Public domain",
  },
  {
    file: "cover-farm.webp",
    usage: "Lĩnh vực Nông nghiệp",
    author: "Benjamin Smith",
    source: "https://commons.wikimedia.org/wiki/File:H%E1%BA%A1_Th%C3%A0nh,_H%C3%A0_Giang,_Vietnam_-_5.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "cover-highland.webp",
    usage: "Lĩnh vực Nông nghiệp",
    author: "Benjamin Smith",
    source: "https://commons.wikimedia.org/wiki/File:%C4%90%E1%BB%93ng_V%C4%83n,_Vietnam_-_7.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "cover-market.webp",
    usage: "Lĩnh vực Khởi nghiệp",
    author: "Truth'soutthere",
    source: "https://commons.wikimedia.org/wiki/File:B%E1%BA%AFc_H%C3%A0_Sunday_market,_Vietnam_-_20131027-02.JPG",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    file: "cover-computer.webp",
    usage: "Lĩnh vực Công nghệ",
    author: "AHS",
    source: "https://commons.wikimedia.org/wiki/File:Co_so_vat_chat_IAS.JPG",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "cover-robot.webp",
    usage: "Chủ đề robot, STEM",
    author: "Lưu Ly",
    source: "https://commons.wikimedia.org/wiki/File:Robocom_Vietnam_2.jpg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
  {
    file: "cover-reading.webp",
    usage: "Lĩnh vực Giáo dục",
    author: "AHS",
    source: "https://commons.wikimedia.org/wiki/File:HOC_SINH_IPS.JPG",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "cover-clinic.webp",
    usage: "Lĩnh vực Y tế",
    author: "Bryan M. Ilyankoff / U.S. Navy",
    source:
      "https://commons.wikimedia.org/wiki/File:US_Navy_070720-N-4954I-033_Volunteer_doctor_Capt._Yehudi_Yeo,_with_the_Singapore_navy,_listens_to_a_Vietnamese_patient%27s_breathing_pattern_at_the_Man_Thai_Ward_Medical_Station.jpg",
    license: "Public domain",
  },
  {
    file: "cover-music.webp",
    usage: "Lĩnh vực Văn hóa nghệ thuật",
    author: "Ba Be National Park",
    source: "https://commons.wikimedia.org/wiki/File:Then_Singing.JPG",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    file: "cover-lantern.webp",
    usage: "Lĩnh vực Văn hóa nghệ thuật",
    author: "Isabell Schulz",
    source: "https://commons.wikimedia.org/wiki/File:Making_lanterns_in_Hoi_An_(45693469494).jpg",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
  },  {
    file: "cover-solar.webp",
    usage: "Chủ đề năng lượng mặt trời",
    author: "USAID Vietnam",
    source:
      "https://commons.wikimedia.org/wiki/File:USAID_Facilitates_Private_Sector_Investment_in_Solar_Energy_(23877194678).jpg",
    license: "Public domain",
  },
  {
    file: "cover-swim.webp",
    usage: "Chủ đề học bơi, phòng đuối nước",
    author: "AusAID / Department of Foreign Affairs and Trade",
    source:
      "https://commons.wikimedia.org/wiki/File:Australian-funded_Learn_to_Swim_Program_will_save_lives._Vietnam_2009._Photo-_AusAID_(10676177076).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  {
    file: "cover-coffee.webp",
    usage: "Chủ đề cà phê",
    author: "Tycho",
    source: "https://commons.wikimedia.org/wiki/File:Coffee_blossom.JPG",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    file: "cover-bees.webp",
    usage: "Chủ đề nuôi ong",
    author: "Tuyencabr",
    source:
      "https://commons.wikimedia.org/wiki/File:Nu%C3%B4i_ong_m%E1%BA%ADt_t%E1%BA%A1i_Tr%C3%A2n_Ch%C3%A2u_C%C3%A1t_B%C3%A0.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "cover-meal.webp",
    usage: "Chủ đề bếp ăn, bữa trưa bán trú",
    author: "Jon Wick",
    source: "https://commons.wikimedia.org/wiki/File:Recess.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  {
    file: "cover-vegetable.webp",
    usage: "Chủ đề trồng rau sạch",
    author: "Dinkum",
    source: "https://commons.wikimedia.org/wiki/File:Peasant_in_the_vegetable_garden.JPG",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  {
    file: "cover-seedling.webp",
    usage: "Chủ đề thủy canh, nhà kính",
    author: "Phương Huy",
    source:
      "https://commons.wikimedia.org/wiki/File:%C4%90%C3%A0_L%E1%BA%A1t_n%C4%83m_2018,_tr%E1%BB%93ng_rau_trong_nh%C3%A0_k%C3%ADnh_(gi%C3%A0n_rau_th%E1%BB%A7y_canh)_(1).jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "cover-graduate.webp",
    usage: "Chủ đề học bổng, sinh viên",
    author: "CRS / USAID Vietnam",
    source:
      "https://commons.wikimedia.org/wiki/File:Dong_A_University_IT_Program_for_Students_with_Disabilities.jpg",
    license: "Public domain",
  },
  {
    file: "cover-water.webp",
    usage: "Chủ đề nước sạch, giếng nước",
    author: "Tttrung",
    source:
      "https://commons.wikimedia.org/wiki/File:Gi%E1%BA%BFng_n%C6%B0%E1%BB%9Bc_%C4%91%C3%A1_ong.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "cover-bridge.webp",
    usage: "Chủ đề cầu dân sinh",
    author: "Kelcey Kinjo",
    source: "https://commons.wikimedia.org/wiki/File:Cau_khi_My_Tho.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
];

export default function ImageCreditsPage() {
  return (
    <main>
      <PageBanner title="Nguồn ảnh" crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Nguồn ảnh" }]}>
        <p className="page-banner-lead">
          Ảnh minh họa theo lĩnh vực và chủ đề, không phải ảnh thật của từng dự án. Ảnh đã được cắt và nén lại để hiển thị trên web.
        </p>
      </PageBanner>
      <div className="container block-tight">
        <ul className="credit-list">
          {CREDITS.map((credit) => (
            <li key={credit.file}>
              <strong>{credit.file}</strong> — {credit.usage}.
              <br />
              Tác giả: {credit.author} · <a href={credit.source} target="_blank" rel="noopener noreferrer">Nguồn Wikimedia Commons</a> · Giấy phép:{" "}
              {credit.licenseUrl ? (
                <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">{credit.license}</a>
              ) : (
                credit.license
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
