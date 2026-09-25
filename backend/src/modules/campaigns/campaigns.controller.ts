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
import { CampaignsService } from "./campaigns.service";
import {
  CampaignQueryDto,
  CreateCampaignDto,
  ModerateCampaignDto,
  UpdateCampaignDto,
} from "./dto/campaign.dto";

@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findAll(@Query() query: CampaignQueryDto) {
    return this.campaignsService.findAll(query);
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  findMine(@Query() query: CampaignQueryDto, @GetCurrentUser() user: User) {
    return this.campaignsService.findAll(query, user.id);
  }

  /** Thống kê công khai toàn nền tảng (tính từ dữ liệu thật, không số mô phỏng). */
  @Get("stats")
  stats() {
    return this.campaignsService.getPlatformStats();
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.campaignsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateCampaignDto, @GetCurrentUser() user: User) {
    return this.campaignsService.create(dto, user);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @GetCurrentUser() user: User,
  ) {
    return this.campaignsService.update(id, dto, user);
  }

  @Post(":id/submit")
  @UseGuards(JwtAuthGuard)
  submit(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.campaignsService.submitForReview(id, user);
  }

  @Patch(":id/moderate")
  @UseGuards(JwtAuthGuard)
  moderate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ModerateCampaignDto,
    @GetCurrentUser() user: User,
  ) {
    return this.campaignsService.moderate(id, dto, user);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.campaignsService.remove(id, user);
  }
}