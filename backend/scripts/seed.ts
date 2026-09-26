import { config } from "dotenv";
import { DataSource } from "typeorm";
import * as bcrypt from "bcryptjs";

import { readDatabaseSsl } from "../src/config/database.config";
import { User, UserRole } from "../src/modules/users/entities/user.entity";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import {
  Donation,
  DonationStatus,
} from "../src/modules/donations/entities/donation.entity";

config({ path: ".env" });

const dataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_DATABASE ?? "crowdfunding",
  ssl: readDatabaseSsl(),
  entities: ["src/modules/**/*.entity.ts"],
  synchronize: false,
});

async function seed() {
  await dataSource.initialize();
  console.log("Database connected. Seeding...");

  const existing = await dataSource.getRepository(User).find();
  if (existing.length > 0) {
    console.log("Data already exists. Skipping seed.");
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = dataSource.getRepository(User).create({
    name: "Administrator",
    email: "admin@gopmam.com",
    passwordHash,
    role: UserRole.ADMIN,
    emailVerified: true,
  });
  await dataSource.getRepository(User).save(admin);

  const owner1 = dataSource.getRepository(User).create({
    name: "Nguyen Van A",
    email: "owner1@gopmam.com",
    passwordHash,
    role: UserRole.CAMPAIGN_OWNER,
    bio: "Founder of a community project",
    organization: "Center for Community Development",
    emailVerified: true,
  });
  const owner2 = dataSource.getRepository(User).create({
    name: "Tran Thi B",
    email: "owner2@gopmam.com",
    passwordHash,
    role: UserRole.CAMPAIGN_OWNER,
    bio: "Startup founder",
    organization: "GreenTech Startup",
    emailVerified: true,
  });
  await dataSource.getRepository(User).save([owner1, owner2]);

  const user1 = dataSource.getRepository(User).create({
    name: "Le Van C",
    email: "user1@gopmam.com",
    passwordHash,
    role: UserRole.USER,
    emailVerified: true,
  });
  await dataSource.getRepository(User).save(user1);

  const now = new Date();
  const campaigns = dataSource.getRepository(Campaign).create([
    {
      title: "Xây dựng thư viện cộng đồng cho trẻ em vùng cao",
      description:
        "Chúng tôi muốn xây dựng một thư viện nhỏ với 5000 cuốn sách và 20 máy tính cho trẻ em vùng cao.",
      category: "Giáo dục",
      ownerId: owner1.id,
      goalAmount: 50000000,
      currentAmount: 32500000,
      startDate: new Date(now.getTime() - 30 * 86400000),
      endDate: new Date(now.getTime() + 30 * 86400000),
      status: CampaignStatus.ACTIVE,
      location: "Lào Cai",
      backerCount: 120,
      viewCount: 2500,
    },
    {
      title: "Hỗ trợ nông dân trồng rau sạch hữu cơ",
      description:
        "Giúp 100 hộ nông dân chuyển đổi sang trồng rau hữu cơ với kỹ thuật canh tác bền vững.",
      category: "Nông nghiệp",
      ownerId: owner2.id,
      goalAmount: 80000000,
      currentAmount: 12500000,
      startDate: new Date(now.getTime() - 10 * 86400000),
      endDate: new Date(now.getTime() + 50 * 86400000),
      status: CampaignStatus.ACTIVE,
      location: "Đà Lạt",
      backerCount: 45,
      viewCount: 890,
    },
    {
      title: "Dự án khởi nghiệp công nghệ giáo dục",
      description:
        "Phát triển ứng dụng học tiếng Anh cho học sinh tiểu học sử dụng AI.",
      category: "Công nghệ",
      ownerId: owner2.id,
      goalAmount: 120000000,
      currentAmount: 0,
      startDate: new Date(now.getTime() - 5 * 86400000),
      endDate: new Date(now.getTime() + 55 * 86400000),
      status: CampaignStatus.PENDING,
      location: "Hà Nội",
      backerCount: 0,
      viewCount: 120,
    },
  ]);
  await dataSource.getRepository(Campaign).save(campaigns);

  const [libraryCampaign, farmCampaign, eduTechCampaign] = campaigns;

  const donorId = user1.id;
  const nowMs = Date.now();
  const day = 86400000;
  const hoursAgo = (count: number) => new Date(nowMs - count * 3600000);
  const daysAgo = (count: number, hour = 10) =>
    new Date(nowMs - count * day + hour * 3600000);

  const donationRows: Array<Partial<Donation>> = [];
  let txSeq = 0;
  const addDonation = (
    campaign: Campaign,
    amount: number,
    status: DonationStatus,
    createdAt: Date,
  ) => {
    txSeq += 1;
    donationRows.push({
      userId: donorId,
      campaignId: campaign.id,
      amount,
      currency: "VND",
      status,
      paymentMethod: "wallet_demo",
      transactionId: `TX-SEED-${String(txSeq).padStart(6, "0")}`,
      idempotencyKey: `idem-${txSeq}-${campaign.id.slice(0, 8)}`,
      isAnonymous: txSeq % 3 === 0,
      completedAt: status === DonationStatus.COMPLETED ? createdAt : undefined,
      createdAt,
      updatedAt: createdAt,
    });
  };

  const completedFundingPairs: Array<[Campaign, number, number]> = [
    [libraryCampaign, 1500000, 160],
    [libraryCampaign, 2000000, 152],
    [libraryCampaign, 1200000, 145],
    [libraryCampaign, 1800000, 138],
    [libraryCampaign, 1000000, 130],
    [libraryCampaign, 2500000, 122],
    [libraryCampaign, 1500000, 114],
    [libraryCampaign, 2200000, 105],
    [libraryCampaign, 900000, 96],
    [libraryCampaign, 2600000, 87],
    [libraryCampaign, 1300000, 78],
    [libraryCampaign, 2100000, 70],
    [libraryCampaign, 1600000, 63],
    [libraryCampaign, 2400000, 55],
    [libraryCampaign, 1100000, 48],
    [libraryCampaign, 1900000, 41],
    [libraryCampaign, 2700000, 34],
    [libraryCampaign, 1400000, 28],
    [libraryCampaign, 2300000, 21],
    [libraryCampaign, 1700000, 14],
    [libraryCampaign, 2500000, 8],
    [libraryCampaign, 1200000, 4],
    [libraryCampaign, 2000000, 2],
    [libraryCampaign, 1500000, 1],

    [farmCampaign, 1200000, 22],
    [farmCampaign, 1800000, 15],
    [farmCampaign, 1500000, 9],
    [farmCampaign, 1100000, 4],
    [farmCampaign, 1600000, 1],
  ];

  for (const [campaign, amount, d] of completedFundingPairs) {
    addDonation(campaign, amount, DonationStatus.COMPLETED, daysAgo(d));
  }

  addDonation(eduTechCampaign, 1000000, DonationStatus.COMPLETED, daysAgo(7));
  addDonation(eduTechCampaign, 500000, DonationStatus.COMPLETED, daysAgo(5));
  addDonation(eduTechCampaign, 700000, DonationStatus.COMPLETED, hoursAgo(0.3));
  addDonation(eduTechCampaign, 900000, DonationStatus.COMPLETED, hoursAgo(0.5));
  addDonation(eduTechCampaign, 500000, DonationStatus.COMPLETED, hoursAgo(0.8));
  addDonation(eduTechCampaign, 500000, DonationStatus.FAILED, hoursAgo(0.2));
  addDonation(eduTechCampaign, 300000, DonationStatus.FAILED, hoursAgo(0.6));

  await dataSource.getRepository(Donation).save(donationRows);

  console.log(
    `Seeded: ${4} users, ${campaigns.length} campaigns, ${donationRows.length} donations.`,
  );
  await dataSource.destroy();
  console.log("Done!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
