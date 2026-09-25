"""
SINKRONISASI BANK SOAL ANTAR 2 DATABASE POSTGRESQL
===================================================

Menyalin soal (t_question) beserta pilihan jawabannya
(t_question_option) dari database SUMBER ke database TUJUAN.

SYARAT PENAMBAHAN (sesuai permintaan):
    Soal HANYA ditambahkan ke tujuan kalau BELUM ADA soal dengan
    "question_text" DAN kumpulan "option_text" (pilihan jawaban)
    yang SAMA PERSIS pada mata pelajaran yang sama di database
    tujuan. Perbandingan case-insensitive & spasi berlebih
    dirapikan dulu (jadi "Matahari" == "matahari " dianggap sama),
    urutan pilihan jawaban TIDAK berpengaruh (A/B/C/D boleh
    tertukar, tetap dianggap sama kalau isi ke-4 teksnya identik).

    Soal yang sudah ada di tujuan TIDAK PERNAH diubah/ditimpa.
    Skrip ini HANYA MENAMBAH baris baru -- tidak pernah UPDATE
    atau DELETE apapun, baik di tujuan maupun di sumber. Aman
    dijalankan berkali-kali (idempotent): jalan ke-2/ke-3 dst
    tidak akan menggandakan soal yang sudah berhasil masuk.

CARA PAKAI
----------
Jalankan dari folder backend/. Isi 2 connection string PostgreSQL
lewat environment variable:

    set SOURCE_DATABASE_URL=postgresql://user:pass@host-sumber/db_sumber
    set TARGET_DATABASE_URL=postgresql://user:pass@host-tujuan/db_tujuan
    python scripts/sync_questions_between_db.py

Atau lewat argumen (menimpa env var kalau keduanya diisi):

    python scripts/sync_questions_between_db.py --source "postgresql://..." --target "postgresql://..."

Tambahkan --dry-run untuk MELIHAT DULU soal apa saja yang akan
ditambahkan, TANPA benar-benar menulis apapun ke database tujuan:

    python scripts/sync_questions_between_db.py --dry-run

CATATAN
-------
- Mata pelajaran (t_subject) dicocokkan lewat kolom "code" (unique),
  BUKAN "id" -- karena id bisa berbeda antara 2 database yang
  terpisah. Kalau sebuah subject dari sumber belum ada di tujuan
  (code-nya tidak ditemukan), subject itu OTOMATIS DIBUAT di tujuan
  (copy code/name/description/is_active) supaya soalnya tetap bisa
  masuk.
- "created_by" (guru/admin pembuat soal) dicocokkan lewat username.
  Kalau username itu tidak ditemukan di tujuan, created_by diisi
  NULL (bukan error) -- soal tetap tersimpan, cuma tanpa "penulis".
- Gambar soal (image_data/image_mime_type) ikut disalin apa adanya
  kalau kolomnya ada & soalnya memang punya gambar.
- Skrip ini TIDAK bergantung pada backend/.env / config.py --
  connection string sumber & tujuan sepenuhnya berdiri sendiri,
  supaya tidak tertukar dengan database yang sedang dipakai
  aplikasi berjalan.
- Ini script standalone (SQLAlchemy Core + reflection), jadi tetap
  jalan meski struktur kolom sedikit berbeda antar versi database
  (kolom yang tidak ada di salah satu sisi otomatis dilewati).
"""

import argparse
import os
import sys

from sqlalchemy import MetaData, Table, create_engine, select

# =========================================================
# NORMALISASI TEKS UNTUK PERBANDINGAN
#
# "Matahari", "matahari", "  matahari  " semuanya dianggap SAMA.
# Sengaja tidak menghapus tanda baca -- soal dengan tanda baca yang
# beda dianggap beda (mis. "2/4" vs "2 / 4" akan dianggap TIDAK
# sama), supaya tidak kelewat agresif menganggap dua soal yang
# sekilas mirip padahal sebenarnya beda sebagai duplikat.
# =========================================================

def normalize(text: str) -> str:
    return " ".join((text or "").strip().lower().split())


def question_signature(question_text: str, option_texts: list[str]) -> tuple:
    """Kunci pembanding "sama/tidak" untuk satu soal: teks soal +
    kumpulan teks pilihan jawaban (diurutkan supaya urutan asli
    A/B/C/D tidak berpengaruh)."""

    return (
        normalize(question_text),
        tuple(sorted(normalize(text) for text in option_texts)),
    )


def load_tables(engine):
    """Reflect (baca struktur asli dari database, bukan dari
    models.py) 4 tabel yang dibutuhkan. Pakai reflection supaya
    skrip ini tetap jalan walau ada sedikit beda kolom antar versi
    database sumber & tujuan."""

    metadata = MetaData()

    return {
        "subject": Table("t_subject", metadata, autoload_with=engine),
        "question": Table("t_question", metadata, autoload_with=engine),
        "option": Table("t_question_option", metadata, autoload_with=engine),
        "user": Table("t_user", metadata, autoload_with=engine),
    }


def main():

    parser = argparse.ArgumentParser(
        description="Sinkronisasi Bank Soal dari database Postgres sumber ke tujuan."
    )

    parser.add_argument(
        "--source",
        default=os.getenv("SOURCE_DATABASE_URL"),
        help="Connection string Postgres SUMBER (atau isi env var SOURCE_DATABASE_URL)",
    )

    parser.add_argument(
        "--target",
        default=os.getenv("TARGET_DATABASE_URL"),
        help="Connection string Postgres TUJUAN (atau isi env var TARGET_DATABASE_URL)",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Cuma tampilkan soal yang AKAN ditambahkan, tanpa menulis apapun ke tujuan.",
    )

    args = parser.parse_args()

    if not args.source or not args.target:
        sys.exit(
            "SOURCE_DATABASE_URL dan TARGET_DATABASE_URL wajib diisi "
            "(lewat environment variable atau --source/--target)."
        )

    source_engine = create_engine(args.source)
    target_engine = create_engine(args.target)

    src = load_tables(source_engine)
    tgt = load_tables(target_engine)

    # =====================================================
    # FASE 1 — BACA SAJA (sumber & tujuan, tidak menulis apapun)
    # =====================================================

    with source_engine.connect() as src_conn, target_engine.connect() as tgt_conn:

        # username -> id (tujuan), buat pemetaan created_by
        target_username_to_id = {
            row.username: row.id
            for row in tgt_conn.execute(select(tgt["user"].c.id, tgt["user"].c.username))
        }

        # id -> username (sumber), buat cari tahu siapa pembuat soal aslinya
        source_id_to_username = {
            row.id: row.username
            for row in src_conn.execute(select(src["user"].c.id, src["user"].c.username))
        }

        # code -> id (tujuan) & id -> row lengkap (sumber), buat cocokkan subject
        target_subject_code_to_id = {
            row.code: row.id
            for row in tgt_conn.execute(select(tgt["subject"].c.id, tgt["subject"].c.code))
        }

        source_subjects_by_id = {
            row.id: row
            for row in src_conn.execute(select(src["subject"]))
        }

        # Signature soal yang SUDAH ADA di tujuan, dikelompokkan per
        # subject_id TUJUAN (bukan subject_id sumber -- keduanya
        # berbeda numbering).
        existing_signatures: dict[int, set] = {}

        for q_row in tgt_conn.execute(
            select(tgt["question"].c.id, tgt["question"].c.subject_id, tgt["question"].c.question_text)
        ):
            option_rows = tgt_conn.execute(
                select(tgt["option"].c.option_text).where(
                    tgt["option"].c.question_id == q_row.id
                )
            ).fetchall()

            sig = question_signature(q_row.question_text, [o.option_text for o in option_rows])

            existing_signatures.setdefault(q_row.subject_id, set()).add(sig)

        # Subject dari sumber yang belum ada di tujuan (code belum
        # ketemu) -- dikumpulkan dulu, baru dibuat semua di Fase 2.
        subjects_to_create: dict[str, object] = {}

        # Daftar soal yang akan ditambahkan. subject_id di sini
        # SEMENTARA "None" kalau subject-nya baru mau dibuat di Fase
        # 2 -- ditandai lewat subject_code untuk diselesaikan nanti.
        to_insert = []

        skipped_existing = 0
        skipped_bad_subject = 0

        source_option_columns = [
            c for c in ("option_code", "option_text", "is_correct")
            if c in src["option"].c
        ]

        image_columns = [
            c for c in ("image_data", "image_mime_type")
            if c in src["question"].c and c in tgt["question"].c
        ]

        for q_row in src_conn.execute(select(src["question"])):

            source_subject = source_subjects_by_id.get(q_row.subject_id)

            if not source_subject:
                print(
                    f"[DILEWATI] Soal id={q_row.id} di sumber: subject_id "
                    f"{q_row.subject_id} tidak ditemukan (data sumber tidak konsisten)."
                )
                skipped_bad_subject += 1
                continue

            subject_code = source_subject.code

            target_subject_id = target_subject_code_to_id.get(subject_code)

            if target_subject_id is None:
                # Subject ini akan dibuat di Fase 2 -- pakai kode
                # negatif sementara supaya tetap bisa dikelompokkan
                # per-subject di `existing_signatures` selama Fase 1
                # ini (subject baru otomatis mulai dari 0 soal).
                subjects_to_create[subject_code] = source_subject
                signature_bucket_key = f"__new__:{subject_code}"
            else:
                signature_bucket_key = target_subject_id

            option_rows = src_conn.execute(
                select(src["option"]).where(
                    src["option"].c.question_id == q_row.id
                ).order_by(src["option"].c.option_code)
            ).fetchall()

            sig = question_signature(q_row.question_text, [o.option_text for o in option_rows])

            bucket = existing_signatures.setdefault(signature_bucket_key, set())

            if sig in bucket:
                skipped_existing += 1
                continue

            # Ditandai LANGSUNG supaya soal duplikat DI DALAM sumber
            # itu sendiri (atau beberapa soal sumber yang kebetulan
            # identik) tidak ikut dobel ditambahkan pada sync yang sama.
            bucket.add(sig)

            target_created_by = None
            source_username = source_id_to_username.get(q_row.created_by)

            if source_username:
                target_created_by = target_username_to_id.get(source_username)

            to_insert.append({
                "subject_code": subject_code,
                "target_subject_id": target_subject_id,  # None = nunggu dibuat di Fase 2
                "question_text": q_row.question_text,
                "question_type": q_row.question_type,
                "difficulty": q_row.difficulty,
                "correct_answer": getattr(q_row, "correct_answer", None),
                "explanation": q_row.explanation,
                "points": q_row.points,
                "is_active": q_row.is_active,
                "created_by": target_created_by,
                "image_data": getattr(q_row, "image_data", None) if "image_data" in image_columns else None,
                "image_mime_type": getattr(q_row, "image_mime_type", None) if "image_mime_type" in image_columns else None,
                "options": [
                    {col: getattr(o, col) for col in source_option_columns}
                    for o in option_rows
                ],
            })

    if not to_insert:
        print(
            f"Tidak ada soal baru untuk disinkronkan. "
            f"({skipped_existing} sudah ada di tujuan, {skipped_bad_subject} dilewati karena data tidak konsisten.)"
        )
        return

    print(f"Ditemukan {len(to_insert)} soal yang akan ditambahkan ke tujuan.")
    print(f"({skipped_existing} sudah ada di tujuan & dilewati, {skipped_bad_subject} dilewati karena data tidak konsisten.)")

    if subjects_to_create:
        print(
            "Mata pelajaran baru yang akan dibuat di tujuan: "
            + ", ".join(f"{code} ({row.name})" for code, row in subjects_to_create.items())
        )

    if args.dry_run:
        print("\n--dry-run aktif, tidak ada yang benar-benar ditulis ke tujuan. Contoh soal yang akan ditambahkan:\n")

        for item in to_insert[:20]:
            preview = item["question_text"][:80].replace("\n", " ")
            print(f"  [{item['subject_code']}] {preview}...")

        if len(to_insert) > 20:
            print(f"  ... dan {len(to_insert) - 20} soal lainnya.")

        return

    # =====================================================
    # FASE 2 — TULIS KE TUJUAN (satu transaksi, all-or-nothing)
    # =====================================================

    with target_engine.begin() as tgt_conn:

        for code, source_subject in subjects_to_create.items():

            result = tgt_conn.execute(
                tgt["subject"].insert().values(
                    code=source_subject.code,
                    name=source_subject.name,
                    description=getattr(source_subject, "description", None),
                    is_active=getattr(source_subject, "is_active", True),
                )
            )

            new_id = result.inserted_primary_key[0]
            target_subject_code_to_id[code] = new_id

            print(f"[SUBJECT BARU] {code} - {source_subject.name} (id baru: {new_id})")

        added_count = 0

        for item in to_insert:

            resolved_subject_id = (
                item["target_subject_id"]
                if item["target_subject_id"] is not None
                else target_subject_code_to_id[item["subject_code"]]
            )

            question_values = {
                "subject_id": resolved_subject_id,
                "question_text": item["question_text"],
                "question_type": item["question_type"],
                "difficulty": item["difficulty"],
                "correct_answer": item["correct_answer"],
                "explanation": item["explanation"],
                "points": item["points"],
                "is_active": item["is_active"],
                "created_by": item["created_by"],
            }

            if "image_data" in tgt["question"].c:
                question_values["image_data"] = item["image_data"]

            if "image_mime_type" in tgt["question"].c:
                question_values["image_mime_type"] = item["image_mime_type"]

            result = tgt_conn.execute(
                tgt["question"].insert().values(**question_values)
            )

            new_question_id = result.inserted_primary_key[0]

            for option in item["options"]:
                tgt_conn.execute(
                    tgt["option"].insert().values(
                        question_id=new_question_id,
                        **option,
                    )
                )

            added_count += 1

        # Transaksi otomatis commit di sini kalau tidak ada error
        # sepanjang loop di atas (keluar dari "with" tanpa exception).

    print(f"\nSelesai. {added_count} soal berhasil ditambahkan ke database tujuan.")


if __name__ == "__main__":
    main()
