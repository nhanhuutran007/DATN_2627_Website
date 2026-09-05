import { Controller, Get, Header } from "@nestjs/common";

export type HealthResponse = {
  service: "backend";
  status: "ok";
  timestamp: string;
};

@Controller("health")
export class HealthController {
  @Get()
  @Header("Cache-Control", "no-store")
  getHealth(): HealthResponse {
    return {
      service: "backend",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
