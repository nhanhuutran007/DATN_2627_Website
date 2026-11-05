"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { fetchCampaignPrediction, type AiFactor, type AiPredictData } from "@/lib/api/ai";

/** Gợi ý hành động cho chủ dự án ứng với yếu tố đang kéo khả năng thành công xuống. */
const IMPROVEMENT_TIPS: Record<string, string> = {
  goal_amount: "Cân nhắc mục tiêu vừa sức, hoặc chia thành nhiều giai đoạn.",
  duration_days: "Rút ngắn thời gian kêu gọi: khoảng 30 ngày thường hiệu quả hơn 60 ngày.",
  profile_score: "Hoàn thiện hồ sơ cá nhân: ảnh đại diện, giới thiệu, thông tin liên hệ.",
  content_length: "Bổ sung mô tả chi tiết: vấn đề, giải pháp, đội ngũ, cách dùng tiền.",
  story_word_count: "Kể câu chuyện cụ thể hơn về người hưởng lợi và tác động.",
  image_count: "Thêm ảnh thực tế về dự án và đội ngũ.",
  has_video: "Thêm video giới thiệu ngắn.",
  has_budget_report: "Lập kế hoạch ngân sách theo từng mốc.",
  owner_credential_approved: "Xác minh email và thông tin tài khoản.",
  early_views: "Chia sẻ chiến dịch tới cộng đồng để tăng lượt xem ban đầu.",
  early_backers: "Mời người quen ủng hộ sớm để tạo đà.",
  name_words: "Đặt tên chiến dịch rõ ràng: nói được gây quỹ cho ai và để làm gì.",
  launch_month: "Cân nhắc dời tháng bắt đầu: theo dữ liệu tham khảo, thời điểm này kém thuận lợi hơn trung bình.",
  launch_weekday: "Cân nhắc đổi ngày bắt đầu trong tuần: ngày đã chọn kém thuận lợi hơn trung bình.",
};

/** Tên ngắn của đặc trưng mô hình dùng, để ghi chú "chỉ dựa trên …" khớp đúng mô hình đang chạy. */
const FEATURE_SHORT_NAMES: Record<string, string> = {
  category_id: "lĩnh vực",
  goal_amount: "mục tiêu",
  duration_days: "thời gian kêu gọi",
  name_words: "độ dài tên",
  launch_month: "tháng bắt đầu",
  launch_weekday: "ngày bắt đầu trong tuần",
};

/** "lĩnh vực, mục tiêu và thời gian kêu gọi" — lấy từ `metrics.features` của mô hình đang chạy. */
export function modelFeatureSummary(metrics: AiPredictData["metrics"]): string {
  const raw = metrics?.features;
  const names = (Array.isArray(raw) ? raw : ["category_id", "goal_amount", "duration_days"])
    .filter((name): name is string => typeof name === "string")
    .map((name) => FEATURE_SHORT_NAMES[name] ?? name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} và ${names[names.length - 1]}`;
}

/** Tỷ lệ dự án đạt mục tiêu trong dữ liệu huấn luyện khi metrics không gửi kèm (Kickstarter ≈ 40%). */
const DEFAULT_BASE_RATE = 0.4;

type RelativeLevel = { label: string; tone: "good" | "neutral" | "low" };

/** Tỷ lệ nền thật của dữ liệu huấn luyện (`metrics.dataset.success_rate`), nếu dịch vụ AI gửi kèm. */
export function baseSuccessRate(metrics: AiPredictData["metrics"]): number {
  const dataset = metrics?.dataset;
  const rate =
    dataset && typeof dataset === "object" ? (dataset as Record<string, unknown>).success_rate : undefined;
  return typeof rate === "number" && rate >= 0.05 && rate <= 0.95 ? rate : DEFAULT_BASE_RATE;
}

/**
 * So xác suất với mặt bằng chung thay vì đọc như "đậu/rớt": dữ liệu huấn luyện chỉ ~40% dự án
 * đạt mục tiêu và mô hình 3 đặc trưng ít khi cho số cực cao, nên 50% đã là khá tốt.
 */
export function relativeLevel(probability: number, baseRate: number): RelativeLevel {
  const diff = probability - baseRate;
  if (diff >= 0.15) return { label: "Thuộc nhóm tốt", tone: "good" };
  if (diff >= 0.05) return { label: "Cao hơn mặt bằng", tone: "good" };
  if (diff > -0.05) return { label: "Ngang mặt bằng", tone: "neutral" };
  return { label: "Thấp hơn mặt bằng", tone: "low" };
}

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
  const base = baseSuccessRate(data.metrics);
  const level = relativeLevel(data.probability, base);

  return (
    <>
      {data.fallback && (
        <p className="hint" role="note">
          Mô hình học máy tạm không khả dụng. Đây là ước lượng sơ bộ theo công thức kinh nghiệm.
        </p>
      )}
      <p className="model-figure">
        <span className="num">{Math.round(data.probability * 100)}%</span>
        <span>khả năng đạt mục tiêu</span>
      </p>
      <p className="prediction-level">
        <span className={`prediction-level-tag is-${level.tone}`}>{level.label}</span>
        <span>Mặt bằng chung: khoảng {Math.round(base * 100)}% dự án đạt mục tiêu</span>
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
        {" "}
        {data.fallback
          ? "Công thức kinh nghiệm xuất phát từ tỷ lệ thành công chung, không phải kết quả học máy."
          : `Mô hình ${data.model ?? "dự đoán"} học từ dữ liệu gây quỹ thực tế (Kickstarter), chỉ dựa trên ${modelFeatureSummary(data.metrics)}.`}
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
