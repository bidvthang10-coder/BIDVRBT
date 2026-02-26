// ╔══════════════════════════════════════════════════════════╗
// ║  HỆ THỐNG QUẢN LÝ HIỆU SUẤT – Firebase Realtime Sync   ║
// ║  Dữ liệu lưu trên Firestore, mọi người nhập đồng bộ    ║
// ╚══════════════════════════════════════════════════════════╝
//
// CÁCH CHẠY:
//   1. npm create vite@latest my-app -- --template react
//   2. cd my-app
//   3. npm install firebase
//   4. Thay App.jsx bằng file này
//   5. npm run dev
//
// DEPLOY lên Vercel (miễn phí, có URL chia sẻ):
//   1. npm run build
//   2. npx vercel --prod
//   => Nhận URL dạng: https://my-app-xxx.vercel.app

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ══════════════════════════════════════════════════════════
// FIREBASE CONFIG
// ══════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyDnWEiidfZFeMpEEIjJhv_sBAr-49tHjuw",
  authDomain: "bidv-rbt.firebaseapp.com",
  projectId: "bidv-rbt",
  storageBucket: "bidv-rbt.firebasestorage.app",
  messagingSenderId: "48214211312",
  appId: "1:48214211312:web:d35e25e529b1a19cf0e035",
  measurementId: "G-42TD3G5G8G"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Firestore document paths
const DOC_DEPARTMENTS = doc(db, "appdata", "departments");
const DOC_WEEKDATA    = doc(db, "appdata", "weekdata");

// ══════════════════════════════════════════════════════════
// DỮ LIỆU CỐ ĐỊNH
// ══════════════════════════════════════════════════════════
const MONTHS = [
  { key: "2026-01", label: "Tháng 1/2026" },
  { key: "2026-02", label: "Tháng 2/2026" },
  { key: "2026-03", label: "Tháng 3/2026" },
  { key: "2026-04", label: "Tháng 4/2026" },
  { key: "2026-05", label: "Tháng 5/2026" },
  { key: "2026-06", label: "Tháng 6/2026" },
  { key: "2026-07", label: "Tháng 7/2026" },
  { key: "2026-08", label: "Tháng 8/2026" },
  { key: "2026-09", label: "Tháng 9/2026" },
  { key: "2026-10", label: "Tháng 10/2026" },
  { key: "2026-11", label: "Tháng 11/2026" },
  { key: "2026-12", label: "Tháng 12/2026" },
];

const WEEKS = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5"];

const DEFAULT_DEPARTMENTS = [
  {
    id: "QTTD", name: "Phòng QTTD", fullName: "Phòng Quản Trị Tín Dụng", color: "#1a56db",
    members: [
      { id: "NNA", name: "Nguyễn Thị Ngọc Anh", role: "LS" },
      { id: "VTT", name: "Vũ Thu Thủy",          role: "LS" },
      { id: "DTH", name: "Đinh Thị Hồng Hạnh",  role: "LS" },
      { id: "PLV", name: "Phạm Lê Vân",          role: "LS" },
      { id: "DHP", name: "Đoàn Hoài Hương",      role: "LS" },
    ],
    metrics: [
      { key: "soan_thao_hd", label: "Soạn thảo HĐ",          unit: "Khách hàng" },
      { key: "lam_thu_tuc",  label: "Làm thủ tục, đặt hẹn",  unit: "Khách hàng" },
      { key: "lay_ket_qua",  label: "Lấy kết quả, nhập kho", unit: "Khách hàng" },
      { key: "giai_ngan",    label: "Giải ngân",              unit: "Khách hàng" },
      { key: "nhac_thu_no",  label: "Nhắc và thu nợ",         unit: "Khách hàng" },
    ],
  },
  {
    id: "GDKH", name: "Phòng GDKH", fullName: "Phòng Giao Dịch Khách Hàng", color: "#057a55",
    members: [
      { id: "VHT",  name: "Vũ Huyền Trang",       role: "UB" },
      { id: "NTTH", name: "Nguyễn Thị Thu Hương", role: "UB" },
    ],
    metrics: [
      { key: "so_luong_gd",   label: "Số lượng giao dịch",          unit: "Giao dịch"   },
      { key: "so_luong_kh",   label: "Số lượng KH giao dịch",       unit: "Khách hàng"  },
      { key: "kh_smb_moi",    label: "Số lượng KH SMB mới",         unit: "Khách hàng"  },
      { key: "trinh_bay_sp",  label: "Trình bày SP",                 unit: "Khách hàng"  },
      { key: "gioi_thieu",    label: "Giới thiệu vị trí khác",      unit: "Khách hàng"  },
      { key: "kh_chot_ban",   label: "KH chốt bán",                 unit: "Khách hàng"  },
      { key: "sp_chot_ban",   label: "SP chốt bán",                 unit: "Sản phẩm"    },
      { key: "sp_so",         label: "SP số (TTHĐ, TK số đẹp...)",  unit: "Sản phẩm"    },
      { key: "ds_tien_gui",   label: "Doanh số tiền gửi online",    unit: "Triệu đồng"  },
      { key: "ds_bh_metlife", label: "Doanh số Bảo hiểm Metlife",   unit: "Triệu đồng"  },
      { key: "sp_khac",       label: "Sản phẩm khác",               unit: "Sản phẩm"    },
      { key: "csat",          label: "CSAT",                         unit: "Điểm"        },
    ],
  },
  {
    id: "CAM_BINH", name: "PGD Cẩm Bình", fullName: "Phòng Giao Dịch Cẩm Bình", color: "#9f1239",
    members: [{ id: "NHA", name: "Nguyễn Hồng Ánh", role: "UB" }],
    metrics: [
      { key: "so_luong_gd",   label: "Số lượng giao dịch",        unit: "Giao dịch"  },
      { key: "so_luong_kh",   label: "Số lượng KH giao dịch",     unit: "Khách hàng" },
      { key: "kh_smb_moi",    label: "Số lượng KH SMB mới",       unit: "Khách hàng" },
      { key: "trinh_bay_sp",  label: "Trình bày SP",               unit: "Khách hàng" },
      { key: "kh_chot_ban",   label: "KH chốt bán",               unit: "Khách hàng" },
      { key: "sp_chot_ban",   label: "SP chốt bán",               unit: "Sản phẩm"   },
      { key: "ds_tien_gui",   label: "Doanh số tiền gửi online",  unit: "Triệu đồng" },
      { key: "ds_bh_metlife", label: "Doanh số Bảo hiểm Metlife", unit: "Triệu đồng" },
      { key: "sp_khac",       label: "Sản phẩm khác",             unit: "Sản phẩm"   },
      { key: "csat",          label: "CSAT",                       unit: "Điểm"       },
    ],
  },
  {
    id: "CAM_THUY", name: "PGD Cẩm Thủy", fullName: "Phòng Giao Dịch Cẩm Thủy", color: "#6d28d9",
    members: [{ id: "PKL", name: "Phạm Khánh Linh", role: "UB" }],
    metrics: [
      { key: "so_luong_gd",   label: "Số lượng giao dịch",        unit: "Giao dịch"  },
      { key: "so_luong_kh",   label: "Số lượng KH giao dịch",     unit: "Khách hàng" },
      { key: "kh_smb_moi",    label: "Số lượng KH SMB mới",       unit: "Khách hàng" },
      { key: "trinh_bay_sp",  label: "Trình bày SP",               unit: "Khách hàng" },
      { key: "kh_chot_ban",   label: "KH chốt bán",               unit: "Khách hàng" },
      { key: "sp_chot_ban",   label: "SP chốt bán",               unit: "Sản phẩm"   },
      { key: "ds_tien_gui",   label: "Doanh số tiền gửi online",  unit: "Triệu đồng" },
      { key: "ds_bh_metlife", label: "Doanh số Bảo hiểm Metlife", unit: "Triệu đồng" },
      { key: "sp_khac",       label: "Sản phẩm khác",             unit: "Sản phẩm"   },
      { key: "csat",          label: "CSAT",                       unit: "Điểm"       },
    ],
  },
];

// ══════════════════════════════════════════════════════════
// HELPERS UI
// ══════════════════════════════════════════════════════════
function getRatioColor(r) {
  if (r >= 1)   return "#057a55";
  if (r >= 0.8) return "#c27803";
  return "#c81e1e";
}
function getRatioBg(r) {
  if (r >= 1)   return "#def7ec";
  if (r >= 0.8) return "#fdf6b2";
  return "#fde8e8";
}
function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: "#e5e7eb", borderRadius: 4, height: 6, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: getRatioColor(max > 0 ? value / max : 0), borderRadius: 4, transition: "width 0.4s" }} />
    </div>
  );
}
function Badge({ role }) {
  const c = role === "LS" ? { bg: "#fff7ed", text: "#c2410c" } : { bg: "#fce7f3", text: "#9d174d" };
  return <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: 0.5 }}>{role}</span>;
}
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", flex: 1 }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || "#111827" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Toast
function Toast({ msg, type = "success", onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  const bg = type === "error" ? "#dc2626" : type === "saving" ? "#f59e0b" : "#111827";
  const icon = type === "error" ? "❌" : type === "saving" ? "⏳" : "✅";
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: bg, color: "#fff", padding: "11px 24px", borderRadius: 24, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,.25)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
      {icon} {msg}
    </div>
  );
}

// Online indicator
function SyncBadge({ online, saving, lastSync }) {
  const t = lastSync ? lastSync.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: saving ? "#f59e0b" : online ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
      {saving ? "Đang lưu..." : online ? (t ? `Đồng bộ ${t}` : "Đã kết nối") : "Mất kết nối"}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════
export default function App() {
  // ── Firebase state ──────────────────────────────────────
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [allWeekData, setAllWeekData] = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [online, setOnline]     = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [toast, setToast]       = useState(null);
  const unsubRefs = useRef([]);

  // ── UI state ─────────────────────────────────────────────
  const [activeDept, setActiveDept]         = useState("QTTD");
  const [activeTab, setActiveTab]           = useState("daily");
  const [selectedWeek, setSelectedWeek]     = useState("Tuần 2");
  const [selectedMonth, setSelectedMonth]   = useState("2026-01");
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryMember, setEntryMember]       = useState(null);
  const [entryWeek, setEntryWeek]           = useState("Tuần 1");
  const [entryForm, setEntryForm]           = useState({});
  const [showAddModal, setShowAddModal]     = useState(false);
  const [newMemberForm, setNewMemberForm]   = useState({ name: "", role: "LS" });
  const [confirmDelete, setConfirmDelete]   = useState(null);

  // ── Subscribe to Firestore real-time ────────────────────
  useEffect(() => {
    setLoading(true);

    // Listen departments
    const unsubDepts = onSnapshot(DOC_DEPARTMENTS,
      (snap) => {
        if (snap.exists()) setDepartments(snap.data().list);
        setOnline(true);
        setLastSync(new Date());
      },
      (err) => { console.error(err); setOnline(false); }
    );

    // Listen weekdata
    const unsubWeek = onSnapshot(DOC_WEEKDATA,
      (snap) => {
        if (snap.exists()) setAllWeekData(snap.data().data || {});
        setOnline(true);
        setLastSync(new Date());
        setLoading(false);
      },
      (err) => { console.error(err); setOnline(false); setLoading(false); }
    );

    // Init Firestore with defaults if empty
    Promise.all([getDoc(DOC_DEPARTMENTS), getDoc(DOC_WEEKDATA)]).then(([dSnap, wSnap]) => {
      if (!dSnap.exists()) setDoc(DOC_DEPARTMENTS, { list: DEFAULT_DEPARTMENTS, updatedAt: serverTimestamp() });
      if (!wSnap.exists()) setDoc(DOC_WEEKDATA,    { data: {},                  updatedAt: serverTimestamp() });
    });

    unsubRefs.current = [unsubDepts, unsubWeek];
    return () => unsubRefs.current.forEach(u => u());
  }, []);

  // ── Write helpers ─────────────────────────────────────────
  const writeDepts = useCallback(async (depts) => {
    setSaving(true);
    try {
      await setDoc(DOC_DEPARTMENTS, { list: depts, updatedAt: serverTimestamp() });
    } catch (e) {
      setToast({ msg: "Lỗi lưu dữ liệu: " + e.message, type: "error" });
    }
    setSaving(false);
  }, []);

  const writeWeekData = useCallback(async (data) => {
    setSaving(true);
    try {
      await setDoc(DOC_WEEKDATA, { data, updatedAt: serverTimestamp() });
    } catch (e) {
      setToast({ msg: "Lỗi lưu dữ liệu: " + e.message, type: "error" });
    }
    setSaving(false);
  }, []);

  // ── Derived ───────────────────────────────────────────────
  const dept       = departments.find(d => d.id === activeDept) || departments[0];
  const deptColor  = dept.color;
  const monthLabel = MONTHS.find(m => m.key === selectedMonth)?.label || selectedMonth;
  const weekData   = allWeekData[activeDept]?.[selectedMonth] || {};

  // For "daily" tab: use selected week's data as today's snapshot
  const todayRecords = {};
  dept.members.forEach(m => {
    todayRecords[m.id] = {};
    dept.metrics.forEach(met => {
      todayRecords[m.id][met.key] = weekData[m.id]?.[met.key]?.[selectedWeek] || { target: 0, actual: 0 };
    });
  });

  const deptTotals = useMemo(() => {
    const totals = {};
    dept.metrics.forEach(metric => {
      let tT = 0, tA = 0;
      dept.members.forEach(m => {
        const d = weekData[m.id]?.[metric.key]?.[selectedWeek];
        if (d) { tT += d.target; tA += d.actual; }
      });
      totals[metric.key] = { target: tT, actual: tA };
    });
    return totals;
  }, [activeDept, selectedWeek, selectedMonth, departments, allWeekData]);

  const overallRatio = useMemo(() => {
    let tT = 0, tA = 0;
    Object.values(deptTotals).forEach(({ target, actual }) => { tT += target; tA += actual; });
    return tT > 0 ? tA / tT : 0;
  }, [deptTotals]);

  const completedMetrics = Object.values(deptTotals).filter(d => d.target > 0 && d.actual >= d.target).length;

  // ── Entry modal ───────────────────────────────────────────
  function openEntryModal(memberId) {
    setEntryMember(memberId);
    setEntryWeek(selectedWeek);
    const init = {};
    dept.metrics.forEach(m => { init[m.key] = { target: "", actual: "" }; });
    const existing = allWeekData[activeDept]?.[selectedMonth]?.[memberId];
    if (existing) {
      dept.metrics.forEach(m => {
        const v = existing[m.key]?.[selectedWeek];
        if (v) init[m.key] = { target: String(v.target), actual: String(v.actual) };
      });
    }
    setEntryForm(init);
    setShowEntryModal(true);
  }

  function switchEntryWeek(w) {
    setEntryWeek(w);
    const init = {};
    dept.metrics.forEach(m => { init[m.key] = { target: "", actual: "" }; });
    const existing = allWeekData[activeDept]?.[selectedMonth]?.[entryMember];
    if (existing) {
      dept.metrics.forEach(m => {
        const v = existing[m.key]?.[w];
        if (v) init[m.key] = { target: String(v.target), actual: String(v.actual) };
      });
    }
    setEntryForm(init);
  }

  // ── Save entry → Firestore ────────────────────────────────
  async function saveEntry() {
    const updated = JSON.parse(JSON.stringify(allWeekData));
    if (!updated[activeDept]) updated[activeDept] = {};
    if (!updated[activeDept][selectedMonth]) updated[activeDept][selectedMonth] = {};
    if (!updated[activeDept][selectedMonth][entryMember]) updated[activeDept][selectedMonth][entryMember] = {};
    dept.metrics.forEach(m => {
      if (!updated[activeDept][selectedMonth][entryMember][m.key])
        updated[activeDept][selectedMonth][entryMember][m.key] = {};
      updated[activeDept][selectedMonth][entryMember][m.key][entryWeek] = {
        target: Number(entryForm[m.key]?.target) || 0,
        actual: Number(entryForm[m.key]?.actual) || 0,
      };
    });
    setShowEntryModal(false);
    await writeWeekData(updated);
    const name = dept.members.find(m => m.id === entryMember)?.name?.split(" ").pop();
    setToast({ msg: `Đã lưu: ${name} · ${entryWeek} · ${monthLabel}` });
  }

  // ── Add member → Firestore ────────────────────────────────
  async function addMember() {
    if (!newMemberForm.name.trim()) return;
    const newId = "M" + Date.now();
    const newMember = { id: newId, name: newMemberForm.name.trim(), role: newMemberForm.role };
    const newDepts = departments.map(d =>
      d.id === activeDept ? { ...d, members: [...d.members, newMember] } : d
    );
    const newWData = JSON.parse(JSON.stringify(allWeekData));
    if (!newWData[activeDept]) newWData[activeDept] = {};
    MONTHS.forEach(({ key: mk }) => {
      if (!newWData[activeDept][mk]) newWData[activeDept][mk] = {};
      newWData[activeDept][mk][newId] = {};
      dept.metrics.forEach(met => {
        newWData[activeDept][mk][newId][met.key] = {};
        WEEKS.forEach(w => { newWData[activeDept][mk][newId][met.key][w] = { target: 0, actual: 0 }; });
      });
    });
    setShowAddModal(false);
    await Promise.all([writeDepts(newDepts), writeWeekData(newWData)]);
    setToast({ msg: `Đã thêm: ${newMember.name}` });
  }

  // ── Delete member → Firestore ─────────────────────────────
  async function deleteMember(memberId) {
    const name = dept.members.find(m => m.id === memberId)?.name?.split(" ").pop();
    const newDepts = departments.map(d =>
      d.id === activeDept ? { ...d, members: d.members.filter(m => m.id !== memberId) } : d
    );
    const newWData = JSON.parse(JSON.stringify(allWeekData));
    MONTHS.forEach(({ key: mk }) => {
      if (newWData[activeDept]?.[mk]?.[memberId]) delete newWData[activeDept][mk][memberId];
    });
    setConfirmDelete(null);
    if (selectedMember === memberId) setSelectedMember(null);
    await Promise.all([writeDepts(newDepts), writeWeekData(newWData)]);
    setToast({ msg: `Đã xóa: ${name}` });
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc", gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid #e5e7eb", borderTopColor: "#1a56db", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#6b7280", fontSize: 14, fontWeight: 600 }}>Đang kết nối Firebase...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#111827" }}>

      {/* ── HEADER ── */}
      <div style={{ background: "#0f172a", color: "#fff", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, gap: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: deptColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>⬡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Hệ thống Quản lý Hiệu suất</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Kỳ đánh giá: {monthLabel} · Tuần {selectedWeek.split(" ")[1]}/5</div>
          </div>

          <SyncBadge online={online} saving={saving} lastSync={lastSync} />

          {/* Month picker */}
          <div style={{ position: "relative" }}>
            <button onClick={e => { e.stopPropagation(); setShowMonthPicker(v => !v); }}
              style={{ fontSize: 12, color: "#e2e8f0", background: "#1e293b", padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 600 }}>
              📅 {monthLabel} ▾
            </button>
            {showMonthPicker && (
              <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: 40, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.15)", zIndex: 300, minWidth: 182, overflow: "hidden" }}>
                {MONTHS.map(m => (
                  <button key={m.key} onClick={() => { setSelectedMonth(m.key); setShowMonthPicker(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 16px", border: "none", background: m.key === selectedMonth ? deptColor : "transparent", color: m.key === selectedMonth ? "#fff" : "#374151", cursor: "pointer", fontSize: 13, fontWeight: m.key === selectedMonth ? 700 : 400 }}>
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dept tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {departments.map(d => (
            <button key={d.id} onClick={() => { setActiveDept(d.id); setSelectedMember(null); setShowMonthPicker(false); }}
              style={{ background: activeDept === d.id ? d.color : "transparent", color: activeDept === d.id ? "#fff" : "#94a3b8", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600, transition: "all 0.2s", borderBottom: activeDept === d.id ? `2px solid ${d.color}` : "2px solid transparent" }}>
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 24px" }} onClick={() => setShowMonthPicker(false)}>

        {/* Sub tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {[
            { key: "daily",   label: "📋 Báo cáo ngày" },
            { key: "weekly",  label: "📊 Kết quả tuần" },
            { key: "members", label: "👥 Thành viên"   },
            { key: "entry",   label: "✏️ Nhập liệu"    },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ background: activeTab === t.key ? deptColor : "transparent", color: activeTab === t.key ? "#fff" : "#6b7280", border: "none", cursor: "pointer", borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 600, transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <StatCard label="Tỷ lệ hoàn thành tổng" value={`${(overallRatio * 100).toFixed(0)}%`} sub={selectedWeek} color={getRatioColor(overallRatio)} />
          <StatCard label="Chỉ tiêu đạt kế hoạch" value={`${completedMetrics}/${dept.metrics.length}`} sub="chỉ tiêu" color={deptColor} />
          <StatCard label="Số thành viên" value={dept.members.length} sub={dept.fullName} />
          <StatCard label="Kỳ đánh giá" value={selectedWeek} sub={monthLabel} />
        </div>

        {/* ── DAILY TAB ── */}
        {activeTab === "daily" && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Báo cáo hàng ngày</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{dept.fullName} · {monthLabel} · {selectedWeek}</div>
              </div>
              <div style={{ background: getRatioBg(overallRatio), color: getRatioColor(overallRatio), padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                TH: {(overallRatio * 100).toFixed(0)}%
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", minWidth: 180 }}>Hoạt động / Chỉ tiêu</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Đơn vị</th>
                    {dept.members.map(m => (
                      <th key={m.id} style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e5e7eb", minWidth: 130 }}>
                        <div style={{ fontWeight: 700, color: "#111827", fontSize: 12 }}>{m.name.split(" ").slice(-2).join(" ")}</div>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 3 }}><Badge role={m.role} /></div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, color: "#9ca3af", fontSize: 11, marginTop: 4 }}><span>KH</span><span>TH</span><span>%</span></div>
                      </th>
                    ))}
                    <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e5e7eb", background: "#f0f9ff", minWidth: 130 }}>
                      <div style={{ fontWeight: 700, color: "#1e40af", fontSize: 12 }}>TỔNG PHÒNG</div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 8, color: "#9ca3af", fontSize: 11, marginTop: 20 }}><span>KH</span><span>TH</span><span>%</span></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dept.metrics.map((metric, mi) => {
                    let tT = 0, tA = 0;
                    return (
                      <tr key={metric.key} style={{ background: mi % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 500, color: "#374151" }}>{metric.label}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "#6b7280", fontSize: 12 }}>{metric.unit}</td>
                        {dept.members.map(m => {
                          const d = todayRecords[m.id]?.[metric.key] || { target: 0, actual: 0 };
                          tT += d.target; tA += d.actual;
                          const r = d.target > 0 ? d.actual / d.target : 0;
                          return (
                            <td key={m.id} style={{ padding: "8px 12px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                                <span style={{ color: "#374151", minWidth: 24 }}>{d.target}</span>
                                <span style={{ color: "#111827", fontWeight: 700, minWidth: 24 }}>{d.actual}</span>
                                <span style={{ color: getRatioColor(r), fontWeight: 700, fontSize: 12, background: getRatioBg(r), padding: "1px 6px", borderRadius: 8, minWidth: 36 }}>{d.target > 0 ? (r * 100).toFixed(0) + "%" : "-"}</span>
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ padding: "8px 12px", textAlign: "center", background: "#f0f9ff" }}>
                          {(() => {
                            const r = tT > 0 ? tA / tT : 0;
                            return (
                              <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                                <span style={{ color: "#374151", minWidth: 24 }}>{tT}</span>
                                <span style={{ color: "#1e40af", fontWeight: 800, minWidth: 24 }}>{tA}</span>
                                <span style={{ color: getRatioColor(r), fontWeight: 700, fontSize: 12, background: getRatioBg(r), padding: "1px 6px", borderRadius: 8, minWidth: 36 }}>{tT > 0 ? (r * 100).toFixed(0) + "%" : "-"}</span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── WEEKLY TAB ── */}
        {activeTab === "weekly" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {WEEKS.map(w => (
                <button key={w} onClick={() => setSelectedWeek(w)}
                  style={{ background: selectedWeek === w ? deptColor : "#fff", color: selectedWeek === w ? "#fff" : "#374151", border: `1px solid ${selectedWeek === w ? deptColor : "#e5e7eb"}`, borderRadius: 8, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                  {w}
                </button>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Kết quả thực hiện · {selectedWeek} · {dept.fullName}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{monthLabel}</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #e5e7eb", minWidth: 200 }}>Hoạt động / Chỉ tiêu</th>
                      {dept.members.map(m => (
                        <th key={m.id} style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e5e7eb", minWidth: 130 }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{m.name.split(" ").slice(-2).join(" ")}</div>
                          <Badge role={m.role} />
                        </th>
                      ))}
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e5e7eb", background: "#eff6ff", minWidth: 120 }}>
                        <div style={{ fontWeight: 700, color: "#1e40af" }}>TỔNG</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dept.metrics.map((metric, mi) => {
                      let tT = 0, tA = 0;
                      return (
                        <tr key={metric.key} style={{ background: mi % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 500, color: "#374151" }}>{metric.label}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af" }}>{metric.unit}</div>
                          </td>
                          {dept.members.map(m => {
                            const d = weekData[m.id]?.[metric.key]?.[selectedWeek] || { target: 0, actual: 0 };
                            tT += d.target; tA += d.actual;
                            const r = d.target > 0 ? d.actual / d.target : 0;
                            return (
                              <td key={m.id} style={{ padding: "10px 12px", textAlign: "center" }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: getRatioColor(r) }}>{d.actual}</div>
                                <div style={{ fontSize: 11, color: "#9ca3af" }}>KH: {d.target}</div>
                                <ProgressBar value={d.actual} max={d.target} />
                                <div style={{ fontSize: 11, fontWeight: 600, color: getRatioColor(r), marginTop: 2 }}>{d.target > 0 ? (r * 100).toFixed(0) + "%" : "-"}</div>
                              </td>
                            );
                          })}
                          <td style={{ padding: "10px 12px", textAlign: "center", background: "#eff6ff" }}>
                            {(() => {
                              const r = tT > 0 ? tA / tT : 0;
                              return (<>
                                <div style={{ fontSize: 18, fontWeight: 800, color: getRatioColor(r) }}>{tA}</div>
                                <div style={{ fontSize: 11, color: "#9ca3af" }}>KH: {tT}</div>
                                <ProgressBar value={tA} max={tT} />
                                <div style={{ fontSize: 11, fontWeight: 700, color: getRatioColor(r), marginTop: 2 }}>{tT > 0 ? (r * 100).toFixed(0) + "%" : "-"}</div>
                              </>);
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {activeTab === "members" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => { setNewMemberForm({ name: "", role: activeDept === "QTTD" ? "LS" : "UB" }); setShowAddModal(true); }}
                style={{ background: deptColor, color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                ＋ Thêm nhân viên
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {dept.members.map(member => {
                let totalT = 0, totalA = 0;
                dept.metrics.forEach(metric => {
                  const d = weekData[member.id]?.[metric.key]?.[selectedWeek];
                  if (d) { totalT += d.target; totalA += d.actual; }
                });
                const ratio = totalT > 0 ? totalA / totalT : 0;
                return (
                  <div key={member.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, cursor: "pointer", position: "relative" }}
                    onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(member.id); }}
                      style={{ position: "absolute", top: 12, right: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "3px 9px", fontSize: 12, color: "#dc2626", cursor: "pointer", fontWeight: 600 }}>
                      🗑 Xóa
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: deptColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                        {member.name.split(" ").pop()[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{member.name}</div>
                        <Badge role={member.role} />
                      </div>
                      <div style={{ marginLeft: "auto", textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: getRatioColor(ratio) }}>{(ratio * 100).toFixed(0)}%</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>TH tổng</div>
                      </div>
                    </div>
                    <ProgressBar value={totalA} max={totalT} />
                    <div style={{ marginTop: 12 }}>
                      {dept.metrics.slice(0, 4).map(metric => {
                        const d = weekData[member.id]?.[metric.key]?.[selectedWeek] || { target: 0, actual: 0 };
                        const r = d.target > 0 ? d.actual / d.target : 0;
                        return (
                          <div key={metric.key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                            <span style={{ color: "#6b7280", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{metric.label}</span>
                            <span style={{ color: getRatioColor(r), fontWeight: 600, marginLeft: 8 }}>{d.actual}/{d.target}</span>
                          </div>
                        );
                      })}
                    </div>
                    {selectedMember === member.id && (
                      <div style={{ marginTop: 16, borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: "#374151", fontSize: 13 }}>Chi tiết theo tuần · {monthLabel}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {WEEKS.map(w => {
                            let wT = 0, wA = 0;
                            dept.metrics.forEach(m => { const d = weekData[member.id]?.[m.key]?.[w]; if (d) { wT += d.target; wA += d.actual; } });
                            const wr = wT > 0 ? wA / wT : 0;
                            return (
                              <div key={w} style={{ flex: 1, textAlign: "center", background: getRatioBg(wr), borderRadius: 8, padding: "6px 4px" }}>
                                <div style={{ fontSize: 10, color: "#6b7280" }}>{w.replace("Tuần ", "T")}</div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: getRatioColor(wr) }}>{(wr * 100).toFixed(0)}%</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ENTRY TAB ── */}
        {activeTab === "entry" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Nhập số liệu · {monthLabel}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>Dữ liệu lưu lên Firebase, đồng bộ ngay cho tất cả mọi người 🔥</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {WEEKS.map(w => (
                <button key={w} onClick={() => setSelectedWeek(w)}
                  style={{ background: selectedWeek === w ? deptColor : "#fff", color: selectedWeek === w ? "#fff" : "#374151", border: `1px solid ${selectedWeek === w ? deptColor : "#e5e7eb"}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {w}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {dept.members.map(m => {
                const hasData = dept.metrics.some(met => {
                  const v = allWeekData[activeDept]?.[selectedMonth]?.[m.id]?.[met.key]?.[selectedWeek];
                  return v && (v.target > 0 || v.actual > 0);
                });
                return (
                  <div key={m.id} onClick={() => openEntryModal(m.id)}
                    style={{ background: "#fff", border: `2px solid ${hasData ? deptColor : "#e5e7eb"}`, borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.2s", position: "relative" }}>
                    {hasData && <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: "50%", background: "#057a55" }} />}
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: hasData ? deptColor : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: hasData ? "#fff" : "#9ca3af", fontWeight: 800, marginBottom: 10 }}>
                      {m.name.split(" ").pop()[0]}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.name}</div>
                    <Badge role={m.role} />
                    <div style={{ marginTop: 10, fontSize: 12, color: hasData ? "#057a55" : "#9ca3af" }}>
                      {hasData ? "✓ Đã nhập liệu" : "Nhấp để nhập liệu"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ MODAL: NHẬP LIỆU ══ */}
      {showEntryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>Nhập liệu</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{dept.members.find(m => m.id === entryMember)?.name} · {monthLabel}</div>
              </div>
              <button onClick={() => setShowEntryModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ padding: "12px 24px 0", display: "flex", gap: 6 }}>
              {WEEKS.map(w => (
                <button key={w} onClick={() => switchEntryWeek(w)}
                  style={{ flex: 1, background: entryWeek === w ? deptColor : "#f3f4f6", color: entryWeek === w ? "#fff" : "#374151", border: "none", borderRadius: 7, padding: "6px 4px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  {w.replace("Tuần ", "T")}
                </button>
              ))}
            </div>
            <div style={{ padding: "16px 24px" }}>
              {dept.metrics.map(metric => (
                <div key={metric.key} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>{metric.label} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({metric.unit})</span></div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Kế hoạch</label>
                      <input type="number" value={entryForm[metric.key]?.target || ""} onChange={e => setEntryForm(p => ({ ...p, [metric.key]: { ...p[metric.key], target: e.target.value } }))}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} placeholder="0" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Thực hiện</label>
                      <input type="number" value={entryForm[metric.key]?.actual || ""} onChange={e => setEntryForm(p => ({ ...p, [metric.key]: { ...p[metric.key], actual: e.target.value } }))}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} placeholder="0" />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Tỷ lệ HT</label>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "8px 12px", background: "#f9fafb", borderRadius: 8, fontSize: 14, fontWeight: 700, color: deptColor }}>
                        {entryForm[metric.key]?.target > 0 ? ((entryForm[metric.key]?.actual / entryForm[metric.key]?.target) * 100).toFixed(0) + "%" : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowEntryModal(false)} style={{ padding: "10px 20px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#374151" }}>Hủy</button>
              <button onClick={saveEntry} disabled={saving}
                style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: deptColor, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Đang lưu..." : "🔥 Lưu lên Firebase"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: THÊM NHÂN VIÊN ══ */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Thêm nhân viên mới</div>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Họ và tên</label>
                <input type="text" value={newMemberForm.name} onChange={e => setNewMemberForm(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addMember()}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 9, fontSize: 14, boxSizing: "border-box" }}
                  placeholder="Nhập họ và tên đầy đủ..." autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Vị trí</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["LS", "UB"].map(role => (
                    <button key={role} onClick={() => setNewMemberForm(p => ({ ...p, role }))}
                      style={{ flex: 1, padding: 10, border: `2px solid ${newMemberForm.role === role ? deptColor : "#e5e7eb"}`, borderRadius: 9, background: newMemberForm.role === role ? deptColor : "#fff", color: newMemberForm.role === role ? "#fff" : "#374151", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: "10px 20px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#374151" }}>Hủy</button>
              <button onClick={addMember} disabled={!newMemberForm.name.trim() || saving}
                style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: newMemberForm.name.trim() ? deptColor : "#e5e7eb", color: newMemberForm.name.trim() ? "#fff" : "#9ca3af", cursor: newMemberForm.name.trim() ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700 }}>
                Thêm nhân viên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: XÁC NHẬN XÓA ══ */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Xác nhận xóa nhân viên</div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>Bạn có chắc muốn xóa <strong>{dept.members.find(m => m.id === confirmDelete)?.name}</strong>?</div>
            <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 24, background: "#fef2f2", padding: "8px 14px", borderRadius: 8 }}>
              Toàn bộ dữ liệu trên tất cả các tháng sẽ bị xóa vĩnh viễn khỏi Firebase.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 11, border: "1px solid #e5e7eb", borderRadius: 9, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Hủy</button>
              <button onClick={() => deleteMember(confirmDelete)} style={{ flex: 1, padding: 11, border: "none", borderRadius: 9, background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
