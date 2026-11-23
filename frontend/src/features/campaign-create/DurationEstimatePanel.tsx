"use client";

import { useEffect, useState } from "react";

import { fetchDurationEstimate, type AiDurationEstimate } from "@/lib/api/ai";
import { formatVnd } from "@/lib/format";
import { baseSuccessRate, relativeLevel } from "@/features/campaign-stats/CampaignPredictionCard";

/** Chờ người dùng ngừng gõ rồi mới hỏi AI. */
const DEBOUNCE_MS = 600;
/** Thời hạn dài hơn khoảng gợi ý làm giảm khả năng đạt từ bấy nhiêu điểm trở lên thì nhắc. */
const LONG_DURATION_DROP = 0.05;

type DurationEstimatePanelProps = {
  category: string;
  /** Số tiền người tạo tự đặt; chưa đạt mức tối thiểu thì chưa gợi ý. */
  goalAmount: number;
  minGoal: number;
  /** yyyy-mm-dd, rỗng khi chưa chọn. */
  deadline: string;
  title: string;
  onUseDuration: (days: number) => void;
};

type State =
  | { status: "loading"; previous: AiDurationEstimate | null }
  | { status: "unavailable" }
  | { status: "ready"; data: AiDurationEstimate };

/**
 * Gợi ý thời hạn gây quỹ ở bước "Đặt mục tiêu" cho số tiền người tạo tự quyết — AI không gợi ý
 * số tiền. Học từ các dự án Góp Mầm đã kết thúc (kết hợp mô hình học từ dữ liệu Kickstarter khi
 * Góp Mầm còn ít dữ liệu). Chỉ tham khảo.
 */
export function DurationEstimatePanel({ category, goalAmount, minGoal, deadline, title, onUseDuration }: DurationEstimatePanelProps) {
  const [state, setState] = useState<State>({ status: "loading", previous: null });
  const ready = Boolean(category) && goalAmount >= minGoal;

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState((current) => ({ status: "loading", previous: current.status === "ready" ? current.data : null }));
      const endDate = deadline ? new Date(`${deadline}T23:59:59`) : null;
      fetchDurationEstimate(
        {
          category,
          goalAmount,
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
  }, [ready, category, goalAmount, deadline, title]);

  const data = !ready ? null : state.status === "ready" ? state.data : state.status === "loading" ? state.previous : null;

  return (
    <section className="goal-estimate" aria-label="Gợi ý thời hạn từ AI" aria-busy={ready && state.status === "loading"}>
      <div className="goal-estimate-head">
        <h3>Gợi ý thời hạn từ AI</h3>
        <span className="tag">Chỉ tham khảo</span>
        {ready && state.status === "loading" && <span className="hint goal-estimate-status" role="status">Đang phân tích…</span>}
      </div>

      {!ready && <p className="hint">Nhập số tiền bạn cần huy động, AI sẽ gợi ý nên gây quỹ trong bao lâu.</p>}
      {ready && state.status === "unavailable" && (
        <p className="hint">Dịch vụ gợi ý tạm thời gián đoạn. Bạn vẫn tạo chiến dịch bình thường.</p>
      )}
      {ready && !data && state.status === "loading" && <p className="hint">Đang phân tích các dự án tương tự…</p>}
      {data && <EstimateBody data={data} goalAmount={goalAmount} onUseDuration={onUseDuration} />}
    </section>
  );
}

function EstimateBody({
  data,
  goalAmount,
  onUseDuration,
}: {
  data: AiDurationEstimate;
  goalAmount: number;
  onUseDuration: (days: number) => void;
}) {
  const { duration, current, chosenDays, options } = data;
  const base = baseSuccessRate(current?.metrics ?? null);
  const level = current ? relativeLevel(current.probability, base) : null;
  const maxOption = Math.max(...options.map((option) => option.probability), 0.01);
  const shortest = options[0]?.days;
  const longest = options[options.length - 1];
  const longDrop = longest && longest.days > duration.high ? duration.probability - longest.probability : 0;
  const chosenInRange = chosenDays != null && chosenDays >= duration.low && chosenDays <= duration.high;
  const range = duration.low < duration.high ? `${duration.low}–${duration.high} ngày` : `${duration.days} ngày`;

  return (
    <>
      <div className="goal-estimate-block">
        <p className="goal-estimate-label">Với {formatVnd(goalAmount)}, nên gây quỹ trong</p>
        <p className="goal-estimate-range">
          <b>{range}</b>
        </p>
        <p className="hint">
          Khoảng {Math.round(duration.probability * 100)}% khả năng đạt mục tiêu
          {duration.low < duration.high ? "; các thời hạn trong khoảng này tốt gần như nhau" : ""}.
          {duration.low === shortest && " Đây là thời hạn ngắn nhất được chọn: dữ liệu cho thấy gây quỹ gọn dễ đạt mục tiêu hơn."}
        </p>
        {longDrop >= LONG_DURATION_DROP && (
          <p className="hint">
            Kéo dài tới {longest.days} ngày, khả năng đạt giảm còn khoảng {Math.round(longest.probability * 100)}%.
          </p>
        )}
        {chosenInRange ? (
          <p className="goal-estimate-ok">Ngày kết thúc bạn chọn ({chosenDays} ngày) nằm trong khoảng gợi ý.</p>
        ) : (
          <button className="button button-outline button-sm" type="button" onClick={() => onUseDuration(duration.days)}>
            Đặt ngày kết thúc sau {duration.days} ngày
          </button>
        )}
      </div>

      {options.length > 1 && (
        <div className="goal-estimate-block">
          <p className="goal-estimate-label">Khả năng đạt theo thời hạn</p>
          <ul className="goal-estimate-options">
            {options.map((option) => (
              <li key={option.days} className={option.days === chosenDays ? "is-current" : undefined}>
                <button type="button" onClick={() => onUseDuration(option.days)} title={`Đặt ngày kết thúc sau ${option.days} ngày`}>
                  <span className="goal-estimate-amount">
                    {option.days} ngày
                    {option.days === chosenDays && <span className="goal-estimate-chosen">đang chọn</span>}
                  </span>
                  <span className="goal-estimate-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((option.probability / maxOption) * 100)}%` }} />
                  </span>
                  <span className="goal-estimate-pct">{Math.round(option.probability * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
          {current && level && (
            <p className="prediction-level">
              <span className={`prediction-level-tag is-${level.tone}`}>{level.label}</span>
              <span>
                Ngày kết thúc bạn chọn: {Math.round(current.probability * 100)}% · mặt bằng chung khoảng{" "}
                {Math.round(base * 100)}%
              </span>
            </p>
          )}
          {current?.platform && (
            <p className="hint">
              Đã tự hiệu chỉnh theo {current.platform.samples} dự án đã kết thúc trên Góp Mầm.
            </p>
          )}
        </div>
      )}

      {data.similar.length > 0 && (
        <div className="goal-estimate-block">
          <p className="goal-estimate-label">
            Dự án tương tự đã kết thúc ({data.similarReached}/{data.similar.length} đạt mục tiêu)
          </p>
          <ul className="goal-estimate-similar">
            {data.similar.map((item, index) => (
              <li key={item.campaignId ?? index}>
                <span className="goal-estimate-similar-title">{item.title || "Dự án"}</span>
                <span className="hint">Gây quỹ {item.durationDays} ngày</span>
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
        Số tiền do bạn tự quyết theo nhu cầu thật của dự án; AI chỉ gợi ý thời hạn và tự học thêm mỗi khi có dự án kết
        thúc trên Góp Mầm. Gợi ý không ảnh hưởng tới việc duyệt.
      </p>
    </>
  );
}
