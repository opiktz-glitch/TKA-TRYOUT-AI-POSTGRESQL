import psycopg2
conn = psycopg2.connect('postgresql://postgres:12345@localhost:5432/project_tz')
conn.autocommit = True
cur = conn.cursor()
try:
    cur.execute("UPDATE t_question SET true_label = 'Benar', false_label = 'Salah' WHERE true_label IS NULL;")
    print('Rows updated:', cur.rowcount)
except Exception as e:
    print('Error:', e)
