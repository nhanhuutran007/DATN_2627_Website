"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { fetchCampaignPrediction, type AiFactor, type AiPredictData } from "@/lib/api/ai";

/** Gợi ý hành động cho chủ dự án ứng với yếu tố đang kéo khả năng thành công xuống. */
const IMPROVEMENT_TIPS: Record<string, string> = {
  goal_amount: "Cân nhắc mục tiêu vừa sức, hoặc chia thành nhiều giai đoạn.",
  duration_days: "Chọn thời gian kêu gọi hợp lý (thường 30–60 ngày).",
  profile_score: "Hoàn thiện hồ sơ cá nhân: ảnh đại diện, giới thiệu, thông tin liên hệ.",
  content_length: "Bổ sung mô tả chi tiết: vấn đề, giải pháp, đội ngũ, cách dùng tiền.",
  story_word_count: "Kể câu chuyện cụ thể hơn về người hưởng lợi và tác động.",
  image_count: "Thêm ảnh thực tế về dự án và đội ngũ.",
  has_video: "Thêm video giới thiệu ngắn.",
  has_budget_report: "Lập kế hoạch ngân sách theo từng mốc.",
  owner_credential_approved: "Xác minh email và thông tin tài khoản.",
  early_views: "Chia sẻ chiến dịch tới cộng đồng để tăng lượt xem ban đầu.",
  early_backers: "Mời người quen ủng hộ sớm để tạo đà.",
};

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AiPredictData };

type CampaignPredictionCardProps = {
  campaignId: string;
  /** `owner`: kèm gợi ý cải thiện; `admin`: bản gọn cho hàng đợi xét duyệt. */
  variant: "owner" | "admin";
};

/**
 * Ước lượng khả năng đạt mục tiêu từ mô hình — chỉ hiển thị cho chủ dự án/admin,
 * luôn ghi rõ là tham khảo, không dùng làm căn cứ duyệt hay nhận tiền.
 */
export function CampaignPredictionCard({ campaignId, variant }: CampaignPredictionCardProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchCampaignPrediction(campaignId)
      .then((result) => {
        if (!active) return;
        setState(result.available ? { status: "ready", data: result.data } : { status: "unavailable" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof ApiError ? error.message : "Không tải được ước lượng.",
        });
      });
    return () => {
      active = false;
    };
  }, [campaignId, requestKey]);

  const retry = () => {
    setState({ status: "loading" });
    setRequestKey((key) => key + 1);
  };

  return (
    <section className={`prediction-card prediction-${variant}`} aria-label="Ước lượng của mô hình">
      <div className="prediction-head">
        <h3>Ước lượng của mô hình</h3>
        <span className="tag">Chỉ tham khảo</span>
      </div>

      {state.status === "loading" && <p className="hint" role="status">Đang tính…</p>}
      {state.status === "unavailable" && (
        <p className="hint">
          Dịch vụ dự đoán tạm thời gián đoạn.{" "}
          <button className="link-inline" type="button" onClick={retry}>Thử lại</button>
        </p>
      )}
      {state.status === "error" && (
        <p className="form-error" role="alert">
          {state.message}{" "}
          <button className="link-inline" type="button" onClick={retry}>Thử lại</button>
        </p>
      )}
      {state.status === "ready" && <PredictionBody data={state.data} variant={variant} />}
    </section>
  );
}

function PredictionBody({ data, variant }: { data: AiPredictData; variant: "owner" | "admin" }) {
  const factors = data.factors.slice(0, variant === "admin" ? 3 : 5);
  const tips = variant === "owner" ? improvementTips(data.factors) : [];

  return (
    <>
      <p className="model-figure">
        <span className="num">{Math.round(data.probability * 100)}%</span>
        <span>khả năng đạt mục tiêu</span>
      </p>
      {factors.length > 0 && (
        <ul className="model-factors">
          {factors.map((factor) => (
            <li key={factor.feature}>
              <span>{factor.label}</span>
              <span className={factor.direction === "UP" ? "up" : "down"}>
                {factor.direction === "UP" ? "tăng khả năng" : "giảm khả năng"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {tips.length > 0 && (
        <div className="prediction-tips">
          <h4>Có thể cải thiện</h4>
          <ul>
            {tips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </div>
      )}
      <p className="fineprint">
        {variant === "admin"
          ? "Không dùng làm căn cứ duyệt hay từ chối — quyết định thuộc về quản trị viên."
          : "Chỉ bạn và quản trị viên thấy ước lượng này; nó không ảnh hưởng tới việc duyệt hay nhận tiền."}
        {" "}Mô hình {data.model ?? "dự đoán"} huấn luyện trên dữ liệu mô phỏng.
      </p>
    </>
  );
}

function improvementTips(factors: AiFactor[]): string[] {
  return factors
    .filter((factor) => factor.direction === "DOWN")
    .map((factor) => IMPROVEMENT_TIPS[factor.feature])
    .filter((tip): tip is string => Boolean(tip))
    .slice(0, 4);
}
