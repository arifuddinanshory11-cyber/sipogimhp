import { 
  LayoutDashboard, 
  Baby, 
  Scale, 
  MapPin, 
  FileSpreadsheet, 
  FileText, 
  History, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  Building2
} from "lucide-react";
import { UserSession } from "../types";

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  session: UserSession | null;
  logout: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  darkMode: boolean;
}

export default function Sidebar({
  currentTab,
  setTab,
  session,
  logout,
  isOpen,
  setIsOpen,
  darkMode
}: SidebarProps) {
  if (!session) return null;

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ADMIN_DESA", "ADMIN_POSYANDU"] },
    { id: "balita", label: "Data Balita", icon: Baby, roles: ["SUPER_ADMIN", "ADMIN_DESA", "ADMIN_POSYANDU"] },
    { id: "penimbangan", label: "Penimbangan", icon: Scale, roles: ["SUPER_ADMIN", "ADMIN_POSYANDU"] },
    { id: "posyandu_desa", label: "Master Posyandu & Desa", icon: Building2, roles: ["SUPER_ADMIN"] },
    { id: "laporan", label: "Laporan & Ekspor", icon: FileText, roles: ["SUPER_ADMIN", "ADMIN_DESA", "ADMIN_POSYANDU"] },
    { id: "import_excel", label: "Import Excel/CSV", icon: FileSpreadsheet, roles: ["SUPER_ADMIN", "ADMIN_POSYANDU"] },
    { id: "logs", label: "Log Aktivitas", icon: History, roles: ["SUPER_ADMIN"] },
    { id: "settings", label: "Sistem & Backup", icon: Settings, roles: ["SUPER_ADMIN", "ADMIN_DESA", "ADMIN_POSYANDU"] }
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(session.role));

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return { text: "Super Admin", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" };
      case "ADMIN_DESA":
        return { text: "Admin Desa", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
      default:
        return { text: `Posyandu`, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    }
  };

  const badge = getRoleBadge(session.role);

  return (
    <aside 
      id="app-sidebar"
      className={`
        fixed md:relative top-0 left-0 h-full z-40 
        flex flex-col transition-all duration-300 ease-in-out border-r
        ${isOpen ? "w-64" : "w-0 md:w-20"}
        ${darkMode 
          ? "bg-slate-900 border-slate-800 text-slate-100" 
          : "bg-white border-slate-200 text-slate-800"}
      `}
    >
      {/* Brand area */}
      <div className="flex items-center justify-between p-4 border-b border-inherit min-h-[64px]">
        {isOpen ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-lg select-none">
              P
            </div>
            <div>
              <h1 className="font-bold text-md leading-tight text-teal-600 dark:text-teal-400">SI-PoGi</h1>
              <p className="text-[10px] text-slate-500 font-medium">Posyandu & Gizi</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-lg mx-auto select-none">
            P
          </div>
        )}

        {/* Collapse Button */}
        <button 
          id="btn-sidebar-toggle"
          onClick={() => setIsOpen(!isOpen)} 
          className={`
            hidden md:flex items-center justify-center p-1.5 rounded-lg border text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors
            ${darkMode ? "border-slate-800 bg-slate-950 hover:text-slate-200" : "border-slate-200 bg-slate-50"}
          `}
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* User profile section */}
      {isOpen && (
        <div className={`p-4 mx-3 my-4 rounded-xl border flex flex-col ${darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
              {session.nama.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-semibold text-xs truncate leading-normal text-slate-900 dark:text-slate-50">{session.nama}</h3>
              <p className="text-[9px] text-teal-605 font-bold truncate">Puskesmas Nanga Mahap</p>
              <p className="text-[10px] text-slate-500 font-mono truncate">{session.username}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.color}`}>
              {badge.text}
            </span>
          </div>
        </div>
      )}

      {/* Navigation menu */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              id={`nav-item-${item.id}`}
              key={item.id}
              onClick={() => {
                setTab(item.id);
                // On mobile we auto collapse on page select
                if (window.innerWidth < 768) {
                  setIsOpen(false);
                }
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative
                ${isActive 
                  ? "bg-teal-500 text-white shadow-sm font-semibold" 
                  : darkMode 
                    ? "text-slate-400 hover:bg-slate-800 hover:text-white" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-teal-600"}
              `}
            >
              <Icon size={18} className={isActive ? "text-white" : "group-hover:scale-110 transition-transform"} />
              
              {isOpen ? (
                <span className="truncate">{item.label}</span>
              ) : (
                <span className="absolute left-16 bg-slate-950 text-white text-[10px] rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-inherit">
        <button
          id="btn-logout-sidebar"
          onClick={logout}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-red-500 hover:bg-red-500/10
            ${!isOpen && "justify-center"}
          `}
        >
          <LogOut size={18} />
          {isOpen && <span>Keluar Sistem</span>}
        </button>
      </div>
    </aside>
  );
}
