import React, { useState, useMemo } from "react";
import { 
  FileSpreadsheet, 
  Download, 
  UploadCloud, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  Filter, 
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import { DataAnak, Penimbangan, Desa, Posyandu, UserSession } from "../types";
import { 
  exportToExcel, 
  downloadTemplateAnak, 
  downloadTemplatePenimbangan, 
  parseUploadedFile 
} from "../utils/excel";
import { getZScoreBBU, getZScoreTBU, getZScoreBBTB, calculateAgeInMonths } from "../utils/zscore";

interface ExcelImportExportProps {
  anakList: DataAnak[];
  penimbanganList: Penimbangan[];
  desaList: Desa[];
  posyanduList: Posyandu[];
  session: UserSession | null;
  darkMode: boolean;
  onImportAnak: (newAnak: DataAnak[]) => void;
  onImportPenimbangan: (newPenimbangan: Penimbangan[]) => void;
}

export default function ExcelImportExport({
  anakList,
  penimbanganList,
  desaList,
  posyanduList,
  session,
  darkMode,
  onImportAnak,
  onImportPenimbangan
}: ExcelImportExportProps) {
  
  // Tab states for module
  const [activeSegment, setActiveSegment] = useState<"export" | "import">("export");
  
  // Custom export selectors
  const [exportTarget, setExportTarget] = useState<"balita" | "penimbangan">("balita");
  const [exportDesa, setExportDesa] = useState("");
  const [exportPosyandu, setExportPosyandu] = useState("");
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
  const [exportMonth, setExportMonth] = useState(""); // 1-12
  const [exportYear, setExportYear] = useState("2026");

  // Import workflows
  const [importTarget, setImportTarget] = useState<"balita" | "penimbangan">("balita");
  const [dragActive, setDragActive] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  
  const [importStatus, setImportStatus] = useState<"idle" | "parsing" | "success" | "errors">("idle");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validEntitiesToCommit, setValidEntitiesToCommit] = useState<any[]>([]);

  // Configure locks
  const lockedDesa = session?.role === "ADMIN_DESA" ? session.id_desa : "";
  const lockedPosyandu = session?.role === "ADMIN_POSYANDU" ? session.id_posyandu : "";

  // Auto set locks on load
  React.useEffect(() => {
    if (lockedDesa) setExportDesa(lockedDesa);
    if (lockedPosyandu) {
      setExportPosyandu(lockedPosyandu);
      const pos = posyanduList.find(p => p.id_posyandu === lockedPosyandu);
      if (pos) setExportDesa(pos.id_desa);
    }
  }, [lockedDesa, lockedPosyandu, posyanduList]);

  // Handle spreadsheet parsing
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setFileToImport(file);
    setImportStatus("parsing");
    setValidationErrors([]);
    setParsedRows([]);
    setValidEntitiesToCommit([]);

    try {
      const rows = await parseUploadedFile(file);
      setParsedRows(rows);
      validateDataRows(rows);
    } catch (err: any) {
      setValidationErrors([`Gagal memproses file spreadsheet: ${err.message || err}`]);
      setImportStatus("errors");
    }
  };

  // Inspect the rows for clinical/entity compliance
  const validateDataRows = (rows: any[]) => {
    const errorLogs: string[] = [];
    const validAnakAcc: DataAnak[] = [];
    const validPenimbanganAcc: Penimbangan[] = [];

    if (rows.length === 0) {
      setValidationErrors(["File kosong atau baris header tidak sesuai."]);
      setImportStatus("errors");
      return;
    }

    if (importTarget === "balita") {
      rows.forEach((row, i) => {
        const rowNum = i + 2; // Row index is 2 (Header is 1)
        const nikAnak = row["NIK Anak (16 Digit)"]?.toString().trim();
        const nama = row["Nama Anak"]?.toString().trim();
        const jk = row["Jenis Kelamin (L/P)"]?.toString().toUpperCase().trim();
        const tglLahir = row["Tanggal Lahir (YYYY-MM-DD)"]?.toString().trim();
        const namaOrtu = row["Nama Orang Tua (Ibu/Ayah)"]?.toString().trim();
        const idDesa = row["ID Desa"]?.toString().trim();
        const idPosyandu = row["ID Posyandu"]?.toString().trim();
        
        // validations
        if (!nikAnak || nikAnak.length !== 16 || isNaN(Number(nikAnak))) {
          errorLogs.push(`Baris ${rowNum}: NIK Anak wajib terdiri dari 16 digit angka.`);
        }
        if (!nama) {
          errorLogs.push(`Baris ${rowNum}: Nama Anak kosong.`);
        }
        if (jk !== "L" && jk !== "P") {
          errorLogs.push(`Baris ${rowNum}: Jenis Kelamin wajib bernilai 'L' atau 'P'.`);
        }
        if (!tglLahir || isNaN(Date.parse(tglLahir))) {
          errorLogs.push(`Baris ${rowNum}: Format tanggal lahir tidak sesuai (Harap gunakan YYYY-MM-DD).`);
        }
        if (!idDesa || !desaList.some(d => d.id_desa === idDesa)) {
          errorLogs.push(`Baris ${rowNum}: ID Desa '${idDesa}' tidak terdaftar di sistem master data.`);
        }
        if (!idPosyandu || !posyanduList.some(p => p.id_posyandu === idPosyandu)) {
          errorLogs.push(`Baris ${rowNum}: ID Posyandu '${idPosyandu}' tidak ditemukan.`);
        }

        // Check if NIK is already registered in local database
        if (anakList.some(a => a.nik_anak === nikAnak)) {
          errorLogs.push(`Baris ${rowNum}: Balita dengan NIK '${nikAnak}' sudah terdaftar dalam sistem (Duplicate).`);
        }

        if (errorLogs.length === 0) {
          validAnakAcc.push({
            id_anak: `ANAK-IMP-${Date.now().toString().slice(-3)}-${i}`,
            nik_anak: nikAnak,
            nama_anak: nama,
            jenis_kelamin: jk as "L" | "P",
            tanggal_lahir: tglLahir,
            nama_ortu: namaOrtu || "Tidak Diketahui",
            nik_ortu: row["NIK Orang Tua (16 Digit)"]?.toString() || "",
            alamat: row["Alamat"]?.toString() || "Binaan Desa",
            rt_rw: row["RT/RW (Format RT/RW)"]?.toString() || "01/01",
            id_desa: idDesa,
            id_posyandu: idPosyandu,
            berat_lahir: parseFloat(row["Berat Lahir (kg)"]) || 3.0,
            tinggi_lahir: parseFloat(row["Tinggi Lahir (cm)"]) || 48.0,
            created_at: new Date().toISOString()
          });
        }
      });

      setValidEntitiesToCommit(validAnakAcc);
    } else {
      // Validating penimbangan sheet
      rows.forEach((row, i) => {
        const rowNum = i + 2;
        const idAnak = row["ID Anak (Bisa dilihat di daftar anak)"]?.toString().trim();
        const tglTimbang = row["Tanggal Penimbangan (YYYY-MM-DD)"]?.toString().trim();
        const w = parseFloat(row["Berat Badan (kg)"]);
        const h = parseFloat(row["Tinggi Badan (cm)"]);

        const childObj = anakList.find(a => a.id_anak === idAnak);
        if (!idAnak || !childObj) {
          errorLogs.push(`Baris ${rowNum}: ID Anak '${idAnak}' tidak terdaftar.`);
        }
        if (!tglTimbang || isNaN(Date.parse(tglTimbang))) {
          errorLogs.push(`Baris ${rowNum}: Format tanggal penimbangan tidak sesuai.`);
        }
        if (!w || w <= 0 || !h || h <= 0) {
          errorLogs.push(`Baris ${rowNum}: Berat dan tinggi harus bernilai angka positif.`);
        }

        if (errorLogs.length === 0 && childObj) {
          // Calculate z-scores on the fly for imports
          const ageMonths = calculateAgeInMonths(childObj.tanggal_lahir, tglTimbang);
          const bbu = getZScoreBBU(childObj.jenis_kelamin, ageMonths, w);
          const tbu = getZScoreTBU(childObj.jenis_kelamin, ageMonths, h);
          const bbtb = getZScoreBBTB(childObj.jenis_kelamin, h, w);

          validPenimbanganAcc.push({
            id_penimbangan: `PEN-IMP-${Date.now().toString().slice(-3)}-${i}`,
            id_anak: idAnak,
            tanggal_penimbangan: tglTimbang,
            umur_bulan: ageMonths,
            berat_badan: w,
            tinggi_badan: h,
            lingkar_kepala: parseFloat(row["Lingkar Kepala (cm)"]) || 0,
            lingkar_lengan: parseFloat(row["Lingkar Lengan (cm)"]) || 0,
            zscore_bb_u: bbu.zScore,
            zscore_tb_u: tbu.zScore,
            zscore_bb_tb: bbtb.zScore,
            status_gizi: bbu.status,
            status_gizi_bbtb: bbtb.status,
            status_stunting: tbu.status,
            catatan: row["Catatan"]?.toString() || "Import via Excel",
            petugas_input: row["Petugas Input"]?.toString() || "Kader Pembantu"
          });
        }
      });

      setValidEntitiesToCommit(validPenimbanganAcc);
    }

    if (errorLogs.length > 0) {
      setValidationErrors(errorLogs);
      setImportStatus("errors");
    } else {
      setImportStatus("success");
    }
  };

  const handleCommitImport = () => {
    if (importTarget === "balita") {
      onImportAnak(validEntitiesToCommit);
    } else {
      onImportPenimbangan(validEntitiesToCommit);
    }

    // Success reset
    setFileToImport(null);
    setImportStatus("idle");
    setParsedRows([]);
    setValidEntitiesToCommit([]);
    alert("Data berhasil digabungkan (merge) ke database utama!");
  };

  // Perform dynamic filtered export 
  const triggerExport = () => {
    let sheetName = "";
    let dataToExport: any[] = [];
    const fn = `${exportTarget === "balita" ? "Data_Balita" : "Riwayat_Timbang"}_${exportYear}`;

    if (exportTarget === "balita") {
      sheetName = "Data_Anak_Binaan";
      const list = anakList.filter(a => {
        if (exportDesa && a.id_desa !== exportDesa) return false;
        if (exportPosyandu && a.id_posyandu !== exportPosyandu) return false;
        return true;
      });

      dataToExport = list.map(a => {
        const desa = desaList.find(d => d.id_desa === a.id_desa);
        const posyandu = posyanduList.find(p => p.id_posyandu === a.id_posyandu);
        // Find latest weighing for metrics preview
        const weights = penimbanganList
          .filter(w => w.id_anak === a.id_anak)
          .sort((x, y) => new Date(y.tanggal_penimbangan).getTime() - new Date(x.tanggal_penimbangan).getTime());
        const latest = weights[0];

        return {
          "ID Anak": a.id_anak,
          "NIK Anak": a.nik_anak,
          "Nama Lengkap": a.nama_anak,
          "L/P": a.jenis_kelamin,
          "Tanggal Lahir": a.tanggal_lahir,
          "Nama Orang Tua": a.nama_ortu,
          "NIK Orang Tua": a.nik_ortu,
          "Alamat Lengkap": a.alamat,
          "RT/RW": a.rt_rw,
          "Kelurahan/Desa": desa ? desa.nama_desa : "",
          "Kader Posyandu": posyandu ? posyandu.nama_posyandu : "",
          "Status Gizi (BB/U) Terakhir": latest ? latest.status_gizi : "Belum Terukur",
          "Status Gizi (BB/TB) Terakhir": latest ? (latest.status_gizi_bbtb || getZScoreBBTB(a.jenis_kelamin, latest.tinggi_badan, latest.berat_badan).status) : "Belum Terukur",
          "Status Stunting (TB/U) Terakhir": latest ? latest.status_stunting : "Belum Terukur",
          "Tanggal Input": a.created_at
        };
      });
    } else {
      sheetName = "Riwayat_Penimbangan";
      const list = penimbanganList.filter(log => {
        const child = anakList.find(a => a.id_anak === log.id_anak);
        if (!child) return false;
        if (exportDesa && child.id_desa !== exportDesa) return false;
        if (exportPosyandu && child.id_posyandu !== exportPosyandu) return false;

        const weighDate = new Date(log.tanggal_penimbangan);
        if (exportMonth && (weighDate.getMonth() + 1).toString() !== exportMonth) return false;
        if (exportYear && weighDate.getFullYear().toString() !== exportYear) return false;

        return true;
      });

      dataToExport = list.map(log => {
        const child = anakList.find(a => a.id_anak === log.id_anak);
        const desa = child ? desaList.find(d => d.id_desa === child.id_desa) : null;
        const posyandu = child ? posyanduList.find(p => p.id_posyandu === child.id_posyandu) : null;

        return {
          "ID Rekam": log.id_penimbangan,
          "ID Anak": log.id_anak,
          "Nama Anak": child ? child.nama_anak : "Tidak Ditemukan",
          "NIK Anak": child ? child.nik_anak : "",
          "Kelurahan Desa": desa ? desa.nama_desa : "",
          "Posyandu": posyandu ? posyandu.nama_posyandu : "",
          "Tanggal Timbang": log.tanggal_penimbangan,
          "Usia (Bulan)": log.umur_bulan,
          "Berat Badan (kg)": log.berat_badan,
          "Tinggi Badan (cm)": log.tinggi_badan,
          "Lingkar Kepala (cm)": log.lingkar_kepala,
          "Lingkar Lengan (cm)": log.lingkar_lengan,
          "Z-Score BB/U": log.zscore_bb_u,
          "Z-Score TB/U (Stunting)": log.zscore_tb_u,
          "Z-Score BB/TB": log.zscore_bb_tb,
          "Status Gizi (BB/U)": log.status_gizi,
          "Status Gizi (BB/TB)": log.status_gizi_bbtb || (child ? getZScoreBBTB(child.jenis_kelamin, log.tinggi_badan, log.berat_badan).status : "Belum Terukur"),
          "Status Stunting (TB/U)": log.status_stunting,
          "Catatan KMS": log.catatan,
          "Petugas Entry": log.petugas_input
        };
      });
    }

    exportToExcel(dataToExport, fn, sheetName, exportFormat);
  };

  // Drag & drop handlers for UI
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Segment Toggles */}
      <div className="flex border-b border-slate-205 dark:border-slate-800">
        <button
          id="btn-segment-export"
          onClick={() => setActiveSegment("export")}
          className={`px-5 py-3 text-xs font-black transition-colors border-b-2 flex items-center gap-2
            ${activeSegment === "export" 
              ? "border-teal-500 text-teal-600 dark:text-teal-400" 
              : "border-transparent text-slate-450 hover:text-slate-750"}`}
        >
          <Layers size={15} /> Ekstrak Ekspor Data (Laporan .xlsx / .csv)
        </button>
        <button
          id="btn-segment-import"
          onClick={() => setActiveSegment("import")}
          className={`px-5 py-3 text-xs font-black transition-colors border-b-2 flex items-center gap-2
            ${activeSegment === "import" 
              ? "border-teal-500 text-teal-600 dark:text-teal-400" 
              : "border-transparent text-slate-450 hover:text-slate-750"}`}
        >
          <UploadCloud size={15} /> Mass Import Spreadsheet (.xlsx)
        </button>
      </div>

      {activeSegment === "export" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Export Settings Panel */}
          <div className={`col-span-1 p-5 rounded-2xl border ${darkMode ? "bg-slate-950 border-slate-850" : "bg-white border-slate-205"}`}>
            <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest font-mono mb-4">Saringan Data Ekspor</h4>
            
            <div className="space-y-4">
              
              {/* Target dataset */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5">DATA YANG DIEXPORT</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setExportTarget("balita")}
                    className={`py-2 px-3 border rounded-lg font-bold
                      ${exportTarget === "balita" 
                        ? "bg-teal-500/15 border-teal-500 text-teal-600 dark:text-teal-400" 
                        : "bg-transparent border-slate-200 text-slate-500"}`}
                  >
                    Daftar Balita
                  </button>
                  <button
                    onClick={() => setExportTarget("penimbangan")}
                    className={`py-2 px-3 border rounded-lg font-bold
                      ${exportTarget === "penimbangan" 
                        ? "bg-teal-500/15 border-teal-500 text-teal-600 dark:text-teal-400" 
                        : "bg-transparent border-slate-200 text-slate-500"}`}
                  >
                    Riwayat Timbang
                  </button>
                </div>
              </div>

              {/* Desa filer */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">WILAYAH DESA</label>
                <select
                  disabled={!!lockedDesa}
                  value={exportDesa}
                  onChange={(e) => {
                    setExportDesa(e.target.value);
                    setExportPosyandu("");
                  }}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none
                    ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100 disabled:bg-slate-950 disabled:text-slate-600" : "bg-white border-slate-200 text-slate-800 disabled:bg-slate-50"}`}
                >
                  <option value="">Semua Wilayah</option>
                  {desaList.map(d => (
                    <option key={d.id_desa} value={d.id_desa}>{d.nama_desa}</option>
                  ))}
                </select>
              </div>

              {/* Posyandu filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">POSYANDU BINAAN</label>
                <select
                  disabled={!!lockedPosyandu}
                  value={exportPosyandu}
                  onChange={(e) => setExportPosyandu(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none
                    ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100 disabled:bg-slate-950 disabled:text-slate-600" : "bg-white border-slate-200 text-slate-850 disabled:bg-slate-50"}`}
                >
                  <option value="">Semua Posyandu</option>
                  {posyanduList
                    .filter(p => !exportDesa || p.id_desa === exportDesa)
                    .map(pos => (
                      <option key={pos.id_posyandu} value={pos.id_posyandu}>{pos.nama_posyandu}</option>
                    ))}
                </select>
              </div>

              {/* Dates filters if penimbangan */}
              {exportTarget === "penimbangan" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">BULAN LAPORAN</label>
                    <select
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none
                        ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
                    >
                      <option value="">Semua Bulan</option>
                      {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">TAHUN LAPORAN</label>
                    <input
                      type="number"
                      value={exportYear}
                      onChange={(e) => setExportYear(e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs font-bold rounded-lg border focus:outline-none text-center
                        ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
                    />
                  </div>
                </div>
              )}

              {/* Export format */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5">FORMAT STRUKTUR FILE</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setExportFormat("xlsx")}
                    className={`py-2 px-3 border rounded-lg font-bold flex items-center justify-center gap-1.5
                      ${exportFormat === "xlsx" 
                        ? "bg-indigo-500/15 border-indigo-505 text-indigo-600 dark:text-indigo-400" 
                        : "bg-transparent border-slate-200 text-slate-500"}`}
                  >
                    EXCEL (.xlsx)
                  </button>
                  <button
                    onClick={() => setExportFormat("csv")}
                    className={`py-2 px-3 border rounded-lg font-bold flex items-center justify-center gap-1.5
                      ${exportFormat === "csv" 
                        ? "bg-indigo-500/15 border-indigo-505 text-indigo-600 dark:text-indigo-400" 
                        : "bg-transparent border-slate-200 text-slate-500"}`}
                  >
                    TEXT (.csv)
                  </button>
                </div>
              </div>

              {/* CTA export */}
              <button
                id="btn-trigger-export"
                onClick={triggerExport}
                className="w-full mt-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-teal-500/10"
              >
                <Download size={15} /> Ekstrak file Laporan ({exportFormat.toUpperCase()})
              </button>

            </div>
          </div>

          {/* Export information preview */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            <div className={`p-5 rounded-2xl border flex flex-col justify-between h-full bg-linear-to-tr ${darkMode ? "from-slate-950 to-slate-900 border-slate-850" : "from-slate-50 to-white border-slate-205"}`}>
              <div>
                <span className="text-[10px] font-mono font-extrabold tracking-widest text-slate-400 uppercase">STANDAR NASIONAL KOP/EPPGBM</span>
                <h3 className="font-black text-xl text-slate-850 dark:text-slate-100 mt-1">Sistem Dokumen Laporan Ekspor</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-2">
                  Laporan spreadsheet yang diekspor dari aplikasi SI-PoGi mengadopsi format parameter klinik yang mirip dengan aplikasi **E-PPGBM (Pencatatan & Pelaporan Gizi Berbasis Masyarakat)** dari Kementerian Kesehatan RI.
                </p>
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-600 dark:text-slate-350">
                  <div className="p-3 border rounded-xl border-dashed bg-white/40 dark:bg-slate-900/40">
                    <span className="font-bold block text-teal-600 mb-1">Cakupan Desa</span>
                    Memuat data seluruh penimbangan anak di bawah pembinaan desa dan kader terkait secara urut dan rapi.
                  </div>
                  <div className="p-3 border rounded-xl border-dashed bg-white/40 dark:bg-slate-900/40">
                    <span className="font-bold block text-indigo-500">Kalkulasi Otomatis</span>
                    Seluruh entri yang diekspor memuat metric hitung Z-scores BB/U, TB/U (Stunting), dan BB/TB beserta klasifikasi pertumbuhan riil.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-teal-500/10 bg-teal-500/5 text-teal-600 dark:text-teal-300 text-xs font-semibold leading-normal flex gap-2">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                Daftar ekspor ini kompatibel untuk diunggah langsung ke portal monitoring stunting kabupaten maupun sebagai berkas backup dinas kesehatan.
              </div>
            </div>
          </div>

        </div>
      ) : (
        // IMPORT WORKFLOW SCREEN
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* File loader container */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            
            {/* Target Select */}
            <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-200"}`}>
              <label className="block text-[10px] font-bold text-slate-500 mb-2">PILIH TARGET IMPORT STRUKTUR</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    setImportTarget("balita");
                    setFileToImport(null);
                    setImportStatus("idle");
                  }}
                  className={`py-2 px-3 border rounded-lg font-bold flex items-center justify-center gap-1.5
                    ${importTarget === "balita" 
                      ? "bg-teal-500/15 border-teal-500 text-teal-600 dark:text-teal-400" 
                      : "bg-transparent border-slate-200 text-slate-500"}`}
                >
                  Import Biodata Anak
                </button>
                <button
                  onClick={() => {
                    setImportTarget("penimbangan");
                    setFileToImport(null);
                    setImportStatus("idle");
                  }}
                  className={`py-2 px-3 border rounded-lg font-bold flex items-center justify-center gap-1.5
                    ${importTarget === "penimbangan" 
                      ? "bg-teal-500/15 border-teal-500 text-teal-600 dark:text-teal-400" 
                      : "bg-transparent border-slate-200 text-slate-500"}`}
                >
                  Import Penimbangan Bulanan
                </button>
              </div>
            </div>

            {/* Drag drop zone card */}
            <div
              id="drag-drop-zone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all min-h-[180px] cursor-pointer
                ${dragActive 
                  ? "border-teal-500 bg-teal-500/5 text-slate-900" 
                  : darkMode 
                    ? "border-slate-800 bg-slate-950/20 hover:border-slate-700" 
                    : "border-slate-350 bg-slate-50/20 hover:border-slate-400"}`}
              onClick={() => document.getElementById("file-uploader-element")?.click()}
            >
              <UploadCloud size={36} className="text-slate-400 mb-2.5 animate-bounce" />
              
              <p className="text-xs font-bold text-slate-800 dark:text-slate-105 leading-relaxed">
                Tarik-lepas (Drag & Drop) Berkas spreadsheet Anda di sini <br />
                atau <span className="text-teal-500 underline">Pilih Berkas Komputer</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">XLSX, XLS atau CSV saja</p>

              <input
                id="file-uploader-element"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
            </div>

            {/* Diagnostics error/success panel */}
            {importStatus === "parsing" && (
              <div className="text-center p-4 text-xs text-slate-400 font-bold">
                Memproses baris spreadsheet... harap tunggu sebentar...
              </div>
            )}

            {importStatus === "success" && (
              <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 space-y-3">
                <div className="flex gap-2 text-green-600 dark:text-green-400 text-xs font-extrabold items-center">
                  <CheckCircle size={18} />
                  <span>Inspeksi Berhasil! {validEntitiesToCommit.length} baris data tervalidasi siap digabungkan.</span>
                </div>
                <button
                  onClick={handleCommitImport}
                  className="w-full py-2 bg-green-500 hover:bg-green-650 font-bold text-xs text-white rounded-lg flex items-center justify-center gap-1.5"
                >
                  Confirm Merger <ArrowRight size={14} />
                </button>
              </div>
            )}

            {importStatus === "errors" && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-3.5">
                <div className="flex gap-2 text-red-550 text-xs font-black items-center">
                  <AlertTriangle size={18} />
                  <span>Kegagalan Struktur! Ditemukan {validationErrors.length} kesalahan validasi baris.</span>
                </div>
                <div className="max-h-48 overflow-y-auto pl-6 list-disc text-[11px] text-red-550 font-mono space-y-1">
                  {validationErrors.map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Templates download (Right Panel) */}
          <div className="col-span-1 space-y-4">
            <div className={`p-5 rounded-2xl border ${darkMode ? "bg-slate-950 border-slate-850" : "bg-white border-slate-205"}`}>
              <HelpCircle className="text-slate-400 mb-2" size={20} />
              <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest font-mono">Dokumentasi Template</h4>
              <h3 className="font-bold text-sm text-slate-850 dark:text-slate-105 mt-1">Harap Gunakan Template Baku</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Untuk mencegah terjadinya disrupsi struktur data NIK dan tanggal, kader WAJIB mengunduh template spreadsheet kolom standar berikut sebelum mengisi data secara lokal:
              </p>

              <div className="space-y-2 mt-4">
                <button
                  onClick={downloadTemplateAnak}
                  className={`w-full py-2 px-3 text-xs font-bold border rounded-lg flex items-center justify-between transition-colors
                    ${darkMode ? "border-slate-800 hover:bg-slate-900" : "border-slate-200 hover:bg-slate-50 text-slate-850"}`}
                >
                  <span>Template Data Anak.xlsx</span>
                  <Download size={14} className="text-slate-400" />
                </button>
                <button
                  onClick={downloadTemplatePenimbangan}
                  className={`w-full py-2 px-3 text-xs font-bold border rounded-lg flex items-center justify-between transition-colors
                    ${darkMode ? "border-slate-800 hover:bg-slate-900" : "border-slate-200 hover:bg-slate-50 text-slate-850"}`}
                >
                  <span>Template Penimbangan.xlsx</span>
                  <Download size={14} className="text-slate-400" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
