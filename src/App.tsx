import React, { useState, useEffect } from "react";
import { 
  initializeLocalStorageDatabase, 
  resetDatabaseToDefault 
} from "./dataSeed";
import { 
  Desa, 
  Posyandu, 
  DataAnak, 
  Penimbangan, 
  UserSession, 
  UserLog 
} from "./types";

// Dynamic Views
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import DataBalita from "./components/DataBalita";
import DataPenimbangan from "./components/DataPenimbangan";
import MasterPosyandu from "./components/MasterPosyandu";
import ExcelImportExport from "./components/ExcelImportExport";
import LaporanData from "./components/LaporanData";
import SettingsBackup from "./components/SettingsBackup";
import AktivitasLog from "./components/AktivitasLog";
import LoginScreen from "./components/LoginScreen";

export default function App() {
  
  // App authentication state
  const [session, setSession] = useState<UserSession | null>(null);

  // App UI states
  const [currentTab, setTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [quickSearch, setQuickSearch] = useState<string>("");

  // DB States
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [posyanduList, setPosyanduList] = useState<Posyandu[]>([]);
  const [childrenList, setChildrenList] = useState<DataAnak[]>([]);
  const [weighingsList, setWeighingsList] = useState<Penimbangan[]>([]);
  const [logsList, setLogsList] = useState<UserLog[]>([]);

  // Initialize DB on mount and load values
  useEffect(() => {
    initializeLocalStorageDatabase();
    loadDatabaseFromLocalStorage();

    // Check if user has explicit session alive already
    const storedSession = localStorage.getItem("USER_SESSION");
    if (storedSession) {
      try {
        setSession(JSON.parse(storedSession));
      } catch (e) {
        localStorage.removeItem("USER_SESSION");
      }
    }

    // Check saved theme preference
    const savedTheme = localStorage.getItem("THEME_PREFERENCE");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Set system dark mode classes on toggle
  const handleToggleDarkMode = (dark: boolean) => {
    setDarkMode(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("THEME_PREFERENCE", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("THEME_PREFERENCE", "light");
    }
  };

  const loadDatabaseFromLocalStorage = () => {
    setDesaList(JSON.parse(localStorage.getItem("DESA_DB") || "[]"));
    setPosyanduList(JSON.parse(localStorage.getItem("POSYANDU_DB") || "[]"));
    setChildrenList(JSON.parse(localStorage.getItem("DATA_ANAK_DB") || "[]"));
    setWeighingsList(JSON.parse(localStorage.getItem("PENIMBANGAN_DB") || "[]"));
    setLogsList(JSON.parse(localStorage.getItem("USER_LOGS_DB") || "[]"));
  };

  // Log activity with timestamp
  const logActivity = (activity: string) => {
    const actor = session ? session.username : "guest";
    const role = session ? session.role : "GUEST";
    
    // Check if in browser env
    const newLog: UserLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      username: actor,
      role: role,
      activity: activity,
      ip_address: "127.0.0.1"
    };

    const updatedLogs = [newLog, ...logsList];
    setLogsList(updatedLogs);
    localStorage.setItem("USER_LOGS_DB", JSON.stringify(updatedLogs));
  };

  // Auth Operations
  const handleLoginSuccess = (userSession: UserSession) => {
    setSession(userSession);
    localStorage.setItem("USER_SESSION", JSON.stringify(userSession));
    
    // Automatically reset tab for non-admin to dashboard
    setTab("dashboard");

    // Add action log log
    // Create direct local storage updates to logging
    const actor = userSession.username;
    const role = userSession.role;
    const newLog: UserLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      username: actor,
      role: role,
      activity: `Petugas ${userSession.nama} berhasil masuk ke aplikasi (Sign In)`,
      ip_address: "127.0.0.1"
    };
    const dbLogs = JSON.parse(localStorage.getItem("USER_LOGS_DB") || "[]");
    const updated = [newLog, ...dbLogs];
    setLogsList(updated);
    localStorage.setItem("USER_LOGS_DB", JSON.stringify(updated));
  };

  const handleLogout = () => {
    if (session) {
      logActivity(`User ${session.nama} logout dari sistem`);
    }
    setSession(null);
    localStorage.removeItem("USER_SESSION");
    setTab("dashboard");
    setQuickSearch("");
  };

  // Reset entire database to default
  const handleResetDb = () => {
    resetDatabaseToDefault();
    loadDatabaseFromLocalStorage();
    
    const newLog: UserLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      username: session ? session.username : "admin",
      role: session ? session.role : "SUPER_ADMIN",
      activity: "Database di-reset total ke pengaturan awal demo bawaan.",
      ip_address: "127.0.0.1"
    };
    // Save
    const updatedLogs = [newLog];
    setLogsList(updatedLogs);
    localStorage.setItem("USER_LOGS_DB", JSON.stringify(updatedLogs));
    alert("Database Local Storage berhasil disetel ulang ke sediaan demo baku.");
  };

  // KIDS CRUD
  const handleAddAnak = (anak: DataAnak) => {
    const updated = [...childrenList, anak];
    setChildrenList(updated);
    localStorage.setItem("DATA_ANAK_DB", JSON.stringify(updated));
    logActivity(`Mendaftarkan anak baru: ${anak.nama_anak} (NIK: ${anak.nik_anak})`);
  };

  const handleEditAnak = (anak: DataAnak) => {
    const updated = childrenList.map(a => a.id_anak === anak.id_anak ? anak : a);
    setChildrenList(updated);
    localStorage.setItem("DATA_ANAK_DB", JSON.stringify(updated));
    logActivity(`Memperbarui profil biodata anak: ${anak.nama_anak} (ID: ${anak.id_anak})`);
  };

  const handleDeleteAnak = (id: string) => {
    const deletedChild = childrenList.find(a => a.id_anak === id);
    const label = deletedChild ? deletedChild.nama_anak : id;
    
    const updatedKids = childrenList.filter(a => a.id_anak !== id);
    setChildrenList(updatedKids);
    localStorage.setItem("DATA_ANAK_DB", JSON.stringify(updatedKids));

    // Also cascade delete corresponding children weighings
    const updatedWeighings = weighingsList.filter(w => w.id_anak !== id);
    setWeighingsList(updatedWeighings);
    localStorage.setItem("PENIMBANGAN_DB", JSON.stringify(updatedWeighings));

    logActivity(`Menghapus data balita ${label} beserta seluruh catatan riwayat penimbangan.`);
  };

  // WEIGHING CRUD
  const handleAddPenimbangan = (p: Penimbangan) => {
    const updated = [...weighingsList, p];
    setWeighingsList(updated);
    localStorage.setItem("PENIMBANGAN_DB", JSON.stringify(updated));

    const kid = childrenList.find(a => a.id_anak === p.id_anak);
    const kidLabel = kid ? kid.nama_anak : p.id_anak;
    logActivity(`Mencatat hasil penimbangan bulanan ${kidLabel} (BB: ${p.berat_badan}kg, Selisih Umur: ${p.umur_bulan} bln, Status Gizi: ${p.status_gizi})`);
  };

  const handleDeletePenimbangan = (id: string) => {
    const target = weighingsList.find(w => w.id_penimbangan === id);
    const updated = weighingsList.filter(w => w.id_penimbangan !== id);
    setWeighingsList(updated);
    localStorage.setItem("PENIMBANGAN_DB", JSON.stringify(updated));

    if (target) {
      const kid = childrenList.find(a => a.id_anak === target.id_anak);
      logActivity(`Menghapus entri rekam penimbangan ID: ${id} milik ${kid ? kid.nama_anak : target.id_anak}`);
    }
  };

  // POSYANDU & DESA CRUD
  const handleAddDesa = (desa: Desa) => {
    const updated = [...desaList, desa];
    setDesaList(updated);
    localStorage.setItem("DESA_DB", JSON.stringify(updated));
    logActivity(`Menambahkan wilayah kelurahan/desa pembinaan baru: ${desa.nama_desa}`);
  };

  const handleEditDesa = (desa: Desa) => {
    const updated = desaList.map(d => d.id_desa === desa.id_desa ? desa : d);
    setDesaList(updated);
    localStorage.setItem("DESA_DB", JSON.stringify(updated));
    logActivity(`Mengubah rincian demografi wilayah kelurahan/desa: ${desa.nama_desa}`);
  };

  const handleDeleteDesa = (id: string) => {
    const target = desaList.find(d => d.id_desa === id);
    const updated = desaList.filter(d => d.id_desa !== id);
    setDesaList(updated);
    localStorage.setItem("DESA_DB", JSON.stringify(updated));

    logActivity(`Menghapus desa pembina ${target ? target.nama_desa : id} dari master data.`);
  };

  const handleAddPosyandu = (pos: Posyandu) => {
    const updated = [...posyanduList, pos];
    setPosyanduList(updated);
    localStorage.setItem("POSYANDU_DB", JSON.stringify(updated));
    logActivity(`Mendaftarkan akun posyandu pembina baru: ${pos.nama_posyandu} (Kader: ${pos.nama_kader})`);
  };

  const handleEditPosyandu = (pos: Posyandu) => {
    const updated = posyanduList.map(p => p.id_posyandu === pos.id_posyandu ? pos : p);
    setPosyanduList(updated);
    localStorage.setItem("POSYANDU_DB", JSON.stringify(updated));
    logActivity(`Memperbarui profil posyandu ${pos.nama_posyandu} beserta kata sandi masuk`);
  };

  const handleDeletePosyandu = (id: string) => {
    const target = posyanduList.find(p => p.id_posyandu === id);
    const updated = posyanduList.filter(p => p.id_posyandu !== id);
    setPosyanduList(updated);
    localStorage.setItem("POSYANDU_DB", JSON.stringify(updated));

    logActivity(`Menghapus posyandu binaan ${target ? target.nama_posyandu : id}`);
  };

  // Reset Posyandu Password from Settings 
  const handleResetPosyanduPassword = (id: string, newPass: string) => {
    const updated = posyanduList.map(p => {
      if (p.id_posyandu === id) {
        return { ...p, password: newPass };
      }
      return p;
    });
    setPosyanduList(updated);
    localStorage.setItem("POSYANDU_DB", JSON.stringify(updated));
    
    const pos = posyanduList.find(p => p.id_posyandu === id);
    logActivity(`Super Admin menyetel ulang (reset) sandi posyandu ${pos ? pos.nama_posyandu : id}.`);
  };

  // EXCEL IMPORTS SQUEEZE
  const handleImportAnak = (newAnak: DataAnak[]) => {
    const updated = [...childrenList, ...newAnak];
    setChildrenList(updated);
    localStorage.setItem("DATA_ANAK_DB", JSON.stringify(updated));
    logActivity(`Mengimpor bulk ${newAnak.length} data balita via file excel.`);
  };

  const handleImportPenimbangan = (newPenimbangan: Penimbangan[]) => {
    const updated = [...weighingsList, ...newPenimbangan];
    setWeighingsList(updated);
    localStorage.setItem("PENIMBANGAN_DB", JSON.stringify(updated));
    logActivity(`Mengimpor bulk ${newPenimbangan.length} catatan penimbangan bulanan via file excel.`);
  };

  // RESTORE FROM JSON 
  const handleRestoreDatabase = (restored: { desa: Desa[]; posyandu: Posyandu[]; logs: UserLog[] }) => {
    setDesaList(restored.desa);
    setPosyanduList(restored.posyandu);
    setLogsList(restored.logs);
    
    // Also re-fetch children & weighings that took slot
    setChildrenList(JSON.parse(localStorage.getItem("DATA_ANAK_DB") || "[]"));
    setWeighingsList(JSON.parse(localStorage.getItem("PENIMBANGAN_DB") || "[]"));

    logActivity(`Melakukan pemulihan (restore) database sediaan dari cadangan arsip JSON.`);
  };

  const handleClearLogs = () => {
    setLogsList([]);
    localStorage.setItem("USER_LOGS_DB", JSON.stringify([]));
  };


  // If no auth session alive, render centered Login portal 
  if (!session) {
    return (
      <LoginScreen 
        posyanduList={posyanduList} 
        onLoginSuccess={handleLoginSuccess}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-150 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-[#F1F5F9] text-slate-900"}`}>
      
      {/* Sidebar navigation */}
      <Sidebar 
        currentTab={currentTab} 
        setTab={setTab} 
        session={session} 
        logout={handleLogout} 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        darkMode={darkMode}
      />

      {/* Main responsive layout container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <Header 
          currentTab={currentTab} 
          session={session} 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen} 
          darkMode={darkMode}
          setDarkMode={handleToggleDarkMode}
          resetDb={handleResetDb} 
          logout={handleLogout}
          quickSearch={quickSearch}
          setQuickSearch={setQuickSearch}
        />

        {/* Dynamic page routes render box */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto pb-12">
          
          {currentTab === "dashboard" && (
            <Dashboard 
              anakList={childrenList} 
              penimbanganList={weighingsList} 
              desaList={desaList} 
              posyanduList={posyanduList}
              darkMode={darkMode}
              setTab={setTab}
              quickSearch={quickSearch}
            />
          )}

          {currentTab === "balita" && (
            <DataBalita 
              anakList={childrenList} 
              penimbanganList={weighingsList} 
              desaList={desaList} 
              posyanduList={posyanduList}
              session={session}
              darkMode={darkMode}
              onAddAnak={handleAddAnak}
              onEditAnak={handleEditAnak}
              onDeleteAnak={handleDeleteAnak}
              quickSearch={quickSearch}
            />
          )}

          {currentTab === "penimbangan" && (
            <DataPenimbangan 
              anakList={childrenList} 
              penimbanganList={weighingsList} 
              desaList={desaList} 
              posyanduList={posyanduList}
              session={session}
              darkMode={darkMode}
              onAddPenimbangan={handleAddPenimbangan}
              onDeletePenimbangan={handleDeletePenimbangan}
              quickSearch={quickSearch}
            />
          )}

          {currentTab === "posyandu_desa" && (
            <MasterPosyandu 
              desaList={desaList} 
              posyanduList={posyanduList} 
              darkMode={darkMode}
              onAddDesa={handleAddDesa}
              onEditDesa={handleEditDesa}
              onDeleteDesa={handleDeleteDesa}
              onAddPosyandu={handleAddPosyandu}
              onEditPosyandu={handleEditPosyandu}
              onDeletePosyandu={handleDeletePosyandu}
            />
          )}

          {currentTab === "laporan" && (
            <LaporanData 
              anakList={childrenList}
              penimbanganList={weighingsList}
              desaList={desaList}
              posyanduList={posyanduList}
              session={session}
              darkMode={darkMode}
            />
          )}

          {currentTab === "import_excel" && (
            <ExcelImportExport 
              anakList={childrenList}
              penimbanganList={weighingsList}
              desaList={desaList}
              posyanduList={posyanduList}
              session={session}
              darkMode={darkMode}
              onImportAnak={handleImportAnak}
              onImportPenimbangan={handleImportPenimbangan}
            />
          )}

          {currentTab === "logs" && (
            <AktivitasLog 
              logs={logsList}
              onClearLogs={handleClearLogs}
              darkMode={darkMode}
            />
          )}

          {currentTab === "settings" && (
            <SettingsBackup 
              desaList={desaList}
              posyanduList={posyanduList}
              userLogs={logsList}
              session={session}
              darkMode={darkMode}
              onRestoreDatabase={handleRestoreDatabase}
              onResetDbToDefault={handleResetDb}
              onClearLogs={handleClearLogs}
              onResetPosyanduPassword={handleResetPosyanduPassword}
            />
          )}

        </main>
      </div>

    </div>
  );
}
