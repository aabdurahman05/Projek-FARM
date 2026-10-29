CREATE DATABASE IF NOT EXISTS farm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE farm_db;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS percobaan_login, notifikasi, pesan, rating, bagi_hasil, laporan_foto, laporan, pekerjaan, lamaran, lowongan_tahap, lowongan, notif_prefs, users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role ENUM('petani','bos') NOT NULL,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  hp VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  alamat VARCHAR(255) NOT NULL DEFAULT '',
  pengalaman VARCHAR(30) NOT NULL DEFAULT '',
  foto VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (role, email),
  UNIQUE KEY uq_users_hp (role, hp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notif_prefs (
  user_id INT UNSIGNED NOT NULL,
  jenis VARCHAR(20) NOT NULL,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, jenis),
  CONSTRAINT fk_np_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lowongan (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  bos_id INT UNSIGNED NOT NULL,
  nama VARCHAR(120) NOT NULL,
  lokasi VARCHAR(200) NOT NULL,
  jenis VARCHAR(40) NOT NULL DEFAULT 'Perawatan',
  sistem VARCHAR(40) NOT NULL DEFAULT 'Bagi hasil',
  estimasi VARCHAR(20) NOT NULL DEFAULT '3 bulan',
  deskripsi TEXT NOT NULL,
  persen_petani TINYINT UNSIGNED NOT NULL DEFAULT 60,
  foto VARCHAR(255) NOT NULL DEFAULT 'assets/sawah-3.jpg',
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lowongan_bos (bos_id),
  CONSTRAINT fk_low_bos FOREIGN KEY (bos_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lowongan_tahap (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lowongan_id INT UNSIGNED NOT NULL,
  urutan TINYINT UNSIGNED NOT NULL,
  nama VARCHAR(60) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tahap (lowongan_id, urutan),
  CONSTRAINT fk_tahap_low FOREIGN KEY (lowongan_id) REFERENCES lowongan(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lamaran (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lowongan_id INT UNSIGNED NOT NULL,
  petani_id INT UNSIGNED NOT NULL,
  nama VARCHAR(100) NOT NULL,
  alamat VARCHAR(255) NOT NULL,
  ttl VARCHAR(100) NOT NULL,
  hp VARCHAR(20) NOT NULL,
  tentang TEXT NOT NULL,
  status ENUM('Menunggu','Diterima','Ditolak') NOT NULL DEFAULT 'Menunggu',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lamaran (lowongan_id, petani_id),
  KEY idx_lamaran_petani (petani_id),
  CONSTRAINT fk_lam_low FOREIGN KEY (lowongan_id) REFERENCES lowongan(id) ON DELETE CASCADE,
  CONSTRAINT fk_lam_pet FOREIGN KEY (petani_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pekerjaan (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lamaran_id INT UNSIGNED NOT NULL,
  lowongan_id INT UNSIGNED NOT NULL,
  bos_id INT UNSIGNED NOT NULL,
  petani_id INT UNSIGNED NOT NULL,
  mulai DATE NOT NULL,
  status ENUM('berjalan','menunggu','selesai') NOT NULL DEFAULT 'berjalan',
  persen_petani TINYINT UNSIGNED NOT NULL DEFAULT 60,
  menunggu_at DATETIME NULL,
  selesai_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pekerjaan_lamaran (lamaran_id),
  KEY idx_pekerjaan_bos (bos_id),
  KEY idx_pekerjaan_petani (petani_id),
  CONSTRAINT fk_pek_lam FOREIGN KEY (lamaran_id) REFERENCES lamaran(id) ON DELETE CASCADE,
  CONSTRAINT fk_pek_low FOREIGN KEY (lowongan_id) REFERENCES lowongan(id) ON DELETE CASCADE,
  CONSTRAINT fk_pek_bos FOREIGN KEY (bos_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pek_pet FOREIGN KEY (petani_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE laporan (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pekerjaan_id INT UNSIGNED NOT NULL,
  tahap TINYINT UNSIGNED NOT NULL,
  catatan TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_laporan_pek (pekerjaan_id),
  CONSTRAINT fk_lap_pek FOREIGN KEY (pekerjaan_id) REFERENCES pekerjaan(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE laporan_foto (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  laporan_id INT UNSIGNED NOT NULL,
  path VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_lf_laporan (laporan_id),
  CONSTRAINT fk_lf_lap FOREIGN KEY (laporan_id) REFERENCES laporan(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bagi_hasil (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pekerjaan_id INT UNSIGNED NOT NULL,
  tanggal DATE NOT NULL,
  ton DECIMAL(10,2) NOT NULL,
  harga_per_ton BIGINT UNSIGNED NOT NULL,
  kotor BIGINT UNSIGNED NOT NULL,
  modal BIGINT UNSIGNED NOT NULL,
  bersih BIGINT UNSIGNED NOT NULL,
  persen_petani TINYINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bagi_pekerjaan (pekerjaan_id),
  CONSTRAINT fk_bagi_pek FOREIGN KEY (pekerjaan_id) REFERENCES pekerjaan(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rating (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pekerjaan_id INT UNSIGNED NOT NULL,
  dari_id INT UNSIGNED NOT NULL,
  untuk_id INT UNSIGNED NOT NULL,
  bintang TINYINT UNSIGNED NOT NULL,
  ulasan VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rating (pekerjaan_id, dari_id),
  KEY idx_rating_untuk (untuk_id),
  CONSTRAINT fk_rt_pek FOREIGN KEY (pekerjaan_id) REFERENCES pekerjaan(id) ON DELETE CASCADE,
  CONSTRAINT fk_rt_dari FOREIGN KEY (dari_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rt_untuk FOREIGN KEY (untuk_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pesan (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  dari_id INT UNSIGNED NOT NULL,
  ke_id INT UNSIGNED NOT NULL,
  isi TEXT NULL,
  foto VARCHAR(255) NULL,
  dibaca TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pesan_pair (dari_id, ke_id),
  KEY idx_pesan_ke (ke_id, dibaca),
  CONSTRAINT fk_ps_dari FOREIGN KEY (dari_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_ke FOREIGN KEY (ke_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifikasi (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  jenis VARCHAR(20) NOT NULL,
  teks VARCHAR(255) NOT NULL,
  dibaca TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id, dibaca),
  CONSTRAINT fk_nt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE percobaan_login (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  identitas VARCHAR(190) NOT NULL,
  ip VARCHAR(45) NOT NULL DEFAULT '',
  waktu DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_pl (identitas, waktu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

