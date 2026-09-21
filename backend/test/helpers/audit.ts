import type {
  AuditEntry,
  AuditService,
} from "../../src/common/audit/audit.service";

/** AuditService giả: lưu lại các bản ghi để test kiểm tra. */
export function makeAuditRecorder(): {
  service: AuditService;
  entries: AuditEntry[];
} {
  const entries: AuditEntry[] = [];
  const service = {
    record: async (entry: AuditEntry) => {
      entries.push(entry);
    },
  } as unknown as AuditService;
  return { service, entries };
}
