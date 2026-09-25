"use client";

import { useEffect, useState } from "react";

import {
  fetchAiPrediction,
  isAiPredictAvailable,
  trackBehaviorEvent,
  type AiPredictData,
} from "@/lib/api/ai";

type AiPredictCardProps = {
  campaignId: string;
};

/** Ước lượng khả năng đạt mục tiêu từ mô hình — luôn ghi rõ là tham khảo, kèm các yếu tố ảnh hưởng. */
export function AiPredictCard({ campaignId }: AiPredictCardProps) {
  const [prediction, setPrediction] = useState<AiPredictData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    trackBehaviorEvent(campaignId, "view");
    fetchAiPrediction(campaignId)
      .then((result) => {
        if (!cancelled && isAiPredictAvailable(result)) setPrediction(result.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (!loading && !prediction) return null;

  return (
    <section className="side-block model-note" aria-labelledby="model-note-title">
      <h2 className="side-title" id="model-note-title">Ước lượng của mô hình</h2>
      {prediction ? (
        <>
          <p className="model-figure">
            <span className="num">{Math.round(prediction.probability * 100)}%</span>
            <span>khả năng đạt mục tiêu</span>
          </p>
          {prediction.factors.length > 0 && (
            <ul className="model-factors">
              {prediction.factors.slice(0, 4).map((factor) => (
                <li key={factor.feature}>
                  <span>{factor.label}</span>
                  <span className={factor.direction === "UP" ? "up" : "down"}>
                    {factor.direction === "UP" ? "tăng khả năng" : "giảm khả năng"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="fineprint">
            Chỉ để tham khảo, không ảnh hưởng tới việc duyệt hay nhận tiền. Mô hình {prediction.model ?? "dự đoán"}
            {" "}được huấn luyện trên dữ liệu mô phỏng.
          </p>
        </>
      ) : (
        <p className="empty-line">Đang tính…</p>
      )}
    </section>
  );
}
