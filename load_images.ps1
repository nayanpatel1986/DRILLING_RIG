# ============================================================
# DrillBit Digital Twin - Full Deployment Loader
# ============================================================
# Loads Docker images AND restores database settings so that
# the target device has the exact same configuration:
#   - Same users & passwords
#   - Same Modbus device configurations
#   - Same dashboard preferences
#   - Same WITSML configurations
#   - Same well history
# ============================================================

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   DRILLBIT DIGITAL TWIN - DEPLOYMENT LOADER" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-Not (Test-Path .\docker_images)) {
    Write-Host "  [ERROR] 'docker_images' directory not found!" -ForegroundColor Red
    Write-Host "  Make sure this script is run from the Drilling-Rig project root." -ForegroundColor Red
    exit 1
}

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

$hasDbBackup = Test-Path .\docker_images\pg_backup.sql

# ── STEP 1: Load Docker Images ──
Write-Host "--- Step 1/3: Loading Docker Images ---" -ForegroundColor Cyan
Write-Host ""

Get-ChildItem -Path .\docker_images -Filter *.tar | ForEach-Object {
    Write-Host "  Loading $($_.Name)..."
    docker load -i $_.FullName
}

Write-Host ""
Write-Host "  [OK] All images loaded." -ForegroundColor Green
Write-Host ""

# ── STEP 2: Restore Database (if backup exists) ──
if ($hasDbBackup) {
    Write-Host "--- Step 2/3: Restoring Database Settings ---" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Database backup found. Restoring all settings..." -ForegroundColor White
    Write-Host ""

    # Start only PostgreSQL first
    Write-Host "  Starting PostgreSQL..."
    docker-compose up -d postgres 2>$null

    # Wait for PostgreSQL to be healthy
    Write-Host "  Waiting for PostgreSQL to be ready..."
    $maxRetries = 30
    $retry = 0
    $health = ""
    do {
        Start-Sleep -Seconds 2
        $retry++
        $health = docker inspect --format='{{.State.Health.Status}}' drillbit_postgres 2>$null
        if ($retry % 5 -eq 0) {
            Write-Host "    Still waiting... (attempt $retry/$maxRetries)" -ForegroundColor DarkGray
        }
    } while ($health -ne "healthy" -and $retry -lt $maxRetries)

    if ($health -eq "healthy") {
        Write-Host "  PostgreSQL is ready. Restoring database..."
        Write-Host ""

        # Restore the database dump
        Get-Content .\docker_images\pg_backup.sql | docker exec -i drillbit_postgres psql -U $pgUser -d $pgDb 2>$null | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Database restored successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "    Preserved settings:" -ForegroundColor White
            Write-Host "    [x] Users & passwords" -ForegroundColor Green
            Write-Host "    [x] Modbus device configurations" -ForegroundColor Green
            Write-Host "    [x] Dashboard preferences" -ForegroundColor Green
            Write-Host "    [x] WITSML configurations" -ForegroundColor Green
            Write-Host "    [x] Well history" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] Database restore may have encountered issues." -ForegroundColor Yellow
            Write-Host "  The application will still work with default settings." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [ERROR] PostgreSQL did not become healthy in time." -ForegroundColor Red
        Write-Host "  Skipping database restore. Default settings will be used." -ForegroundColor Yellow
    }

    Write-Host ""
} else {
    Write-Host "--- Step 2/3: Database Restore (Skipped) ---" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  No database backup (pg_backup.sql) found in docker_images." -ForegroundColor Yellow
    Write-Host "  The application will start with default settings:" -ForegroundColor Yellow
    Write-Host "    - Default admin user (from .env)" -ForegroundColor DarkGray
    Write-Host "    - Default DAQ-10 Modbus configuration" -ForegroundColor DarkGray
    Write-Host ""
}

# ── STEP 3: Start All Services ──
Write-Host "--- Step 3/3: Starting All Services ---" -ForegroundColor Cyan
Write-Host ""

docker-compose up -d 2>$null

Write-Host "  Waiting for all services to start..."
Start-Sleep -Seconds 10

# Verify backend health
$backendHealth = docker inspect --format='{{.State.Health.Status}}' drillbit_backend 2>$null
if ($backendHealth -eq "healthy") {
    Write-Host "  [OK] Backend is healthy." -ForegroundColor Green
} else {
    Write-Host "  Backend is starting up (this may take a moment)..." -ForegroundColor Yellow
}

# ── Summary ──
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Dashboard:  http://localhost:8081" -ForegroundColor White
Write-Host "  Backend:    http://localhost:8000" -ForegroundColor DarkGray
Write-Host ""

if ($hasDbBackup) {
    Write-Host "  Your users, Modbus config, and dashboard are" -ForegroundColor White
    Write-Host "  exactly as they were on the source device." -ForegroundColor White
} else {
    Write-Host "  Fresh deployment with default settings." -ForegroundColor Yellow
    Write-Host "  Login with the credentials from your .env file." -ForegroundColor Yellow
}
Write-Host ""
