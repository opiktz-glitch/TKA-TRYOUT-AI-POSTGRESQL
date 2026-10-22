# ==========================================================
# run_tests.ps1 - Jalankan unit test dengan .env.test LOKAL
# ==========================================================
# GUNAKAN SKRIP INI untuk testing, BUKAN langsung python -m unittest!
# Skrip ini otomatis memakai .env.test sehingga tidak ada data
# yang masuk ke database production (Neon Tech).
#
# Cara pakai (dari folder backend/):
#   powershell -ExecutionPolicy Bypass -File scripts/run_tests.ps1
# ==========================================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " TKA TRYOUT - TEST RUNNER (LOKAL/SAFE)  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Cek apakah .env.test ada
if (-not (Test-Path ".env.test")) {
    Write-Host "[ERROR] File .env.test tidak ditemukan!" -ForegroundColor Red
    Write-Host "Buat .env.test terlebih dahulu (lihat README)."
    exit 1
}

# Pastikan .env.test TIDAK mengandung URL Neon production
$envTestContent = Get-Content ".env.test" -Raw
if ($envTestContent -match "neon\.tech") {
    Write-Host "[BAHAYA] .env.test masih mengarah ke Neon production!" -ForegroundColor Red
    Write-Host "Hapus atau komentari baris DATABASE_URL Neon di .env.test dulu."
    exit 1
}

Write-Host "[OK] .env.test aman - tidak terhubung ke Neon production" -ForegroundColor Green

# Tampilkan DATABASE_URL yang akan dipakai (sensor password)
$dbLine = (Get-Content ".env.test" | Where-Object { $_ -match "^DATABASE_URL=" }) -replace ":([^@]+)@", ":***@"
Write-Host "[INFO] Menggunakan: $dbLine" -ForegroundColor Yellow
Write-Host ""

# Set environment variable agar aplikasi membaca .env.test
$env:ENV_FILE = ".env.test"

# Jalankan test
Write-Host "Menjalankan unit test..." -ForegroundColor Cyan
& venv\Scripts\python.exe -m unittest discover -s . -p "test_*.py" -v
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "[SUKSES] Semua test LULUS. Aman untuk push/deploy." -ForegroundColor Green
} else {
    Write-Host "[GAGAL] Ada test yang TIDAK LULUS. Perbaiki dulu sebelum push." -ForegroundColor Red
}

# Reset environment variable
Remove-Item Env:ENV_FILE -ErrorAction SilentlyContinue

exit $exitCode
