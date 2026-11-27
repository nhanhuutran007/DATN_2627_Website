import { MigrationInterface, QueryRunner } from "typeorm";

import { Wallets1790000000023 } from "./1790000000023-wallets";
import { WalletWithdrawals1790000000024 } from "./1790000000024-wallet-withdrawals";

/**
 * Gỡ bỏ Ví Góp Mầm (nạp, rút, số dư, ủng hộ bằng số dư). Chỉ còn cam kết trả sau qua SePay.
 * - Khoản ủng hộ bằng ví (`payment_method = 'balance'`) còn đang được tính (cam kết chưa tất toán)
 *   bị hủy: trừ khỏi số liệu chiến dịch, trả suất quà, ghi audit.
 * - Xóa 4 bảng ví và các mã OTP rút tiền ví còn sót.
 * Khoản `balance` đã hoàn tất/hoàn tiền giữ nguyên làm lịch sử.
 *
 * `down` chỉ dựng lại bảng rỗng; số dư ví và khoản cam kết đã hủy không khôi phục được.
 */
export class RemoveWallets1790000000038 implements MigrationInterface {
  name = "RemoveWallets1790000000038";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const counted = `('pledged', 'charge_failed', 'awaiting_payment')`;
    const open: Array<{ id: string; user_id: string; campaign_id: string; reward_tier_id: string | null; amount: string; status: string }> =
      await queryRunner.query(
        `SELECT id, user_id, campaign_id, reward_tier_id, amount, status FROM donations
         WHERE payment_method = 'balance' AND status IN ${counted}`,
      );
    for (const d of open) {
      await queryRunner.query(
        `UPDATE campaigns
           SET current_amount = GREATEST(current_amount - ?, 0), backer_count = GREATEST(backer_count - 1, 0)
         WHERE id = ?`,
        [d.amount, d.campaign_id],
      );
      if (d.reward_tier_id) {
        await queryRunner.query(
          `UPDATE reward_tiers SET claimed_count = claimed_count - 1 WHERE id = ? AND claimed_count > 0`,
          [d.reward_tier_id],
        );
      }
      await queryRunner.query(`UPDATE donations SET status = 'cancelled' WHERE id = ?`, [d.id]);
      await queryRunner.query(
        `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, old_values, new_values)
         VALUES (UUID(), NULL, 'donation.pledge.cancel', 'donation', ?, ?, ?)`,
        [
          d.id,
          JSON.stringify({ status: d.status }),
          JSON.stringify({ status: "cancelled", amount: Number(d.amount), campaignId: d.campaign_id, reason: "wallet-removed" }),
        ],
      );
    }

    await queryRunner.query(`DELETE FROM step_up_codes WHERE purpose IN ('wallet_withdraw', 'admin_withdraw')`);
    await queryRunner.query(`DROP TABLE IF EXISTS wallet_transactions`);
    await queryRunner.query(`DROP TABLE IF EXISTS wallet_withdrawals`);
    await queryRunner.query(`DROP TABLE IF EXISTS wallet_topups`);
    await queryRunner.query(`DROP TABLE IF EXISTS wallets`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await new Wallets1790000000023().up(queryRunner);
    await new WalletWithdrawals1790000000024().up(queryRunner);
  }
}
