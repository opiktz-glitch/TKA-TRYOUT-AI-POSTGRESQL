import sqlite3
import os

from dotenv import load_dotenv

load_dotenv()

db_path = os.getenv("DATABASE_URL")
if db_path and db_path.startswith("sqlite:///"):
    db_path = db_path.replace("sqlite:///", "")
else:
    db_path = "database/project_tz.db"

# Gunakan absolute path jika diperlukan, di sini asumsikan run dari backend/
print(f"Migrating database: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE t_question ADD COLUMN true_label VARCHAR(50) DEFAULT 'Benar' NOT NULL")
        print("Kolom 'true_label' berhasil ditambahkan.")
    except sqlite3.OperationalError as e:
        print(f"Skipping true_label: {e}")

    try:
        cursor.execute("ALTER TABLE t_question ADD COLUMN false_label VARCHAR(50) DEFAULT 'Salah' NOT NULL")
        print("Kolom 'false_label' berhasil ditambahkan.")
    except sqlite3.OperationalError as e:
        print(f"Skipping false_label: {e}")

    conn.commit()
    conn.close()
    print("Migrasi selesai.")
except Exception as e:
    print(f"Error migrasi: {e}")
