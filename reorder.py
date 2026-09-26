with open('frontend/src/pages/AdminReport.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

rata_rata_start = content.find('          {/* RATA-RATA SKOR PER MAPEL */}')
tren_start = content.find('          {/* TREN JUMLAH ATTEMPT */}')
mata_pelajaran_start = content.find('          {/* GURU PALING AKTIF */}')
soal_start = content.find('          {/* SOAL PALING SERING SALAH (GLOBAL) */}')

rata_rata_block = content[rata_rata_start:tren_start]
tren_block = content[tren_start:mata_pelajaran_start]
mata_pelajaran_block = content[mata_pelajaran_start:soal_start]

rata_rata_block = rata_rata_block.replace('style={{ marginBottom: 14 }}', 'style={{ height: "100%" }}')
mata_pelajaran_block = mata_pelajaran_block.replace('style={{ marginBottom: 14 }}', 'style={{ height: "100%" }}')

new_structure = f"""          <div className="report-2-col">
{rata_rata_block}
{mata_pelajaran_block}
          </div>

{tren_block}
"""

new_content = content[:rata_rata_start] + new_structure + content[soal_start:]

with open('frontend/src/pages/AdminReport.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
