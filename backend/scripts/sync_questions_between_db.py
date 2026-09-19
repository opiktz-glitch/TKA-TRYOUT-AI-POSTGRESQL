"""
SINKRONISASI BANK SOAL ANTAR 2 DATABASE POSTGRESQL (BERDASARKAN SUBJECT DAN TEKS)
=============================================================================
Menyalin soal beserta pilihan jawabannya dari database sumber ke tujuan.
Pemeriksaan duplikat dilakukan berdasarkan subject_id yang sama dan question_text saja.
"""

import argparse
import os
import sys

from sqlalchemy import MetaData, Table, create_engine, select


def normalize(text: str) -> str:
  return " ".join((text or "").strip().lower().split())


def load_tables(engine):
  metadata = MetaData()
  return {
      "subject": Table("t_subject", metadata, autoload_with=engine),
      "question": Table("t_question", metadata, autoload_with=engine),
      "option": Table("t_question_option", metadata, autoload_with=engine),
      "user": Table("t_user", metadata, autoload_with=engine),
  }


def main():
  parser = argparse.ArgumentParser(
      description="Sinkronisasi Bank Soal Postgres (Berdasarkan Subject & Teks)."
  )
  parser.add_argument(
      "--source",
      default=os.getenv("SOURCE_DATABASE_URL"),
      help="Connection string Postgres SUMBER",
  )
  parser.add_argument(
      "--target",
      default=os.getenv("TARGET_DATABASE_URL"),
      help="Connection string Postgres TUJUAN",
  )
  parser.add_argument(
      "--dry-run",
      action="store_true",
      help="Tampilkan preview tanpa menulis ke database.",
  )

  args = parser.parse_args()

  if not args.source or not args.target:
    sys.exit("SOURCE_DATABASE_URL dan TARGET_DATABASE_URL wajib diisi.")

  source_engine = create_engine(args.source)
  target_engine = create_engine(args.target)

  src = load_tables(source_engine)
  tgt = load_tables(target_engine)

  with source_engine.connect() as src_conn, target_engine.connect() as tgt_conn:
    target_username_to_id = {
        row.username: row.id
        for row in tgt_conn.execute(
            select(tgt["user"].c.id, tgt["user"].c.username)
        )
    }

    source_id_to_username = {
        row.id: row.username
        for row in src_conn.execute(
            select(src["user"].c.id, src["user"].c.username)
        )
    }

    target_subject_code_to_id = {
        row.code: row.id
        for row in tgt_conn.execute(
            select(tgt["subject"].c.id, tgt["subject"].c.code)
        )
    }

    source_subjects_by_id = {
        row.id: row for row in src_conn.execute(select(src["subject"]))
    }

    # Pemetaan untuk mencatat teks soal yang sudah ada di tujuan berdasarkan target_subject_id
    existing_question_texts_by_subject: dict[int, set] = {}

    for q_row in tgt_conn.execute(
        select(
            tgt["question"].c.subject_id,
            tgt["question"].c.question_text,
        )
    ):
      normalized_q = normalize(q_row.question_text)
      existing_question_texts_by_subject.setdefault(
          q_row.subject_id, set()
      ).add(normalized_q)

    subjects_to_create = {}
    to_insert = []
    skipped_existing = 0

    source_option_columns = [
        c for c in ("option_code", "option_text", "is_correct") if c in src["option"].c
    ]
    image_columns = [
        c
        for c in ("image_data", "image_mime_type")
        if c in src["question"].c and c in tgt["question"].c
    ]

    for q_row in src_conn.execute(select(src["question"])):
      source_subject = source_subjects_by_id.get(q_row.subject_id)
      if source_subject:
        subject_code = source_subject.code
        subject_name = source_subject.name
        subject_desc = getattr(source_subject, "description", None)
        subject_active = getattr(source_subject, "is_active", True)
      else:
        subject_code = f"UNKNOWN_{q_row.subject_id}"
        subject_name = f"Mata Pelajaran {q_row.subject_id}"
        subject_desc = None
        subject_active = True

      target_subject_id = target_subject_code_to_id.get(subject_code)
      
      # Tentukan bucket pengecekan berdasarkan subject di target (jika belum ada, gunakan kode sementara)
      if target_subject_id is None:
        subjects_to_create[subject_code] = {
            "code": subject_code,
            "name": subject_name,
            "description": subject_desc,
            "is_active": subject_active,
        }
        bucket_key = f"__new__:{subject_code}"
      else:
        bucket_key = target_subject_id

      normalized_q = normalize(q_row.question_text)
      bucket = existing_question_texts_by_subject.setdefault(bucket_key, set())

      # Cek duplikat khusus dalam subject yang sama berdasarkan teks pertanyaan
      if normalized_q in bucket:
        skipped_existing += 1
        continue

      bucket.add(normalized_q)

      option_rows = src_conn.execute(
          select(src["option"])
          .where(src["option"].c.question_id == q_row.id)
          .order_by(src["option"].c.option_code)
      ).fetchall()

      target_created_by = None
      source_username = source_id_to_username.get(q_row.created_by)
      if source_username:
        target_created_by = target_username_to_id.get(source_username)

      to_insert.append({
          "subject_code": subject_code,
          "target_subject_id": target_subject_id,
          "question_text": q_row.question_text,
          "question_type": getattr(q_row, "question_type", "multiple_choice"),
          "difficulty": getattr(q_row, "difficulty", "medium"),
          "correct_answer": getattr(q_row, "correct_answer", None),
          "explanation": getattr(q_row, "explanation", None),
          "points": getattr(q_row, "points", 1),
          "is_active": getattr(q_row, "is_active", True),
          "created_by": target_created_by,
          "image_data": (
              getattr(q_row, "image_data", None)
              if "image_data" in image_columns
              else None
          ),
          "image_mime_type": (
              getattr(q_row, "image_mime_type", None)
              if "image_mime_type" in image_columns
              else None
          ),
          "options": [
              {col: getattr(o, col) for col in source_option_columns}
              for o in option_rows
          ],
      })

  if not to_insert:
    print(
        f"Tidak ada soal baru untuk disinkronkan. ({skipped_existing} soal"
        " serupa pada subject yang sama sudah ada di tujuan)."
    )
    return

  print(f"Ditemukan {len(to_insert)} soal baru untuk ditambahkan ke tujuan.")
  print(f"({skipped_existing} soal duplikat dalam subject yang sama dilewati).")

  if args.dry_run:
    print("\n--dry-run aktif. Contoh soal yang akan ditambahkan:")
    for item in to_insert[:10]:
      preview = item["question_text"][:80].replace("\n", " ")
      print(f"  [{item['subject_code']}] {preview}...")
    return

  with target_engine.begin() as tgt_conn:
    for code, subj_data in subjects_to_create.items():
      result = tgt_conn.execute(tgt["subject"].insert().values(**subj_data))
      new_id = result.inserted_primary_key[0]
      target_subject_code_to_id[code] = new_id
      print(f"[SUBJECT BARU] {code} - {subj_data['name']} (id: {new_id})")

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

      result = tgt_conn.execute(tgt["question"].insert().values(**question_values))
      new_question_id = result.inserted_primary_key[0]

      for option in item["options"]:
        tgt_conn.execute(
            tgt["option"].insert().values(
                question_id=new_question_id, **option
            )
        )

      added_count += 1

  print(f"\nSelesai. {added_count} soal berhasil ditambahkan ke database tujuan.")


if __name__ == "__main__":
  main()