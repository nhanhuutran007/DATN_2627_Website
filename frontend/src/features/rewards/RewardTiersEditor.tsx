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

/** yyyy-mm-dd theo giờ địa phương (như ô `<input type="date">`). */
function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ngày `value` (yyyy-mm-dd) cộng `days` ngày. */
function addDays(value: string, days: number) {
  const d = new Date(`${value}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

const formatDay = (value: string) => value.split("-").reverse().join("/");

/** Quà giao muộn nhất 2 năm sau khi kết thúc gây quỹ. */
const MAX_DELIVERY_DAYS = 730;

/**
 * Ràng buộc ngày theo thời gian gây quỹ (như Kickstarter): chỉ chọn quà trong lúc gây quỹ
 * (hạn chọn từ hôm nay tới ngày kết thúc), quà giao sau khi kết thúc (dự kiến giao từ ngày hôm sau).
 */
export type TierDateRules = {
  /** Ngày kết thúc gây quỹ (yyyy-mm-dd); rỗng = chưa chọn. */
  deadline?: string;
  /** Bắt buộc nhập ngày dự kiến giao (wizard tạo dự án, thêm mức mới). */
  requireDelivery?: boolean;
};

/** Khoảng ngày cho ô "Hạn chọn quà" và "Dự kiến giao". */
export function tierDateBounds(tier: Pick<DraftTier, "until">, rules: TierDateRules = {}) {
  const today = toDateInput(new Date());
  const deadline = rules.deadline || "";
  const deliveryFrom = deadline ? addDays(deadline, 1) : today;
  return {
    untilMin: today,
    untilMax: deadline || undefined,
    deliveryMin: tier.until && tier.until > deliveryFrom ? tier.until : deliveryFrom,
    deliveryMax: deadline ? addDays(deadline, MAX_DELIVERY_DAYS) : undefined,
  };
}

/** Kiểm tra các mức đã nhập (bỏ qua mức để trống hoàn toàn). Trả thông báo lỗi đầu tiên hoặc "". */
export function validateTiers(tiers: DraftTier[], rules: TierDateRules = {}): string {
  for (const [i, t] of tiers.entries()) {
    if (isBlank(t)) continue;
    const label = tiers.length > 1 ? `Mức quà ${i + 1}` : "Mức quà";
    if (t.title.trim().length < 3) return `${label}: tên cần ít nhất 3 ký tự.`;
    if (t.description.trim().length < 10) return `${label}: mô tả phần quà cần ít nhất 10 ký tự.`;
    if (!(Number(t.minAmount) >= MIN_REWARD_AMOUNT)) return `${label}: số tiền tối thiểu từ ${MIN_REWARD_AMOUNT.toLocaleString("vi-VN")}\u00A0₫.`;
    if (t.limit && !(Number(t.limit) >= 1 && Number.isInteger(Number(t.limit)))) return `${label}: số suất phải là số nguyên ≥ 1.`;
    for (const item of t.items) {
      if (!item.name.trim()) continue;
      if (item.name.trim().length < 2) return `${label}: tên món quà cần ít nhất 2 ký tự.`;
      const qty = Number(item.quantity || "1");
      if (!(Number.isInteger(qty) && qty >= 1 && qty <= 1000)) return `${label}: số lượng mỗi món từ 1 đến 1000.`;
    }
    const bounds = tierDateBounds(t, rules);
    if (t.until) {
      if (t.until < bounds.untilMin) return `${label}: hạn chọn quà không được ở quá khứ.`;
      if (bounds.untilMax && t.until > bounds.untilMax) {
        return `${label}: hạn chọn quà không được muộn hơn ngày kết thúc gây quỹ (${formatDay(bounds.untilMax)}).`;
      }
    }
    if (!t.delivery) {
      if (rules.requireDelivery) return `${label}: vui lòng chọn thời gian dự kiến giao quà.`;
    } else if (rules.deadline) {
      if (t.delivery < bounds.deliveryMin) {
        return `${label}: dự kiến giao phải sau ngày kết thúc gây quỹ, từ ${formatDay(bounds.deliveryMin)} trở đi.`;
      }
      if (bounds.deliveryMax && t.delivery > bounds.deliveryMax) {
        return `${label}: dự kiến giao không quá 2 năm sau khi kết thúc gây quỹ (muộn nhất ${formatDay(bounds.deliveryMax)}).`;
      }
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
  /** Ràng buộc ngày theo thời gian gây quỹ. */
  dateRules?: TierDateRules;
};

/** Các trường của một mức quà kiểu Kickstarter (dùng trong wizard và trang quản lý). */
export function RewardTierFields({ tier, onChange, lockAmount = false, dateRules = {} }: FieldsProps) {
  const bounds = tierDateBounds(tier, dateRules);
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
        <legend>Bao gồm <small>(mỗi món một dòng)</small></legend>
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
          <span>Hạn chọn quà</span>
          <input type="date" min={bounds.untilMin} max={bounds.untilMax} value={tier.until} onChange={(e) => set("until", e.target.value)} />
          <small className="hint">
            {bounds.untilMax ? `Bỏ trống = đến hết ngày kết thúc (${formatDay(bounds.untilMax)})` : "Bỏ trống = đến hết thời gian gây quỹ"}
          </small>
        </label>
        <label className="field">
          <span>Dự kiến giao{dateRules.requireDelivery && <span className="required-mark" aria-hidden="true"> *</span>}</span>
          <input
            type="date"
            min={dateRules.deadline ? bounds.deliveryMin : undefined}
            max={bounds.deliveryMax}
            value={tier.delivery}
            onChange={(e) => set("delivery", e.target.value)}
          />
          <small className="hint">
            {dateRules.deadline ? `Sau khi kết thúc gây quỹ, từ ${formatDay(bounds.deliveryMin)}` : "Sau khi kết thúc gây quỹ"}
          </small>
        </label>
        <fieldset className="field field-span-2 reward-shipping">
          <legend>Hình thức nhận quà</legend>
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
  dateRules?: TierDateRules;
};

/** Soạn danh sách mức ủng hộ & phần quà (dùng trong wizard tạo dự án). */
export function RewardTiersEditor({ tiers, onChange, dateRules }: Props) {
  return (
    <div className="reward-editor">
      <h3>Mức ủng hộ &amp; phần quà <small>(tùy chọn)</small></h3>
      <p className="hint">
        Mỗi mức nêu rõ số tiền, các món bao gồm, thời gian dự kiến giao và hình thức nhận quà. Sau khi dự án phát hành, số
        tiền tối thiểu của mỗi mức không thay đổi được để giữ đúng cam kết với người đã ủng hộ.
      </p>
      {tiers.map((tier, index) => (
        <fieldset className="milestone" key={index}>
          <legend>Mức quà {index + 1}</legend>
          <RewardTierFields tier={tier} dateRules={dateRules} onChange={(next) => onChange(tiers.map((t, i) => (i === index ? next : t)))} />
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
