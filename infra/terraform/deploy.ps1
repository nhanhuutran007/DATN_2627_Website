<#
.SYNOPSIS
  Các bước deploy Góp Mầm lên AWS sau khi đã `terraform apply` (xem README.md).

.EXAMPLE
  .\deploy.ps1 push        # build 3 image (linux/amd64) và đẩy lên ECR
  .\deploy.ps1 migrate     # chạy migration trên RDS bằng one-off ECS task
  .\deploy.ps1 seed        # nạp dữ liệu mẫu (bỏ qua nếu DB đã có user)
  .\deploy.ps1 redeploy    # buộc các ECS service kéo lại image mới
  .\deploy.ps1 status      # trạng thái service + URL website
#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("push", "migrate", "seed", "redeploy", "status")]
  [string]$Action,
  [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"
# AWS CLI trên Windows mặc định in bằng codepage cp1252, vỡ khi log có ký tự Unicode
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
$TerraformDir = $PSScriptRoot
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

function Invoke-Native {
  param([string]$File, [string[]]$Arguments)
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$File $($Arguments -join ' ') thất bại (exit $LASTEXITCODE)" }
}

function Get-TfOutputs {
  $json = & terraform "-chdir=$TerraformDir" output -json
  if ($LASTEXITCODE -ne 0) { throw "Không đọc được terraform output (đã terraform apply chưa?)" }
  return ($json | Out-String | ConvertFrom-Json)
}

function Get-Region {
  $region = (& aws configure get region)
  if (-not $region) { $region = "ap-southeast-1" }
  return $region.Trim()
}

function Push-Images {
  $out = Get-TfOutputs
  $region = Get-Region
  $registry = ($out.ecr_backend_url.value -split "/")[0]

  Write-Host "Đăng nhập Docker vào $registry"
  # Pipe qua cmd: Windows PowerShell 5.1 chèn CRLF/BOM khi pipe sang lệnh native, ECR trả 400
  & cmd /c "aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $registry"
  if ($LASTEXITCODE -ne 0) { throw "docker login thất bại" }

  $images = @(
    @{ Name = "frontend"; Context = "frontend"; Repo = $out.ecr_frontend_url.value },
    @{ Name = "backend"; Context = "backend"; Repo = $out.ecr_backend_url.value },
    @{ Name = "ai-service"; Context = "ai-service"; Repo = $out.ecr_ai_url.value }
  )
  foreach ($image in $images) {
    $target = "$($image.Repo):$ImageTag"
    Write-Host "== Build $($image.Name) -> $target"
    Invoke-Native docker @("build", "--platform", "linux/amd64", "-t", $target, (Join-Path $RepoRoot $image.Context))
    Invoke-Native docker @("push", $target)
  }
}

function Invoke-BackendTask {
  param([string[]]$Command, [string]$Label)
  $out = Get-TfOutputs
  $subnets = ($out.public_subnet_ids.value -join ",")
  $network = "awsvpcConfiguration={subnets=[$subnets],securityGroups=[$($out.ecs_tasks_security_group_id.value)],assignPublicIp=ENABLED}"
  $overrides = @{ containerOverrides = @(@{ name = "backend"; command = $Command }) } | ConvertTo-Json -Depth 5 -Compress
  $overridesFile = Join-Path $env:TEMP "gopmam-task-overrides.json"
  # aws CLI đọc file:// dạng UTF-8 không BOM
  [System.IO.File]::WriteAllText($overridesFile, $overrides, (New-Object System.Text.UTF8Encoding $false))

  Write-Host "== Chạy one-off task: $Label"
  $taskArn = & aws ecs run-task --cluster $out.ecs_cluster_name.value --launch-type FARGATE `
    --task-definition $out.backend_task_definition.value --network-configuration $network `
    --overrides "file://$overridesFile" --query "tasks[0].taskArn" --output text
  if ($LASTEXITCODE -ne 0 -or -not $taskArn -or $taskArn -eq "None") { throw "Không khởi chạy được task $Label" }

  Write-Host "Task $taskArn — đang chờ kết thúc..."
  Invoke-Native aws @("ecs", "wait", "tasks-stopped", "--cluster", $out.ecs_cluster_name.value, "--tasks", $taskArn)
  $exitCode = & aws ecs describe-tasks --cluster $out.ecs_cluster_name.value --tasks $taskArn `
    --query "tasks[0].containers[0].exitCode" --output text
  $reason = & aws ecs describe-tasks --cluster $out.ecs_cluster_name.value --tasks $taskArn `
    --query "tasks[0].stoppedReason" --output text

  $taskId = ($taskArn -split "/")[-1]
  Write-Host "Log: aws logs tail /ecs/gopmam/backend --log-stream-names backend/backend/$taskId"
  & aws logs get-log-events --log-group-name "/ecs/gopmam/backend" --log-stream-name "backend/backend/$taskId" `
    --query "events[].message" --output text

  if ($exitCode -ne "0") { throw "$Label thất bại (exit=$exitCode, lý do: $reason)" }
  Write-Host "$Label xong."
}

function Update-Services {
  $out = Get-TfOutputs
  foreach ($svc in @("gopmam-ai-svc", "gopmam-backend-svc", "gopmam-frontend-svc")) {
    Write-Host "== force-new-deployment $svc"
    Invoke-Native aws @("ecs", "update-service", "--cluster", $out.ecs_cluster_name.value, "--service", $svc,
      "--force-new-deployment", "--query", "service.serviceName", "--output", "text")
  }
  Write-Host "Chờ các service ổn định (có thể mất vài phút)..."
  Invoke-Native aws @("ecs", "wait", "services-stable", "--cluster", $out.ecs_cluster_name.value,
    "--services", "gopmam-ai-svc", "gopmam-backend-svc", "gopmam-frontend-svc")
}

function Show-Status {
  $out = Get-TfOutputs
  & aws ecs describe-services --cluster $out.ecs_cluster_name.value `
    --services gopmam-redis-svc gopmam-ai-svc gopmam-backend-svc gopmam-frontend-svc `
    --query "services[].[serviceName,status,runningCount,desiredCount]" --output table
  Write-Host "Website: http://$($out.alb_dns_name.value)"
}

switch ($Action) {
  "push" { Push-Images }
  "migrate" { Invoke-BackendTask -Label "migration" -Command @("node_modules/.bin/typeorm-ts-node-commonjs", "-d", "typeorm.config.ts", "migration:run") }
  "seed" { Invoke-BackendTask -Label "seed" -Command @("node_modules/.bin/ts-node", "scripts/seed.ts") }
  "redeploy" { Update-Services }
  "status" { Show-Status }
}
