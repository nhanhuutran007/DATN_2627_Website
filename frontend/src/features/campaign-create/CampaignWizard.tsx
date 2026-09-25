"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";
import {
  createCampaign,
  submitCampaign,
  updateCampaign,
  type CreateCampaignPayload,
} from "@/lib/api/campaigns";
import {
  createMilestone,
  deleteMilestone,
  type CreateMilestonePayload,
} from "@/lib/api/progress";
import { useAuthUser } from "@/lib/auth";

const STEPS = [
  { title: "Thông tin cơ bản", hint: "Tên, lĩnh vực, mục tiêu, thời hạn" },
  { title: "Câu chuyện & ngân sách", hint: "Vấn đề, cách làm, dự toán, rủi ro" },
  { title: "Kế hoạch theo mốc", hint: "Các đầu ra có hạn và ngân sách" },
  { title: "Kiểm tra & gửi duyệt", hint: "Rà soát trước khi gửi" },
];

const CATEGORIES = ["Giáo dục", "Môi trường", "Nông nghiệp", "Y tế", "Khởi nghiệp", "Công nghệ"];

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
  category: "Giáo dục",
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

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử tiếp.";
    if (error.status === 400) return `Dữ liệu chưa hợp lệ: ${error.message}`;
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Không kết nối được máy chủ. Vui lòng thử lại.";
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function CampaignWizard() {
  const router = useRouter();
  const user = useAuthUser();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
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
  const [submitted, setSubmitted] = useState(false);

  const plannedBudget = milestones.reduce((sum, m) => sum + (Number(m.budget) || 0), 0);
  const target = Number(draft.target) || 0;

  const checks = useMemo(
    () => [
      { ok: draft.title.trim().length >= 10, label: "Tên chiến dịch rõ ràng (từ 10 ký tự)" },
      { ok: draft.summary.trim().length > 0, label: "Có mô tả ngắn hiển thị ở danh sách" },
      { ok: draft.story.trim().length >= MIN_STORY, label: `Câu chuyện đủ chi tiết (từ ${MIN_STORY} ký tự)` },
      { ok: draft.budget.trim().length > 0, label: "Có dự toán sử dụng vốn" },
      { ok: draft.risks.trim().length > 0, label: "Có nêu rủi ro và phương án ứng phó" },
      { ok: milestones.filter((m) => m.title.trim()).length >= 2, label: "Kế hoạch có ít nhất 2 mốc" },
      {
        ok: target > 0 && plannedBudget > 0 && Math.abs(plannedBudget - target) / target <= 0.1,
        label: "Tổng ngân sách các mốc khớp mục tiêu (lệch không quá 10%)",
      },
      { ok: isHttpUrl(draft.imageUrl), label: "Có ảnh đại diện cho dự án" },
    ],
    [draft, milestones, plannedBudget, target],
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

  const validateStep = (index: number): string => {
    if (index === 0) {
      if (!draft.title.trim() || !draft.location.trim() || !draft.deadline) return "Vui lòng nhập tên, địa điểm và ngày kết thúc.";
      if (target < MIN_TARGET) return "Mục tiêu tối thiểu là 1.000.000 ₫.";
      if (new Date(`${draft.deadline}T23:59:59`).getTime() <= Date.now()) return "Ngày kết thúc phải ở tương lai.";
      if (draft.imageUrl.trim() && !isHttpUrl(draft.imageUrl.trim())) return "Link ảnh phải bắt đầu bằng http:// hoặc https://";
    }
    if (index === 1) {
      if (draft.story.trim().length < MIN_STORY) return `Câu chuyện cần ít nhất ${MIN_STORY} ký tự.`;
      if (!draft.budget.trim() || !draft.risks.trim()) return "Vui lòng nhập dự toán sử dụng vốn và rủi ro.";
    }
    return "";
  };

  const goNext = () => {
    const message = validateStep(step);
    setError(message);
    if (!message) setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const toPayload = (): CreateCampaignPayload => {
    const deadline = new Date(`${draft.deadline}T23:59:59`);
    if (Number.isNaN(deadline.getTime())) throw new Error("Vui lòng chọn ngày kết thúc trước khi lưu.");
    const parts = [draft.summary.trim(), draft.story.trim()];
    if (draft.budget.trim()) parts.push(`Kế hoạch sử dụng vốn:\n${draft.budget.trim()}`);
    if (draft.risks.trim()) parts.push(`Rủi ro và phương án ứng phó:\n${draft.risks.trim()}`);
    return {
      title: draft.title.trim(),
      category: draft.category,
      goalAmount: target,
      endDate: deadline.toISOString(),
      location: draft.location.trim(),
      description: parts.filter(Boolean).join("\n\n"),
      ...(isHttpUrl(draft.imageUrl.trim()) ? { imageUrl: draft.imageUrl.trim() } : {}),
    };
  };

  /** Tạo mới hoặc cập nhật bản nháp; mốc được thay thế toàn bộ để khớp với form. */
  const persist = async (): Promise<string> => {
    const payload = toPayload();
    const id = campaignId ?? (await createCampaign(payload)).id;
    if (campaignId) await updateCampaign(campaignId, payload);
    setCampaignId(id);

    await Promise.all(savedMilestoneIds.map((milestoneId) => deleteMilestone(milestoneId)));
    const created = await Promise.all(
      milestones
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
        .filter((payloadItem): payloadItem is CreateMilestonePayload => payloadItem !== null)
        .map((payloadItem) => createMilestone(id, payloadItem)),
    );
    setSavedMilestoneIds(created.map((milestone) => milestone.id));
    return id;
  };

  const requireLogin = () => {
    if (user) return false;
    router.push("/dang-nhap?next=/tao-chien-dich");
    return true;
  };

  const saveDraft = async () => {
    if (requireLogin()) return;
    const message = validateStep(0);
    if (message) {
      setError(message);
      setStep(0);
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
    if (step < STEPS.length - 1) {
      goNext();
      return;
    }
    if (requireLogin()) return;
    const firstInvalid = [0, 1].map(validateStep).find(Boolean);
    if (firstInvalid) {
      setError(firstInvalid);
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

  if (submitted && campaignId) {
    return (
      <section className="panel wizard-done" aria-live="polite">
        <span className="done-icon"><Icon name="check" size={30} /></span>
        <h2>Đã gửi hồ sơ, đang chờ kiểm duyệt</h2>
        <p>Quản trị viên sẽ duyệt, yêu cầu bổ sung hoặc từ chối kèm lý do. Bạn theo dõi trạng thái trong trang quản lý.</p>
        <div className="wizard-done-actions">
          <Link className="button button-primary" href="/dashboard">Về trang quản lý</Link>
          <Link className="button button-outline" href={`/du-an/${campaignId}`}>Xem hồ sơ</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="wizard">
      <aside className="wizard-steps panel">
        <h2 className="panel-title-sm">Các bước</h2>
        <ol>
          {STEPS.map((item, index) => (
            <li className={index === step ? "is-current" : index < step ? "is-done" : ""} key={item.title}>
              <button type="button" disabled={index > step} onClick={() => { setError(""); setStep(index); }}>
                <span className="wizard-no">{index < step ? <Icon name="check" size={14} /> : index + 1}</span>
                <span><b>{item.title}</b><small>{item.hint}</small></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="wizard-progress">
          <span>Hồ sơ đạt <b>{passed}/{checks.length}</b> tiêu chí</span>
          <div className="meter"><span style={{ width: `${(passed / checks.length) * 100}%` }} /></div>
        </div>
        {!user && <p className="hint">Bạn cần đăng nhập để lưu nháp hoặc gửi hồ sơ.</p>}
        {campaignId && <p className="hint">Bản nháp đã lưu. Các lần lưu sau sẽ cập nhật bản nháp này.</p>}
      </aside>

      <form className="panel wizard-form" onSubmit={submit} noValidate>
        <p className="wizard-count">Bước {step + 1}/{STEPS.length}</p>
        <h2>{STEPS[step].title}</h2>

        {step === 0 && (
          <div className="form">
            <label className="field">
              <span>Tên chiến dịch *</span>
              <input value={draft.title} maxLength={200} placeholder="Ví dụ: Thư viện nhỏ cho điểm trường vùng cao" onChange={(e) => update("title", e.target.value)} />
              <small>{draft.title.length}/200</small>
            </label>
            <div className="field-row">
              <label className="field">
                <span>Lĩnh vực *</span>
                <select value={draft.category} onChange={(e) => update("category", e.target.value)}>
                  {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Địa điểm thực hiện *</span>
                <input value={draft.location} placeholder="Huyện, tỉnh/thành" onChange={(e) => update("location", e.target.value)} />
              </label>
              <label className="field">
                <span>Mục tiêu (VNĐ) *</span>
                <input type="number" min={MIN_TARGET} step={100000} value={draft.target} placeholder="50000000" onChange={(e) => update("target", e.target.value)} />
                {target > 0 && <small>{target.toLocaleString("vi-VN")} ₫</small>}
              </label>
              <label className="field">
                <span>Ngày kết thúc *</span>
                <input type="date" value={draft.deadline} onChange={(e) => update("deadline", e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>Link ảnh đại diện</span>
              <input type="url" value={draft.imageUrl} placeholder="https://…/anh-du-an.jpg" onChange={(e) => update("imageUrl", e.target.value)} />
              <small>Ảnh thật của dự án giúp người ủng hộ tin tưởng hơn. Bỏ trống sẽ dùng ảnh minh họa theo lĩnh vực.</small>
            </label>
            <label className="field">
              <span>Mô tả ngắn</span>
              <textarea rows={3} maxLength={220} value={draft.summary} placeholder="Tác động chính của dự án trong 1–2 câu" onChange={(e) => update("summary", e.target.value)} />
              <small>{draft.summary.length}/220</small>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="form">
            <label className="field">
              <span>Câu chuyện dự án *</span>
              <textarea rows={8} value={draft.story} placeholder="Vấn đề là gì, ai được hưởng lợi, dự án giải quyết bằng cách nào…" onChange={(e) => update("story", e.target.value)} />
              <small>{draft.story.trim().length}/{MIN_STORY} ký tự tối thiểu</small>
            </label>
            <div className="field-row field-row-2">
              <label className="field">
                <span>Dự toán sử dụng vốn *</span>
                <textarea rows={6} value={draft.budget} placeholder="Hạng mục, số tiền và căn cứ ước tính" onChange={(e) => update("budget", e.target.value)} />
              </label>
              <label className="field">
                <span>Rủi ro và phương án ứng phó *</span>
                <textarea rows={6} value={draft.risks} placeholder="Rủi ro về tiến độ, chi phí, vận hành…" onChange={(e) => update("risks", e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form">
            <p className="hint">Mỗi mốc là một đầu ra kiểm chứng được. Sau khi dự án được duyệt, bạn báo cáo tiến độ và chi tiêu theo từng mốc.</p>
            {milestones.map((milestone, index) => (
              <fieldset className="milestone" key={index}>
                <legend>Mốc {index + 1}</legend>
                <div className="field-row">
                  <label className="field field-span-2">
                    <span>Tên mốc</span>
                    <input value={milestone.title} placeholder="Ví dụ: Mua sách và kệ" onChange={(e) => updateMilestone(index, "title", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Hạn hoàn thành</span>
                    <input type="date" value={milestone.deadline} onChange={(e) => updateMilestone(index, "deadline", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Ngân sách (VNĐ)</span>
                    <input type="number" min={0} value={milestone.budget} placeholder="0" onChange={(e) => updateMilestone(index, "budget", e.target.value)} />
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

        {step === 3 && (
          <div className="form">
            <dl className="review-grid">
              <div><dt>Tên chiến dịch</dt><dd>{draft.title || "—"}</dd></div>
              <div><dt>Lĩnh vực</dt><dd>{draft.category}</dd></div>
              <div><dt>Địa điểm</dt><dd>{draft.location || "—"}</dd></div>
              <div><dt>Mục tiêu</dt><dd>{target ? `${target.toLocaleString("vi-VN")} ₫` : "—"}</dd></div>
              <div><dt>Ngày kết thúc</dt><dd>{draft.deadline ? new Date(draft.deadline).toLocaleDateString("vi-VN") : "—"}</dd></div>
              <div><dt>Số mốc</dt><dd>{milestones.filter((m) => m.title.trim()).length}</dd></div>
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

        <div className="wizard-actions">
          <button className="button button-outline" type="button" disabled={step === 0 || busy} onClick={() => { setError(""); setStep((c) => Math.max(0, c - 1)); }}>
            Quay lại
          </button>
          <div>
            <button className="button button-ghost" type="button" disabled={busy} onClick={saveDraft}>Lưu nháp</button>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? "Đang lưu…" : step === STEPS.length - 1 ? "Gửi duyệt" : "Tiếp tục"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
