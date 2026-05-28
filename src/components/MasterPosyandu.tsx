import React, { useState, useMemo } from "react";
import { 
  Building2, 
  Map, 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  CheckCircle, 
  X,
  PlusCircle, 
  Activity, 
  Key, 
  UserCheck, 
  PhoneCall, 
  AlertTriangle 
} from "lucide-react";
import { Desa, Posyandu, UserLog } from "../types";

interface MasterPosyanduProps {
  desaList: Desa[];
  posyanduList: Posyandu[];
  darkMode: boolean;
  onAddDesa: (desa: Desa) => void;
  onEditDesa: (desa: Desa) => void;
  onDeleteDesa: (id: string) => void;
  onAddPosyandu: (pos: Posyandu) => void;
  onEditPosyandu: (pos: Posyandu) => void;
  onDeletePosyandu: (id: string) => void;
}

export default function MasterPosyandu({
  desaList,
  posyanduList,
  darkMode,
  onAddDesa,
  onEditDesa,
  onDeleteDesa,
  onAddPosyandu,
  onEditPosyandu,
  onDeletePosyandu
}: MasterPosyanduProps) {
  
  // Search state
  const [posyanduSearch, setPosyanduSearch] = useState("");
  const [desaSearch, setDesaSearch] = useState("");

  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<"posyandu" | "desa">("posyandu");

  // Posyandu Form fields
  const [isPosyanduModalOpen, setIsPosyanduModalOpen] = useState(false);
  const [editingPosyandu, setEditingPosyandu] = useState<Posyandu | null>(null);
  const [posId, setPosId] = useState("");
  const [posNama, setPosNama] = useState("");
  const [posIdDesa, setPosIdDesa] = useState("");
  const [posAlamat, setPosAlamat] = useState("");
  const [posKader, setPosKader] = useState("");
  const [posHp, setPosHp] = useState("");
  const [posUsername, setPosUsername] = useState("");
  const [posPassword, setPosPassword] = useState("");
  const [posStatus, setPosStatus] = useState(true);
  const [posPetugasKesehatan, setPosPetugasKesehatan] = useState("");

  // Desa Form fields
  const [isDesaModalOpen, setIsDesaModalOpen] = useState(false);
  const [editingDesa, setEditingDesa] = useState<Desa | null>(null);
  const [desaId, setDesaId] = useState("");
  const [desaNama, setDesaNama] = useState("");
  const [desaKec, setDesaKec] = useState("Cilaku");
  const [desaKab, setDesaKab] = useState("Cianjur");
  const [desaProv, setDesaProv] = useState("Jawa Barat");
  const [desaPetugas1, setDesaPetugas1] = useState("");
  const [desaPetugas2, setDesaPetugas2] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const filteredPosyandu = useMemo(() => {
    const q = posyanduSearch.toLowerCase();
    return posyanduList.filter(p => {
      const desa = desaList.find(d => d.id_desa === p.id_desa);
      const desaName = desa ? desa.nama_desa.toLowerCase() : "";
      return p.nama_posyandu.toLowerCase().includes(q) || 
             p.nama_kader.toLowerCase().includes(q) ||
             p.username.toLowerCase().includes(q) ||
             desaName.includes(q);
    });
  }, [posyanduList, desaList, posyanduSearch]);

  const filteredDesa = useMemo(() => {
    const q = desaSearch.toLowerCase();
    return desaList.filter(d => 
      d.nama_desa.toLowerCase().includes(q) || d.kecamatan.toLowerCase().includes(q)
    );
  }, [desaList, desaSearch]);

  // Open Add Posyandu Form
  const openAddPosyandu = () => {
    setEditingPosyandu(null);
    setPosId(`POS00${posyanduList.length + 1}`);
    setPosNama("");
    const defaultDesaId = desaList[0]?.id_desa || "";
    setPosIdDesa(defaultDesaId);
    setPosAlamat("");
    setPosKader("");
    setPosHp("");
    setPosUsername("");
    setPosPassword("");
    setPosStatus(true);
    
    // Find first village and default to its first health officer if any
    const firstDesa = desaList.find(d => d.id_desa === defaultDesaId);
    setPosPetugasKesehatan(firstDesa?.petugas_kesehatan_1 || "");
    
    setErrorMsg("");
    setSuccessMsg("");
    setIsPosyanduModalOpen(true);
  };

  // Open Edit Posyandu Form
  const openEditPosyandu = (pos: Posyandu) => {
    setEditingPosyandu(pos);
    setPosId(pos.id_posyandu);
    setPosNama(pos.nama_posyandu);
    setPosIdDesa(pos.id_desa);
    setPosAlamat(pos.alamat);
    setPosKader(pos.nama_kader);
    setPosHp(pos.nomor_hp);
    setPosUsername(pos.username);
    setPosPassword(pos.password || "");
    setPosStatus(pos.status_aktif);
    setPosPetugasKesehatan(pos.petugas_kesehatan || "");
    setErrorMsg("");
    setSuccessMsg("");
    setIsPosyanduModalOpen(true);
  };

  // Open Add Desa Form
  const openAddDesa = () => {
    setEditingDesa(null);
    setDesaId(`DESA00${desaList.length + 1}`);
    setDesaNama("");
    setDesaKec("Cilaku");
    setDesaKab("Cianjur");
    setDesaProv("Jawa Barat");
    setDesaPetugas1("");
    setDesaPetugas2("");
    setErrorMsg("");
    setSuccessMsg("");
    setIsDesaModalOpen(true);
  };

  const handlePosyanduSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!posNama.trim()) {
      setErrorMsg("Nama Posyandu wajib diisi.");
      return;
    }
    if (!posUsername.trim()) {
      setErrorMsg("Login ID Posyandu (Username) wajib diisi.");
      return;
    }
    if (!posPassword.trim()) {
      setErrorMsg("Sandi Keamanan wajib diisi.");
      return;
    }

    const payload: Posyandu = {
      id_posyandu: posId,
      nama_posyandu: posNama,
      id_desa: posIdDesa,
      alamat: posAlamat,
      nama_kader: posKader,
      nomor_hp: posHp,
      username: posUsername,
      password: posPassword,
      status_aktif: posStatus,
      petugas_kesehatan: posPetugasKesehatan
    };

    if (editingPosyandu) {
      onEditPosyandu(payload);
      setSuccessMsg("Data Posyandu berhasil diperbarui.");
    } else {
      // Check duplicate usernames
      if (posyanduList.some(p => p.username === posUsername)) {
        setErrorMsg(`Username '${posUsername}' sudah terpakai oleh posyandu lain.`);
        return;
      }
      onAddPosyandu(payload);
      setSuccessMsg("Posyandu Baru berhasil didaftarkan.");
    }

    setTimeout(() => {
      setIsPosyanduModalOpen(false);
    }, 1000);
  };

  const handleDesaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!desaNama.trim()) {
      setErrorMsg("Nama Desa wajib diisi.");
      return;
    }

    const payload: Desa = {
      id_desa: desaId,
      nama_desa: desaNama,
      kecamatan: desaKec,
      kabupaten: desaKab,
      provinsi: desaProv,
      petugas_kesehatan_1: desaPetugas1,
      petugas_kesehatan_2: desaPetugas2
    };

    if (editingDesa) {
      onEditDesa(payload);
      setSuccessMsg("Profil desa pembina sukses disimpan.");
    } else {
      // Check duplicate ID Desa
      if (desaList.some(d => d.id_desa === desaId)) {
        setErrorMsg(`ID Desa '${desaId}' sudah ada di database.`);
        return;
      }
      onAddDesa(payload);
      setSuccessMsg("Desa Pembinaan baru sukses didaftarkan.");
    }

    setTimeout(() => {
      setIsDesaModalOpen(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Tab controls */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          id="btn-subtab-posyandu"
          onClick={() => setActiveSubTab("posyandu")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black transition-colors border-b-2
            ${activeSubTab === "posyandu" 
              ? "border-teal-500 text-teal-600 dark:text-teal-400" 
              : "border-transparent text-slate-450 hover:text-slate-750"}`}
        >
          <Building2 size={16} /> Data Puskesmas & Posyandu ({posyanduList.length})
        </button>
        <button
          id="btn-subtab-desa"
          onClick={() => setActiveSubTab("desa")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black transition-colors border-b-2
            ${activeSubTab === "desa" 
              ? "border-teal-500 text-teal-600 dark:text-teal-400" 
              : "border-transparent text-slate-450 hover:text-slate-750"}`}
        >
          <Map size={16} /> Wilayah Desa ({desaList.length})
        </button>
      </div>

      {activeSubTab === "posyandu" ? (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Posyandu Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 text-slate-400" size={14} />
              <input
                id="input-pos-search"
                type="text"
                placeholder="Cari posyandu, kader, login ID..."
                value={posyanduSearch}
                onChange={(e) => setPosyanduSearch(e.target.value)}
                className={`w-full py-2 pl-9 pr-4 text-xs font-semibold rounded-lg border focus:outline-none
                  ${darkMode ? "bg-slate-950 border-slate-850 text-slate-105" : "bg-white border-slate-205"}`}
              />
            </div>
            
            <button
              id="btn-add-posyandu"
              onClick={openAddPosyandu}
              className="w-full sm:w-auto px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-teal-500/10"
            >
              <PlusCircle size={14} /> Daftarkan Posyandu Baru
            </button>
          </div>

          {/* Posyandu Table */}
          <div className={`border rounded-2xl overflow-hidden ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-205"}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-inherit text-slate-400 uppercase font-mono text-[10px] font-extrabold">
                    <th className="p-3">ID Posyandu</th>
                    <th className="p-3">Nama Posyandu</th>
                    <th className="p-3">Desa Pembina</th>
                    <th className="p-3">Alamat</th>
                    <th className="p-3">Ketua Kader</th>
                    <th className="p-3">Petugas Kesehatan</th>
                    <th className="p-3">Nomor WhatsApp</th>
                    <th className="p-3">Login Username</th>
                    <th className="p-3">Login Password</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900/40 text-xs">
                  {filteredPosyandu.map(pos => {
                    const desa = desaList.find(d => d.id_desa === pos.id_desa);
                    return (
                      <tr key={pos.id_posyandu} className="hover:bg-slate-500/5 transition-colors">
                        <td className="p-3 font-mono text-slate-400 text-[10px]">{pos.id_posyandu}</td>
                        <td className="p-3 font-extrabold text-slate-800 dark:text-slate-101">{pos.nama_posyandu}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200/40 font-semibold">
                            {desa ? desa.nama_desa : "Tidak Ditautkan"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 max-w-[150px] truncate" title={pos.alamat}>{pos.alamat || "-"}</td>
                        <td className="p-3 font-semibold flex items-center gap-1.5 pt-4">
                          <UserCheck size={11} className="text-slate-400" /> {pos.nama_kader}
                        </td>
                        <td className="p-3 font-semibold text-slate-600 dark:text-slate-350">
                          {pos.petugas_kesehatan || <span className="italic text-slate-400 text-[10px]">Belum diset</span>}
                        </td>
                        <td className="p-3 font-mono text-slate-500">{pos.nomor_hp || "-"}</td>
                        <td className="p-3 font-mono text-teal-650 font-bold bg-teal-500/5 px-2">{pos.username}</td>
                        <td className="p-3 font-mono text-slate-400 select-all" title="Klik untuk salin password">{pos.password || "********"}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pos.status_aktif 
                              ? "bg-green-500/10 text-green-600" 
                              : "bg-red-500/10 text-red-500"
                          }`}>
                            {pos.status_aktif ? "Aktif" : "Non-aktif"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              id={`edit-pos-${pos.id_posyandu}`}
                              onClick={() => openEditPosyandu(pos)}
                              className="p-1 rounded hover:bg-amber-500/10 text-amber-550 border border-transparent hover:border-amber-500/20"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              id={`delete-pos-${pos.id_posyandu}`}
                              onClick={() => {
                                if (confirm(`Hapus Posyandu ${pos.nama_posyandu}? Seluruh balita yang bernaung di bawah posyandu ini wajib dialokasikan ulang.`)) {
                                  onDeletePosyandu(pos.id_posyandu);
                                }
                              }}
                              className="p-1 rounded hover:bg-red-500/10 text-red-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPosyandu.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-slate-400 italic">
                        Belum ada Posyandu yang tercatat atau cocok pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Desa Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 text-slate-400" size={14} />
              <input
                id="input-desa-search"
                type="text"
                placeholder="Cari nama desa..."
                value={desaSearch}
                onChange={(e) => setDesaSearch(e.target.value)}
                className={`w-full py-2 pl-9 pr-4 text-xs font-semibold rounded-lg border focus:outline-none
                  ${darkMode ? "bg-slate-950 border-slate-850 text-slate-105" : "bg-white border-slate-205"}`}
              />
            </div>
            
            <button
              id="btn-add-desa"
              onClick={openAddDesa}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-indigo-600/10"
            >
              <PlusCircle size={14} /> Tambahkan Desa Baru
            </button>
          </div>

          {/* Desa Table */}
          <div className={`border rounded-2xl overflow-hidden ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-205"}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-inherit text-slate-400 uppercase font-mono text-[10px] font-extrabold">
                    <th className="p-3">ID Desa</th>
                    <th className="p-3">Nama Desa</th>
                    <th className="p-3">Kecamatan</th>
                    <th className="p-3">Kabupaten</th>
                    <th className="p-3">Provinsi</th>
                    <th className="p-3">Petugas Kesehatan Desa</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900/40 text-xs">
                  {filteredDesa.map(desa => (
                    <tr key={desa.id_desa} className="hover:bg-slate-500/5 transition-colors">
                      <td className="p-3 font-mono text-slate-400 text-[10px]">{desa.id_desa}</td>
                      <td className="p-3 font-extrabold text-slate-800 dark:text-slate-101">{desa.nama_desa}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-350">{desa.kecamatan}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-350">{desa.kabupaten}</td>
                      <td className="p-3 text-slate-500">{desa.provinsi}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5 text-slate-600 dark:text-slate-350 font-semibold text-[11px]">
                          {desa.petugas_kesehatan_1 && <div>&bull; {desa.petugas_kesehatan_1}</div>}
                          {desa.petugas_kesehatan_2 && <div>&bull; {desa.petugas_kesehatan_2}</div>}
                          {!desa.petugas_kesehatan_1 && !desa.petugas_kesehatan_2 && <span className="italic text-slate-450">Belum diset</span>}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          <button
                            id={`edit-desa-${desa.id_desa}`}
                            onClick={() => {
                              setEditingDesa(desa);
                              setDesaId(desa.id_desa);
                              setDesaNama(desa.nama_desa);
                              setDesaKec(desa.kecamatan);
                              setDesaKab(desa.kabupaten);
                              setDesaProv(desa.provinsi);
                              setDesaPetugas1(desa.petugas_kesehatan_1 || "");
                              setDesaPetugas2(desa.petugas_kesehatan_2 || "");
                              setErrorMsg("");
                              setSuccessMsg("");
                              setIsDesaModalOpen(true);
                            }}
                            className="p-1 rounded hover:bg-amber-500/10 text-amber-550"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            id={`delete-desa-${desa.id_desa}`}
                            onClick={() => {
                              if (confirm(`Menghapus Desa ${desa.nama_desa} akan merusak relasi seluruh posyandu di desa tersebut. Yakin?`)) {
                                onDeleteDesa(desa.id_desa);
                              }
                            }}
                            className="p-1 rounded hover:bg-red-500/10 text-red-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDesa.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                        Belum ada Desa yang tercatat dalam sistem.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* POSYANDU MODAL */}
      {isPosyanduModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-xl border overflow-hidden
            ${darkMode ? "bg-slate-950 border-slate-850 text-slate-100" : "bg-white border-slate-205 text-slate-800"}`}>
            
            <div className={`px-5 py-4 border-b flex justify-between items-center ${darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-150"}`}>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                {editingPosyandu ? "Edit Profil Posyandu Binaan" : "Registrasi Akun Posyandu Baru"}
              </h3>
              <button onClick={() => setIsPosyanduModalOpen(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-lg">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="m-4 p-3 bg-green-500/10 border border-green-500/25 text-green-500 text-xs font-semibold rounded-lg">
                {successMsg}
              </div>
            )}

            <form onSubmit={handlePosyanduSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">ID POSYANDU*</label>
                  <input
                    type="text"
                    disabled
                    value={posId}
                    className="w-full px-3 py-2 text-xs font-bold font-mono bg-slate-500/5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">NAMA POSYANDU*</label>
                  <input
                    type="text"
                    required
                    value={posNama}
                    onChange={(e) => setPosNama(e.target.value)}
                    placeholder="E.g. Melati 01"
                    className={`w-full px-3 py-2 text-xs font-bold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">RELESI DESA PEMBINA*</label>
                  <select
                    value={posIdDesa}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setPosIdDesa(selectedId);
                      const targetDesa = desaList.find(d => d.id_desa === selectedId);
                      setPosPetugasKesehatan(targetDesa?.petugas_kesehatan_1 || "");
                    }}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  >
                    {desaList.map(desa => (
                      <option key={desa.id_desa} value={desa.id_desa}>{desa.nama_desa}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">PETUGAS KESEHATAN DESA*</label>
                  <select
                    value={posPetugasKesehatan}
                    onChange={(e) => setPosPetugasKesehatan(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-850"}`}
                  >
                    <option value="">-- Pilih Petugas Desa --</option>
                    {(() => {
                      const currentDesa = desaList.find(d => d.id_desa === posIdDesa);
                      const officersList = [];
                      if (currentDesa?.petugas_kesehatan_1?.trim()) officersList.push(currentDesa.petugas_kesehatan_1.trim());
                      if (currentDesa?.petugas_kesehatan_2?.trim()) officersList.push(currentDesa.petugas_kesehatan_2.trim());
                      return officersList.map((o, idx) => (
                        <option key={idx} value={o}>{o}</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">ALAMAT LENGKAP POSYANDU</label>
                <input
                  type="text"
                  value={posAlamat}
                  onChange={(e) => setPosAlamat(e.target.value)}
                  placeholder="E.g. Dukuh Krajan RT 01"
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                    ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250"}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">NAMA KETUA KADER*</label>
                  <input
                    type="text"
                    value={posKader}
                    onChange={(e) => setPosKader(e.target.value)}
                    placeholder="Nama ketua kader pengurus..."
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250"}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">NOMOR WA / HP KADER</label>
                  <input
                    type="text"
                    value={posHp}
                    onChange={(e) => setPosHp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250"}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-900">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">LOGIN ID (USERNAME)*</label>
                  <input
                    type="text"
                    required
                    value={posUsername}
                    onChange={(e) => setPosUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                    placeholder="E.g. melati01"
                    className={`w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-251"}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Sandi / Password*</label>
                  <input
                    type="text"
                    required
                    value={posPassword}
                    onChange={(e) => setPosPassword(e.target.value)}
                    placeholder="Password Akun"
                    className={`w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-251"}`}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <input
                    type="checkbox"
                    checked={posStatus}
                    onChange={(e) => setPosStatus(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span>Status Posyandu Aktif Mengadakan Penimbangan Bulanan</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPosyanduModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border
                    ${darkMode ? "border-slate-850 text-slate-400" : "border-slate-205 text-slate-600"}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-black text-white bg-teal-500 hover:bg-teal-600"
                >
                  {editingPosyandu ? "Simpan Perubahan" : "Daftarkan Posyandu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DESA MODAL */}
      {isDesaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden
            ${darkMode ? "bg-slate-950 border-slate-850 text-slate-105" : "bg-white border-slate-205 text-slate-800"}`}>
            
            <div className={`px-5 py-4 border-b flex justify-between items-center ${darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-150"}`}>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                {editingDesa ? "Detail Desa Pembinaan" : "Alokasi Desa Baru"}
              </h3>
              <button onClick={() => setIsDesaModalOpen(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded">
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-lg">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="m-4 p-3 bg-green-500/10 border border-green-500/25 text-green-500 text-xs font-semibold rounded-lg">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleDesaSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">ID WILAYAH DESA*</label>
                <input
                  type="text"
                  disabled
                  value={desaId}
                  className="w-full px-3 py-2 text-xs font-bold font-mono bg-slate-500/5 rounded-lg border border-slate-200/40 text-slate-450"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">NAMA DESA*</label>
                <input
                  type="text"
                  required
                  value={desaNama}
                  onChange={(e) => setDesaNama(e.target.value)}
                  placeholder="E.g. Sukamaju"
                  className={`w-full px-3 py-2 text-xs font-bold rounded-lg border focus:outline-none focus:border-teal-500
                    ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250"}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">KECAMATAN</label>
                  <input
                    type="text"
                    value={desaKec}
                    onChange={(e) => setDesaKec(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-medium rounded-lg border focus:outline-none
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250"}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">KABUPATEN</label>
                  <input
                    type="text"
                    value={desaKab}
                    onChange={(e) => setDesaKab(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-medium rounded-lg border focus:outline-none
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250"}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">PETUGAS KESEHATAN DESA (MAKS 2 ORANG)</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={desaPetugas1}
                    onChange={(e) => setDesaPetugas1(e.target.value)}
                    placeholder="Nama Petugas Gizi/Bidan Desa 1..."
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-800"}`}
                  />
                  <input
                    type="text"
                    value={desaPetugas2}
                    onChange={(e) => setDesaPetugas2(e.target.value)}
                    placeholder="Nama Petugas Gizi/Bidan Desa 2 (Opsional)..."
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border focus:outline-none focus:border-teal-500
                      ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-800"}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDesaModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border
                    ${darkMode ? "border-slate-850 text-slate-400" : "border-slate-205 text-slate-600"}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Simpan Desa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
