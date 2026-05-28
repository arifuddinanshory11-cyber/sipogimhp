import { Desa, Posyandu, DataAnak, Penimbangan, UserLog } from "./types";
import { getZScoreBBU, getZScoreTBU, getZScoreBBTB, calculateAgeInMonths } from "./utils/zscore";

export const initialDesa: Desa[] = [
  { id_desa: "DESA001", nama_desa: "Sukamaju", kecamatan: "Cilaku", kabupaten: "Cianjur", provinsi: "Jawa Barat" },
  { id_desa: "DESA002", nama_desa: "Bojong", kecamatan: "Karangtengah", kabupaten: "Cianjur", provinsi: "Jawa Barat" },
  { id_desa: "DESA003", nama_desa: "Pamoyanan", kecamatan: "Cianjur", kabupaten: "Cianjur", provinsi: "Jawa Barat" }
];

export const initialPosyandu: Posyandu[] = [
  {
    id_posyandu: "POS001",
    nama_posyandu: "Melati 1",
    id_desa: "DESA001",
    alamat: "Jl. Dahlia No. 12, Sukamaju",
    nama_kader: "Ibu Ratna Kumala",
    nomor_hp: "081234567890",
    username: "melati01",
    password: "password123",
    status_aktif: true
  },
  {
    id_posyandu: "POS002",
    nama_posyandu: "Mawar 2",
    id_desa: "DESA001",
    alamat: "Jl. Mawar Raya No. 4, Sukamaju",
    nama_kader: "Ibu Sri Wahyuni",
    nomor_hp: "081298765432",
    username: "mawar02",
    password: "password123",
    status_aktif: true
  },
  {
    id_posyandu: "POS003",
    nama_posyandu: "Dahlia 3",
    id_desa: "DESA002",
    alamat: "Dusun Krajan, Bojong",
    nama_kader: "Ibu Lilis Rostini",
    nomor_hp: "085678123456",
    username: "dahlia03",
    password: "password123",
    status_aktif: true
  },
  {
    id_posyandu: "POS004",
    nama_posyandu: "Kencana 4",
    id_desa: "DESA003",
    alamat: "Gg. Kencana II, Pamoyanan",
    nama_kader: "Ibu Ani Suryani",
    nomor_hp: "089012345678",
    username: "kencana04",
    password: "password123",
    status_aktif: true
  }
];

export const initialDataAnak: DataAnak[] = [
  {
    id_anak: "ANAK-001",
    nik_anak: "3201011212240001",
    nama_anak: "Aditya Pratama",
    jenis_kelamin: "L",
    tanggal_lahir: "2024-12-12",
    nama_ortu: "Siti Nurhaliza / Bambang",
    nik_ortu: "3201014506890002",
    alamat: "Kampung Sawah RT 01 RW 03",
    rt_rw: "01/03",
    id_desa: "DESA001",
    id_posyandu: "POS001",
    berat_lahir: 3.2,
    tinggi_lahir: 50.0,
    created_at: "2024-12-12T08:00:00Z"
  },
  {
    id_anak: "ANAK-002",
    nik_anak: "3201014510250002",
    nama_anak: "Aisyah Putri",
    jenis_kelamin: "P",
    tanggal_lahir: "2025-10-05",
    nama_ortu: "Hasanah / Anwar",
    nik_ortu: "3201015607900004",
    alamat: "Jl. Melati No. 45 Sukamaju",
    rt_rw: "03/01",
    id_desa: "DESA001",
    id_posyandu: "POS001",
    berat_lahir: 2.8,
    tinggi_lahir: 48.0,
    created_at: "2025-10-05T09:00:00Z"
  },
  {
    id_anak: "ANAK-003",
    nik_anak: "3201021404240003",
    nama_anak: "Bagas Nugroho",
    jenis_kelamin: "L",
    tanggal_lahir: "2024-04-14",
    nama_ortu: "Sri Purwati / Jono",
    nik_ortu: "3201021208880005",
    alamat: "Dusun Kulon RT 02 RW 01",
    rt_rw: "02/01",
    id_desa: "DESA002",
    id_posyandu: "POS003",
    berat_lahir: 3.5,
    tinggi_lahir: 51.0,
    created_at: "2024-04-14T10:00:00Z"
  },
  {
    id_anak: "ANAK-004",
    nik_anak: "3201010311230004",
    nama_anak: "Citra Lestari",
    jenis_kelamin: "P",
    tanggal_lahir: "2023-11-03",
    nama_ortu: "Dewi Kartika / Rudy",
    nik_ortu: "3201014402860001",
    alamat: "Dusun Wetan RT 03 RW 02",
    rt_rw: "03/02",
    id_desa: "DESA001",
    id_posyandu: "POS002",
    berat_lahir: 3.1,
    tinggi_lahir: 49.0,
    created_at: "2023-11-03T11:00:00Z"
  },
  {
    id_anak: "ANAK-005",
    nik_anak: "3201032808250005",
    nama_anak: "Dimas Wijaya",
    jenis_kelamin: "L",
    tanggal_lahir: "2025-08-28",
    nama_ortu: "Rina / Hendra",
    nik_ortu: "3201036811890008",
    alamat: "Jl. Kencana No. 12 Pamoyanan",
    rt_rw: "01/02",
    id_desa: "DESA003",
    id_posyandu: "POS004",
    berat_lahir: 2.1, // Berisiko stunting / lahir rendah
    tinggi_lahir: 45.0,
    created_at: "2025-08-28T09:30:00Z"
  },
  {
    id_anak: "ANAK-006",
    nik_anak: "3201012502250006",
    nama_anak: "Evano Riski",
    jenis_kelamin: "L",
    tanggal_lahir: "2025-02-25",
    nama_ortu: "Santi / Indra",
    nik_ortu: "3201015609920005",
    alamat: "Dusun Cantik RT 01 RW 01",
    rt_rw: "01/01",
    id_desa: "DESA001",
    id_posyandu: "POS001",
    berat_lahir: 3.0,
    tinggi_lahir: 49.0,
    created_at: "2025-02-25T11:00:00Z"
  },
  {
    id_anak: "ANAK-007",
    nik_anak: "3201021408240007",
    nama_anak: "Fania Syakila (Indikasi Stunting)",
    jenis_kelamin: "P",
    tanggal_lahir: "2024-08-14",
    nama_ortu: "Aminah / Bagus",
    nik_ortu: "3201025401910009",
    alamat: "Gg. Melati RT 04 RW 02",
    rt_rw: "04/02",
    id_desa: "DESA002",
    id_posyandu: "POS003",
    berat_lahir: 2.4, // Rendah
    tinggi_lahir: 46.0,
    created_at: "2024-08-14T07:12:00Z"
  },
  {
    id_anak: "ANAK-008",
    nik_anak: "3201030901250008",
    nama_anak: "Gavin Alvaro (Indikasi Kurang Gizi)",
    jenis_kelamin: "L",
    tanggal_lahir: "2025-01-09",
    nama_ortu: "Yuliana / Toni",
    nik_ortu: "3201034305900010",
    alamat: "Batununggal Indah RT 02 RW 02",
    rt_rw: "02/02",
    id_desa: "DESA003",
    id_posyandu: "POS004",
    berat_lahir: 3.2,
    tinggi_lahir: 49.0,
    created_at: "2025-01-09T08:00:00Z"
  }
];

export const initialPenimbangan: Penimbangan[] = [
  // Aditya - ANAK-001 (Born 2024-12-12)
  // At 1 month, Jan 2025 (4.5kg, 54.5cm, - normal)
  {
    id_penimbangan: "PEN-001",
    id_anak: "ANAK-001",
    tanggal_penimbangan: "2025-01-15",
    umur_bulan: 1,
    berat_badan: 4.6,
    tinggi_badan: 55.0,
    lingkar_kepala: 36.5,
    lingkar_lengan: 11.5,
    zscore_bb_u: 0.2,
    zscore_tb_u: 0.16,
    zscore_bb_tb: 0.1,
    status_gizi: "Berat Badan Normal",
    status_stunting: "Normal",
    status_gizi_bbtb: "Normal",
    catatan: "ASI Eksklusif, perkembangan sangat baik",
    petugas_input: "Kader Ratna Kumala"
  },
  // Aditya at 5 months, May 2025 (7.6kg, 66cm)
  {
    id_penimbangan: "PEN-002",
    id_anak: "ANAK-001",
    tanggal_penimbangan: "2025-05-15",
    umur_bulan: 5,
    berat_badan: 7.7,
    tinggi_badan: 66.5,
    lingkar_kepala: 42.0,
    lingkar_lengan: 13.5,
    zscore_bb_u: 0.29,
    zscore_tb_u: 0.27,
    zscore_bb_tb: 0.15,
    status_gizi: "Berat Badan Normal",
    status_stunting: "Normal",
    status_gizi_bbtb: "Normal",
    catatan: "Pemberian ASI dilanjutkan, aktif merangkak",
    petugas_input: "Kader Ratna Kumala"
  },
  // Aditya at 12 months, Dec 2025 (9.7kg, 76cm)
  {
    id_penimbangan: "PEN-003",
    id_anak: "ANAK-001",
    tanggal_penimbangan: "2025-12-15",
    umur_bulan: 12,
    berat_badan: 9.8,
    tinggi_badan: 76.5,
    lingkar_kepala: 46.0,
    lingkar_lengan: 15.0,
    zscore_bb_u: 0.22,
    zscore_tb_u: 0.33,
    zscore_bb_tb: 0.1,
    status_gizi: "Berat Badan Normal",
    status_stunting: "Normal",
    status_gizi_bbtb: "Normal",
    catatan: "Sudah mulai imunisasi tambahan campak",
    petugas_input: "Kader Ratna Kumala"
  },
  // Aditya at 17 months, May 2026 (11.0kg, 81.5cm)
  {
    id_penimbangan: "PEN-004",
    id_anak: "ANAK-001",
    tanggal_penimbangan: "2026-05-15",
    umur_bulan: 17,
    berat_badan: 11.2,
    tinggi_badan: 81.5,
    lingkar_kepala: 47.5,
    lingkar_lengan: 15.5,
    zscore_bb_u: 0.45,
    zscore_tb_u: 0.32,
    zscore_bb_tb: 0.5,
    status_gizi: "Berat Badan Normal",
    status_stunting: "Normal",
    status_gizi_bbtb: "Normal",
    catatan: "Tumbuh gigi geraham, aktif bicara",
    petugas_input: "Kader Ratna Kumala"
  },

  // Aisyah Putri - ANAK-002 (Born 2025-10-05) - Normal
  {
    id_penimbangan: "PEN-005",
    id_anak: "ANAK-002",
    tanggal_penimbangan: "2025-11-05",
    umur_bulan: 1,
    berat_badan: 4.3,
    tinggi_badan: 54.0,
    lingkar_kepala: 35.8,
    lingkar_lengan: 11.0,
    zscore_bb_u: 0.22,
    zscore_tb_u: 0.16,
    zscore_bb_tb: 0.1,
    status_gizi: "Berat Badan Normal",
    status_stunting: "Normal",
    status_gizi_bbtb: "Normal",
    catatan: "Sangat sehat, ASI lancar",
    petugas_input: "Kader Ratna Kumala"
  },
  {
    id_penimbangan: "PEN-006",
    id_anak: "ANAK-002",
    tanggal_penimbangan: "2026-05-15",
    umur_bulan: 7,
    berat_badan: 7.8,
    tinggi_badan: 68.0,
    lingkar_kepala: 43.1,
    lingkar_lengan: 13.0,
    zscore_bb_u: 0.27,
    zscore_tb_u: 0.3,
    zscore_bb_tb: 0.1,
    status_gizi: "Berat Badan Normal",
    status_stunting: "Normal",
    status_gizi_bbtb: "Normal",
    catatan: "Mulai MPASI lumat, nafsu makan baik",
    petugas_input: "Kader Ratna Kumala"
  },

  // Bagas - ANAK-003 (Born 2024-04-14) - Gizi Lebih
  {
    id_penimbangan: "PEN-007",
    id_anak: "ANAK-003",
    tanggal_penimbangan: "2026-04-14",
    umur_bulan: 24,
    berat_badan: 16.5, // Gizi Lebih
    tinggi_badan: 89.0,
    lingkar_kepala: 49.0,
    lingkar_lengan: 17.5,
    zscore_bb_u: 3.73,
    zscore_tb_u: 0.64,
    zscore_bb_tb: 3.5,
    status_gizi: "Risiko Gizi Lebih",
    status_stunting: "Normal",
    status_gizi_bbtb: "Obesitas",
    catatan: "Anak sangat gemuk, kurangi porsi minyak & manis",
    petugas_input: "Kader Lilis Rostini"
  },

  // Dimas Wijaya - ANAK-005 (Born 2025-08-28) - Gizi Kurang
  {
    id_penimbangan: "PEN-008",
    id_anak: "ANAK-005",
    tanggal_penimbangan: "2026-05-10",
    umur_bulan: 8,
    berat_badan: 6.2, // Rendah untuk laki-laki (median 8.6kg)
    tinggi_badan: 67.5, // Rendah (median 70.6cm)
    lingkar_kepala: 41.5,
    lingkar_lengan: 10.5,
    zscore_bb_u: -3.0,
    zscore_tb_u: -1.35,
    zscore_bb_tb: -3.1,
    status_gizi: "Kurang",
    status_stunting: "Normal",
    status_gizi_bbtb: "Gizi Buruk / Outlier",
    catatan: "Diberi rujukan ke Puskesmas, diduga kurang asupan zat gizi",
    petugas_input: "Kader Ani Suryani"
  },

  // Fania Syakila - ANAK-007 (Born 2024-08-14) - Stunting Sangat Pendek
  {
    id_penimbangan: "PEN-009",
    id_anak: "ANAK-007",
    tanggal_penimbangan: "2026-05-18",
    umur_bulan: 21,
    berat_badan: 8.2, // Rendah
    tinggi_badan: 74.0, // Sangat pendek untuk perempuan 21bln (median ~83cm)
    lingkar_kepala: 43.0,
    lingkar_lengan: 11.2,
    zscore_bb_u: -2.3,
    zscore_tb_u: -3.4,
    zscore_bb_tb: -1.1,
    status_gizi: "Kurang",
    status_stunting: "Sangat Pendek",
    status_gizi_bbtb: "Normal",
    catatan: "Teridentifikasi Stunting. PMT (Pemberian Makanan Tambahan) darurat.",
    petugas_input: "Kader Lilis Rostini"
  },

  // Gavin Alvaro - ANAK-008 (Born 2025-01-09) - Gizi Kurang + Pendek
  {
    id_penimbangan: "PEN-010",
    id_anak: "ANAK-008",
    tanggal_penimbangan: "2026-05-15",
    umur_bulan: 16,
    berat_badan: 7.9, // Sangat rendah (median ~10.5kg)
    tinggi_badan: 73.5, // Pendek (median ~81cm)
    lingkar_kepala: 44.0,
    lingkar_lengan: 11.8,
    zscore_bb_u: -2.5,
    zscore_tb_u: -2.7,
    zscore_bb_tb: -1.3,
    status_gizi: "Kurang",
    status_stunting: "Pendek",
    status_gizi_bbtb: "Normal",
    catatan: "Imunisasi kurang aktif, Kader melakukan Kunjungan Rumah.",
    petugas_input: "Kader Ani Suryani"
  }
];

export const initialUserLogs: UserLog[] = [
  {
    id: "LOG-001",
    timestamp: "2026-05-27T08:00:00Z",
    username: "superadmin",
    role: "SUPER_ADMIN",
    activity: "Login berhasil ke sistem SI-PoGi",
    ip_address: "192.168.1.1"
  },
  {
    id: "LOG-002",
    timestamp: "2026-05-27T08:15:20Z",
    username: "melati01",
    role: "ADMIN_POSYANDU",
    activity: "Membuka modul penimbangan untuk Aditya Pratama",
    ip_address: "192.168.1.10"
  },
  {
    id: "LOG-003",
    timestamp: "2026-05-27T08:22:11Z",
    username: "melati01",
    role: "ADMIN_POSYANDU",
    activity: "Entri data penimbangan Aditya Pratama (PEN-004) terekam",
    ip_address: "192.168.1.10"
  }
];

export function initializeLocalStorageDatabase() {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem("DESA_DB")) {
    localStorage.setItem("DESA_DB", JSON.stringify(initialDesa));
  }
  if (!localStorage.getItem("POSYANDU_DB")) {
    localStorage.setItem("POSYANDU_DB", JSON.stringify(initialPosyandu));
  }
  if (!localStorage.getItem("DATA_ANAK_DB")) {
    localStorage.setItem("DATA_ANAK_DB", JSON.stringify(initialDataAnak));
  }
  if (!localStorage.getItem("PENIMBANGAN_DB")) {
    localStorage.setItem("PENIMBANGAN_DB", JSON.stringify(initialPenimbangan));
  }
  if (!localStorage.getItem("USER_LOGS_DB")) {
    localStorage.setItem("USER_LOGS_DB", JSON.stringify(initialUserLogs));
  }
}

export function resetDatabaseToDefault() {
  if (typeof window === "undefined") return;
  localStorage.setItem("DESA_DB", JSON.stringify(initialDesa));
  localStorage.setItem("POSYANDU_DB", JSON.stringify(initialPosyandu));
  localStorage.setItem("DATA_ANAK_DB", JSON.stringify(initialDataAnak));
  localStorage.setItem("PENIMBANGAN_DB", JSON.stringify(initialPenimbangan));
  localStorage.setItem("USER_LOGS_DB", JSON.stringify(initialUserLogs));
}
