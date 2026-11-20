import { MoneyInput } from "@/components/ui/MoneyInput";
import { ImageUploader } from "@/features/media/ImageUploader";
import { MAX_REWARD_ITEMS, MIN_REWARD_AMOUNT, type RewardTier, type RewardTierPayload } from "@/lib/api/rewards";

export type DraftItem = { name: string; quantity: string };

export type DraftTier = {
  title: string;
  description: string;
  minAmount: string;
  limit: string;
  delivery: string;
  imageUrl: string;
  items: DraftItem[];
  /** Gửi tận nơi (hỏi địa chỉ) hay quà số/ghi danh. */
  shipping: boolean;
  /** Hạn chọn quà (yyyy-mm-dd), rỗng = đến hết chiến dịch. */
  until: string;
};

export const emptyTier: DraftTier = {
  title: "",
  description: "",
  minAmount: "",
  limit: "",
  delivery: "",
  imageUrl: "",
  items: [],
  shipping: true,
  until: "",
};

export const MAX_DRAFT_TIERS = 10;

const isBlank = (t: DraftTier) =>
  !t.title.trim() && !t.description.trim() && !t.minAmount && !t.limit && !t.delivery && !t.imageUrl && t.items.every((i) => !i.name.trim());

/** Mức quà đã lưu → bản nháp để sửa. */
export function tierToDraft(t: RewardTier): DraftTier {
  return {
    title: t.title,
    description: t.description,
    minAmount: String(Number(t.minAmount)),
    limit: t.quantityLimit ? String(t.quantityLimit) : "",
    delivery: t.estimatedDelivery ? t.estimatedDelivery.slice(0, 10) : "",
    imageUrl: t.imageUrl ?? "",
    items: (t.items ?? []).map((item) => ({ name: item.name, quantity: String(item.quantity) })),
    shipping: t.requiresShipping ?? true,
    until: t.availableUntil ? t.availableUntil.slice(0, 10) : "",
  };
}

/** Kiểm tra các mức đã nhập (bỏ qua mức để trống hoàn toàn). Trả thông báo lỗi đầu tiên hoặc "". */
export function validateTiers(tiers: DraftTier[]): string {
  for (const [i, t] of tiers.entries()) {
    if (isBlank(t)) continue;
    const label = tiers.length > 1 ? `Mức quà ${i + 1}` : "Mức quà";
    if (t.title.trim().length < 3) return `${label}: tên cần ít nhất 3 ký tự.`;
    if (t.description.trim().length < 10) return `${label}: mô tả phần quà cần ít nhất 10 ký tự.`;
    if (!(Number(t.minAmount) >= MIN_REWARD_AMOUNT)) return `${label}: số tiền tối thiểu từ ${MIN_REWARD_AMOUNT.toLocaleString("vi-VN")} ₫.`;
    if (t.limit && !(Number(t.limit) >= 1 && Number.isInteger(Number(t.limit)))) return `${label}: số suất phải là số nguyên ≥ 1.`;
    for (const item of t.items) {
      if (!item.name.trim()) continue;
      if (item.name.trim().length < 2) return `${label}: tên món quà cần ít nhất 2 ký tự.`;
      const qty = Number(item.quantity || "1");
      if (!(Number.isInteger(qty) && qty >= 1 && qty <= 1000)) return `${label}: số lượng mỗi món từ 1 đến 1000.`;
    }
  }
  return "";
}

/** Bản nháp → dữ liệu gửi API (hạn chọn quà tính hết ngày theo giờ Việt Nam). */
export function draftToPayload(t: DraftTier, sortOrder?: number): RewardTierPayload {
  return {
    title: t.title.trim(),
    description: t.description.trim(),
    minAmount: Number(t.minAmount),
    quantityLimit: t.limit ? Number(t.limit) : null,
    estimatedDelivery: t.delivery || null,
    imageUrl: t.imageUrl || null,
    items: t.items
      .filter((item) => item.name.trim())
      .map((item) => ({ name: item.name.trim(), quantity: Number(item.quantity || "1") })),
    requiresShipping: t.shipping,
    availableUntil: t.until ? `${t.until}T23:59:59+07:00` : null,
    ...(sortOrder !== undefined ? { sortOrder } : {}),
  };
}

export function tiersToPayloads(tiers: DraftTier[]): RewardTierPayload[] {
  return tiers.filter((t) => !isBlank(t)).map((t, index) => draftToPayload(t, index));
}

type FieldsProps = {
  tier: DraftTier;
  onChange: (tier: DraftTier) => void;
  /** Sau khi phát hành: số tiền tối thiểu không đổi được. */
  lockAmount?: boolean;
};

/** Các trường của một mức quà kiểu Kickstarter (dùng trong wizard và trang quản lý). */
export function RewardTierFields({ tier, onChange, lockAmount = false }: FieldsProps) {
  const set = <K extends keyof DraftTier>(key: K, value: DraftTier[K]) => onChange({ ...tier, [key]: value });
  const setItem = (index: number, patch: Partial<DraftItem>) =>
    set("items", tier.items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="reward-fields">
      <div className="field-row">
        <label className="field field-span-2">
          <span>Tên mức quà</span>
          <input value={tier.title} maxLength={120} placeholder="Ví dụ: Bộ sổ tay và thư cảm ơn" onChange={(e) => set("title", e.target.value)} />
        </label>
        <label className="field">
          <span>Ủng hộ từ (VNĐ)</span>
          <MoneyInput value={tier.minAmount} placeholder="200.000đ" disabled={lockAmount} onChange={(digits) => set("minAmount", digits)} />
          {lockAmount && <small className="hint">Không đổi được sau khi phát hành.</small>}
        </label>
        <label className="field">
          <span>Số suất</span>
          <input type="number" min={1} value={tier.limit} placeholder="Không giới hạn" onChange={(e) => set("limit", e.target.value)} />
        </label>
        <label className="field field-span-4">
          <span>Mô tả</span>
          <textarea rows={2} value={tier.description} maxLength={1000} placeholder="Lời cảm ơn và ý nghĩa của phần quà" onChange={(e) => set("description", e.target.value)} />
        </label>
      </div>

      <fieldset className="reward-items-field">
        <legend>Bao gồm <small>(mỗi món một dòng, như Kickstarter)</small></legend>
        {tier.items.map((item, index) => (
          <div className="reward-item-row" key={index}>
            <input
              aria-label={`Tên món ${index + 1}`}
              value={item.name}
              maxLength={120}
              placeholder="Ví dụ: Sổ tay dự án"
              onChange={(e) => setItem(index, { name: e.target.value })}
            />
            <input
              aria-label={`Số lượng món ${index + 1}`}
              type="number"
              min={1}
              max={1000}
              value={item.quantity}
              placeholder="1"
              onChange={(e) => setItem(index, { quantity: e.target.value })}
            />
            <button className="link-danger" type="button" onClick={() => set("items", tier.items.filter((_, i) => i !== index))}>
              Xóa<span className="sr-only"> món {index + 1}</span>
            </button>
          </div>
        ))}
        {tier.items.length < MAX_REWARD_ITEMS && (
          <button className="button button-outline button-sm" type="button" onClick={() => set("items", [...tier.items, { name: "", quantity: "1" }])}>
            + Thêm món
          </button>
        )}
      </fieldset>

      <div className="field-row">
        <label className="field">
          <span>Dự kiến giao</span>
          <input type="date" value={tier.delivery} onChange={(e) => set("delivery", e.target.value)} />
        </label>
        <label className="field">
          <span>Hạn chọn quà</span>
          <input type="date" value={tier.until} onChange={(e) => set("until", e.target.value)} />
          <small className="hint">Bỏ trống = đến hết chiến dịch</small>
        </label>
        <fieldset className="field field-span-2 reward-shipping">
          <legend>Cách nhận quà</legend>
          <label>
            <input type="radio" checked={tier.shipping} onChange={() => set("shipping", true)} />
            <span>Gửi tận nơi <small>— hỏi tên, số điện thoại, địa chỉ người nhận</small></span>
          </label>
          <label>
            <input type="radio" checked={!tier.shipping} onChange={() => set("shipping", false)} />
            <span>Không cần giao <small>— quà số, ghi danh, thư điện tử</small></span>
          </label>
        </fieldset>
      </div>

      <ImageUploader label="Ảnh phần quà (không bắt buộc)" value={tier.imageUrl} purpose="campaign_image" onChange={(url) => set("imageUrl", url)} />
    </div>
  );
}

type Props = {
  tiers: DraftTier[];
  onChange: (tiers: DraftTier[]) => void;
};

/** Soạn danh sách mức ủng hộ & phần quà (dùng trong wizard tạo chiến dịch). */
export function RewardTiersEditor({ tiers, onChange }: Props) {
  return (
    <div className="reward-editor">
      <h3>Mức ủng hộ &amp; phần quà <small>(tùy chọn)</small></h3>
      <p className="hint">
        Như Kickstarter: mỗi mức nêu rõ số tiền, các món bao gồm, thời gian dự kiến giao và cách nhận quà. Sau khi chiến dịch
        phát hành, số tiền tối thiểu của mỗi mức không thay đổi được để giữ đúng cam kết với người đã ủng hộ.
      </p>
      {tiers.map((tier, index) => (
        <fieldset className="milestone" key={index}>
          <legend>Mức quà {index + 1}</legend>
          <RewardTierFields tier={tier} onChange={(next) => onChange(tiers.map((t, i) => (i === index ? next : t)))} />
          <button className="link-danger" type="button" onClick={() => onChange(tiers.filter((_, i) => i !== index))}>
            Xóa mức này
          </button>
        </fieldset>
      ))}
      {tiers.length < MAX_DRAFT_TIERS && (
        <div className="milestone-foot">
          <button className="button button-outline" type="button" onClick={() => onChange([...tiers, { ...emptyTier, items: [] }])}>
            + Thêm mức quà
          </button>
        </div>
      )}
    </div>
  );
}
