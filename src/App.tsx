import { useState, useEffect } from "react";

const ADMINS = ["01027760669", "01008100546"];
const AREAS = ["سموحة", "سيدي جابر", "ميامي", "العجمي", "المنتزه", "محطة الرمل", "كفر عبده", "لوران", "جليم", "ستانلي", "المندرة", "سيدي بشر"];

type User = { name: string; phone: string; pass: string; role: "client" | "driver" };
type Order = { id: string; client: string; phone: string; from: string; to: string; details: string; price: string; status: "جديد" | "في الطريق" | "تم"; driver?: string };

export default function App() {
  const
