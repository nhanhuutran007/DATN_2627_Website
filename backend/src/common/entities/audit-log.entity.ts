import { Column, Entity } from "typeorm";

import { BaseEntity } from "../../common/base.entity";

@Entity("audit_logs")
export class AuditLog extends BaseEntity {
  @Column({ name: "user_id", nullable: true })
  userId?: string;

  @Column({ length: 100 })
  action!: string;

  @Column({ length: 100 })
  entity!: string;

  @Column({ name: "entity_id", length: 36, nullable: true })
  entityId?: string;

  @Column({ name: "old_values", type: "json", nullable: true })
  oldValues?: Record<string, unknown>;

  @Column({ name: "new_values", type: "json", nullable: true })
  newValues?: Record<string, unknown>;

  @Column({ name: "ip_address", length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: "user_agent", length: 500, nullable: true })
  userAgent?: string;
}
