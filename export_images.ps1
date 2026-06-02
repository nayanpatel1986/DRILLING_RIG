# ============================================================
# DrillBit Digital Twin - Full Export Script
# ============================================================
# Exports Docker images AND database settings so that
# deploying on another device preserves everything:
#   - Users & passwords
#   - Modbus device configurations (DAQ-10, Twinstop, etc.)
#   - Dashboard preferences
#   - WITSML configurations & channel mappings
#   - Well history
# ============================================================

$images = @(
    "drilling-rig-backend:latest",
    "drilling-rig-frontend:latest",
    "influxdb:2.7",
    "eclipse-mosquitto:2",
    "postgres:15",
    "telegraf:1.28"
)

New-Item -ItemType Directory -Force -Path .\docker_images | Out-Null

# ── Read database credentials from .env ──
$pgUser = "admin"
$pgDb = "rig_manager"
$envFile = Get-Content .\.env -ErrorAction SilentlyContinue
if ($envFile) {
    foreach ($line in $envFile) {
        if ($line -match "^POSTGRES_USER=(.+)$") { $pgUser = $Matches[1].Trim() }
        if ($line -match "^POSTGRES_DB=(.+)$") { $pgDb = $Matches[1].Trim() }
    }
}

# ── STEP 1: Export PostgreSQL Database ──
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  STEP 1/2: Exporting Database Settings" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$containerRunning = docker ps --filter "name=drillbit_postgres" --format "{{.Names}}" 2>$null
if ($containerRunning -eq "drillbit_postgres") {
    Write-Host "  Exporting PostgreSQL database ($pgDb)..."
    Write-Host "  Tables: users, modbus_devices, modbus_registers," -ForegroundColor DarkGray
    Write-Host "          witsml_configs, witsml_channel_mappings," -ForegroundColor DarkGray
    Write-Host "          system_preferences, wells" -ForegroundColor DarkGray
    Write-Host ""

    docker exec drillbit_postgres pg_dump -U $pgUser --clean --if-exists $pgDb > .\docker_images\pg_backup.sql 2>$null

    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item .\docker_images\pg_backup.sql).Length
        $fileSizeKB = [math]::Round($fileSize / 1024, 1)
        Write-Host "  [OK] Database exported successfully ($fileSizeKB KB)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Database export failed!" -ForegroundColor Yellow
        Write-Host "  The tar file will still work but settings won't be preserved." -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARNING] PostgreSQL container (drillbit_postgres) is not running." -ForegroundColor Yellow
    Write-Host "  Cannot export database. Start the application first:" -ForegroundColor Yellow
    Write-Host "    docker-compose up -d" -ForegroundColor White
    Write-Host ""
    Write-Host "  Continuing with Docker image export only..." -ForegroundColor Yellow
}

# ── STEP 2: Save Docker Images ──
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  STEP 2/2: Saving Docker Images" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

foreach ($image in $images) {
    $filename = $image -replace ':', '_' -replace '/', '_'
    Write-Host "  Saving $image..."
    docker save -o .\docker_images\$filename.tar $image
}

# ── Summary ──
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  EXPORT COMPLETE!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Everything saved to the 'docker_images' directory." -ForegroundColor White
Write-Host ""

if (Test-Path .\docker_images\pg_backup.sql) {
    Write-Host "  Included in this export:" -ForegroundColor White
    Write-Host "    [x] Docker images (6 containers)" -ForegroundColor Green
    Write-Host "    [x] Database backup (all settings)" -ForegroundColor Green
    Write-Host ""
    Write-Host "  On the target device, run:" -ForegroundColor White
    Write-Host "    .\load_images.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  This will restore the exact same dashboard," -ForegroundColor White
    Write-Host "  users, and Modbus configuration." -ForegroundColor White
} else {
    Write-Host "  Included in this export:" -ForegroundColor White
    Write-Host "    [x] Docker images (6 containers)" -ForegroundColor Green
    Write-Host "    [ ] Database backup (NOT exported)" -ForegroundColor Yellow
}
Write-Host ""
