# Otomatisasi deploy frontend ke tzserver

Workflow `.github/workflows/deploy-tzserver-frontend.yml` otomatis membangun dan mengirim **frontend saja** ke tzserver setelah perubahan di `frontend/` masuk ke branch `main`. Workflow juga dapat dijalankan manual dari tab Actions di GitHub.

Build memakai `VITE_API_URL=/`, sehingga request API memakai path relatif `/api` dan diteruskan oleh Nginx tzserver. Build diperiksa agar tidak mengandung hostname Tailscale, domain `rumahzafira`, atau `localhost:8000`. Workflow tidak mengubah environment variable Vercel.

## Persiapan di tzserver

Workflow mengunggah folder `dist` sebagai user SSH `admintz`, lalu memasang isinya ke `/var/www/tka-dist`. Siapkan autentikasi SSH berbasis key untuk user tersebut dan batasi sudo tanpa password hanya untuk perintah sinkronisasi frontend berikut. Sesuaikan path `/usr/bin/rsync` bila hasil `command -v rsync` di server berbeda.

Validasi aturan sudoers dengan `visudo -c` sebelum menyimpan:

```sudoers
admintz ALL=(root) NOPASSWD: /usr/bin/rsync -a --delete --chown=root:root /home/admintz/dist/ /var/www/tka-dist/
```

Jangan memberi akses `NOPASSWD: ALL`. Workflow tidak perlu mengubah backend, database, atau konfigurasi Nginx/Tailscale.

## Secrets GitHub

Tambahkan secrets berikut di **Settings → Secrets and variables → Actions** pada repository:

| Secret | Isi |
|---|---|
| `TS_OAUTH_CLIENT_ID` | Client ID OAuth Tailscale untuk runner deploy |
| `TS_OAUTH_SECRET` | Client secret OAuth Tailscale |
| `TZSERVER_SSH_HOST` | IP Tailscale atau nama DNS tailnet tzserver yang dapat dijangkau runner |
| `TZSERVER_SSH_PRIVATE_KEY` | Private key SSH yang cocok dengan public key pada akun `admintz` |
| `TZSERVER_SSH_KNOWN_HOSTS` | Baris host key SSH untuk host yang dipakai di `TZSERVER_SSH_HOST` |

Batasi ACL tailnet agar tag `tag:gha-tz-deploy` hanya dapat mengakses port SSH tzserver. Verifikasi fingerprint host key melalui jalur tepercaya sebelum menyimpannya sebagai secret; jangan mempercayai hasil `ssh-keyscan` yang belum diverifikasi.

Karena repository bersifat publik, lindungi branch `main` dan jangan memberi secrets deployment ke workflow pull request. Workflow hanya berjalan untuk push ke `main` atau dispatch pada `main`.

## Cakupan dan verifikasi

- Workflow hanya memperbarui frontend statis di `/var/www/tka-dist`.
- Backend, perubahan skema, dan migrasi database **tidak** diperbarui otomatis. Ikuti prosedur backend terpisah setelah perubahan backend ditinjau.
- Setelah pemasangan, workflow memastikan `http://127.0.0.1:8081/` membalas HTTP 200 dan `/api/auth/me` membalas 401 atau 403 tanpa autentikasi.
- Jika persiapan SSH/sudo atau smoke test gagal, job akan gagal dan log Actions menunjukkan langkah yang bermasalah.
