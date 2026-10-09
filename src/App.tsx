import { useState, useEffect } from "react"
const ADMINS = ["01027760669","01008100546"];
export default function App(){
  const [page,setPage]=useState("login")
  const [tab,setTab]=useState("login")
  const [f,setF]=useState({name:"",phone:"",pass:"",cpass:"",role:"client"})
  const [l,setL]=useState({phone:"",pass:""})
  const [u,setU]=useState<any[]>(()=>{try{return JSON.parse(localStorage.getItem("u")||"[]")}catch{return []}})
  const [cu,setCu]=useState<any>(()=>{try{return JSON.parse(localStorage.getItem("cu")||"null")}catch{return null}})
  useEffect(()=>{ if(cu){ if(ADMINS.includes(cu.phone)) setPage("admin"); else setPage(cu.role)}},[])
  const reg=()=>{
    if(!f.name||!f.phone||!f.pass) return alert("املا البيانات")
    if(f.pass!==f.cpass) return alert("الباسورد مش زي بعض")
    if(u.find((x:any)=>x.phone===f.phone)) return alert("الرقم متسجل قبل كده")
    const nu={name:f.name,phone:f.phone,pass:f.pass,role:f.role}
    const all=[...u,nu]; localStorage.setItem("u",JSON.stringify(all)); setU(all)
    localStorage.setItem("cu",JSON.stringify(nu)); setCu(nu); setPage(nu.role)
  }
  const login=()=>{
    if(ADMINS.includes(l.phone)){ const ad={name:"Admin",phone:l.phone,role:"client"}; localStorage.setItem("cu",JSON.stringify(ad)); setCu(ad); setPage("admin"); return}
    const found=u.find((x:any)=>x.phone===l.phone && x.pass===l.pass)
    if(!found) return alert("رقم او باسورد غلط")
    localStorage.setItem("cu",JSON.stringify(found)); setCu(found); setPage(found.role)
  }
  const out=()=>{ localStorage.removeItem("cu"); setPage("login"); setCu(null) }
  if(page==="login") return (
    <div dir="rtl" style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justify
