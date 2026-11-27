import { api } from "../api";

/** Câu hỏi thường gặp do chủ dự án tự soạn (như mục FAQ của Kickstarter). */
export type CampaignFaq = {
  id: string;
  campaignId: string;
  question: string;
  answer: string;
  sortOrder: number;
  updatedAt: string;
};

export type CampaignFaqPayload = { question: string; answer: string; sortOrder?: number };

export const MAX_FAQS = 30;
export const FAQ_QUESTION_MAX = 300;
export const FAQ_ANSWER_MAX = 3000;

/** Lỗi đầu tiên của câu hỏi/câu trả lời (khớp kiểm tra ở server), hoặc "". */
export function faqDraftError(draft: CampaignFaqPayload): string {
  if (draft.question.trim().length < 5) return "Câu hỏi cần ít nhất 5 ký tự.";
  if (draft.answer.trim().length < 5) return "Câu trả lời cần ít nhất 5 ký tự.";
  return "";
}

export function fetchCampaignFaqs(campaignId: string): Promise<CampaignFaq[]> {
  return api.get<CampaignFaq[]>(`/campaigns/${encodeURIComponent(campaignId)}/faqs`);
}

export function fetchManagedCampaignFaqs(campaignId: string): Promise<CampaignFaq[]> {
  return api.get<CampaignFaq[]>(`/campaigns/${encodeURIComponent(campaignId)}/faqs/manage`);
}

export function createCampaignFaq(campaignId: string, payload: CampaignFaqPayload): Promise<CampaignFaq> {
  return api.post<CampaignFaq>(`/campaigns/${encodeURIComponent(campaignId)}/faqs`, payload);
}

export function updateCampaignFaq(id: string, payload: Partial<CampaignFaqPayload>): Promise<CampaignFaq> {
  return api.patch<CampaignFaq>(`/campaign-faqs/${encodeURIComponent(id)}`, payload);
}

export async function deleteCampaignFaq(id: string): Promise<void> {
  await api.del(`/campaign-faqs/${encodeURIComponent(id)}`);
}
