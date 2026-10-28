"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { LogoMark } from "@/components/ui/LogoMark";
import { Icon } from "@/components/ui/Icon";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { PROVINCES } from "@/lib/provinces";
import { escapeHtml, htmlToText } from "@/lib/rich-text";
import { ImageUploader } from "@/features/media/ImageUploader";
import { OrganizationPicker } from "@/features/organizations/OrganizationPicker";
import {
  emptyTier,
  RewardTiersEditor,
  tiersToPayloads,
  validateTiers,
  type DraftTier,
} from "@/features/rewards/RewardTiersEditor";
import { ApiError } from "@/lib/api";
import {
  createCampaign,
  submitCampaign,
  updateCampaign,
  type CreateCampaignPayload,
} from "@/lib/api/campaigns";
import { useCategories } from "@/lib/api/categories";
import type { PickedOrganization } from "@/lib/api/organizations";
import {
  createMilestone,
  deleteMilestone,
  type CreateMilestonePayload,
} from "@/lib/api/progress";
import { createRewardTier, deleteRewardTier } from "@/lib/api/rewards";
import { useAuthUser, useRedirectAdmin } from "@/lib/auth";

/** Mỗi bước một chủ đề như GoFundMe: tiêu đề + lời dẫn hiện ở cột trái, câu hỏi ở cột phải. */
const STEPS = [
  { title: "Hãy bắt đầu hành trình gây quỹ của bạn", intro: "Góp Mầm đồng hành cùng bạn qua từng bước." },
  { title: "Đặt mục tiêu gây quỹ", intro: "Chọn số tiền cần huy động và thời hạn. Bạn vẫn chỉnh lại được trước khi gửi duyệt." },
  { title: "Thêm ảnh đại diện cho dự án", intro: "Ảnh thật giúp người ủng hộ hình dung rõ dự án và tin tưởng hơn." },
  { title: "Kể câu chuyện của dự án", intro: "Vấn đề là gì, ai được hưởng lợi và bạn sẽ giải quyết bằng cách nào." },
  { title: "Minh bạch ngân sách và rủi ro", intro: "Người ủng hộ muốn biết tiền được dùng vào đâu và bạn đã lường trước những khó khăn gì." },
  { title: "Lập kế hoạch theo mốc", intro: "Mỗi mốc là một đầu ra kiểm chứng được. Sau khi được duyệt, bạn báo cáo tiến độ và chi tiêu theo từng mốc." },
  { title: "Quà tri ân người ủng hộ", intro: "Không bắt buộc. Bạn có thể tặng quà theo mức ủng hộ để cảm ơn cộng đồng." },
  { title: "Kiểm tra và gửi duyệt", intro: "Rà soát lần cuối. Hồ sơ chỉ được công khai sau khi quản trị viên duyệt." },
];

const STEP_BASICS = 0;
const STEP_GOAL = 1;
const STEP_IMAGE = 2;
const STEP_STORY = 3;
const STEP_BUDGET = 4;
const STEP_MILESTONES = 5;
const STEP_REWARDS = 6;
const LAST_STEP = STEPS.length - 1;


type DraftMilestone = { title: string; deadline: string; budget: string; output: string };

type Draft = {
  title: string;
  category: string;
  location: string;
  target: string;
  deadline: string;
  imageUrl: string;
  summary: string;
  story: string;
  budget: string;
  risks: string;
};

const emptyMilestone: DraftMilestone = { title: "", deadline: "", budget: "", output: "" };

const initialDraft: Draft = {
  title: "",
  category: "",
  location: "",
  target: "",
  deadline: "",
  imageUrl: "",
  summary: "",
  story: "",
  budget: "",
  risks: "",
};

const MIN_STORY = 80;
const MIN_TARGET = 1_000_000;

// CKEditor dùng `window`, chỉ tải ở trình duyệt.
const RichTextEditor = dynamic(() => import("@/components/ui/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="rich-editor-loading">Đang tải trình soạn thảo…</div>,
});

/** Ngày theo giờ địa phương, định dạng yyyy-mm-dd như ô `<input type="date">`. */
function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ngày kết thúc sớm nhất cho phép: hôm nay + 1 tháng. */
function minDeadline() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return toDateInput(d);
}

/** Hạn sớm nhất cho mốc thứ `index`: không ở quá khứ và không sớm hơn hạn của mốc trước. */
function minMilestoneDate(milestones: DraftMilestone[], index: number) {
  const previous = milestones.slice(0, index).map((m) => m.deadline).filter(Boolean).pop();
  const today = toDateInput(new Date());
  return previous && previous > today ? previous : today;
}

function validateMilestones(milestones: DraftMilestone[]): string {
  const today = toDateInput(new Date());
  let previous: { label: string; deadline: string } | null = null;
  for (const [index, m] of milestones.entries()) {
    if (!m.deadline) continue;
    const label = `Mốc ${index + 1}`;
    if (m.deadline < today) return `Hạn hoàn thành của ${label} không được ở quá khứ.`;
    if (previous && m.deadline < previous.deadline) return `Hạn của ${label} phải từ ngày hạn của ${previous.label} trở về sau.`;
    previous = { label, deadline: m.deadline };
  }
  return "";
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử tiếp.";
    if (error.status === 400) return `Dữ liệu chưa hợp lệ: ${error.message}`;
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Không kết nối được máy chủ. Vui lòng thử lại.";
}

/** Ảnh đã tải lên hệ thống (đường dẫn `/api/v1/media/...`) hoặc link http(s). */
function isImageValue(value: string): boolean {
  return value.startsWith("/api/v1/media/") || isHttpUrl(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

type CampaignWizardProps = {
  /** Lĩnh vực chọn sẵn (từ trang "Bắt đầu gây quỹ"), server đã kiểm tra là lĩnh vực đang nhận dự án. */
  initialCategory?: string;
  /** Tổ chức chọn sẵn (từ trang tổ chức, `?to-chuc=`), server đã kiểm tra là tổ chức đã xác minh. */
  initialOrganization?: PickedOrganization;
};

type Beneficiary = "self" | "organization";

export function CampaignWizard({ initialCategory, initialOrganization }: CampaignWizardProps) {
  const router = useRouter();
  const user = useAuthUser();
  const redirecting = useRedirectAdmin();
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  // Đổi bước: về đầu trang và đưa focus vào form (để trình đọc màn hình đọc câu hỏi mới).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    formRef.current?.focus({ preventScroll: true });
  }, [step]);
  const [draft, setDraft] = useState<Draft>({ ...initialDraft, category: initialCategory ?? "" });
  const categories = useCategories();
  const [milestones, setMilestones] = useState<DraftMilestone[]>([
    { ...emptyMilestone, title: "Chuẩn bị và khảo sát" },
    { ...emptyMilestone, title: "Triển khai hoạt động chính" },
    { ...emptyMilestone, title: "Tổng kết và công bố báo cáo" },
  ]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [declared, setDeclared] = useState(false);
  // Sau lần lưu đầu, các lần lưu sau cập nhật đúng bản nháp đó thay vì tạo bản mới
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [savedMilestoneIds, setSavedMilestoneIds] = useState<string[]>([]);
  const [tiers, setTiers] = useState<DraftTier[]>([{ ...emptyTier }]);
  const [savedTierIds, setSavedTierIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [beneficiary, setBeneficiary] = useState<Beneficiary>(initialOrganization ? "organization" : "self");
  const [organization, setOrganization] = useState<PickedOrganization | null>(initialOrganization ?? null);
  // Chỉ gắn tổ chức khi đang chọn "Một tổ chức đã xác minh".
  const pickedOrganization = beneficiary === "organization" ? organization : null;

  const plannedBudget = milestones.reduce((sum, m) => sum + (Number(m.budget) || 0), 0);
  const target = Number(draft.target) || 0;
  const storyLength = htmlToText(draft.story).length;
  // Lĩnh vực đã chọn nhưng admin vừa tắt: vẫn hiện để người dùng thấy và đổi.
  const categoryChoices = draft.category && !categories.includes(draft.category) ? [...categories, draft.category] : categories;

  const checks = useMemo(
    () => [
      { ok: draft.title.trim().length >= 10, label: "Tên chiến dịch rõ ràng (từ 10 ký tự)" },
      { ok: draft.summary.trim().length > 0, label: "Có mô tả ngắn hiển thị ở danh sách" },
      { ok: storyLength >= MIN_STORY, label: `Câu chuyện đủ chi tiết (từ ${MIN_STORY} ký tự)` },
      { ok: htmlToText(draft.budget).length > 0, label: "Có dự toán sử dụng vốn" },
      { ok: htmlToText(draft.risks).length > 0, label: "Có nêu rủi ro và phương án ứng phó" },
      { ok: milestones.filter((m) => m.title.trim()).length >= 2, label: "Kế hoạch có ít nhất 2 mốc" },
      {
        ok: target > 0 && plannedBudget > 0 && Math.abs(plannedBudget - target) / target <= 0.1,
        label: "Tổng ngân sách các mốc khớp mục tiêu (lệch không quá 10%)",
      },
      { ok: isImageValue(draft.imageUrl), label: "Có ảnh đại diện cho dự án" },
    ],
    [draft, milestones, plannedBudget, storyLength, target],
  );
  const passed = checks.filter((check) => check.ok).length;

  const update = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice("");
  };

  const updateMilestone = (index: number, key: keyof DraftMilestone, value: string) => {
    setMilestones((current) => current.map((m, i) => (i === index ? { ...m, [key]: value } : m)));
    setNotice("");
  };

  /** Lỗi của một bước; `forDraft` chỉ đòi các trường bắt buộc để lưu nháp (bước câu chuyện chỉ cần tên). */
  const validateStep = (index: number, forDraft = false): string => {
    if (index === STEP_BASICS) {
      if (beneficiary === "organization" && !organization) return "Vui lòng chọn tổ chức bạn gây quỹ cho.";
      if (!draft.location.trim()) return "Vui lòng chọn tỉnh/thành nơi thực hiện dự án.";
      if (!draft.category) return "Vui lòng chọn lĩnh vực của dự án.";
    }
    if (index === STEP_GOAL) {
      if (target < MIN_TARGET) return "Mục tiêu tối thiểu là 1.000.000 ₫.";
      if (!draft.deadline) return "Vui lòng chọn ngày kết thúc gây quỹ.";
      if (draft.deadline < minDeadline()) return "Ngày kết thúc phải cách hôm nay ít nhất 1 tháng.";
    }
    if (index === STEP_IMAGE) {
      if (draft.imageUrl.trim() && !isImageValue(draft.imageUrl.trim())) return "Link ảnh phải bắt đầu bằng http:// hoặc https://";
    }
    if (index === STEP_STORY) {
      if (!draft.title.trim()) return "Vui lòng đặt tên cho chiến dịch.";
      if (!forDraft && storyLength < MIN_STORY) return `Câu chuyện cần ít nhất ${MIN_STORY} ký tự.`;
    }
    if (index === STEP_BUDGET && !forDraft) {
      if (!htmlToText(draft.budget) || !htmlToText(draft.risks)) return "Vui lòng nhập dự toán sử dụng vốn và rủi ro.";
    }
    if (index === STEP_MILESTONES) return validateMilestones(milestones);
    if (index === STEP_REWARDS) return validateTiers(tiers);
    return "";
  };

  /** Bước đầu tiên còn lỗi (để nhảy tới đó), hoặc null nếu tất cả hợp lệ. */
  const firstInvalid = (forDraft: boolean): { index: number; message: string } | null => {
    for (let index = 0; index < LAST_STEP; index += 1) {
      const message = validateStep(index, forDraft);
      if (message) return { index, message };
    }
    return null;
  };

  const goTo = (index: number) => {
    setError("");
    setStep(Math.max(0, Math.min(LAST_STEP, index)));
  };

  const goNext = () => {
    const message = validateStep(step);
    setError(message);
    if (!message) setStep((current) => Math.min(LAST_STEP, current + 1));
  };

  const toPayload = (): CreateCampaignPayload => {
    const deadline = new Date(`${draft.deadline}T23:59:59`);
    if (Number.isNaN(deadline.getTime())) throw new Error("Vui lòng chọn ngày kết thúc trước khi lưu.");
    // Mô tả lưu dạng HTML: mô tả ngắn (đoạn đầu, dùng làm tóm tắt) + các phần từ trình soạn thảo.
    const parts = [draft.summary.trim() ? `<p>${escapeHtml(draft.summary.trim())}</p>` : "", draft.story.trim()];
    if (htmlToText(draft.budget)) parts.push(`<h3>Kế hoạch sử dụng vốn</h3>${draft.budget.trim()}`);
    if (htmlToText(draft.risks)) parts.push(`<h3>Rủi ro và phương án ứng phó</h3>${draft.risks.trim()}`);
    return {
      title: draft.title.trim(),
      category: draft.category,
      goalAmount: target,
      endDate: deadline.toISOString(),
      location: draft.location.trim(),
      description: parts.filter(Boolean).join("\n"),
      ...(isImageValue(draft.imageUrl.trim()) ? { imageUrl: draft.imageUrl.trim() } : {}),
      // Bản nháp đã lưu: gửi null để bỏ gắn khi người dùng đổi sang gây quỹ cho dự án của mình.
      ...(pickedOrganization ? { organizationId: pickedOrganization.id } : campaignId ? { organizationId: null } : {}),
    };
  };

  /** Tạo mới hoặc cập nhật bản nháp; mốc được thay thế toàn bộ để khớp với form. */
  const persist = async (): Promise<string> => {
    const payload = toPayload();
    const id = campaignId ?? (await createCampaign(payload)).id;
    if (campaignId) await updateCampaign(campaignId, payload);
    setCampaignId(id);

    await Promise.all(savedMilestoneIds.map((milestoneId) => deleteMilestone(milestoneId)));
    const payloads = milestones
      .map((m, index): CreateMilestonePayload | null => {
        if (!m.title.trim()) return null;
        return {
          title: m.title.trim(),
          sortOrder: index,
          ...(m.deadline ? { targetDate: new Date(`${m.deadline}T23:59:59`).toISOString() } : {}),
          ...(m.budget ? { budget: Number(m.budget) } : {}),
          ...(m.output.trim() ? { description: m.output.trim() } : {}),
        };
      })
      .filter((payloadItem): payloadItem is CreateMilestonePayload => payloadItem !== null);
    // Tạo lần lượt để backend kiểm tra thứ tự hạn các mốc trên dữ liệu đầy đủ.
    const createdIds: string[] = [];
    for (const payloadItem of payloads) {
      createdIds.push((await createMilestone(id, payloadItem)).id);
    }
    setSavedMilestoneIds(createdIds);

    // Bản nháp chưa ai ủng hộ nên thay thế toàn bộ mức quà giống mốc.
    await Promise.all(savedTierIds.map((tierId) => deleteRewardTier(tierId)));
    const createdTiers = await Promise.all(tiersToPayloads(tiers).map((payloadItem) => createRewardTier(id, payloadItem)));
    setSavedTierIds(createdTiers.map((tier) => tier.id));
    return id;
  };

  const requireLogin = () => {
    if (user) return false;
    router.push("/dang-nhap?next=/tao-chien-dich");
    return true;
  };

  const saveDraft = async () => {
    if (requireLogin()) return;
    const invalid = firstInvalid(true);
    if (invalid) {
      setError(invalid.message);
      setStep(invalid.index);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await persist();
      setNotice("Đã lưu bản nháp. Bạn có thể tiếp tục chỉnh sửa và gửi duyệt ở bước cuối.");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    if (step < LAST_STEP) {
      goNext();
      return;
    }
    if (requireLogin()) return;
    const invalid = firstInvalid(false);
    if (invalid) {
      setError(invalid.message);
      setStep(invalid.index);
      return;
    }
    if (!declared) {
      setError("Vui lòng xác nhận cam kết trước khi gửi duyệt.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const id = await persist();
      await submitCampaign(id);
      setSubmitted(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const done = submitted && campaignId;
  const side = done
    ? { title: "Cảm ơn bạn đã gửi hồ sơ", intro: "Chúng tôi sẽ thông báo cho bạn ngay khi có kết quả xét duyệt." }
    : STEPS[step];

  if (redirecting) return null;

  return (
    <div className="create-shell">
      <aside className="create-side">
        <Link className="create-logo" href="/" aria-label="Góp Mầm – Trang chủ">
          <LogoMark size={36} />
        </Link>
        <div className="create-side-copy">
          {!done && <p className="create-step-count">Bước {step + 1}/{STEPS.length}</p>}
          <h1>{side.title}</h1>
          <p>{side.intro}</p>
        </div>
        {!done && (
          <p className="create-side-meta">
            Hồ sơ đạt <b>{passed}/{checks.length}</b> tiêu chí
            {campaignId && <> · Đã lưu nháp</>}
          </p>
        )}
      </aside>

      <section className="create-main">
        <div className="create-top">
          {user ? (
            <Link href="/dashboard">Trang quản lý</Link>
          ) : (
            <Link href="/dang-nhap?next=/tao-chien-dich">Đăng nhập</Link>
          )}
        </div>

        {done ? (
          <div className="create-body create-done" aria-live="polite">
            <span className="done-icon"><Icon name="check" size={30} /></span>
            <h2>Đã gửi hồ sơ, đang chờ kiểm duyệt</h2>
            <p>Quản trị viên sẽ duyệt, yêu cầu bổ sung hoặc từ chối kèm lý do. Bạn theo dõi trạng thái trong trang quản lý.</p>
            <div className="wizard-done-actions">
              <Link className="button button-primary" href="/dashboard">Về trang quản lý</Link>
              <Link className="button button-outline" href={`/du-an/${campaignId}`}>Xem hồ sơ</Link>
            </div>
          </div>
        ) : (
          <form ref={formRef} className="create-form" tabIndex={-1} onSubmit={submit} noValidate aria-label={STEPS[step].title}>
            <div className="create-body">
              {!user && step === STEP_BASICS && (
                <p className="create-login-hint">
                  Bạn có thể soạn trước; cần <Link href="/dang-nhap?next=/tao-chien-dich">đăng nhập</Link> để lưu nháp hoặc gửi duyệt.
                </p>
              )}

              {step === STEP_BASICS && (
                <>
                  <fieldset className="create-q">
                    <legend>Bạn gây quỹ cho ai?</legend>
                    <div className="create-beneficiary">
                      <button
                        type="button"
                        aria-pressed={beneficiary === "self"}
                        onClick={() => {
                          setBeneficiary("self");
                          setNotice("");
                        }}
                      >
                        <Icon name="user" size={22} />
                        <b>Dự án của tôi</b>
                        <small>Bạn hoặc nhóm của bạn trực tiếp thực hiện dự án.</small>
                      </button>
                      <button
                        type="button"
                        aria-pressed={beneficiary === "organization"}
                        onClick={() => {
                          setBeneficiary("organization");
                          setNotice("");
                        }}
                      >
                        <Icon name="shield" size={22} />
                        <b>Một tổ chức đã xác minh</b>
                        <small>Gây quỹ cho quỹ, tổ chức xã hội nhân dịp sinh nhật, sự kiện hay tưởng nhớ.</small>
                      </button>
                    </div>
                    {beneficiary === "organization" && (
                      <OrganizationPicker
                        value={organization}
                        disabled={busy}
                        onChange={(next) => {
                          setOrganization(next);
                          setNotice("");
                        }}
                      />
                    )}
                  </fieldset>
                  <div className="create-q">
                    <label htmlFor="create-location">Dự án được thực hiện ở đâu?</label>
                    <p>Chọn tỉnh/thành nơi dự án diễn ra.</p>
                    <select id="create-location" value={draft.location} onChange={(e) => update("location", e.target.value)}>
                      <option value="" disabled>Chọn tỉnh/thành</option>
                      {PROVINCES.map((province) => <option key={province}>{province}</option>)}
                    </select>
                  </div>
                  <fieldset className="create-q">
                    <legend>Lĩnh vực nào mô tả đúng nhất dự án của bạn?</legend>
                    <div className="create-chips">
                      {categoryChoices.map((category) => (
                        <button
                          aria-pressed={draft.category === category}
                          className="create-chip"
                          key={category}
                          type="button"
                          onClick={() => update("category", category)}
                        >
                          {category}
                          {!categories.includes(category) && " (đã ngừng nhận dự án mới)"}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              {step === STEP_GOAL && (
                <>
                  <div className="create-q">
                    <label htmlFor="create-target">Bạn cần huy động bao nhiêu?</label>
                    <p>Tối thiểu 1.000.000 ₫. Tổng ngân sách các mốc ở bước sau nên khớp với con số này.</p>
                    <MoneyInput id="create-target" value={draft.target} placeholder="50.000.000đ" onChange={(digits) => update("target", digits)} />
                  </div>
                  <div className="create-q">
                    <label htmlFor="create-deadline">Khi nào kết thúc gây quỹ?</label>
                    <p>Cách hôm nay ít nhất 1 tháng.</p>
                    <input id="create-deadline" type="date" min={minDeadline()} value={draft.deadline} onChange={(e) => update("deadline", e.target.value)} />
                  </div>
                </>
              )}

              {step === STEP_IMAGE && (
                <div className="create-q">
                  <ImageUploader
                    label="Ảnh đại diện"
                    value={draft.imageUrl}
                    onChange={(url) => update("imageUrl", url)}
                    disabled={busy}
                    hint="Bỏ trống sẽ dùng ảnh minh họa theo lĩnh vực."
                  />
                </div>
              )}

              {step === STEP_STORY && (
                <>
                  <div className="create-q">
                    <label htmlFor="create-title">Đặt tên cho chiến dịch</label>
                    <input id="create-title" value={draft.title} maxLength={200} placeholder="Ví dụ: Thư viện nhỏ cho điểm trường vùng cao" onChange={(e) => update("title", e.target.value)} />
                    <small>{draft.title.length}/200</small>
                  </div>
                  <div className="create-q">
                    <label htmlFor="create-summary">Mô tả ngắn</label>
                    <p>Tác động chính của dự án trong 1–2 câu, hiển thị ở danh sách dự án.</p>
                    <textarea id="create-summary" rows={3} maxLength={220} value={draft.summary} onChange={(e) => update("summary", e.target.value)} />
                    <small>{draft.summary.length}/220</small>
                  </div>
                  <div className="create-q">
                    <span className="create-q-label">Câu chuyện dự án</span>
                    <RichTextEditor value={draft.story} placeholder="Vấn đề là gì, ai được hưởng lợi, dự án giải quyết bằng cách nào…" disabled={busy} onChange={(html) => update("story", html)} />
                    <small>{storyLength}/{MIN_STORY} ký tự tối thiểu</small>
                  </div>
                </>
              )}

              {step === STEP_BUDGET && (
                <>
                  <div className="create-q">
                    <span className="create-q-label">Dự toán sử dụng vốn</span>
                    <p>Hạng mục, số tiền và căn cứ ước tính.</p>
                    <RichTextEditor value={draft.budget} placeholder="Ví dụ: Mua 500 đầu sách – 25.000.000 ₫ (theo báo giá nhà sách)" disabled={busy} onChange={(html) => update("budget", html)} />
                  </div>
                  <div className="create-q">
                    <span className="create-q-label">Rủi ro và phương án ứng phó</span>
                    <p>Rủi ro về tiến độ, chi phí, vận hành và cách bạn xử lý.</p>
                    <RichTextEditor value={draft.risks} placeholder="Ví dụ: Giá sách tăng – ưu tiên đầu sách thiết yếu, kêu gọi tặng sách cũ" disabled={busy} onChange={(html) => update("risks", html)} />
                  </div>
                </>
              )}

              {step === STEP_MILESTONES && (
                <div className="form">
                  {milestones.map((milestone, index) => (
                    <fieldset className="milestone" key={index}>
                      <legend>Mốc {index + 1}</legend>
                      <div className="field-row">
                        <label className="field field-span-4">
                          <span>Tên mốc</span>
                          <input value={milestone.title} placeholder="Ví dụ: Mua sách và kệ" onChange={(e) => updateMilestone(index, "title", e.target.value)} />
                        </label>
                        <label className="field field-span-2">
                          <span>Hạn hoàn thành</span>
                          <input type="date" min={minMilestoneDate(milestones, index)} value={milestone.deadline} onChange={(e) => updateMilestone(index, "deadline", e.target.value)} />
                        </label>
                        <label className="field field-span-2">
                          <span>Ngân sách (VNĐ)</span>
                          <MoneyInput value={milestone.budget} placeholder="0đ" onChange={(digits) => updateMilestone(index, "budget", digits)} />
                        </label>
                        <label className="field field-span-4">
                          <span>Kết quả đầu ra</span>
                          <input value={milestone.output} placeholder="Sản phẩm hoặc chỉ số có thể kiểm chứng" onChange={(e) => updateMilestone(index, "output", e.target.value)} />
                        </label>
                      </div>
                      {milestones.length > 1 && (
                        <button className="link-danger" type="button" onClick={() => setMilestones((c) => c.filter((_, i) => i !== index))}>
                          Xóa mốc này
                        </button>
                      )}
                    </fieldset>
                  ))}
                  <div className="milestone-foot">
                    <button className="button button-outline" type="button" onClick={() => setMilestones((c) => [...c, { ...emptyMilestone }])}>
                      + Thêm mốc
                    </button>
                    <span>Tổng ngân sách các mốc: <b>{plannedBudget.toLocaleString("vi-VN")} ₫</b>{target > 0 && ` / mục tiêu ${target.toLocaleString("vi-VN")} ₫`}</span>
                  </div>
                </div>
              )}

              {step === STEP_REWARDS && (
                <RewardTiersEditor tiers={tiers} onChange={(next) => { setTiers(next); setNotice(""); }} />
              )}

              {step === LAST_STEP && (
                <div className="form">
                  <dl className="review-grid">
                    <div><dt>Tên chiến dịch</dt><dd>{draft.title || "—"}</dd></div>
                    <div><dt>Gây quỹ cho</dt><dd>{pickedOrganization ? pickedOrganization.name : "Dự án của tôi"}</dd></div>
                    <div><dt>Lĩnh vực</dt><dd>{draft.category || "—"}</dd></div>
                    <div><dt>Địa điểm</dt><dd>{draft.location || "—"}</dd></div>
                    <div><dt>Mục tiêu</dt><dd>{target ? `${target.toLocaleString("vi-VN")} ₫` : "—"}</dd></div>
                    <div><dt>Ngày kết thúc</dt><dd>{draft.deadline ? new Date(draft.deadline).toLocaleDateString("vi-VN") : "—"}</dd></div>
                    <div><dt>Số mốc</dt><dd>{milestones.filter((m) => m.title.trim()).length}</dd></div>
                    <div><dt>Mức quà</dt><dd>{tiersToPayloads(tiers).length || "Không có"}</dd></div>
                  </dl>
                  <div className="checklist-box">
                    <h3>Tiêu chí hồ sơ ({passed}/{checks.length})</h3>
                    <ul>
                      {checks.map((check) => (
                        <li className={check.ok ? "is-ok" : ""} key={check.label}>
                          <Icon name={check.ok ? "check" : "clock"} size={15} /> {check.label}
                        </li>
                      ))}
                    </ul>
                    <p className="hint">Đây là danh sách tự kiểm tra, không phải điểm chấm. Quản trị viên là người quyết định duyệt hồ sơ.</p>
                  </div>
                  <label className="check-row">
                    <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
                    <span>Tôi xác nhận thông tin là trung thực và cam kết báo cáo tiến độ, chi tiêu theo kế hoạch đã nêu.</span>
                  </label>
                </div>
              )}

              {error && <p className="form-error" role="alert">{error}</p>}
              {notice && <p className="form-notice" role="status">{notice}</p>}
            </div>

            <div className="create-bar">
              <div
                className="create-progress"
                role="progressbar"
                aria-label="Tiến độ soạn hồ sơ"
                aria-valuemin={1}
                aria-valuemax={STEPS.length}
                aria-valuenow={step + 1}
              >
                <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
              </div>
              <div className="create-bar-inner">
                {step > 0 ? (
                  <button className="create-back" type="button" disabled={busy} aria-label="Quay lại bước trước" onClick={() => goTo(step - 1)}>
                    <Icon name="arrow-right" size={20} className="icon-flip" />
                  </button>
                ) : (
                  <span />
                )}
                <div className="create-bar-actions">
                  <button className="button button-ghost" type="button" disabled={busy} onClick={() => void saveDraft()}>Lưu nháp</button>
                  <button className="button button-primary create-next" type="submit" disabled={busy}>
                    {busy ? "Đang lưu…" : step === LAST_STEP ? "Gửi duyệt" : "Tiếp tục"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
