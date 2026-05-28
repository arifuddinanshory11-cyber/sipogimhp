export type Gender = "L" | "P"; // L = Laki-laki, P = Perempuan

export interface Desa {
  id_desa: string;
  nama_desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  petugas_kesehatan_1?: string;
  petugas_kesehatan_2?: string;
}

export interface Posyandu {
  id_posyandu: string;
  nama_posyandu: string;
  id_desa: string;
  alamat: string;
  nama_kader: string;
  nomor_hp: string;
  username: string;
  password?: string; // we'll store clean text or basic password for local authentication
  status_aktif: boolean;
  petugas_kesehatan?: string;
}

export interface DataAnak {
  id_anak: string;
  nik_anak: string;
  nama_anak: string;
  jenis_kelamin: Gender;
  tanggal_lahir: string; // YYYY-MM-DD
  nama_ortu: string;
  nik_ortu: string;
  alamat: string;
  rt_rw: string;
  id_desa: string;
  id_posyandu: string;
  berat_lahir: number; // kg
  tinggi_lahir: number; // cm
  created_at: string;
}

export interface Penimbangan {
  id_penimbangan: string;
  id_anak: string;
  tanggal_penimbangan: string; // YYYY-MM-DD
  umur_bulan: number;
  berat_badan: number; // kg
  tinggi_badan: number; // cm
  lingkar_kepala: number; // cm
  lingkar_lengan: number; // cm
  zscore_bb_u: number;
  zscore_tb_u: number;
  zscore_bb_tb: number;
  status_gizi: "Sangat Kurang" | "Kurang" | "Berat Badan Normal" | "Risiko Gizi Lebih";
  status_stunting: "Sangat Pendek" | "Pendek" | "Stunting Perseda" | "Normal" | "Tinggi";
  status_gizi_bbtb: "Gizi Buruk / Outlier" | "Gizi Kurang" | "Normal" | "Risiko Gizi Lebih" | "Gizi Lebih" | "Obesitas";
  catatan: string;
  petugas_input: string;
}

export type UserRole = "SUPER_ADMIN" | "ADMIN_DESA" | "ADMIN_POSYANDU";

export interface UserSession {
  role: UserRole;
  username: string;
  nama: string;
  id_desa?: string; // for AMIN DESA
  id_posyandu?: string; // for ADMIN POSYANDU
}

export interface UserLog {
  id: string;
  timestamp: string;
  username: string;
  role: string;
  activity: string;
  ip_address?: string;
}
