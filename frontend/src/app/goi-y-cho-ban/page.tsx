import type { Metadata } from "next";

import { RecommendationsPage } from "@/features/recommendations/RecommendationsPage";

export const metadata: Metadata = {
  title: "Gợi ý cho bạn",
  robots: { index: false },
};

export default function RecommendationsRoute() {
  return <RecommendationsPage />;
}
