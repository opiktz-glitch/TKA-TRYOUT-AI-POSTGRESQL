// =====================================================
// POTONG GAMBAR DARI SUMBER (tahap 2 Import dari Gambar)
//
// BERDIRI SENDIRI -- hanya dipakai ImportImageModal & ImageCropDialog.
//
// Pemotongan dilakukan di BROWSER dari file asli (resolusi penuh),
// bukan di backend, karena:
//   - backend tidak perlu mengirim byte gambar balik ke browser
//   - guru bisa mengoreksi kotak dari AI dan hasilnya langsung
//     terlihat, tanpa bolak-balik ke server
//   - kualitas potongan tidak terpengaruh kompresi/resize yang
//     dipakai untuk mengirim gambar ke AI
//
// Kotak (`box`) selalu dalam PECAHAN 0..1 dari lebar/tinggi gambar
// sumber: { x, y, w, h }.
// =====================================================

export const FULL_BOX = { x: 0, y: 0, w: 1, h: 1 };

// Backend (image_service.py) akhirnya memperkecil lebar ke 1280px,
// jadi tidak ada gunanya mengunggah lebih lebar dari ini.
const MAX_OUTPUT_WIDTH = 1600;

// Batas upload backend = 5 MB (image_service.MAX_UPLOAD_BYTES).
// Diberi selisih supaya aman.
const MAX_OUTPUT_BYTES = 4.5 * 1024 * 1024;

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);

    const img = new Image();

    img.onload = () => resolve({ img, url });

    img.onerror = () => {
      URL.revokeObjectURL(url);

      reject(new Error("Gambar sumber tidak bisa dibuka untuk dipotong."));
    };

    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Potong `file` sesuai `box` -> Blob (PNG; JPEG kalau PNG terlalu besar).
export async function cropToBlob(file, box) {
  const { img, url } = await loadImageElement(file);

  try {
    const sourceWidth = img.naturalWidth;
    const sourceHeight = img.naturalHeight;

    const sx = Math.min(sourceWidth - 1, Math.max(0, Math.round(box.x * sourceWidth)));
    const sy = Math.min(sourceHeight - 1, Math.max(0, Math.round(box.y * sourceHeight)));

    const cropWidth = Math.max(1, Math.min(sourceWidth - sx, Math.round(box.w * sourceWidth)));
    const cropHeight = Math.max(1, Math.min(sourceHeight - sy, Math.round(box.h * sourceHeight)));

    const scale = Math.min(1, MAX_OUTPUT_WIDTH / cropWidth);

    const outWidth = Math.max(1, Math.round(cropWidth * scale));
    const outHeight = Math.max(1, Math.round(cropHeight * scale));

    const canvas = document.createElement("canvas");

    canvas.width = outWidth;
    canvas.height = outHeight;

    const context = canvas.getContext("2d");

    // Latar putih dulu: PNG transparan kalau tidak, area
    // transparannya jadi hitam saat dikonversi ke JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outWidth, outHeight);

    context.imageSmoothingQuality = "high";

    context.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, outWidth, outHeight);

    let blob = await canvasToBlob(canvas, "image/png");

    if (blob && blob.size > MAX_OUTPUT_BYTES) {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
    }

    if (!blob || blob.size > MAX_OUTPUT_BYTES) {
      throw new Error("Potongan gambar terlalu besar. Pilih bagian yang lebih kecil.");
    }

    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function blobToFile(blob) {
  const extension = blob.type === "image/jpeg" ? "jpg" : "png";

  return new File([blob], `gambar-soal.${extension}`, { type: blob.type });
}
