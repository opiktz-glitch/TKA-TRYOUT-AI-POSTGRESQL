# ==========================================================
# run_tests.ps1 - Jalankan unit test backend
# ==========================================================
# Skrip ini menjalankan unit test menggunakan database yang
# dikonfigurasi di .env (termasuk Neon production jika diset).
# Test data akan dibersihkan otomatis oleh fixture tearDown.
#
# Cara pakai (dari folder backend/):
#   powershell -ExecutionPolicy Bypass -File scripts/run_tests.ps1
# ==========================================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " TKA TRYOUT - TEST RUNNER            " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Tampilkan DATABASE_URL yang akan dipakai (sensor password)
$dbLine = (Get-Content ".env" | Where-Object { $_ -match "^DATABASE_URL=" }) -replace ":([^@]+)@", ":***@"
Write-Host "[INFO] Menggunakan: $dbLine" -ForegroundColor Yellow
Write-Host "[INFO] Pastikan setiap test membersihkan data-nya sendiri (tearDown)" -ForegroundColor Yellow
Write-Host ""

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

exit $exitCode
