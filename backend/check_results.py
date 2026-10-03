import os
from database import engine
from sqlalchemy import text

def check_recent_results():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT r.id, r.score, r.percentage, r.correct_count, r.wrong_count, r.unanswered_count, a.finished_at
            FROM t_result r
            JOIN t_tryout_attempt a ON r.attempt_id = a.id
            ORDER BY r.completed_at DESC
            LIMIT 3;
        """))
        
        rows = result.fetchall()
        print("Recent Results:")
        for row in rows:
            print(f"Result ID: {row[0]}, Score: {row[1]}, Perc: {row[2]}, Correct: {row[3]}, Wrong: {row[4]}, Unanswered: {row[5]}, Finished: {row[6]}")

if __name__ == "__main__":
    check_recent_results()
