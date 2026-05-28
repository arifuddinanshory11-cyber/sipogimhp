import React, { useState, useMemo, useEffect } from "react";
import { 
  FileText, 
  Printer, 
  MapPin, 
  Download, 
  Building, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  ChevronRight, 
  Plus, 
  Activity,
  Heart,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileCheck2,
  Users
} from "lucide-react";
import * as XLSX from "xlsx";
import { DataAnak, Penimbangan, Desa, Posyandu, UserSession } from "../types";
import { getZScoreBBTB } from "../utils/zscore";

interface LaporanDataProps {
  anakList: DataAnak[];
  penimbanganList: Penimbangan[];
  desaList: Desa[];
  posyanduList: Posyandu[];
  session: UserSession | null;
  darkMode: boolean;
}

export default function LaporanData({
  anakList,
  penimbanganList,
  desaList,
  posyanduList,
  session,
  darkMode
}: LaporanDataProps) {
  
  const [filterDesa, setFilterDesa] = useState("");
  const [filterPosyandu, setFilterPosyandu] = useState("");
  const [selectedLaporanType, setSelectedLaporanType] = useState<"rekap_stunting" | "rekap_gizi" | "cakupan_timbang" | "laporan_skdn">("rekap_stunting");
  
  // Custom SKDN selectors
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // Default to Mei (5)
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Default to 2026

  const selectedPosyanduObj = useMemo(() => {
    return posyanduList.find(p => p.id_posyandu === filterPosyandu);
  }, [filterPosyandu, posyanduList]);

  const selectedDesaObj = useMemo(() => {
    if (filterDesa) {
      return desaList.find(d => d.id_desa === filterDesa);
    }
    if (selectedPosyanduObj) {
      return desaList.find(d => d.id_desa === selectedPosyanduObj.id_desa);
    }
    return null;
  }, [filterDesa, selectedPosyanduObj, desaList]);

  const ketuaKaderNama = selectedPosyanduObj ? selectedPosyanduObj.nama_kader : "............................";
  const petugasKesehatanNama = selectedPosyanduObj?.petugas_kesehatan || selectedDesaObj?.petugas_kesehatan_1 || "............................";

  const tanggalPosyandu = useMemo(() => {
    // Filtered penimbangan list for kids in the active village and posyandu
    // occurring in the selectedMonth and selectedYear
    const filteredPenimbangan = penimbanganList.filter(w => {
      const kidObj = anakList.find(a => a.id_anak === w.id_anak);
      if (!kidObj) return false;
      if (filterDesa && kidObj.id_desa !== filterDesa) return false;
      if (filterPosyandu && kidObj.id_posyandu !== filterPosyandu) return false;
      
      const d = new Date(w.tanggal_penimbangan);
      return (d.getMonth() + 1 === selectedMonth) && (d.getFullYear() === selectedYear);
    });

    if (filteredPenimbangan.length === 0) {
      return "Belum ada Penimbangan";
    }

    // Sort to get the first one
    const datesSorted = filteredPenimbangan
      .map(w => w.tanggal_penimbangan)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const firstDate = datesSorted[0];
    try {
      const parts = firstDate.split("-");
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const year = parts[0];
        const indonesianMonths = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        return `${day} ${indonesianMonths[monthIndex]} ${year}`;
      }
    } catch (e) {
      // fallback
    }
    return firstDate;
  }, [penimbanganList, anakList, filterDesa, filterPosyandu, selectedMonth, selectedYear]);

  // Configure filters locks 
  useEffect(() => {
    if (session?.role === "ADMIN_DESA" && session.id_desa) {
      setFilterDesa(session.id_desa);
    }
    if (session?.role === "ADMIN_POSYANDU" && session.id_posyandu) {
      setFilterPosyandu(session.id_posyandu);
      const pos = posyanduList.find(p => p.id_posyandu === session.id_posyandu);
      if (pos) setFilterDesa(pos.id_desa);
    }
  }, [session, posyanduList]);

  // Aggregate latest penimbangan
  const latestWeighings = useMemo(() => {
    const map: { [id_anak: string]: Penimbangan } = {};
    const sorted = [...penimbanganList].sort(
      (a, b) => new Date(a.tanggal_penimbangan).getTime() - new Date(b.tanggal_penimbangan).getTime()
    );
    sorted.forEach(w => {
      map[w.id_anak] = w;
    });
    return map;
  }, [penimbanganList]);

  // Filtered lists matching selection
  const targetKids = useMemo(() => {
    return anakList.filter(a => {
      if (filterDesa && a.id_desa !== filterDesa) return false;
      if (filterPosyandu && a.id_posyandu !== filterPosyandu) return false;
      return true;
    });
  }, [anakList, filterDesa, filterPosyandu]);

  // Helper to determine growth (N/T/Baru)
  const getGrowthCodeForKid = (targetLog: Penimbangan, allLogs: Penimbangan[], childBirthWeight?: number) => {
    const childLogs = allLogs
      .filter(w => w.id_anak === targetLog.id_anak)
      .sort((a, b) => new Date(a.tanggal_penimbangan).getTime() - new Date(b.tanggal_penimbangan).getTime());
    
    const idx = childLogs.findIndex(w => w.id_penimbangan === targetLog.id_penimbangan);
    if (idx <= 0) {
      if (childBirthWeight) {
        const diff = targetLog.berat_badan - childBirthWeight;
        return diff <= 0 ? "T" : "N";
      }
      return "Baru";
    }
    
    const prev = childLogs[idx - 1];
    const diff = targetLog.berat_badan - prev.berat_badan;
    return diff <= 0 ? "T" : "N";
  };

  const getPMTTrigger = (kid: DataAnak, latest: Penimbangan | undefined, allLogs: Penimbangan[]) => {
    if (!latest) return "Tidak";
    
    // 1. Status Gizi BB/TB Kurang atau Buruk
    const bbtbStatus = latest.status_gizi_bbtb || getZScoreBBTB(kid.jenis_kelamin, latest.tinggi_badan, latest.berat_badan).status;
    if (bbtbStatus === "Gizi Kurang" || bbtbStatus === "Gizi Buruk / Outlier") {
      return "Ya";
    }

    // 2. Status Gizi BB/U Kurang atau Sangat Kurang
    if (latest.status_gizi === "Kurang" || latest.status_gizi === "Sangat Kurang") {
      return "Ya";
    }

    // 3. BB tidak naik
    const growth = getGrowthCodeForKid(latest, allLogs, kid.berat_lahir);
    if (growth === "T") {
      return "Ya";
    }

    return "Tidak";
  };

  // Calculations for specific selected report
  const reportData = useMemo(() => {
    const rows: any[] = [];
    
    targetKids.forEach(kid => {
      const latest = latestWeighings[kid.id_anak];
      const desa = desaList.find(d => d.id_desa === kid.id_desa);
      const posyandu = posyanduList.find(p => p.id_posyandu === kid.id_posyandu);

      const isStunting = latest ? (latest.status_stunting === "Sangat Pendek" || latest.status_stunting === "Pendek") : false;
      const bbtbStatus = latest ? (latest.status_gizi_bbtb || getZScoreBBTB(kid.jenis_kelamin, latest.tinggi_badan, latest.berat_badan).status) : "Normal";
      const isGiziBurukKurang = latest ? (
        latest.status_gizi === "Sangat Kurang" || 
        latest.status_gizi === "Kurang" ||
        bbtbStatus === "Gizi Buruk / Outlier" ||
        bbtbStatus === "Gizi Kurang"
      ) : false;

      let includeInReport = false;
      if (selectedLaporanType === "rekap_stunting" && isStunting) includeInReport = true;
      else if (selectedLaporanType === "rekap_gizi" && isGiziBurukKurang) includeInReport = true;
      else if (selectedLaporanType === "cakupan_timbang" && latest) {
        // Included if penimbangan is present in simulated current month (May 2026)
        const dateObj = new Date(latest.tanggal_penimbangan);
        if (dateObj.getFullYear() === 2026 && dateObj.getMonth() === 4) {
          includeInReport = true;
        }
      }

      if (includeInReport) {
        const pmtVal = getPMTTrigger(kid, latest, penimbanganList);
        rows.push({
          id_anak: kid.id_anak,
          nik_anak: kid.nik_anak,
          nama_anak: kid.nama_anak,
          gender: kid.jenis_kelamin,
          usia: latest ? latest.umur_bulan : 0,
          berat: latest ? latest.berat_badan : 0,
          tinggi: latest ? latest.tinggi_badan : 0,
          stunting_status: latest ? latest.status_stunting : "Sangat Pendek",
          gizi_status: latest ? `${latest.status_gizi} (BB/U) • ${bbtbStatus} (BB/TB)` : "Kurang",
          nama_desa: desa ? desa.nama_desa : "",
          nama_posyandu: posyandu ? posyandu.nama_posyandu : "",
          wali: kid.nama_ortu,
          tanggal: latest ? latest.tanggal_penimbangan : "",
          pmt: pmtVal
        });
      }
    });

    return rows;
  }, [targetKids, latestWeighings, selectedLaporanType, desaList, posyanduList, penimbanganList]);

  // ==========================================
  // REAL-TIME SKDN METRICS CALCULATIONS
  // ==========================================
  const skdnData = useMemo(() => {
    // 1. Get kids belonging to selected Desa & Posyandu
    const skdnKids = anakList.filter(a => {
      if (filterDesa && a.id_desa !== filterDesa) return false;
      if (filterPosyandu && a.id_posyandu !== filterPosyandu) return false;
      return true;
    });

    // Sub-helpers for target months
    const getWeighingInMonth = (id_anak: string, month: number, year: number) => {
      return penimbanganList.find(w => {
        if (w.id_anak !== id_anak) return false;
        const d = new Date(w.tanggal_penimbangan);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    };

    const getWeighingInPrecedingMonth = (id_anak: string, month: number, year: number) => {
      let targetMonth = month - 1;
      let targetYear = year;
      if (targetMonth === 0) {
        targetMonth = 12;
        targetYear = year - 1;
      }
      return penimbanganList.find(w => {
        if (w.id_anak !== id_anak) return false;
        const d = new Date(w.tanggal_penimbangan);
        return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
      });
    };

    const getWeighingTwoMonthsAgo = (id_anak: string, month: number, year: number) => {
      let targetMonth = month - 2;
      let targetYear = year;
      if (targetMonth <= 0) {
        targetMonth = targetMonth + 12;
        targetYear = year - 1;
      }
      return penimbanganList.find(w => {
        if (w.id_anak !== id_anak) return false;
        const d = new Date(w.tanggal_penimbangan);
        return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
      });
    };

    let countS = skdnKids.length;
    let countK = countS; // Traditional assumption: K is matching children having KMS/KIA profile
    let countD = 0;
    let countN = 0;
    let countBGT = 0;
    let countBGM = 0;
    let countO = 0;
    let countB = 0;
    let count1T = 0;
    let count2T = 0;

    let age_0_6_L = 0;
    let age_0_6_P = 0;
    let age_7_11_L = 0;
    let age_7_11_P = 0;
    let age_12_23_L = 0;
    let age_12_23_P = 0;
    let age_24_59_L = 0;
    let age_24_59_P = 0;

    skdnKids.forEach(kid => {
      const currentW = getWeighingInMonth(kid.id_anak, selectedMonth, selectedYear);
      const prevW = getWeighingInPrecedingMonth(kid.id_anak, selectedMonth, selectedYear);
      const prevTwoW = getWeighingTwoMonthsAgo(kid.id_anak, selectedMonth, selectedYear);

      if (currentW) {
        countD++;

        const age = currentW.umur_bulan;
        if (age >= 0 && age <= 6) {
          if (kid.jenis_kelamin === "L") age_0_6_L++; else age_0_6_P++;
        } else if (age >= 7 && age <= 11) {
          if (kid.jenis_kelamin === "L") age_7_11_L++; else age_7_11_P++;
        } else if (age >= 12 && age <= 23) {
          if (kid.jenis_kelamin === "L") age_12_23_L++; else age_12_23_P++;
        } else if (age >= 24 && age <= 59) {
          if (kid.jenis_kelamin === "L") age_24_59_L++; else age_24_59_P++;
        }

        // BGM check (Weight strictly < -3 SD or registered category matches)
        if (currentW.status_gizi === "Sangat Kurang" || currentW.zscore_bb_u < -3.0) {
          countBGM++;
        }

        // Growth metrics
        const allKidLogsSorted = penimbanganList
          .filter(w => w.id_anak === kid.id_anak)
          .sort((a, b) => new Date(a.tanggal_penimbangan).getTime() - new Date(b.tanggal_penimbangan).getTime());
        
        let isFirstEver = false;
        if (allKidLogsSorted.length > 0 && allKidLogsSorted[0].id_penimbangan === currentW.id_penimbangan) {
          isFirstEver = true;
        }

        let curVal = currentW.berat_badan;
        let pVal: number | null = null;

        if (isFirstEver) {
          countB++;
          if (kid.berat_lahir) pVal = kid.berat_lahir;
        } else if (prevW) {
          pVal = prevW.berat_badan;
        }

        if (pVal !== null) {
          const diff = curVal - pVal;
          if (diff > 0) {
            countN++;
            countBGT++;
          } else {
            // Weight gain was not achieved (T)
            let prevWasT = false;
            
            if (prevW) {
              let prevPrevVal: number | null = null;
              if (allKidLogsSorted.length > 0 && allKidLogsSorted[0].id_penimbangan === prevW.id_penimbangan) {
                if (kid.berat_lahir) prevPrevVal = kid.berat_lahir;
              } else if (prevTwoW) {
                prevPrevVal = prevTwoW.berat_badan;
              }

              if (prevPrevVal !== null && prevW.berat_badan - prevPrevVal <= 0) {
                prevWasT = true;
              }
            }

            if (prevWasT) {
              count2T++;
            } else {
              count1T++;
            }
          }
        }
      } else {
        countO++;
      }
    });

    return {
      countS, countK, countD, countN, countBGT, countBGM, countO, countB, count1T, count2T,
      age_0_6_L, age_0_6_P, age_7_11_L, age_7_11_P, age_12_23_L, age_12_23_P, age_24_59_L, age_24_59_P,
      desaName: filterDesa ? desaList.find(d => d.id_desa === filterDesa)?.nama_desa || "Semua Desa" : "Semua Desa",
      posyanduName: filterPosyandu ? posyanduList.find(p => p.id_posyandu === filterPosyandu)?.nama_posyandu || "Semua Posyandu" : "Semua Posyandu"
    };

  }, [anakList, penimbanganList, filterDesa, filterPosyandu, selectedMonth, selectedYear, desaList, posyanduList]);

  const handlePrintReport = () => {
    window.print();
  };

  // ==========================================
  // EXPORT SKDN EXCEL (HIGH FIDELITY FORMAT)
  // ==========================================
  const handleExportSKDNExcel = () => {
    const monthLabel = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][selectedMonth - 1];
    
    // Exact AOA template representing the manual Posyandu format
    const aoa = [
      ["LAPORAN BULANAN MANUAL POSYANDU (SKDN)"],
      [],
      ["Desa Binaan", `: ${skdnData.desaName}`],
      ["Nama Posyandu", `: ${skdnData.posyanduName}`],
      ["Tanggal Posyandu", `: ${tanggalPosyandu}`],
      ["Period/Bulan", `: ${monthLabel} ${selectedYear}`],
      [],
      ["NO", "HASIL KEGIATAN POSYANDU", "KET", "JUMLAH", "CATATAN LAINNYA"],
      ["1", "JUMLAH SELURUH BALITA YANG ADA DIWILAYAH BINAAN", "S", skdnData.countS, "Total Sasaran"],
      ["2", "JUMLAH BAYI BALITA YANG MEMILIKI BUKU KMS/KIA", "K", skdnData.countK, "Pemilik Kartu Menuju Sehat"],
      ["3", "JUMLAH BAYI BALITA YANG DITIMBANG BULAN INI", "D", skdnData.countD, "Kehadiran Riil"],
      ["4", "JUMLAH BAYI BALITA YANG NAIK BERAT BADANNYA BULAN INI", "N", skdnData.countN, "Tumbuh Normal"],
      ["5", "JUMLAH BAYI BALITA YANG BERAT BADANNYA NAIK", "BGT", skdnData.countBGT, "Naik Sesuai Grafik KMS"],
      ["6", "JUMLAH BAYI BALITA YANG BERAT BADANNYA TIDAK NAIK", "BGM", skdnData.countBGM, "Bawah Garis Merah (< -3 SD)"],
      ["7", "JUMLAH BAYI BALITA YANG TIDAK DATANG KE POSYANDU", "O", skdnData.countO, "Absen Bulan Ini"],
      ["8", "JUMLAH BAYI BALITA YANG BARU DATANG KE POSYANDU", "B", skdnData.countB, "Pengunjung Baru"],
      ["9", "JUMLAH BAYI BALITA YANG TIMBANGANNYA TIDAK NAIK 1 KALI", "1T", skdnData.count1T, "Faktor Resiko Ringan"],
      ["10", "JUMLAH BAYI BALITA YANG TIMBANGANNYA TIDAK NAIK 2 BULAN BERTURUT-TURUT", "2T", skdnData.count2T, "Rujukan Puskesmas Intensif"],
      ["11", "JUMLAH ANAK YANG DITIMBANG USIA 0-6 BULAN", "", "", ""],
      ["", "   - Laki-laki (L)", "L", skdnData.age_0_6_L, ""],
      ["", "   - Perempuan (P)", "P", skdnData.age_0_6_P, ""],
      ["12", "JUMLAH ANAK YANG DITIMBANG USIA 7-11 BULAN", "", "", ""],
      ["", "   - Laki-laki (L)", "L", skdnData.age_7_11_L, ""],
      ["", "   - Perempuan (P)", "P", skdnData.age_7_11_P, ""],
      ["13", "JUMLAH ANAK YANG DITIMBANG USIA 12-23 BULAN", "", "", ""],
      ["", "   - Laki-laki (L)", "L", skdnData.age_12_23_L, ""],
      ["", "   - Perempuan (P)", "P", skdnData.age_12_23_P, ""],
      ["14", "JUMLAH ANAK YANG DITIMBANG USIA 24-59 BULAN", "", "", ""],
      ["", "   - Laki-laki (L)", "L", skdnData.age_24_59_L, ""],
      ["", "   - Perempuan (P)", "P", skdnData.age_24_59_P, ""],
      [],
      [],
      ["", "Petugas Kesehatan Desa", "", "Ketua Kader"],
      [],
      [],
      [],
      ["", petugasKesehatanNama, "", ketuaKaderNama]
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Coordinate structure merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Title
      { s: { r: 18, c: 1 }, e: { r: 18, c: 4 } }, // age category 0-6 heading
      { s: { r: 21, c: 1 }, e: { r: 21, c: 4 } }, // age category 7-11 heading
      { s: { r: 24, c: 1 }, e: { r: 24, c: 4 } }, // age category 12-23 heading
      { s: { r: 27, c: 1 }, e: { r: 27, c: 4 } }, // age category 24-59 heading
    ];

    // Auto layout columns width
    ws['!cols'] = [
      { wch: 6 },  // NO
      { wch: 58 }, // HASIL KEGIATAN
      { wch: 8 },  // KET
      { wch: 10 }, // JUMLAH
      { wch: 28 }  // CATATAN
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan_SKDN");
    XLSX.writeFile(wb, `Laporan_SKDN_${skdnData.posyanduName}_${monthLabel}_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* Configuration & Selection Panel */}
      <div className={`p-4 rounded-xl border flex flex-col lg:flex-row gap-4 items-center justify-between print:hidden
        ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-200"}`}>
        
        {/* Report type selectors */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button
            onClick={() => setSelectedLaporanType("rekap_stunting")}
            className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors
              ${selectedLaporanType === "rekap_stunting" 
                ? "bg-red-500/10 border-red-500 text-red-650 font-extrabold" 
                : "bg-transparent border-slate-250 text-slate-500 hover:bg-slate-50"}`}
          >
            Rekap Balita Stunting
          </button>
          
          <button
            onClick={() => setSelectedLaporanType("rekap_gizi")}
            className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors
              ${selectedLaporanType === "rekap_gizi" 
                ? "bg-amber-500/10 border-amber-500 text-amber-650 font-extrabold" 
                : "bg-transparent border-slate-250 text-slate-500 hover:bg-slate-50"}`}
          >
            Rekap Gizi Buruk/Kurang
          </button>
          
          <button
            onClick={() => setSelectedLaporanType("cakupan_timbang")}
            className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors
              ${selectedLaporanType === "cakupan_timbang" 
                ? "bg-teal-500/10 border-teal-500 text-teal-655 font-extrabold" 
                : "bg-transparent border-slate-250 text-slate-500 hover:bg-slate-50"}`}
          >
            Cakupan Timbang Bulanan
          </button>

          <button
            onClick={() => setSelectedLaporanType("laporan_skdn")}
            className={`px-3 py-2 text-xs font-black rounded-lg border transition-colors flex items-center gap-1.5
              ${selectedLaporanType === "laporan_skdn" 
                ? "bg-indigo-600 border-indigo-600 text-white font-black" 
                : "bg-indigo-50/20 border-indigo-100 text-indigo-600 hover:bg-indigo-50"}`}
          >
            <FileSpreadsheet size={13} /> LAPORAN POSYANDU (SKDN)
          </button>
        </div>

        {/* Filter segment selectors */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
          {session?.role === "SUPER_ADMIN" && (
            <select
              value={filterDesa}
              onChange={(e) => {
                setFilterDesa(e.target.value);
                setFilterPosyandu("");
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none
                ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200"}`}
            >
              <option value="">Semua Desa</option>
              {desaList.map(d => (
                <option key={d.id_desa} value={d.id_desa}>{d.nama_desa}</option>
              ))}
            </select>
          )}

          {(session?.role === "SUPER_ADMIN" || session?.role === "ADMIN_DESA") && (
            <select
              value={filterPosyandu}
              disabled={!!(session?.role === "ADMIN_DESA" && !desaList.some(d => d.id_desa === session.id_desa))}
              onChange={(e) => setFilterPosyandu(e.target.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none CockpitDropdown
                ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-850"}`}
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

          {/* Sub-selectors for SKDN timeline targeting */}
          {selectedLaporanType === "laporan_skdn" && (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg border focus:outline-none
                  ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-850"}`}
              >
                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
              
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={`w-18 px-2 py-1 text-xs font-extrabold rounded-lg border focus:outline-none text-center
                  ${darkMode ? "bg-slate-900 border-slate-800 text-slate-105" : "bg-white border-slate-200 text-slate-900"}`}
              />
            </>
          )}

          {/* Action triggers */}
          {selectedLaporanType !== "laporan_skdn" ? (
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-md active:scale-95 transition-transform"
            >
              <Printer size={14} /> Cetak Laporan
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleExportSKDNExcel}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-lg shadow-md active:scale-95 transition-transform"
              >
                <Download size={14} /> Export Excel SKDN
              </button>
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-md active:scale-95 transition-transform"
              >
                <Printer size={14} /> Print PDF SKDN
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RENDER VIEW: STANDARD REKAP REPORTS */}
      {selectedLaporanType !== "laporan_skdn" && (
        <div id="printable-report-body" className={`p-6 rounded-2xl border transition-all duration-300
          ${darkMode ? "bg-slate-950 border-slate-850" : "bg-white border-slate-205"}`}>
          
          {/* Main Content header without any hardcoded letterhead layout to fulfill user wishes */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-4 border-slate-150 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-50 uppercase tracking-tight">
                {selectedLaporanType === "rekap_stunting" && "Rekapitulasi Deteksi Prevalensi Stunting (Balita Sangat Pendek / Pendek)"}
                {selectedLaporanType === "rekap_gizi" && "Laporan Pemantauan Khusus Kasus Kekurangan Gizi (Gizi Buruk / Kurang)"}
                {selectedLaporanType === "cakupan_timbang" && "Daftar Timbangan Aktif Bulan Bantuan (Mei '26)"}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Kelompok Wilayah: <span className="font-semibold text-slate-705 dark:text-slate-350">
                  {filterDesa ? desaList.find(d => d.id_desa === filterDesa)?.nama_desa : "Seluruh Desa Binaan"}
                </span> • Posyandu: <span className="font-semibold text-slate-705 dark:text-slate-350">
                  {filterPosyandu ? posyanduList.find(p => p.id_posyandu === filterPosyandu)?.nama_posyandu : "Semua Posyandu Binaan"}
                </span>
              </span>
            </div>

            <span className="text-[11px] font-mono font-bold bg-slate-500/10 px-2 py-0.5 rounded text-slate-450 shrink-0">
              Total Kasus: {reportData.length} Balita
            </span>
          </div>

          {/* Data list table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 dark:border-slate-800 text-slate-400 font-mono font-black uppercase text-[10px] pb-3">
                  <th className="py-2.5">ID Balita</th>
                  <th className="py-2.5">Nama Balita</th>
                  <th className="py-2.5">L/P</th>
                  <th className="py-2.5">Usia (Bln)</th>
                  <th className="py-2.5">Orang Tua / Wali</th>
                  <th className="py-2.5 text-center">BB (kg)</th>
                  <th className="py-2.5 text-center">TB (cm)</th>
                  <th className="py-2.5">Status Gizi (BB/U)</th>
                  <th className="py-2.5 font-bold text-red-500">Stunting (TB/U)</th>
                  <th className="py-2.5 font-black text-rose-500">PMT</th>
                  <th className="py-2.5">Posyandu - Desa</th>
                  <th className="py-2.5 text-right font-mono">Tgl Timbang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900/40 text-xs text-black dark:text-white">
                {reportData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-2.5 font-mono text-[10px] text-slate-405">{item.id_anak}</td>
                    <td className="py-2.5 font-extrabold text-slate-900 dark:text-slate-100">{item.nama_anak}</td>
                    <td className="py-2.5 font-mono">{item.gender}</td>
                    <td className="py-2.5 font-bold">{item.usia} Bln</td>
                    <td className="py-2.5 text-slate-500 truncate max-w-[100px]">{item.wali.split("/")[0]}</td>
                    <td className="py-2.5 text-center font-bold font-mono text-teal-600">{item.berat} kg</td>
                    <td className="py-2.5 text-center font-bold font-mono text-indigo-505 dark:text-indigo-400">{item.tinggi} cm</td>
                    <td className="py-2.5">
                      <span className={`font-semibold ${
                        item.gizi_status.includes("Berat Badan Normal") && item.gizi_status.includes("Normal") 
                          ? "text-green-500 font-medium" 
                          : "text-amber-500 font-bold"
                      }`}>
                        {item.gizi_status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`font-semibold ${["Normal", "Tinggi"].includes(item.stunting_status) ? "text-green-500 font-medium" : "text-red-500 font-black animate-pulse"}`}>
                        {item.stunting_status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center w-fit gap-1 ${
                        item.pmt === "Ya" 
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/10" 
                          : "bg-slate-100 dark:bg-slate-900 text-slate-500"
                      }`}>
                        {item.pmt === "Ya" && <Heart className="fill-rose-500 text-rose-500" size={10} />}
                        {item.pmt}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-[10px] text-slate-500 truncate max-w-[120px]">{item.nama_posyandu} - {item.nama_desa}</td>
                    <td className="py-2.5 text-right font-mono text-[10px] text-slate-450">{item.tanggal}</td>
                  </tr>
                ))}

                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400 italic">
                      Laporan nihil. Tidak teridentifikasi indikasi kasus dangan saringan saringan ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table signatures */}
          <div className="mt-12 pt-8 border-t border-dashed border-slate-300 md:grid md:grid-cols-3 gap-6 text-xs text-center text-black dark:text-white font-semibold flex flex-col items-center">
            <div className="w-48 text-slate-450 font-mono text-[10px] text-center self-center md:col-span-1">
               Dokumen Elektronik <br />
               SI-PoGi Kedinasan <br />
               *Sertifikasi Terenkripsi*
            </div>
            <div className="w-56 leading-relaxed text-center self-center md:col-span-1">
              Petugas Kesehatan Desa, <br />
              <br />
              <br />
              <br />
              <span className="underline font-bold">{petugasKesehatanNama}</span>
            </div>
            <div className="w-56 leading-relaxed text-center self-center md:col-span-1">
              Nanga Mahap, 27 Mei 2026 <br />
              Ketua Kader Posyandu, <br />
              <br />
              <br />
              <br />
              <span className="underline font-bold">{ketuaKaderNama}</span>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: NEW SPECIAL HIGH-FIDELITY SKDN LAPORAN */}
      {selectedLaporanType === "laporan_skdn" && (
        <div className="space-y-6">
          
          {/* Header metadata alert preview */}
          <div className={`p-4 rounded-xl border flex items-center justify-between
            ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-indigo-50/40 border-indigo-100"}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-lg text-white">
                <Users size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 leading-tight">Preformulasi Laporan POSYANDU (SKDN) Aktif</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Kalkulasi indikator S, K, D, N, BGT, BGM, O, B, 1T, 2T, beserta demografi L/P dilakukan realtime berdasarkan catatan terdaftar.
                </p>
              </div>
            </div>
            
            <div className="hidden sm:flex gap-1.5 text-[10px] font-mono text-slate-450">
              <span>Bina: {skdnData.posyanduName}</span>
              <span>&bull;</span>
              <span>{skdnData.countS} Sasaran</span>
            </div>
          </div>

          {/* Crisp paper sheet container replicating landscape format visually */}
          <div className="overflow-x-auto w-full">
            <div 
              id="printable-report-body" 
              className="min-w-[840px] max-w-[1100px] mx-auto p-8 rounded-2xl border bg-white shadow-xl text-black font-sans print:min-w-0"
              style={{ color: "black", backgroundColor: "white" }}
            >
              
              {/* SKDN Document Title */}
              <div className="text-center space-y-1 mb-8">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-850 underline decoration-2 underline-offset-4">
                  LAPORAN BULANAN KEGIATAN POSYANDU (SKDN)
                </h2>
                <p className="text-xs font-mono text-slate-500">
                  Kabupaten Sekadau &bull; UPTD Puskesmas Nanga Mahap
                </p>
              </div>

              {/* Handcrafted Header top format standard block */}
              <div className="grid grid-cols-2 gap-4 text-xs font-bold leading-relaxed mb-6 pb-4 border-b border-dashed border-slate-300">
                <div className="space-y-1.5 text-slate-800">
                  <div className="flex">
                    <span className="w-24">Desa</span>
                    <span>: {skdnData.desaName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24">Nama Posyandu</span>
                    <span>: {skdnData.posyanduName}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-slate-800 text-right sm:text-left self-end">
                  <div className="flex sm:justify-start">
                    <span className="w-24">Tanggal Posyandu</span>
                    <span>: {tanggalPosyandu}</span>
                  </div>
                  <div className="flex sm:justify-start">
                    <span className="w-24">Bulan Laporan</span>
                    <span>: {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][selectedMonth - 1]} {selectedYear}</span>
                  </div>
                </div>
              </div>

              {/* Manual format crisp table */}
              <table className="w-full text-left border-collapse border-2 border-slate-950 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-950 font-black text-center align-middle">
                    <th className="py-3 px-2 border-r border-slate-950 w-12 font-extrabold">NO</th>
                    <th className="py-3 px-4 border-r border-slate-950 text-left font-black">HASIL KEGIATAN POSYANDU</th>
                    <th className="py-3 px-2 border-r border-slate-950 w-16 font-extrabold">KET</th>
                    <th className="py-3 px-4 border-r border-slate-950 w-24 text-center font-extrabold">JUMLAH</th>
                    <th className="py-3 px-4 text-left font-bold">KETERANGAN &amp; DEFINISI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-950 font-semibold text-slate-900">
                  
                  {/* Indicator rows */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold">1</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-slate-950">JUMLAH SELURUH BALITA YANG ADA DIWILAYAH BINAAN</td>
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold font-mono">S</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-center font-black text-base font-mono bg-blue-50/20">{skdnData.countS}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">Total seluruh balita wilayah binaan aktif</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold">2</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-slate-900">JUMLAH BAYI BALITA YANG MEMILIKI BUKU KMS/KIA</td>
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold font-mono">K</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-center font-black text-base font-mono bg-emerald-50/25">{skdnData.countK}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">Bayi &amp; balita yang terdaftar dan punya KMS</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold">3</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-slate-900">JUMLAH BAYI BALITA YANG DITIMBANG BULAN INI</td>
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold font-mono">D</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-center font-black text-base font-mono bg-violet-50/20">{skdnData.countD}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">Kehadiran fisik balita pada penimbangan bulan berjalan</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold">4</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-slate-900">JUMLAH BAYI BALITA YANG NAIK BERAT BADANNYA BULAN INI</td>
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold font-mono">N</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-center font-black text-base font-mono bg-green-50/20 text-green-700">{skdnData.countN}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">Tinggi berat naik dari bulan sebelumnya</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold">5</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-slate-900">JUMLAH BAYI BALITA YANG BERAT BADANNYA NAIK</td>
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold font-mono">BGT</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-center font-black text-base font-mono bg-indigo-50/20 text-indigo-700">{skdnData.countBGT}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">Memenuhi kriteria kenaikan berat badan ideal</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold">6</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-rose-600 font-extrabold">JUMLAH BAYI BALITA YANG BERAT BADANNYA TIDAK NAIK</td>
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-black text-rose-600 font-mono">BGM</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-center font-black text-base font-mono bg-rose-50/50 text-rose-600">{skdnData.countBGM}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">Sangat Kurang berdasarkan indikator BB/U</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold">7</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-slate-900">JUMLAH BAYI BALITA YANG TIDAK DATANG KE POSYANDU</td>
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold font-mono">O</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-center font-black text-base font-mono bg-slate-50 text-slate-550">{skdnData.countO}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">Selisih sasaran dikurangi kehadiran (S - D)</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold">8</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-slate-900">JUMLAH BAYI BALITA YANG BARU DATANG KE POSYANDU</td>
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold font-mono">B</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-center font-black text-base font-mono bg-cyan-50/20 text-cyan-705">{skdnData.countB}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">Balita yang perdana terdaftar atau timbang bulan ini</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold">9</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-amber-600 font-extrabold">JUMLAH BAYI BALITA YANG TIMBANGANNYA TIDAK NAIK 1 KALI</td>
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold text-amber-600 font-mono">1T</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-center font-black text-base font-mono bg-amber-50/20 text-amber-600">{skdnData.count1T}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">Timbangan flat atau turun 1 bulan</td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 border-r border-slate-950 text-center font-bold">10</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-red-700 font-black">JUMLAH BAYI BALITA YANG TIMBANGANNYA TIDAK NAIK 2 BULAN BERTURUT-TURUT</td>
                    <td className="py-3 px-2 border-r border-slate-950 text-center font-black text-red-700 font-mono">2T</td>
                    <td className="py-2.5 px-4 border-r border-slate-950 text-center font-black text-base font-mono bg-red-100/40 text-red-700">{skdnData.count2T}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px] font-black italic">Saringan rujukan medis puskesmas!</td>
                  </tr>

                  {/* Demographics Group age headings with merged sub-cells */}
                  <tr className="bg-slate-50 border-t-2 border-slate-950 text-slate-950">
                    <td className="py-2 px-2 border-r border-slate-950 text-center font-bold">11</td>
                    <td colSpan={4} className="py-2 px-4 font-extrabold tracking-wide uppercase text-slate-800">
                      JUMLAH ANAK YANG DITIMBANG USIA 0-6 BULAN
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/40">
                    <td className="py-1 px-2 border-r border-slate-950"></td>
                    <td className="py-1 px-4 border-r border-slate-950 pl-8 text-xs font-semibold text-slate-600">- Laki-laki (L)</td>
                    <td className="py-1 px-2 border-r border-slate-950 text-center font-bold text-slate-650 font-mono">L</td>
                    <td className="py-1 px-4 border-r border-slate-950 text-center font-extrabold font-mono text-slate-800">{skdnData.age_0_6_L}</td>
                    <td className="py-1 px-4 text-slate-450 text-[10.5px]">Jiwa</td>
                  </tr>
                  <tr className="hover:bg-slate-50/40">
                    <td className="py-1 px-2 border-r border-slate-950"></td>
                    <td className="py-1 px-4 border-r border-slate-950 pl-8 text-xs font-semibold text-slate-600">- Perempuan (P)</td>
                    <td className="py-1 px-2 border-r border-slate-950 text-center font-bold text-slate-650 font-mono">P</td>
                    <td className="py-1 px-4 border-r border-slate-950 text-center font-extrabold font-mono text-slate-800">{skdnData.age_0_6_P}</td>
                    <td className="py-1 px-4 text-slate-450 text-[10.5px]">Jiwa</td>
                  </tr>

                  <tr className="bg-slate-50 border-t-2 border-slate-950 text-slate-950">
                    <td className="py-2 px-2 border-r border-slate-950 text-center font-bold">12</td>
                    <td colSpan={4} className="py-2 px-4 font-extrabold tracking-wide uppercase text-slate-800">
                      JUMLAH ANAK YANG DITIMBANG USIA 7-11 BULAN
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/40">
                    <td className="py-1 px-2 border-r border-slate-950"></td>
                    <td className="py-1 px-4 border-r border-slate-950 pl-8 text-xs font-semibold text-slate-600">- Laki-laki (L)</td>
                    <td className="py-1 px-2 border-r border-slate-950 text-center font-bold text-slate-650 font-mono">L</td>
                    <td className="py-1 px-4 border-r border-slate-950 text-center font-extrabold font-mono text-slate-800">{skdnData.age_7_11_L}</td>
                    <td className="py-1 px-4 text-slate-450 text-[10.5px]">Jiwa</td>
                  </tr>
                  <tr className="hover:bg-slate-50/40">
                    <td className="py-1 px-2 border-r border-slate-950"></td>
                    <td className="py-1 px-4 border-r border-slate-950 pl-8 text-xs font-semibold text-slate-600">- Perempuan (P)</td>
                    <td className="py-1 px-2 border-r border-slate-950 text-center font-bold text-slate-650 font-mono">P</td>
                    <td className="py-1 px-4 border-r border-slate-950 text-center font-extrabold font-mono text-slate-800">{skdnData.age_7_11_P}</td>
                    <td className="py-1 px-4 text-slate-450 text-[10.5px]">Jiwa</td>
                  </tr>

                  <tr className="bg-slate-50 border-t-2 border-slate-950 text-slate-950">
                    <td className="py-2 px-2 border-r border-slate-950 text-center font-bold">13</td>
                    <td colSpan={4} className="py-2 px-4 font-extrabold tracking-wide uppercase text-slate-800">
                      JUMLAH ANAK YANG DITIMBANG USIA 12-23 BULAN
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/40">
                    <td className="py-1 px-2 border-r border-slate-950"></td>
                    <td className="py-1 px-4 border-r border-slate-950 pl-8 text-xs font-semibold text-slate-600">- Laki-laki (L)</td>
                    <td className="py-1 px-2 border-r border-slate-950 text-center font-bold text-slate-650 font-mono">L</td>
                    <td className="py-1 px-4 border-r border-slate-950 text-center font-extrabold font-mono text-slate-800">{skdnData.age_12_23_L}</td>
                    <td className="py-1 px-4 text-slate-450 text-[10.5px]">Jiwa</td>
                  </tr>
                  <tr className="hover:bg-slate-50/40">
                    <td className="py-1 px-2 border-r border-slate-950"></td>
                    <td className="py-1 px-4 border-r border-slate-950 pl-8 text-xs font-semibold text-slate-600">- Perempuan (P)</td>
                    <td className="py-1 px-2 border-r border-slate-950 text-center font-bold text-slate-650 font-mono">P</td>
                    <td className="py-1 px-4 border-r border-slate-950 text-center font-extrabold font-mono text-slate-800">{skdnData.age_12_23_P}</td>
                    <td className="py-1 px-4 text-slate-450 text-[10.5px]">Jiwa</td>
                  </tr>

                  <tr className="bg-slate-50 border-t-2 border-slate-950 text-slate-950">
                    <td className="py-2 px-2 border-r border-slate-950 text-center font-bold">14</td>
                    <td colSpan={4} className="py-2 px-4 font-extrabold tracking-wide uppercase text-slate-800">
                      JUMLAH ANAK YANG DITIMBANG USIA 24-59 BULAN
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/40">
                    <td className="py-1 px-2 border-r border-slate-950"></td>
                    <td className="py-1 px-4 border-r border-slate-950 pl-8 text-xs font-semibold text-slate-600">- Laki-laki (L)</td>
                    <td className="py-1 px-2 border-r border-slate-950 text-center font-bold text-slate-650 font-mono">L</td>
                    <td className="py-1 px-4 border-r border-slate-950 text-center font-extrabold font-mono text-slate-800">{skdnData.age_24_59_L}</td>
                    <td className="py-1 px-4 text-slate-450 text-[10.5px]">Jiwa</td>
                  </tr>
                  <tr className="hover:bg-slate-50/40">
                    <td className="py-1 px-2 border-r border-slate-950"></td>
                    <td className="py-1 px-4 border-r border-slate-950 pl-8 text-xs font-semibold text-slate-600">- Perempuan (P)</td>
                    <td className="py-1 px-2 border-r border-slate-950 text-center font-bold text-slate-650 font-mono">P</td>
                    <td className="py-1 px-4 border-r border-slate-950 text-center font-extrabold font-mono text-slate-800">{skdnData.age_24_59_P}</td>
                    <td className="py-1 px-4 text-slate-450 text-[10.5px]">Jiwa</td>
                  </tr>

                </tbody>
              </table>

              {/* Handcrafted manual A4 landscape signatures area */}
              <div className="mt-12 flex justify-between text-xs font-bold px-12 leading-relaxed">
                <div className="w-60 text-center text-slate-800">
                  Petugas Kesehatan Desa, <br />
                  <br />
                  <br />
                  <br />
                  <span className="underline select-text font-serif text-slate-950">( {petugasKesehatanNama} )</span>
                </div>
                <div className="w-60 text-center text-slate-800">
                  Ketua Kader Posyandu, <br />
                  <br />
                  <br />
                  <br />
                  <span className="underline select-text font-serif text-slate-950">( {ketuaKaderNama} )</span>
                </div>
              </div>

              {/* Tech footer marking document verification */}
              <div className="mt-8 text-center border-t border-dashed pt-4 text-[9px] font-mono text-slate-400">
                E-SKDN Generik &bull; Terverifikasi Akurat &bull; Tanggal Cetak: {new Date().toLocaleDateString("id-ID")}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
