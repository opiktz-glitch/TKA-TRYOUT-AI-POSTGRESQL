# =========================================================
# STAGE 1: BUILD
# Compile React/Vite jadi static file (HTML/CSS/JS) di folder dist/.
# Image node ini sendiri TIDAK ikut ke image final -- cuma dipakai
# sementara untuk proses build, makanya disebut "multi-stage build".
# =========================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json + lockfile duluan, terpisah dari copy kode --
# supaya layer cache "npm ci" tidak perlu diulang tiap kali cuma
# kode React yang berubah, hanya re-run kalau dependency berubah.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# =========================================================
# STAGE 2: RUNTIME
# Image akhir yang sungguhan dipakai/dideploy -- cuma berisi nginx
# + hasil build statis dari stage di atas, TANPA node_modules atau
# toolchain Node sama sekali (jauh lebih kecil & lebih aman).
# =========================================================
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# nginx.conf.template pakai placeholder ${PORT} -- image nginx:alpine
# SUDAH punya mekanisme bawaan (sejak nginx 1.19) untuk otomatis
# envsubst semua file *.template di /etc/nginx/templates/ jadi file
# config asli di /etc/nginx/conf.d/ setiap kali container start,
# berdasarkan environment variable yang di-set saat runtime. Jadi
# TIDAK perlu entrypoint script custom untuk ini.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Platform hosting (Back4App dkk) biasanya inject PORT sendiri saat
# runtime, beda-beda tiap platform -- ENV di sini cuma nilai DEFAULT
# kalau tidak di-override (mis. dijalankan manual lewat "docker run"
# tanpa -e PORT, atau lewat docker-compose untuk dev lokal).
ENV PORT=80

EXPOSE ${PORT}

# Tidak perlu override CMD -- image nginx:alpine sudah punya default
# CMD ["nginx", "-g", "daemon off;"] bawaan yang sesuai.
