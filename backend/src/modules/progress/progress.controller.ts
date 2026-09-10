import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../users/entities/user.entity";
import {
  CreateMilestoneDto,
  CreateMilestoneUpdateDto,
  MilestoneQueryDto,
  UpdateMilestoneDto,
} from "./dto/progress.dto";
import { ProgressService } from "./progress.service";

@Controller()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get("campaigns/:id/milestones")
  findCampaignMilestones(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: MilestoneQueryDto,
  ) {
    return this.progressService.findCampaignMilestones(id, query);
  }

  @Post("campaigns/:id/milestones")
  @UseGuards(JwtAuthGuard)
  createMilestone(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateMilestoneDto,
    @GetCurrentUser() user: User,
  ) {
    return this.progressService.createMilestone(id, dto, user);
  }

  @Get("campaigns/:id/progress")
  getProgress(@Param("id", ParseUUIDPipe) id: string) {
    return this.progressService.getCampaignProgress(id);
  }

  @Patch("milestones/:id")
  @UseGuards(JwtAuthGuard)
  updateMilestone(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
    @GetCurrentUser() user: User,
  ) {
    return this.progressService.updateMilestone(id, dto, user);
  }

  @Delete("milestones/:id")
  @UseGuards(JwtAuthGuard)
  removeMilestone(
    @Param("id", ParseUUIDPipe) id: string,
    @GetCurrentUser() user: User,
  ) {
    return this.progressService.removeMilestone(id, user);
  }

  @Post("milestones/:id/complete")
  @UseGuards(JwtAuthGuard)
  completeMilestone(
    @Param("id", ParseUUIDPipe) id: string,
    @GetCurrentUser() user: User,
  ) {
    return this.progressService.completeMilestone(id, user);
  }

  @Get("milestones/:id/updates")
  listMilestoneUpdates(@Param("id", ParseUUIDPipe) id: string) {
    return this.progressService.listMilestoneUpdates(id);
  }

  @Post("milestones/:id/updates")
  @UseGuards(JwtAuthGuard)
  addMilestoneUpdate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateMilestoneUpdateDto,
    @GetCurrentUser() user: User,
  ) {
    return this.progressService.addMilestoneUpdate(id, dto, user);
  }
}