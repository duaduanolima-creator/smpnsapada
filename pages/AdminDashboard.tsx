
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { User, DailyAttendance, TeachingActivity } from '../types';
import { fetchDashboardData, fetchUsersFromSheet, fetchReportData } from '../services/api';
import { 
  Users, BookOpen, Clock, CheckCircle, XCircle, Search, 
  IdCard, GraduationCap, ArrowRight, UserCheck, UserMinus, 
  MapPin, X, Calendar, Phone, MessageSquare, AlertCircle, RefreshCw,
  Download, FileText, PieChart, TrendingUp
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
}

interface MonthlyRecap {
  nip: string;
  name: string;
  presentCount: number;
  percentage: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'teaching' | 'recap'>('attendance');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<DailyAttendance | null>(null);
  
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [teachingData, setTeachingData] = useState<TeachingActivity[]>([]);
  const [monthlyRecaps, setMonthlyRecaps] = useState<MonthlyRecap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const WORKING_DAYS_STANDAR = 20;

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadStartDate, setDownloadStartDate] = useState('');
  const [downloadEndDate, setDownloadEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const getInitials = (name: string) => {
    const n = name.replace(/[^a-zA-Z ]/g, "").trim();
    const parts = n.split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allUsers = await fetchUsersFromSheet();
      const teachers = allUsers.filter(u => u.Role !== 'Admin' && u.Role !== 'Superadmin');
      const dashboardData = await fetchDashboardData();
      
      if (dashboardData) {
        const { attendance, teaching, leaves } = dashboardData;
        const formatTime = (isoString: string) => {
           if (!isoString) return '--:--';
           if (isoString.includes('T') || isoString.includes('-')) {
             try {
                const d = new Date(isoString);
                if (isNaN(d.getTime())) return isoString;
                return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
             } catch { return isoString; }
           }
           return isoString;
        };

        const teachingFormatted: TeachingActivity[] = (teaching || []).map((t: any) => ({
          id: `teach-${t.id}`,
          name: t.name,
          subject: t.subject,
          className: t.className,
          timeRange: `${formatTime(t.startTime)} - ${formatTime(t.endTime)}`,
          endTime: t.endTime
        }));
        setTeachingData(teachingFormatted);

        const dailyAttendance: DailyAttendance[] = teachers.map((teacher) => {
          const teacherLogs = (attendance || []).filter((log: any) => log.nip === teacher.NIP);
          const logIn = teacherLogs.find((log: any) => log.type === 'IN');
          const logOut = teacherLogs.find((log: any) => log.type === 'OUT');
          const leaveLog = (leaves || []).find((l: any) => l.nip === teacher.NIP);

          let status: 'HADIR' | 'IZIN' | 'SAKIT' | 'BELUM HADIR' = 'BELUM HADIR';
          if (logIn) status = 'HADIR';
          else if (leaveLog) status = leaveLog.status === 'Sakit' ? 'SAKIT' : 'IZIN';

          return {
            id: teacher.NIP,
            name: teacher.Nama || teacher.Username,
            nip: teacher.NIP,
            timeIn: logIn ? new Date(logIn.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : null,
            timeOut: logOut ? new Date(logOut.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : null,
            status: status,
            photoUrl: logIn ? logIn.photo : null
          };
        });
        setAttendanceData(dailyAttendance);

        // REAL CALCULATION: Menghitung persentase dari data asli
        const recaps: MonthlyRecap[] = teachers.map(t => {
            // Filter log absensi Masuk (IN) milik guru ini
            const teacherInLogs = (attendance || []).filter((log: any) => log.nip === t.NIP && log.type === 'IN');
            
            // Hitung jumlah hari unik (agar absensi ganda di hari yang sama tidak terhitung dua kali)
            const uniqueAttendanceDays = new Set(teacherInLogs.map((log: any) => {
                const date = new Date(log.timestamp);
                return isNaN(date.getTime()) ? null : date.toDateString();
            })).size;
            
            return {
                nip: t.NIP,
                name: t.Nama || t.Username,
                presentCount: uniqueAttendanceDays,
                percentage: (uniqueAttendanceDays / WORKING_DAYS_STANDAR) * 100
            };
        });
        setMonthlyRecaps(recaps);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const dataInterval = setInterval(loadData, 60000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    const now = new Date();
    setDownloadStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    setDownloadEndDate(now.toISOString().split('T')[0]);
    return () => { clearInterval(dataInterval); clearInterval(timeInterval); };
  }, []);

  const filteredAttendance = attendanceData
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.nip.includes(searchQuery))
    .sort((a, b) => {
      const getStatusPriority = (s: string) => s === 'HADIR' ? 0 : (s === 'IZIN' || s === 'SAKIT' ? 1 : 2);
      const pA = getStatusPriority(a.status);
      const pB = getStatusPriority(b.status);
      if (pA !== pB) return pA - pB;
      if (a.status === 'HADIR' && b.status === 'HADIR') return (a.timeIn || '').localeCompare(b.timeIn || '');
      return a.name.localeCompare(b.name);
    });

  const stats = {
    total: attendanceData.length,
    present: attendanceData.filter(i => i.status === 'HADIR').length,
    teaching: teachingData.length,
    avgPercentage: monthlyRecaps.length > 0 ? Math.round(monthlyRecaps.reduce((a, b) => a + b.percentage, 0) / monthlyRecaps.length) : 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HADIR': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'IZIN': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'SAKIT': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-800 text-slate-500 border-white/5';
    }
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-500';
    if (pct >= 75) return 'text-amber-500';
    return 'text-red-500';
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const reportData = await fetchReportData(downloadStartDate, downloadEndDate);
      if (!reportData || reportData.length === 0) { alert("Data tidak ditemukan."); return; }
      const headers = Object.keys(reportData[0]).join(',');
      const rows = reportData.map((obj: any) => Object.values(obj).map(val => `"${val}"`).join(','));
      const csvString = [headers, ...rows].join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Absensi_${downloadStartDate}_${downloadEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowDownloadModal(false);
    } catch (error) { alert("Gagal mengunduh laporan."); } finally { setIsDownloading(false); }
  };

  return (
    <div className="flex-1 pb-24 overflow-y-auto bg-slate-950">
      <Header title="Admin Dashboard" />

      {/* Stats Section */}
      <div className="px-6 mb-8 overflow-x-auto">
        <div className="flex gap-4 pb-2">
          <div className="min-w-[140px] flex-1 p-4 rounded-3xl bg-indigo-600/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck size={14} className="text-indigo-400" />
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Hadir</span>
            </div>
            <div className="text-2xl font-black text-white">{stats.present}<span className="text-slate-500 text-xs font-bold">/{stats.total}</span></div>
          </div>

          <div className="min-w-[140px] flex-1 p-4 rounded-3xl bg-amber-600/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={14} className="text-amber-400" />
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Mengajar</span>
            </div>
            <div className="text-2xl font-black text-white">{stats.teaching}</div>
          </div>

          <div className="min-w-[140px] flex-1 p-4 rounded-3xl bg-emerald-600/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Rata-rata</span>
            </div>
            <div className="text-2xl font-black text-white">{stats.avgPercentage}%</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 space-y-4 sticky top-[80px] z-30 bg-slate-950/80 backdrop-blur-md pb-4">
        <div className="flex items-center justify-between">
           <span className="text-[10px] text-slate-500 font-mono">Update: {lastUpdated.toLocaleTimeString('id-ID')}</span>
           <div className="flex gap-2">
             <button onClick={() => setShowDownloadModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
               <Download size={14} /> Laporan
             </button>
             <button onClick={loadData} disabled={isLoading} className="p-2 bg-slate-800 rounded-full text-indigo-400">
               <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
             </button>
           </div>
        </div>
        
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Cari Guru..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-white text-sm outline-none" />
        </div>

        <div className="bg-slate-900/50 p-1 rounded-2xl border border-white/5 flex gap-1">
          {(['attendance', 'teaching', 'recap'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500'}`}>
              {tab === 'attendance' ? 'Presensi' : tab === 'teaching' ? 'Mengajar' : 'Rekap %'}
            </button>
          ))}
        </div>
      </div>

      {/* List Area */}
      <div className="px-6 space-y-3 mt-2">
        {isLoading ? (
          <div className="py-20 text-center space-y-2"><div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto"></div><p className="text-xs text-slate-500">Memuat...</p></div>
        ) : activeTab === 'attendance' ? (
          filteredAttendance.length > 0 ? (
            filteredAttendance.map(item => (
              <div key={item.id} onClick={() => setSelectedTeacher(item)} className="p-4 bg-slate-900/40 border border-white/5 rounded-3xl hover:bg-slate-900/60 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{item.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">NIP: {item.nip}</span>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusColor(item.status)}`}>{item.status}</div>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-2xl border border-white/5 text-[11px]">
                  <div className="flex flex-col"><span className="text-[8px] text-slate-500 uppercase font-bold">Masuk</span><span className="text-white font-mono">{item.timeIn || '--:--'}</span></div>
                  <div className="h-4 w-px bg-white/5" />
                  <div className="flex flex-col text-right"><span className="text-[8px] text-slate-500 uppercase font-bold">Pulang</span><span className="text-white font-mono">{item.timeOut || '--:--'}</span></div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center"><p className="text-sm text-slate-500">Data tidak ditemukan.</p></div>
          )
        ) : activeTab === 'recap' ? (
            monthlyRecaps.length > 0 ? (
              monthlyRecaps
              .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(item => (
                  <div key={item.nip} className="p-5 bg-slate-900/40 border border-white/5 rounded-3xl space-y-4">
                      <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                              <span className="text-[10px] text-slate-500 font-mono">Bulan ini: {item.presentCount} / {WORKING_DAYS_STANDAR} Hari</span>
                          </div>
                          <div className={`text-xl font-black ${getPercentageColor(item.percentage)}`}>{Math.round(item.percentage)}%</div>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${item.percentage >= 90 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : item.percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${item.percentage}%` }}></div>
                      </div>
                  </div>
              ))
            ) : (
              <div className="py-10 text-center"><p className="text-sm text-slate-500">Belum ada rekap data.</p></div>
            )
        ) : (
          teachingData.length > 0 ? (
            teachingData.map(item => (
              <div key={item.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-3xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-500"><GraduationCap size={20} /></div>
                  <div><h4 className="text-sm font-bold text-white leading-tight">{item.name}</h4><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.subject} • {item.className}</p></div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-slate-950/50 rounded-2xl border border-white/5 text-[11px]"><Clock size={14} className="text-amber-500" /><span className="text-white font-mono">{item.timeRange}</span></div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center"><p className="text-sm text-slate-500">Belum ada aktivitas mengajar hari ini.</p></div>
          )
        )}
      </div>

      {/* Modals & Footer */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setShowDownloadModal(false)}/>
          <div className="relative w-full max-w-sm bg-slate-900 rounded-[2.5rem] border border-white/10 p-8">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FileText className="text-indigo-500" /> Unduh Laporan</h3>
             <div className="space-y-4">
                <div className="space-y-1"><label className="text-[10px] text-slate-500 font-bold uppercase">Mulai</label><input type="date" value={downloadStartDate} onChange={e => setDownloadStartDate(e.target.value)} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none" /></div>
                <div className="space-y-1"><label className="text-[10px] text-slate-500 font-bold uppercase">Selesai</label><input type="date" value={downloadEndDate} onChange={e => setDownloadEndDate(e.target.value)} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none" /></div>
                <button onClick={handleDownloadReport} disabled={isDownloading} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2">{isDownloading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Download size={18} /> Unduh CSV</>}</button>
             </div>
          </div>
        </div>
      )}

      {selectedTeacher && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setSelectedTeacher(null)} />
          <div className="relative w-full max-w-md bg-slate-900 rounded-t-[2.5rem] border-t border-white/10 p-8 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border-2 border-slate-800 flex items-center justify-center overflow-hidden">
                  {selectedTeacher.photoUrl ? <img src={selectedTeacher.photoUrl} className="w-full h-full object-cover" /> : <span className="text-xl font-black text-white">{getInitials(selectedTeacher.name)}</span>}
                </div>
                <div><h3 className="text-lg font-bold text-white">{selectedTeacher.name}</h3><p className="text-xs text-slate-500 font-mono">NIP: {selectedTeacher.nip}</p></div>
              </div>
              <button onClick={() => setSelectedTeacher(null)} className="p-2 bg-slate-800 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5"><span className="text-[9px] text-slate-500 font-black uppercase">Masuk</span><p className="text-lg font-mono font-bold text-white">{selectedTeacher.timeIn || '--:--'}</p></div>
              <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5"><span className="text-[9px] text-slate-500 font-black uppercase">Pulang</span><p className="text-lg font-mono font-bold text-white">{selectedTeacher.timeOut || '--:--'}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
