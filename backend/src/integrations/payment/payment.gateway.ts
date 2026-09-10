import { randomUUID } from "node:crypto";

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  raw?: Record<string, unknown>;
}

export interface PaymentGateway {
  createTransaction(params: {
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentResult>;

  verifyWebhookSignature(payload: Record<string, unknown>, signature: string): boolean;
}

export class DemoWalletGateway implements PaymentGateway {
  async createTransaction(params: {
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentResult> {
    const transactionId = `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
    return {
      success: true,
      transactionId,
      raw: { amount: params.amount, currency: params.currency, mode: "demo" },
    };
  }

  verifyWebhookSignature(_payload: Record<string, unknown>, _signature: string): boolean {
    return true;
  }
}
