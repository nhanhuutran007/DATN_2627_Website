import { In, Repository } from "typeorm";

import { Donation, DonationStatus } from "../donations/entities/donation.entity";
import { Campaign, CampaignStatus } from "./entities/campaign.entity";

/**
 * Tổng đã huy động gộp: khoản đã xác nhận + khoản đã hoàn. Khác `currentAmount`
 * (bị trừ khi hoàn), con số này không giảm nên dùng được để biết chiến dịch từng
 * đạt mục tiêu hay chưa.
 */
export async function grossRaised(donationRepo: Repository<Donation>, campaignId: string): Promise<number> {
  const total = await donationRepo.sum("amount", {
    campaignId,
    status: In([DonationStatus.COMPLETED, DonationStatus.REFUNDED]),
  });
  return Number(total ?? 0);
}

/**
 * Chiến dịch đã khép lại mà không đạt mục tiêu: `failed`/`cancelled`, hoặc
 * `ended` (admin đóng sau khi thất bại, hay kết thúc sớm) với tổng gộp < mục tiêu.
 * Người ủng hộ của các chiến dịch này luôn được yêu cầu hoàn tiền.
 */
export async function closedWithoutReachingGoal(
  campaign: Campaign,
  donationRepo: Repository<Donation>,
): Promise<boolean> {
  if (campaign.status === CampaignStatus.FAILED || campaign.status === CampaignStatus.CANCELLED) {
    return true;
  }
  if (campaign.status !== CampaignStatus.ENDED) {
    return false;
  }
  return (await grossRaised(donationRepo, campaign.id)) < Number(campaign.goalAmount);
}
