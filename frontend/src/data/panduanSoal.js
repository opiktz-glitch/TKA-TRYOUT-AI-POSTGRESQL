// =====================================================
// DATA PANDUAN & KISI-KISI PENULISAN SOAL TKA
// =====================================================
// Rujukan: 
// 1. Standar Penulisan Soal CBT & Asesmen Nasional (Pusmendik)
// 2. Capaian Pembelajaran BSKAP Kemendikbudristek No. 032/H/KR/2024
//    untuk Jenjang SD / Fase A (Kls 1-2), Fase B (Kls 3-4), Fase C (Kls 5-6)

export const PANDUAN_SOAL_JUDUL = "Panduan & Kisi-Kisi Penulisan Soal TKA";
export const PANDUAN_SOAL_SUMBER = "Format CBT & Pemetaan Capaian Pembelajaran Kurikulum Merdeka (BSKAP No. 032/H/KR/2024)";

// -----------------------------------------------------
// 1. KAIDAH & FORMAT SOAL CBT
// -----------------------------------------------------
export const PANDUAN_KAIDAH_CBT = {
  title: "Panduan Teknis & Kaidah Penulisan Soal CBT",
  subtitle: "Prinsip konstruksi soal berkualitas, stimulus kontekstual, dan taksonomi level kognitif",
  sections: [
    {
      title: "1. Bentuk Soal pada Sistem CBT",
      items: [
        {
          label: "Pilihan Ganda (PG Tunggal)",
          text: "Terdiri dari pokok soal (stem) dan 4 pilihan jawaban (A, B, C, D) dengan hanya 1 kunci jawaban benar. Pengecoh (distraktor) harus homogen, logis, dan berfungsi baik."
        },
        {
          label: "Pilihan Ganda Kompleks (PGK)",
          text: "Peserta dapat memilih lebih dari satu jawaban benar (kotak centang / multi-select). Cocok untuk menguji analisis komparatif atau telaah beberapa pernyataan sekaligus."
        },
        {
          label: "Benar / Salah (True-False Matrix)",
          text: "Menyajikan tabel pernyataan berdasarkan stimulus bacaan/grafik, di mana peserta menentukan status kebenaran (Benar atau Salah) untuk setiap pernyataan."
        },
        {
          label: "Menjodohkan (Matching)",
          text: "Menghubungkan item pada premis kiri dengan respons di kolom kanan yang sesuai (mis. konsep dengan definisi, atau tokoh dengan perannya)."
        },
        {
          label: "Isian Singkat / Numerik",
          text: "Menuntut jawaban pasti berupa satu kata kunci, angka, atau nilai nominal tanpa multitafsir (mis. hasil perhitungan eksak)."
        }
      ]
    },
    {
      title: "2. Kaidah Konstruksi Soal",
      items: [
        {
          label: "Stimulus Kontekstual",
          text: "Gunakan bacaan, grafik, tabel, infografis, atau kasus dunia nyata yang menarik, akurat, mendidik, dan tidak mengandung unsur SARA/pornografi/kekerasan."
        },
        {
          label: "Pokok Soal Jelas (Stem)",
          text: "Rumuskan pokok soal secara tegas, lugas, dan terbebas dari petunjuk yang mengarah ke jawaban benar. Hindari penggunaan pernyataan negatif ganda (misal: 'Kecuali yang bukan...')."
        },
        {
          label: "Pilihan Jawaban Homogen",
          text: "Panjang kalimat pilihan jawaban relatif sama. Hindari opsi yang bergantung satu sama lain seperti 'Semua jawaban benar' atau 'Jawaban A dan B benar'."
        },
        {
          label: "Bahasa Baku & Komunikatif",
          text: "Gunakan kaidah bahasa Indonesia yang baik dan benar (EYD V), kalimat efektif, serta istilah sains/matematika yang baku sesuai jenjang usia peserta didik."
        }
      ]
    },
    {
      title: "3. Taksonomi Level Kognitif",
      items: [
        {
          label: "Level 1 - Mengetahui & Memahami (L1)",
          text: "Mengukur kemampuan mengingat kembali fakta, definisi, konsep dasar, menghitung operasi langsung, serta mengidentifikasi informasi tersurat."
        },
        {
          label: "Level 2 - Menerapkan / Mengaplikasikan (L2)",
          text: "Mengukur kemampuan menerapkan konsep, rumus, atau prosedur ke dalam situasi kontekstual rutin, menginterpretasikan data grafik, atau membaca peta sederhana."
        },
        {
          label: "Level 3 - Bernalar & Berpikir Kritis (L3 / HOTS)",
          text: "Mengukur kemampuan menganalisis argumen, mengevaluasi fakta vs opini, memecahkan masalah non-rutin, menarik kesimpulan dari multisumber, serta sintesis data."
        }
      ]
    }
  ]
};

// -----------------------------------------------------
// 2. KISI-KISI PEMETAAN IPAS (IPA) SD
// -----------------------------------------------------
export const KURIKULUM_IPAS = {
  subject: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
  fokus: "Pemahaman konsep sains dasar, investigasi fenomena alam, dan literasi lingkungan sekitar",
  elemenList: [
    {
      namaElemen: "Makhluk Hidup dan Lingkungannya",
      deskripsi: "Mempelajari karakteristik organisme, anatomi dasar, daur hidup, rantai makanan, dan ekosistem.",
      topics: [
        {
          subTopik: "Anggota Tubuh & Panca Indra",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Mengidentifikasi bagian tubuh manusia, fungsi 5 panca indra (penglihatan, pendengaran, penciuman, pengecap, peraba), serta cara merawat kebersihannya."
        },
        {
          subTopik: "Bagian Tumbuhan & Fotosintesis",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menjelaskan fungsi akar, batang, daun, bunga, dan buah; menguraikan kebutuhan dasar proses fotosintesis (cahaya, air, klorofil, CO2) dan hasilnya."
        },
        {
          subTopik: "Daur Hidup & Metamorfosis",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Membedakan siklus hidup hewan bermetamorfosis sempurna (kupu-kupu, nyamuk, katak) dan tidak sempurna (belalang, kecoa) serta hewan tanpa metamorfosis."
        },
        {
          subTopik: "Sistem Organ Tubuh Manusia",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menganalisis mekanisme kerja sistem pernapasan, pencernaan, dan peredaran darah manusia; mengenali gangguan kesehatan serta upaya pencegahannya."
        },
        {
          subTopik: "Ekosistem & Rantai Makanan",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menelaah hubungan rantai makanan dan jaring-jaring makanan; peran produsen, konsumen tingkat I-III, dekomposer, serta dampak gangguan ekosistem."
        },
        {
          subTopik: "Perkembangbiakan Makhluk Hidup",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Mengklasifikasikan perkembangbiakan hewan (ovipar, vivipar, ovovivipar) dan tumbuhan secara generatif (penyerbukan) serta vegetatif alami/buatan."
        }
      ]
    },
    {
      namaElemen: "Zat dan Sifatnya",
      deskripsi: "Mempelajari wujud benda, karakteristik materi, dan berbagai perubahan wujud zat dalam kehidupan sehari-hari.",
      topics: [
        {
          subTopik: "Wujud Benda & Karakteristiknya",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Mengidentifikasi sifat wujud zat padat, cair, dan gas berdasarkan bentuk, volume, kerapatan susunan partikel dasar, dan kemampuan mengalir."
        },
        {
          subTopik: "Perubahan Wujud Zat",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menganalisis peristiwa mencair, membeku, menguap, mengembun, menyublim, dan mengkristal dalam kehidupan kontekstual (pembuatan es, siklus hujan, kapur barus)."
        }
      ]
    },
    {
      namaElemen: "Energi dan Perubahannya",
      deskripsi: "Mempelajari aneka bentuk energi, gaya gerak, kelistrikan, kemagnetan, dan energi baru terbarukan.",
      topics: [
        {
          subTopik: "Bentuk Energi & Perubahannya",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menyebutkan aneka bentuk energi (panas, gerak, cahaya, bunyi, kimia, listrik) dan transformasi energi pada alat-alat rumah tangga sehari-hari."
        },
        {
          subTopik: "Gaya dan Pengaruhnya",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menganalisis pengaruh gaya otot, gaya gesek, gaya pegas, gaya magnet, dan gravitasi terhadap perubahan bentuk, kecepatan, dan arah gerak benda."
        },
        {
          subTopik: "Rangkaian Listrik & Sifat Magnet",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Membedakan sifat rangkaian seri vs paralel; mengidentifikasi benda konduktor dan isolator listrik; menjelaskan sifat kutub magnet dan pembuatan magnet buatan."
        },
        {
          subTopik: "Energi Terbarukan & Konservasi",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menelaah sumber energi alternatif terbarukan (surya, angin, air, biomassa, panas bumi) serta langkah nyata perilaku penghematan energi listrik."
        }
      ]
    },
    {
      namaElemen: "Bumi dan Antariksa",
      deskripsi: "Mempelajari kenampakan muka bumi, daur air, tata surya, serta fenomena pergerakan bumi dan bulan.",
      topics: [
        {
          subTopik: "Bentang Alam & Kenampakan Bumi",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Mengenal ragam bentang alam daratan dan perairan (gunung, dataran tinggi, pantai, sungai) serta upaya pencegahan erosi dan pelestarian tanah."
        },
        {
          subTopik: "Daur Air (Siklus Hidrologi)",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Mengurutkan tahapan siklus air (evaporasi, transpirasi, kondensasi, presipitasi, infiltrasi) dan pengaruh polusi/deforestasi terhadap ketersediaan air bersih."
        },
        {
          subTopik: "Sistem Tata Surya & Karakteristik Planet",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Mengelompokkan 8 planet dalam tata surya (planet dalam & planet luar), karakteristik matahari sebagai bintang pusat, komet, asteroid, dan meteoroid."
        },
        {
          subTopik: "Pergerakan Bumi dan Bulan",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menjelaskan akibat rotasi bumi (pergantian siang-malam, zona waktu) dan revolusi bumi (pergantian musim); menjelaskan proses gerhana matahari & gerhana bulan."
        }
      ]
    }
  ]
};

// -----------------------------------------------------
// 3. KISI-KISI PEMETAAN MATEMATIKA SD
// -----------------------------------------------------
export const KURIKULUM_MATEMATIKA = {
  subject: "Matematika",
  fokus: "Penalaran kuantitatif, komputasi numerik, pemecahan masalah spasial, aljabar, dan analisis data",
  elemenList: [
    {
      namaElemen: "Elemen Bilangan",
      deskripsi: "Pemahaman bilangan cacah, nilai tempat, pecahan, desimal, persen, faktor, dan akar pangkat.",
      topics: [
        {
          subTopik: "Bilangan Cacah & Nilai Tempat",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Membaca, menulis, membandingkan bilangan cacah sampai 100; menguraikan nilai tempat satuan dan puluhan."
        },
        {
          subTopik: "Penjumlahan & Pengurangan Dasar",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Menyelesaikan operasi hitung penjumlahan dan pengurangan sampai 100 dengan teknik bersusun tanpa/dengan menyimpan/meminjam."
        },
        {
          subTopik: "Perkalian & Pembagian Dasar",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Memahami konsep perkalian sebagai penjumlahan berulang dan pembagian sebagai pengurangan berulang; menguasai operasi perkalian/pembagian hingga 100."
        },
        {
          subTopik: "Bilangan Cacah Besar",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Membaca, menulis, membandingkan bilangan cacah hingga 10.000; menyelesaikan operasi hitung campuran bilangan cacah bertingkat."
        },
        {
          subTopik: "Faktor, Kelipatan, KPK & FPB",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menentukan kelipatan dan faktor persekutuan; menyelesaikan soal cerita kontekstual KPK dan FPB menggunakan faktorisasi prima."
        },
        {
          subTopik: "Bentuk & Jenis Pecahan",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Mengenal pecahan biasa, campuran, desimal, dan persen; menentukan pecahan senilai dan menyederhanakan pecahan."
        },
        {
          subTopik: "Operasi Pecahan & Desimal",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menghitung operasi tambah, kurang, kali, dan bagi berbagai bentuk pecahan serta desimal dalam pemecahan masalah kontekstual."
        },
        {
          subTopik: "Pangkat & Akar Pangkat",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menghitung nilai bilangan pangkat dua (kuadrat), akar kuadrat, pangkat tiga, dan akar pangkat tiga dalam perhitungan bangun ruang."
        }
      ]
    },
    {
      namaElemen: "Elemen Aljabar",
      deskripsi: "Pola visual bilangan, kesetaraan kalimat matematika, variabel sederhana, rasio, dan skala.",
      topics: [
        {
          subTopik: "Pola Gambar & Pola Bilangan",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Mengidentifikasi, meniru, dan melanjutkan pola visual berulang (bentuk/warna) serta barisan bilangan membesar/mengecil teratur."
        },
        {
          subTopik: "Kalimat Matematika & Variabel",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menemukan nilai yang belum diketahui (variabel sederhana/kotak kosong) pada persamaan operasi tambah atau kali (mis. n + 15 = 40)."
        },
        {
          subTopik: "Rasio, Perbandingan & Skala",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menyelesaikan perbandingan senilai; membaca dan menghitung skala denah/peta terhadap jarak sebenarnya di lapangan."
        }
      ]
    },
    {
      namaElemen: "Elemen Pengukuran",
      deskripsi: "Satuan baku panjang, berat, waktu, luas bangun datar, volume bangun ruang, kecepatan, dan debit.",
      topics: [
        {
          subTopik: "Satuan Panjang, Berat & Waktu",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Mengukur panjang dan berat dengan alat ukur baku (cm, m, gram, kg); membaca waktu pada jam analog dan digital (jam & menit)."
        },
        {
          subTopik: "Keliling & Luas Bangun Datar",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menghitung keliling dan luas persegi, persegi panjang, dan segitiga menggunakan rumus baku dan petak satuan."
        },
        {
          subTopik: "Luas Bangun Gabungan & Diarsir",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menghitung luas lingkaran, jajar genjang, trapesium, layang-layang, belah ketupat, serta luas daerah bangun datar gabungan."
        },
        {
          subTopik: "Volume Bangun Ruang",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menghitung volume kubus dan balok menggunakan kubus satuan dan rumus baku; konversi satuan volume (liter, ml, cm³, m³)."
        },
        {
          subTopik: "Luas Permukaan Bangun Ruang",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menghitung luas permukaan kubus dan balok berdasarkan uraian jaring-jaring bangun ruang."
        },
        {
          subTopik: "Kecepatan dan Debit",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menyelesaikan masalah kecepatan (jarak dibagi waktu) dan debit cairan (volume dibagi waktu alir)."
        }
      ]
    },
    {
      namaElemen: "Elemen Geometri",
      deskripsi: "Karakteristik bangun datar & ruang, sudut, garis, simetri, pengubinan, dan koordinat kartesius.",
      topics: [
        {
          subTopik: "Bangun Datar & Ruang Sederhana",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Mengenal bentuk segitiga, segiempat, lingkaran serta bangun ruang kubus, balok, bola, dan tabung di lingkungan sekitar."
        },
        {
          subTopik: "Sifat & Unsur Bangun Datar",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Mengidentifikasi sisi, sudut, diagonal, dan jenis-jenis segitiga (sama sisi, sama kaki, siku-siku, sembarang)."
        },
        {
          subTopik: "Sudut dan Hubungan Antargaris",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Membedakan sudut lancip, siku-siku, dan tumpul; mengenali hubungan dua garis sejajar, berpotongan, dan tegak lurus."
        },
        {
          subTopik: "Sifat Bangun Ruang & Jaring-jaring",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Mengidentifikasi rusuk, titik sudut, dan sisi pada prisma, tabung, limas, kerucut; menganalisis jaring-jaring kubus dan balok."
        },
        {
          subTopik: "Simetri, Pencerminan & Pengubinan",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menentukan sumbu simetri lipat, simetri putar bangun datar, hasil pencerminan bayangan, serta pola pengubinan berulang."
        },
        {
          subTopik: "Sistem Koordinat Kartesius",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menentukan letak titik atau objek pada bidang koordinat Kartesius kuadran I (pasangan absis x dan ordinat y)."
        }
      ]
    },
    {
      namaElemen: "Elemen Analisis Data & Peluang",
      deskripsi: "Pengumpulan data, membaca piktogram, diagram batang, garis, serta statistik ukuran pemusatan.",
      topics: [
        {
          subTopik: "Pengumpulan & Pencatatan Data",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Mengumpulkan data objek sederhana menggunakan turus dan menyajikannya ke dalam piktogram bergambar."
        },
        {
          subTopik: "Penyajian Diagram Batang & Garis",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Membaca, menafsirkan, dan menyajikan data frekuensi ke dalam bentuk diagram batang (vertikal/horizontal) dan diagram garis."
        },
        {
          subTopik: "Statistik Dasar (Mean, Median, Modus)",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menghitung nilai rata-rata (mean), nilai tengah (median), dan nilai yang paling sering muncul (modus) dari sekumpulan data tunggal."
        }
      ]
    }
  ]
};

// -----------------------------------------------------
// 4. KISI-KISI PEMETAAN BAHASA INDONESIA SD
// -----------------------------------------------------
export const KURIKULUM_BAHASA_INDONESIA = {
  subject: "Bahasa Indonesia",
  fokus: "Literasi membaca pemahaman, keterampilan menyimak kritis, apresiasi sastra fiksi/nonfiksi, dan kaidah menulis",
  elemenList: [
    {
      namaElemen: "Elemen Menyimak",
      deskripsi: "Kecakapan menerima informasi lisan, memahami alur instruksi, ide pokok pembicaraan, dan evaluasi pesan.",
      topics: [
        {
          subTopik: "Instruksi Lisan & Cerita Fabel",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Memahami dan melaksanakan arahan/instruksi lisan guru; mengingat kembali tokoh dan alur dongeng/fabel yang diperdengarkan."
        },
        {
          subTopik: "Ide Pokok & Informasi Teks Lisan",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Mencatat pokok-pokok informasi dari penjelasan lisan atau audio narasi; menanggapi pertanyaan seputar teks yang didengar."
        },
        {
          subTopik: "Analisis Kritis & Fakta vs Opini Lisan",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menganalisis keakuratan isi rekaman berita/ceramah; membedakan fakta objektif dengan opini pembicara."
        }
      ]
    },
    {
      namaElemen: "Elemen Membaca dan Memirsa",
      deskripsi: "Keterampilan membaca lancar, kosakata baru, identifikasi ide pokok/pendukung, serta analisis unsur cerita.",
      topics: [
        {
          subTopik: "Membaca Permulaan & Teks Visual",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Membaca suku kata dan kata dengan lafal jelas; mengaitkan gambar ilustrasi visual dengan kalimat teks cerita sederhana."
        },
        {
          subTopik: "Kosakata Kontekstual & Sinonim/Antonim",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menemukan arti kosakata baru dalam teks bacaan menggunakan konteks kalimat atau KBBI; menentukan padanan dan lawan kata."
        },
        {
          subTopik: "Unsur Intrinsik Cerita Fiksi",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Mengidentifikasi tokoh, watak/penokohan, latar tempat/waktu/suasana, konflik alur, dan amanat dalam cerita pendek/cergam."
        },
        {
          subTopik: "Membaca Pemahaman Kritis & Ide Pokok",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menemukan ide pokok paragraf (deduktif/induktif), membedakan informasi tersurat vs tersirat, menarik simpulan logis, dan membandingkan 2 teks bertopik sama."
        }
      ]
    },
    {
      namaElemen: "Elemen Berbicara dan Mempresentasikan",
      deskripsi: "Kecakapan berekspresi secara lisan santun, berdiskusi, wawancara, pidato, dan presentasi gagasan.",
      topics: [
        {
          subTopik: "Menceritakan Pengalaman Diri",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Menceritakan pengalaman pribadi atau perasaan dengan kalimat santun, volume suara jelas, dan kontak mata wajar."
        },
        {
          subTopik: "Musyawarah & Presentasi Sederhana",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menyampaikan pendapat atau usul dalam diskusi kelompok; mempresentasikan laporan hasil pengamatan lingkungan."
        },
        {
          subTopik: "Teknik Wawancara & Pidato Resmi",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menyusun daftar pertanyaan wawancara dengan rumus 5W1H (ADiKSiMBa); menyampaikan pidato singkat dengan intonasi dan gestur sesuai konteks."
        }
      ]
    },
    {
      namaElemen: "Elemen Menulis",
      deskripsi: "Penyusunan kalimat efektif, penulisan ragam teks (narasi, deskripsi, prosedur, eksplanasi), dan kaidah EYD.",
      topics: [
        {
          subTopik: "Menulis Permulaan & Tanda Baca Dasar",
          fase: "Fase A",
          kelas: "Kelas 1-2",
          indikator: "Menulis kalimat sederhana dengan spasi antarkata yang rapi; memakai huruf kapital di awal kalimat dan nama orang, serta tanda titik (.) dan tanya (?)."
        },
        {
          subTopik: "Menulis Teks Narasi & Deskripsi",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menyusun karangan narasi pengalaman dengan urutan waktu kronologis (konjungsi lalu, kemudian); mendeskripsikan ciri-ciri objek benda atau tempat."
        },
        {
          subTopik: "Menulis Teks Prosedur & Formulir",
          fase: "Fase B",
          kelas: "Kelas 3-4",
          indikator: "Menyusun petunjuk atau langkah-langkah membuat/melakukan sesuatu secara runtut; mengisi data formulir pendaftaran diri."
        },
        {
          subTopik: "Teks Eksplanasi Ilmiah & Surat Resmi",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menulis teks eksplanasi mengenai hubungan sebab-akibat fenomena alam/sosial; menulis surat dinas/undangan dengan struktur baku."
        },
        {
          subTopik: "Penerapan Ejaan (EYD V) & Meringkas",
          fase: "Fase C",
          kelas: "Kelas 5-6",
          indikator: "Menerapkan tanda baca koma, titik dua, tanda petik; memakai imbuhan pembentuk kata (me-, di-, pe-an, ter-); membuat ringkasan/sinopsis dari teks panjang."
        }
      ]
    }
  ]
};

// Default export untuk backward compatibility
export const PANDUAN_SOAL_SECTIONS = [
  {
    title: "1. Kaidah Format CBT",
    paragraphs: [PANDUAN_KAIDAH_CBT.subtitle],
    items: PANDUAN_KAIDAH_CBT.sections[0].items
  },
  {
    title: "2. Bahasa Indonesia",
    paragraphs: [KURIKULUM_BAHASA_INDONESIA.fokus],
    items: KURIKULUM_BAHASA_INDONESIA.elemenList.map(e => ({
      label: e.namaElemen,
      text: e.deskripsi
    }))
  },
  {
    title: "3. Matematika",
    paragraphs: [KURIKULUM_MATEMATIKA.fokus],
    items: KURIKULUM_MATEMATIKA.elemenList.map(e => ({
      label: e.namaElemen,
      text: e.deskripsi
    }))
  },
  {
    title: "4. IPAS (IPA)",
    paragraphs: [KURIKULUM_IPAS.fokus],
    items: KURIKULUM_IPAS.elemenList.map(e => ({
      label: e.namaElemen,
      text: e.deskripsi
    }))
  }
];
