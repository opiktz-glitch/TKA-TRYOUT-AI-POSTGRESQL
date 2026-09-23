from datetime import datetime


# =========================================================
# NOMOR PERCOBAAN (mis. "Percobaan ke-2 dari 3")
#
# Sistem ini mengizinkan siswa mengerjakan ulang tryout yang sama
# (retake) -- lihat komentar index parsial di models.Attempt. Kalau
# ada lebih dari satu attempt untuk pasangan siswa+tryout yang sama,
# baris-barisnya jadi terlihat identik (nama siswa & judul tryout
# sama persis) di tabel Nilai/Riwayat, sehingga sulit dibedakan --
# terutama sekarang admin bisa menghapus satu baris nilai secara
# individual.
#
# Fungsi ini murni komputasi di Python atas attempt yang SUDAH
# ditarik dari database (tidak query tambahan, tidak perlu kolom
# baru di skema). Dipanggil dengan attempt ORM object (punya
# .id, .student_id, .tryout_id, .started_at).
# =========================================================

def compute_attempt_numbers(attempts):
    """
    Mengelompokkan attempt per (student_id, tryout_id), lalu
    mengurutkannya berdasarkan started_at menaik (attempt yang
    dimulai lebih dulu = percobaan ke-1) -- id dipakai sebagai
    tie-breaker kalau started_at kebetulan sama.

    Return: dict {attempt_id: (attempt_number, attempt_total)}
    """

    groups = {}

    for attempt in attempts:
        key = (attempt.student_id, attempt.tryout_id)
        groups.setdefault(key, []).append(attempt)

    numbers = {}

    for group in groups.values():
        ordered = sorted(
            group,
            key=lambda a: (a.started_at or datetime.min, a.id)
        )

        total = len(ordered)

        for index, attempt in enumerate(ordered, start=1):
            numbers[attempt.id] = (index, total)

    return numbers
