import { Column, Entity } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

export enum RiskEntityType {
  CAMPAIGN = "campaign",
  USER = "user",
}

export enum RiskAlertLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum RiskAlertStatus {
  OPEN = "open",
  RESOLVED = "resolved",
  DISMISSED = "dismissed",
}

export enum RiskMethod {
  AI = "ai",
  RULE = "rule",
}

export type RiskReason = {
  group: string;
  label: string;
  weight: number;
};

@Entity("risk_alerts")
export class RiskAlert extends BaseEntity {
  @Column({ name: "entity_type", type: "enum", enum: RiskEntityType })
  entityType!: RiskEntityType;

  @Column({ name: "entity_id" })
  entityId!: string;

  @Column({ name: "entity_name", length: 255 })
  entityName!: string;

  @Column({ name: "risk_level", type: "enum", enum: RiskAlertLevel })
  level!: RiskAlertLevel;

  @Column({ name: "risk_score", type: "float", default: 0 })
  score!: number;

  @Column({ type: "enum", enum: RiskMethod, default: RiskMethod.AI })
  method!: RiskMethod;

  @Column({ type: "json" })
  reasons!: RiskReason[];

  @Column({ type: "json" })
  evidences!: Record<string, number>;

  @Column({ type: "enum", enum: RiskAlertStatus, default: RiskAlertStatus.OPEN })
  status!: RiskAlertStatus;

  @Column({ name: "resolved_by", nullable: true })
  resolvedBy?: string;

  @Column({ name: "resolved_at", type: "datetime", nullable: true })
  resolvedAt?: Date | null;
}