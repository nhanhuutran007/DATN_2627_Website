"use client";

import { useEffect, useState } from "react";

import { fetchGoalEstimate, type AiGoalEstimate, type AiSuggestionBasis } from "@/lib/api/ai";
import { formatVnd, formatVndShort } from "@/lib/format";
import { baseSuccessRate, relativeLevel } from "@/features/campaign-stats/CampaignPredictionCard";

/** Khoảng mục tiêu gợi ý lấy từ đâu. */
const GOAL_BASIS_TEXT: Record<AiSuggestionBasis, (category: string) => string> = {
  category: (category) => `Theo số tiền các dự án ${category} đã đạt mục tiêu trên Góp Mầm thực sự gọi được.`,
  platform: () =>
    "Chưa đủ dự án cùng lĩnh vực đã kết thúc, nên lấy theo số tiền các dự án đã đạt mục tiêu trên toàn Góp Mầm.",
  model: () => "Theo mô hình học từ dữ liệu gây quỹ Kickstarter, vì Góp Mầm chưa đủ dự án đã đạt mục tiêu.",
};

/** Chờ người dùng ngừng gõ rồi mới hỏi AI. */
const DEBOUNCE_MS = 600;

type GoalEstimatePanelProps = {
  category: string;
  /** 0 = chưa nhập mục tiêu. */
  goalAmount: number;
  /** yyyy-mm-dd, rỗng khi chưa chọn. */
  deadline: string;
  title: string;
  onUseGoal: (amount: number) => void;
  onUseDuration: (days: number) => void;
};

type State =
  | { status: "idle" }
  | { status: "loading"; previous: AiGoalEstimate | null }
  | { status: "unavailable" }
  | { status: "ready"; data: AiGoalEstimate };

/**
 * Gợi ý mục tiêu và thời hạn hợp lý ở bước "Đặt mục tiêu", do AI học từ các dự án Góp Mầm đã kết
 * thúc (kết hợp mô hình học từ dữ liệu Kickstarter khi Góp Mầm còn ít dữ liệu). Chỉ tham khảo.
 */
export function GoalEstimatePanel({ category, goalAmount, deadline, title, onUseGoal, onUseDuration }: GoalEstimatePanelProps) {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    if (!category) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState((current) => ({ status: "loading", previous: current.status === "ready" ? current.data : null }));
      const endDate = deadline ? new Date(`${deadline}T23:59:59`) : null;
      fetchGoalEstimate(
        {
          category,
          ...(goalAmount > 0 ? { goalAmount } : {}),
          ...(endDate && !Number.isNaN(endDate.getTime()) ? { endDate: endDate.toISOString() } : {}),
          ...(title.trim() ? { title: title.trim() } : {}),
        },
        controller.signal,
      )
        .then((result) => setState(result.available ? { status: "ready", data: result.data } : { status: "unavailable" }))
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: "unavailable" });
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [category, goalAmount, deadline, title]);

  if (!category || state.status === "idle") return null;
  const data = state.status === "ready" ? state.data : state.status === "loading" ? state.previous : null;

  return (
    <section className="goal-estimate" aria-label="Gợi ý mục tiêu từ AI" aria-busy={state.status === "loading"}>
      <div className="goal-estimate-head">
        <h3>Gợi ý từ AI</h3>
        <span className="tag">Chỉ tham khảo</span>
        {state.status === "loading" && <span className="hint goal-estimate-status" role="status">Đang phân tích…</span>}
      </div>

      {state.status === "unavailable" && <p className="hint">Dịch vụ gợi ý tạm thời gián đoạn. Bạn vẫn tạo chiến dịch bình thường.</p>}
      {!data && state.status === "loading" && <p className="hint">Đang phân tích các dự án tương tự…</p>}
      {data && <EstimateBody data={data} category={category} goalAmount={goalAmount} onUseGoal={onUseGoal} onUseDuration={onUseDuration} />}
    </section>
  );
}

function EstimateBody({
  data,
  category,
  goalAmount,
  onUseGoal,
  onUseDuration,
}: {
  data: AiGoalEstimate;
  category: string;
  goalAmount: number;
  onUseGoal: (amount: number) => void;
  onUseDuration: (days: number) => void;
}) {
  const { goal, duration, current } = data;
  const base = baseSuccessRate(current?.metrics ?? null);
  const level = current ? relativeLevel(current.probability, base) : null;
  const platform = current?.platform;
  const maxOption = Math.max(...data.options.map((option) => option.probability), 0.01);

  return (
    <>
      <div className="goal-estimate-block">
        <p className="goal-estimate-label">Mục tiêu hợp lý</p>
        <p className="goal-estimate-range">
          <b>{formatVndShort(goal.low)}</b> – <b>{formatVndShort(goal.high)}</b>
        </p>
        <p className="hint">{GOAL_BASIS_TEXT[goal.basis](category)}</p>
        {goalAmount !== goal.recommended && (
          <button className="button button-outline button-sm" type="button" onClick={() => onUseGoal(goal.recommended)}>
            Dùng mức {formatVnd(goal.recommended)}
          </button>
        )}
      </div>

      {current && level && (
        <div className="goal-estimate-block">
          <p className="goal-estimate-label">Với mục tiêu bạn nhập</p>
          <p className="model-figure">
            <span className="num">{Math.round(current.probability * 100)}%</span>
            <span>khả năng đạt mục tiêu</span>
          </p>
          <p className="prediction-level">
            <span className={`prediction-level-tag is-${level.tone}`}>{level.label}</span>
            <span>Mặt bằng chung: khoảng {Math.round(base * 100)}%</span>
          </p>
          {platform && (
            <p className="hint">
              Đã tự hiệu chỉnh theo {platform.samples} dự án đã kết thúc trên Góp Mầm (mô hình gốc:{" "}
              {Math.round(platform.baseProbability * 100)}%, mức tin dữ liệu Góp Mầm: {Math.round(platform.weight * 100)}%).
            </p>
          )}
        </div>
      )}

      {data.options.length > 1 && (
        <div className="goal-estimate-block">
          <p className="goal-estimate-label">So sánh các mức mục tiêu</p>
          <ul className="goal-estimate-options">
            {data.options.map((option) => (
              <li key={option.goalAmount} className={option.goalAmount === goalAmount ? "is-current" : undefined}>
                <button type="button" onClick={() => onUseGoal(option.goalAmount)} title={`Dùng mức ${formatVnd(option.goalAmount)}`}>
                  <span className="goal-estimate-amount">{formatVndShort(option.goalAmount)}</span>
                  <span className="goal-estimate-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((option.probability / maxOption) * 100)}%` }} />
                  </span>
                  <span className="goal-estimate-pct">{Math.round(option.probability * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="goal-estimate-block">
        <p className="goal-estimate-label">Thời hạn nên chọn</p>
        <p>
          <b>{duration.days} ngày</b>{" "}
          <span className="hint">(khoảng {Math.round(duration.probability * 100)}% khả năng đạt)</span>
        </p>
        <button className="button button-outline button-sm" type="button" onClick={() => onUseDuration(duration.days)}>
          Đặt ngày kết thúc sau {duration.days} ngày
        </button>
      </div>

      {data.similar.length > 0 && (
        <div className="goal-estimate-block">
          <p className="goal-estimate-label">
            Dự án tương tự đã kết thúc ({data.similarReached}/{data.similar.length} đạt mục tiêu)
          </p>
          <ul className="goal-estimate-similar">
            {data.similar.map((item, index) => (
              <li key={item.campaignId ?? index}>
                <span className="goal-estimate-similar-title">{item.title || "Dự án"}</span>
                <span className="hint">
                  {formatVndShort(item.raised)} / {formatVndShort(item.goalAmount)} · {item.durationDays} ngày
                </span>
                <span className={`prediction-level-tag ${item.reached ? "is-good" : "is-low"}`}>
                  {item.reached ? "Đạt" : "Chưa đạt"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.notes.map((note) => (
        <p className="hint" role="note" key={note}>{note}</p>
      ))}
      <p className="fineprint">
        AI tự học thêm mỗi khi có dự án kết thúc trên Góp Mầm. Gợi ý không ảnh hưởng tới việc duyệt; hãy đặt mục tiêu theo
        nhu cầu thật của dự án.
      </p>
    </>
  );
}
