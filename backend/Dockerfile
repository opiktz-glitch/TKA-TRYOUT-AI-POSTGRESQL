FROM python:3.12-slim

WORKDIR /app

# DEBIAN_FRONTEND=noninteractive: build Docker tidak punya terminal
# interaktif, jadi debconf (sistem konfigurasi paket Debian) akan
# gagal coba beberapa frontend (Dialog/Readline/Teletype) sebelum
# akhirnya fallback sendiri ke Noninteractive. Baris ini cuma
# menghilangkan noise log tsb dari awal -- TIDAK mengubah hasil
# instalasi sama sekali, cuma bikin log build lebih bersih.
ENV DEBIAN_FRONTEND=noninteractive

# Dependency sistem minimal (cryptography/bcrypt butuh build tools
# di beberapa base image; slim biasanya sudah cukup, tapi ini jaga-jaga).
# psycopg2-binary sudah bawa wheel pre-compiled sendiri, jadi TIDAK
# butuh libpq-dev di sini -- beda dari psycopg2 versi non-binary.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt duluan (terpisah dari COPY kode di bawah)
# supaya Docker layer cache "pip install" tidak perlu diulang tiap
# kali cuma kode Python yang berubah -- hanya re-run kalau
# requirements.txt sendiri yang berubah.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Back4App (dan kebanyakan platform container hosting lain) inject
# PORT sendiri saat runtime, beda-beda tiap platform -- ENV di sini
# cuma nilai DEFAULT kalau platform tidak override (mis. dijalankan
# manual lewat "docker run" tanpa -e PORT).
ENV PORT=8000
ENV APP_MODE=production

EXPOSE ${PORT}

# Bentuk shell (bukan bentuk exec array) SENGAJA dipakai di sini --
# supaya ${PORT} di-expand oleh shell saat container start, bukan
# saat image di-build. Bentuk exec array (CMD ["uvicorn", ...])
# TIDAK bisa expand environment variable seperti ini.
#
# Dibungkus eksplisit sebagai ["sh", "-c", "..."] (bentuk JSON array)
# supaya linter Docker tidak lagi warning "JSONArgsRecommended" --
# linter itu cuma mengecek APAKAH CMD ditulis sebagai array JSON,
# tidak benar-benar mengerti bahwa "exec" di dalam string sudah
# memperbaiki masalah sinyalnya. Perilakunya di runtime SAMA PERSIS
# seperti sebelumnya: tetap lewat shell (jadi ${PORT} tetap
# ke-expand), tetap pakai "exec" (jadi uvicorn tetap terima sinyal
# Docker langsung, bukan shell-nya).
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
