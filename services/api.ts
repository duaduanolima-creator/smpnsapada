
export interface SheetUser {
  Username: string;
  Password: string;
  Nama: string;
  NIP: string;
  Role: string;
  Sekolah: string;
  Status: string;
  Avatar?: string;
  [key: string]: any;
}

// URL CSV GOOGLE SHEET SMPN 1 PADARINCANG
export const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAeRvcKVaxjf8e87icZwsr8vFIQneEAsuCcpokxciZGSshpMmU_i8NX2riKVlr3KEbH7jgt9o3P-LS/pub?gid=42211978&single=true&output=csv";

// URL GOOGLE APPS SCRIPT WEB APP
export const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbx1iJP10MEILibj6NCEg-hqGm9hklC6208u05_MbQuPBsDSHtqEmjCAyJRenGAcKwntrg/exec";

export const fetchUsersFromSheet = async (): Promise<SheetUser[]> => {
  const isValidCSV = (text: string) => {
    return text && text.length > 0 && !text.trim().startsWith("<!DOCTYPE html>");
  };

  try {
    // Gunakan AllOrigins dengan cache-busting
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(SHEET_CSV_URL)}&timestamp=${Date.now()}`;
    const response = await fetch(proxyUrl);
    
    if (response.ok) {
      const text = await response.text();
      if (isValidCSV(text)) {
        return parseCSV(text);
      }
    }
    throw new Error("Invalid CSV content");
  } catch (err) {
    console.warn("Fetch failed, using dummy data as fallback", err);
    return getDummyData();
  }
};

export const fetchDashboardData = async () => {
  try {
    const url = `${GAS_WEBAPP_URL}?action=GET_DASHBOARD_DATA&t=${Date.now()}`;
    const response = await fetch(url, { 
      method: 'GET',
      redirect: "follow"
    });
    
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Gagal mengambil data dashboard:", error);
    // Return empty structure so app doesn't crash
    return { attendance: [], teaching: [], leaves: [] };
  }
};

export const fetchReportData = async (startDate: string, endDate: string) => {
  try {
    const url = `${GAS_WEBAPP_URL}?action=GET_REPORT&start=${startDate}&end=${endDate}&t=${Date.now()}`;
    const response = await fetch(url, { method: 'GET', redirect: "follow" });
    if (!response.ok) throw new Error("Network response failed");
    return await response.json();
  } catch (error) {
    console.error("Gagal download laporan:", error);
    return [];
  }
};

export interface SubmissionPayload {
  action: 'ATTENDANCE' | 'TEACHING' | 'LEAVE';
  user: {
    name: string;
    nip: string;
    role: string;
  };
  data: any;
}

export const submitToGoogleSheets = async (payload: SubmissionPayload): Promise<boolean> => {
  try {
    await fetch(GAS_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    console.error("Gagal mengirim data:", error);
    return false;
  }
};

const normalizeHeader = (header: string): string => {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, ''); 
  if (['username', 'user', 'id', 'user_name'].includes(h)) return 'Username';
  if (['password', 'pass', 'sandi', 'katasandi', 'pin'].includes(h)) return 'Password';
  if (['nama', 'name', 'namalengkap', 'fullname', 'nama_lengkap'].includes(h)) return 'Nama';
  if (['nip', 'nomorinduk', 'idpegawai'].includes(h)) return 'NIP';
  if (['role', 'peran', 'jabatan', 'level', 'akses'].includes(h)) return 'Role';
  if (['sekolah', 'school', 'unitkerja', 'instansi'].includes(h)) return 'Sekolah';
  if (['status', 'statuspegawai', 'kepegawaian'].includes(h)) return 'Status';
  if (['avatar', 'foto', 'photo', 'gambar', 'urlfoto'].includes(h)) return 'Avatar';
  return header;
};

const parseLine = (line: string): string[] => {
  const values: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentVal += '"'; i++; 
      } else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(currentVal); currentVal = '';
    } else currentVal += char;
  }
  values.push(currentVal);
  return values.map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
};

const parseCSV = (text: string): SheetUser[] => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => normalizeHeader(h));
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const user: any = {};
    headers.forEach((header, index) => {
      if (header && values[index] !== undefined) user[header] = values[index];
    });
    return user as SheetUser;
  });
};

const getDummyData = (): SheetUser[] => [
  { Username: 'guru1', Password: '123', Nama: 'Ahmad Suherman, S.Pd', NIP: '198506122010011005', Role: 'Guru', Sekolah: 'SMPN 1 Padarincang', Status: 'PNS / ASN' },
  { Username: 'admin1', Password: '123', Nama: 'Hj. Siti Aminah, M.Pd', NIP: '197005121995012001', Role: 'Admin', Sekolah: 'SMPN 1 Padarincang', Status: 'Kepala Sekolah' }
];
