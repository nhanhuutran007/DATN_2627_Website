import { api } from "../api";
import type { ApiCampaignStatus } from "./campaigns";

export type CommentKind = "comment" | "question";
export type CommentStatus = "visible" | "hidden";

export type CampaignCommentView = {
  id: string;
  kind: CommentKind;
  content: string;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
  /** Người viết là chủ dự án. */
  isOwner: boolean;
  replies: CampaignCommentView[];
};

export type CommentThreadPage = {
  items: CampaignCommentView[];
  total: number;
  offset: number;
  limit: number;
};

export type AdminComment = {
  id: string;
  campaignId: string;
  campaign?: { id: string; title: string; status: ApiCampaignStatus } | null;
  userId: string;
  user?: { id: string; name: string; email?: string } | null;
  parentId?: string | null;
  kind: CommentKind;
  content: string;
  status: CommentStatus;
  hiddenReason?: string | null;
  hiddenAt?: string | null;
  createdAt: string;
  /** Số báo cáo vi phạm chưa xử lý nhắm vào bình luận. */
  openReportCount: number;
  /** Bình luận gốc mà câu trả lời này đáp lại. */
  parent: { id: string; content: string; authorName: string | null } | null;
  /** Chỉ với câu hỏi gốc: chủ dự án đã trả lời hay chưa. */
  ownerReplied: boolean | null;
};

export type AdminCommentList = { items: AdminComment[]; total: number; offset: number; limit: number };

export const COMMENT_MAX = 2000;

export function fetchComments(campaignId: string, offset = 0, limit = 10): Promise<CommentThreadPage> {
  return api.get<CommentThreadPage>(
    `/campaigns/${encodeURIComponent(campaignId)}/comments?offset=${offset}&limit=${limit}`,
  );
}

export function postComment(
  campaignId: string,
  payload: { content: string; kind?: CommentKind; parentId?: string },
): Promise<CampaignCommentView> {
  return api.post<CampaignCommentView>(`/campaigns/${encodeURIComponent(campaignId)}/comments`, payload);
}

export async function deleteComment(id: string): Promise<void> {
  await api.del(`/comments/${encodeURIComponent(id)}`);
}

export function fetchAdminComments(query: {
  status?: CommentStatus;
  kind?: CommentKind;
  /** Bình luận gốc hay câu trả lời. */
  level?: "root" | "reply";
  /** Chỉ bình luận đang có báo cáo vi phạm chưa xử lý. */
  reported?: boolean;
  q?: string;
  offset?: number;
  limit?: number;
} = {}): Promise<AdminCommentList> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.kind) params.set("kind", query.kind);
  if (query.level) params.set("level", query.level);
  if (query.reported) params.set("reported", "true");
  if (query.q) params.set("q", query.q);
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  const qs = params.toString();
  return api.get<AdminCommentList>(`/admin/comments${qs ? `?${qs}` : ""}`);
}

export function hideComment(id: string, reason: string): Promise<AdminComment> {
  return api.patch<AdminComment>(`/admin/comments/${encodeURIComponent(id)}/hide`, { reason });
}

export function unhideComment(id: string): Promise<AdminComment> {
  return api.patch<AdminComment>(`/admin/comments/${encodeURIComponent(id)}/unhide`);
}
