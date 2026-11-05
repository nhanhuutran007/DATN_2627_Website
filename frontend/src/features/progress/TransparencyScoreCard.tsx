import {
  TRANSPARENCY_GRADE_LABEL,
  TRANSPARENCY_GRADE_TONE,
  TRANSPARENCY_UNRATED_LABEL,
  type TransparencyScore,
} from "@/lib/api/progress";

type TransparencyScoreCardProps = {
  score: TransparencyScore;
  id?: string;
};

/** Điểm minh bạch kèm lý do từng tiêu chí; dùng chung trang dự án và trang chủ dự án. */
export function TransparencyScoreCard({ score, id }: TransparencyScoreCardProps) {
  if (score.status === "unrated") {
    return (
      <div className="transparency-card" id={id}>
        <h3>Điểm minh bạch</h3>
        <p className="hint">{TRANSPARENCY_UNRATED_LABEL[score.reason]}</p>
      </div>
    );
  }

  return (
    <div className="transparency-card" id={id}>
      <div className="transparency-head">
        <h3>Điểm minh bạch</h3>
        <p className="transparency-score"><b>{score.score}</b>/100</p>
        <span className={`tag ${TRANSPARENCY_GRADE_TONE[score.grade]}`}>{TRANSPARENCY_GRADE_LABEL[score.grade]}</span>
      </div>
      <ul className="transparency-criteria">
        {score.criteria.map((criterion) => {
          const percent = criterion.ratio === null ? null : Math.round(criterion.ratio * 100);
          return (
            <li key={criterion.key}>
              <span className="transparency-criterion-name">
                <b>{criterion.label}</b>
                <span className="num">{percent === null ? "Chưa áp dụng" : `${percent}%`}</span>
              </span>
              <span className="transparency-bar" aria-hidden="true">
                <span style={{ width: `${percent ?? 0}%` }} />
              </span>
              <small>{criterion.detail}</small>
            </li>
          );
        })}
      </ul>
      <p className="section-note">
        Tính tự động từ dữ liệu chủ dự án đã báo cáo. Tiêu chí chưa áp dụng không tính vào điểm. Điểm cho biết mức độ giải trình, không khẳng định chứng từ là thật.
      </p>
    </div>
  );
}
