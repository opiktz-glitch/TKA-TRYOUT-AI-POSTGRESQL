// =====================================================
// HELPER TANGGAL
//
// Backend menyimpan & mengirim timestamp sebagai UTC TANPA info
// zona waktu (mis. "2026-09-21T03:00:00"). Kalau string seperti
// itu langsung dilempar ke `new Date()`, browser menganggapnya
// WAKTU LOKAL, bukan UTC -- di Jakarta (UTC+7) hasilnya meleset
// 7 jam ("selesai 5 menit lalu" tampil "7 jam lalu").
//
// parseUtcDate() memaksa string tanpa zona waktu diperlakukan
// sebagai UTC. String yang sudah punya zona ("...Z" atau
// "+07:00") dibiarkan apa adanya.
//
// Mengembalikan objek Date, atau null kalau nilainya kosong /
// tidak valid.
// =====================================================

export function parseUtcDate(value) {
  if (!value) {
    return null;
  }

  let date;
  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === "string") {
    const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
    date = new Date(hasTimezone ? value : `${value}Z`);
  } else {
    return null;
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

function dateParts(date, timeZone) {
  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  if (timeZone) options.timeZone = timeZone;

  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", options)
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );
}

function timeParts(date, timeZone) {
  const options = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
  if (timeZone) options.timeZone = timeZone;

  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", options)
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );
}

function isDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function formatDate(value, { timeZone } = {}) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (!isDateOnly(value)) return "-";
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  const date = parseUtcDate(value);
  if (!date) return "-";

  const parts = dateParts(date, timeZone);
  return `${parts.day}-${parts.month}-${parts.year}`;
}

export function formatTime(value, { timeZone } = {}) {
  const date = parseUtcDate(value);
  if (!date) return "-";

  const parts = timeParts(date, timeZone);
  return `${parts.hour}:${parts.minute}`;
}

export function formatDateTime(value, { timeZone } = {}) {
  const date = parseUtcDate(value);
  if (!date) return "-";

  const parts = dateParts(date, timeZone);

  return `${parts.day}-${parts.month}-${parts.year} ${formatTime(date, { timeZone })}`;
}
