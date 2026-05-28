import React, { useState, useMemo } from "react";
import { 
  History, 
  Terminal, 
  Search, 
  Trash2, 
  ShieldCheck, 
  Info, 
  UserPlus, 
  MapPin, 
  FileSpreadsheet
} from "lucide-react";
import { UserLog } from "../types";

interface AktivitasLogProps {
  logs: UserLog[];
  onClearLogs: () => void;
  darkMode: boolean;
}

export default function AktivitasLog({
  logs,
  onClearLogs,
  darkMode
}: AktivitasLogProps) {
  
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return logs
      .filter(log => 
        log.username.toLowerCase().includes(q) || 
        log.activity.toLowerCase().includes(q) || 
        log.role.toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, searchQuery]);

  const getActivityIcon = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes("login")) return <ShieldCheck className="text-green-500" size={14} />;
    if (t.includes("penimbangan") || t.includes("timbang")) return <History className="text-teal-500" size={14} />;
    if (t.includes("import") || t.includes("excel")) return <FileSpreadsheet className="text-indigo-505 text-indigo-505" size={14} />;
    if (t.includes("registrasi") || t.includes("daftar")) return <UserPlus className="text-sky-500" size={14} />;
    return <Terminal className="text-slate-400" size={14} />;
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Saringan */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-3 justify-between items-center
        ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-205"}`}>
        
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            id="input-log-filter-query"
            type="text"
            placeholder="Cari aktivitas, username, level..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-2 pl-9 pr-4 text-xs font-semibold rounded-lg border focus:outline-none
              ${darkMode ? "bg-slate-900 border-slate-800 text-slate-105" : "bg-slate-50 border-slate-200"}`}
          />
        </div>

        <button
          id="btn-clear-activities"
          onClick={() => {
            if (confirm("Bersihkan seluruh antrean log aktivitas keamanan sediaan virtual?")) {
              onClearLogs();
            }
          }}
          className="w-full sm:w-auto px-4 py-2 border border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 size={13} /> Bersihkan Log
        </button>
      </div>

      {/* Log list table */}
      <div className={`border rounded-2xl overflow-hidden ${darkMode ? "bg-slate-950 border-slate-905" : "bg-white border-slate-200"}`}>
        <div className="p-4 border-b border-inherit bg-slate-500/5 flex justify-between items-center">
          <h4 className="font-extrabold text-[10px] uppercase tracking-widest font-mono text-slate-400">Arsip Audit Trail SI-PoGi</h4>
          <span className="text-[10px] text-slate-404 font-mono">Tercatat {filteredLogs.length} Aktivitas</span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-inherit text-slate-400 font-mono text-[9px] font-extrabold uppercase">
                <th className="p-3">Waktu Log</th>
                <th className="p-3">Petugas (Username)</th>
                <th className="p-3">Hak Akses</th>
                <th className="p-3">Arus Kejadian / Aktivitas</th>
                <th className="p-3">Alamat Virtual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900/40 text-[11px] font-medium text-slate-600 dark:text-slate-350">
              {filteredLogs.map(log => {
                const dateObj = new Date(log.timestamp);
                const formattedTime = dateObj.toLocaleTimeString("id-ID") + " - " + dateObj.toLocaleDateString("id-ID");
                return (
                  <tr key={log.id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="p-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">{formattedTime}</td>
                    <td className="p-3 font-bold text-slate-805 dark:text-slate-105">{log.username}</td>
                    <td className="p-3 font-mono">
                      <span className="px-1.5 py-0.2 rounded bg-slate-500/10 font-bold text-[9px]">
                        {log.role}
                      </span>
                    </td>
                    <td className="p-3 flex items-center gap-2 pt-4">
                      {getActivityIcon(log.activity)}
                      <span className="font-sans font-semibold text-slate-800 dark:text-slate-205">{log.activity}</span>
                    </td>
                    <td className="p-3 font-mono font-normal text-slate-400">{log.ip_address || "127.0.0.1"}</td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                    Log aktivitas kosong atau tidak ada yang cocok.
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
