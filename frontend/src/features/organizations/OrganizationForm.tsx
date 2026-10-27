import { useState, type ChangeEvent, type FormEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError, resolveMediaUrl } from "@/lib/api";
import { useCategories } from "@/lib/api/categories";
import { ACCEPTED_IMAGE_TYPES, uploadImage, validateImageFile, type MediaPurpose } from "@/lib/api/media";
import {
  ORGANIZATION_TYPE_LABEL,
  createOrganization,
  updateOrganization,
  type Organization,
  type OrganizationPayload,
  type OrganizationType,
} from "@/lib/api/organizations";
import { PROVINCES } from "@/lib/provinces";

type FormState = Omit<OrganizationPayload, "category" | "website" | "logoUrl"> & {
  category: string;
  website: string;
  logoUrl: string;
};

type FieldName = keyof FormState;

const EMPTY: FormState = {
  name: "",
  type: "charity_fund",
  registrationNumber: "",
  issuedBy: "",
  category: "",
  mission: "",
  website: "",
  email: "",
  phone: "",
  address: "",
  province: "",
  logoUrl: "",
  documentUrl: "",
  representativeTitle: "",
};

/** Thông tin pháp lý khóa sau khi xác minh (khớp `LEGAL_FIELDS` ở backend). */
const LEGAL: FieldName[] = ["name", "type", "registrationNumber", "issuedBy", "documentUrl", "representativeTitle"];
const MISSION_MIN = 50;
const MISSION_MAX = 3000;

function fromOrganization(organization: Organization): FormState {
  return {
    name: organization.name,
    type: organization.type,
    registrationNumber: organization.registrationNumber,
    issuedBy: organization.issuedBy,
    category: organization.category ?? "",
    mission: organization.mission,
    website: organization.website ?? "",
    email: organization.email,
    phone: organization.phone,
    address: organization.address,
    province: organization.province,
    logoUrl: organization.logoUrl ?? "",
    documentUrl: organization.documentUrl ?? "",
    representativeTitle: organization.representativeTitle,
  };
}

/** Kiểm tra phía trình duyệt cho phản hồi nhanh; backend vẫn kiểm tra lại. */
function validate(form: FormState): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (form.name.trim().length < 3) errors.name = "Nhập tên đầy đủ của tổ chức.";
  if (form.registrationNumber.trim().length < 3) errors.registrationNumber = "Nhập số giấy phép hoặc quyết định thành lập.";
  if (form.issuedBy.trim().length < 3) errors.issuedBy = "Nhập cơ quan cấp giấy phép.";
  if (form.mission.trim().length < MISSION_MIN) errors.mission = `Sứ mệnh cần ít nhất ${MISSION_MIN} ký tự.`;
  if (form.website.trim() && !/^https?:\/\/\S+\.\S+/.test(form.website.trim())) errors.website = "Website phải bắt đầu bằng http:// hoặc https://";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Email liên hệ không hợp lệ.";
  if (!/^\+?[0-9 .-]{8,20}$/.test(form.phone.trim())) errors.phone = "Số điện thoại không hợp lệ.";
  if (form.address.trim().length < 5) errors.address = "Nhập địa chỉ trụ sở.";
  if (!form.province) errors.province = "Chọn tỉnh/thành.";
  if (!form.documentUrl) errors.documentUrl = "Tải lên ảnh giấy phép hoặc quyết định thành lập.";
  if (form.representativeTitle.trim().length < 2) errors.representativeTitle = "Nhập chức vụ của bạn trong tổ chức.";
  return errors;
}

type OrganizationFormProps = {
  /** Có giá trị = sửa hồ sơ đã gửi. */
  organization?: Organization;
  representativeName: string;
  onSaved: (organization: Organization) => void;
};

export function OrganizationForm({ organization, representativeName, onSaved }: OrganizationFormProps) {
  const categories = useCategories();
  const [form, setForm] = useState<FormState>(() => (organization ? fromOrganization(organization) : EMPTY));
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [uploading, setUploading] = useState<"logoUrl" | "documentUrl" | null>(null);
  const [agreed, setAgreed] = useState(Boolean(organization));
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const locked = organization?.status === "verified" || organization?.status === "suspended";
  const isLocked = (field: FieldName) => locked && LEGAL.includes(field);

  const set = (field: FieldName, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const upload = async (field: "logoUrl" | "documentUrl", purpose: MediaPurpose, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setErrors((current) => ({ ...current, [field]: invalid }));
      return;
    }
    setUploading(field);
    try {
      const uploaded = await uploadImage(file, purpose);
      set(field, uploaded.url);
    } catch (err) {
      setErrors((current) => ({ ...current, [field]: err instanceof ApiError ? err.message : "Không tải được ảnh." }));
    } finally {
      setUploading(null);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSubmitError("Vui lòng kiểm tra lại các mục được đánh dấu.");
      return;
    }
    if (!agreed) {
      setSubmitError("Vui lòng xác nhận cam kết của người đại diện.");
      return;
    }
    const payload: OrganizationPayload = {
      name: form.name.trim(),
      type: form.type,
      registrationNumber: form.registrationNumber.trim(),
      issuedBy: form.issuedBy.trim(),
      category: form.category || undefined,
      mission: form.mission.trim(),
      website: form.website.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      province: form.province,
      logoUrl: form.logoUrl || undefined,
      documentUrl: form.documentUrl,
      representativeTitle: form.representativeTitle.trim(),
    };
    setBusy(true);
    try {
      if (organization) {
        // Không gửi lại thông tin pháp lý đã khóa.
        const changes = Object.fromEntries(
          Object.entries(payload).filter(([field]) => !isLocked(field as FieldName)),
        ) as Partial<OrganizationPayload>;
        onSaved(await updateOrganization(organization.id, changes));
      } else {
        onSaved(await createOrganization(payload));
      }
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Không gửi được hồ sơ, vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (field: FieldName) =>
    errors[field] ? <small className="field-error" role="alert">{errors[field]}</small> : null;

  const text = (field: FieldName, label: string, options: { placeholder?: string; type?: string; maxLength?: number; hint?: string; autoComplete?: string } = {}) => (
    <label className="field">
      <span>{label}</span>
      <input
        type={options.type ?? "text"}
        value={form[field]}
        maxLength={options.maxLength}
        placeholder={options.placeholder}
        autoComplete={options.autoComplete}
        disabled={isLocked(field)}
        aria-invalid={Boolean(errors[field])}
        onChange={(event) => set(field, event.target.value)}
      />
      {options.hint && <small>{options.hint}</small>}
      {fieldError(field)}
    </label>
  );

  return (
    <form className="org-form" onSubmit={submit} noValidate>
      {locked && (
        <p className="org-form-note">
          <Icon name="shield" size={16} /> Tổ chức đã được xác minh: thông tin pháp lý được khóa. Muốn thay đổi, vui lòng liên hệ quản trị viên.
        </p>
      )}

      <fieldset className="org-form-section">
        <legend>Thông tin tổ chức</legend>
        {text("name", "Tên tổ chức", { maxLength: 200, placeholder: "VD: Quỹ Bảo trợ Trẻ em tỉnh Đồng Nai" })}
        <div className="field-row field-row-2">
          <label className="field">
            <span>Loại hình</span>
            <select value={form.type} disabled={isLocked("type")} onChange={(event) => set("type", event.target.value as OrganizationType)}>
              {(Object.keys(ORGANIZATION_TYPE_LABEL) as OrganizationType[]).map((type) => (
                <option key={type} value={type}>{ORGANIZATION_TYPE_LABEL[type]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Lĩnh vực chính <small>(không bắt buộc)</small></span>
            <select value={form.category} onChange={(event) => set("category", event.target.value)}>
              <option value="">Chưa chọn</option>
              {categories.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Sứ mệnh và hoạt động</span>
          <textarea
            rows={5}
            value={form.mission}
            maxLength={MISSION_MAX}
            placeholder="Tổ chức hoạt động vì ai, làm những gì, đã đạt được kết quả nào…"
            aria-invalid={Boolean(errors.mission)}
            onChange={(event) => set("mission", event.target.value)}
          />
          <small>{form.mission.trim().length}/{MISSION_MAX} ký tự (tối thiểu {MISSION_MIN})</small>
          {fieldError("mission")}
        </label>
        <div className="org-upload">
          <span className="org-upload-preview" aria-hidden="true">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh người dùng tải lên, đường dẫn động
              <img src={resolveMediaUrl(form.logoUrl)} alt="" />
            ) : (
              <Icon name="image" size={22} />
            )}
          </span>
          <div>
            <b>Logo tổ chức <small>(không bắt buộc)</small></b>
            <p>Ảnh vuông JPEG, PNG hoặc WebP, tối đa 5 MB.</p>
            <label className="account-pill org-upload-button">
              {uploading === "logoUrl" ? "Đang tải…" : form.logoUrl ? "Đổi logo" : "Tải logo lên"}
              <input className="sr-only" type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} disabled={uploading !== null} onChange={(event) => void upload("logoUrl", "organization_logo", event)} />
            </label>
            {fieldError("logoUrl")}
          </div>
        </div>
      </fieldset>

      <fieldset className="org-form-section">
        <legend>Pháp lý</legend>
        <div className="field-row field-row-2">
          {text("registrationNumber", "Số giấy phép / quyết định thành lập", { maxLength: 100, placeholder: "VD: 123/QĐ-UBND" })}
          {text("issuedBy", "Cơ quan cấp", { maxLength: 200, placeholder: "VD: UBND tỉnh Đồng Nai" })}
        </div>
        <div className="org-upload">
          <span className="org-upload-preview org-upload-doc" aria-hidden="true">
            {form.documentUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh người dùng tải lên, đường dẫn động
              <img src={resolveMediaUrl(form.documentUrl)} alt="" />
            ) : (
              <Icon name="document" size={22} />
            )}
          </span>
          <div>
            <b>Ảnh giấy phép hoặc quyết định thành lập</b>
            <p>Chụp rõ số giấy phép, tên tổ chức và con dấu. Chỉ bạn và quản trị viên xem được ảnh này.</p>
            {!isLocked("documentUrl") && (
              <label className="account-pill org-upload-button">
                {uploading === "documentUrl" ? "Đang tải…" : form.documentUrl ? "Đổi ảnh" : "Tải ảnh lên"}
                <input className="sr-only" type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} disabled={uploading !== null} onChange={(event) => void upload("documentUrl", "organization_document", event)} />
              </label>
            )}
            {fieldError("documentUrl")}
          </div>
        </div>
      </fieldset>

      <fieldset className="org-form-section">
        <legend>Liên hệ</legend>
        <div className="field-row field-row-2">
          {text("email", "Email liên hệ", { type: "email", maxLength: 200, autoComplete: "email", placeholder: "lienhe@tochuc.vn" })}
          {text("phone", "Số điện thoại", { type: "tel", maxLength: 20, autoComplete: "tel", placeholder: "0251 3822 000" })}
        </div>
        {text("website", "Website (không bắt buộc)", { type: "url", maxLength: 300, placeholder: "https://" })}
        <div className="field-row field-row-2">
          {text("address", "Địa chỉ trụ sở", { maxLength: 300, autoComplete: "street-address" })}
          <label className="field">
            <span>Tỉnh/thành</span>
            <select value={form.province} aria-invalid={Boolean(errors.province)} onChange={(event) => set("province", event.target.value)}>
              <option value="">Chọn tỉnh/thành</option>
              {PROVINCES.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            {fieldError("province")}
          </label>
        </div>
      </fieldset>

      <fieldset className="org-form-section">
        <legend>Người đại diện</legend>
        <div className="field-row field-row-2">
          <label className="field">
            <span>Họ tên</span>
            <input value={representativeName} disabled readOnly />
            <small>Lấy theo tài khoản đang đăng nhập.</small>
          </label>
          {text("representativeTitle", "Chức vụ trong tổ chức", { maxLength: 100, placeholder: "VD: Giám đốc quỹ" })}
        </div>
        {!organization && (
          <label className="check-row">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>
              Tôi là người được tổ chức ủy quyền đăng ký và cam kết thông tin, giấy tờ cung cấp là chính xác. Tôi hiểu hồ
              sơ có thể bị từ chối hoặc tạm ngưng nếu thông tin không đúng sự thật.
            </span>
          </label>
        )}
      </fieldset>

      {submitError && <p className="form-error" role="alert">{submitError}</p>}
      <div className="org-form-actions">
        <button className="button button-primary button-lg" type="submit" disabled={busy || uploading !== null}>
          {busy ? "Đang gửi…" : organization ? (["needs_info", "rejected"].includes(organization.status) ? "Lưu và gửi xét lại" : "Lưu thay đổi") : "Gửi hồ sơ xác minh"}
        </button>
      </div>
    </form>
  );
}
