import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { HttpAiGateway } from "../../integrations/ai/ai.gateway";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Donation } from "../donations/entities/donation.entity";
import { User } from "../users/entities/user.entity";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { BehaviorEvent } from "./entities/behavior-event.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, Donation, User, BehaviorEvent])],
  controllers: [AiController],
  providers: [AiService, { provide: "AiGateway", useClass: HttpAiGateway }],
  exports: [AiService],
})
export class AiModule {}