import { useState, useEffect, useMemo } from "react";

const ADMINS = ["01027760669", "01008100546"];

const STORES = [
  { id: 1, name: "بلبع - سيدي بشر", cat: "مطاعم", time: "30-40 د", fee: "15", img: "🍗", rating: "4.8", items: [{n:"نص فرخة مشوية",p:180},{n:"كباب وكفتة",p:250},{n:"طاجن لحمة",p:220}] },
  { id: 2, name: "كبدة الفلاح - محطة الرمل", cat: "مطاعم", time: "20-30 د", fee: "15", img: "🥘", rating: "4.9", items: [{n:"ساندوتش كبدة",p:25},{n:"سجق اسكندراني",p:30},{n:"مخ",p:35}] },
  { id: 3, name: "جيلاتي عزة - المندرة", cat: "حلويات ومخابز", time: "15-25 د", fee: "10", img: "🍦", rating: "4.7", items: [{n:"جيلاتي مانجو",p:40},{n:"رز بلبن",p:35},{n:"كاسات",p:50}] },
  { id: 4, name: "صيدلية خليل - سموحة", cat: "صيدليات", time: "20-30 د", fee: "10", img: "💊", rating: "4.6", items: [{n:"بنادول",p:30},{n:"فيتامين سي",p:80},{n:"كمامة",p:15}] },
  { id: 5, name: "البان سويسرا - رشدى", cat: "حلويات ومخابز", time: "15-20 د", fee: "12", img: "🧀", rating: "4.8", items: [{n:"سندوتش جبنة تركي",p:45},{n:"قشطة وعسل",p:55}] },
];

export default function App(){
  const [page, setPage] = useState<"login"|"home">("login");
  const [tab, setTab] = useState<"login"|"reg">("login");
  const [filter, setFilter] = useState("الكل");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [cart, setCart] = useState<any[]>(()=>{try{return JSON.parse(localStorage.getItem("waselha_cart")||"[]")}catch{return[]}});
  const [orders, setOrders] = useState<any[]>(()=>{try{return JSON.parse(localStorage.getItem("waselha_orders")||"[]")}catch{return[]}});
  const [f, setF] = useState({name:"",phone:"",pass:"",cpass:""});
  const [l, setL] = useState({phone:"",pass:""});
  const [users, setUsers] = useState<any[]>(()=>{try{return JSON.parse(localStorage.getItem("waselha_users")||"[]")}catch{return[]}});
  const [cu, setCu] = useState<any>(()=>{try{return JSON.parse(localStorage.getItem("waselha_cu")||"null")}catch{return null}});
  const [showCart, setShowCart] = useState(false);
  const [loc] = useState("المنزل - لوران على الكورنيش");

  useEffect(()=>{if(cu) setPage("home")},[]);
  useEffect(()=>{localStorage.setItem("waselha_cart",JSON.stringify(cart))},[cart]);
  useEffect(()=>{localStorage.setItem("waselha_orders",JSON.stringify(orders))},[orders]);
  useEffect(()=>{localStorage.setItem("waselha_users",JSON.stringify(users))},[users]);

  const doReg=()=>{ if(!f.name||!f.phone||!f.pass) return alert("اكمل البيانات"); if(f.pass!==f.cpass) return alert("الباسورد غير متطابق"); if(users.find((x:any)=>x.phone===f.phone)) return alert("الرقم مسجل"); const nu={name:f.name,phone:f.phone,pass:f.pass}; setUsers([...users,nu]); localStorage.setItem("waselha_cu",JSON.stringify(nu)); setCu(nu); setPage("home"); };
  const doLogin=()=>{ if(ADMINS.includes(l.phone)){const ad={name:"الادارة",phone:l.phone}; localStorage.setItem("waselha_cu",JSON.stringify(ad)); setCu(ad); setPage("home"); return;} const found=users.find((x:any)=>x.phone===l.phone&&x.pass===l.pass); if(!found) return alert("بيانات غلط"); localStorage.setItem("waselha_cu",JSON.stringify(found)); setCu(found); setPage("home"); };
  const out=()=>{localStorage.removeItem("waselha_cu"); setPage("login"); setCu(null);};

  const filtered = useMemo(()=> STORES.filter(s=> (filter==="الكل"||s.cat===filter) && s.name.includes(search) || s.items.some((i:any)=>i.n.includes(search)) || search==="" ),[filter,search]).filter(s=> filter==="الكل"? (search===""?true: (s.name.includes(search)|| s.cat.includes(search))) : true);

  const total = cart.reduce((a,b)=>a+b.p*b.q,0);
  const add = (it:any)=>{ const ex=cart.find(c=>c.n===it.n&&c.store===selected.name); if(ex) setCart(cart.map(c=>c===ex?{...c,q:c.q+1}:c)); else setCart([...cart,{...it,q:1,store:selected.name}]); };

  if(page==="login") return (
    <div dir="rtl" style={{minHeight:"100vh",background:"#0b1220",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#151f32",borderRadius:24,padding:24,width:"100%",maxWidth:380,border:"1px solid #233148"}}>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{width:56,height:56,background:"#f59
