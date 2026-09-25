/**
 * Ký một webhook thanh toán mẫu để demo/thử tay (kịch bản bảo vệ: webhook đúng
 * chữ ký vs. sai chữ ký). Không gọi mạng — chỉ in payload, chữ ký và câu lệnh
 * curl để tự chạy tay hoặc dán vào Postman.
 *
 * Dùng: ..\scripts\npm-local.cmd run sign-webhook -- <donationId> <completed|failed> [transactionId]
 */
import { config } from "dotenv";

import { signWebhookPayload } from "../src/integrations/payment/payment.gateway";

config({ path: ".env" });

function main(): void {
  const [donationId, status, transactionId] = process.argv.slice(2);

  if (!donationId || !status) {
    console.error(
      "Dùng: sign-webhook.ts <donationId> <completed|failed> [transactionId]",
    );
    process.exitCode = 1;
    return;
  }
  if (status !== "completed" && status !== "failed") {
    console.error('status phải là "completed" hoặc "failed"');
    process.exitCode = 1;
    return;
  }

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "PAYMENT_WEBHOOK_SECRET chưa được đặt trong .env — không thể ký webhook.",
    );
    process.exitCode = 1;
    return;
  }

  const timestamp = Date.now();
  const payload = { donationId, status, transactionId, timestamp };
  const signature = signWebhookPayload(secret, payload);
  const body = JSON.stringify(payload);

  console.log("Payload:", body);
  console.log("X-Signature:", signature);
  console.log("\nCâu lệnh curl (đổi PORT nếu backend không chạy ở 4000):\n");
  console.log(
    `curl -X POST http://localhost:4000/api/v1/donations/webhook ` +
      `-H "Content-Type: application/json" -H "X-Signature: ${signature}" ` +
      `-d '${body}'`,
  );
  console.log(
    `\nKịch bản chữ ký sai: đổi ký tự cuối của X-Signature ở trên rồi gọi lại — kỳ vọng 401.`,
  );
  console.log(
    `Kịch bản replay: chờ hơn 5 phút rồi gọi lại với cùng chữ ký/payload — kỳ vọng 401 (stale-timestamp).`,
  );
}

main();
