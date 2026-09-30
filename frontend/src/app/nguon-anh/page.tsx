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

/** Ảnh lấy từ Wikimedia Commons; giấy phép CC BY-SA yêu cầu ghi tác giả và giấy phép. */
const CREDITS: Credit[] = [
  {
    file: "cover-mangrove.webp",
    usage: "Trang chủ, đăng nhập, lĩnh vực Môi trường",
    author: "KUASACSR",
    source: "https://commons.wikimedia.org/wiki/File:Mangrove_Planting_Restoration_Project_in_Changkat_Keruing.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "cover-startup.webp",
    usage: "Đăng ký, tạo chiến dịch, lĩnh vực Khởi nghiệp",
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
];

export default function ImageCreditsPage() {
  return (
    <main>
      <PageBanner title="Nguồn ảnh" crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Nguồn ảnh" }]}>
        <p className="page-banner-lead">
          Ảnh minh họa theo lĩnh vực, không phải ảnh của từng dự án. Ảnh đã được cắt và nén lại để hiển thị trên web.
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
