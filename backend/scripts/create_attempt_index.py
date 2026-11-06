"""Create the partial unique index required for active tryout attempts."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import engine
from sqlalchemy import text


def main():
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "uq_attempt_active_per_student_tryout "
                "ON t_attempt (student_id, tryout_id) "
                "WHERE status = 'IN_PROGRESS'"
            )
        )
    print("Index uq_attempt_active_per_student_tryout siap.")


if __name__ == "__main__":
    main()
