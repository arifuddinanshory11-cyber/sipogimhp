import { 
  Sun, 
  Moon, 
  Menu, 
  Search,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { UserSession } from "../types";

interface HeaderProps {
  currentTab: string;
  session: UserSession | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  resetDb: () => void;
  logout: () => void;
  quickSearch: string;
  setQuickSearch: (search: string) => void;
}

export default function Header({
  currentTab,
  session,
  sidebarOpen,
  setSidebarOpen,
  darkMode,
  setDarkMode,
  resetDb,
  logout,
  quickSearch,
  setQuickSearch
}: HeaderProps) {
  
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "dashboard":
        return "Dashboard Utama";
      case "balita":
        return "Pencatatan Data Balita";
      case "penimbangan":
        return "Input Hasil Penimbangan Bulanan";
      case "posyandu_desa":
        return "Master Data Posyandu & Desa";
      case "laporan":
        return "Laporan & Ekspor Data";
      case "import_excel":
        return "Import Data via Excel (.xlsx)";
      case "logs":
        return "Log Aktivitas Keamanan";
      case "settings":
        return "Pengaturan Sistem & Database";
      default:
        return "SI-PoGi";
    }
  };

  return (
    <header className={`
      h-16 flex items-center justify-between px-4 sticky top-0 z-30 border-b transition-colors duration-150
      ${darkMode ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white/95 border-slate-200 text-slate-800"}
      backdrop-blur-sm
    `}>
      {/* Left section: Hamburger button & title */}
      <div className="flex items-center gap-3">
        <button
          id="btn-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`
            p-2 rounded-lg border text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors
            ${darkMode ? "border-slate-800 bg-slate-950 hover:text-slate-200" : "border-slate-200 bg-slate-50"}
          `}
        >
          <Menu size={18} />
        </button>
        <div>
          <h2 className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-50 md:text-base">
            {getTabTitle(currentTab)}
          </h2>
          <p className="text-[10px] text-slate-500 font-medium hidden md:block">
            SI-PoGi : Sistem Informasi Posyandu dan Monitoring Status Gizi
          </p>
        </div>
      </div>

      {/* Center: Quick Search Bar for global lookup */}
      {["dashboard", "balita", "penimbangan"].includes(currentTab) && (
        <div className="hidden lg:flex items-center relative w-72">
          <Search size={14} className="absolute left-3 text-slate-400" />
          <input
            id="input-global-search"
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Cari balita, NIK, desa..."
            className={`
              w-full py-1.5 pl-9 pr-3 rounded-lg text-xs font-medium border focus:outline-none transition-all
              ${darkMode 
                ? "bg-slate-950 border-slate-850 text-slate-200 focus:border-teal-500/80" 
                : "bg-slate-50 border-slate-200 text-slate-800 focus:border-teal-500"}
            `}
          />
          {quickSearch && (
            <button 
              onClick={() => setQuickSearch("")}
              className="absolute right-2 px-1 text-[9px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Right Section: Toggles & Reset seed */}
      <div className="flex items-center gap-2">
        {/* Reset Database Button to revert to default sample values */}
        <button
          id="btn-reset-db-header"
          onClick={() => {
            if (confirm("Reset ulang seluruh database lokal ke data bawaan demo? Semua data yang Anda tambahkan akan terhapus.")) {
              resetDb();
            }
          }}
          title="Reset database demo"
          className={`
            px-2 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all
            ${darkMode 
              ? "border-slate-800 hover:bg-slate-850 hover:text-teal-400 text-slate-400" 
              : "border-slate-200 hover:bg-slate-50 hover:text-teal-600 text-slate-600"}
          `}
        >
          <RefreshCw size={12} />
          <span className="hidden sm:inline">Reset Demo</span>
        </button>

        {/* Dark Mode toggle */}
        <button
          id="btn-darkMode-toggle"
          onClick={() => setDarkMode(!darkMode)}
          className={`
            p-2 rounded-lg border text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all
            ${darkMode ? "border-slate-800 bg-slate-950 hover:text-slate-200" : "border-slate-200 bg-slate-50"}
          `}
          title={darkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
        >
          {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
        </button>

        {/* User context badge */}
        {session && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold leading-none text-slate-850 dark:text-slate-100">{session.nama}</span>
              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider font-mono">
                {session.role} &bull; <span className="text-teal-605 dark:text-teal-400">Puskesmas Nanga Mahap</span>
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-300 font-bold border border-teal-500/20">
              {session.nama.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
