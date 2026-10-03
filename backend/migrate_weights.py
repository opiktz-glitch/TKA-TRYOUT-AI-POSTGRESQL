import os
import sys
from sqlalchemy import text
from database import engine

def add_columns():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE t_tryout ADD COLUMN weight_pg FLOAT DEFAULT 40.0;"))
            print("Added weight_pg")
        except Exception as e:
            print(f"Skipped weight_pg: {e}")
            
        try:
            conn.execute(text("ALTER TABLE t_tryout ADD COLUMN weight_mcma FLOAT DEFAULT 35.0;"))
            print("Added weight_mcma")
        except Exception as e:
            print(f"Skipped weight_mcma: {e}")

        try:
            conn.execute(text("ALTER TABLE t_tryout ADD COLUMN weight_bs FLOAT DEFAULT 25.0;"))
            print("Added weight_bs")
        except Exception as e:
            print(f"Skipped weight_bs: {e}")

if __name__ == "__main__":
    add_columns()
    print("Database migration completed.")
