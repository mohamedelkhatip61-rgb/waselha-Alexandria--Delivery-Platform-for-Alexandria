import { useState, useEffect } from "react";
const ADMINS = ["01027760669", "01008100546"];
export default function App() {
  const [page, setPage] = useState("login");
  const [tab, setTab] = useState("login");
  const [f, setF] = useState({ name: "", phone: "", pass: "", cpass: "" });
  const [l, setL] = useState({ phone: "", pass: "" });
  const [users, setUsers] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("waselha_users") || "[]"); } catch { return []; }
  });
  const [cu, setCu] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem("waselha_cu") || "null"); } catch { return null; }
  });
  useEffect(() => {
    if (cu) {
      if (ADMINS.includes(cu.phone)) setPage("admin");
      else setPage("client");
    }
  }, []);
  const doReg = () => {
    if (!f.name || !f.phone || !f.pass) return alert("اكمل البيانات");
    if (f.pass !== f.cpass) return alert("تأكيد الباسورد غلط");
    if (users.find((x: any) => x.phone === f.phone)) return alert("الرقم متسجل قبل كده");
    const nu = { name: f.name, phone: f.phone, pass: f.pass };
    const all = [...users, nu];
    localStorage.setItem("waselha_users", JSON.stringify(all));
    localStorage.setItem("waselha_cu", JSON.stringify(nu));
    setUsers(all); setCu(nu); setPage("client");
  };
  const doLogin = () => {
    if (ADMINS.includes(l.phone)) {
      const ad = { name: "Admin", phone: l.phone };
      localStorage.setItem("waselha_cu", JSON.stringify(ad));
      setCu(ad); setPage("admin"); return;
    }
    const found = users.find((x: any) => x.phone === l.phone && x.pass === l.pass);
    if (!found) return alert("رقم او باسورد غلط");
    localStorage.setItem("waselha_cu", JSON.stringify(found));
    setCu(found); setPage("client");
  };
  const out = () => { localStorage.removeItem("waselha_cu"); setPage("login"); setCu(null); };
  if (page === "login") {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: 24, width: "100%", maxWidth: 400 }}>
          <h1 style={{ fontWeight: 900, fontSize: 26, textAlign: "center" }}>وصلة - اسكندرية</h1>
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 14 }}>منصة التوصيل</p>
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 99, padding: 4, margin: "16px 0" }}>
            <button onClick={() => setTab("login")} style={{ flex: 1, padding: 10, borderRadius: 99, background: tab === "login" ? "#000" : "transparent", color: tab === "login" ? "#fff" : "#000", fontWeight: 700, border: 0 }}>دخول</button>
            <button onClick={() => setTab("reg")} style={{ flex: 1, padding: 10, borderRadius: 99, background: tab === "reg" ? "#000" : "transparent", color: tab === "reg" ? "#fff" : "#000", fontWeight: 700, border: 0 }}>تسجيل</button>
          </div>
          {tab === "login" ? <>
            <input value={l.phone} onChange={e => setL({ ...l, phone: e.target.value })} placeholder="رقم الهاتف" style={{ width: "100%", padding: 14, background: "#f8fafc", borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0" }} />
            <input type="password" value={l.pass} onChange={e => setL({ ...l, pass: e.target.value })} placeholder="الباسورد" style={{ width: "100%", padding: 14, background: "#f8fafc", borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0" }} />
            <button onClick={doLogin} style={{ width: "100%", background: "#ff5a00", color: "#fff", padding: 14, borderRadius: 12, fontWeight: 900, border: 0 }}>دخول</button>
          </> : <>
            <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="الاسم" style={{ width: "100%", padding: 12, marginBottom: 8, borderRadius: 12, border: "1px solid #ddd" }} />
            <input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="رقم الهاتف" style={{ width: "100%", padding: 12, marginBottom: 8, borderRadius: 12, border: "1px solid #ddd" }} />
            <input type="password" value={f.pass} onChange={e => setF({ ...f, pass: e.target.value })} placeholder="الباسورد" style={{ width: "100%", padding: 12, marginBottom: 8, borderRadius: 12, border: "1px solid #ddd" }} />
            <input type="password" value={f.cpass} onChange={e => setF({ ...f, cpass: e.target.value })} placeholder="تأكيد الباسورد" style={{ width: "100%", padding: 12, marginBottom: 10, borderRadius: 12, border: "1px solid #ddd" }} />
            <button onClick={doReg} style={{ width: "100%", background: "#000", color: "#fff", padding: 14, borderRadius: 12, fontWeight: 900, border: 0 }}>انشاء حساب</button>
          </>}
        </div>
      </div>
    );
  }
  return (
    <div dir="rtl" style={{ padding: 20 }}>
      <h2>اهلا يا {cu?.name}</h2>
      <div style={{ background: "#dcfce7", padding: 16, borderRadius: 12, marginTop: 12 }}>✅ تم الدخول بنجاح! المنصة شغالة 100%</div>
      <button onClick={out} style={{ marginTop: 20, background: "#fee2e2", color: "#dc2626", padding: 10, borderRadius: 10, border: 0 }}>خروج</button>
    </div>
  );
}
