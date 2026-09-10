"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";
import { createCampaign, submitCampaign, type ApiCampaign } from "@/lib/api/campaigns";
import type { CreateMilestonePayload } from "@/lib/api/progress";
import { createMilestone } from "@/lib/api/progress";
import { useAuthUser } from "@/lib/auth";

const steps = ["Thông tin cơ bản", "Câu chuyện & ngân sách", "Mốc thực hiện", "Kiểm tra & gửi duyệt"];

type DraftMilestone = {
  title: string;
  deadline: string;
  budget: string;
  output: string;
};

type Draft = {
  title: string;
  category: string;
  location: string;
  target: string;
  deadline: string;
  summary: string;
  story: string;
  budget: string;
  risks: string;
};

const initialMilestones: DraftMilestone[] = [
  { title: "Chuẩn bị và khảo sát", deadline: "", budget: "", output: "" },
  { title: "Triển khai hoạt động chính", deadline: "", budget: "", output: "" },
  { title: "Đánh giá và công bố báo cáo", deadline: "", budget: "", output: "" },
];

const initialDraft: Draft = {
  title: "",
  category: "Môi trường",
  location: "",
  target: "",
  deadline: "",
  summary: "",
  story: "",
  budget: "",
  risks: "",
};

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại và thử tiếp.";
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Không kết nối được hệ thống. Vui lòng kiểm tra backend và thử lại.";
}

export function CampaignWizard() {
  const router = useRouter();
  const user = useAuthUser();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
  const [milestones, setMilestones] = useState<DraftMilestone[]>(initialMilestones);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const completion = useMemo(() => {
    const filled = Object.values(draft).filter((value) => value.trim()).length;
    return Math.round((filled / Object.keys(draft).length) * 100);
  }, [draft]);

  const update = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice("");
  };

  const updateMilestone = (index: number, key: keyof DraftMilestone, value: string) => {
    setMilestones((current) =>
      current.map((milestone, i) => (i === index ? { ...milestone, [key]: value } : milestone)),
    );
    setNotice("");
  };

  const addMilestone = () => {
    setMilestones((current) => [...current, { title: "", deadline: "", budget: "", output: "" }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones((current) => current.filter((_, i) => i !== index));
  };

  const saveMilestones = async (campaignId: string): Promise<void> => {
    const valid = milestones
      .map((milestone, index) => {
        if (!milestone.title.trim()) return null;
        let targetDate: string | undefined;
        if (milestone.deadline) {
          targetDate = new Date(`${milestone.deadline}T23:59:59`).toISOString();
        }
        const budget = milestone.budget ? Number(milestone.budget) : undefined;
        const payload: CreateMilestonePayload = {
          title: milestone.title.trim(),
          targetDate,
          budget,
          sortOrder: index,
        };
        if (milestone.output.trim()) payload.description = milestone.output.trim();
        return payload;
      })
      .filter((item): item is CreateMilestonePayload => item !== null);

    await Promise.all(valid.map((payload) => createMilestone(campaignId, payload)));
  };

  const validateCurrentStep = () => {
    if (step === 0 && (!draft.title.trim() || !draft.location.trim() || Number(draft.target) < 1_000_000 || !draft.deadline)) {
      setError("Vui lòng nhập tên, địa điểm, thời hạn và mục tiêu tối thiểu 1.000.000 ₫.");
      return false;
    }
    if (step === 1 && (draft.story.trim().length < 80 || !draft.budget.trim() || !draft.risks.trim())) {
      setError("Câu chuyện cần ít nhất 80 ký tự; kế hoạch ngân sách và rủi ro là bắt buộc.");
      return false;
    }
    setError("");
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep()) setStep((current) => Math.min(steps.length - 1, current + 1));
  };

  const toPayload = () => {
    const deadline = new Date(`${draft.deadline}T23:59:59`);
    if (Number.isNaN(deadline.getTime())) {
      throw new Error("Vui lòng chọn ngày kết thúc trước khi lưu hồ sơ.");
    }
    const parts = [draft.summary.trim(), draft.story.trim()];
    if (draft.budget.trim()) parts.push(`Kế hoạch sử dụng vốn:\n${draft.budget.trim()}`);
    if (draft.risks.trim()) parts.push(`Rủi ro và phương án ứng phó:\n${draft.risks.trim()}`);
    return {
      title: draft.title.trim(),
      category: draft.category,
      goalAmount: Number(draft.target),
      endDate: deadline.toISOString(),
      location: draft.location.trim(),
      description: parts.filter(Boolean).join("\n\n"),
    };
  };

  const saveDraft = async () => {
    if (!user) {
      router.push("/dang-nhap?next=/tao-chien-dich");
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const campaign = await createCampaign(toPayload());
      await saveMilestones(campaign.id);
      setNotice("Bản nháp đã được lưu trên hệ thống. Bạn có thể tiếp tục hoàn thiện hoặc gửi duyệt ở bước cuối.");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    if (step < steps.length - 1) {
      nextStep();
      return;
    }
    setError("");
    if (!user) {
      router.push("/dang-nhap?next=/tao-chien-dich");
      return;
    }
    setBusy(true);
    try {
      const campaign: ApiCampaign = await createCampaign(toPayload());
      await saveMilestones(campaign.id);
      await submitCampaign(campaign.id);
      setCreatedId(campaign.id);
      setSubmitted(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <section className="wizard-success" aria-live="polite">
        <span><Icon name="check" size={32} /></span>
        <p className="eyebrow">Hồ sơ đã được gửi</p>
        <h1>Chiến dịch đang chờ kiểm duyệt.</h1>
        <p>Hồ sơ đã được tạo và gửi tới đội ngũ kiểm duyệt. Bạn sẽ nhận thông báo khi chiến dịch được phê duyệt hoặc cần bổ sung.</p>
        <div>
          {createdId ? (
            <Link className="button button-primary" href={`/du-an/${createdId}`}>Xem hồ sơ dự án</Link>
          ) : null}
          <Link className="button button-outline" href="/dashboard">Về trang quản lý</Link>
          <button className="button button-outline" type="button" onClick={() => { setSubmitted(false); setStep(0); }}>Tạo chiến dịch khác</button>
        </div>
      </section>
    );
  }

  return (
    <div className="wizard-shell">
      <aside className="wizard-sidebar">
        <div>
          <p className="eyebrow">Tạo chiến dịch</p>
          <h1>Biến ý tưởng thành một kế hoạch đáng tin.</h1>
          <p>{user ? "Hồ sơ sẽ được lưu trực tiếp vào hệ thống và gửi cho kiểm duyệt viên." : "Bạn cần đăng nhập ở bước cuối để lưu và gửi hồ sơ."}</p>
        </div>
        <ol>
          {steps.map((label, index) => (
            <li className={index === step ? "active" : index < step ? "done" : ""} key={label}>
              <button type="button" disabled={index > step} onClick={() => setStep(index)}>
                <span>{index < step ? <Icon name="check" size={14} /> : index + 1}</span>
                <div><b>{label}</b><small>{index === 0 ? "Mục tiêu và phạm vi" : index === 1 ? "Tác động và sử dụng quỹ" : index === 2 ? "Đầu ra có thể kiểm chứng" : "Xác nhận trách nhiệm"}</small></div>
              </button>
            </li>
          ))}
        </ol>
        <div className="draft-completion"><span><b>Mức hoàn thiện hồ sơ</b><strong>{completion}%</strong></span><i><em style={{ width: `${completion}%` }} /></i><small>AI chỉ đánh giá hỗ trợ sau khi hồ sơ có đủ dữ liệu.</small></div>
      </aside>

      <form className="wizard-form" onSubmit={submit}>
        <div className="wizard-topline"><span>Bước {step + 1} / {steps.length}</span><span><Icon name="shield" size={16} /> Hồ sơ được lưu vào hệ thống khi bạn gửi</span></div>

        {step === 0 && (
          <fieldset className="wizard-fieldset">
            <legend><span>01</span><div><h2>Thông tin cơ bản</h2><p>Giúp cộng đồng hiểu ngay dự án là gì và sẽ diễn ra ở đâu.</p></div></legend>
            <label className="form-field form-field-full"><span>Tên chiến dịch <i>*</i></span><input value={draft.title} maxLength={100} placeholder="Ví dụ: Thư viện nhỏ trên non" onChange={(event) => update("title", event.target.value)} /><small>{draft.title.length}/100 ký tự</small></label>
            <div className="form-grid">
              <label className="form-field"><span>Lĩnh vực <i>*</i></span><select value={draft.category} onChange={(event) => update("category", event.target.value)}><option>Môi trường</option><option>Khởi nghiệp</option><option>Giáo dục</option><option>Y tế</option></select></label>
              <label className="form-field"><span>Địa điểm thực hiện <i>*</i></span><input value={draft.location} placeholder="Quận/huyện, tỉnh/thành" onChange={(event) => update("location", event.target.value)} /></label>
              <label className="form-field"><span>Mục tiêu tài chính (VNĐ) <i>*</i></span><input type="number" min="1000000" value={draft.target} placeholder="200000000" onChange={(event) => update("target", event.target.value)} /></label>
              <label className="form-field"><span>Ngày kết thúc dự kiến <i>*</i></span><input type="date" value={draft.deadline} onChange={(event) => update("deadline", event.target.value)} /></label>
            </div>
            <label className="form-field form-field-full"><span>Mô tả ngắn</span><textarea rows={3} maxLength={220} value={draft.summary} placeholder="Nêu tác động chính trong 1–2 câu..." onChange={(event) => update("summary", event.target.value)} /><small>{draft.summary.length}/220 ký tự</small></label>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="wizard-fieldset">
            <legend><span>02</span><div><h2>Câu chuyện & sử dụng nguồn quỹ</h2><p>Nội dung cụ thể giúp người tài trợ đánh giá dự án công bằng hơn.</p></div></legend>
            <label className="form-field form-field-full"><span>Câu chuyện dự án <i>*</i></span><textarea rows={8} value={draft.story} placeholder="Vấn đề là gì, ai được hưởng lợi, dự án giải quyết bằng cách nào..." onChange={(event) => update("story", event.target.value)} /><small>Tối thiểu 80 ký tự · hiện có {draft.story.length}</small></label>
            <div className="form-grid">
              <label className="form-field"><span>Dự toán sử dụng vốn <i>*</i></span><textarea rows={5} value={draft.budget} placeholder="Hạng mục, số tiền và căn cứ ước tính..." onChange={(event) => update("budget", event.target.value)} /></label>
              <label className="form-field"><span>Rủi ro và phương án ứng phó <i>*</i></span><textarea rows={5} value={draft.risks} placeholder="Rủi ro tiến độ, chi phí, vận hành..." onChange={(event) => update("risks", event.target.value)} /></label>
            </div>
            <div className="upload-zone"><Icon name="document" size={28} /><div><b>Thêm ảnh, video hoặc tài liệu minh chứng</b><span>JPG, PNG, PDF · tối đa 10 MB/tệp</span></div><button className="button button-outline" type="button">Chọn tệp</button></div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="wizard-fieldset">
            <legend><span>03</span><div><h2>Mốc thực hiện</h2><p>Chia dự án thành các đầu ra có thời hạn và ngân sách rõ ràng.</p></div></legend>
            {milestones.map((milestone, index) => (
              <div className="milestone-editor" key={index}>
                <span>{index + 1}</span>
                <div className="form-grid">
                  <label className="form-field form-field-wide"><span>Tên mốc {index + 1}</span><input value={milestone.title} placeholder="Ví dụ: Chuẩn bị và khảo sát" onChange={(event) => updateMilestone(index, "title", event.target.value)} /></label>
                  <label className="form-field"><span>Hạn hoàn thành</span><input type="date" value={milestone.deadline} onChange={(event) => updateMilestone(index, "deadline", event.target.value)} /></label>
                  <label className="form-field"><span>Ngân sách dự kiến</span><input type="number" placeholder="0" value={milestone.budget} onChange={(event) => updateMilestone(index, "budget", event.target.value)} /></label>
                  <label className="form-field form-field-wide"><span>Kết quả đầu ra</span><input value={milestone.output} placeholder="Sản phẩm hoặc chỉ số có thể kiểm chứng" onChange={(event) => updateMilestone(index, "output", event.target.value)} /></label>
                </div>
                {milestones.length > 1 && (
                  <button className="remove-milestone-button" type="button" onClick={() => removeMilestone(index)}>Xóa mốc</button>
                )}
              </div>
            ))}
            <button className="add-milestone-button" type="button" onClick={addMilestone}>+ Thêm mốc công việc</button>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="wizard-fieldset review-fieldset">
            <legend><span>04</span><div><h2>Kiểm tra trước khi gửi</h2><p>AI đưa ra gợi ý hỗ trợ; quản trị viên mới là người quyết định xét duyệt.</p></div></legend>
            <div className="ai-review-card">
              <div className="ai-review-score"><Icon name="sparkles" size={22} /><strong>{Math.max(42, completion)}<small>/100</small></strong><span>Mức hoàn thiện</span></div>
              <div><p className="eyebrow">Gợi ý cải thiện</p><h3>{completion >= 80 ? "Hồ sơ đã có nền tảng tốt" : "Hồ sơ cần bổ sung trước khi gửi"}</h3><ul><li className={draft.story.length >= 80 ? "ok" : ""}><Icon name={draft.story.length >= 80 ? "check" : "clock"} size={15} /> Câu chuyện có bối cảnh và đối tượng hưởng lợi</li><li className={draft.budget ? "ok" : ""}><Icon name={draft.budget ? "check" : "clock"} size={15} /> Dự toán sử dụng vốn có giải thích</li><li><Icon name="clock" size={15} /> Nên bổ sung ít nhất 3 hình ảnh minh chứng</li></ul></div>
            </div>
            <div className="review-summary"><div><span>Tên chiến dịch</span><b>{draft.title || "Chưa nhập"}</b></div><div><span>Lĩnh vực</span><b>{draft.category}</b></div><div><span>Mục tiêu</span><b>{draft.target ? Number(draft.target).toLocaleString("vi-VN") + " ₫" : "Chưa nhập"}</b></div><div><span>Địa điểm</span><b>{draft.location || "Chưa nhập"}</b></div></div>
            <label className="declaration"><input type="checkbox" required /><span>Tôi xác nhận thông tin là trung thực, đồng ý lưu lịch sử phiên bản và cam kết công bố tiến độ, chứng từ sử dụng quỹ theo kế hoạch.</span></label>
            <p className="ai-disclaimer"><Icon name="shield" size={17} /> Điểm AI không phải cam kết thành công và không được dùng làm căn cứ duy nhất để từ chối chiến dịch.</p>
          </fieldset>
        )}

        {error && <p className="form-error wizard-error" role="alert">{error}</p>}
        {notice && <p className="wizard-notice" role="status">{notice}</p>}

        <div className="wizard-actions">
          <button className="button button-outline" type="button" disabled={step === 0} onClick={() => { setError(""); setStep((current) => Math.max(0, current - 1)); }}>Quay lại</button>
          <div>
            <button className="save-draft-button" type="button" disabled={busy} onClick={saveDraft}>Lưu nháp</button>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? "Đang gửi hồ sơ…" : step === steps.length - 1 ? "Gửi duyệt" : "Tiếp tục"} <Icon name="arrow-right" size={18} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}