import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/** Tài khoản ngân hàng mặc định của người dùng (chỉ chính chủ xem/sửa). */
@Entity("user_bank_accounts")
export class UserBankAccount {
  @PrimaryColumn({ name: "user_id", type: "char", length: 36 })
  userId!: string;

  @Column({ name: "bank_name", length: 100 })
  bankName!: string;

  @Column({ name: "bank_account_number", length: 30 })
  bankAccountNumber!: string;

  @Column({ name: "bank_account_name", length: 100 })
  bankAccountName!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
