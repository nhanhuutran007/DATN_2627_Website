import { FindOperator } from "typeorm";

/** Cột chung của bảng token dùng một lần. */
type TokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
};

type Where = Record<string, unknown>;

function matches(row: TokenRow, where: Where): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = (row as unknown as Record<string, unknown>)[key];
    if (expected instanceof FindOperator) {
      if (expected.type === "isNull") return actual === null || actual === undefined;
      if (expected.type === "moreThan") return (actual as Date) > (expected.value as Date);
      throw new Error(`Unsupported operator ${expected.type}`);
    }
    return actual === expected;
  });
}

/** Repository token (đặt lại mật khẩu / xác minh email) giả, đủ cho các truy vấn service dùng. */
export function makeTokenRepo() {
  const rows: TokenRow[] = [];
  let sequence = 0;
  const repo = {
    rows,
    create: (data: Partial<TokenRow>) => ({ ...data }) as TokenRow,
    save: async (row: TokenRow) => {
      sequence += 1;
      row.id ??= `token-${sequence}`;
      row.createdAt ??= new Date();
      rows.push(row);
      return row;
    },
    findOne: async ({ where, order }: { where: Where; order?: Record<string, string> }) => {
      const found = rows.filter((row) => matches(row, where));
      if (order?.createdAt === "DESC") {
        found.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return found[0] ?? null;
    },
    update: async (where: Where, patch: Partial<TokenRow>) => {
      const found = rows.filter((row) => matches(row, where));
      found.forEach((row) => Object.assign(row, patch));
      return { affected: found.length };
    },
  };
  return repo;
}
