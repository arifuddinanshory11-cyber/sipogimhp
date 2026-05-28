import React, { useState, useMemo } from "react";
import { 
  Baby, 
  Search, 
  UserPlus, 
  Filter, 
  User, 
  Calendar, 
  MapPin, 
  Scale, 
  Ruler, 
  Edit, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  FileCheck2,
  X,
  History,
  TrendingUp,
  Printer,
  Heart
} from "lucide-react";
import { DataAnak, Penimbangan, Desa, Posyandu, UserSession, Gender, UserLog } from "../types";
import { calculateAgeInMonths, getZScoreBBU, getZScoreTBU, getZScoreBBTB, bbuReference } from "../utils/zscore";

interface DataBalitaProps {
  anakList: DataAnak[];
  penimbanganList: Penimbangan[];
  desaList: Desa[];
  posyanduList: Posyandu[];
  session: UserSession | null;
  darkMode: boolean;
  onAddAnak: (anak: DataAnak) => void;
  onEditAnak: (anak: DataAnak) => void;
  onDeleteAnak: (id: string) => void;
  quickSearch: string;
}

// Helper to evaluate PMT Recommendation based on clinical conditions
export const getPMTRecommendation = (
  child: DataAnak,
  allLogs: Penimbangan[]
) => {
  const childLogs = allLogs
    .filter(w => w.id_anak === child.id_anak)
    .sort((a, b) => new Date(b.tanggal_penimbangan).getTime() - new Date(a.tanggal_penimbangan).getTime());
  
  if (childLogs.length === 0) {
    return {
      eligible: false,
      reasons: [] as string[],
      recText: ""
    };
  }

  const latest = childLogs[0];
  const reasons: string[] = [];

  // 1. Status Gizi BB/TB Kurang atau Buruk
  const bbtbStatus = latest.status_gizi_bbtb || getZScoreBBTB(child.jenis_kelamin, latest.tinggi_badan, latest.berat_badan).status;
  if (bbtbStatus === "Gizi Kurang" || bbtbStatus === "Gizi Buruk / Outlier") {
    reasons.push(`Status Gizi BB/TB: ${bbtbStatus === "Gizi Buruk / Outlier" ? "Gizi Buruk" : bbtbStatus}`);
  }

  // 2. Status Gizi BB/U Kurang atau Sangat Kurang
  const bbuStatus = latest.status_gizi;
  if (bbuStatus === "Kurang" || bbuStatus === "Sangat Kurang") {
    reasons.push(`Status Gizi BB/U: ${bbuStatus}`);
  }

  // 3. BB tidak naik dari bulan sebelumnya (code is T)
  const growth = getWeightGrowthStatus(latest, allLogs, child.berat_lahir?.toString());
  if (growth.code === "T") {
    reasons.push(`Berat Badan Tidak Naik (T) dari bulan sebelumnya (${growth.diff})`);
  }

  return {
    eligible: reasons.length > 0,
    reasons,
    recText: "Direkomendasikan mendapat PMT (Pemberian Makanan Tambahan) pemulihan dan edukasi nutrisi intensif."
  };
};

// Helper to calculate N/T weight growth indicator
export const getWeightGrowthStatus = (
  targetLog: Penimbangan, 
  allLogs: Penimbangan[], 
  childBirthWeight: string | undefined
) => {
  const childLogs = allLogs
    .filter(w => w.id_anak === targetLog.id_anak)
    .sort((a, b) => new Date(a.tanggal_penimbangan).getTime() - new Date(b.tanggal_penimbangan).getTime());
  
  const idx = childLogs.findIndex(w => w.id_penimbangan === targetLog.id_penimbangan);
  if (idx <= 0) {
    if (childBirthWeight) {
      const bl = parseFloat(childBirthWeight);
      if (!isNaN(bl)) {
        const diff = targetLog.berat_badan - bl;
        if (diff > 0) {
          return { code: "N", label: "Naik (N)", diff: `+${diff.toFixed(1)} kg`, color: "bg-emerald-500 text-white" };
        } else {
          return { code: "T", label: "Tidak Naik (T)", diff: `${diff.toFixed(1)} kg`, color: "bg-rose-500 text-white" };
        }
      }
    }
    return { code: "Baru", label: "Baru", diff: "0", color: "bg-blue-500 text-white" };
  }
  
  const prev = childLogs[idx - 1];
  const diff = targetLog.berat_badan - prev.berat_badan;
  if (diff > 0) {
    return { code: "N", label: "Naik (N)", diff: `+${diff.toFixed(1)} kg`, color: "bg-emerald-500 text-white" };
  } else {
    return { code: "T", label: "Tidak Naik (T)", diff: `${diff.toFixed(1)} kg`, color: "bg-rose-500 text-white" };
  }
};

// SVG KMS Growth Chart
export const KMSGrowthChart = ({ child, weighings, darkMode }: { child: DataAnak; weighings: Penimbangan[]; darkMode: boolean }) => {
  const isBoy = child.jenis_kelamin === "L";
  const ages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24, 30, 36, 42, 48, 54, 60];
  
  const referenceLines = useMemo(() => {
    return ages.map(age => {
      const ref = bbuReference[age];
      if (!ref) return null;
      const [median, sd] = isBoy ? ref.boys : ref.girls;
      return {
        age,
        minus3: median - 3 * sd,
        minus2: median - 2 * sd,
        median,
        plus1: median + 1 * sd,
        plus2: median + 2 * sd,
        plus3: median + 3 * sd,
      };
    }).filter(Boolean) as any[];
  }, [isBoy]);

  const width = 500;
  const height = 300;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const maxX = 60; 
  const maxY = 25; 

  const getX = (age: number) => paddingLeft + (age / maxX) * (width - paddingLeft - paddingRight);
  const getY = (weight: number) => height - paddingBottom - (weight / maxY) * (height - paddingTop - paddingBottom);

  const buildAreaPath = (bottomKey: string, topKey: string) => {
    const pointsTop = referenceLines.map(line => `${getX(line.age)},${getY(line[topKey])}`);
    const pointsBottom = referenceLines.slice().reverse().map(line => `${getX(line.age)},${getY(line[bottomKey])}`);
    return `M ${pointsTop.join(" L ")} L ${pointsBottom.join(" L ")} Z`;
  };

  const childPoints = useMemo(() => {
    return weighings
      .filter(w => w.umur_bulan <= 60)
      .sort((a, b) => a.umur_bulan - b.umur_bulan);
  }, [weighings]);

  return (
    <div className="w-full h-auto p-1 border rounded-xl bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto text-[8px] font-semibold">
        {/* Draw shaded reference bands */}
        <polygon
          points={`${paddingLeft},${height-paddingBottom} ${referenceLines.map(l => `${getX(l.age)},${getY(l.minus3)}`).join(" ")} ${width-paddingRight},${height-paddingBottom}`}
          className="fill-red-500/10 dark:fill-red-500/10"
        />
        <path d={buildAreaPath("minus3", "minus2")} className="fill-amber-500/15 dark:fill-amber-500/10" />
        <path d={buildAreaPath("minus2", "plus1")} className="fill-emerald-500/20 dark:fill-emerald-500/15" />
        <path d={buildAreaPath("plus1", "plus2")} className="fill-indigo-500/15 dark:fill-indigo-500/10" />
        <polygon
          points={`${referenceLines.map(l => `${getX(l.age)},${getY(l.plus2)}`).join(" ")} ${getX(60)},${getY(25)} ${getX(0)},${getY(25)}`}
          className="fill-purple-500/10 dark:fill-purple-500/10"
        />

        {/* Draw reference boundary lines for precision */}
        <path d={referenceLines.map((l, i) => `${i === 0 ? 'M' : 'L'} ${getX(l.age)} ${getY(l.minus3)}`).join(" ")} fill="none" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" />
        <path d={referenceLines.map((l, i) => `${i === 0 ? 'M' : 'L'} ${getX(l.age)} ${getY(l.minus2)}`).join(" ")} fill="none" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
        <path d={referenceLines.map((l, i) => `${i === 0 ? 'M' : 'L'} ${getX(l.age)} ${getY(l.median)}`).join(" ")} fill="none" stroke="#10b981" strokeWidth={1.5} />
        <path d={referenceLines.map((l, i) => `${i === 0 ? 'M' : 'L'} ${getX(l.age)} ${getY(l.plus1)}`).join(" ")} fill="none" stroke="#6366f1" strokeWidth={1} strokeDasharray="3 3" />

        {/* Grid lines & Axes */}
        <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} className="stroke-slate-350 dark:stroke-slate-750" strokeWidth={1.5} />
        <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} className="stroke-slate-350 dark:stroke-slate-750" strokeWidth={1.5} />

        {/* Grid Lines Horiz */}
        {[5, 10, 15, 20, 25].map(w => {
          const y = getY(w);
          return (
            <g key={`grid-y-${w}`} className="opacity-60">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={0.5} strokeDasharray="2 2" />
              <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fontSize={8} className="fill-slate-550 dark:fill-slate-400 font-mono font-bold">{w} kg</text>
            </g>
          );
        })}

        {/* Grid Lines Vert */}
        {[0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60].map(m => {
          const x = getX(m);
          return (
            <g key={`grid-x-${m}`} className="opacity-60">
              <line x1={x} y1={paddingTop} x2={x} y2={height - paddingBottom} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={0.5} strokeDasharray="2 2" />
              <text x={x} y={height - paddingBottom + 12} textAnchor="middle" fontSize={8} className="fill-slate-550 dark:fill-slate-400 font-mono font-bold">{m} m</text>
            </g>
          );
        })}

        {/* Legend labels */}
        <text x={paddingLeft + 10} y={paddingTop - 10} fontSize={8} className="fill-emerald-500 font-bold">&#9632; Normal (BB Ideal)</text>
        <text x={paddingLeft + 110} y={paddingTop - 10} fontSize={8} className="fill-amber-500 font-bold">&#9632; Kurang</text>
        <text x={paddingLeft + 175} y={paddingTop - 10} fontSize={8} className="fill-red-500 font-bold">&#9632; Sangat Kurang</text>
        <text x={paddingLeft + 265} y={paddingTop - 10} fontSize={8} className="fill-indigo-500 font-bold">&#9632; R. Lebih</text>

        {/* Child actual growth points connected */}
        {childPoints.length > 0 && (
          <>
            <path
              d={childPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.umur_bulan)} ${getY(pt.berat_badan)}`).join(" ")}
              fill="none"
              stroke="#06b6d4"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {childPoints.map((pt, i) => {
              const cx = getX(pt.umur_bulan);
              const cy = getY(pt.berat_badan);
              return (
                <g key={`child-node-${i}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    className="fill-cyan-500 stroke-white dark:stroke-slate-950"
                    strokeWidth={2}
                  />
                  <text
                    x={cx}
                    y={cy - 8}
                    textAnchor="middle"
                    fontSize={7}
                    fontWeight="bold"
                    className="fill-slate-800 dark:fill-slate-200 font-mono"
                  >
                    {pt.berat_badan}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
};

export default function DataBalita({
  anakList,
  penimbanganList,
  desaList,
  posyanduList,
  session,
  darkMode,
  onAddAnak,
  onEditAnak,
  onDeleteAnak,
  quickSearch
}: DataBalitaProps) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDesa, setFilterDesa] = useState("");
  const [filterPosyandu, setFilterPosyandu] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  
  // Modals & form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnak, setEditingAnak] = useState<DataAnak | null>(null);
  const [selectedChildDetail, setSelectedChildDetail] = useState<DataAnak | null>(null);
  const [activeDetailView, setActiveDetailView] = useState<"history" | "kms">("history");

  // Form Fields
  const [nikAnak, setNikAnak] = useState("");
  const [namaAnak, setNamaAnak] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState<Gender>("L");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [namaOrtu, setNamaOrtu] = useState("");
  const [nikOrtu, setNikOrtu] = useState("");
  const [alamat, setAlamat] = useState("");
  const [rtRw, setRtRw] = useState("");
  const [idDesa, setIdDesa] = useState("");
  const [idPosyandu, setIdPosyandu] = useState("");
  const [beratLahir, setBeratLahir] = useState("");
  const [tinggiLahir, setTinggiLahir] = useState("");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Determine authorized filter constraints based on Role
  const filteredAnakList = useMemo(() => {
    return anakList.filter(anak => {
      // Role enforcement:
      // ADMIN_DESA: Only children within their desa
      if (session?.role === "ADMIN_DESA" && session.id_desa !== anak.id_desa) {
        return false;
      }
      // ADMIN_POSYANDU: Only children within their posyandu
      if (session?.role === "ADMIN_POSYANDU" && session.id_posyandu !== anak.id_posyandu) {
        return false;
      }

      // Live search queries
      const query = (searchQuery || quickSearch).toLowerCase();
      const matchSearch = !query || 
        anak.nama_anak.toLowerCase().includes(query) ||
        anak.nik_anak.includes(query) ||
        anak.nama_ortu.toLowerCase().includes(query) ||
        anak.alamat.toLowerCase().includes(query);

      // Category filter selectors
      const matchDesa = !filterDesa || anak.id_desa === filterDesa;
      const matchPos = !filterPosyandu || anak.id_posyandu === filterPosyandu;
      const matchGender = !genderFilter || anak.jenis_kelamin === genderFilter;

      return matchSearch && matchDesa && matchPos && matchGender;
    });
  }, [anakList, searchQuery, quickSearch, filterDesa, filterPosyandu, genderFilter, session]);

  // Handle open form for additive action
  const openAddForm = () => {
    setEditingAnak(null);
    setNikAnak("");
    setNamaAnak("");
    setJenisKelamin("L");
    setTanggalLahir("");
    setNamaOrtu("");
    setNikOrtu("");
    setAlamat("");
    setRtRw("");
    
    // Auto set ID if user is already locked to a Posyandu or Desa
    if (session?.role === "ADMIN_POSYANDU" && session.id_posyandu) {
      const pos = posyanduList.find(p => p.id_posyandu === session.id_posyandu);
      setIdPosyandu(session.id_posyandu);
      setIdDesa(pos ? pos.id_desa : "");
    } else if (session?.role === "ADMIN_DESA" && session.id_desa) {
      setIdDesa(session.id_desa);
      setIdPosyandu("");
    } else {
      setIdDesa("");
      setIdPosyandu("");
    }
    
    setBeratLahir("");
    setTinggiLahir("");
    setFormError("");
    setFormSuccess("");
    setIsFormOpen(true);
  };

  // Handle load editing anak values
  const openEditForm = (anak: DataAnak) => {
    setEditingAnak(anak);
    setNikAnak(anak.nik_anak);
    setNamaAnak(anak.nama_anak);
    setJenisKelamin(anak.jenis_kelamin);
    setTanggalLahir(anak.tanggal_lahir);
    setNamaOrtu(anak.nama_ortu);
    setNikOrtu(anak.nik_ortu);
    setAlamat(anak.alamat);
    setRtRw(anak.rt_rw);
    setIdDesa(anak.id_desa);
    setIdPosyandu(anak.id_posyandu);
    setBeratLahir(anak.berat_lahir.toString());
    setTinggiLahir(anak.tinggi_lahir.toString());
    setFormError("");
    setFormSuccess("");
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    // Form Validations
    if (!nikAnak || nikAnak.length !== 16 || isNaN(Number(nikAnak))) {
      setFormError("NIK Anak wajib diisi berukuran 16 Digit angka.");
      return;
    }
    if (!namaAnak.trim()) {
      setFormError("Nama Anak wajib diisi.");
      return;
    }
    if (!tanggalLahir) {
      setFormError("Tanggal Lahir anak wajib ditentukan.");
      return;
    }
    if (!idDesa || !idPosyandu) {
      setFormError("Desa dan Posyandu pembina wajib dipilih.");
      return;
    }
    if (parseFloat(beratLahir) <= 0 || parseFloat(tinggiLahir) <= 0) {
      setFormError("Berat dan tinggi lahir harus diisi angka positif.");
      return;
    }

    // Check Duplicates during Creation
    if (!editingAnak) {
      const isDuplicate = anakList.some(a => a.nik_anak === nikAnak);
      if (isDuplicate) {
        setFormError(`Anak dengan NIK ${nikAnak} sudah terdaftar sebelumnya di sistem.`);
        return;
      }
    }

    const payload: DataAnak = {
      id_anak: editingAnak ? editingAnak.id_anak : `ANAK-${Date.now().toString().slice(-4)}`,
      nik_anak: nikAnak,
      nama_anak: namaAnak,
      jenis_kelamin: jenisKelamin,
      tanggal_lahir: tanggalLahir,
      nama_ortu: namaOrtu,
      nik_ortu: nikOrtu,
      alamat: alamat,
      rt_rw: rtRw,
      id_desa: idDesa,
      id_posyandu: idPosyandu,
      berat_lahir: parseFloat(beratLahir) || 0,
      tinggi_lahir: parseFloat(tinggiLahir) || 0,
      created_at: editingAnak ? editingAnak.created_at : new Date().toISOString()
    };

    if (editingAnak) {
      onEditAnak(payload);
      setFormSuccess("Data balita diperbarui dengan sukses.");
    } else {
      onAddAnak(payload);
      setFormSuccess("Data balita baru berhasil ditambahkan.");
    }

    setTimeout(() => {
      setIsFormOpen(false);
      setEditingAnak(null);
    }, 1200);
  };

  // Safe delete with validation
  const handleDeleteCheck = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data balita ${name}? Menghapus biodata ini juga akan merusak entri riwayat berat badan bulanan terkait.`)) {
      onDeleteAnak(id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Layout */}
      <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-200"} flex flex-col md:flex-row gap-4 items-center justify-between`}>
        
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            id="input-balita-filter-search"
            type="text"
            placeholder="Cari NIK, Nama Anak, Wali..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-xs font-semibold pl-9 pr-4 py-2 border rounded-lg focus:outline-none transition-colors
              ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-250 text-slate-800"}`}
          />
        </div>

        {/* Option selectors */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          
          {/* Desa Filter Selector (visible to Super Admins & Desa Admins can view own) */}
          {session?.role === "SUPER_ADMIN" && (
            <select
              id="select-filter-desa"
              value={filterDesa}
              onChange={(e) => {
                setFilterDesa(e.target.value);
                setFilterPosyandu(""); // reset posyandu because of relationship
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none
                ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-700"}`}
            >
              <option value="">Semua Desa</option>
              {desaList.map(d => (
                <option key={d.id_desa} value={d.id_desa}>{d.nama_desa}</option>
              ))}
            </select>
          )}

          {/* Posyandu Filter Selector */}
          {(session?.role === "SUPER_ADMIN" || session?.role === "ADMIN_DESA") && (
            <select
              id="select-filter-posyandu"
              value={filterPosyandu}
              onChange={(e) => setFilterPosyandu(e.target.value)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none
                ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-700"}`}
            >
              <option value="">Semua Posyandu</option>
              {posyanduList
                .filter(p => !filterDesa || p.id_desa === filterDesa)
                .filter(p => session.role !== "ADMIN_DESA" || p.id_desa === session.id_desa)
                .map(pos => (
                  <option key={pos.id_posyandu} value={pos.id_posyandu}>{pos.nama_posyandu}</option>
                ))}
            </select>
          )}

          {/* Gender Filter Selector */}
          <select
            id="select-filter-gender"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none
              ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-700"}`}
          >
            <option value="">Semua Jenis Kelamin</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>

          {/* Register Anak Button */}
          {session?.role !== "ADMIN_DESA" && (
            <button
              id="btn-registrasi-anak"
              onClick={openAddForm}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-teal-500 text-white hover:bg-teal-600 shadow-sm shadow-teal-500/10 transition-transform active:scale-95"
            >
              <UserPlus size={14} /> Daftar Anak Baru
            </button>
          )}
        </div>
      </div>

      {/* Grid: Index & List + Historical detail panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Child Cards Index (Left panel / col) */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold font-mono text-slate-400">Menampilkan {filteredAnakList.length} Balita</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAnakList.map((anak) => {
              const desa = desaList.find(d => d.id_desa === anak.id_desa);
              const posyandu = posyanduList.find(p => p.id_posyandu === anak.id_posyandu);
              
              // Find child's latest weighing
              const childWeights = penimbanganList
                .filter(w => w.id_anak === anak.id_anak)
                .sort((a, b) => new Date(b.tanggal_penimbangan).getTime() - new Date(a.tanggal_penimbangan).getTime());
              const latest = childWeights[0];

              const ageInMonths = latest ? latest.umur_bulan : calculateAgeInMonths(anak.tanggal_lahir, "2026-05-27");

              return (
                <div 
                  key={anak.id_anak}
                  id={`anak-card-${anak.id_anak}`}
                  onClick={() => setSelectedChildDetail(anak)}
                  className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:shadow-md hover:border-teal-500/50 relative group
                    ${selectedChildDetail?.id_anak === anak.id_anak 
                      ? "border-teal-500 bg-teal-500/5 ring-1 ring-teal-500" 
                      : darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-205"}`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold select-none
                          ${anak.jenis_kelamin === "L" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"}`}>
                          {anak.jenis_kelamin}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-50 line-clamp-1 group-hover:text-teal-600 transition-colors">
                            {anak.nama_anak}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {anak.id_anak} • NIK: {anak.nik_anak}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle details */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                      <div>
                         Wali: <span className="font-semibold text-slate-700 dark:text-slate-300">{anak.nama_ortu.split("/")[0]}</span>
                      </div>
                      <div>
                        Umur: <span className="font-semibold font-mono text-slate-800 dark:text-slate-250">{ageInMonths} Bulan</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <MapPin size={10} /> 
                        <span className="truncate">{posyandu?.nama_posyandu} - {desa?.nama_desa}</span>
                      </div>
                    </div>

                    {/* Indicators if they exist */}
                    {latest && (() => {
                      const computedBBTB = latest.status_gizi_bbtb || getZScoreBBTB(anak.jenis_kelamin, latest.tinggi_badan, latest.berat_badan).status;
                      return (
                        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-900 flex flex-wrap gap-1.5 items-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            latest.status_gizi === "Berat Badan Normal" 
                              ? "bg-green-500/10 text-green-600" 
                              : latest.status_gizi === "Risiko Gizi Lebih"
                                ? "bg-indigo-500/10 text-indigo-600"
                                : latest.status_gizi === "Kurang"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-red-500/10 text-red-650"
                          }`}>
                            BB/U: {latest.status_gizi}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            computedBBTB === "Normal" 
                              ? "bg-green-500/10 text-green-600 border border-green-500/10" 
                              : computedBBTB === "Risiko Gizi Lebih"
                                ? "bg-indigo-500/10 text-indigo-600"
                                : computedBBTB === "Gizi Lebih"
                                  ? "bg-teal-500/10 text-teal-600"
                                  : computedBBTB === "Obesitas"
                                    ? "bg-purple-500/10 text-purple-600"
                                    : computedBBTB === "Gizi Kurang"
                                      ? "bg-amber-500/10 text-amber-600"
                                      : "bg-red-500/10 text-red-650"
                          }`}>
                            BB/TB: {computedBBTB}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            ["Normal", "Tinggi"].includes(latest.status_stunting) 
                              ? "bg-green-500/10 text-green-600 border border-green-500/10" 
                              : latest.status_stunting === "Pendek"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-red-500/10 text-red-650"
                          }`}>
                            TB/U: {latest.status_stunting}
                          </span>
                          
                          {(() => {
                            const pmt = getPMTRecommendation(anak, penimbanganList);
                            if (pmt.eligible) {
                              return (
                                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/15 flex items-center gap-1">
                                  <Heart className="fill-rose-500 text-rose-500" size={10} /> PMT
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Operational actions */}
                  <div className="mt-4 flex gap-1.5 justify-end">
                    <button
                      title="Lihat Detail Perkembangan"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChildDetail(anak);
                      }}
                      className={`p-1 rounded border hover:text-teal-600 hover:bg-teal-500/10 ${darkMode ? "border-slate-800" : "border-slate-205"}`}
                    >
                      <Eye size={12} />
                    </button>
                    
                    {session?.role !== "ADMIN_DESA" && (
                      <>
                        <button
                          id={`btn-edit-anak-${anak.id_anak}`}
                          title="Edit Biodata"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(anak);
                          }}
                          className={`p-1 rounded border hover:text-amber-500 hover:bg-amber-500/10 ${darkMode ? "border-slate-800" : "border-slate-205"}`}
                        >
                          <Edit size={12} />
                        </button>
                        
                        {session?.role === "SUPER_ADMIN" && (
                          <button
                            id={`btn-delete-anak-${anak.id_anak}`}
                            title="Hapus Data Anak"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCheck(anak.id_anak, anak.nama_anak);
                            }}
                            className="p-1 rounded border border-red-500/20 text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredAnakList.length === 0 && (
              <div className="col-span-2 text-center p-8 bg-slate-500/5 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 italic">
                Tidak ada data balita yang cocok dengan filter atau di bawah kewenangan Anda.
              </div>
            )}
          </div>
        </div>

        {/* Detailed Medical Growth History Panel (Right col) */}
        <div className="xl:col-span-1">
          {selectedChildDetail ? (
            <div className={`p-5 rounded-2xl border sticky top-24 ${darkMode ? "bg-slate-950 border-slate-850" : "bg-white border-slate-200"}`}>
                           {/* Header profile of child */}
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-light dark:border-slate-900 print:hidden">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm
                    ${selectedChildDetail.jenis_kelamin === "L" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"}`}>
                    {selectedChildDetail.jenis_kelamin}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-50 leading-tight">
                      {selectedChildDetail.nama_anak}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400">NIK: {selectedChildDetail.nik_anak}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => window.print()}
                    title="Cetak KMS Balita ke PDF"
                    className="p-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold flex items-center gap-1 transition-all active:scale-95"
                  >
                    <Printer size={11} /> Cetak KMS
                  </button>
                  <button
                    onClick={() => setSelectedChildDetail(null)}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* General details list */}
              <div className="space-y-2.5 text-xs print:hidden">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Tanggal Lahir:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedChildDetail.tanggal_lahir}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Lahir (BB / TB):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-230">
                    {selectedChildDetail.berat_lahir} kg / {selectedChildDetail.tinggi_lahir} cm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Wali / NIK:</span>
                  <span className="text-right text-slate-800 dark:text-slate-230 font-semibold line-clamp-1">
                    {selectedChildDetail.nama_ortu}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium font-mono">Alamat:</span>
                  <span className="text-slate-800 dark:text-slate-230 font-medium text-right line-clamp-2 w-48">
                    {selectedChildDetail.alamat} (RT/RW {selectedChildDetail.rt_rw})
                  </span>
                </div>
              </div>

              {/* PMT Detailed Recommendation Card */}
              {(() => {
                const pmt = getPMTRecommendation(selectedChildDetail, penimbanganList);
                if (pmt.eligible) {
                  return (
                    <div className="mt-4 p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 dark:border-rose-950/40 dark:bg-rose-950/20 text-xs animate-fadeIn print:hidden">
                      <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-450 uppercase tracking-wider text-[10px]">
                        <Heart className="fill-rose-500 text-rose-500" size={12} /> Rekomendasi PMT Aktif
                      </div>
                      <p className="mt-1.5 font-extrabold text-slate-800 dark:text-slate-100">
                        {pmt.recText}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-rose-100 dark:border-rose-950/20">
                        <p className="font-black text-slate-400 uppercase tracking-widest text-[8px] mb-1">
                          Pemicu Layanan PMT:
                        </p>
                        <ul className="space-y-1 text-[10.5px] text-slate-600 dark:text-slate-400 font-semibold">
                          {pmt.reasons.map((reason, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Tab Switcher: Histori vs Kurva KMS */}
              <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 my-3 text-[10px] font-bold print:hidden">
                <button
                  type="button"
                  onClick={() => setActiveDetailView("history")}
                  className={`flex-1 py-1 rounded-md text-center transition-all ${activeDetailView === "history" ? "bg-white dark:bg-slate-850 text-teal-600 dark:text-teal-400 shadow-sm" : "text-slate-450 hover:text-slate-200"}`}
                >
                  Histori Timbang
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailView("kms")}
                  className={`flex-1 py-1 rounded-md text-center transition-all ${activeDetailView === "kms" ? "bg-white dark:bg-slate-850 text-teal-600 dark:text-teal-400 shadow-sm" : "text-slate-450 hover:text-slate-200"}`}
                >
                  Kurva KMS Kemenkes
                </button>
              </div>

              {/* History or KMS Curve Container */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-900 print:hidden">
                {activeDetailView === "kms" ? (
                  <div className="space-y-3 animate-fadeIn">
                    <h4 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                      <TrendingUp size={12} /> Kurva Pertumbuhan Berat (KMS)
                    </h4>
                    <KMSGrowthChart child={selectedChildDetail} weighings={penimbanganList.filter(w => w.id_anak === selectedChildDetail.id_anak)} darkMode={darkMode} />
                    <p className="text-[10px] text-slate-450 leading-relaxed text-center font-semibold italic">
                      Grafik merujuk langsung standar deviasi berat badan menurut umur (Z-Score BB/U) Direktorat Gizi Kemenkes RI.
                    </p>
                  </div>
                ) : (
                  <div className="animate-fadeIn">
                    <h4 className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-1.5">
                      <History size={12} /> Kartu Catatan Timbang (KMS)
                    </h4>

                    <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 space-y-4 max-h-72 overflow-y-auto pr-1">
                      {penimbanganList
                        .filter(w => w.id_anak === selectedChildDetail.id_anak)
                        .sort((a, b) => new Date(b.tanggal_penimbangan).getTime() - new Date(a.tanggal_penimbangan).getTime())
                        .map((item, idx) => {
                          const growthStatus = getWeightGrowthStatus(item, penimbanganList, selectedChildDetail.berat_lahir);
                          return (
                            <div key={item.id_penimbangan} className="relative text-xs">
                              {/* Dot indicator */}
                              <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-950
                                ${growthStatus.code === "N" ? "bg-emerald-500" : growthStatus.code === "T" ? "bg-rose-500" : "bg-blue-500"}`} />
                              
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] flex items-center gap-1.5 flex-wrap">
                                  {item.umur_bulan} bln • {item.berat_badan} kg / {item.tinggi_badan} cm
                                  <span className={`px-1 py-0.2 rounded text-[8px] font-mono font-bold leading-none ${
                                    growthStatus.code === "N" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : growthStatus.code === "T" ? "bg-rose-500/20 text-rose-600 dark:text-rose-450" : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                  }`}>
                                    {growthStatus.code === "N" ? `N (${growthStatus.diff})` : growthStatus.code === "T" ? `T (${growthStatus.diff})` : "Baru"}
                                  </span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium font-mono">
                                  {item.tanggal_penimbangan}
                                </span>
                              </div>

                              {/* Status badges */}
                              {(() => {
                                const itemBBTB = item.status_gizi_bbtb || getZScoreBBTB(selectedChildDetail.jenis_kelamin, item.tinggi_badan, item.berat_badan).status;
                                return (
                                  <div className="flex flex-wrap gap-1 mt-1 font-bold text-[8.5px] scale-95 origin-left">
                                    <span className={`px-1.5 py-0.2 rounded border ${
                                      item.status_gizi === "Berat Badan Normal" 
                                        ? "bg-green-500/10 text-green-600 border-green-500/20" 
                                        : item.status_gizi === "Risiko Gizi Lebih"
                                          ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                          : item.status_gizi === "Kurang"
                                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                            : "bg-red-500/10 text-red-650 border-red-500/20"
                                    }`}>
                                      BB/U: {item.status_gizi}
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded border ${
                                      itemBBTB === "Normal" 
                                        ? "bg-green-500/10 text-green-600 border-green-500/20" 
                                        : itemBBTB === "Risiko Gizi Lebih"
                                          ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                          : itemBBTB === "Gizi Lebih"
                                            ? "bg-teal-500/10 text-teal-600 border-teal-500/20"
                                            : itemBBTB === "Obesitas"
                                              ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                              : itemBBTB === "Gizi Kurang"
                                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                : "bg-red-500/10 text-red-650 border-red-500/20"
                                    }`}>
                                      BB/TB: {itemBBTB}
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded border ${
                                      ["Normal", "Tinggi"].includes(item.status_stunting) 
                                        ? "bg-green-500/10 text-green-600 border-green-500/20" 
                                        : item.status_stunting === "Pendek"
                                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                          : "bg-red-500/10 text-red-650 border-red-500/20"
                                    }`}>
                                      TB/U: {item.status_stunting}
                                    </span>
                                  </div>
                                );
                              })()}

                              {item.catatan && (
                                <p className="text-[10px] text-slate-400 italic font-mono mt-1 leading-snug">
                                  "{item.catatan}"
                                </p>
                              )}
                              <span className="text-[8px] text-slate-400 font-mono">
                                Kader: {item.petugas_input}
                              </span>
                            </div>
                          );
                        })}

                      {penimbanganList.filter(w => w.id_anak === selectedChildDetail.id_anak).length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">
                          Belum memiliki riwayat penimbangan bulanan. Silakan isi lewat menu Penimbangan.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className={`p-8 rounded-2xl border text-center text-slate-400 border-dashed border-slate-200 dark:border-slate-850 sticky top-24 ${darkMode ? "bg-slate-950/20" : "bg-slate-50/20"}`}>
              <Baby size={32} className="mx-auto text-slate-300 dark:text-slate-805 mb-2.5 animate-pulse" />
              <p className="text-xs font-semibold leading-relaxed">
                Pilih atau klik salah satu data balita di sebelah kiri untuk meninjau secara mendalam Buku KMS elektronik, kurva pertumbuhan, dan catatan kader posyandu.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* modal Registry/Edit Form */}
      {isFormOpen && (
        <div id="modal-balita-form" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl shadow-xl border overflow-hidden my-8
            ${darkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-800"}`}>
            
            {/* Header */}
            <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-50/80 border-slate-200"}`}>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Baby size={18} className="text-teal-500" />
                {editingAnak ? "Perbarui Biodata Balita" : "Registrasi Data Balita Baru"}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error notifications */}
            {formError && (
              <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold flex gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mx-6 mt-4 p-3 bg-green-500/10 border border-green-500/25 text-green-500 rounded-lg text-xs font-semibold flex gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              
              {/* Row 1: NIK and Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NIK BALITA (16 Digit)*</label>
                  <input
                    id="input-form-nikAnak"
                    type="text"
                    maxLength={16}
                    disabled={!!editingAnak}
                    value={nikAnak}
                    onChange={(e) => setNikAnak(e.target.value.replace(/\D/g, ''))}
                    placeholder="3201xxxxxxxxxxxx"
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100 disabled:bg-slate-950 disabled:text-slate-600" : "bg-white border-slate-250 text-slate-850 disabled:bg-slate-100"}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NAMA LENGKAP ANAK*</label>
                  <input
                    id="input-form-namaAnak"
                    type="text"
                    value={namaAnak}
                    onChange={(e) => setNamaAnak(e.target.value)}
                    placeholder="E.g. Muhammad Al Fatih"
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  />
                </div>
              </div>

              {/* Row 2: Gender & Date of Birth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">JENIS KELAMIN*</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      id="btn-form-gender-l"
                      type="button"
                      onClick={() => setJenisKelamin("L")}
                      className={`py-2 px-3 border rounded-lg font-bold flex items-center justify-center gap-1.5
                        ${jenisKelamin === "L" 
                          ? "bg-blue-500/15 border-blue-500 text-blue-650" 
                          : darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-250 text-slate-500"}`}
                    >
                      Laki-Laki (L)
                    </button>
                    <button
                      id="btn-form-gender-p"
                      type="button"
                      onClick={() => setJenisKelamin("P")}
                      className={`py-2 px-3 border rounded-lg font-bold flex items-center justify-center gap-1.5
                        ${jenisKelamin === "P" 
                          ? "bg-pink-500/15 border-pink-500 text-pink-650" 
                          : darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-250 text-slate-500"}`}
                    >
                      Perempuan (P)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">TANGGAL LAHIR (YYYY-MM-DD)*</label>
                  <input
                    id="input-form-tanggalLahir"
                    type="date"
                    value={tanggalLahir}
                    onChange={(e) => setTanggalLahir(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  />
                </div>
              </div>

              {/* Row 3: Parents Biodata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NAMA ORANG TUA / WALI*</label>
                  <input
                    id="input-form-namaOrtu"
                    type="text"
                    value={namaOrtu}
                    onChange={(e) => setNamaOrtu(e.target.value)}
                    placeholder="E.g. Siti Aminah / Bambang"
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NIK ORANG TUA WALI (16 Digit)</label>
                  <input
                    id="input-form-nikOrtu"
                    type="text"
                    maxLength={16}
                    value={nikOrtu}
                    onChange={(e) => setNikOrtu(e.target.value.replace(/\D/g, ''))}
                    placeholder="3201xxxxxxxxxxxx"
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  />
                </div>
              </div>

              {/* Row 4: Birth weights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">ALAMAT JALAN & RT/RW*</label>
                  <div className="flex gap-2">
                    <input
                      id="input-form-alamat"
                      type="text"
                      placeholder="Kp. Baru No. 12"
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                        ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-810"}`}
                    />
                    <input
                      id="input-form-rtRw"
                      type="text"
                      placeholder="02/04"
                      value={rtRw}
                      onChange={(e) => setRtRw(e.target.value)}
                      className={`w-20 px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500 text-center
                        ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-810"}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">BERAT LAHIR (kg)*</label>
                  <input
                    id="input-form-beratLahir"
                    type="number"
                    step="0.01"
                    placeholder="E.g. 3.2"
                    value={beratLahir}
                    onChange={(e) => setBeratLahir(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-810"}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">TINGGI LAHIR (cm)*</label>
                  <input
                    id="input-form-tinggiLahir"
                    type="number"
                    step="0.1"
                    placeholder="E.g. 49.5"
                    value={tinggiLahir}
                    onChange={(e) => setTinggiLahir(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-810"}`}
                  />
                </div>
              </div>

              {/* Row 5: Admin Level selectors Desa & Posyandu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">DESA BINAAN*</label>
                  <select
                    id="select-form-idDesa"
                    disabled={session?.role === "ADMIN_DESA" || session?.role === "ADMIN_POSYANDU"}
                    value={idDesa}
                    onChange={(e) => {
                      setIdDesa(e.target.value);
                      setIdPosyandu(""); // reset posyandu because of relationship
                    }}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  >
                    <option value="">-- Pilih Desa --</option>
                    {desaList.map(d => (
                      <option key={d.id_desa} value={d.id_desa}>{d.nama_desa}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">DIASUH OLEH POSYANDU*</label>
                  <select
                    id="select-form-idPosyandu"
                    disabled={session?.role === "ADMIN_POSYANDU"}
                    value={idPosyandu}
                    onChange={(e) => {
                      setIdPosyandu(e.target.value);
                      const selectedP = posyanduList.find(p => p.id_posyandu === e.target.value);
                      if (selectedP) {
                        setIdDesa(selectedP.id_desa);
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  >
                    <option value="">-- Pilih Posyandu Pembina --</option>
                    {posyanduList
                      .filter(p => !idDesa || p.id_desa === idDesa)
                      .map(pos => (
                        <option key={pos.id_posyandu} value={pos.id_posyandu}>{pos.nama_posyandu}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors
                    ${darkMode ? "border-slate-800 text-slate-400 hover:bg-slate-900" : "border-slate-250 text-slate-550 hover:bg-slate-100"}`}
                >
                  Batal
                </button>
                <button
                  id="btn-form-submit"
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-extrabold text-white bg-teal-500 hover:bg-teal-600 transition-colors active:scale-95 shadow-md shadow-teal-500/10"
                >
                  {editingAnak ? "Simpan Perubahan" : "Simpan Pendaftaran"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE KMS INDIVIDUAL CARD */}
      {selectedChildDetail && (
        <div className="hidden print:block text-black p-8 font-sans bg-white min-h-screen" style={{ color: "black", backgroundColor: "white" }}>
          {/* Letterhead Header */}
          <div className="text-center space-y-1 mb-6 pb-4 border-b-2 border-double border-slate-900">
            <h2 className="font-extrabold text-sm uppercase tracking-wider">SIPGI - Sistem Informasi Kesehatan Posyandu</h2>
            <h1 className="font-black text-xs md:text-sm uppercase leading-tight">
              DINAS KESEHATAN, PENGENDALIAN PENDUDUK DAN KELUARGA BERENCANA KABUPATEN SEKADAU
            </h1>
            <p className="text-xs font-bold uppercase">UPTD Puskesmas Nanga Mahap</p>
            <p className="text-[10px] font-mono text-slate-500">
              Jalan Riam Engayak Nomor 1 Nanga Mahap, Kode Pos 79585
            </p>
          </div>

          {/* Document Title */}
          <div className="text-center mb-6">
            <h2 className="text-xs md:text-sm font-black uppercase tracking-wider underline">KARTU MENUJU SEHAT (KMS) ELEKTRONIK BALITA</h2>
            <p className="text-[10px] font-mono text-slate-500">
              ID Balita: {selectedChildDetail.id_anak} &bull; NIK: {selectedChildDetail.nik_anak}
            </p>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6 border p-4 rounded-xl">
            <div>
              <p className="mb-1"><span className="font-bold">Nama Balita:</span> {selectedChildDetail.nama_anak}</p>
              <p className="mb-1"><span className="font-bold">Jenis Kelamin:</span> {selectedChildDetail.jenis_kelamin === "L" ? "Laki-laki (L)" : "Perempuan (P)"}</p>
              <p className="mb-1"><span className="font-bold">Tanggal Lahir:</span> {selectedChildDetail.tanggal_lahir}</p>
              <p className="mb-1"><span className="font-bold">Lahir (BB / TB):</span> {selectedChildDetail.berat_lahir} kg / {selectedChildDetail.tinggi_lahir} cm</p>
            </div>
            <div>
              <p className="mb-1"><span className="font-bold">Orang Tua / Wali:</span> {selectedChildDetail.nama_ortu}</p>
              <p className="mb-1"><span className="font-bold">NIK Orang Tua:</span> {selectedChildDetail.nik_ortu}</p>
              <p className="mb-1"><span className="font-bold">Alamat Rumah:</span> {selectedChildDetail.alamat} (RT/RW {selectedChildDetail.rt_rw})</p>
              <p className="mb-1">
                <span className="font-bold">Desa / Posyandu:</span> {
                  desaList.find(d => d.id_desa === selectedChildDetail.id_desa)?.nama_desa || "-"
                } / {
                  posyanduList.find(p => p.id_posyandu === selectedChildDetail.id_posyandu)?.nama_posyandu || "-"
                }
              </p>
            </div>
          </div>

          {/* Printable PMT Recommendation alert if eligible */}
          {(() => {
            const pmt = getPMTRecommendation(selectedChildDetail, penimbanganList);
            if (pmt.eligible) {
              return (
                <div className="mb-6 p-4 border-2 border-red-500 bg-red-50/20 text-xs rounded-xl" style={{ border: "2px solid #ef4444" }}>
                  <div className="flex items-center gap-1.5 font-extrabold text-red-600 uppercase tracking-wider text-[11px] mb-1">
                    <Heart size={12} className="fill-red-600 text-red-600" /> STATUS REKOMENDASI PMT: YA (LAYAK PMT)
                  </div>
                  <p className="font-bold text-slate-900">
                    Anak ini secara klinis memenuhi kriteria untuk mendapatkan Pemberian Makanan Tambahan (PMT) pemulihan dan edukasi gizi.
                  </p>
                  <p className="font-semibold text-slate-800 mt-1">
                    <span className="font-bold underline">Kondisi Pemicu:</span> {pmt.reasons.join(", ")}
                  </p>
                </div>
              );
            }
            return (
              <div className="mb-6 p-4 border border-slate-300 text-xs rounded-xl bg-slate-50">
                <div className="font-extrabold text-slate-600 uppercase tracking-wider text-[11px] mb-1">
                  STATUS REKOMENDASI PMT: TIDAK (NORMAL)
                </div>
                <p className="text-slate-600">
                  Perkembangan berat badan dan status gizi balita terpantau normal atau membaik dari bulan sebelumnya.
                </p>
              </div>
            );
          })()}

          {/* KMS Growth Curve Chart */}
          <div className="mb-6 p-4 border rounded-xl flex flex-col items-center bg-white">
            <h3 className="text-[11px] font-extrabold uppercase mb-2 text-center text-slate-800">
              Kurva Pertumbuhan Berat Badan menurut Umur (KMS Standard Kemenkes)
            </h3>
            <div className="w-full max-w-xl">
              <KMSGrowthChart child={selectedChildDetail} weighings={penimbanganList.filter(w => w.id_anak === selectedChildDetail.id_anak)} darkMode={false} />
            </div>
          </div>

          {/* Weight Log Table */}
          <div className="mb-8">
            <h3 className="text-xs font-extrabold uppercase mb-2 text-indigo-900 border-b pb-1">
              Riwayat Pencatatan Timbang dan Penulisan Klinis
            </h3>
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 font-bold">
                  <th className="p-2 border">Bulan Ke-</th>
                  <th className="p-2 border">Tanggal Timbang</th>
                  <th className="p-2 border text-center">Berat (kg)</th>
                  <th className="p-2 border text-center">Tinggi (cm)</th>
                  <th className="p-2 border text-center">Weight Gain (N/T)</th>
                  <th className="p-2 border font-semibold">Kategori BB/U</th>
                  <th className="p-2 border font-semibold">Kategori BB/TB</th>
                  <th className="p-2 border">Kader Pemeriksa</th>
                </tr>
              </thead>
              <tbody className="divide-y border">
                {penimbanganList
                  .filter(w => w.id_anak === selectedChildDetail.id_anak)
                  .sort((a, b) => a.umur_bulan - b.umur_bulan)
                  .map((item) => {
                    const growth = getWeightGrowthStatus(item, penimbanganList, selectedChildDetail.berat_lahir);
                    const itemBBTB = item.status_gizi_bbtb || getZScoreBBTB(selectedChildDetail.jenis_kelamin, item.tinggi_badan, item.berat_badan).status;
                    return (
                      <tr key={item.id_penimbangan} className="hover:bg-slate-50">
                        <td className="p-2 border font-bold text-center">{item.umur_bulan} bln</td>
                        <td className="p-2 border font-mono">{item.tanggal_penimbangan}</td>
                        <td className="p-2 border text-center font-bold">{item.berat_badan} kg</td>
                        <td className="p-2 border text-center font-bold">{item.tinggi_badan} cm</td>
                        <td className="p-2 border text-center font-semibold">
                          {growth.code === "N" ? `Naik (N) [${growth.diff}]` : growth.code === "T" ? `Tidak Naik (T) [${growth.diff}]` : "Baru (1st)"}
                        </td>
                        <td className="p-2 border">{item.status_gizi}</td>
                        <td className="p-2 border">{itemBBTB}</td>
                        <td className="p-2 border">{item.petugas_input}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="mt-12 flex justify-between text-xs font-bold leading-relaxed">
            <div className="w-52 text-center text-slate-500 font-mono text-[9px]">
              E-KMS SIPGI &bull; UPTD Puskesmas Nanga Mahap<br />
              Dokumen Sah secara Digital &amp; Terverifikasi<br />
              *Dicetak pada {new Date().toLocaleString("id-ID")}*
            </div>
            <div className="w-56 text-center leading-relaxed text-black">
              Nanga Mahap, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} <br />
              Mengetahui Kepala UPTD Puskesmas, <br />
              <br />
              <br />
              <br />
              <span className="underline font-bold text-black font-sans">dr. Arifuddin Anshory</span><br />
              NIP. 19891212 201502 1 002
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
