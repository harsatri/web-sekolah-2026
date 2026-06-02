# Script Black Box Testing Sistem Kelayakan Calon Siswa

Dokumen ini disusun berdasarkan fitur yang aktif pada aplikasi `WebSekolah-2026`. Pengujian dilakukan dengan pendekatan black box testing, yaitu memeriksa kesesuaian keluaran sistem terhadap input dan aksi pengguna tanpa meninjau struktur kode di dalamnya.

Kolom `Hasil` sengaja dibiarkan `-` agar dapat diisi saat pelaksanaan pengujian.

## 1. Beranda

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka halaman beranda aplikasi | Semua pengguna | Sistem menampilkan halaman beranda berisi navbar, informasi fitur, panduan, sekolah, FAQ, dan footer | - |
| 2 | Klik menu navigasi `Beranda`, `Fitur`, `Sekolah`, `Panduan`, atau `FAQ` | Semua pengguna | Sistem mengarahkan scroll ke bagian halaman yang dipilih | - |

## 2. Login

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Mengisi email dan password yang valid lalu klik `Login` | Semua pengguna | Jika data benar, pengguna berhasil masuk ke sistem sesuai role akun | - |
| 2 | Mengisi email atau password yang salah lalu klik `Login` | Semua pengguna | Sistem menampilkan pesan kesalahan login | - |
| 3 | Mengosongkan email atau password lalu klik `Login` | Semua pengguna | Sistem menampilkan validasi bahwa email dan password wajib diisi | - |
| 4 | Login sebagai `super_admin` dari opsi login admin | Super Admin | Sistem mengarahkan pengguna ke dashboard super admin | - |
| 5 | Login sebagai `school_admin` dari opsi login admin | Admin sekolah | Sistem mengarahkan pengguna ke dashboard admin sekolah | - |
| 6 | Login dengan role yang tidak sesuai pilihan login | Semua pengguna | Sistem menolak akses dan menampilkan pesan bahwa role login tidak sesuai | - |
| 7 | Login menggunakan akun yang dinonaktifkan | Semua pengguna | Sistem menolak login dan menampilkan pesan akun dinonaktifkan | - |

## 3. Logout

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Menekan tombol `Logout` pada navbar publik saat sudah login | Semua pengguna yang sudah login | Sistem menghapus sesi login dan pengguna keluar dari sistem | - |
| 2 | Menekan tombol `Logout` pada layout sistem | Super Admin / Admin sekolah | Sistem menghapus sesi login dan mengarahkan pengguna ke halaman utama | - |

## 4. Registrasi User

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Mengisi nama, email, password valid lalu klik `Buat akun` | Orang tua / user | Sistem membuat akun user baru dan mengarahkan pengguna ke halaman utama | - |
| 2 | Menggunakan email yang sudah terdaftar | Orang tua / user | Sistem menolak pendaftaran dan menampilkan pesan email sudah terdaftar | - |
| 3 | Mengosongkan salah satu field wajib pada form registrasi user | Orang tua / user | Sistem menampilkan validasi field wajib | - |

## 5. Registrasi Sekolah

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Mengisi seluruh data sekolah dan akun penanggung jawab dengan benar lalu klik `Daftarkan Sekolah` | Calon sekolah | Sistem menambahkan data sekolah dan akun sekolah | - |
| 2 | Mendaftarkan sekolah dengan nama dan kecamatan yang sudah terdaftar | Calon sekolah | Sistem menolak pendaftaran dan menampilkan pesan sekolah sudah terdaftar di wilayah tersebut | - |
| 3 | Mengosongkan data wajib seperti nama sekolah, alamat, kontak, email, atau password | Calon sekolah | Sistem menampilkan validasi field wajib | - |

## 6. Proteksi Akses Halaman Simulasi

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka halaman `/kelayakan` tanpa login | Orang tua / user | Sistem mengarahkan pengguna ke halaman login | - |
| 2 | Membuka halaman `/kelayakan` setelah login | Orang tua / user | Sistem menampilkan form simulasi kelayakan multi-langkah | - |

## 7. Simulasi Kelayakan SAW

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Mengisi seluruh langkah form simulasi dengan data valid lalu submit | Orang tua / user | Sistem menghitung skor SAW, menampilkan status kelayakan, ranking sekolah, dan breakdown kriteria | - |
| 2 | Submit simulasi saat ada langkah yang belum lengkap | Orang tua / user | Sistem menolak proses simulasi dan menampilkan pesan validasi pada langkah yang belum lengkap | - |
| 3 | Mengisi data domisili sehingga skor domisili sekolah berbeda | Orang tua / user | Sistem menampilkan ranking sekolah berdasarkan perhitungan nilai preferensi masing-masing sekolah | - |
| 4 | Mengisi data prestasi, rapor, dokumen, dan ekonomi yang berbeda | Orang tua / user | Sistem mengubah nilai skor akhir sesuai input dan bobot SAW | - |

## 8. Penyimpanan Hasil Simulasi

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Menjalankan simulasi hingga selesai dengan koneksi backend normal | Orang tua / user | Hasil simulasi tampil dan data simulasi tersimpan ke database | - |
| 2 | Menjalankan simulasi saat backend gagal menyimpan data | Orang tua / user | Hasil simulasi tetap tampil, tetapi sistem menampilkan pesan bahwa penyimpanan gagal | - |

## 9. Detail Sekolah

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka detail sekolah setelah login | Semua pengguna yang sudah login | Sistem menampilkan informasi lengkap sekolah, galeri, fasilitas, program, dan data operasional | - |
| 2 | Membuka detail sekolah tanpa login | Semua pengguna | Sistem mengarahkan pengguna ke halaman login | - |
| 3 | Membuka detail sekolah dengan ID yang tidak ditemukan | Semua pengguna yang sudah login | Sistem menampilkan pesan bahwa sekolah tidak ditemukan | - |
| 4 | Klik foto galeri sekolah | Semua pengguna yang sudah login | Sistem menampilkan tampilan lightbox galeri sekolah | - |

## 10. Dashboard Admin Sekolah

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka dashboard admin sekolah setelah login | Admin sekolah | Sistem menampilkan ringkasan simulasi, grafik, distribusi skor, dan daftar rekomendasi terbaru | - |
| 2 | Membuka dashboard admin sekolah dengan akun non-admin sekolah | Pengguna selain admin sekolah | Sistem menolak akses dan mengarahkan pengguna ke halaman yang sesuai | - |

## 11. Data Pengguna Direkomendasikan

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka menu `Data Pengguna Direkomendasikan` | Admin sekolah | Sistem menampilkan daftar calon siswa yang direkomendasikan ke sekolah tersebut | - |
| 2 | Memfilter data berdasarkan kategori skor | Admin sekolah | Sistem menampilkan daftar sesuai filter skor yang dipilih | - |
| 3 | Memfilter data berdasarkan hari ini, 7 hari terakhir, 30 hari terakhir, atau rentang kustom | Admin sekolah | Sistem menampilkan data sesuai filter tanggal | - |
| 4 | Mengurutkan data berdasarkan tanggal simulasi | Admin sekolah | Sistem mengubah urutan data sesuai arah sort | - |
| 5 | Mengurutkan data berdasarkan skor V | Admin sekolah | Sistem mengubah urutan data sesuai arah sort | - |
| 6 | Berpindah halaman menggunakan pagination | Admin sekolah | Sistem menampilkan data sesuai halaman yang dipilih | - |
| 7 | Mengekspor laporan PDF dari data yang sedang terfilter | Admin sekolah | Sistem menghasilkan laporan PDF sesuai filter aktif | - |
| 8 | Membuka detail salah satu data simulasi | Admin sekolah | Sistem menampilkan halaman detail simulasi user yang dipilih | - |

## 12. Detail Pengguna Direkomendasikan

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka halaman detail simulasi dari daftar rekomendasi | Admin sekolah | Sistem menampilkan ringkasan data siswa, domisili, rapor, prestasi, dokumen, ekonomi, hasil kelayakan, dan rekomendasi sekolah | - |
| 2 | Menampilkan breakdown hasil perhitungan kriteria | Admin sekolah | Sistem menampilkan rincian kontribusi setiap kriteria terhadap skor akhir | - |
| 3 | Menekan tombol `Download PDF` pada detail simulasi | Admin sekolah | Sistem menghasilkan PDF detail simulasi sesuai data yang ditampilkan | - |
| 4 | Membuka detail simulasi dengan ID yang tidak ditemukan | Admin sekolah | Sistem menampilkan pesan bahwa data simulasi tidak ditemukan | - |

## 13. Profil Sekolah

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka menu `Profil Sekolah` | Admin sekolah | Sistem menampilkan profil sekolah yang dikelola admin | - |
| 2 | Menekan tombol `Edit Profil` lalu mengubah data utama sekolah | Admin sekolah | Sistem menampilkan form edit profil sekolah | - |
| 3 | Menyimpan perubahan profil sekolah dengan data valid | Admin sekolah | Sistem memperbarui data profil sekolah dan menampilkan hasil terbaru | - |
| 4 | Membatalkan edit profil sebelum disimpan | Admin sekolah | Sistem membatalkan perubahan dan mengembalikan data terakhir yang tersimpan | - |
| 5 | Menampilkan preview perubahan profil sebelum simpan | Admin sekolah | Sistem menampilkan preview detail sekolah berdasarkan perubahan terbaru | - |
| 6 | Mengunggah foto sampul atau galeri sekolah | Admin sekolah | Sistem menambahkan foto ke galeri sekolah | - |
| 7 | Menghapus atau mengubah urutan foto galeri | Admin sekolah | Sistem memperbarui isi dan urutan galeri sekolah | - |

## 14. Pengajuan Kriteria oleh Admin Sekolah

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka menu `Pengajuan Kriteria` | Admin sekolah | Sistem menampilkan daftar kriteria aktif dan riwayat pengajuan | - |
| 2 | Mengirim pengajuan perubahan kriteria dengan data lengkap | Admin sekolah | Sistem menyimpan pengajuan dengan status `pending` dan menampilkan notifikasi berhasil | - |
| 3 | Mengirim pengajuan tanpa memilih kriteria terdampak | Admin sekolah | Sistem menolak pengajuan dan menampilkan pesan validasi | - |
| 4 | Mengirim pengajuan tanpa alasan perubahan | Admin sekolah | Sistem menolak pengajuan dan menampilkan pesan validasi | - |
| 5 | Mengunggah dokumen pendukung lebih dari batas ukuran | Admin sekolah | Sistem menolak file dan menampilkan pesan ukuran file maksimal | - |
| 6 | Melihat riwayat pengajuan yang pernah dibuat | Admin sekolah | Sistem menampilkan daftar pengajuan beserta statusnya | - |

## 15. Dashboard Super Admin

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka dashboard super admin setelah login | Super Admin | Sistem menampilkan statistik utama, grafik simulasi bulanan, dan antrean pengajuan kriteria | - |
| 2 | Menyetujui pengajuan kriteria dari quick action dashboard | Super Admin | Sistem memperbarui status pengajuan menjadi `approved` | - |
| 3 | Menolak pengajuan kriteria dari quick action dashboard dengan alasan | Super Admin | Sistem memperbarui status pengajuan menjadi `rejected` | - |

## 16. Detail Simulasi Super Admin

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka menu `Detail Simulasi` | Super Admin | Sistem menampilkan riwayat simulasi semua pengguna | - |
| 2 | Tidak ada data simulasi pada sistem | Super Admin | Sistem menampilkan pesan bahwa belum ada data simulasi prescreening | - |

## 17. Master Sekolah

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Menambah data sekolah baru dengan data valid | Super Admin | Sistem menyimpan data sekolah baru dan menampilkannya pada tabel | - |
| 2 | Mengubah data sekolah yang sudah ada | Super Admin | Sistem memperbarui data sekolah dan menampilkan perubahan pada tabel | - |
| 3 | Menghapus data sekolah | Super Admin | Sistem menghapus data sekolah yang dipilih dari daftar | - |
| 4 | Menyimpan data sekolah dengan field wajib kosong | Super Admin | Sistem menolak penyimpanan dan menampilkan validasi data wajib | - |

## 18. Validasi Pengajuan Kriteria oleh Super Admin

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka menu `Pengajuan Kriteria` | Super Admin | Sistem menampilkan seluruh daftar pengajuan perubahan kriteria | - |
| 2 | Memfilter pengajuan berdasarkan status | Super Admin | Sistem menampilkan daftar sesuai status yang dipilih | - |
| 3 | Membuka detail salah satu pengajuan | Super Admin | Sistem menampilkan detail jenis perubahan, sekolah, admin, alasan, dan data kriteria | - |
| 4 | Menyetujui pengajuan | Super Admin | Sistem mengubah status pengajuan menjadi `approved` dan mencatat log aktivitas | - |
| 5 | Menolak pengajuan dengan catatan penolakan | Super Admin | Sistem mengubah status pengajuan menjadi `rejected` dan mencatat log aktivitas | - |
| 6 | Menolak pengajuan tanpa mengisi catatan | Super Admin | Sistem menolak proses penolakan dan menampilkan pesan bahwa catatan wajib diisi | - |

## 19. Manajemen Admin Sekolah

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Mencari admin sekolah berdasarkan nama atau email | Super Admin | Sistem menampilkan hasil pencarian yang sesuai | - |
| 2 | Menambah akun admin sekolah baru | Super Admin | Sistem menyimpan akun admin sekolah baru | - |
| 3 | Mengubah nama atau email admin sekolah | Super Admin | Sistem memperbarui data admin sekolah | - |
| 4 | Menghapus akun admin sekolah | Super Admin | Sistem menghapus akun admin sekolah dari daftar | - |
| 5 | Menonaktifkan akun admin sekolah | Super Admin | Sistem mengubah status admin sekolah menjadi nonaktif | - |
| 6 | Mengaktifkan kembali akun admin sekolah | Super Admin | Sistem mengubah status admin sekolah menjadi aktif | - |

## 20. Manajemen Pengguna

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Mencari user berdasarkan nama atau email | Super Admin | Sistem menampilkan hasil pencarian yang sesuai | - |
| 2 | Menambah akun user baru | Super Admin | Sistem menyimpan akun user baru | - |
| 3 | Mengubah nama atau email user | Super Admin | Sistem memperbarui data user | - |
| 4 | Menghapus akun user | Super Admin | Sistem menghapus akun user dari daftar | - |
| 5 | Menonaktifkan akun user | Super Admin | Sistem mengubah status user menjadi nonaktif | - |
| 6 | Mengaktifkan kembali akun user | Super Admin | Sistem mengubah status user menjadi aktif | - |

## 21. Log Aktivitas

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka menu `Log Aktivitas` | Super Admin | Sistem menampilkan histori aktivitas sistem | - |
| 2 | Memfilter log berdasarkan tipe aktivitas | Super Admin | Sistem menampilkan log sesuai tipe aktivitas yang dipilih | - |
| 3 | Mencari log berdasarkan nama aktor, email, atau deskripsi | Super Admin | Sistem menampilkan log yang sesuai dengan kata kunci pencarian | - |

## 22. Reset Database Lokal

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Menekan tombol `Reset Database Lokal` dan menyetujui konfirmasi | Super Admin | Sistem menghapus data lokal sesuai mode reset dan mengarahkan pengguna ke halaman login admin | - |
| 2 | Menekan tombol `Clear Semua Storage` dan menyetujui konfirmasi | Super Admin | Sistem menghapus seluruh data local storage dan mengarahkan pengguna ke halaman login admin | - |
| 3 | Membatalkan dialog konfirmasi reset atau clear storage | Super Admin | Sistem tidak melakukan perubahan data | - |

## 23. Proteksi Akses Halaman Sistem

| No | Rancangan Proses | Pengguna | Hasil yang Diharapkan | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Membuka halaman super admin tanpa login | Semua pengguna | Sistem mengarahkan pengguna ke halaman login | - |
| 2 | Membuka halaman admin sekolah tanpa login | Semua pengguna | Sistem mengarahkan pengguna ke halaman login | - |
| 3 | Membuka halaman super admin menggunakan akun selain super admin | Pengguna selain super admin | Sistem menolak akses dan mengarahkan pengguna ke halaman yang sesuai | - |
| 4 | Membuka halaman admin sekolah menggunakan akun selain admin sekolah | Pengguna selain admin sekolah | Sistem menolak akses dan mengarahkan pengguna ke halaman yang sesuai | - |
