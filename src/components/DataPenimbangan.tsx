import React, { useState, useMemo } from "react";
import { 
  Scale, 
  Search, 
  Plus, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  FileText, 
  TrendingUp, 
  TrendingDown,
  Trash2,
  X,
  Gauge
} from "lucide-react";
import { DataAnak, Penimbangan, Desa, Posyandu, UserSession } from "../types";
import { calculateAgeInMonths, getZScoreBBU, getZScoreTBU, getZScoreBBTB } from "../utils/zscore";

interface DataPenimbanganProps {
  anakList: DataAnak[];
  penimbanganList: Penimbangan[];
  desaList: Desa[];
  posyanduList: Posyandu[];
  session: UserSession | null;
  darkMode: boolean;
  onAddPenimbangan: (p: Penimbangan) => void;
  onDeletePenimbangan: (id: string) => void;
  quickSearch: string;
}

export default function DataPenimbangan({
  anakList,
  penimbanganList,
  desaList,
  posyanduList,
  session,
  darkMode,
  onAddPenimbangan,
  onDeletePenimbangan,
  quickSearch
}: DataPenimbanganProps) {
  
  const [selectedAnakId, setSelectedAnakId] = useState("");
  const [tanggalPenimbangan, setTanggalPenimbangan] = useState("2026-05-27");
  const [beratBadan, setBeratBadan] = useState("");
  const [tinggiBadan, setTinggiBadan] = useState("");
  const [lingkarKepala, setLingkarKepala] = useState("");
  const [lingkarLengan, setLingkarLengan] = useState("");
  const [notes, setNotes] = useState("");

  const [searchAnakQuery, setSearchAnakQuery] = useState("");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [filterStunting, setFilterStunting] = useState("");
  const [filterGizi, setFilterGizi] = useState("");

  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  // Filter kids list for the selector or index
  const availableAnakList = useMemo(() => {
    return anakList.filter(a => {
      // Role lock
      if (session?.role === "ADMIN_POSYANDU" && session.id_posyandu !== a.id_posyandu) return false;
      if (session?.role === "ADMIN_DESA" && session.id_desa !== a.id_desa) return false;
      
      const q = (searchAnakQuery || quickSearch).toLowerCase();
      if (!q) return true;
      return a.nama_anak.toLowerCase().includes(q) || a.nik_anak.includes(q);
    });
  }, [anakList, searchAnakQuery, quickSearch, session]);

  const selectedChild = useMemo(() => {
    return anakList.find(a => a.id_anak === selectedAnakId);
  }, [selectedAnakId, anakList]);

  // Dynamic automatic calculation of z-scores on typing weight + height
  const calculatedMetrics = useMemo(() => {
    if (!selectedChild || !tanggalPenimbangan) return null;
    const ageMonths = calculateAgeInMonths(selectedChild.tanggal_lahir, tanggalPenimbangan);
    const weight = parseFloat(beratBadan);
    const height = parseFloat(tinggiBadan);

    if (!weight || isNaN(weight) || !height || isNaN(height)) {
      return {
        ageMonths,
        bbu: null,
        tbu: null,
        bbtb: null
      };
    }

    const bbu = getZScoreBBU(selectedChild.jenis_kelamin, ageMonths, weight);
    const tbu = getZScoreTBU(selectedChild.jenis_kelamin, ageMonths, height);
    const bbtb = getZScoreBBTB(selectedChild.jenis_kelamin, height, weight);

    return {
      ageMonths,
      bbu,
      tbu,
      bbtb
    };
  }, [selectedChild, tanggalPenimbangan, beratBadan, tinggiBadan]);

  // Master historical log table sorted descending
  const filteredLogs = useMemo(() => {
    return penimbanganList
      .filter(log => {
        const child = anakList.find(a => a.id_anak === log.id_anak);
        if (!child) return false;

        // Role locks
        if (session?.role === "ADMIN_POSYANDU" && session.id_posyandu !== child.id_posyandu) return false;
        if (session?.role === "ADMIN_DESA" && session.id_desa !== child.id_desa) return false;

        // Custom search string in log
        const q = logSearchQuery.toLowerCase();
        const matchSearch = !q || 
          child.nama_anak.toLowerCase().includes(q) || 
          child.nik_anak.includes(q) ||
          log.petugas_input.toLowerCase().includes(q);

        const matchGizi = !filterGizi || log.status_gizi === filterGizi;
        const matchStunting = !filterStunting || log.status_stunting === filterStunting;

        return matchSearch && matchGizi && matchStunting;
      })
      .sort((a, b) => new Date(b.tanggal_penimbangan).getTime() - new Date(a.tanggal_penimbangan).getTime());
  }, [penimbanganList, anakList, logSearchQuery, filterGizi, filterStunting, session]);

  const handleWeighingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!selectedAnakId) {
      setFormError("Pilih salah satu balita dari daftar.");
      return;
    }
    const w = parseFloat(beratBadan);
    const h = parseFloat(tinggiBadan);
    if (!w || w <= 0 || !h || h <= 0) {
      setFormError("Berat Badan (kg) dan Tinggi Badan (cm) harus diisi angka positif.");
      return;
    }

    const ageMonths = calculatedMetrics?.ageMonths ?? 0;
    const bbu = calculatedMetrics?.bbu;
    const tbu = calculatedMetrics?.tbu;
    const bbtb = calculatedMetrics?.bbtb;

    if (!bbu || !tbu || !bbtb) {
      setFormError("Gagal menghitung matriks status gizi secara otomatis.");
      return;
    }

    const payload: Penimbangan = {
      id_penimbangan: `PEN-${Date.now().toString().slice(-4)}`,
      id_anak: selectedAnakId,
      tanggal_penimbangan: tanggalPenimbangan,
      umur_bulan: ageMonths,
      berat_badan: w,
      tinggi_badan: h,
      lingkar_kepala: parseFloat(lingkarKepala) || 0,
      lingkar_lengan: parseFloat(lingkarLengan) || 0,
      zscore_bb_u: bbu.zScore,
      zscore_tb_u: tbu.zScore,
      zscore_bb_tb: bbtb.zScore,
      status_gizi: bbu.status,
      status_gizi_bbtb: bbtb.status,
      status_stunting: tbu.status,
      catatan: notes.trim(),
      petugas_input: session?.nama || "Kader Posyandu"
    };

    onAddPenimbangan(payload);
    setFormSuccess(`Hasil penimbangan berhasil terekam untuk ${selectedChild?.nama_anak}.`);
    
    // Clear form inputs
    setBeratBadan("");
    setTinggiBadan("");
    setLingkarKepala("");
    setLingkarLengan("");
    setNotes("");
    setSelectedAnakId("");

    // dismiss message shortly
    setTimeout(() => {
      setFormSuccess("");
    }, 2500);
  };

  // Helper colors mapping to medical risk thresholds
  const getGiziBadgeColor = (status: string) => {
    switch (status) {
      case "Berat Badan Normal":
      case "Normal":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Gizi Lebih":
      case "Risiko Gizi Lebih":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
      case "Obesitas":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "Gizi Kurang":
      case "Kurang":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "Gizi Buruk / Outlier":
      case "Sangat Kurang":
        return "bg-red-500/10 text-red-650 border-red-500/30";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  const getStuntingBadgeColor = (status: string) => {
    switch (status) {
      case "Normal":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Pendek":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "Sangat Pendek":
        return "bg-red-500/10 text-red-650 border-red-500/30";
      case "Stunting Perseda":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "Tinggi":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-650 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Grid Split: Input Form (Left) vs Fast Index Child lookup (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step-by-Step Measurements input card */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-205"}`}>
          <div className="flex items-center gap-2 mb-4">
            <Scale className="text-teal-500" size={18} />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">Pencatat Timbangan Bulanan</h3>
          </div>

          {selectedChild ? (
            <form onSubmit={handleWeighingSubmit} className="space-y-4">
              
              {/* Selected card snippet */}
              <div className={`p-3.5 rounded-xl border flex justify-between items-center ${darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center font-bold text-xs
                    ${selectedChild.jenis_kelamin === "L" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"}`}>
                    {selectedChild.jenis_kelamin}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-850 dark:text-slate-100">{selectedChild.nama_anak}</h4>
                    <span className="text-[10px] font-mono text-slate-400">Lahir: {selectedChild.tanggal_lahir} • Ibu: {selectedChild.nama_ortu.split("/")[0]}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAnakId("")}
                  className="p-1 px-2 rounded-lg text-[10px] font-bold border border-red-500/20 text-red-500 hover:bg-red-500/10"
                >
                  Unselect
                </button>
              </div>

              {/* Input fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TANGGAL PINDAU*</label>
                  <input
                    id="input-weight-tanggal"
                    type="date"
                    value={tanggalPenimbangan}
                    onChange={(e) => setTanggalPenimbangan(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">BERAT BADAN (kg)*</label>
                  <input
                    id="input-weight-berat"
                    type="number"
                    step="0.01"
                    placeholder="E.g. 8.4"
                    value={beratBadan}
                    onChange={(e) => setBeratBadan(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TINGGI BADAN (cm)*</label>
                  <input
                    id="input-weight-tinggi"
                    type="number"
                    step="0.1"
                    placeholder="E.g. 71.5"
                    value={tinggiBadan}
                    onChange={(e) => setTinggiBadan(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">UMUR (DIHITUNG)*</label>
                  <div className={`px-3 py-2 text-xs font-extrabold border rounded-lg h-[34px] flex items-center
                    ${darkMode ? "bg-slate-950 border-slate-800 text-teal-400" : "bg-slate-50 border-slate-250 text-teal-655"}`}>
                    {calculatedMetrics?.ageMonths ?? 0} Bulan
                  </div>
                </div>
              </div>

              {/* Row 2: Secondary clinical inputs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">LINGKAR KEPALA (cm)</label>
                  <input
                    id="input-weight-kepala"
                    type="number"
                    step="0.1"
                    placeholder="42.5"
                    value={lingkarKepala}
                    onChange={(e) => setLingkarKepala(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250"}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">LINGKAR LENGAN (cm)</label>
                  <input
                    id="input-weight-lengan"
                    type="number"
                    step="0.1"
                    placeholder="13.2"
                    value={lingkarLengan}
                    onChange={(e) => setLingkarLengan(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250"}`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">CATATAN KADER & KELUHAN</label>
                  <input
                    id="input-weight-catatan"
                    type="text"
                    placeholder="Merangkak lancar, ASI eksklusif..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250"}`}
                  />
                </div>
              </div>

              {/* REAL-TIME PREVIEW CRITICAL: Computed WHO categories change instantly */}
              {calculatedMetrics?.bbu && (
                <div className="p-4 rounded-xl border bg-slate-500/5 border-slate-200 dark:border-slate-800">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2.5">
                    Hasil Z-Score Matematis WHO (Hitung Otomatis)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    {/* Index weight per age BB/U */}
                    <div className="p-3 rounded-lg border border-inherit flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">BBU (Berat/Umur)</span>
                      <span className={`text-[11px] font-bold mt-1.5 ${
                        calculatedMetrics.bbu.status === "Berat Badan Normal" 
                          ? "text-emerald-500" 
                          : calculatedMetrics.bbu.status === "Risiko Gizi Lebih"
                            ? "text-indigo-500"
                            : calculatedMetrics.bbu.status === "Kurang"
                              ? "text-amber-500"
                              : "text-red-500 font-extrabold"
                      }`}>
                        {calculatedMetrics.bbu.status}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">Z-Score: {calculatedMetrics.bbu.zScore} SD</span>
                    </div>

                    {/* Index height-per-age stunting classification */}
                    <div className="p-3 rounded-lg border border-inherit flex flex-col justify-between pb-2.5 relative overflow-hidden">
                      <span className="text-[10px] text-slate-400 font-medium">TBU (Stunting / Tinggi)</span>
                      <span className={`text-[11px] font-bold mt-1.5 ${
                        ["Normal", "Tinggi"].includes(calculatedMetrics.tbu.status) 
                          ? "text-emerald-500" 
                          : calculatedMetrics.tbu.status === "Pendek"
                            ? "text-amber-500"
                            : "text-red-500 font-black animate-pulse"
                      }`}>
                        {calculatedMetrics.tbu.status}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">Z-Score: {calculatedMetrics.tbu.zScore} SD</span>
                      
                      {/* Risk colored indicators */}
                      <span className={`absolute right-2 top-2 w-3.5 h-3.5 rounded-full ${
                        ["Normal", "Tinggi"].includes(calculatedMetrics.tbu.status) 
                          ? "bg-emerald-500" 
                          : calculatedMetrics.tbu.status === "Pendek"
                            ? "bg-amber-500"
                            : "bg-red-500 animate-ping"
                      }`} />
                    </div>

                    {/* Index wasting classification (Weight per Stature) */}
                    <div className="p-3 rounded-lg border border-inherit flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-medium font-mono">BB/TB (Wasting)</span>
                      <span className="text-[11px] font-bold mt-1.5 text-slate-700 dark:text-slate-205">
                        {calculatedMetrics.bbtb.status}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">Z-Score: {calculatedMetrics.bbtb.zScore} SD</span>
                    </div>

                  </div>
                </div>
              )}

              {/* Form errors */}
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold flex gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/25 text-green-500 rounded-lg text-xs font-semibold flex gap-2">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* CTA submit */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAnakId("")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors
                    ${darkMode ? "border-slate-850 text-slate-400" : "border-slate-200 text-slate-600 hover:bg-slate-150"}`}
                >
                  Clear Form
                </button>
                <button
                  id="btn-submit-weighing"
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-extrabold text-white bg-teal-500 hover:bg-teal-600 transition-colors active:scale-95 shadow-md shadow-teal-500/10"
                >
                  Simpan Catatan Timbang
                </button>
              </div>

            </form>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-500/5 p-6 text-center text-slate-400">
              <Scale size={32} className="text-slate-350 dark:text-slate-805 mb-2.5" />
              <p className="text-xs font-bold">Harap Pilih Salah Satu Balita di Kolom Sebelah Kanan</p>
              <p className="text-[10px] text-slate-500 leading-normal max-w-sm mt-1">
                Ketikkan kata kunci pada seacbar atau klik langsung kartu balita untuk memulai formulir penimbangan terintervensi.
              </p>
            </div>
          )}
        </div>

        {/* Index of select children list column (Right box) */}
        <div className={`p-4 rounded-2xl border flex flex-col max-h-[464px] ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-200"}`}>
          <div className="relative mb-3.5">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              id="input-weigh-child-filter"
              type="text"
              placeholder="Saring Daftar Balita..."
              value={searchAnakQuery}
              onChange={(e) => setSearchAnakQuery(e.target.value)}
              className={`w-full py-1.5 pl-8 pr-3 text-xs font-semibold border rounded-lg focus:outline-none
                ${darkMode ? "bg-slate-900 border-slate-850 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {availableAnakList.map((anak) => {
              const selected = selectedAnakId === anak.id_anak;
              return (
                <div
                  key={anak.id_anak}
                  id={`select-child-row-${anak.id_anak}`}
                  onClick={() => {
                    setSelectedAnakId(anak.id_anak);
                    // clear inputs shortly
                    setBeratBadan("");
                    setTinggiBadan("");
                  }}
                  className={`p-2.5 rounded-xl border flex justify-between items-center cursor-pointer transition-all hover:border-teal-500/50
                    ${selected 
                      ? "border-teal-500 bg-teal-500/5 text-slate-900 font-bold" 
                      : darkMode ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black
                      ${anak.jenis_kelamin === "L" ? "bg-blue-50 text-blue-500" : "bg-pink-50 text-pink-500"}`}>
                      {anak.jenis_kelamin}
                    </span>
                    <div className="leading-tight">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 line-clamp-1">{anak.nama_anak}</p>
                      <span className="text-[8.5px] text-slate-400 font-mono">ID: {anak.id_anak}</span>
                    </div>
                  </div>
                  
                  {selected && <CheckCircle2 size={14} className="text-teal-500 shrink-0" />}
                </div>
              );
            })}

            {availableAnakList.length === 0 && (
              <p className="text-center py-8 text-xs text-slate-400 italic">
                Tidak ada data balita cocok dengan kueri.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Database History Table Logs logs section */}
      <div className={`p-5 rounded-2xl border ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-205"}`}>
        
        {/* Table layout header and filtering */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <div>
            <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest font-mono">Buku Buku Catatan Bulanan</h4>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">Riwayat Timbangan Lengkap</p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <input
              id="input-log-search"
              type="text"
              placeholder="Cari balita, kader..."
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none
                ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200"}`}
            />

            <select
              id="select-log-gizi"
              value={filterGizi}
              onChange={(e) => setFilterGizi(e.target.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none
                ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200"}`}
            >
              <option value="">Semua Status Gizi (BB/U)</option>
              <option value="Sangat Kurang">Sangat Kurang</option>
              <option value="Kurang">Kurang</option>
              <option value="Berat Badan Normal">Berat Badan Normal</option>
              <option value="Risiko Gizi Lebih">Risiko Gizi Lebih</option>
            </select>

            <select
              id="select-log-stunting"
              value={filterStunting}
              onChange={(e) => setFilterStunting(e.target.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none
                ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-205"}`}
            >
              <option value="">Semua Status Stunting</option>
              <option value="Sangat Pendek">Sangat Pendek</option>
              <option value="Pendek">Pendek</option>
              <option value="Stunting Perseda">Stunting Perseda</option>
              <option value="Normal">Normal</option>
              <option value="Tinggi">Tinggi</option>
            </select>
          </div>
        </div>

        {/* The data list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-inherit text-slate-400 font-mono font-extrabold text-[10px] uppercase">
                <th className="pb-2.5">ID Timbang</th>
                <th className="pb-2.5">Balita / NIK</th>
                <th className="pb-2.5">Tgl Timbang</th>
                <th className="pb-2.5 text-center">Umur (Bln)</th>
                <th className="pb-2.5 text-center">BB (kg)</th>
                <th className="pb-2.5 text-center">TB (cm)</th>
                <th className="pb-2.5">Status Gizi (BBU)</th>
                <th className="pb-2.5">Status Gizi (BB/TB)</th>
                <th className="pb-2.5">Stunting (TBU)</th>
                <th className="pb-2.5">Catatan/KMS</th>
                <th className="pb-2.5">Petugas</th>
                {session?.role === "SUPER_ADMIN" && <th className="pb-2.5 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60 text-xs">
              {filteredLogs.map(log => {
                const child = anakList.find(a => a.id_anak === log.id_anak);
                return (
                  <tr key={log.id_penimbangan} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-2.5 font-mono text-[9px] text-slate-400">{log.id_penimbangan}</td>
                    <td className="py-2.5">
                      <p className="font-extrabold text-slate-800 dark:text-slate-105">{child ? child.nama_anak : "Tidak Ditemukan"}</p>
                      <span className="text-[9px] text-slate-405 font-mono">{child ? child.nik_anak : "-"}</span>
                    </td>
                    <td className="py-2.5 font-medium">{log.tanggal_penimbangan}</td>
                    <td className="py-2.5 text-center font-bold">{log.umur_bulan} Bln</td>
                    <td className="py-2.5 text-center font-bold text-teal-650">{log.berat_badan} kg</td>
                    <td className="py-2.5 text-center font-semibold text-indigo-505 text-indigo-600 dark:text-indigo-400">{log.tinggi_badan} cm</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getGiziBadgeColor(log.status_gizi)}`}>
                        {log.status_gizi}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {(() => {
                        const statusBBTB = log.status_gizi_bbtb || (child ? getZScoreBBTB(child.jenis_kelamin, log.tinggi_badan, log.berat_badan).status : "Normal");
                        return (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getGiziBadgeColor(statusBBTB)}`}>
                            {statusBBTB}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStuntingBadgeColor(log.status_stunting)}`}>
                        {log.status_stunting}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 font-mono text-[10px] line-clamp-1 max-w-[140px] pt-4 border-none" title={log.catatan}>{log.catatan || "-"}</td>
                    <td className="py-2.5 text-[10px] text-slate-400 truncate max-w-[80px]">{log.petugas_input}</td>
                    
                    {session?.role === "SUPER_ADMIN" && (
                      <td className="py-2.5 text-center">
                        <button
                          id={`btn-delete-log-${log.id_penimbangan}`}
                          onClick={() => {
                            if (confirm(`Hapus catatan timbang ${log.id_penimbangan} dari database?`)) {
                              onDeletePenimbangan(log.id_penimbangan);
                            }
                          }}
                          className="p-1 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                          title="Hapus Catatan"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-slate-400 italic">
                    Belum ada riwayat penimbangan direkam dalam sistem.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
