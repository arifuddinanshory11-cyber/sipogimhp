import React, { useState } from "react";
import { 
  Building2, 
  MapPin, 
  Lock, 
  User, 
  Heart, 
  AlertCircle, 
  Info,
  ShieldCheck
} from "lucide-react";
import { Posyandu, Desa, UserSession } from "../types";

interface LoginScreenProps {
  posyanduList: Posyandu[];
  onLoginSuccess: (session: UserSession) => void;
  darkMode: boolean;
}

export default function LoginScreen({
  posyanduList,
  onLoginSuccess,
  darkMode
}: LoginScreenProps) {
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (!u || !p) {
      setErrorMessage("Harap masukkan ID Login dan Password Anda.");
      return;
    }

    // Role-based auth mapping
    // 1. SUPER ADMIN check
    if (u === "admin" && p === "admin") {
      onLoginSuccess({
        role: "SUPER_ADMIN",
        username: "admin",
        nama: "Dinas Kesehatan Utama"
      });
      return;
    }

    // 2. ADMIN DESA checks
    if (u === "sukamaju" && p === "password123") {
      onLoginSuccess({
        role: "ADMIN_DESA",
        username: "sukamaju",
        nama: "Desa Sukamaju",
        id_desa: "DESA001"
      });
      return;
    }
    if (u === "bojong" && p === "password123") {
      onLoginSuccess({
        role: "ADMIN_DESA",
        username: "bojong",
        nama: "Desa Bojong",
        id_desa: "DESA002"
      });
      return;
    }

    // 3. ADMIN POSYANDU checks (Dynamic check against seeded posyandus list)
    const posMatch = posyanduList.find(pObj => pObj.username === u);
    
    if (posMatch) {
      const dbPassword = posMatch.password || "password123";
      if (p === dbPassword) {
        if (!posMatch.status_aktif) {
          setErrorMessage("Akun Posyandu ini berstatus non-aktif. Harap hubungi Admin Dinas.");
          return;
        }

        onLoginSuccess({
          role: "ADMIN_POSYANDU",
          username: posMatch.username,
          nama: `Kader ${posMatch.nama_kader} (${posMatch.nama_posyandu})`,
          id_posyandu: posMatch.id_posyandu,
          id_desa: posMatch.id_desa
        });
        return;
      }
    }

    setErrorMessage("ID Login (Username) atau Password salah. Gunakan tombol autofill bantuan jika kewalahan.");
  };

  // Pre-fill helpers for the user to quickly navigate roles
  const handleAutofill = (role: "SUPER_ADMIN" | "DESA" | "POSYANDU") => {
    setErrorMessage("");
    if (role === "SUPER_ADMIN") {
      setUsername("admin");
      setPassword("admin");
    } else if (role === "DESA") {
      setUsername("sukamaju");
      setPassword("password123");
    } else {
      setUsername("melati01");
      setPassword("password123");
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-150
      ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      
      <div className={`w-full max-w-md p-6 rounded-3xl border shadow-xl flex flex-col justify-between 
        ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-205"}`}>
        
        {/* Banner header logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-teal-500/20 select-none">
            <Heart size={24} className="fill-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-teal-605">SI-PoGi</h1>
          <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">
            Sistem Informasi Posyandu & Monitoring Gizi
          </p>
          <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/40">
             Menuju Indonesia Bebas Stunting
          </div>
        </div>

        {/* Warning card */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex gap-2 animate-bounce">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 mb-1.5 uppercase">ID login username</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="E.g. admin atau melati01"
                className={`w-full py-2 px-3 pl-9 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                  ${darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-250 text-slate-850"}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 mb-1.5 uppercase">Password keamanan</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full py-2 px-3 pl-9 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                  ${darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-255 text-slate-850"}`}
              />
            </div>
          </div>

          {/* Sign In CTA */}
          <button
            id="btn-login-submit"
            type="submit"
            className="w-full py-2.5 mt-2 bg-teal-500 hover:bg-teal-650 text-white font-black text-xs rounded-lg shadow-md transition-transform active:scale-95"
          >
            Masuk ke Aplikasi
          </button>
        </form>

        {/* HELP QUICK AUTOFILLS */}
        <div className="mt-6 pt-5 border-t border-dashed border-slate-205 dark:border-slate-850 space-y-3">
          <p className="text-[10px] text-slate-400 text-center font-bold flex items-center justify-center gap-1">
             ALAT PENGUJI AUTOFILL ROLE DETEKSI (SANDI AKTIF)
          </p>
          
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <button
              onClick={() => handleAutofill("SUPER_ADMIN")}
              className="py-1.5 px-2 font-bold border rounded bg-slate-500/5 text-slate-500 hover:bg-slate-500/10 text-center truncate"
              title="Login sebagai Super Admin Dinas (admin / admin)"
            >
              Super Admin
            </button>
            <button
              onClick={() => handleAutofill("DESA")}
              className="py-1.5 px-2 font-bold border rounded bg-slate-500/5 text-slate-500 hover:bg-slate-500/10 text-center truncate"
              title="Login sebagai Admin Desa (sukamaju / password123)"
            >
              Admin Desa
            </button>
            <button
              onClick={() => handleAutofill("POSYANDU")}
              className="py-1.5 px-2 font-bold border rounded bg-slate-500/5 text-slate-500 hover:bg-slate-500/10 text-center truncate"
              title="Login sebagai Kader Melati 1 (melati01 / password123)"
            >
              Kader Melati
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
