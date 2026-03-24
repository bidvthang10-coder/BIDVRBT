// ╔══════════════════════════════════════════════════════════╗
// ║  HỆ THỐNG QUẢN LÝ HIỆU SUẤT – Firebase Realtime Sync   ║
// ║  Phân quyền: Admin / Phòng ban                         ║
// ╚══════════════════════════════════════════════════════════╝

import { useState, useMemo, useEffect, useCallback } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp
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
const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);
const DOC_DEPTS = doc(db, "appdata", "departments");
const DOC_DAILY = doc(db, "appdata", "dailydata");

// ══════════════════════════════════════════════════════════
// PHÂN QUYỀN – danh sách tài khoản
// Để đổi mật khẩu: sửa trường "password" tương ứng
// ══════════════════════════════════════════════════════════
const USERS = [
  { username: "admin",   password: "admin@bidv",   role: "admin", deptId: null,       label: "Quản trị viên",  color: "#0f172a" },
  { username: "qttd",    password: "qttd@bidv",    role: "dept",  deptId: "QTTD",     label: "Phòng QTTD",     color: "#1a56db" },
  { username: "gdkh",    password: "gdkh@bidv",    role: "dept",  deptId: "GDKH",     label: "Phòng GDKH",     color: "#057a55" },
  { username: "cambinh", password: "cambinh@bidv", role: "dept",  deptId: "CAM_BINH", label: "PGD Cẩm Bình",   color: "#9f1239" },
  { username: "camthuy", password: "camthuy@bidv", role: "dept",  deptId: "CAM_THUY", label: "PGD Cẩm Thủy",   color: "#6d28d9" },
];

// ══════════════════════════════════════════════════════════
// HẰNG SỐ
// ══════════════════════════════════════════════════════════
const MONTHS = [
  { key: "2026-01", label: "Tháng 1/2026"  },
  { key: "2026-02", label: "Tháng 2/2026"  },
  { key: "2026-03", label: "Tháng 3/2026"  },
  { key: "2026-04", label: "Tháng 4/2026"  },
  { key: "2026-05", label: "Tháng 5/2026"  },
  { key: "2026-06", label: "Tháng 6/2026"  },
  { key: "2026-07", label: "Tháng 7/2026"  },
  { key: "2026-08", label: "Tháng 8/2026"  },
  { key: "2026-09", label: "Tháng 9/2026"  },
  { key: "2026-10", label: "Tháng 10/2026" },
  { key: "2026-11", label: "Tháng 11/2026" },
  { key: "2026-12", label: "Tháng 12/2026" },
];
const WEEKS        = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5"];
const DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const DAY_SHORT    = ["T2", "T3", "T4", "T5", "T6", "T7"];

function makeDayKey(week, day) { return `${week.replace(" ", "")}-${day.replace(" ", "")}`; }
function daysOfWeek(week) { return DAYS_OF_WEEK.map(d => makeDayKey(week, d)); }
function daysOfMonth() {
  const days = [];
  WEEKS.forEach(w => DAYS_OF_WEEK.forEach(d => days.push(makeDayKey(w, d))));
  return days;
}

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
      { key: "so_luong_gd",   label: "Số lượng giao dịch",         unit: "Giao dịch"  },
      { key: "so_luong_kh",   label: "Số lượng KH giao dịch",      unit: "Khách hàng" },
      { key: "kh_smb_moi",    label: "Số lượng KH SMB mới",        unit: "Khách hàng" },
      { key: "trinh_bay_sp",  label: "Trình bày SP",                unit: "Khách hàng" },
      { key: "gioi_thieu",    label: "Giới thiệu vị trí khác",     unit: "Khách hàng" },
      { key: "kh_chot_ban",   label: "KH chốt bán",                unit: "Khách hàng" },
      { key: "sp_chot_ban",   label: "SP chốt bán",                unit: "Sản phẩm"   },
      { key: "sp_so",         label: "SP số (TTHĐ, TK số đẹp...)", unit: "Sản phẩm"   },
      { key: "ds_tien_gui",   label: "Doanh số tiền gửi online",   unit: "Triệu đồng" },
      { key: "ds_bh_metlife", label: "Doanh số Bảo hiểm Metlife",  unit: "Triệu đồng" },
      { key: "sp_khac",       label: "Sản phẩm khác",              unit: "Sản phẩm"   },
      { key: "csat",          label: "CSAT",                        unit: "Điểm"       },
    ],
  },
  {
    id: "CAM_BINH", name: "PGD Cẩm Bình", fullName: "Phòng Giao Dịch Cẩm Bình", color: "#9f1239",
    members: [{ id: "NHA", name: "Nguyễn Hồng Ánh", role: "UB" }],
    metrics: [
      { key: "so_luong_gd",   label: "Số lượng giao dịch",       unit: "Giao dịch"  },
      { key: "so_luong_kh",   label: "Số lượng KH giao dịch",    unit: "Khách hàng" },
      { key: "kh_smb_moi",    label: "Số lượng KH SMB mới",      unit: "Khách hàng" },
      { key: "trinh_bay_sp",  label: "Trình bày SP",              unit: "Khách hàng" },
      { key: "kh_chot_ban",   label: "KH chốt bán",              unit: "Khách hàng" },
      { key: "sp_chot_ban",   label: "SP chốt bán",              unit: "Sản phẩm"   },
      { key: "ds_tien_gui",   label: "Doanh số tiền gửi online", unit: "Triệu đồng" },
      { key: "ds_bh_metlife", label: "Doanh số BH Metlife",      unit: "Triệu đồng" },
      { key: "sp_khac",       label: "Sản phẩm khác",            unit: "Sản phẩm"   },
      { key: "csat",          label: "CSAT",                      unit: "Điểm"       },
    ],
  },
  {
    id: "CAM_THUY", name: "PGD Cẩm Thủy", fullName: "Phòng Giao Dịch Cẩm Thủy", color: "#6d28d9",
    members: [{ id: "PKL", name: "Phạm Khánh Linh", role: "UB" }],
    metrics: [
      { key: "so_luong_gd",   label: "Số lượng giao dịch",       unit: "Giao dịch"  },
      { key: "so_luong_kh",   label: "Số lượng KH giao dịch",    unit: "Khách hàng" },
      { key: "kh_smb_moi",    label: "Số lượng KH SMB mới",      unit: "Khách hàng" },
      { key: "trinh_bay_sp",  label: "Trình bày SP",              unit: "Khách hàng" },
      { key: "kh_chot_ban",   label: "KH chốt bán",              unit: "Khách hàng" },
      { key: "sp_chot_ban",   label: "SP chốt bán",              unit: "Sản phẩm"   },
      { key: "ds_tien_gui",   label: "Doanh số tiền gửi online", unit: "Triệu đồng" },
      { key: "ds_bh_metlife", label: "Doanh số BH Metlife",      unit: "Triệu đồng" },
      { key: "sp_khac",       label: "Sản phẩm khác",            unit: "Sản phẩm"   },
      { key: "csat",          label: "CSAT",                      unit: "Điểm"       },
    ],
  },
];

// ══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════
function sumMetrics(dailyData, deptId, monthKey, memberId, dayKeys, metricKey) {
  let total = 0;
  dayKeys.forEach(dk => { total += Number(dailyData[deptId]?.[monthKey]?.[memberId]?.[dk]?.[metricKey]?.th || 0); });
  return total;
}
function sumKH(dailyData, deptId, monthKey, memberId, dayKeys, metricKey) {
  let total = 0;
  dayKeys.forEach(dk => { total += Number(dailyData[deptId]?.[monthKey]?.[memberId]?.[dk]?.[metricKey]?.kh || 0); });
  return total;
}
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

// ══════════════════════════════════════════════════════════
// UI COMPONENTS
// ══════════════════════════════════════════════════════════
function Badge({ role }) {
  const c = role === "LS" ? { bg: "#fff7ed", text: "#c2410c" } : { bg: "#fce7f3", text: "#9d174d" };
  return <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{role}</span>;
}
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || "#111827" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function Toast({ msg, type = "success", onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: type === "error" ? "#dc2626" : "#111827", color: "#fff", padding: "11px 24px", borderRadius: 24, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,.25)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
      {type === "error" ? "❌" : "✅"} {msg}
    </div>
  );
}
function SyncBadge({ online, saving, lastSync }) {
  const t = lastSync ? lastSync.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94a3b8" }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: saving ? "#f59e0b" : online ? "#22c55e" : "#ef4444" }} />
      {saving ? "Đang lưu..." : online ? (t ? `Đồng bộ ${t}` : "Đã kết nối") : "Mất kết nối"}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const user = USERS.find(u => u.username === username.trim().toLowerCase() && u.password === password);
      if (user) { onLogin(user); }
      else { setError("Tên đăng nhập hoặc mật khẩu không đúng."); }
      setLoading(false);
    }, 400);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg, #1a56db, #3b82f6)", boxShadow: "0 8px 32px rgba(26,86,219,0.4)", marginBottom: 16 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: "#fff" }}>B</span>
          </div>
          <div style={{ color: "#f8fafc", fontSize: 20, fontWeight: 800 }}>BIDV Cẩm Phả</div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Hệ thống Quản lý Hiệu suất RBT</div>
        </div>

        {/* Card đăng nhập */}
        <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
          <div style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Đăng nhập</div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Tên đăng nhập</label>
              <input type="text" value={username} autoComplete="username"
                onChange={e => setUsername(e.target.value)}
                style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.08)", border: `1px solid ${error ? "#ef4444" : "rgba(255,255,255,0.15)"}`, borderRadius: 12, fontSize: 15, color: "#f1f5f9", boxSizing: "border-box", outline: "none" }}
                placeholder="Nhập tên đăng nhập..." autoFocus />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Mật khẩu</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={password} autoComplete="current-password"
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "12px 44px 12px 16px", background: "rgba(255,255,255,0.08)", border: `1px solid ${error ? "#ef4444" : "rgba(255,255,255,0.15)"}`, borderRadius: 12, fontSize: 15, color: "#f1f5f9", boxSizing: "border-box", outline: "none" }}
                  placeholder="Nhập mật khẩu..." />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 16, padding: 4 }}>
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                ⚠️ {error}
              </div>
            )}
            <button type="submit" disabled={loading || !username || !password}
              style={{ width: "100%", padding: "13px 0", marginTop: 8, background: loading || !username || !password ? "rgba(26,86,219,0.4)" : "linear-gradient(135deg, #1a56db, #3b82f6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading || !username || !password ? "not-allowed" : "pointer", boxShadow: loading || !username || !password ? "none" : "0 4px 16px rgba(26,86,219,0.4)" }}>
              {loading ? "⏳ Đang xác thực..." : "🔐 Đăng nhập"}
            </button>
          </form>

          {/* Gợi ý tài khoản */}
          <div style={{ marginTop: 24, padding: "14px 16px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Tài khoản hệ thống</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {USERS.map(u => (
                <div key={u.username} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}
                  onClick={() => { setUsername(u.username); setPassword(u.password); setError(""); }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: u.color, flexShrink: 0 }} />
                  <span style={{ color: "#94a3b8", minWidth: 76, fontWeight: 600 }}>{u.username}</span>
                  <span style={{ color: "#475569" }}>→</span>
                  <span style={{ color: "#64748b" }}>{u.label}</span>
                  {u.role === "admin" && <span style={{ fontSize: 9, background: "#f59e0b", color: "#78350f", padding: "1px 5px", borderRadius: 6, fontWeight: 800 }}>ADMIN</span>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>💡 Nhấp vào tên để điền tự động</div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 20, color: "#475569", fontSize: 12 }}>BIDV Chi nhánh Cẩm Phả · Hệ thống nội bộ</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// REPORT TABLE
// ══════════════════════════════════════════════════════════
function ReportTable({ dept, metrics, members, dayKeys, dailyData, monthKey, deptColor, title, subtitle }) {
  const deptId = dept.id;
  const deptTotals = useMemo(() => {
    const t = {};
    metrics.forEach(m => {
      let th = 0, kh = 0;
      members.forEach(mb => {
        th += sumMetrics(dailyData, deptId, monthKey, mb.id, dayKeys, m.key);
        kh += sumKH(dailyData, deptId, monthKey, mb.id, dayKeys, m.key);
      });
      t[m.key] = { th, kh };
    });
    return t;
  }, [dailyData, dayKeys, monthKey]);

  const grandTH  = Object.values(deptTotals).reduce((a, b) => a + b.th, 0);
  const grandKH  = Object.values(deptTotals).reduce((a, b) => a + b.kh, 0);
  const grandPct = grandKH > 0 ? Math.round(grandTH / grandKH * 100) : 0;
  const pc = (r) => r >= 100 ? "#057a55" : r >= 80 ? "#c27803" : "#c81e1e";
  const pb = (r) => r >= 100 ? "#def7ec" : r >= 80 ? "#fdf6b2" : "#fde8e8";

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>KH: {grandKH} · TH: {grandTH}</span>
          <span style={{ background: pb(grandPct), color: pc(grandPct), padding: "3px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>{grandPct}%</span>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", minWidth: 170 }}>Chỉ tiêu</th>
              {members.map(m => (
                <th key={m.id} style={{ padding: "8px 6px", textAlign: "center", borderBottom: "1px solid #e5e7eb", minWidth: 150 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{m.name.split(" ").slice(-2).join(" ")}</div>
                  <div style={{ marginTop: 2 }}><Badge role={m.role} /></div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 4, color: "#9ca3af", fontSize: 10, marginTop: 4 }}>
                    <span style={{ minWidth: 36 }}>KH</span><span style={{ minWidth: 36 }}>TH</span><span style={{ minWidth: 36 }}>%HT</span>
                  </div>
                </th>
              ))}
              <th style={{ padding: "8px 6px", textAlign: "center", borderBottom: "1px solid #e5e7eb", background: "#eff6ff", minWidth: 150 }}>
                <div style={{ fontWeight: 700, color: "#1e40af", fontSize: 12 }}>TỔNG PHÒNG</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 4, color: "#9ca3af", fontSize: 10, marginTop: 20 }}>
                  <span style={{ minWidth: 36 }}>KH</span><span style={{ minWidth: 36 }}>TH</span><span style={{ minWidth: 36 }}>%HT</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, mi) => {
              const { th: dTH, kh: dKH } = deptTotals[metric.key] || { th: 0, kh: 0 };
              const dPct = dKH > 0 ? Math.round(dTH / dKH * 100) : 0;
              return (
                <tr key={metric.key} style={{ background: mi % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 500, color: "#374151", fontSize: 12 }}>{metric.label}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{metric.unit}</div>
                  </td>
                  {members.map(mb => {
                    const th = sumMetrics(dailyData, deptId, monthKey, mb.id, dayKeys, metric.key);
                    const kh = sumKH(dailyData, deptId, monthKey, mb.id, dayKeys, metric.key);
                    const pct = kh > 0 ? Math.round(th / kh * 100) : 0;
                    return (
                      <td key={mb.id} style={{ padding: "8px 6px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                          <span style={{ minWidth: 36, color: "#374151", fontSize: 13 }}>{kh || "-"}</span>
                          <span style={{ minWidth: 36, fontWeight: 700, color: th > 0 ? deptColor : "#d1d5db", fontSize: 14 }}>{th || "-"}</span>
                          <span style={{ minWidth: 36, fontWeight: 700, fontSize: 11, color: pc(pct), background: kh > 0 ? pb(pct) : "transparent", padding: "1px 4px", borderRadius: 6 }}>{kh > 0 ? pct + "%" : "-"}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: "8px 6px", textAlign: "center", background: "#eff6ff" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                      <span style={{ minWidth: 36, color: "#374151", fontSize: 13 }}>{dKH || "-"}</span>
                      <span style={{ minWidth: 36, fontWeight: 800, color: dTH > 0 ? "#1e40af" : "#d1d5db", fontSize: 14 }}>{dTH || "-"}</span>
                      <span style={{ minWidth: 36, fontWeight: 700, fontSize: 11, color: pc(dPct), background: dKH > 0 ? pb(dPct) : "transparent", padding: "1px 4px", borderRadius: 6 }}>{dKH > 0 ? dPct + "%" : "-"}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════
export default function App() {
  // ── Auth ────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(() => {
    try { const s = sessionStorage.getItem("bidv_rbt_user"); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });
  function handleLogin(user) { sessionStorage.setItem("bidv_rbt_user", JSON.stringify(user)); setCurrentUser(user); }
  function handleLogout() { sessionStorage.removeItem("bidv_rbt_user"); setCurrentUser(null); }

  // ── Firebase state ──────────────────────────────────────
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [dailyData, setDailyData]     = useState({});
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [online, setOnline]           = useState(true);
  const [lastSync, setLastSync]       = useState(null);
  const [toast, setToast]             = useState(null);

  // ── UI state ────────────────────────────────────────────
  const initDept = currentUser?.role === "dept" ? currentUser.deptId : "QTTD";
  const [activeDept, setActiveDept]           = useState(initDept);
  const [activeTab, setActiveTab]             = useState("daily");
  const [selectedMonth, setSelectedMonth]     = useState("2026-01");
  const [selectedWeek, setSelectedWeek]       = useState("Tuần 1");
  const [selectedDay, setSelectedDay]         = useState("Thứ 2");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMember, setSelectedMember]   = useState(null);
  const [summaryMode, setSummaryMode]         = useState("month");
  const [showUserMenu, setShowUserMenu]       = useState(false);

  // Modal states
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryMember, setEntryMember]       = useState(null);
  const [entryWeek, setEntryWeek]           = useState("Tuần 1");
  const [entryDay, setEntryDay]             = useState("Thứ 2");
  const [entryForm, setEntryForm]           = useState({});
  const [showAddModal, setShowAddModal]       = useState(false);
  const [newMemberForm, setNewMemberForm]     = useState({ name: "", role: "LS" });
  const [confirmDelete, setConfirmDelete]     = useState(null);
  const [showAddDeptModal, setShowAddDeptModal]   = useState(false);
  const [confirmDeleteDept, setConfirmDeleteDept] = useState(null);
  const [newDeptForm, setNewDeptForm] = useState({ name: "", fullName: "", color: "#1a56db", metrics: [{ key: "", label: "", unit: "" }] });

  // ── Quyền truy cập ──────────────────────────────────────
  const isAdmin      = currentUser?.role === "admin";
  const isDept       = currentUser?.role === "dept";
  const canEdit      = (deptId) => isAdmin || (isDept && currentUser.deptId === deptId);
  const canManage    = isAdmin;

  // ── Firebase listeners ──────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const unsubDepts = onSnapshot(DOC_DEPTS,
      snap => { if (snap.exists()) setDepartments(snap.data().list); setOnline(true); setLastSync(new Date()); },
      () => setOnline(false)
    );
    const unsubDaily = onSnapshot(DOC_DAILY,
      snap => { if (snap.exists()) setDailyData(snap.data().data || {}); setOnline(true); setLastSync(new Date()); setLoading(false); },
      () => { setOnline(false); setLoading(false); }
    );
    Promise.all([getDoc(DOC_DEPTS), getDoc(DOC_DAILY)]).then(([ds, dd]) => {
      if (!ds.exists()) setDoc(DOC_DEPTS, { list: DEFAULT_DEPARTMENTS, updatedAt: serverTimestamp() });
      if (!dd.exists()) setDoc(DOC_DAILY, { data: {}, updatedAt: serverTimestamp() });
    });
    return () => { unsubDepts(); unsubDaily(); };
  }, [currentUser]);

  useEffect(() => {
    if (isDept) setActiveDept(currentUser.deptId);
  }, [currentUser]);

  // ── Write helpers ───────────────────────────────────────
  const writeDepts = useCallback(async (d) => {
    setSaving(true);
    try { await setDoc(DOC_DEPTS, { list: d, updatedAt: serverTimestamp() }); }
    catch (e) { setToast({ msg: "Lỗi: " + e.message, type: "error" }); }
    setSaving(false);
  }, []);
  const writeDailyData = useCallback(async (d) => {
    setSaving(true);
    try { await setDoc(DOC_DAILY, { data: d, updatedAt: serverTimestamp() }); }
    catch (e) { setToast({ msg: "Lỗi: " + e.message, type: "error" }); }
    setSaving(false);
  }, []);

  // ── Derived values ──────────────────────────────────────
  const isSummary        = activeDept === "__SUMMARY__";
  const dept             = departments.find(d => d.id === activeDept) || departments[0];
  const deptColor        = isSummary ? "#f59e0b" : (dept?.color || "#1a56db");
  const monthLabel       = MONTHS.find(m => m.key === selectedMonth)?.label || selectedMonth;
  const currentDayKey    = makeDayKey(selectedWeek, selectedDay);
  const currentWeekDays  = daysOfWeek(selectedWeek);
  const currentMonthDays = daysOfMonth();

  const dayGrandTotal = useMemo(() => {
    if (!dept) return 0;
    return dept.members.reduce((s, m) => s + dept.metrics.reduce((ss, met) => ss + sumMetrics(dailyData, activeDept, selectedMonth, m.id, [currentDayKey], met.key), 0), 0);
  }, [dailyData, activeDept, selectedMonth, currentDayKey, departments]);

  const weekGrandTotal = useMemo(() => {
    if (!dept) return 0;
    return dept.members.reduce((s, m) => s + dept.metrics.reduce((ss, met) => ss + sumMetrics(dailyData, activeDept, selectedMonth, m.id, currentWeekDays, met.key), 0), 0);
  }, [dailyData, activeDept, selectedMonth, selectedWeek, departments]);

  const monthGrandTotal = useMemo(() => {
    if (!dept) return 0;
    return dept.members.reduce((s, m) => s + dept.metrics.reduce((ss, met) => ss + sumMetrics(dailyData, activeDept, selectedMonth, m.id, currentMonthDays, met.key), 0), 0);
  }, [dailyData, activeDept, selectedMonth, departments]);

  // ── Entry modal ─────────────────────────────────────────
  function openEntryModal(memberId) {
    setEntryMember(memberId); setEntryWeek(selectedWeek); setEntryDay(selectedDay);
    loadEntryForm(memberId, selectedWeek, selectedDay); setShowEntryModal(true);
  }
  function loadEntryForm(memberId, week, day) {
    const dk = makeDayKey(week, day);
    const init = {};
    dept.metrics.forEach(m => {
      const ex = dailyData[activeDept]?.[selectedMonth]?.[memberId]?.[dk]?.[m.key];
      init[m.key + "_kh"] = ex?.kh !== undefined ? String(ex.kh) : "";
      init[m.key + "_th"] = ex?.th !== undefined ? String(ex.th) : "";
    });
    setEntryForm(init);
  }
  function switchEntryDay(week, day) { setEntryWeek(week); setEntryDay(day); loadEntryForm(entryMember, week, day); }
  async function saveEntry() {
    if (!canEdit(activeDept)) return;
    const dk = makeDayKey(entryWeek, entryDay);
    // Dùng updateDoc + dot-notation: chỉ ghi đúng các field cần thiết
    // → tránh race condition khi nhiều phòng cùng nhập lúc đó
    const fields = {};
    dept.metrics.forEach(m => {
      const path = "data." + activeDept + "." + selectedMonth + "." + entryMember + "." + dk + "." + m.key;
      fields[path] = {
        kh: Number(entryForm[m.key + "_kh"]) || 0,
        th: Number(entryForm[m.key + "_th"]) || 0,
      };
    });
    setShowEntryModal(false);
    setSaving(true);
    try {
      await updateDoc(DOC_DAILY, fields);
      const name = dept.members.find(m => m.id === entryMember)?.name?.split(" ").pop();
      setToast({ msg: `Đã lưu: ${name} · ${entryWeek} ${entryDay}` });
    } catch (e) {
      if (e.code === "not-found") {
        try {
          await setDoc(DOC_DAILY, { data: {}, updatedAt: serverTimestamp() });
          await updateDoc(DOC_DAILY, fields);
          const name = dept.members.find(m => m.id === entryMember)?.name?.split(" ").pop();
          setToast({ msg: `Đã lưu: ${name} · ${entryWeek} ${entryDay}` });
        } catch (e2) { setToast({ msg: "Lỗi: " + e2.message, type: "error" }); }
      } else {
        setToast({ msg: "Lỗi: " + e.message, type: "error" });
      }
    }
    setSaving(false);
  }

  // ── Dept management ─────────────────────────────────────
  async function addDept() {
    if (!canManage) return;
    const name = newDeptForm.name.trim(); if (!name) return;
    const newId = "D" + Date.now();
    const newDept = { id: newId, name, fullName: newDeptForm.fullName.trim() || name, color: newDeptForm.color, members: [],
      metrics: newDeptForm.metrics.filter(m => m.label.trim()).map((m, i) => ({ key: m.key.trim() || "metric_" + i, label: m.label.trim(), unit: m.unit.trim() || "Chỉ tiêu" })) };
    const newDepts = [...departments, newDept];
    setShowAddDeptModal(false);
    setNewDeptForm({ name: "", fullName: "", color: "#1a56db", metrics: [{ key: "", label: "", unit: "" }] });
    await writeDepts(newDepts); setActiveDept(newId);
    setToast({ msg: `Đã thêm phòng: ${name}` });
  }
  async function deleteDept(deptId) {
    if (!canManage) return;
    const dName = departments.find(d => d.id === deptId)?.name;
    const newDepts = departments.filter(d => d.id !== deptId);
    const newData = JSON.parse(JSON.stringify(dailyData)); if (newData[deptId]) delete newData[deptId];
    setConfirmDeleteDept(null);
    if (activeDept === deptId) setActiveDept(newDepts[0]?.id || "__SUMMARY__");
    await Promise.all([writeDepts(newDepts), writeDailyData(newData)]);
    setToast({ msg: `Đã xóa phòng: ${dName}` });
  }

  // ── Member management ───────────────────────────────────
  async function addMember() {
    if (!canManage || !newMemberForm.name.trim()) return;
    const newId = "M" + Date.now();
    const newMember = { id: newId, name: newMemberForm.name.trim(), role: newMemberForm.role };
    const newDepts = departments.map(d => d.id === activeDept ? { ...d, members: [...d.members, newMember] } : d);
    setShowAddModal(false); await writeDepts(newDepts);
    setToast({ msg: `Đã thêm: ${newMember.name}` });
  }
  async function deleteMember(memberId) {
    if (!canManage) return;
    const name = dept.members.find(m => m.id === memberId)?.name?.split(" ").pop();
    const newDepts = departments.map(d => d.id === activeDept ? { ...d, members: d.members.filter(m => m.id !== memberId) } : d);
    const newData = JSON.parse(JSON.stringify(dailyData));
    MONTHS.forEach(({ key: mk }) => { if (newData[activeDept]?.[mk]?.[memberId]) delete newData[activeDept][mk][memberId]; });
    setConfirmDelete(null); if (selectedMember === memberId) setSelectedMember(null);
    await Promise.all([writeDepts(newDepts), writeDailyData(newData)]);
    setToast({ msg: `Đã xóa: ${name}` });
  }

  // ── Export Excel ────────────────────────────────────────
  function exportToExcel() {
    // Load SheetJS từ CDN nếu chưa có
    function doExport() {
      const XLSX = window.XLSX;
      const wb = XLSX.utils.book_new();
      const monthLbl = MONTHS.find(m => m.key === selectedMonth)?.label || selectedMonth;

      // Các phòng cần export: admin → tất cả, dept → chỉ phòng mình
      const deptsToExport = isAdmin ? departments : departments.filter(d => d.id === currentUser.deptId);

      deptsToExport.forEach(d => {
        const rows = [];
        const allDayKeys = daysOfMonth();

        // Header row 1: tên phòng + tháng
        rows.push([d.fullName + " · " + monthLbl]);
        rows.push([]); // blank

        // Header row: Thành viên | Vai trò | Tuần 1 (T2–T7 KH/TH) | ... | Tuần 5 | Tổng tháng
        const header1 = ["Họ tên", "Vai trò"];
        const header2 = ["", ""];
        WEEKS.forEach(w => {
          DAYS_OF_WEEK.forEach((day, di) => {
            header1.push(w + " " + DAY_SHORT[di]);
            header1.push("");
          });
          header1.push(w + " Tổng");
          header1.push("");
        });
        header1.push("TỔNG THÁNG"); header1.push("");

        WEEKS.forEach(w => {
          DAYS_OF_WEEK.forEach(() => {
            header2.push("KH"); header2.push("TH");
          });
          header2.push("KH"); header2.push("TH");
        });
        header2.push("KH"); header2.push("TH");

        rows.push(header1);
        rows.push(header2);

        // Mỗi metric → 1 block section
        d.metrics.forEach(metric => {
          rows.push([]); // blank
          rows.push([metric.label + " (" + metric.unit + ")"]); // section header

          d.members.forEach(mb => {
            const row = [mb.name, mb.role];
            let monthKH = 0, monthTH = 0;
            WEEKS.forEach(w => {
              let weekKH = 0, weekTH = 0;
              DAYS_OF_WEEK.forEach(day => {
                const dk = makeDayKey(w, day);
                const kh = Number(dailyData[d.id]?.[selectedMonth]?.[mb.id]?.[dk]?.[metric.key]?.kh || 0);
                const th = Number(dailyData[d.id]?.[selectedMonth]?.[mb.id]?.[dk]?.[metric.key]?.th || 0);
                row.push(kh || ""); row.push(th || "");
                weekKH += kh; weekTH += th;
              });
              row.push(weekKH || ""); row.push(weekTH || "");
              monthKH += weekKH; monthTH += weekTH;
            });
            row.push(monthKH || ""); row.push(monthTH || "");
            rows.push(row);
          });

          // Tổng phòng cho metric này
          const totalRow = ["TỔNG PHÒNG", ""];
          let mKH = 0, mTH = 0;
          WEEKS.forEach(w => {
            let wKH = 0, wTH = 0;
            DAYS_OF_WEEK.forEach(day => {
              const dk = makeDayKey(w, day);
              let dkh = 0, dth = 0;
              d.members.forEach(mb => {
                dkh += Number(dailyData[d.id]?.[selectedMonth]?.[mb.id]?.[dk]?.[metric.key]?.kh || 0);
                dth += Number(dailyData[d.id]?.[selectedMonth]?.[mb.id]?.[dk]?.[metric.key]?.th || 0);
              });
              totalRow.push(dkh || ""); totalRow.push(dth || "");
              wKH += dkh; wTH += dth;
            });
            totalRow.push(wKH || ""); totalRow.push(wTH || "");
            mKH += wKH; mTH += wTH;
          });
          totalRow.push(mKH || ""); totalRow.push(mTH || "");
          rows.push(totalRow);
        });

        // Tạo sheet
        const ws = XLSX.utils.aoa_to_sheet(rows);
        // Độ rộng cột
        const cols = [{ wch: 24 }, { wch: 7 }];
        WEEKS.forEach(() => { DAYS_OF_WEEK.forEach(() => { cols.push({ wch: 6 }); cols.push({ wch: 6 }); }); cols.push({ wch: 7 }); cols.push({ wch: 7 }); });
        cols.push({ wch: 8 }); cols.push({ wch: 8 });
        ws["!cols"] = cols;

        const sheetName = d.name.replace(/[\\/:*?[\]]/g, "").slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      // Sheet Tổng hợp: tổng từng phòng theo từng tháng (admin only)
      if (isAdmin) {
        const sumRows = [["TỔNG HỢP HIỆU SUẤT · " + monthLbl], []];
        sumRows.push(["Phòng / Đơn vị", "Số NV", ...WEEKS.map(w => w + " (TH)"), "Tổng tháng (TH)"]);
        departments.forEach(d => {
          const row = [d.name, d.members.length];
          let total = 0;
          WEEKS.forEach(w => {
            const wDays = daysOfWeek(w);
            let wSum = 0;
            d.members.forEach(mb => d.metrics.forEach(met => { wSum += sumMetrics(dailyData, d.id, selectedMonth, mb.id, wDays, met.key); }));
            row.push(wSum); total += wSum;
          });
          row.push(total);
          sumRows.push(row);
        });
        const wsSummary = XLSX.utils.aoa_to_sheet(sumRows);
        wsSummary["!cols"] = [{ wch: 22 }, { wch: 7 }, ...WEEKS.map(() => ({ wch: 12 })), { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng hợp");
      }

      const filename = "RBT_" + (isAdmin ? "TatCaPhong" : currentUser.label.replace(/\s/g, "")) + "_" + selectedMonth + ".xlsx";
      XLSX.writeFile(wb, filename);
      setToast({ msg: "Đã xuất: " + filename });
    }

    if (window.XLSX) {
      doExport();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.onload = doExport;
      script.onerror = () => setToast({ msg: "Không tải được thư viện Excel", type: "error" });
      document.head.appendChild(script);
    }
  }

  // ── Guard: show login if not authenticated ──────────────
  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  // ── Loading ─────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc", gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid #e5e7eb", borderTopColor: deptColor, animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#6b7280", fontSize: 14, fontWeight: 600 }}>Đang kết nối Firebase...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const closeDropdowns = () => { setShowMonthPicker(false); setShowUserMenu(false); };

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#111827" }}>

      {/* ══ HEADER ══ */}
      <div style={{ background: "#0f172a", color: "#fff", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, gap: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: deptColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, flexShrink: 0 }}>⬡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Hệ thống Quản lý Hiệu suất</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {isSummary ? "Tổng hợp tất cả đơn vị" : dept?.fullName} · {monthLabel}
            </div>
          </div>
          <SyncBadge online={online} saving={saving} lastSync={lastSync} />

          {/* Month picker */}
          <div style={{ position: "relative" }}>
            <button onClick={e => { e.stopPropagation(); setShowMonthPicker(v => !v); setShowUserMenu(false); }}
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

          {/* User menu */}
          <div style={{ position: "relative" }}>
            <button onClick={e => { e.stopPropagation(); setShowUserMenu(v => !v); setShowMonthPicker(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 12px 5px 8px", cursor: "pointer", color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: currentUser.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>
                {currentUser.username[0].toUpperCase()}
              </div>
              {currentUser.label}
              {isAdmin && <span style={{ fontSize: 9, background: "#f59e0b", color: "#78350f", padding: "1px 5px", borderRadius: 6, fontWeight: 800 }}>ADMIN</span>}
            </button>
            {showUserMenu && (
              <div style={{ position: "absolute", right: 0, top: 44, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.2)", zIndex: 400, minWidth: 200, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontWeight: 700, color: "#111827", fontSize: 13 }}>{currentUser.label}</div>
                  <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>@{currentUser.username} · {isAdmin ? "Quản trị viên" : "Nhân viên phòng"}</div>
                </div>
                <button onClick={() => { setShowUserMenu(false); handleLogout(); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dept tabs */}
        <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {departments
            .filter(d => isAdmin || (isDept && d.id === currentUser.deptId))
            .map(d => (
              <button key={d.id} onClick={() => { setActiveDept(d.id); setSelectedMember(null); closeDropdowns(); }}
                style={{ background: activeDept === d.id ? d.color : "transparent", color: activeDept === d.id ? "#fff" : "#94a3b8", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600, borderBottom: activeDept === d.id ? `2px solid ${d.color}` : "2px solid transparent" }}>
                {d.name}
              </button>
            ))}
          {isAdmin && (
            <button onClick={() => { setActiveDept("__SUMMARY__"); setSelectedMember(null); closeDropdowns(); }}
              style={{ background: activeDept === "__SUMMARY__" ? "#f59e0b" : "transparent", color: activeDept === "__SUMMARY__" ? "#fff" : "#94a3b8", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600, borderBottom: activeDept === "__SUMMARY__" ? "2px solid #f59e0b" : "2px solid transparent" }}>
              🏢 Tổng hợp
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setNewDeptForm({ name: "", fullName: "", color: "#1a56db", metrics: [{ key: "", label: "", unit: "" }] }); setShowAddDeptModal(true); }}
              style={{ background: "transparent", color: "#4ade80", border: "1px dashed #4ade80", cursor: "pointer", padding: "5px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, marginLeft: 6, marginBottom: 4, alignSelf: "center" }}>
              ＋ Thêm phòng
            </button>
          )}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ padding: "20px 24px" }} onClick={closeDropdowns}>

        {/* Sub tabs */}
        {!isSummary && (
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
            {[
              { key: "daily",   label: "📋 Báo cáo ngày"  },
              { key: "weekly",  label: "📊 Báo cáo tuần"  },
              { key: "monthly", label: "📈 Báo cáo tháng" },
              { key: "members", label: "👥 Thành viên"    },
              ...(canEdit(activeDept) ? [{ key: "entry", label: "✏️ Nhập liệu" }] : []),
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ background: activeTab === t.key ? deptColor : "transparent", color: activeTab === t.key ? "#fff" : "#6b7280", border: "none", cursor: "pointer", borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 600 }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Export button */}
        {!isSummary && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12, marginTop: -12 }}>
            <button onClick={exportToExcel}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 9, padding: "7px 16px", fontSize: 13, fontWeight: 700, color: "#16a34a", cursor: "pointer" }}>
              📥 Xuất Excel · {MONTHS.find(m => m.key === selectedMonth)?.label}
            </button>
          </div>
        )}

        {/* Stat cards */}
        {!isSummary && (
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <StatCard label="Tổng ngày" value={dayGrandTotal} sub={`${selectedWeek} · ${selectedDay}`} color={deptColor} />
            <StatCard label="Tổng tuần (lũy kế)" value={weekGrandTotal} sub={selectedWeek} color={getRatioColor(weekGrandTotal > 0 ? 1 : 0)} />
            <StatCard label="Tổng tháng (lũy kế)" value={monthGrandTotal} sub={monthLabel} color="#7c3aed" />
            <StatCard label="Thành viên" value={dept?.members.length || 0} sub={dept?.fullName} />
          </div>
        )}

        {/* ── TỔNG HỢP (admin only) ── */}
        {isSummary && (() => {
          const roles = ["LS", "UB"];
          return (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
                {[{ key: "month", label: "📈 Lũy kế tháng" }, { key: "week", label: "📊 Lũy kế tuần" }, { key: "day", label: "📋 Theo ngày" }].map(m => (
                  <button key={m.key} onClick={() => setSummaryMode(m.key)}
                    style={{ background: summaryMode === m.key ? "#f59e0b" : "transparent", color: summaryMode === m.key ? "#fff" : "#6b7280", border: "none", cursor: "pointer", borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 600 }}>
                    {m.label}
                  </button>
                ))}
                </div>
                <button onClick={exportToExcel}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 9, padding: "7px 16px", fontSize: 13, fontWeight: 700, color: "#16a34a", cursor: "pointer" }}>
                  📥 Xuất Excel · {MONTHS.find(m => m.key === selectedMonth)?.label}
                </button>
              </div>
              {(summaryMode === "week" || summaryMode === "day") && (
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {WEEKS.map(w => (
                    <button key={w} onClick={() => setSelectedWeek(w)}
                      style={{ background: selectedWeek === w ? "#f59e0b" : "#fff", color: selectedWeek === w ? "#fff" : "#374151", border: `1px solid ${selectedWeek === w ? "#f59e0b" : "#e5e7eb"}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {w}
                    </button>
                  ))}
                </div>
              )}
              {summaryMode === "day" && (
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  {DAYS_OF_WEEK.map((d, i) => (
                    <button key={d} onClick={() => setSelectedDay(d)}
                      style={{ background: selectedDay === d ? "#f59e0b" : "#f3f4f6", color: selectedDay === d ? "#fff" : "#374151", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {DAY_SHORT[i]}
                    </button>
                  ))}
                </div>
              )}
              {roles.map(role => {
                const dayKeys = summaryMode === "month" ? currentMonthDays : summaryMode === "week" ? currentWeekDays : [currentDayKey];
                const periodLabel = summaryMode === "month" ? monthLabel : summaryMode === "week" ? selectedWeek : `${selectedWeek} · ${selectedDay}`;
                const roleMembers = [];
                departments.forEach(d => d.members.forEach(mb => {
                  if (mb.role === role) roleMembers.push({ ...mb, deptId: d.id, deptName: d.name, deptColor: d.color, metrics: d.metrics });
                }));
                if (roleMembers.length === 0) return null;
                const firstDept = departments.find(d => d.members.some(m => m.role === role));
                const roleMetrics = firstDept ? firstDept.metrics : [];
                const roleColor = role === "LS" ? "#1a56db" : "#9d174d";
                let roleKH = 0, roleTH = 0;
                roleMembers.forEach(mb => roleMetrics.forEach(met => {
                  if (mb.metrics.some(m => m.key === met.key)) {
                    roleKH += sumKH(dailyData, mb.deptId, selectedMonth, mb.id, dayKeys, met.key);
                    roleTH += sumMetrics(dailyData, mb.deptId, selectedMonth, mb.id, dayKeys, met.key);
                  }
                }));
                const rolePct = roleKH > 0 ? Math.round(roleTH / roleKH * 100) : 0;
                const pc = (r) => r >= 100 ? "#057a55" : r >= 80 ? "#c27803" : "#c81e1e";
                const pb = (r) => r >= 100 ? "#def7ec" : r >= 80 ? "#fdf6b2" : "#fde8e8";
                return (
                  <div key={role} style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                      <div style={{ background: roleColor, color: "#fff", fontWeight: 800, fontSize: 14, padding: "4px 18px", borderRadius: 20 }}>{role}</div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{role === "LS" ? "Vị trí LS" : "Vị trí UB"}</div>
                      <div style={{ color: "#6b7280", fontSize: 13 }}>· {roleMembers.length} nhân viên · {periodLabel}</div>
                      {roleKH > 0 && <span style={{ marginLeft: "auto", background: pb(rolePct), color: pc(rolePct), fontWeight: 800, fontSize: 13, padding: "4px 16px", borderRadius: 20 }}>{rolePct}%</span>}
                    </div>
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: "#f9fafb" }}>
                              <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", minWidth: 170 }}>Chỉ tiêu</th>
                              {roleMembers.map(mb => (
                                <th key={mb.id + mb.deptId} style={{ padding: "8px 6px", textAlign: "center", borderBottom: "1px solid #e5e7eb", minWidth: 136 }}>
                                  <div style={{ fontWeight: 700, fontSize: 11 }}>{mb.name.split(" ").slice(-2).join(" ")}</div>
                                  <div style={{ fontSize: 10, color: mb.deptColor, fontWeight: 600, marginTop: 2 }}>{mb.deptName}</div>
                                  <div style={{ display: "flex", justifyContent: "center", gap: 4, color: "#9ca3af", fontSize: 10, marginTop: 4 }}>
                                    <span style={{ minWidth: 30 }}>KH</span><span style={{ minWidth: 30 }}>TH</span><span style={{ minWidth: 36 }}>%HT</span>
                                  </div>
                                </th>
                              ))}
                              <th style={{ padding: "8px 6px", textAlign: "center", borderBottom: "1px solid #e5e7eb", background: "#fef3c7", minWidth: 120 }}>
                                <div style={{ fontWeight: 700, color: "#92400e", fontSize: 12 }}>TỔNG {role}</div>
                                <div style={{ display: "flex", justifyContent: "center", gap: 4, color: "#9ca3af", fontSize: 10, marginTop: 20 }}>
                                  <span style={{ minWidth: 30 }}>KH</span><span style={{ minWidth: 30 }}>TH</span><span style={{ minWidth: 36 }}>%HT</span>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {roleMetrics.map((metric, mi) => {
                              let totKH = 0, totTH = 0;
                              roleMembers.forEach(mb => {
                                if (mb.metrics.some(m => m.key === metric.key)) {
                                  totKH += sumKH(dailyData, mb.deptId, selectedMonth, mb.id, dayKeys, metric.key);
                                  totTH += sumMetrics(dailyData, mb.deptId, selectedMonth, mb.id, dayKeys, metric.key);
                                }
                              });
                              const tPct = totKH > 0 ? Math.round(totTH / totKH * 100) : 0;
                              return (
                                <tr key={metric.key} style={{ background: mi % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                                  <td style={{ padding: "10px 14px" }}>
                                    <div style={{ fontWeight: 500, color: "#374151", fontSize: 12 }}>{metric.label}</div>
                                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{metric.unit}</div>
                                  </td>
                                  {roleMembers.map(mb => {
                                    const hasMet = mb.metrics.some(m => m.key === metric.key);
                                    const kh = hasMet ? sumKH(dailyData, mb.deptId, selectedMonth, mb.id, dayKeys, metric.key) : null;
                                    const th = hasMet ? sumMetrics(dailyData, mb.deptId, selectedMonth, mb.id, dayKeys, metric.key) : null;
                                    const pct = kh > 0 ? Math.round(th / kh * 100) : 0;
                                    return (
                                      <td key={mb.id + mb.deptId} style={{ padding: "8px 6px", textAlign: "center" }}>
                                        {hasMet ? (
                                          <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                                            <span style={{ minWidth: 30, color: "#374151", fontSize: 12 }}>{kh || "-"}</span>
                                            <span style={{ minWidth: 30, fontWeight: 700, color: th > 0 ? mb.deptColor : "#d1d5db", fontSize: 13 }}>{th || "-"}</span>
                                            <span style={{ minWidth: 36, fontWeight: 700, fontSize: 10, color: pc(pct), background: kh > 0 ? pb(pct) : "transparent", padding: "1px 4px", borderRadius: 5 }}>{kh > 0 ? pct + "%" : "-"}</span>
                                          </div>
                                        ) : <span style={{ color: "#e5e7eb" }}>—</span>}
                                      </td>
                                    );
                                  })}
                                  <td style={{ padding: "8px 6px", textAlign: "center", background: "#fffbeb" }}>
                                    <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                                      <span style={{ minWidth: 30, color: "#374151", fontSize: 12 }}>{totKH || "-"}</span>
                                      <span style={{ minWidth: 30, fontWeight: 800, color: totTH > 0 ? "#92400e" : "#d1d5db", fontSize: 13 }}>{totTH || "-"}</span>
                                      <span style={{ minWidth: 36, fontWeight: 700, fontSize: 10, color: pc(tPct), background: totKH > 0 ? pb(tPct) : "transparent", padding: "1px 4px", borderRadius: 5 }}>{totKH > 0 ? tPct + "%" : "-"}</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── BÁO CÁO NGÀY ── */}
        {!isSummary && activeTab === "daily" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Chọn ngày xem báo cáo</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {WEEKS.map(w => (
                  <button key={w} onClick={() => setSelectedWeek(w)}
                    style={{ background: selectedWeek === w ? deptColor : "#f3f4f6", color: selectedWeek === w ? "#fff" : "#374151", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {w}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAYS_OF_WEEK.map((d, i) => (
                  <button key={d} onClick={() => setSelectedDay(d)}
                    style={{ background: selectedDay === d ? deptColor : "#f3f4f6", color: selectedDay === d ? "#fff" : "#374151", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {DAY_SHORT[i]}
                  </button>
                ))}
              </div>
            </div>
            <ReportTable dept={dept} metrics={dept.metrics} members={dept.members} dayKeys={[currentDayKey]} dailyData={dailyData} monthKey={selectedMonth} deptColor={deptColor} title={`Báo cáo ngày · ${selectedWeek} · ${selectedDay}`} subtitle={`${dept.fullName} · ${monthLabel}`} />
          </div>
        )}

        {/* ── BÁO CÁO TUẦN ── */}
        {!isSummary && activeTab === "weekly" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {WEEKS.map(w => (
                <button key={w} onClick={() => setSelectedWeek(w)}
                  style={{ background: selectedWeek === w ? deptColor : "#fff", color: selectedWeek === w ? "#fff" : "#374151", border: `1px solid ${selectedWeek === w ? deptColor : "#e5e7eb"}`, borderRadius: 8, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {w}
                </button>
              ))}
            </div>
            <ReportTable dept={dept} metrics={dept.metrics} members={dept.members} dayKeys={currentWeekDays} dailyData={dailyData} monthKey={selectedMonth} deptColor={deptColor} title={`Lũy kế ${selectedWeek} · ${monthLabel}`} subtitle={dept.fullName} />
          </div>
        )}

        {/* ── BÁO CÁO THÁNG ── */}
        {!isSummary && activeTab === "monthly" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Tổng quan theo tuần · {monthLabel}</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{dept.fullName}</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #e5e7eb", minWidth: 160 }}>Thành viên</th>
                      {WEEKS.map(w => <th key={w} style={{ padding: "10px 10px", textAlign: "center", borderBottom: "1px solid #e5e7eb", minWidth: 90 }}><div style={{ fontWeight: 600, color: "#374151", fontSize: 12 }}>{w}</div></th>)}
                      <th style={{ padding: "10px 10px", textAlign: "center", borderBottom: "1px solid #e5e7eb", background: "#f5f3ff", minWidth: 90 }}><div style={{ fontWeight: 700, color: "#7c3aed" }}>Tổng tháng</div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dept.members.map((mb, mi) => {
                      const weekTotals = WEEKS.map(w => dept.metrics.reduce((sum, m) => sum + sumMetrics(dailyData, activeDept, selectedMonth, mb.id, daysOfWeek(w), m.key), 0));
                      const total = weekTotals.reduce((a, b) => a + b, 0);
                      return (
                        <tr key={mb.id} style={{ background: mi % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{mb.name.split(" ").slice(-2).join(" ")}</div>
                            <Badge role={mb.role} />
                          </td>
                          {weekTotals.map((v, wi) => (
                            <td key={wi} style={{ padding: "8px 10px", textAlign: "center" }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: v > 0 ? deptColor : "#d1d5db" }}>{v || "-"}</div>
                            </td>
                          ))}
                          <td style={{ padding: "8px 10px", textAlign: "center", background: "#f5f3ff" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: total > 0 ? "#7c3aed" : "#d1d5db" }}>{total}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <ReportTable dept={dept} metrics={dept.metrics} members={dept.members} dayKeys={currentMonthDays} dailyData={dailyData} monthKey={selectedMonth} deptColor={deptColor} title={`Lũy kế theo chỉ tiêu · ${monthLabel}`} subtitle={dept.fullName} />
          </div>
        )}

        {/* ── THÀNH VIÊN ── */}
        {!isSummary && activeTab === "members" && (
          <div>
            {canManage && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
                <button onClick={() => setConfirmDeleteDept(activeDept)}
                  style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  🗑 Xóa phòng này
                </button>
                <button onClick={() => { setNewMemberForm({ name: "", role: activeDept === "QTTD" ? "LS" : "UB" }); setShowAddModal(true); }}
                  style={{ background: deptColor, color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  ＋ Thêm nhân viên
                </button>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {dept.members.map((member, mi) => {
                const monthTotal = dept.metrics.reduce((sum, m) => sum + sumMetrics(dailyData, activeDept, selectedMonth, member.id, currentMonthDays, m.key), 0);
                const weekTotal  = dept.metrics.reduce((sum, m) => sum + sumMetrics(dailyData, activeDept, selectedMonth, member.id, currentWeekDays,  m.key), 0);
                return (
                  <div key={member.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, cursor: "pointer", position: "relative" }}
                    onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}>
                    {canManage && (
                      <button onClick={e => { e.stopPropagation(); setConfirmDelete(member.id); }}
                        style={{ position: "absolute", top: 12, right: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "3px 9px", fontSize: 12, color: "#dc2626", cursor: "pointer", fontWeight: 600 }}>
                        🗑 Xóa
                      </button>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: deptColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                        {member.name.split(" ").pop()[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{member.name}</div>
                        <Badge role={member.role} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 1, background: "#f8fafc", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Tổng tuần</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: weekTotal > 0 ? deptColor : "#d1d5db" }}>{weekTotal}</div>
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>{selectedWeek}</div>
                      </div>
                      <div style={{ flex: 1, background: "#f5f3ff", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Tổng tháng</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: monthTotal > 0 ? "#7c3aed" : "#d1d5db" }}>{monthTotal}</div>
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>{monthLabel}</div>
                      </div>
                    </div>
                    {selectedMember === member.id && (
                      <div style={{ marginTop: 14, borderTop: "1px solid #f3f4f6", paddingTop: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 8 }}>Lũy kế từng tuần · {monthLabel}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {WEEKS.map(w => {
                            const wt = dept.metrics.reduce((sum, m) => sum + sumMetrics(dailyData, activeDept, selectedMonth, member.id, daysOfWeek(w), m.key), 0);
                            return (
                              <div key={w} style={{ flex: 1, textAlign: "center", background: wt > 0 ? "#eff6ff" : "#f8fafc", borderRadius: 8, padding: "6px 4px" }}>
                                <div style={{ fontSize: 10, color: "#6b7280" }}>{w.replace("Tuần ", "T")}</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: wt > 0 ? deptColor : "#d1d5db" }}>{wt}</div>
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

        {/* ── NHẬP LIỆU ── */}
        {!isSummary && activeTab === "entry" && canEdit(activeDept) && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Nhập số liệu theo ngày · {monthLabel}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>Chọn tuần và ngày, sau đó chọn thành viên để nhập. Dữ liệu đồng bộ Firebase ngay lập tức 🔥</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {WEEKS.map(w => (
                <button key={w} onClick={() => setSelectedWeek(w)}
                  style={{ background: selectedWeek === w ? deptColor : "#fff", color: selectedWeek === w ? "#fff" : "#374151", border: `1px solid ${selectedWeek === w ? deptColor : "#e5e7eb"}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {w}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {DAYS_OF_WEEK.map((d, i) => (
                <button key={d} onClick={() => setSelectedDay(d)}
                  style={{ background: selectedDay === d ? deptColor : "#f3f4f6", color: selectedDay === d ? "#fff" : "#374151", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {DAY_SHORT[i]}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {dept.members.map(m => {
                const dk = makeDayKey(selectedWeek, selectedDay);
                const hasData = dept.metrics.some(met => {
                  const v = dailyData[activeDept]?.[selectedMonth]?.[m.id]?.[dk]?.[met.key];
                  return v && (v.th > 0 || v.kh > 0);
                });
                const dayTotal = dept.metrics.reduce((sum, met) => sum + sumMetrics(dailyData, activeDept, selectedMonth, m.id, [dk], met.key), 0);
                return (
                  <div key={m.id} onClick={() => openEntryModal(m.id)}
                    style={{ background: "#fff", border: `2px solid ${hasData ? deptColor : "#e5e7eb"}`, borderRadius: 12, padding: 16, cursor: "pointer", position: "relative" }}>
                    {hasData && <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: "50%", background: "#057a55" }} />}
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: hasData ? deptColor : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: hasData ? "#fff" : "#9ca3af", fontWeight: 800, marginBottom: 10 }}>
                      {m.name.split(" ").pop()[0]}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{m.name}</div>
                    <Badge role={m.role} />
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      {hasData ? <span style={{ color: "#057a55", fontWeight: 600 }}>✓ Tổng: {dayTotal}</span> : <span style={{ color: "#9ca3af" }}>Nhấp để nhập</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ MODAL NHẬP LIỆU ══ */}
      {showEntryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Nhập liệu · {dept.members.find(m => m.id === entryMember)?.name?.split(" ").pop()}</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{monthLabel}</div>
              </div>
              <button onClick={() => setShowEntryModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ padding: "12px 24px 0", display: "flex", gap: 4, flexWrap: "wrap" }}>
              {WEEKS.map(w => (
                <button key={w} onClick={() => switchEntryDay(w, entryDay)}
                  style={{ background: entryWeek === w ? deptColor : "#f3f4f6", color: entryWeek === w ? "#fff" : "#374151", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  {w}
                </button>
              ))}
            </div>
            <div style={{ padding: "8px 24px 0", display: "flex", gap: 4, flexWrap: "wrap" }}>
              {DAYS_OF_WEEK.map((d, i) => (
                <button key={d} onClick={() => switchEntryDay(entryWeek, d)}
                  style={{ background: entryDay === d ? deptColor : "#f3f4f6", color: entryDay === d ? "#fff" : "#374151", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  {DAY_SHORT[i]}
                </button>
              ))}
            </div>
            <div style={{ padding: "16px 24px" }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14, background: "#f8fafc", padding: "8px 12px", borderRadius: 8 }}>
                📅 Đang nhập: <strong>{entryWeek} · {entryDay}</strong> · {monthLabel}
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", flex: 2 }}>Chỉ tiêu</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1e40af", flex: 1, textAlign: "center" }}>Kế hoạch</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#057a55", flex: 1, textAlign: "center" }}>Thực hiện</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", flex: 1, textAlign: "center" }}>% HT</div>
              </div>
              {dept.metrics.map(metric => {
                const kh  = Number(entryForm[metric.key + "_kh"]) || 0;
                const th  = Number(entryForm[metric.key + "_th"]) || 0;
                const pct = kh > 0 ? Math.round(th / kh * 100) : (th > 0 ? 100 : 0);
                const pctC = pct >= 100 ? "#057a55" : pct >= 80 ? "#c27803" : "#c81e1e";
                return (
                  <div key={metric.key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
                      {metric.label} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({metric.unit})</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <input type="number" min="0" value={entryForm[metric.key + "_kh"] || ""}
                          onChange={e => setEntryForm(p => ({ ...p, [metric.key + "_kh"]: e.target.value }))}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#eff6ff", color: "#1e40af", fontWeight: 600, textAlign: "center" }} placeholder="0" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input type="number" min="0" value={entryForm[metric.key + "_th"] || ""}
                          onChange={e => setEntryForm(p => ({ ...p, [metric.key + "_th"]: e.target.value }))}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid #a7f3d0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#f0fdf4", color: "#057a55", fontWeight: 600, textAlign: "center" }} placeholder="0" />
                      </div>
                      <div style={{ flex: 1, padding: "8px 10px", background: "#f5f3ff", borderRadius: 8, textAlign: "center", fontWeight: 700, fontSize: 14, color: pctC }}>
                        {kh > 0 || th > 0 ? pct + "%" : "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowEntryModal(false)} style={{ padding: "10px 20px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Hủy</button>
              <button onClick={saveEntry} disabled={saving}
                style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: deptColor, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Đang lưu..." : "💾 Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL THÊM NHÂN VIÊN ══ */}
      {showAddModal && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Thêm nhân viên</div>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Họ và tên</label>
              <input type="text" value={newMemberForm.name} onChange={e => setNewMemberForm(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addMember()}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 9, fontSize: 14, boxSizing: "border-box", marginBottom: 16 }}
                placeholder="Nhập họ và tên..." autoFocus />
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Vị trí</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["LS", "UB"].map(role => (
                  <button key={role} onClick={() => setNewMemberForm(p => ({ ...p, role }))}
                    style={{ flex: 1, padding: 10, border: `2px solid ${newMemberForm.role === role ? deptColor : "#e5e7eb"}`, borderRadius: 9, background: newMemberForm.role === role ? deptColor : "#fff", color: newMemberForm.role === role ? "#fff" : "#374151", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: "10px 20px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Hủy</button>
              <button onClick={addMember} disabled={!newMemberForm.name.trim()}
                style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: newMemberForm.name.trim() ? deptColor : "#e5e7eb", color: newMemberForm.name.trim() ? "#fff" : "#9ca3af", cursor: newMemberForm.name.trim() ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700 }}>
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL XÁC NHẬN XÓA THÀNH VIÊN ══ */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 360, padding: 28, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Xóa nhân viên?</div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>Xóa <strong>{dept.members.find(m => m.id === confirmDelete)?.name}</strong>?</div>
            <div style={{ color: "#dc2626", fontSize: 12, background: "#fef2f2", padding: "8px 12px", borderRadius: 8, marginBottom: 20 }}>
              Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn khỏi Firebase.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 10, border: "1px solid #e5e7eb", borderRadius: 9, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Hủy</button>
              <button onClick={() => deleteMember(confirmDelete)} style={{ flex: 1, padding: 10, border: "none", borderRadius: 9, background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL THÊM PHÒNG ══ */}
      {showAddDeptModal && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Thêm phòng ban mới</div>
              <button onClick={() => setShowAddDeptModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Tên phòng *</label>
              <input type="text" value={newDeptForm.name} onChange={e => setNewDeptForm(p => ({ ...p, name: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 9, fontSize: 14, boxSizing: "border-box", marginBottom: 14 }} placeholder="Vd: PGD Cẩm Phả" autoFocus />
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Tên đầy đủ</label>
              <input type="text" value={newDeptForm.fullName} onChange={e => setNewDeptForm(p => ({ ...p, fullName: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 9, fontSize: 14, boxSizing: "border-box", marginBottom: 14 }} placeholder="Vd: Phòng Giao Dịch Cẩm Phả" />
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Màu nhận diện</label>
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                {["#1a56db","#057a55","#9f1239","#6d28d9","#c27803","#0e7490","#9a3412","#1e3a5f"].map(c => (
                  <div key={c} onClick={() => setNewDeptForm(p => ({ ...p, color: c }))}
                    style={{ width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer", border: newDeptForm.color === c ? "3px solid #111" : "3px solid transparent", boxSizing: "border-box" }} />
                ))}
                <input type="color" value={newDeptForm.color} onChange={e => setNewDeptForm(p => ({ ...p, color: e.target.value }))}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer" }} />
              </div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Chỉ tiêu đánh giá</label>
              {newDeptForm.metrics.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <input type="text" value={m.label}
                    onChange={e => { const ms = [...newDeptForm.metrics]; ms[i] = { ...ms[i], label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") }; setNewDeptForm(p => ({ ...p, metrics: ms })); }}
                    style={{ flex: 2, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} placeholder={`Chỉ tiêu ${i + 1}`} />
                  <input type="text" value={m.unit}
                    onChange={e => { const ms = [...newDeptForm.metrics]; ms[i] = { ...ms[i], unit: e.target.value }; setNewDeptForm(p => ({ ...p, metrics: ms })); }}
                    style={{ flex: 1, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} placeholder="Đơn vị" />
                  {newDeptForm.metrics.length > 1 && (
                    <button onClick={() => setNewDeptForm(p => ({ ...p, metrics: p.metrics.filter((_, j) => j !== i) }))}
                      style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "6px 10px", cursor: "pointer", color: "#dc2626", fontWeight: 700, fontSize: 14 }}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => setNewDeptForm(p => ({ ...p, metrics: [...p.metrics, { key: "", label: "", unit: "" }] }))}
                style={{ background: "#f0fdf4", border: "1px dashed #86efac", borderRadius: 8, padding: "7px 16px", cursor: "pointer", color: "#16a34a", fontWeight: 600, fontSize: 13, marginTop: 4 }}>
                ＋ Thêm chỉ tiêu
              </button>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddDeptModal(false)} style={{ padding: "10px 20px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Hủy</button>
              <button onClick={addDept} disabled={!newDeptForm.name.trim()}
                style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: newDeptForm.name.trim() ? newDeptForm.color : "#e5e7eb", color: newDeptForm.name.trim() ? "#fff" : "#9ca3af", cursor: newDeptForm.name.trim() ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700 }}>
                Tạo phòng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL XÁC NHẬN XÓA PHÒNG ══ */}
      {confirmDeleteDept && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 380, padding: 28, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Xóa phòng ban?</div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>Xóa <strong>{departments.find(d => d.id === confirmDeleteDept)?.name}</strong>?</div>
            <div style={{ color: "#dc2626", fontSize: 12, background: "#fef2f2", padding: "10px 14px", borderRadius: 8, marginBottom: 20, lineHeight: 1.6 }}>
              Toàn bộ nhân viên và dữ liệu của phòng này sẽ bị xóa vĩnh viễn khỏi Firebase.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDeleteDept(null)} style={{ flex: 1, padding: 11, border: "1px solid #e5e7eb", borderRadius: 9, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Hủy</button>
              <button onClick={() => deleteDept(confirmDeleteDept)} style={{ flex: 1, padding: 11, border: "none", borderRadius: 9, background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Xóa phòng</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
