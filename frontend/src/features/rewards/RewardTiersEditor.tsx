import { MIN_REWARD_AMOUNT, type RewardTierPayload } from "@/lib/api/rewards";

export type DraftTier = { title: string; description: string; minAmount: string; limit: string; delivery: string };

export const emptyTier: DraftTier = { title: "", description: "", minAmount: "", limit: "", delivery: "" };

export const MAX_DRAFT_TIERS = 10;

const isBlank = (t: DraftTier) => !t.title.trim() && !t.description.trim() && !t.minAmount && !t.limit && !t.delivery;

/** Kiểm tra các mức đã nhập (bỏ qua mức để trống hoàn toàn). Trả thông báo lỗi đầu tiên hoặc "". */
export function validateTiers(tiers: DraftTier[]): string {
  for (const [i, t] of tiers.entries()) {
    if (isBlank(t)) continue;
    const label = `Mức quà ${i + 1}`;
    if (t.title.trim().length < 3) return `${label}: tên cần ít nhất 3 ký tự.`;
    if (t.description.trim().length < 10) return `${label}: mô tả phần quà cần ít nhất 10 ký tự.`;
    if (!(Number(t.minAmount) >= MIN_REWARD_AMOUNT)) return `${label}: số tiền tối thiểu từ ${MIN_REWARD_AMOUNT.toLocaleString("vi-VN")} ₫.`;
    if (t.limit && !(Number(t.limit) >= 1 && Number.isInteger(Number(t.limit)))) return `${label}: số suất phải là số nguyên ≥ 1.`;
  }
  return "";
}

export function tiersToPayloads(tiers: DraftTier[]): RewardTierPayload[] {
  return tiers
    .filter((t) => !isBlank(t))
    .map((t, index) => ({
      title: t.title.trim(),
      description: t.description.trim(),
      minAmount: Number(t.minAmount),
      quantityLimit: t.limit ? Number(t.limit) : null,
      estimatedDelivery: t.delivery || null,
      sortOrder: index,
    }));
}

type Props = {
  tiers: DraftTier[];
  onChange: (tiers: DraftTier[]) => void;
};

/** Soạn danh sách mức ủng hộ & phần quà (dùng trong wizard tạo chiến dịch). */
export function RewardTiersEditor({ tiers, onChange }: Props) {
  const set = (index: number, key: keyof DraftTier, value: string) =>
    onChange(tiers.map((t, i) => (i === index ? { ...t, [key]: value } : t)));

  return (
    <div className="reward-editor">
      <h3>Mức ủng hộ &amp; phần quà <small>(tùy chọn)</small></h3>
      <p className="hint">
        Phần quà là lời cảm ơn hiện vật/ghi nhận cho người ủng hộ từ một mức tiền nhất định. Sau khi chiến dịch phát hành,
        số tiền tối thiểu của mỗi mức không thay đổi được để giữ đúng cam kết với người đã ủng hộ.
      </p>
      {tiers.map((tier, index) => (
        <fieldset className="milestone" key={index}>
          <legend>Mức quà {index + 1}</legend>
          <div className="field-row">
            <label className="field field-span-2">
              <span>Tên mức</span>
              <input value={tier.title} maxLength={120} placeholder="Ví dụ: Thư cảm ơn và sổ tay dự án" onChange={(e) => set(index, "title", e.target.value)} />
            </label>
            <label className="field">
              <span>Ủng hộ từ (VNĐ)</span>
              <input type="number" min={MIN_REWARD_AMOUNT} step={10000} value={tier.minAmount} placeholder="200000" onChange={(e) => set(index, "minAmount", e.target.value)} />
            </label>
            <label className="field">
              <span>Số suất</span>
              <input type="number" min={1} value={tier.limit} placeholder="Không giới hạn" onChange={(e) => set(index, "limit", e.target.value)} />
            </label>
            <label className="field field-span-3">
              <span>Mô tả phần quà</span>
              <input value={tier.description} maxLength={1000} placeholder="Quà gồm những gì, gửi bằng cách nào" onChange={(e) => set(index, "description", e.target.value)} />
            </label>
            <label className="field">
              <span>Dự kiến gửi quà</span>
              <input type="date" value={tier.delivery} onChange={(e) => set(index, "delivery", e.target.value)} />
            </label>
          </div>
          <button className="link-danger" type="button" onClick={() => onChange(tiers.filter((_, i) => i !== index))}>
            Xóa mức này
          </button>
        </fieldset>
      ))}
      {tiers.length < MAX_DRAFT_TIERS && (
        <div className="milestone-foot">
          <button className="button button-outline" type="button" onClick={() => onChange([...tiers, { ...emptyTier }])}>
            + Thêm mức quà
          </button>
        </div>
      )}
    </div>
  );
}
