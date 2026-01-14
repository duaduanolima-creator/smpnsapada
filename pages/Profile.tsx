
import React, { useState } from 'react';
import { User as UserIcon, LogOut, IdCard, BadgeCheck, Briefcase, School, AlertTriangle, X } from 'lucide-react';
import Header from '../components/Header';
import { User } from '../types';

interface ProfileProps {
  user: User;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onLogout }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const getInitials = (name: string) => {
    const n = name.replace(/[^a-zA-Z ]/g, "").trim();
    const parts = n.split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const infoItems = [
    { 
      icon: <IdCard size={18} className="text-indigo-400" />, 
      label: 'NIP', 
      value: user.nip 
    },
    { 
      icon: <BadgeCheck size={18} className="text-emerald-400" />, 
      label: 'Status Pegawai', 
      value: user.employmentStatus 
    },
    { 
      icon: <Briefcase size={18} className="text-amber-400" />, 
      label: 'Jabatan', 
      value: user.role 
    },
    { 
      icon: <School size={18} className="text-blue-400" />, 
      label: 'Unit Kerja', 
      value: user.school 
    },
  ];

  return (
    <div className="flex-1 pb-24 overflow-y-auto bg-slate-950">
      <Header title="Profil Saya" />

      <div className="flex flex-col items-center pt-8 pb-6 px-6">
        <div className="relative">
          <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full rounded-full bg-slate-800 border-4 border-slate-950 flex items-center justify-center overflow-hidden">
                <span className="text-3xl font-black text-white tracking-widest">{getInitials(user.name)}</span>
            </div>
          </div>
          <div className="absolute bottom-1 right-1 w-7 h-7 bg-indigo-600 rounded-full border-2 border-slate-950 flex items-center justify-center text-white shadow-lg">
            <UserIcon size={14} />
          </div>
        </div>
        <h2 className="mt-5 text-xl font-bold text-white text-center leading-tight px-4">{user.name}</h2>
        <div className="mt-1 flex items-center gap-1.5 text-slate-500">
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">{user.role}</span>
        </div>
      </div>

      <div className="px-6 mb-8">
        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 shadow-inner">
          <h3 className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.15em] mb-5 px-2">Data Kepegawaian</h3>
          <div className="space-y-5">
            {infoItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="mt-0.5 p-2.5 bg-slate-800 rounded-2xl border border-white/5">
                  {item.icon}
                </div>
                <div className={`flex-1 ${idx !== infoItems.length - 1 ? 'border-b border-white/5 pb-4' : ''}`}>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight block mb-1">{item.label}</span>
                  <span className="text-sm text-slate-200 font-bold">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6">
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-3 p-5 bg-red-600/10 border border-red-500/20 text-red-500 font-bold rounded-[2rem] hover:bg-red-600/20 active:scale-95 transition-all group"
        >
          <div className="p-2 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
            <LogOut size={20} />
          </div>
          <span>Keluar dari Aplikasi</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center text-slate-600 text-[9px] font-black uppercase tracking-[0.25em] pb-8 leading-relaxed">
        E-Absensi v2.1.0<br/>
        SMPN 1 Padarincang
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div 
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative w-full max-w-sm bg-slate-900 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                <AlertTriangle size={36} className="text-red-500" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Konfirmasi Keluar</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-8">
                Apakah Anda yakin ingin keluar dari akun? Anda perlu memasukkan kredensial lagi untuk masuk kembali.
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-4 px-6 bg-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    onLogout();
                  }}
                  className="py-4 px-6 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
