import { api } from "../api";

export type PostVisibility = "public" | "backers";

/** Bài cập nhật dự án ("Cập nhật #N"); bài khóa (`locked`) không có nội dung/ảnh. */
export type ApiPost = {
  id: string;
  campaignId: string;
  number: number;
  title: string;
  content: string | null;
  imageUrl: string | null;
  visibility: PostVisibility;
  locked: boolean;
  likeCount: number;
  liked: boolean;
  createdAt: string;
  editedAt: string | null;
};

export type ApiPostPage = { items: ApiPost[]; total: number; offset: number; limit: number };

export type PostInput = {
  title: string;
  content: string;
  imageUrl?: string | null;
  visibility: PostVisibility;
};

export type PostLikeState = { liked: boolean; likeCount: number };

export const POST_CONTENT_MIN = 20;
export const POST_CONTENT_MAX = 20000;
export const POST_TITLE_MAX = 200;

const campaignPosts = (campaignId: string) => `/campaigns/${encodeURIComponent(campaignId)}/posts`;
const postPath = (postId: string) => `/posts/${encodeURIComponent(postId)}`;

export function fetchCampaignPosts(campaignId: string, offset = 0, limit = 5): Promise<ApiPostPage> {
  return api.get<ApiPostPage>(`${campaignPosts(campaignId)}?offset=${offset}&limit=${limit}`);
}

export function createPost(campaignId: string, input: PostInput): Promise<ApiPost> {
  const { imageUrl, ...rest } = input;
  return api.post<ApiPost>(campaignPosts(campaignId), imageUrl ? { ...rest, imageUrl } : rest);
}

export function updatePost(postId: string, input: PostInput): Promise<ApiPost> {
  return api.patch<ApiPost>(postPath(postId), { ...input, imageUrl: input.imageUrl || null });
}

export function deletePost(postId: string): Promise<{ deleted: boolean }> {
  return api.del<{ deleted: boolean }>(postPath(postId));
}

export function likePost(postId: string): Promise<PostLikeState> {
  return api.post<PostLikeState>(`${postPath(postId)}/like`);
}

export function unlikePost(postId: string): Promise<PostLikeState> {
  return api.del<PostLikeState>(`${postPath(postId)}/like`);
}
