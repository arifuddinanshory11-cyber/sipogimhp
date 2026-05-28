import React, { useState, useMemo } from "react";
import { 
  Users, 
  Building2, 
  Map, 
  Activity, 
  TrendingUp, 
  ChevronRight, 
  ArrowUpRight,
  TrendingDown,
  Info
} from "lucide-react";
import { DataAnak, Penimbangan, Desa, Posyandu, Gender } from "../types";
import { getZScoreBBTB } from "../utils/zscore";

interface DashboardProps {
  anakList: DataAnak[];
  penimbanganList: Penimbangan[];
  desaList: Desa[];
  posyanduList: Posyandu[];
  darkMode: boolean;
  setTab: (tab: string) => void;
  quickSearch: string;
}

export default function Dashboard({
  anakList,
  penimbanganList,
  desaList,
  posyanduList,
  darkMode,
  setTab,
  quickSearch
}: DashboardProps) {
  const [metricMode, setMetricMode] = useState<"BBU" | "BBTB">("BBU");
  
  // Aggregate latest penimbangan for each child
  const latestWeighings = useMemo(() => {
    const map: { [id_anak: string]: Penimbangan } = {};
    // Sort ascending by date so latest overwrites
    const sorted = [...penimbanganList].sort(
      (a, b) => new Date(a.tanggal_penimbangan).getTime() - new Date(b.tanggal_penimbangan).getTime()
    );
    sorted.forEach(w => {
      map[w.id_anak] = w;
    });
    return map;
  }, [penimbanganList]);

  // General counts 
  const totalAnak = anakList.length;
  const totalDesa = desaList.length;
  const totalPosyandu = posyanduList.length;

  // Nutritional & Stunting segmentation based on latest weighings
  const stats = useMemo(() => {
    let stuntingSangatPendek = 0;
    let stuntingPendek = 0;
    let stuntingNormal = 0;
    let stuntingTinggi = 0;

    let bbuSangatKurang = 0;
    let bbuKurang = 0;
    let bbuNormal = 0;
    let bbuRisikoLebih = 0;

    let bbtbGiziBurukOutlier = 0;
    let bbtbGiziKurang = 0;
    let bbtbNormal = 0;
    let bbtbRisikoLebih = 0;
    let bbtbGiziLebih = 0;
    let bbtbObesitas = 0;

    let totalLaki = 0;
    let totalPerempuan = 0;

    anakList.forEach(anak => {
      if (anak.jenis_kelamin === "L") totalLaki++;
      else totalPerempuan++;

      const latest = latestWeighings[anak.id_anak];
      if (latest) {
        // Stunting status count
        if (latest.status_stunting === "Sangat Pendek") stuntingSangatPendek++;
        else if (latest.status_stunting === "Pendek") stuntingPendek++;
        else if (latest.status_stunting === "Normal") stuntingNormal++;
        else if (latest.status_stunting === "Tinggi") stuntingTinggi++;

        // Nutrition status count (BB/U)
        if (latest.status_gizi === "Sangat Kurang") bbuSangatKurang++;
        else if (latest.status_gizi === "Kurang") bbuKurang++;
        else if (latest.status_gizi === "Berat Badan Normal") bbuNormal++;
        else if (latest.status_gizi === "Risiko Gizi Lebih") bbuRisikoLebih++;

        // Nutrition status count (BB/TB)
        const bbtbStatus = latest.status_gizi_bbtb || getZScoreBBTB(anak.jenis_kelamin, latest.tinggi_badan, latest.berat_badan).status;
        if (bbtbStatus === "Gizi Buruk / Outlier") bbtbGiziBurukOutlier++;
        else if (bbtbStatus === "Gizi Kurang") bbtbGiziKurang++;
        else if (bbtbStatus === "Normal") bbtbNormal++;
        else if (bbtbStatus === "Risiko Gizi Lebih") bbtbRisikoLebih++;
        else if (bbtbStatus === "Gizi Lebih") bbtbGiziLebih++;
        else if (bbtbStatus === "Obesitas") bbtbObesitas++;
      } else {
        // Children without records are assumed normal / default initial state
        stuntingNormal++;
        bbuNormal++;
        bbtbNormal++;
      }
    });

    const totalStunting = stuntingSangatPendek + stuntingPendek;
    const stuntingPercentage = totalAnak > 0 ? ((totalStunting / totalAnak) * 100).toFixed(1) : "0.0";
    
    // Growth risk indicators
    const bbuKurangSangatKurang = bbuSangatKurang + bbuKurang;
    const bbuKurangSangatKurangPercentage = totalAnak > 0 ? ((bbuKurangSangatKurang / totalAnak) * 100).toFixed(1) : "0.0";

    const bbtbKurangBuruk = bbtbGiziBurukOutlier + bbtbGiziKurang;
    const bbtbKurangBurukPercentage = totalAnak > 0 ? ((bbtbKurangBuruk / totalAnak) * 100).toFixed(1) : "0.0";

    return {
      stuntingSangatPendek,
      stuntingPendek,
      stuntingNormal,
      stuntingTinggi,
      totalStunting,
      stuntingPercentage,
      bbuSangatKurang,
      bbuKurang,
      bbuNormal,
      bbuRisikoLebih,
      bbtbGiziBurukOutlier,
      bbtbGiziKurang,
      bbtbNormal,
      bbtbRisikoLebih,
      bbtbGiziLebih,
      bbtbObesitas,
      totalLaki,
      totalPerempuan,
      bbuKurangSangatKurang,
      bbuKurangSangatKurangPercentage,
      bbtbKurangBuruk,
      bbtbKurangBurukPercentage
    };
  }, [anakList, latestWeighings]);

  // Aggregate Stunting and Nutrition per Desa
  const desaAggregates = useMemo(() => {
    return desaList.map(desa => {
      const childrenInDesa = anakList.filter(a => a.id_desa === desa.id_desa);
      let stuntingCount = 0;
      let giziKurangCount = 0;

      childrenInDesa.forEach(child => {
        const latest = latestWeighings[child.id_anak];
        if (latest) {
          if (latest.status_stunting === "Sangat Pendek" || latest.status_stunting === "Pendek") {
            stuntingCount++;
          }
          if (latest.status_gizi === "Sangat Kurang" || latest.status_gizi === "Kurang") {
            giziKurangCount++;
          }
        }
      });

      const stuntingPercent = childrenInDesa.length > 0 ? Math.round((stuntingCount / childrenInDesa.length) * 100) : 0;

      return {
        ...desa,
        totalChildren: childrenInDesa.length,
        stuntingCount,
        stuntingPercent,
        giziKurangCount
      };
    });
  }, [desaList, anakList, latestWeighings]);

  // Aggregate Stunting and Nutrition per Posyandu
  const posyanduAggregates = useMemo(() => {
    return posyanduList.map(pos => {
      const desa = desaList.find(d => d.id_desa === pos.id_desa);
      const childrenInPos = anakList.filter(a => a.id_posyandu === pos.id_posyandu);
      let stuntingCount = 0;
      let giziBaikCount = 0;
      let giziKurangCount = 0;
      let measuredThisMonthCount = 0;

      // Check current month (e.g. May 2026 based on mock current local time)
      const currentYear = 2026;
      const currentMonth = 4; // index 4 is May relative to JS Date month 0-indexed

      childrenInPos.forEach(child => {
        const latest = latestWeighings[child.id_anak];
        if (latest) {
          if (latest.status_stunting === "Sangat Pendek" || latest.status_stunting === "Pendek") {
            stuntingCount++;
          }
          if (latest.status_gizi === "Berat Badan Normal") {
            giziBaikCount++;
          } else if (latest.status_gizi === "Sangat Kurang" || latest.status_gizi === "Kurang") {
            giziKurangCount++;
          }

          const weighDate = new Date(latest.tanggal_penimbangan);
          if (weighDate.getFullYear() === currentYear && weighDate.getMonth() === currentMonth) {
            measuredThisMonthCount++;
          }
        } else {
          giziBaikCount++;
        }
      });

      const stuntingPercent = childrenInPos.length > 0 ? Math.round((stuntingCount / childrenInPos.length) * 100) : 0;
      const coveragePercent = childrenInPos.length > 0 ? Math.round((measuredThisMonthCount / childrenInPos.length) * 100) : 0;

      return {
        ...pos,
        nama_desa: desa ? desa.nama_desa : "Tidak Diketahui",
        totalChildren: childrenInPos.length,
        stuntingCount,
        stuntingPercent,
        giziBaikCount,
        giziKurangCount,
        measuredThisMonthCount,
        coveragePercent
      };
    });
  }, [posyanduList, desaList, anakList, latestWeighings]);

  // Posyandu filtered table
  const [posyanduSearch, setPosyanduSearch] = useState("");
  const filteredPosyanduAggs = useMemo(() => {
    const q = (posyanduSearch || quickSearch).toLowerCase();
    if (!q) return posyanduAggregates;
    return posyanduAggregates.filter(
      p => p.nama_posyandu.toLowerCase().includes(q) || p.nama_desa.toLowerCase().includes(q)
    );
  }, [posyanduAggregates, posyanduSearch, quickSearch]);

  // Monthly measurement line chart helper
  const monthlyPenimbanganStats = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const counts = Array(12).fill(0);
    const year2026 = 2026;

    penimbanganList.forEach(p => {
      const d = new Date(p.tanggal_penimbangan);
      if (d.getFullYear() === year2026) {
        counts[d.getMonth()]++;
      }
    });

    return months.map((name, i) => ({ month: name, count: counts[i] }));
  }, [penimbanganList]);

  // Max value for scaling SVG charts
  const maxMonthlyCount = Math.max(...monthlyPenimbanganStats.map(m => m.count), 5);
  const maxDesaStuntingPrevalence = Math.max(...desaAggregates.map(d => d.stuntingPercent), 20);

  return (
    <div className="space-y-6">
      {/* Dynamic Alerts if stunting rates are high or zero data exists */}
      {stats.totalStunting > 0 && (
        <div id="dashboard-warning" className="p-4 rounded-2xl border flex gap-3 bg-amber-500/10 border-amber-550/20 text-amber-800 dark:text-amber-400">
          <Info size={18} className="shrink-0 mt-0.5" />
          <div className="text-xs font-semibold">
            Perhatian Tindak Lanjut: Terdeteksi <span className="font-bold underline">{stats.totalStunting} balita ({stats.stuntingPercentage}%)</span> dengan status stunting (Sangat Pendek / Pendek). Lakukan PMT darurat dan intervensi kader untuk penimbangan bulan ini.
          </div>
        </div>
      )}

      {/* Unified Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 auto-rows-auto">
        
        {/* Bento Card 1: Total Children */}
        <div 
          id="stat-balita"
          onClick={() => setTab("balita")}
          className={`cursor-pointer p-6 rounded-3xl border transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative group overflow-hidden col-span-1 lg:col-span-3 flex flex-col justify-between min-h-[145px]
            ${darkMode ? "bg-slate-900 border-slate-800/80" : "bg-white border-slate-200/90 shadow-sm shadow-slate-100"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Jumlah Balita Terdaftar</span>
            <span className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-650 dark:text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
              <Users size={16} />
            </span>
          </div>
          <div className="mt-3 relative z-10 flex items-end justify-between">
            <div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">{totalAnak}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-teal-600 dark:text-teal-400">{stats.totalLaki} Laki-laki</span> • 
                <span className="font-semibold text-pink-500">{stats.totalPerempuan} Perempuan</span>
              </div>
            </div>
            <span className="text-[10px] bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300 px-2 py-1 rounded-md font-bold">Terdaftar</span>
          </div>
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tr from-teal-500/5 to-transparent rounded-full -mr-6 -mb-6"></div>
        </div>

        {/* Bento Card 2: Prevalensi Stunting */}
        <div 
          id="stat-stunting"
          className={`p-6 rounded-3xl border transition-all duration-300 hover:shadow-md relative group overflow-hidden col-span-1 lg:col-span-3 flex flex-col justify-between min-h-[145px]
            ${darkMode ? "bg-slate-900 border-slate-800/80" : "bg-white border-slate-200/90 shadow-sm shadow-slate-100"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Status Stunting</span>
            <span className={`p-2 rounded-xl text-xs font-bold font-mono ${stats.totalStunting > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}>
              {stats.stuntingPercentage}% Ratio
            </span>
          </div>
          <div className="mt-3 relative z-10 flex items-end justify-between">
            <div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {stats.totalStunting} <span className="text-xs font-medium text-slate-400">Anak</span>
              </h3>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                Sangat Pendek: <span className="font-semibold text-red-500">{stats.stuntingSangatPendek}</span>, Pendek: <span className="font-semibold text-amber-500">{stats.stuntingPendek}</span>
              </div>
            </div>
            <span className="text-[10px] bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-450 px-2 py-1 rounded-md font-bold">Intervensi</span>
          </div>
        </div>

        {/* Bento Card 3: Gizi Baik (Emerald-Teal Gradient) */}
        <div 
          id="stat-malnutrition"
          className={`p-6 rounded-3xl relative group overflow-hidden col-span-1 lg:col-span-3 flex flex-col justify-between min-h-[145px] transition-all duration-300 hover:shadow-md
            ${darkMode 
              ? "bg-gradient-to-br from-teal-900/30 to-emerald-950/20 border border-teal-500/20 text-teal-150" 
              : "text-white bg-gradient-to-br from-teal-500 to-emerald-600 border-none shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20"}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? "text-teal-400" : "text-emerald-100"}`}>Kondisi Gizi Normal</span>
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono ${darkMode ? "bg-teal-500/20 text-teal-300" : "bg-white/20 text-white"}`}>
              {totalAnak > 0 ? (( (100 - parseFloat(stats.bbuKurangSangatKurangPercentage)) + (100 - parseFloat(stats.bbtbKurangBurukPercentage)) ) / 2).toFixed(1) : "100"}% Avg Capaian
            </span>
          </div>
          <div className="mt-2 relative z-10 flex items-end justify-between">
            <div className="space-y-1">
              <div>
                <span className={`text-[9px] uppercase tracking-wider block opacity-75 font-semibold ${darkMode ? "text-teal-300" : "text-emerald-100"}`}>Berat/Umur (BB/U):</span>
                <h3 className="text-xl font-black">{stats.bbuNormal} <span className="text-xs font-medium opacity-85">Anak Normal</span></h3>
              </div>
              <div>
                <span className={`text-[9px] uppercase tracking-wider block opacity-75 font-semibold ${darkMode ? "text-teal-300" : "text-emerald-100"}`}>Berat/Tinggi (BB/TB):</span>
                <h3 className="text-xl font-black">{stats.bbtbNormal} <span className="text-xs font-medium opacity-85">Anak Normal</span></h3>
              </div>
            </div>
            <Activity className={`w-8 h-8 opacity-20 select-none ${darkMode ? "text-teal-350" : "text-white"}`} />
          </div>
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tr from-white/10 to-transparent rounded-full -mr-6 -mb-6"></div>
        </div>

        {/* Bento Card 4: Posyandu & Desa */}
        <div 
          id="stat-posyandu"
          onClick={() => setTab("posyandu_desa")}
          className={`cursor-pointer p-6 rounded-3xl border transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative group overflow-hidden col-span-1 lg:col-span-3 flex flex-col justify-between min-h-[145px]
            ${darkMode ? "bg-slate-900 border-slate-800/80" : "bg-white border-slate-200/90 shadow-sm shadow-slate-100"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Fasilitas Posyandu</span>
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
              <Building2 size={16} />
            </span>
          </div>
          <div className="mt-3 relative z-10 flex items-end justify-between">
            <div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {totalPosyandu} <span className="text-xs font-medium text-slate-400">Unit</span>
              </h3>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                Tersebar di <span className="font-bold text-indigo-500 dark:text-indigo-400">{totalDesa} Desa Binaan</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400">Wilayah Kerja</span>
          </div>
        </div>

        {/* Bento Card 5 (Large Visual): Line graph for Monthly measurements (SVG) */}
        <div className={`col-span-1 lg:col-span-8 p-6 rounded-3xl border flex flex-col justify-between min-h-[360px]
          ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/90 shadow-sm shadow-slate-100"}`}>
          
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Histori Penimbangan Bulanan (2026)</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 mt-0.5">Monitoring Kunjungan & Pengukuran</h3>
            </div>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> Terukur Aktif
              </span>
            </div>
          </div>

          <div className="h-64 w-full relative mt-2">
            {/* Grid background and SVG layout */}
            <svg className="w-full h-full" viewBox="0 0 540 220" preserveAspectRatio="none">
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = 20 + ratio * 150;
                const value = Math.round((1 - ratio) * maxMonthlyCount);
                return (
                  <g key={index} className="opacity-40">
                    <line x1="45" y1={y} x2="520" y2={y} stroke={darkMode ? "#334155" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3,3" />
                    <text x="15" y={y + 4} fontSize="9" fontWeight="bold" fill="#94a3b8" textAnchor="start">{value}</text>
                  </g>
                );
              })}

              {/* Line graph elements */}
              {monthlyPenimbanganStats.map((item, i) => {
                const x = 45 + (i * 43.1);
                const y = 170 - (item.count / maxMonthlyCount) * 150;
                
                return (
                  <g key={i}>
                    {/* Hover hotspot */}
                    <rect 
                      x={x - 15} 
                      y="10" 
                      width="35" 
                      height="170" 
                      fill="transparent" 
                      className="cursor-pointer group"
                    />
                    
                    {/* Circle indicators */}
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={item.count > 0 ? (isActiveMonth(i) ? "6.5" : "5") : "3"} 
                      fill={isActiveMonth(i) ? "#14b8a6" : (darkMode ? "#475569" : "#cbd5e1")} 
                      stroke={isActiveMonth(i) ? "#ffffff" : "none"}
                      strokeWidth={isActiveMonth(i) ? 1.5 : 0}
                      className="transition-all hover:scale-125" 
                    />
                    
                    {/* Value Badge on Top */}
                    {item.count > 0 && (
                      <text x={x} y={y - 10} fontSize="9" fontWeight="black" fill={isActiveMonth(i) ? "#0d9488" : "#94a3b8"} textAnchor="middle">
                        {item.count}
                      </text>
                    )}

                    {/* Column label */}
                    <text x={x} y="195" fontSize="8.5" fontWeight="bold" fill="#64748b" textAnchor="middle" className="font-mono">
                      {item.month.toUpperCase()}
                    </text>
                  </g>
                );
              })}

              {/* Line Path */}
              {(() => {
                const points = monthlyPenimbanganStats.map((item, i) => {
                  const x = 45 + (i * 43.1);
                  const y = 170 - (item.count / maxMonthlyCount) * 150;
                  return `${x},${y}`;
                }).join(" ");
                return (
                  <polyline 
                    fill="none" 
                    stroke="url(#gradient-teal)" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                    points={points} 
                  />
                );
              })()}

              {/* Gradient for the line path */}
              <defs>
                <linearGradient id="gradient-teal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold text-center mt-3 flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <TrendingUp size={11} className="text-teal-500" /> Grafik real-time kunjungan balita berstatus aktif terukur pada setiap pos penimbangan (Mei 2026).
          </p>
        </div>

        {/* Bento Card 6: Segments of nutrition & stunting */}
        <div className={`col-span-1 lg:col-span-4 p-6 rounded-3xl border flex flex-col justify-between min-h-[360px]
          ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/90 shadow-sm shadow-slate-100"}`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Parameter Pengukuran</span>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setMetricMode("BBU")}
                  className={`px-2 py-1 text-[9px] font-bold rounded-lg transition-all ${metricMode === "BBU" ? "bg-white dark:bg-slate-850 text-teal-600 dark:text-teal-400 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  BB/U
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode("BBTB")}
                  className={`px-2 py-1 text-[9px] font-bold rounded-lg transition-all ${metricMode === "BBTB" ? "bg-white dark:bg-slate-850 text-teal-600 dark:text-teal-400 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  BB/TB
                </button>
              </div>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 mt-1">
              Metrik Status Gizi {metricMode === "BBU" ? "BB/U" : "BB/TB"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {metricMode === "BBU" 
                ? "Klasifikasi otomatis standar deviasi indeks Berat Badan menurut Umur (BB/U)." 
                : "Klasifikasi otomatis standar deviasi indeks Berat Badan menurut Tinggi Badan (BB/TB)."}
            </p>
          </div>

          <div className="space-y-3">
            {(() => {
              const items = metricMode === "BBU" 
                ? [
                    { label: "Berat Badan Normal", count: stats.bbuNormal, bgClass: "bg-emerald-500", textClass: "text-slate-700 dark:text-slate-300" },
                    { label: "Risiko Gizi Lebih", count: stats.bbuRisikoLebih, bgClass: "bg-indigo-500", textClass: "text-slate-700 dark:text-slate-300" },
                    { label: "Kurang", count: stats.bbuKurang, bgClass: "bg-amber-500", textClass: "text-amber-600 dark:text-amber-400" },
                    { label: "Sangat Kurang", count: stats.bbuSangatKurang, bgClass: "bg-rose-600", textClass: "text-red-600 dark:text-red-400 font-bold" },
                  ]
                : [
                    { label: "Normal", count: stats.bbtbNormal, bgClass: "bg-emerald-500", textClass: "text-slate-700 dark:text-slate-300" },
                    { label: "Risiko Gizi Lebih", count: stats.bbtbRisikoLebih, bgClass: "bg-teal-500", textClass: "text-slate-700 dark:text-slate-300" },
                    { label: "Gizi Lebih", count: stats.bbtbGiziLebih, bgClass: "bg-blue-500", textClass: "text-slate-700 dark:text-slate-300" },
                    { label: "Obesitas", count: stats.bbtbObesitas, bgClass: "bg-purple-600", textClass: "text-purple-600 dark:text-purple-400" },
                    { label: "Gizi Kurang", count: stats.bbtbGiziKurang, bgClass: "bg-amber-500", textClass: "text-amber-600 dark:text-amber-400" },
                    { label: "Gizi Buruk / Outlier", count: stats.bbtbGiziBurukOutlier, bgClass: "bg-rose-650", textClass: "text-red-650 dark:text-red-400 font-bold" },
                  ];

              return items.map((item, index) => {
                const percent = totalAnak > 0 ? Math.round((item.count / totalAnak) * 100) : 0;
                return (
                  <div key={index} className="text-xs">
                    <div className="flex justify-between font-semibold mb-1">
                      <span className={item.textClass}>{item.label}</span>
                      <span className="text-slate-500 font-mono text-[11px] font-bold">
                        {item.count} anak ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden">
                      <div 
                        className={`h-full ${item.bgClass} rounded-full transition-all duration-500`} 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-150 dark:border-slate-800/50 text-[10px] text-slate-450 leading-relaxed">
            *Segera rekomendasikan rujukan, asupan khusus, atau PMT Pemulihan kepada balita yang tergolong dalam kelompok gizi kurang, sangat kurang, atau risiko berlebih.
          </div>
        </div>

        {/* Bento Card 7: Stunting per Desa Comparison */}
        <div className={`p-6 rounded-3xl border col-span-1 lg:col-span-4 min-h-[380px] flex flex-col justify-between
          ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/90 shadow-sm shadow-slate-100"}`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Prevalensi Desa</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 mt-0.5">Perbandingan Wilayah</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">Persentase kasus stunting per wilayah desa binaan.</p>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto pr-1 max-h-[220px]">
            {desaAggregates.map((desa) => (
              <div key={desa.id_desa} className="group cursor-default">
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Map size={12} className="text-teal-500 shrink-0" />
                    <span className="text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{desa.nama_desa}</span>
                  </div>
                  <span className={`font-mono font-bold text-[11px] ${desa.stuntingCount > 0 ? "text-red-500" : "text-emerald-500"}`}>
                    {desa.stuntingPercent}% ({desa.stuntingCount}/{desa.totalChildren})
                  </span>
                </div>
                {/* Horizontal progress bar representing stunting percentage */}
                <div className="h-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850/60 overflow-hidden relative flex items-center px-2.5">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500/10 to-red-500/25 transition-all duration-500"
                    style={{ width: `${desa.stuntingPercent}%` }}
                  ></div>
                  <div className="relative text-[9.5px] text-slate-400 font-bold z-10 font-mono tracking-wider">
                    RASIO PREVALENSI
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center font-semibold">
            Rasio dihitung terintegrasi per jumlah balita wilayah.
          </div>
        </div>

        {/* Bento Card 8: Posyandu Monitoring Table Summary */}
        <div className={`p-6 rounded-3xl border col-span-1 lg:col-span-8 min-h-[380px] flex flex-col justify-between
          ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/90 shadow-sm shadow-slate-100"}`}>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Monitoring Cakupan Posyandu</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 mt-0.5">Penilaian Penimbangan Bulanan</h3>
            </div>
            
            {/* Table Search */}
            <input 
              type="text"
              value={posyanduSearch}
              onChange={(e) => setPosyanduSearch(e.target.value)}
              placeholder="Saring Posyandu..."
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border focus:outline-none w-full sm:w-48 transition-all
                ${darkMode 
                  ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500" 
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-teal-500"}`}
            />
          </div>

          <div className="overflow-x-auto flex-1 max-h-[220px] overflow-y-auto pr-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-105 dark:border-slate-800 text-slate-400 text-[10px] font-bold font-mono uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900 z-10">
                  <th className="pb-2">Posyandu</th>
                  <th className="pb-2">Nama Desa</th>
                  <th className="pb-2 text-center">Balita</th>
                  <th className="pb-2 text-center">Terukur (Mei '26)</th>
                  <th className="pb-2 text-center">Cakupan (%)</th>
                  <th className="pb-2 text-center">Stunting (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                {filteredPosyanduAggs.map((pos) => {
                  return (
                    <tr key={pos.id_posyandu} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all duration-150">
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                        {pos.nama_posyandu}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {pos.nama_desa}
                      </td>
                      <td className="py-2.5 text-center font-bold text-slate-705 dark:text-slate-305 font-mono">
                        {pos.totalChildren}
                      </td>
                      <td className="py-2.5 text-center font-mono text-teal-600 dark:text-teal-400 font-bold">
                        {pos.measuredThisMonthCount}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          pos.coveragePercent >= 80 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                            : pos.coveragePercent >= 50
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-red-500/10 text-red-600"
                        }`}>
                          {pos.coveragePercent}%
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          pos.stuntingPercent > 20 
                            ? "bg-red-500/10 text-red-650" 
                            : pos.stuntingPercent > 5
                              ? "bg-amber-500/10 text-amber-650"
                              : "bg-emerald-500/10 text-emerald-650"
                        }`}>
                          {pos.stuntingPercent}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredPosyanduAggs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                      Tidak ada data Posyandu yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[9.5px] text-slate-400 text-center font-medium mt-1">
            Total target Posyandu aktif adalah minimal 80% cakupan pemeriksaan bulanan terdaftar.
          </div>
        </div>

      </div>

    </div>
  );

  function isActiveMonth(index: number) {
    // Current simulated date is May 2026 (Month index 4)
    return index === 4;
  }
}
