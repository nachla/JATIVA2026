-- Schema database JATIVA (BRIDA Provinsi Jawa Timur)
-- Dipakai untuk setup awal database baru (misal pas pindah ke Supabase).
-- Aman dijalankan berkali-kali (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS data_inovasi (
    id              SERIAL PRIMARY KEY,
    judul_inovasi   TEXT,
    admin_opd       TEXT,
    jenis           TEXT,
    urusan_utama    TEXT,
    kematangan      NUMERIC,
    tanggal_input   TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS activity_log (
    id              SERIAL PRIMARY KEY,
    username        TEXT NOT NULL,
    aksi            TEXT NOT NULL,
    waktu           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_inovasi_jenis ON data_inovasi (jenis);
CREATE INDEX IF NOT EXISTS idx_data_inovasi_urusan ON data_inovasi (urusan_utama);
CREATE INDEX IF NOT EXISTS idx_data_inovasi_admin_opd ON data_inovasi (admin_opd);
