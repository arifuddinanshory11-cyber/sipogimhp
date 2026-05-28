import React, { useState, useMemo } from "react";
import { 
  Settings, 
  Database, 
  Download, 
  Upload, 
  Lock, 
  RefreshCw, 
  History, 
  Terminal, 
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { Desa, Posyandu, UserSession, UserLog } from "../types";

interface SettingsBackupProps {
  desaList: Desa[];
  posyanduList: Posyandu[];
  userLogs: UserLog[];
  session: UserSession | null;
  darkMode: boolean;
  onRestoreDatabase: (restoredData: { desa: Desa[]; posyandu: Posyandu[]; logs: UserLog[] }) => void;
  onResetDbToDefault: () => void;
  onClearLogs: () => void;
  onResetPosyanduPassword: (id: string, newPass: string) => void;
}

export default function SettingsBackup({
  desaList,
  posyanduList,
  userLogs,
  session,
  darkMode,
  onRestoreDatabase,
  onResetDbToDefault,
  onClearLogs,
  onResetPosyanduPassword
}: SettingsBackupProps) {
  
  const [activeTab, setActiveTab] = useState<"database" | "passwords" | "help">("database");
  
  // Backup / Restore States
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Change password inputs
  const [selectedPosyanduId, setSelectedPosyanduId] = useState("");
  const [newPasswordValue, setNewPasswordValue] = useState("");

  // Download all Tables in raw JSON for physical backup
  const handleDownloadBackup = () => {
    try {
      const fullBackup = {
        meta: {
          app: "SI-PoGi",
          exportedAt: new Date().toISOString(),
          version: "1.0.0"
        },
        DESA_DB: JSON.parse(localStorage.getItem("DESA_DB") || "[]"),
        POSYANDU_DB: JSON.parse(localStorage.getItem("POSYANDU_DB") || "[]"),
        DATA_ANAK_DB: JSON.parse(localStorage.getItem("DATA_ANAK_DB") || "[]"),
        PENIMBANGAN_DB: JSON.parse(localStorage.getItem("PENIMBANGAN_DB") || "[]"),
        USER_LOGS_DB: JSON.parse(localStorage.getItem("USER_LOGS_DB") || "[]")
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
      const dlAnchorElem = document.createElement("a");
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", `SI-POGI_BACKUP_${new Date().toISOString().slice(0, 10)}.json`);
      dlAnchorElem.click();
      
      setSuccessMsg("Cadangan / backup database berhasil diunduh.");
    } catch (err: any) {
      setErrorMsg(`Gagal mengunduh cadangan: ${err.message || err}`);
    }
  };

  // Restore raw tables JSON and validate
  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    setSuccessMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.app !== "SI-PoGi" && !parsed.DESA_DB && !parsed.POSYANDU_DB) {
          throw new Error("File berkas tidak dikenali sebagai skema cadangan SI-PoGi valid.");
        }

        // Restore tables to localStorage
        localStorage.setItem("DESA_DB", JSON.stringify(parsed.DESA_DB || []));
        localStorage.setItem("POSYANDU_DB", JSON.stringify(parsed.POSYANDU_DB || []));
        localStorage.setItem("DATA_ANAK_DB", JSON.stringify(parsed.DATA_ANAK_DB || []));
        localStorage.setItem("PENIMBANGAN_DB", JSON.stringify(parsed.PENIMBANGAN_DB || []));
        localStorage.setItem("USER_LOGS_DB", JSON.stringify(parsed.USER_LOGS_DB || []));

        onRestoreDatabase({
          desa: parsed.DESA_DB || [],
          posyandu: parsed.POSYANDU_DB || [],
          logs: parsed.USER_LOGS_DB || []
        });

        setSuccessMsg("Sistem dipulihkan / restore database cadangan sukses!");
      } catch (err: any) {
        setErrorMsg(`Kegagalan struktural memulihkan cadangan: ${err.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedPosyanduId || !newPasswordValue.trim()) {
      setErrorMsg("Pilih Posyandu dan ketikkan kata sandi baru.");
      return;
    }

    onResetPosyanduPassword(selectedPosyanduId, newPasswordValue);
    setSuccessMsg(`Sandi Posyandu berhasil disetel ulang.`);
    setSelectedPosyanduId("");
    setNewPasswordValue("");

    setTimeout(() => {
      setSuccessMsg("");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      
      {/* Sub menu tabs */}
      <div className="flex border-b border-slate-205 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("database")}
          className={`px-5 py-3 text-xs font-black transition-colors border-b-2 flex items-center gap-2
            ${activeTab === "database" 
              ? "border-teal-500 text-teal-600 dark:text-teal-400" 
              : "border-transparent text-slate-450 hover:text-slate-750"}`}
        >
          <Database size={15} /> Backup & Pemulihan Lokasi
        </button>

        {session?.role === "SUPER_ADMIN" && (
          <button
            onClick={() => setActiveTab("passwords")}
            className={`px-5 py-3 text-xs font-black transition-colors border-b-2 flex items-center gap-2
              ${activeTab === "passwords" 
                ? "border-teal-500 text-teal-600 dark:text-teal-400" 
                : "border-transparent text-slate-450 hover:text-slate-750"}`}
          >
            <Lock size={15} /> Manajemen Hak Akses Kader
          </button>
        )}

        <button
          onClick={() => setActiveTab("help")}
          className={`px-5 py-3 text-xs font-black transition-colors border-b-2 flex items-center gap-2
            ${activeTab === "help" 
              ? "border-teal-500 text-teal-600 dark:text-teal-400" 
              : "border-transparent text-slate-450 hover:text-slate-750"}`}
        >
          <HelpCircle size={15} /> Petunjuk KMS Nasional
        </button>
      </div>

      {activeTab === "database" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Operations Panel */}
          <div className={`col-span-1 p-5 rounded-2xl border space-y-5 ${darkMode ? "bg-slate-950 border-slate-850" : "bg-white border-slate-205"}`}>
            <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest font-mono">Panel Backup Eksternal</h4>
            
            {successMsg && (
              <div className="p-3 bg-green-500/10 border border-green-500/25 text-green-500 text-xs font-semibold rounded-lg flex gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}
            
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-550 text-xs font-semibold rounded-lg flex gap-2">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Downloader JSON */}
              <button
                id="btn-download-bk-file"
                onClick={handleDownloadBackup}
                className="w-full py-2.5 px-3 bg-teal-500 text-white font-bold text-xs rounded-lg hover:bg-teal-600 hover:shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Download size={14} /> Ambil Cadangan Utama (.json)
              </button>

              {/* Uploader JSON restore */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Pemulihan / Restore database</label>
                <button
                  id="btn-trigger-upload-restore"
                  onClick={() => document.getElementById("restore-backup-upload")?.click()}
                  className="w-full py-2.5 px-3 border border-dashed border-slate-300 dark:border-slate-850 bg-slate-500/5 hover:bg-slate-500/10 text-xs font-bold rounded-lg flex items-center justify-center gap-2"
                >
                  <Upload size={14} className="text-slate-400" /> Pilih Berkas Cadangan
                </button>
                <input
                  id="restore-backup-upload"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleRestoreUpload}
                />
              </div>

              {/* Danger reset db */}
              {session?.role === "SUPER_ADMIN" && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-900">
                  <span className="block text-[10px] font-bold text-red-500 mb-2 uppercase">Zona Bahaya Administrasi</span>
                  <button
                    id="btn-hard-factory-reset"
                    onClick={() => {
                      if (confirm("KONFIRMASI AKHIR: Bersihkan total seluruh rekam data klinis kembang-balita dari memori peramban ini dan set ulang seperti sediaan awal pabrikan komputer? Tindakan ini permanen.")) {
                        onResetDbToDefault();
                        alert("Database dibersihkan total!");
                      }
                    }}
                    className="w-full py-2 pb-2.5 bg-red-500/10 border border-red-500/25 hover:bg-red-500 text-red-500 hover:text-white font-extrabold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} /> Bersihkan Reset Total
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Backup parameters instructions */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            <div className={`p-5 rounded-2xl border flex flex-col justify-between h-full bg-linear-to-tr ${darkMode ? "from-slate-950 to-slate-900 border-slate-850" : "from-slate-100 to-white border-slate-200"}`}>
              <div>
                <span className="text-[10px] font-mono font-extrabold tracking-widest text-slate-400 uppercase">Perangkat Mandiri / Client-Side offline first</span>
                <h3 className="font-extrabold text-lg text-slate-850 dark:text-slate-100 mt-1">Keamanan Data & Integritas Penyimpanan</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-2">
                  Aplikasi SI-PoGi berjalan di lingkungan virtual yang modern demi kenyamanan kader posyandu. Seluruh database anak dan timbangan disimpan secara terisolasi di memori *Peramban Lokal* (Local Storage) laptop atau perangkat Android Anda.
                </p>
                <div className="mt-4 p-3 border rounded-xl border-dashed bg-white/40 dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-350">
                  <span className="font-bold text-indigo-500 block mb-1">Rekomendasi Kader</span>
                  Disarankan untuk melakukan **Ambil Cadangan Utama** sekurang-kurangnya sekali sebulan setelah selesainya jadwal penimbangan posyandu kelurahan untuk mencegah kehilangan riwayat penting jika peramban dibersihkan.
                </div>
              </div>

              <div className="p-3 text-[10px] leading-normal font-mono text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-900">
                Peringatan Keamanan: Cadangan memuat biodata anak berserta NIK orang tua. Harap simpan file hasil unduhan di komputer/flashdisk dinas yang aman.
              </div>
            </div>
          </div>

        </div>
      )}

      {session?.role === "SUPER_ADMIN" && activeTab === "passwords" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Change password card */}
          <div className={`col-span-1 p-5 rounded-2xl border ${darkMode ? "bg-slate-950 border-slate-850" : "bg-white border-slate-205"}`}>
            <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest font-mono mb-4">Reset Sandi Kader</h4>

            {successMsg && (
              <div className="p-3 bg-green-500/10 border border-green-500/25 text-green-500 text-xs font-semibold rounded-lg">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">PILIH POSYANDU UTAMA</label>
                <select
                  value={selectedPosyanduId}
                  onChange={(e) => setSelectedPosyanduId(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                    ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                >
                  <option value="">-- Pilih Posyandu --</option>
                  {posyanduList.map(pos => (
                    <option key={pos.id_posyandu} value={pos.id_posyandu}>{pos.nama_posyandu}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">KATA SANDI / PASSWORD BARU*</label>
                <input
                  type="text"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Setel sandi baru..."
                  className={`w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border focus:outline-none focus:border-teal-500
                    ${darkMode ? "bg-slate-900 border-slate-800 text-slate-105" : "bg-white border-slate-251"}`}
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 rounded-lg bg-teal-500 text-white font-bold text-xs hover:bg-teal-600 transition-colors"
              >
                Setel Kata Sandi
              </button>
            </form>
          </div>

          {/* Quick list of credential logins */}
          <div className={`col-span-2 p-5 rounded-2xl border ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-205"}`}>
            <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest font-mono mb-4">Informasi Akses Petugas Posyandu</h4>
            
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-inherit text-slate-400 uppercase font-mono text-[9px] font-extrabold pb-2">
                    <th className="pb-2">Nama Posyandu</th>
                    <th className="pb-2">Username Login</th>
                    <th className="pb-2">Kata Sandi Pasif</th>
                    <th className="pb-2">Kader Penanggung Jawab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60 font-mono text-[11px]">
                  {posyanduList.map(p => (
                    <tr key={p.id_posyandu} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-101">{p.nama_posyandu}</td>
                      <td className="py-2.5 font-bold text-teal-600 dark:text-teal-400">{p.username}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-350">{p.password || "password123"}</td>
                      <td className="py-2.5 font-sans font-medium text-slate-500">{p.nama_kader}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {activeTab === "help" && (
        <div className={`p-6 rounded-2xl border animate-fadeIn ${darkMode ? "bg-slate-950 border-slate-850" : "bg-white border-slate-200"}`}>
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-teal-650 mb-3.5">Standard KMS Keamanan Gizi Kemenkes</h3>
          
          <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-350">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-101 block">1. Klasifikasi Status Gizi berdasarkan BB/U (Berat per Umur):</span>
              <p>Indeks BB/U menggambarkan gizi saat ini secara umum:</p>
              <ul className="list-disc pl-5 mt-1 text-[11px] font-mono">
                <li>Z-Score &lt; -3.0 SD: Gizi Buruk</li>
                <li>Z-Score -3.0 s/d &lt; -2.0 SD: Gizi Kurang</li>
                <li>Z-Score -2.0 s/d +2.0 SD: Gizi Baik (Normal)</li>
                <li>Z-Score &gt; +2.0 SD: Gizi Lebih (Obesitas)</li>
              </ul>
            </div>

            <div>
              <span className="font-bold text-slate-800 dark:text-slate-101 block">2. Klasifikasi Status Stunting berdasarkan TB/U (Panjang per Umur):</span>
              <p>Indeks TB/U mendeteksi terjadinya gizi buruk kronis / stunting berkepanjangan:</p>
              <ul className="list-disc pl-5 mt-1 text-[11px] font-mono">
                <li>Z-Score &lt; -3.0 SD: Sangat Pendek (Severe Stunting)</li>
                <li>Z-Score -3.0 s/d &lt; -2.0 SD: Pendek (Stunting)</li>
                <li>Z-Score -2.0 s/d +3.0 SD: Normal</li>
                <li>Z-Score &gt; +3.0 SD: Tinggi</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-400 font-semibold leading-normal">
              SI-PoGi menghitung z-score di atas menggunakan parameter baku WHO yang diimplementasikan secara interaktif langsung pada saat penimbangan balita dicatat di posyandu, mempermudah kader dalam melakukan skrining stunting di lapangan secara digital.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
