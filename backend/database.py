from config import DATABASE_URL
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# =========================================================
# IS_SQLITE
#
# Dipakai untuk membedakan 2 backend database yang didukung:
# - SQLite lokal (dev, DATABASE_URL kosong -> fallback file
#   database/project_tz.db)
# - PostgreSQL remote, mis. Neon (DATABASE_URL diisi manual,
#   contoh: postgresql://user:pass@ep-xxx-pooler.aws.neon.tech/db)
#
# connect_args={"check_same_thread": False} dan PRAGMA di bawah
# HANYA valid untuk SQLite — driver Postgres (psycopg2) akan error
# kalau dikasih connect_args itu, dan "PRAGMA ..." bukan SQL yang
# dikenali Postgres.
# =========================================================

IS_SQLITE = DATABASE_URL.startswith("sqlite")


# =========================================================
# check_same_thread=False (KHUSUS SQLITE)
#
# Modul sqlite3 bawaan Python secara default melarang satu koneksi
# dipakai lintas thread. FastAPI/Starlette menjalankan setiap
# dependency sync (termasuk get_db di bawah) di thread pool, jadi
# tanpa argumen ini SQLite akan menolak dengan error
# "SQLite objects created in a thread can only be used in that
# same thread".
#
# pool_pre_ping=True (KHUSUS POSTGRES/NEON)
#
# Neon (terutama tier gratis) mematikan compute-nya otomatis kalau
# tidak ada aktivitas beberapa menit ("scale-to-zero"). Koneksi lama
# yang sempat idle bisa jadi basi/putus tanpa terdeteksi Python.
# pool_pre_ping membuat SQLAlchemy test dulu ("SELECT 1") tiap ambil
# koneksi dari pool sebelum dipakai — kalau ternyata sudah putus,
# otomatis dibuang & bikin koneksi baru, bukan langsung error ke
# request pengguna. Tidak relevan untuk SQLite (tidak ada compute
# yang bisa auto-suspend), jadi cukup dinyalakan untuk Postgres saja.
# =========================================================

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=not IS_SQLITE,
)


# =========================================================
# PRAGMA SQLITE — DIJALANKAN SETIAP KONEKSI BARU DIBUKA
# (HANYA KALAU IS_SQLITE, dilewati sama sekali untuk Postgres)
#
# 1. foreign_keys=ON
#    SQLite tidak mengaktifkan pengecekan foreign key secara
#    default meskipun model sudah mendefinisikan ForeignKey.
#    Tanpa PRAGMA ini, SQLite akan tetap mengizinkan insert/
#    update yang menunjuk ke baris induk yang tidak ada, dan
#    tidak mencegah data yatim (orphan) saat baris induk
#    dihapus di luar jalur yang sudah divalidasi aplikasi.
#    (Postgres SELALU menegakkan foreign key secara default,
#    jadi tidak butuh pengaturan setara untuk ini.)
#
# 2. journal_mode=WAL
#    Mode default SQLite (rollback journal) mengunci SELURUH
#    file database setiap kali ada satu koneksi yang menulis —
#    koneksi lain (baca maupun tulis) harus menunggu sampai
#    lock dilepas. WAL memisahkan penulisan ke file log terpisah
#    (project_tz.db-wal) sehingga READER TIDAK LAGI DIBLOKIR
#    OLEH WRITER (dan sebaliknya).
#    (Postgres punya MVCC bawaan yang menangani ini secara
#    berbeda & jauh lebih baik, tidak butuh PRAGMA apa pun.)
#
# 3. busy_timeout=5000
#    Pelengkap WAL: kalau tetap ada writer lain yang sedang
#    memegang lock tepat di momen yang sama, koneksi yang
#    menunggu akan RETRY OTOMATIS sampai 5 detik sebelum
#    melempar error "database is locked".
# =========================================================

if IS_SQLITE:

    @event.listens_for(engine, "connect")
    def _configure_sqlite_connection(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


Base = declarative_base()


def get_db():

    db = SessionLocal()

    try:

        yield db

    finally:

        db.close()
