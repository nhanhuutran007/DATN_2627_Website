"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  fetchAiPrediction,
  isAiPredictAvailable,
  trackBehaviorEvent,
  type AiPredictData,
} from "@/lib/api/ai";

type AiPredictCardProps = {
  campaignId: string;
};

export function AiPredictCard({ campaignId }: AiPredictCardProps) {
  const [prediction, setPrediction] = useState<AiPredictData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    trackBehaviorEvent(campaignId, "view");
    fetchAiPrediction(campaignId)
      .then((result) => {
        if (cancelled) return;
        if (isAiPredictAvailable(result)) {
          setPrediction(result.data);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (!loading && !prediction) return null;

  const likely = prediction?.prediction === "LIKELY";
  const percent = prediction ? Math.round(prediction.probability * 100) : 0;
  const factors = (prediction?.factors ?? []).slice(0, 3);

  return (
    <div className="ai-predict-card">
      <div className="ai-predict-head">
        <span className="ai-predict-icon"><Icon name="sparkles" size={17} /></span>
        <div>
          <p className="eyebrow">Đánh giá của AI</p>
          <h2>Khả năng đạt mục tiêu</h2>
        </div>
      </div>
      {prediction ? (
        <>
          <div className="ai-predict-gauge">
            <strong>{percent}%</strong>
            <span>{likely ? "Triển vọng tốt" : "Cần cân nhắc kỹ"}</span>
          </div>
          {factors.length > 0 && (
            <ul className="ai-predict-factors">
              {factors.map((factor) => (
                <li key={factor.feature}>
                  <span>{factor.label}</span>
                  <b className={factor.direction === "UP" ? "up" : "down"}>
                    {factor.direction === "UP" ? "↑ Thuận lợi" : "↓ Rủi ro"}
                  </b>
                </li>
              ))}
            </ul>
          )}
          <p className="ai-predict-note">
            Dự đoán mang tính tham khảo, dựa trên hồ sơ và hiệu suất chiến dịch (
            {prediction.model ?? "phân tích dữ liệu"}).
          </p>
        </>
      ) : (
        <p className="ai-predict-note">AI đang phân tích hồ sơ chiến dịch…</p>
      )}
    </div>
  );
}