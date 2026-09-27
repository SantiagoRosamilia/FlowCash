import { useState, useEffect, useRef, useCallback } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Legend,
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, Wallet, LayoutDashboard, BarChart2,
  List, X, ShoppingCart, Car, Coffee, Heart, Shirt, Zap, DollarSign,
  Briefcase, ArrowUpRight, ChevronRight, RefreshCw, CheckCircle,
  Search, Key, Info, BookOpen, Smartphone, Trash2, Shield,
  Banknote, CreditCard, LogOut, User, Mail, Lock, Eye, EyeOff,
  AlertCircle, UserPlus, LogIn, Calendar, AlertTriangle, WifiOff, Download,
  ArrowLeftRight, PiggyBank, Users, Sparkles,
} from "lucide-react";
import { authApi, txApi, walletApi, mpApi } from './api.js';

/* ─── Session storage (solo email para mostrar en UI) ───────
   El JWT vive en api.js — nunca lo tocamos acá directamente.
   Solo guardamos el email del usuario para mostrarlo en el header.
─────────────────────────────────────────────────────────── */
const SESSION_KEY = 'fc_session_v1';
const loadSession = () => JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
const saveSession = s  => sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
const clearSession= () => { sessionStorage.removeItem(SESSION_KEY); authApi.logout(); };

/* ─── Storage local para deudas saldadas ("Me deben") ───── */
const SETTLED_KEY = 'fc_settled_splits_v1';
const loadSettled = () => JSON.parse(localStorage.getItem(SETTLED_KEY) || '[]');
const saveSettled = ids => localStorage.setItem(SETTLED_KEY, JSON.stringify(ids));

/* ─── Constants ─────────────────────────────────────────── */
const EXPENSE_CATS    = ["Alimentación","Transporte","Entretenimiento","Salud","Ropa","Servicios","Otros"];
const INCOME_CATS     = ["Sueldo","Freelance","Inversiones","Transferencia","Otros"];
const INVESTMENT_CATS = ["Inversiones","Broker / Acciones","Cripto / USDT","Fondo Común / Staking","Ahorro"];

/* Palabras clave que auto-activan "Fijo mensual" */
const FIXED_KEYWORDS = [
  "calistenia", "calis", "entrenamiento", "gimnasio", "gym",
  "cuota", "cuotas", "hbo", "netflix", "spotify", "nutricionista",
  "alquiler", "expensas", "internet", "wifi", "seguro", "prepaga"
];

const CAT_META = {
  Alimentación:            { Icon: ShoppingCart,   color: "#34D399" },
  Transporte:              { Icon: Car,            color: "#60A5FA" },
  Entretenimiento:         { Icon: Coffee,         color: "#A78BFA" },
  Salud:                   { Icon: Heart,          color: "#F472B6" },
  Ropa:                    { Icon: Shirt,          color: "#FB923C" },
  Servicios:               { Icon: Zap,            color: "#FBBF24" },
  Otros:                   { Icon: DollarSign,     color: "#94A3B8" },
  Sueldo:                  { Icon: Briefcase,      color: "#34D399" },
  Freelance:               { Icon: Smartphone,     color: "#60A5FA" },
  Inversiones:             { Icon: PiggyBank,      color: "#A78BFA" },
  "Broker / Acciones":     { Icon: TrendingUp,     color: "#818CF8" },
  "Cripto / USDT":         { Icon: PiggyBank,      color: "#FBBF24" },
  "Fondo Común / Staking": { Icon: TrendingUp,     color: "#34D399" },
  Ahorro:                  { Icon: PiggyBank,      color: "#38BDF8" },
  Transferencia:           { Icon: ArrowLeftRight, color: "#38BDF8" },
};
const WALLETS = {
  manual:      { label:"Efectivo",     color:"#34D399", Icon: Banknote   },
  mercadopago: { label:"Mercado Pago", color:"#00BCFF", Icon: CreditCard },
  lemoncash:   { label:"Lemon Cash",   color:"#FFD700", Icon: Smartphone },
};

/* ─── Catálogo completo de bancos y billeteras argentinas ── */
const ARG_BANKS = [
  // Bancos
  { id:"galicia",    name:"Galicia",        color:"#FF6E00", initials:"G",  type:"Banco"     },
  { id:"santander",  name:"Santander",       color:"#EC0000", initials:"S",  type:"Banco"     },
  { id:"bbva",       name:"BBVA",            color:"#004481", initials:"B",  type:"Banco"     },
  { id:"macro",      name:"Macro",           color:"#0E2A8C", initials:"M",  type:"Banco"     },
  { id:"icbc",       name:"ICBC",            color:"#C8102E", initials:"I",  type:"Banco"     },
  { id:"nacion",     name:"Banco Nación",    color:"#1F4E79", initials:"N",  type:"Banco"     },
  { id:"provincia",  name:"Banco Provincia", color:"#16A085", initials:"P",  type:"Banco"     },
  { id:"ciudad",     name:"Banco Ciudad",    color:"#E63946", initials:"C",  type:"Banco"     },
  { id:"brubank",    name:"Brubank",         color:"#7C5CFF", initials:"BR", type:"Banco"     },
  { id:"hsbc",       name:"HSBC",            color:"#DB0011", initials:"H",  type:"Banco"     },
  { id:"supervielle",name:"Supervielle",     color:"#FF6600", initials:"SV", type:"Banco"     },
  // Billeteras
  { id:"mercadopago",name:"Mercado Pago",    color:"#00B0FF", initials:"M",  type:"Billetera" },
  { id:"naranjax",   name:"Naranja X",       color:"#FF6B1A", initials:"NX", type:"Billetera" },
  { id:"uala",       name:"Ualá",            color:"#22D39A", initials:"U",  type:"Billetera" },
  { id:"modo",       name:"MODO",            color:"#3B47F1", initials:"MO", type:"Billetera" },
  { id:"reba",       name:"Reba",            color:"#FF4D7D", initials:"R",  type:"Billetera" },
  { id:"lemoncash",  name:"Lemon Cash",      color:"#FFD700", initials:"L",  type:"Billetera" },
  { id:"paypal",     name:"PayPal",          color:"#003087", initials:"PP", type:"Billetera" },
];
// helper para obtener info de banco/billetera por id
const getBank = id => id === "efectivo"
  ? { id:"efectivo", name:"Efectivo", color:"#34D399", initials:"E", type:"Efectivo" }
  : ARG_BANKS.find(b => b.id === id);

const MOCK_API = [
  { id:"mp1", type:"expense", amount:2850,  category:"Alimentación",    description:"Supermercado Dia",      date:"2025-07-10", source:"digital", wallet:"mercadopago", recurring:false },
  { id:"mp2", type:"expense", amount:1200,  category:"Transporte",      description:"SUBE - recarga",        date:"2025-07-09", source:"digital", wallet:"mercadopago", recurring:false },
  { id:"mp3", type:"income",  amount:45000, category:"Transferencia",   description:"Transferencia recibida",date:"2025-07-08", source:"digital", wallet:"mercadopago", recurring:false },
  { id:"mp4", type:"expense", amount:3500,  category:"Entretenimiento", description:"Netflix + Spotify",     date:"2025-07-07", source:"digital", wallet:"mercadopago", recurring:true, dueDay:7  },
  { id:"mp5", type:"expense", amount:980,   category:"Alimentación",    description:"McDonalds QR",          date:"2025-07-06", source:"digital", wallet:"mercadopago", recurring:false },
  { id:"lc1", type:"income",  amount:12000, category:"Inversiones",     description:"Rendimiento DAI 8%",    date:"2025-07-10", source:"digital", wallet:"lemoncash",   recurring:false },
  { id:"lc2", type:"expense", amount:800,   category:"Servicios",       description:"Comisión plataforma",   date:"2025-07-06", source:"digital", wallet:"lemoncash",   recurring:false },
  { id:"lc3", type:"income",  amount:8500,  category:"Inversiones",     description:"Staking BTC rewards",  date:"2025-07-04", source:"digital", wallet:"lemoncash",   recurring:false },
];
const SYNC_STEPS = ["Conectando a Mercado Pago…","Importando Lemon Cash…","Normalizando datos…","¡Listo!"];

/* ─── Helpers ───────────────────────────────────────────── */
const fARS = n =>
  new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
const fARSShort = n => {
  if (Math.abs(n) >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000)    return `$${(n/1000).toFixed(0)}k`;
  return fARS(n);
};
const fDate = d =>
  new Date(d+"T00:00:00").toLocaleDateString("es-AR",{day:"2-digit",month:"short"});
const fDateLong = d =>
  new Date(d+"T00:00:00").toLocaleDateString("es-AR",{
    day:"2-digit", month:"long", weekday:"long"
  }).replace(/^\w/,c=>c.toUpperCase());
const uid = () => Math.random().toString(36).slice(2,10);

/* ─── Clasificadores inteligentes (retrocompatibles con CSV/DB) ─── */
const isInternalTransfer = tx => {
  const d = (tx.description || "").toLowerCase();
  if (d.startsWith("[transferencia]")) return true;
  // Detecta tus registros históricos de pases entre Efectivo y Lemon
  return [
    "de efectivo a lemon",
    "paso a lemon",
    "pase a lemon",
    "ingreso de efectivo a lemoncash",
    "me paso a lemoncash",
    "cambio de efectivo a lemon"
  ].some(p => d.includes(p));
};

const isInvestmentTx = tx => {
  if (tx.type === "investment") return true;
  const d = (tx.description || "").toLowerCase();
  if (d.startsWith("[inversión]") || d.startsWith("[inversion]")) return true;
  if (tx.type === "expense" && (
    INVESTMENT_CATS.includes(tx.category) ||
    ["poner para inversion", "poner inversión", "prueba bull market", "bull market"].some(p => d.includes(p))
  )) return true;
  return false;
};

const isAutoFixedTx = tx => {
  if (tx.recurring) return true;
  if (tx.type !== "expense" || isInternalTransfer(tx) || isInvestmentTx(tx)) return false;
  const d = (tx.description || "").toLowerCase();
  return FIXED_KEYWORDS.some(kw => {
    const r = new RegExp(`(^|\\s|[^a-záéíóúñ])${kw}($|\\s|[^a-záéíóúñ])`, "i");
    return r.test(d);
  });
};

// Parsea si un gasto tiene formato de cuenta dividida:
// "Hamburguesas [Mi parte: $30000 | Me deben: $88000 (Facu, Luzzi)]"
const parseSplitInfo = tx => {
  const desc = tx.description || "";
  const match = desc.match(/\[Mi parte:\s*\$(\d+(?:\.\d+)?)\s*\|\s*Me deben:\s*\$(\d+(?:\.\d+)?)(?:\s*\(([^)]+)\))?\]/i);
  if (!match) return null;
  const cleanDesc = desc.replace(match[0], "").trim();
  return {
    cleanDesc: cleanDesc || desc,
    myShare:   parseFloat(match[1]) || 0,
    owed:      parseFloat(match[2]) || 0,
    debtors:   match[3] ? match[3].trim() : "Amigos / Terceros",
  };
};

// Devuelve el gasto real para estadísticas (descuenta lo que te deben en gastos compartidos)
const getEffectiveExpense = tx => {
  const split = parseSplitInfo(tx);
  if (split) return split.myShare;
  return tx.amount;
};

/* ─── Hook: slot machine animation ────────────────────────── */
function useSlotMachine(target, duration = 1100) {
  const [state, setState] = useState({ val: target, animKey: 0, dir: 0 });
  const prevRef  = useRef(target);
  const timers   = useRef([]);

  useEffect(() => {
    if (prevRef.current === target) return;

    const from = prevRef.current;
    const to   = target;
    const dir  = to > from ? 1 : -1;
    prevRef.current = to;

    timers.current.forEach(clearTimeout);
    timers.current = [];

    const N = 20;
    const sumWeights = Array.from({length:N},(_,i)=>Math.pow(N-i,2)).reduce((a,b)=>a+b,0);
    const C = duration / sumWeights;
    let cumTime = 0;

    for (let i = 1; i <= N; i++) {
      const interval = C * Math.pow(N - i + 1, 2);
      cumTime += interval;
      const p   = Math.pow(i / N, 3);
      const val = i === N ? to : Math.round(from + (to - from) * p);

      timers.current.push(
        setTimeout(() =>
          setState(prev => ({ val, animKey: prev.animKey + 1, dir })),
          Math.round(cumTime)
        )
      );
    }

    return () => timers.current.forEach(clearTimeout);
  }, [target, duration]);

  return state;
}

/* ─── Component: SwipeableRow ─────────────────────────────── */
function SwipeableRow({ id, onDeleteRequest, children }) {
  const [swipeX, setSwipeX]   = useState(0);
  const [opened, setOpened]   = useState(false);
  const startX = useRef(0);
  const moving = useRef(false);
  const PANEL  = 76;
  const THRESH = 50;

  const onTouchStart = e => {
    startX.current = e.touches[0].clientX;
    moving.current = true;
  };
  const onTouchMove = e => {
    if (!moving.current) return;
    const diff = startX.current - e.touches[0].clientX;
    if (diff > 0) setSwipeX(Math.min(diff, PANEL));
    else if (opened) setSwipeX(Math.max(PANEL + diff, 0));
  };
  const onTouchEnd = () => {
    moving.current = false;
    if (swipeX > THRESH) { setSwipeX(PANEL); setOpened(true); }
    else                  { setSwipeX(0);     setOpened(false); }
  };

  return (
    <div style={{position:"relative", overflow:"hidden"}}>
      <div style={{position:"absolute", right:0, top:0, bottom:0, width:PANEL,
          background:"#DC2626", display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer"}}
           onClick={() => { setSwipeX(0); setOpened(false); onDeleteRequest(id); }}>
        <Trash2 size={19} color="#fff"/>
      </div>
      <div style={{transform:`translateX(-${swipeX}px)`,
          transition: moving.current ? "none" : "transform .25s ease-out"}}
           onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {children}
      </div>
    </div>
  );
}

/* ─── Tooltip ───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"#1E293B",border:"1px solid #334155",borderRadius:10,
        padding:"8px 12px",fontSize:12}}>
      <p style={{color:"#94A3B8",margin:"0 0 2px"}}>{payload[0].name}</p>
      <p style={{color:"#F1F5F9",fontWeight:600,margin:0}}>{fARS(payload[0].value)}</p>
    </div>
  );
};

/* ─── Component: DonutWithTooltip ─────────────────────────── */
function DonutWithTooltip({ data, total }) {
  const [tip, setTip] = useState(null);

  const handleEnter = (sliceData) => {
    setTip({
      name:  sliceData.name,
      value: sliceData.value,
      color: sliceData.fill,
    });
  };

  const pct = tip && total > 0 ? Math.round((tip.value / total) * 100) : 0;

  return (
    <div style={{position:"relative", marginBottom:4}}>
      <div style={{
        position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)",
        zIndex:20, pointerEvents:"none",
        opacity: tip ? 1 : 0,
        transition:"opacity .15s ease",
      }}>
        {tip && (
          <div style={{
            background:"#1E293B",
            border:`1px solid ${tip.color}55`,
            borderRadius:10,
            padding:"8px 13px",
            whiteSpace:"nowrap",
            boxShadow:"0 6px 20px rgba(0,0,0,.45)",
            display:"flex", flexDirection:"column", alignItems:"center", gap:2,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:tip.color}}/>
              <span style={{fontSize:12,fontWeight:700,color:"#F1F5F9"}}>{tip.name}</span>
            </div>
            <span style={{fontSize:14,fontWeight:800,color:tip.color}}>{fARS(tip.value)}</span>
            <span style={{fontSize:10,color:"#64748B"}}>{pct}% del total</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={60} outerRadius={88}
            paddingAngle={4} dataKey="value" strokeWidth={0}
            onMouseEnter={handleEnter}
            onMouseLeave={()=>setTip(null)}
          >
            {data.map((e,i)=><Cell key={i} fill={e.color}/>)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div style={{position:"absolute",top:"50%",left:"50%",
          transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none",zIndex:1}}>
        <p style={{fontSize:10,color:"#64748B",fontWeight:600,
            textTransform:"uppercase",letterSpacing:.4}}>Total</p>
        <p style={{fontSize:14,fontWeight:800,color:"#E2E8F0"}}>{fARS(total)}</p>
      </div>
    </div>
  );
}

/* ─── BankBadge ─────────────────────────────────────────── */
function BankBadge({ id, size=40 }) {
  const bank = getBank(id);
  if (!bank) return null;
  return (
    <span style={{width:size,height:size,borderRadius:Math.round(size*.26),display:"inline-flex",
        alignItems:"center",justifyContent:"center",background:bank.color,flex:"none",
        fontSize:Math.round(size*.36),fontWeight:700,color:"#fff",flexShrink:0}}>
      {bank.initials?.slice(0,2)}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   BANKS PAGE — página completa de gestión de bancos
════════════════════════════════════════════════════════════ */
function BanksPage({ connectedIds, txs, walletBalance, onSave, onClose }) {
  const [local, setLocal]   = useState([...connectedIds]);
  const [view, setView]     = useState("connected");
  const [search, setSearch] = useState("");

  const toggle = id => {
    if (id === "efectivo") return;
    setLocal(prev => prev.includes(id) ? prev.filter(k=>k!==id) : [...prev, id]);
  };

  const connectedNoEf = local.filter(id => id !== "efectivo");
  const totalBanks    = connectedNoEf.reduce((s,id) => s + Math.max(0, walletBalance(id)), 0);

  const bancos    = ARG_BANKS.filter(b => b.type==="Banco"     && b.name.toLowerCase().includes(search.toLowerCase()));
  const billeteras= ARG_BANKS.filter(b => b.type==="Billetera" && b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fc">
      <header className="glass" style={{position:"sticky",top:0,zIndex:40,padding:"11px 20px",
          display:"flex",alignItems:"center",gap:14}}>
        <button onClick={onClose}
          style={{width:34,height:34,borderRadius:10,background:"#1E293B",border:"1px solid #334155",
            cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#94A3B8"}}>
          <X size={16}/>
        </button>
        <span style={{fontWeight:700,fontSize:17}}>Mis Bancos</span>
      </header>

      <div className="wrap">
        <div className="card" style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            marginBottom:20,gap:16}}>
          <div>
            <h2 style={{fontSize:16,fontWeight:700,marginBottom:4}}>Mis bancos & billeteras</h2>
            <p style={{fontSize:12,color:"#64748B"}}>Conectá tus cuentas para ver el saldo unificado en tu Dashboard.</p>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <p style={{fontSize:10,fontWeight:700,color:"#64748B",letterSpacing:".08em",
                textTransform:"uppercase",marginBottom:4}}>TOTAL EN BANCOS</p>
            <p style={{fontSize:26,fontWeight:800,color:"#F1F5F9"}}>{fARS(totalBanks)}</p>
            <p style={{fontSize:11,color:"#64748B",marginTop:2}}>{connectedNoEf.length} cuentas vinculadas</p>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:"#0F172A",
            border:"1px solid #1E293B",borderRadius:14,padding:5,gap:4,marginBottom:20}}>
          {[["connected",`Conectados  ${connectedNoEf.length}`],["directory",`Directorio  ${ARG_BANKS.length}`]].map(([v,l])=>(
            <div key={v} onClick={()=>setView(v)}
              style={{padding:"12px",borderRadius:11,fontSize:14,fontWeight:600,textAlign:"center",
                cursor:"pointer",transition:"all .15s",
                color:view===v?"#818CF8":"#475569",
                background:view===v?"rgba(99,102,241,.15)":"transparent"}}>
              {l}
            </div>
          ))}
        </div>

        {view==="connected" && (
          connectedNoEf.length === 0 ? (
            <div className="card" style={{textAlign:"center",padding:"48px 24px"}}>
              <div style={{fontSize:48,marginBottom:16}}>🏦</div>
              <h2 style={{fontSize:18,fontWeight:700,marginBottom:8}}>Sin bancos conectados</h2>
              <p style={{color:"#64748B",fontSize:13,marginBottom:20,lineHeight:1.6}}>
                Vinculá tu primera cuenta para ver tu saldo real al instante.
              </p>
              <button onClick={()=>setView("directory")}
                style={{padding:"11px 24px",borderRadius:12,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",
                  color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>
                + Conectar un banco
              </button>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {connectedNoEf.map(id => {
                const bank = ARG_BANKS.find(b=>b.id===id); if(!bank) return null;
                const bal  = walletBalance(id);
                return (
                  <div key={id} className="card" style={{position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",right:-40,top:-40,width:160,height:160,borderRadius:"50%",
                        background:bank.color,opacity:.07,filter:"blur(4px)",pointerEvents:"none"}}/>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                        marginBottom:16,position:"relative"}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <BankBadge id={id} size={44}/>
                        <div>
                          <p style={{fontSize:16,fontWeight:700}}>{bank.name}</p>
                          <p style={{fontSize:11,color:"#64748B",marginTop:2}}>
                            {bank.type} · •••• {1000+bank.id.length*137}
                          </p>
                        </div>
                      </div>
                      <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:999,fontSize:10,
                          fontWeight:700,color:"#34D399",background:"rgba(52,211,153,.12)",
                          border:"1px solid rgba(52,211,153,.3)"}}>CONECTADO</span>
                    </div>
                    <p style={{fontSize:28,fontWeight:800,color:bal>=0?"#F1F5F9":"#F472B6",
                        position:"relative",marginBottom:4}}>
                      {bal>=0?"+":""}{fARS(bal)}
                    </p>
                    <p style={{fontSize:12,color:"#64748B",marginBottom:16}}>Saldo neto del período</p>
                    <div style={{display:"flex",gap:8}}>
                      <button style={{padding:"8px 14px",borderRadius:10,background:"#1E293B",
                          border:"1px solid #334155",color:"#94A3B8",cursor:"pointer",
                          fontSize:12,fontWeight:600,fontFamily:"inherit"}}>Ver movimientos</button>
                      <button onClick={()=>toggle(id)}
                        style={{padding:"8px 14px",borderRadius:10,background:"none",
                          border:"none",color:"#64748B",cursor:"pointer",
                          fontSize:12,fontWeight:600,fontFamily:"inherit"}}>Desconectar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {view==="directory" && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"#0F172A",
                border:"1px solid #1E293B",borderRadius:14,padding:"12px 16px"}}>
              <Search size={15} color="#475569"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Buscar tu banco o billetera…"
                style={{background:"none",border:"none",outline:"none",flex:1,fontSize:14,
                  color:"#F1F5F9",fontFamily:"inherit"}}/>
            </div>

            {[{title:"Bancos",items:bancos},{title:"Billeteras virtuales",items:billeteras}].map(({title,items})=>(
              <div key={title} className="card" style={{padding:0,overflow:"hidden"}}>
                <p style={{fontSize:14,fontWeight:700,padding:"16px 20px 10px"}}>{title}</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)"}}>
                  {items.map(b => {
                    const linked = local.includes(b.id);
                    return (
                      <div key={b.id} onClick={()=>toggle(b.id)}
                        style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",
                          borderTop:"1px solid #1E293B",borderLeft:"1px solid #1E293B",
                          cursor:"pointer",transition:"background .15s",
                          background:linked?"rgba(99,102,241,.1)":"transparent"}}
                        onMouseEnter={e=>{if(!linked)e.currentTarget.style.background="#1E293B";}}
                        onMouseLeave={e=>{if(!linked)e.currentTarget.style.background="transparent";}}>
                        <BankBadge id={b.id} size={38}/>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name}</p>
                          <p style={{fontSize:11,color:"#64748B",marginTop:1}}>{b.type}</p>
                        </div>
                        <span style={{width:22,height:22,borderRadius:7,flex:"none",display:"flex",
                            alignItems:"center",justifyContent:"center",transition:"all .15s",
                            background:linked?"#6366F1":"transparent",
                            border:linked?"none":"1.5px solid #334155",color:"#fff",fontSize:13}}>
                          {linked&&"✓"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <button onClick={()=>onSave(local)}
              style={{width:"100%",padding:"14px",borderRadius:14,fontSize:15,fontWeight:700,
                color:"#fff",border:"none",cursor:"pointer",fontFamily:"inherit",
                background:"linear-gradient(135deg,#6366F1,#8B5CF6)"}}>
              Guardar cambios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Component: SourceLegend ─────────────────────────────── */
function SourceLegend({ items, total }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const [first, ...rest] = items;
  const pctFirst = total>0 ? Math.round((first.value/total)*100) : 0;
  return (
    <div style={{marginTop:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"10px 12px",borderRadius:10,background:"#1E293B",marginBottom:rest.length?6:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:first.color,flexShrink:0}}/>
          <span style={{fontSize:12,fontWeight:600,color:"#CBD5E1"}}>{first.name}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:11,color:"#64748B"}}>{fARS(first.value)}</span>
          <span style={{fontSize:13,fontWeight:800,color:first.color,minWidth:36,textAlign:"right"}}>
            {pctFirst}%
          </span>
          {rest.length > 0 && (
            <button onClick={()=>setOpen(!open)}
              style={{background:"none",border:"none",cursor:"pointer",color:"#64748B",
                display:"flex",alignItems:"center",padding:0,transition:"transform .2s",
                transform:open?"rotate(180deg)":"rotate(0deg)"}}>
              <ChevronRight size={14} style={{transform:"rotate(90deg)"}}/>
            </button>
          )}
        </div>
      </div>
      {open && rest.map(d=>{
        const pct = total>0 ? Math.round((d.value/total)*100) : 0;
        return (
          <div key={d.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"10px 12px",borderRadius:10,background:"#1E293B",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:d.color,flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:600,color:"#CBD5E1"}}>{d.name}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:11,color:"#64748B"}}>{fARS(d.value)}</span>
              <span style={{fontSize:13,fontWeight:800,color:d.color,minWidth:36,textAlign:"right"}}>{pct}%</span>
            </div>
          </div>
        );
      })}
      <p style={{fontSize:11,color:"#475569",marginTop:8,textAlign:"center"}}>
        Total distribuido: <b style={{color:"#CBD5E1"}}>{fARS(total)}</b>
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   AUTH SCREEN
════════════════════════════════════════════════════════════ */
function AuthScreen({ onAuth }) {
  const [mode, setMode]     = useState('login');
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [pw2, setPw2]       = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [ok, setOk]         = useState('');

  const submit = async () => {
    setError(''); setOk('');
    if (!email.trim()||!pw) { setError('Completá todos los campos.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email inválido.'); return; }
    if (pw.length < 8) { setError('Mínimo 8 caracteres.'); return; }
    if (mode==='register' && pw!==pw2) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    try {
      const norm = email.trim().toLowerCase();
      let user;
      if (mode==='register') {
        user = await authApi.register(norm, pw);
      } else {
        user = await authApi.login(norm, pw);
      }
      const s = { userId: user.id, email: user.email };
      saveSession(s);
      setOk(mode==='register' ? '¡Cuenta creada!' : 'Bienvenido…');
      setTimeout(() => onAuth(s), 500);
    } catch(e) {
      setError(e.message || 'Error de conexión. Verificá tu internet.');
    }
    setLoading(false);
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#020617;font-family:'Plus Jakarta Sans',sans-serif;}
    .ai{width:100%;background:#1E293B;border:1px solid #334155;border-radius:12px;
      padding:13px 16px;font-size:14px;color:#F1F5F9;outline:none;font-family:inherit;transition:border-color .2s;}
    .ai:focus{border-color:#6366F1;} .ai::placeholder{color:#475569;}
    .ab{width:100%;padding:14px;border-radius:14px;font-size:15px;font-weight:700;color:#fff;border:none;
      cursor:pointer;font-family:inherit;background:linear-gradient(135deg,#6366F1,#8B5CF6);transition:opacity .2s;}
    .ab:hover:not(:disabled){opacity:.9;} .ab:disabled{opacity:.45;cursor:not-allowed;}
    .fa{animation:fa .3s ease-out;}
    @keyframes fa{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  `;

  return (
    <div style={{minHeight:"100vh",background:"#020617",display:"flex",alignItems:"center",
        justifyContent:"center",padding:"20px",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{css}</style>
      <div className="fa" style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:52,height:52,borderRadius:16,margin:"0 auto 14px",
              background:"linear-gradient(135deg,#6366F1,#8B5CF6)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Wallet size={24} color="#fff"/>
          </div>
          <h1 style={{fontSize:26,fontWeight:800,color:"#F1F5F9",letterSpacing:"-.5px"}}>
            Flow<span style={{color:"#818CF8"}}>Cash</span>
          </h1>
          <p style={{fontSize:13,color:"#64748B",marginTop:4}}>
            {mode==='login'?"Iniciá sesión para continuar":"Creá tu cuenta gratuita"}
          </p>
        </div>
        <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:20,padding:28}}>
          <div style={{display:"flex",background:"#1E293B",borderRadius:12,padding:4,gap:4,marginBottom:24}}>
            {[['login','Iniciar sesión',LogIn],['register','Crear cuenta',UserPlus]].map(([v,l,Ic])=>(
              <button key={v} onClick={()=>{setMode(v);setError('');setOk('');}}
                style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                  padding:"9px 8px",borderRadius:10,border:"none",cursor:"pointer",fontSize:13,
                  fontWeight:600,fontFamily:"inherit",transition:"all .2s",
                  background:mode===v?"linear-gradient(135deg,#6366F1,#8B5CF6)":"none",
                  color:mode===v?"#fff":"#64748B"}}>
                <Ic size={14}/>{l}
              </button>
            ))}
          </div>
          {error && <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
              borderRadius:10,background:"rgba(244,114,182,.1)",border:"1px solid rgba(244,114,182,.25)",
              marginBottom:14}}><AlertCircle size={14} color="#F472B6"/>
            <span style={{fontSize:12,color:"#F472B6",fontWeight:500}}>{error}</span></div>}
          {ok && <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
              borderRadius:10,background:"rgba(52,211,153,.1)",border:"1px solid rgba(52,211,153,.25)",
              marginBottom:14}}><CheckCircle size={14} color="#34D399"/>
            <span style={{fontSize:12,color:"#34D399",fontWeight:500}}>{ok}</span></div>}
          {[['Email','email',email,setEmail,Mail,'tu@email.com'],
            ['Contraseña','password',pw,setPw,Lock,'Mínimo 8 caracteres']].map(([lbl,type,val,set,Ic,ph],i)=>(
            <div key={lbl} style={{marginBottom:14}}>
              <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>
                {lbl.toUpperCase()}
              </label>
              <div style={{position:"relative"}}>
                <Ic size={14} color="#475569"
                  style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}/>
                <input className="ai" type={type==='password'?(showPw?'text':'password'):type}
                  value={val} onChange={e=>set(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={ph}
                  style={{paddingLeft:38,paddingRight:type==='password'?44:16}}/>
                {type==='password' && (
                  <button onClick={()=>setShowPw(!showPw)}
                    style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                      background:"none",border:"none",cursor:"pointer",color:"#475569",padding:4}}>
                    {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                )}
              </div>
            </div>
          ))}
          {mode==='register' && (
            <div style={{marginBottom:18}}>
              <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>
                CONFIRMAR CONTRASEÑA
              </label>
              <div style={{position:"relative"}}>
                <Lock size={14} color="#475569"
                  style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}/>
                <input className="ai" type={showPw?'text':'password'} value={pw2}
                  onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}
                  placeholder="Repetí tu contraseña"
                  style={{paddingLeft:38,
                    borderColor:pw2&&pw2!==pw?"rgba(244,114,182,.5)":pw2&&pw2===pw?"rgba(52,211,153,.5)":"#334155"}}/>
              </div>
              {pw2&&pw2===pw&&<p style={{fontSize:11,color:"#34D399",marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                <CheckCircle size={11}/>Coinciden</p>}
            </div>
          )}
          <button className="ab" onClick={submit}
            disabled={loading||(mode==='register'&&(!pw2||pw2!==pw))}>
            {loading?"Procesando…":mode==='login'?"Entrar a FlowCash":"Crear mi cuenta"}
          </button>
          <div style={{marginTop:16,padding:"10px 12px",background:"rgba(99,102,241,.06)",
              borderRadius:10,border:"1px solid rgba(99,102,241,.15)"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:7}}>
              <Shield size={12} color="#818CF8" style={{marginTop:2,flexShrink:0}}/>
              <p style={{fontSize:11,color:"#64748B",lineHeight:1.6}}>
                Tu contraseña se hashea con <span style={{color:"#818CF8",fontWeight:600}}>SHA-256</span> antes
                de guardarse. Nadie puede acceder a tus datos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════ */
export default function FlowCash() {
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authApi.isLoggedIn()) {
      const cached = loadSession();
      if (cached) {
        authApi.me()
          .then(data => {
            setSession({ userId: data.user.id, email: data.user.email });
          })
          .catch(() => {
            clearSession();
          })
          .finally(() => setChecked(true));
      } else {
        clearSession();
        setChecked(true);
      }
    } else {
      setChecked(true);
    }
  }, []);

  if (!checked) return (
    <div style={{minHeight:"100vh",background:"#020617",display:"flex",
        alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #6366F1",borderTopColor:"transparent",
            borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
        <p style={{fontSize:13,color:"#64748B",fontFamily:"sans-serif"}}>Cargando FlowCash…</p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!session) return <AuthScreen onAuth={s=>{ saveSession(s); setSession(s); }}/>;
  return <AppContent session={session} onLogout={()=>{ clearSession(); setSession(null); }}/>;
}

/* ════════════════════════════════════════════════════════════
   APP CONTENT
════════════════════════════════════════════════════════════ */
function AppContent({ session, onLogout }) {
  const { userId, email } = session;
  const [txs, setTxs]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [netError, setNetError] = useState(null);

  const [tab, setTab]                       = useState("dashboard");
  const [showModal, setShowModal]           = useState(false);
  const [showLogout, setShowLogout]         = useState(false);
  const [showBanks, setShowBanks]           = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [settleModalTx, setSettleModalTx]   = useState(null); // Modal para cobrar deuda compartida
  const [settledIds, setSettledIds]         = useState(() => loadSettled());
  const [apiDone, setApiDone]               = useState(false);
  const [syncing, setSyncing]               = useState(false);
  const [syncStep, setSyncStep]             = useState(0);
  const [filterType, setFilterType]         = useState("all");
  const [filterCat, setFilterCat]           = useState("all");
  const [query, setQuery]                   = useState("");
  const [toast, setToast]                   = useState(null);

  // Billeteras conectadas
  const [connectedIds, setConnectedIds] = useState(["efectivo"]);
  const [walletsLoaded, setWalletsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      txApi.getAll(),
      walletApi.getAll().catch(() => ({ wallets: ["efectivo"] })),
    ]).then(([txData, wData]) => {
      setTxs(txData.transactions || []);
      const ws = wData.wallets || ["efectivo"];
      if (!ws.includes("efectivo")) ws.unshift("efectivo");
      setConnectedIds(ws);
      setWalletsLoaded(true);
      setLoading(false);
    }).catch(e => { setNetError(e.message); setLoading(false); });
  }, [userId]);

  const saveConnected = async ids => {
    try {
      await walletApi.save(ids);
      setConnectedIds(ids);
      showToast("Billeteras guardadas ✓");
    } catch(e) {
      showToast(e.message || "Error al guardar", false);
    }
  };

  /* MEJORA 2: Categoría inicial vacía ("") para obligar a elegir */
  const getInitialForm = useCallback((mode = "expense") => {
    const firstDigital = connectedIds.find(id => id !== "efectivo") || "lemoncash";
    return {
      type: mode,               // "expense" | "income" | "investment" | "transfer"
      amount: "",
      category: mode === "transfer" ? "Transferencia" : "", // Vacío por defecto salvo en transferencia
      description: "",
      date: new Date().toISOString().split("T")[0],
      source: "digital",
      wallet: firstDigital,
      fromWallet: "efectivo",
      toWallet: firstDigital,
      recurring: false,
      autoRecurringDetected: false,
      dueDay: "",
      // MEJORA 4: Campos de "Dividir cuenta / Me deben"
      isSplit: false,
      myShare: "",
      splitWith: "",
    };
  }, [connectedIds]);

  const [form, setForm] = useState(() => getInitialForm("expense"));

  /* ── Computed (Excluyendo Transferencias Internas e Inversiones de los Gastos Operativos) ── */
  const realIncomeTxs  = txs.filter(t => t.type === "income" && !isInternalTransfer(t));
  const realExpenseTxs = txs.filter(t => t.type === "expense" && !isInternalTransfer(t) && !isInvestmentTx(t));
  const investmentTxs  = txs.filter(t => isInvestmentTx(t));

  const income      = realIncomeTxs.reduce((s,t) => s + t.amount, 0);
  // En gastos operativos usamos getEffectiveExpense (si fue compartido, toma tu parte real)
  const expenses    = realExpenseTxs.reduce((s,t) => s + getEffectiveExpense(t), 0);
  const invested    = investmentTxs.reduce((s,t) => s + t.amount, 0);

  // El Saldo Total disponible en billeteras sí contempla todas las entradas y salidas reales de caja
  const walletBalance = useCallback(id => {
    if (id === "efectivo") {
      const wt = txs.filter(t => t.wallet==="manual" || t.source==="cash");
      return wt.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0)
            -wt.filter(t=>t.type!=="income").reduce((s,t)=>s+t.amount,0);
    }
    const wt = txs.filter(t => t.wallet===id && t.source!=="cash");
    return wt.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0)
          -wt.filter(t=>t.type!=="income").reduce((s,t)=>s+t.amount,0);
  }, [txs]);

  const balance = connectedIds.reduce((s, id) => s + walletBalance(id), 0);

  // Tasa de ahorro + inversión real sobre ingresos reales
  const totalSavedOrInvested = Math.max(0, income - expenses);
  const savingsRate = income > 0 ? Math.min(100, Math.max(0, Math.round((totalSavedOrInvested / income) * 100))) : 0;
  const investmentRate = income > 0 ? Math.min(100, Math.round((invested / income) * 100)) : 0;

  // Slot machine animated values for the hero
  const slotBalance  = useSlotMachine(balance);
  const slotIncome   = useSlotMachine(income);
  const slotExpenses = useSlotMachine(expenses);

  const SlotNumber = ({ slot, style }) => (
    <span className="slot-wrap" style={style}>
      <span
        key={slot.animKey}
        className="slot-inner"
        style={{
          animation: slot.dir !== 0
            ? `${slot.dir > 0 ? 'slotUp' : 'slotDown'} 0.12s ease-out both`
            : 'none',
        }}>
        {fARS(slot.val)}
      </span>
    </span>
  );

  // Gráficos por categoría (solo Gastos Reales Operativos, sin transferencias ni inversiones)
  const byCat = EXPENSE_CATS
    .map(cat => ({
      name: cat,
      color: CAT_META[cat]?.color,
      value: realExpenseTxs.filter(t => t.category === cat).reduce((s,t) => s + getEffectiveExpense(t), 0)
    }))
    .filter(d => d.value > 0)
    .sort((a,b) => b.value - a.value);

  // Totales para el donut — ordenados de mayor a menor (sin transferencias internas)
  const walletTotals = connectedIds.map(id => {
    const bank  = getBank(id);
    const value = realExpenseTxs
      .filter(t => id==="efectivo" ? (t.wallet==="manual"||t.source==="cash") : (t.wallet===id && t.source!=="cash"))
      .reduce((s,t) => s + getEffectiveExpense(t), 0);
    return { id, name: bank?.name||id, value, color: bank?.color||"#64748B" };
  }).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  const walletTotal = walletTotals.reduce((s,d)=>s+d.value,0);

  // MEJORA 3: Gastos fijos (combina los marcados manualmente + los auto-detectados como Calistenia, Cuotas, HBO, Nutricionista)
  const recurringExpenses = realExpenseTxs.filter(t => isAutoFixedTx(t));
  const uniqueRecurring = Array.from(
    new Map(recurringExpenses.map(t => [t.description.trim().toLowerCase(), t])).values()
  ).sort((a,b) => (Number(a.dueDay)||99) - (Number(b.dueDay)||99));
  const monthlyCommitted = uniqueRecurring.reduce((s,t) => s + getEffectiveExpense(t), 0);

  // MEJORA 4: Cuentas divididas / "Me deben" pendientes de cobro
  const pendingSplits = txs
    .map(tx => {
      const sp = parseSplitInfo(tx);
      if (!sp || settledIds.includes(tx.id)) return null;
      return { tx, ...sp };
    })
    .filter(Boolean);
  const totalOwedToMe = pendingSplits.reduce((s, item) => s + item.owed, 0);

  // Today's day-of-month for due date detection
  const todayDay = new Date().getDate();
  const isDueSoon = d => d && (Number(d) - todayDay) >= 0 && (Number(d) - todayDay) <= 7;

  // Monthly evolution — last 6 months (limpio de transferencias internas)
  const monthlyData = (() => {
    const result = [];
    for (let i=5; i>=0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
      const y=d.getFullYear(), m=d.getMonth();
      const label = d.toLocaleDateString('es-AR',{month:'short'}).replace('.','').toUpperCase();
      const mInc  = realIncomeTxs.filter(t=>{ const td=new Date(t.date+"T00:00:00"); return td.getFullYear()===y&&td.getMonth()===m; });
      const mExp  = realExpenseTxs.filter(t=>{ const td=new Date(t.date+"T00:00:00"); return td.getFullYear()===y&&td.getMonth()===m; });
      const inc = mInc.reduce((s,t)=>s+t.amount,0);
      const exp = mExp.reduce((s,t)=>s+getEffectiveExpense(t),0);
      result.push({ label, Ingresos:inc, Gastos:exp, net:inc-exp });
    }
    return result;
  })();

  // Unique categories with transactions
  const availableCats = ["all",...Array.from(new Set(txs.map(t=>t.category).filter(Boolean))).sort()];

  const filtered = txs.filter(t=>{
    const mt = filterType==="all" ? true
             : filterType==="recurring" ? isAutoFixedTx(t)
             : filterType==="investment" ? isInvestmentTx(t)
             : filterType==="transfer" ? isInternalTransfer(t)
             : filterType==="split" ? !!parseSplitInfo(t)
             : filterType==="expense" ? (t.type==="expense" && !isInternalTransfer(t) && !isInvestmentTx(t))
             : (t.type==="income" && !isInternalTransfer(t));
    const mc = filterCat==="all"||t.category===filterCat;
    const mq = (t.description||"").toLowerCase().includes(query.toLowerCase())||
               (t.category||"").toLowerCase().includes(query.toLowerCase());
    return mt&&mc&&mq;
  });

  /* ── Actions ── */
  const showToast = (msg,ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  // Handler de descripción con auto-detección de Gasto Fijo (Mejora 3)
  const handleDescriptionChange = val => {
    const lower = val.toLowerCase();
    const matchedFixed = FIXED_KEYWORDS.some(kw => {
      const r = new RegExp(`(^|\\s|[^a-záéíóúñ])${kw}($|\\s|[^a-záéíóúñ])`, "i");
      return r.test(lower);
    });
    setForm(f => ({
      ...f,
      description: val,
      recurring: (f.type === "expense" && matchedFixed) ? true : f.recurring,
      autoRecurringDetected: (f.type === "expense" && matchedFixed),
    }));
  };

  const addTx = async () => {
    const totalAmt = parseFloat(form.amount);
    if (!totalAmt || totalAmt <= 0) return;

    // ── CASO A: TRANSFERENCIA ENTRE BILLETERAS (Mejora 1) ──
    if (form.type === "transfer") {
      if (form.fromWallet === form.toWallet) {
        showToast("Elegí dos billeteras distintas", false);
        return;
      }
      const fromBank = getBank(form.fromWallet);
      const toBank   = getBank(form.toWallet);
      const note     = form.description.trim() ? ` (${form.description.trim()})` : "";

      const outWallet = form.fromWallet === "efectivo" ? "manual" : form.fromWallet;
      const outSource = form.fromWallet === "efectivo" ? "cash"   : "digital";
      const inWallet  = form.toWallet   === "efectivo" ? "manual" : form.toWallet;
      const inSource  = form.toWallet   === "efectivo" ? "cash"   : "digital";

      const payloadOut = {
        type: "expense",
        amount: totalAmt,
        category: "Transferencia",
        description: `[Transferencia] Pase a ${toBank?.name || form.toWallet}${note}`,
        date: form.date,
        source: outSource,
        wallet: outWallet,
        wallet_name: outWallet,
        recurring: false,
        dueDay: "",
      };
      const payloadIn = {
        type: "income",
        amount: totalAmt,
        category: "Transferencia",
        description: `[Transferencia] Ingreso desde ${fromBank?.name || form.fromWallet}${note}`,
        date: form.date,
        source: inSource,
        wallet: inWallet,
        wallet_name: inWallet,
        recurring: false,
        dueDay: "",
      };

      try {
        const [resOut, resIn] = await Promise.all([
          txApi.create(payloadOut),
          txApi.create(payloadIn),
        ]);
        const txOut = { ...payloadOut, id: resOut.transaction.id };
        const txIn  = { ...payloadIn,  id: resIn.transaction.id };
        setTxs(p => [txIn, txOut, ...p]);
        setShowModal(false);
        setForm(getInitialForm("expense"));
        showToast("Transferencia entre billeteras registrada ✓");
      } catch(e) {
        showToast(e.message || "Error al transferir", false);
      }
      return;
    }

    // Validación obligatoria de descripción y categoría (Mejora 2)
    if (!form.description.trim() || !form.category) return;

    const rw = form.source === "cash" ? "manual" : form.wallet;

    // Armado de descripción para Inversión o Gasto Compartido (Mejoras 1 y 4)
    let finalDesc = form.description.trim();
    if (form.type === "investment" && !finalDesc.toLowerCase().startsWith("[inversión]")) {
      finalDesc = `[Inversión] ${finalDesc}`;
    } else if (form.type === "expense" && form.isSplit) {
      const myShareNum = parseFloat(form.myShare) || 0;
      const owedNum    = Math.max(0, totalAmt - myShareNum);
      if (owedNum > 0) {
        const who = form.splitWith.trim() ? ` (${form.splitWith.trim()})` : "";
        finalDesc = `${finalDesc} [Mi parte: $${myShareNum} | Me deben: $${owedNum}${who}]`;
      }
    }

    // Para mantener 100% compatibilidad con el backend, "investment" se guarda como "expense" con prefijo y categoría de inversión
    const backendType = form.type === "investment" ? "expense" : form.type;

    const payload = {
      type:        backendType,
      amount:      totalAmt,
      category:    form.category,
      description: finalDesc,
      date:        form.date,
      source:      form.source,
      wallet:      rw,
      wallet_name: rw,
      recurring:   form.type === "expense" ? !!form.recurring : false,
      dueDay:      (form.type === "expense" && form.recurring) ? form.dueDay : "",
    };

    try {
      const data = await txApi.create(payload);
      const newTx = {
        ...payload,
        id:     data.transaction.id,
        wallet: rw,
        date:   form.date,
      };
      setTxs(p => [newTx, ...p]);
      setShowModal(false);
      setForm(getInitialForm("expense"));
      showToast(form.type === "investment" ? "Inversión registrada ✓" : "Movimiento guardado ✓");
    } catch(e) {
      showToast(e.message || "Error al guardar", false);
    }
  };

  // Saldar una deuda de "Me deben" creando el ingreso de reintegro o marcándola cobrada
  const handleSettleSplit = async (item, targetWalletId) => {
    const rw = targetWalletId === "efectivo" ? "manual" : targetWalletId;
    const src = targetWalletId === "efectivo" ? "cash" : "digital";
    const payload = {
      type: "income",
      amount: item.owed,
      category: "Transferencia",
      description: `Reintegro ${item.debtors}: ${item.cleanDesc}`,
      date: new Date().toISOString().split("T")[0],
      source: src,
      wallet: rw,
      wallet_name: rw,
      recurring: false,
      dueDay: "",
    };
    try {
      const data = await txApi.create(payload);
      const newTx = { ...payload, id: data.transaction.id };
      setTxs(p => [newTx, ...p]);
      const nextSettled = [...settledIds, item.tx.id];
      setSettledIds(nextSettled);
      saveSettled(nextSettled);
      setSettleModalTx(null);
      showToast(`Cobro de ${fARS(item.owed)} acreditado ✓`);
    } catch(e) {
      showToast(e.message || "Error al registrar el cobro", false);
    }
  };

  const confirmDelete = id => setDeleteConfirmId(id);
  const doDelete = async () => {
    try {
      await txApi.delete(deleteConfirmId);
      setTxs(p=>p.filter(t=>t.id!==deleteConfirmId));
      setDeleteConfirmId(null);
      showToast("Movimiento eliminado", false);
    } catch(e) {
      showToast(e.message || "Error al eliminar", false);
      setDeleteConfirmId(null);
    }
  };

  const simulateAPI = () => {
    if (apiDone||syncing) return;
    setSyncing(true);
    let step=0;
    const tick=()=>{ setSyncStep(step); step++;
      if (step<SYNC_STEPS.length) setTimeout(tick,550);
      else {
        setTxs(p=>{ const ids=new Set(p.map(t=>t.id)); return [...MOCK_API.filter(t=>!ids.has(t.id)),...p]; });
        setApiDone(true); setSyncing(false); showToast("8 movimientos importados ✓");
      }
    };
    tick();
  };

  /* ── CSS ── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#020617;}
    ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px;}
    .fc{font-family:'Plus Jakarta Sans',sans-serif;min-height:100vh;background:#020617;color:#F1F5F9;}
    .glass{background:rgba(15,23,42,.9);backdrop-filter:blur(16px);border-bottom:1px solid #1E293B;}
    .glass-hi{background:rgba(22,32,52,.97);border:1px solid rgba(148,163,184,.1);}
    .card{background:#0F172A;border:1px solid #1E293B;border-radius:16px;padding:20px;}
    .grad-bal{background:linear-gradient(140deg,#1D4ED8 0%,#6D28D9 100%);}
    .grad-fab{background:linear-gradient(135deg,#6366F1,#8B5CF6);box-shadow:0 8px 28px rgba(99,102,241,.5);}
    .tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;
      border-radius:12px;border:1px solid transparent;cursor:pointer;font-size:11px;font-weight:600;
      background:none;color:#475569;transition:all .2s;white-space:nowrap;}
    .tab-btn:hover{color:#94A3B8;}
    .tab-active{background:rgba(99,102,241,.15)!important;color:#818CF8!important;border-color:rgba(99,102,241,.3)!important;}
    .tx-wrap:hover .tx-del-btn{opacity:1;}
    .tx-del-btn{opacity:0;transition:opacity .2s;}
    .tx-row{display:flex;align-items:center;gap:12px;padding:13px 18px;border-bottom:1px solid #1E293B;background:#0F172A;}
    .tx-row:last-child{border-bottom:none;}
    .badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;}
    .input-fc{width:100%;background:#1E293B;border:1px solid #334155;border-radius:12px;
      padding:12px 16px;font-size:14px;color:#F1F5F9;outline:none;font-family:inherit;transition:border-color .2s;}
    .input-fc:focus{border-color:#6366F1;} .input-fc::placeholder{color:#475569;}
    .btn-p{width:100%;padding:14px;border-radius:14px;font-size:15px;font-weight:700;color:#fff;
      border:none;cursor:pointer;font-family:inherit;transition:opacity .2s,transform .15s;}
    .btn-p:hover{opacity:.9;} .btn-p:active{transform:scale(.98);}
    .btn-p:disabled{opacity:.35;cursor:not-allowed;}
    .pill{display:flex;background:#1E293B;border-radius:12px;padding:4px;gap:4px;}
    .pill-o{flex:1;padding:10px 6px;border-radius:10px;font-size:12px;font-weight:700;border:none;
      cursor:pointer;font-family:inherit;color:#64748B;background:none;transition:all .2s;}
    .fade-in{animation:fu .28s ease-out both;}
    @keyframes slotUp   { from{transform:translateY(70%);opacity:0;filter:blur(1.5px)} to{transform:translateY(0);opacity:1;filter:blur(0)} }
    @keyframes slotDown { from{transform:translateY(-70%);opacity:0;filter:blur(1.5px)} to{transform:translateY(0);opacity:1;filter:blur(0)} }
    .slot-wrap{overflow:hidden;display:inline-block;vertical-align:baseline;}
    .slot-inner{display:inline-block;}
    @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    .pb{height:5px;border-radius:99px;background:#1E293B;overflow:hidden;}
    .pf{height:100%;border-radius:99px;transition:width .6s ease;}
    .toast{position:fixed;bottom:86px;left:50%;transform:translateX(-50%);z-index:999;
      padding:10px 18px;border-radius:12px;font-size:13px;font-weight:600;white-space:nowrap;
      pointer-events:none;animation:ti .3s ease-out;}
    @keyframes ti{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    select.input-fc option{background:#1E293B;}
    input[type=date].input-fc::-webkit-calendar-picker-indicator{filter:invert(.5);}
    .overlay{position:fixed;inset:0;z-index:50;display:flex;align-items:center;
      justify-content:center;padding:16px 20px;background:rgba(0,0,0,.8);backdrop-filter:blur(6px);}
    .wrap{max-width:1180px;margin:0 auto;padding:16px 20px 96px;}
    .db-grid{display:grid;grid-template-columns:1fr;gap:14px;}
    .col{display:flex;flex-direction:column;gap:14px;}
    .ch-wrap{display:flex;flex-direction:column;gap:14px;}
    .ch-top{display:flex;flex-direction:column;gap:14px;}
    @media(min-width:720px){
      .wrap{padding:22px 28px 80px;}
      .db-grid{grid-template-columns:1fr 1fr;gap:20px;align-items:start;}
      .ch-wrap{flex-direction:row;align-items:flex-start;}
      .ch-top{flex:1;}
    }
    @media(min-width:1060px){ .db-grid{grid-template-columns:430px 1fr;} }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button{opacity:1;}
  `;

  /* ── Sub-components ── */
  const TxIcon = ({tx, size=36}) => {
    const catKey = isInternalTransfer(tx) ? "Transferencia" : isInvestmentTx(tx) ? "Inversiones" : tx.category;
    const m = CAT_META[catKey] || CAT_META["Otros"], I = m.Icon;
    return <div style={{width:size,height:size,borderRadius:10,background:m.color+"20",
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <I size={Math.round(size*.44)} color={m.color}/></div>;
  };

  const sourceLabel = tx => {
    if (tx.source==="cash" || tx.wallet==="manual") return { icon:"💵", text:"Efectivo", color:"#34D399" };
    const bank = getBank(tx.wallet);
    if (bank) return { icon:"💳", text:bank.name, color:bank.color };
    const w=WALLETS[tx.wallet];
    if (w&&tx.wallet!=="manual") return { icon:"💳", text:w.label, color:w.color };
    return { icon:"💳", text:"Digital", color:"#60A5FA" };
  };

  /* ═══════════════ RENDER ═══════════════ */
  if (loading) return (
    <div style={{minHeight:"100vh",background:"#020617",display:"flex",
        alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{width:44,height:44,border:"3px solid #6366F1",borderTopColor:"transparent",
          borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <p style={{fontSize:13,color:"#64748B",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
        Cargando tus movimientos…
      </p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (netError) return (
    <div style={{minHeight:"100vh",background:"#020617",display:"flex",
        alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{textAlign:"center",maxWidth:320}}>
        <WifiOff size={40} color="#F472B6" style={{margin:"0 auto 16px"}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:"#F1F5F9",marginBottom:8,
            fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
          Sin conexión al servidor
        </h2>
        <p style={{fontSize:13,color:"#64748B",lineHeight:1.6,marginBottom:20,
            fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
          No se pudo conectar con el backend. Verificá que Railway esté corriendo
          y que <code style={{color:"#818CF8"}}>VITE_API_URL</code> esté configurado.
        </p>
        <p style={{fontSize:12,color:"#475569",fontFamily:"monospace",
            background:"#0F172A",padding:"8px 12px",borderRadius:8}}>
          {netError}
        </p>
        <button onClick={()=>window.location.reload()}
          style={{marginTop:16,padding:"10px 20px",borderRadius:12,border:"1px solid #6366F1",
            background:"rgba(99,102,241,.15)",color:"#818CF8",cursor:"pointer",
            fontSize:13,fontWeight:600,fontFamily:"sans-serif"}}>
          Reintentar
        </button>
      </div>
    </div>
  );

  if (showBanks) return (
    <>
      <style>{css}</style>
      <BanksPage
        connectedIds={connectedIds}
        txs={txs}
        walletBalance={walletBalance}
        onSave={async ids=>{ await saveConnected(ids); setShowBanks(false); }}
        onClose={()=>setShowBanks(false)}
      />
    </>
  );

  return (
    <div className="fc">
      <style>{css}</style>

      {/* HEADER */}
      <header className="glass" style={{position:"sticky",top:0,zIndex:40,padding:"11px 20px",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:32,height:32,borderRadius:10,
              background:"linear-gradient(135deg,#6366F1,#8B5CF6)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Wallet size={16} color="#fff"/>
          </div>
          <span style={{fontWeight:800,fontSize:18,letterSpacing:"-.5px"}}>
            Flow<span style={{color:"#818CF8"}}>Cash</span>
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Acceso rápido a Transferir entre billeteras */}
          <button
            onClick={() => { setForm(getInitialForm("transfer")); setShowModal(true); }}
            title="Transferir entre billeteras"
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:20,
              background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.28)",
              color:"#38BDF8",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}}>
            <ArrowLeftRight size={12}/> Transferir
          </button>
          <span style={{fontSize:13,fontWeight:700,padding:"5px 13px",borderRadius:20,
            background:balance>=0?"rgba(52,211,153,.12)":"rgba(244,114,182,.12)",
            color:balance>=0?"#34D399":"#F472B6",
            border:`1px solid ${balance>=0?"rgba(52,211,153,.3)":"rgba(244,114,182,.3)"}`}}>
            {balance>=0?"▲":"▼"} {fARS(Math.abs(balance))}
          </span>
          <div style={{width:30,height:30,borderRadius:9,background:"rgba(99,102,241,.15)",
              border:"1px solid rgba(99,102,241,.25)",display:"flex",alignItems:"center",
              justifyContent:"center"}} title={email}>
            <User size={14} color="#818CF8"/>
          </div>
          <button onClick={()=>setShowBanks(true)}
            style={{width:30,height:30,borderRadius:9,background:"rgba(99,102,241,.15)",
              border:"1px solid rgba(99,102,241,.25)",display:"flex",alignItems:"center",
              justifyContent:"center",cursor:"pointer",position:"relative",transition:"all .2s"}}
            title="Mis bancos & billeteras"
            onMouseEnter={e=>e.currentTarget.style.background="rgba(99,102,241,.3)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(99,102,241,.15)"}>
            🏦
            {connectedIds.filter(id=>id!=="efectivo").length > 0 && (
              <span style={{position:"absolute",top:-5,right:-5,minWidth:16,height:16,
                  borderRadius:999,background:"#6366F1",color:"#fff",fontSize:9,fontWeight:700,
                  display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",
                  border:"2px solid #020617"}}>
                {connectedIds.filter(id=>id!=="efectivo").length}
              </span>
            )}
          </button>
          <button onClick={()=>setShowLogout(true)}
            style={{width:30,height:30,borderRadius:9,background:"rgba(244,114,182,.1)",
              border:"1px solid rgba(244,114,182,.2)",display:"flex",alignItems:"center",
              justifyContent:"center",cursor:"pointer",transition:"all .2s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(244,114,182,.2)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(244,114,182,.1)"}>
            <LogOut size={13} color="#F472B6"/>
          </button>
        </div>
      </header>

      {/* NAV */}
      <nav className="glass" style={{position:"sticky",top:56,zIndex:30,padding:"7px 12px",
          borderTop:"1px solid #1E293B"}}>
        <div style={{display:"flex",gap:3,maxWidth:1180,margin:"0 auto"}}>
          {[{id:"dashboard",label:"Dashboard",Icon:LayoutDashboard},
            {id:"charts",   label:"Gráficos", Icon:BarChart2},
            {id:"records",  label:"Registros",Icon:List},
            {id:"guide",    label:"Guía APIs", Icon:BookOpen}].map(({id,label,Icon:Ic})=>(
            <button key={id} className={`tab-btn ${tab===id?"tab-active":""}`} onClick={()=>setTab(id)}>
              <Ic size={16}/><span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="wrap fade-in" key={tab}>

        {/* ═══ DASHBOARD ═══ */}
        {tab==="dashboard" && (
          <div className="db-grid">
            {/* LEFT */}
            <div className="col">
              {/* Hero with count-up */}
              <div className="grad-bal" style={{borderRadius:20,padding:26,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-48,right:-48,width:170,height:170,
                  background:"radial-gradient(circle,rgba(255,255,255,.1),transparent)",borderRadius:"50%"}}/>
                <p style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.6)",letterSpacing:1.3,textTransform:"uppercase"}}>
                  Saldo Disponible en Billeteras
                </p>
                <p style={{fontSize:42,fontWeight:800,color:"#fff",margin:"8px 0 4px",letterSpacing:"-1.5px"}}>
                  <SlotNumber slot={slotBalance}/>
                </p>
                <p style={{fontSize:12,color:"rgba(255,255,255,.55)",marginBottom:20}}>
                  Sin contaminar por pases internos · {invested > 0 ? `Invertido: ${fARS(invested)}` : `${txs.length} movimientos`}
                </p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[{label:"Ingresos Reales",slot:slotIncome,Icon:TrendingUp,c:"rgba(52,211,153,.9)"},
                    {label:"Consumo Real",slot:slotExpenses,Icon:TrendingDown,c:"rgba(244,114,182,.9)"}].map(({label,slot,Icon:Ic,c})=>(
                    <div key={label} style={{background:"rgba(255,255,255,.1)",borderRadius:14,padding:"13px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                        <div style={{width:22,height:22,borderRadius:7,background:"rgba(255,255,255,.15)",
                            display:"flex",alignItems:"center",justifyContent:"center"}}><Ic size={12} color="#fff"/></div>
                        <p style={{fontSize:10,color:"rgba(255,255,255,.65)",fontWeight:600}}>{label}</p>
                      </div>
                      <p style={{fontSize:18,fontWeight:800,color:c,letterSpacing:"-.3px"}}>
                        <SlotNumber slot={slot}/>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wallet balances + Botón Transferir */}
              <div className="card">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                  <p style={{fontSize:13,fontWeight:700}}>Saldo por Billetera</p>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <button
                      onClick={() => { setForm(getInitialForm("transfer")); setShowModal(true); }}
                      style={{fontSize:11,color:"#38BDF8",background:"rgba(56,189,248,.1)",
                        border:"1px solid rgba(56,189,248,.25)",borderRadius:8,padding:"4px 9px",
                        cursor:"pointer",fontFamily:"inherit",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                      <ArrowLeftRight size={11}/> Pasar plata
                    </button>
                    <button onClick={()=>setShowBanks(true)}
                      style={{fontSize:12,color:"#818CF8",background:"none",border:"none",cursor:"pointer",
                        fontFamily:"inherit",fontWeight:600}}>Gestionar →</button>
                  </div>
                </div>
                <p style={{fontSize:11,color:"#64748B",marginBottom:14}}>Caja real en cada fuente (incluye pases internos)</p>
                <div style={{display:"flex",flexDirection:"column",gap:9}}>
                  {connectedIds.map(id => {
                    const bank = getBank(id); if(!bank) return null;
                    const bal  = walletBalance(id);
                    return (
                      <div key={id} style={{display:"flex",alignItems:"center",gap:12,
                          background:"#1E293B",borderRadius:13,padding:"12px 14px"}}>
                        <BankBadge id={id} size={36}/>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:13,fontWeight:600,color:"#CBD5E1"}}>{bank.name}</p>
                          <p style={{fontSize:10,color:"#475569",marginTop:1}}>{bank.type}</p>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <p style={{fontSize:15,fontWeight:800,color:bal>=0?bank.color:"#F472B6"}}>
                            {bal>=0?"+":""}{fARS(bal)}
                          </p>
                          <p style={{fontSize:10,color:"#475569",marginTop:1}}>{bal>=0?"disponible":"déficit"}</p>
                        </div>
                      </div>
                    );
                  })}
                  {txs.length>0 && (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                        padding:"8px 14px",borderRadius:10,background:"rgba(99,102,241,.07)",
                        border:"1px solid rgba(99,102,241,.15)",marginTop:2}}>
                      <span style={{fontSize:11,fontWeight:600,color:"#64748B"}}>Total disponible hoy</span>
                      <span style={{fontSize:13,fontWeight:800,color:balance>=0?"#34D399":"#F472B6"}}>
                        {balance>=0?"+":""}{fARS(balance)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* MEJORA 4: Tarjeta "Me deben / Cuentas divididas" */}
              <div className="card" style={{borderColor: totalOwedToMe > 0 ? "rgba(56,189,248,.3)" : "#1E293B"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:30,height:30,borderRadius:9,background:"rgba(56,189,248,.15)",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Users size={15} color="#38BDF8"/>
                    </div>
                    <div>
                      <p style={{fontSize:13,fontWeight:700}}>Me deben / Gastos compartidos</p>
                      <p style={{fontSize:11,color:"#64748B",marginTop:1}}>Reintegros pendientes de amigos o familia</p>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{fontSize:18,fontWeight:800,color:"#38BDF8"}}>{fARS(totalOwedToMe)}</p>
                    <p style={{fontSize:10,color:"#64748B"}}>por cobrar</p>
                  </div>
                </div>

                {pendingSplits.length === 0 ? (
                  <div style={{textAlign:"center",padding:"10px 0",color:"#475569",fontSize:12,lineHeight:1.6}}>
                    No tenés cobros pendientes. Al cargar una salida grupal, activá{" "}
                    <span style={{color:"#38BDF8",fontWeight:600}}>"Dividir cuenta / Me deben"</span>.
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {pendingSplits.map(item => (
                      <div key={item.tx.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                          gap:10,padding:"10px 12px",borderRadius:11,background:"#1E293B",
                          border:"1px solid rgba(56,189,248,.2)"}}>
                        <div style={{minWidth:0,flex:1}}>
                          <p style={{fontSize:12,fontWeight:700,color:"#F1F5F9",overflow:"hidden",
                              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {item.cleanDesc}
                          </p>
                          <p style={{fontSize:11,color:"#94A3B8",marginTop:2}}>
                            Deudor: <b style={{color:"#38BDF8"}}>{item.debtors}</b> · {fDate(item.tx.date)}
                          </p>
                          <p style={{fontSize:10,color:"#64748B",marginTop:1}}>
                            Pagaste {fARS(item.tx.amount)} (Tu parte: {fARS(item.myShare)})
                          </p>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <p style={{fontSize:13,fontWeight:800,color:"#38BDF8",marginBottom:5}}>
                            +{fARS(item.owed)}
                          </p>
                          <button
                            onClick={() => setSettleModalTx(item)}
                            style={{padding:"5px 10px",borderRadius:8,border:"none",cursor:"pointer",
                              background:"linear-gradient(135deg,#0284C7,#38BDF8)",color:"#fff",
                              fontSize:11,fontWeight:700,fontFamily:"inherit"}}>
                            Saldar cobro
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="col">
              {/* MEJORA 1: Tasa de Ahorro + Capital Invertido */}
              <div className="card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <p style={{fontSize:13,fontWeight:700}}>Tasa de Ahorro & Inversión</p>
                    <p style={{fontSize:11,color:"#64748B",marginTop:3}}>
                      Margen real (Ingresos − Consumo propio)
                    </p>
                  </div>
                  <div style={{borderRadius:12,padding:"7px 14px",textAlign:"center",
                      background:savingsRate>=30?"rgba(52,211,153,.1)":savingsRate>=20?"rgba(251,191,36,.1)":"rgba(244,114,182,.1)"}}>
                    <div style={{fontSize:28,fontWeight:800,lineHeight:1,
                      color:savingsRate>=30?"#34D399":savingsRate>=20?"#FBBF24":"#F472B6"}}>
                      {savingsRate}%
                    </div>
                    <div style={{fontSize:9,fontWeight:700,color:"#64748B",marginTop:3,textTransform:"uppercase",letterSpacing:".4px"}}>
                      {savingsRate>=30?"Excelente":savingsRate>=20?"En meta":"Mejorable"}
                    </div>
                  </div>
                </div>
                <div className="pb"><div className="pf" style={{
                  width:`${Math.min(100,savingsRate)}%`,
                  background:savingsRate>=30?"#34D399":savingsRate>=20?"#FBBF24":"#F472B6"
                }}/></div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:10,
                    borderTop:"1px solid #1E293B",fontSize:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <PiggyBank size={14} color="#A78BFA"/>
                    <span style={{color:"#94A3B8"}}>Capital destinado a Inversión:</span>
                  </div>
                  <span style={{fontWeight:800,color:"#A78BFA"}}>
                    {fARS(invested)} ({investmentRate}%)
                  </span>
                </div>
              </div>

              {/* MEJORA 3: Compromisos del mes (con auto-detección de Calistenia, Cuotas, HBO, Nutricionista) */}
              <div className="card">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div>
                    <p style={{fontSize:13,fontWeight:700}}>Compromisos Fijos del Mes</p>
                    <p style={{fontSize:11,color:"#64748B",marginTop:3}}>
                      Detecta automáticamente Calistenia, Cuotas, HBO, Nutricionista, etc.
                    </p>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <p style={{fontSize:18,fontWeight:800,color:"#FBBF24"}}>{fARS(monthlyCommitted)}</p>
                    <p style={{fontSize:10,color:"#64748B",marginTop:1}}>comprometido</p>
                  </div>
                </div>
                {uniqueRecurring.length===0 ? (
                  <div style={{textAlign:"center",padding:"14px 0",color:"#475569",fontSize:12,lineHeight:1.6}}>
                    Sin gastos fijos. Se marcan solos al cargar{" "}
                    <span style={{color:"#FBBF24"}}>Calistenia, Cuotas, HBO…</span>
                  </div>
                ) : (
                  <>
                    <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:12}}>
                      {uniqueRecurring.slice(0,6).map(tx=>{
                        const m=CAT_META[tx.category]||CAT_META["Otros"], I=m.Icon;
                        const soon = isDueSoon(tx.dueDay);
                        return (
                          <div key={tx.id} style={{display:"flex",alignItems:"center",gap:10,
                              background: soon?"rgba(251,191,36,.06)":"#1E293B",
                              border: soon?"1px solid rgba(251,191,36,.25)":"1px solid transparent",
                              borderRadius:11,padding:"10px 12px"}}>
                            <div style={{width:30,height:30,borderRadius:8,background:m.color+"20",
                                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              <I size={13} color={m.color}/>
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                <p style={{fontSize:12,fontWeight:600,color:"#CBD5E1",overflow:"hidden",
                                    textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.description}</p>
                                {soon && <AlertTriangle size={11} color="#FBBF24"/>}
                              </div>
                              <p style={{fontSize:10,color:"#475569",marginTop:1}}>
                                {tx.category}
                                {tx.dueDay ? <span style={{color:soon?"#FBBF24":"#64748B"}}> · vence día {tx.dueDay}</span> : ""}
                              </p>
                            </div>
                            <div style={{flexShrink:0,textAlign:"right"}}>
                              <p style={{fontSize:13,fontWeight:700,color:"#FBBF24"}}>-{fARS(getEffectiveExpense(tx))}</p>
                              <p style={{fontSize:9,fontWeight:600,color:"#FBBF24",background:"rgba(251,191,36,.12)",
                                  borderRadius:5,padding:"1px 5px",marginTop:2}}>📅 fijo</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {income>0 && (
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748B",marginBottom:5}}>
                          <span>Impacto fijo sobre tus ingresos</span>
                          <span style={{color:"#FBBF24",fontWeight:700}}>
                            {Math.round((monthlyCommitted/income)*100)}%
                          </span>
                        </div>
                        <div className="pb">
                          <div className="pf" style={{width:`${Math.min(100,Math.round((monthlyCommitted/income)*100))}%`,
                            background:"linear-gradient(to right,#FBBF24,#F59E0B)"}}/>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Recent */}
              <div className="card" style={{padding:0,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px"}}>
                  <p style={{fontSize:13,fontWeight:700}}>Últimos movimientos</p>
                  <button onClick={()=>setTab("records")}
                    style={{fontSize:12,color:"#818CF8",background:"none",border:"none",cursor:"pointer",
                        display:"flex",alignItems:"center",gap:3,fontFamily:"inherit"}}>
                    Ver todos <ChevronRight size={13}/>
                  </button>
                </div>
                {txs.length===0 ? (
                  <div style={{textAlign:"center",padding:"24px 20px",color:"#475569",fontSize:13}}>
                    Todavía no hay movimientos. ¡Agregá el primero!
                  </div>
                ) : (
                  <div>
                    {txs.slice(0,5).map(tx => {
                      const isTrans = isInternalTransfer(tx);
                      const isInv   = isInvestmentTx(tx);
                      const split   = parseSplitInfo(tx);
                      return (
                        <div key={tx.id} className="tx-row">
                          <TxIcon tx={tx}/>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {split ? split.cleanDesc : tx.description}
                            </p>
                            <p style={{fontSize:11,color:"#64748B",marginTop:2}}>
                              {isTrans ? "Transferencia interna" : isInv ? "Inversión / Ahorro" : tx.category} · {fDate(tx.date)}
                            </p>
                          </div>
                          <span style={{fontSize:13,fontWeight:700,flexShrink:0,
                              color: isTrans ? "#38BDF8" : isInv ? "#A78BFA" : tx.type==="income"?"#34D399":"#F472B6"}}>
                            {tx.type==="income"?"+":"-"}{fARS(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ CHARTS ═══ */}
        {tab==="charts" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="ch-wrap">
              <div className="ch-top">
                <div className="card">
                  <p style={{fontSize:13,fontWeight:700,marginBottom:2}}>Consumo Real por Categoría</p>
                  <p style={{fontSize:11,color:"#64748B",marginBottom:18}}>
                    Limpio de pases entre billeteras, inversiones y parte de amigos
                  </p>
                  {byCat.length===0 ? (
                    <div style={{textAlign:"center",padding:"48px 0",color:"#475569",fontSize:13}}>Sin gastos registrados</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(180, byCat.length * 46)}>
                      <BarChart layout="vertical" data={byCat}
                        margin={{top:4, right:64, left:4, bottom:4}}>
                        <XAxis type="number" hide/>
                        <YAxis type="category" dataKey="name"
                          tick={{fill:"#94A3B8", fontSize:11}} axisLine={false} tickLine={false} width={95}/>
                        <Tooltip content={<CustomTooltip/>} cursor={{fill:"rgba(99,102,241,.06)"}}/>
                        <Bar dataKey="value" name="Gasto Real" radius={[0,7,7,0]} maxBarSize={28}>
                          {byCat.map((e,i)=><Cell key={i} fill={e.color}/>)}
                          <LabelList dataKey="value" position="right"
                            formatter={v=>fARSShort(v)}
                            style={{fill:"#CBD5E1",fontSize:10,fontWeight:700}}/>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {byCat.length>0 && expenses>0 && (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px 12px",marginTop:12}}>
                      {byCat.map(e=>(
                        <div key={e.name} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:e.color,flexShrink:0}}/>
                          <span style={{color:"#64748B",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {e.name}
                          </span>
                          <span style={{fontWeight:700,color:"#CBD5E1",flexShrink:0}}>
                            {Math.round((e.value/expenses)*100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:14,flex:"0 0 auto",width:"100%",maxWidth:400}}>
                <div className="card">
                  <p style={{fontSize:13,fontWeight:700,marginBottom:18}}>Consumo por Billetera</p>
                  {walletTotals.length===0 ? (
                    <div style={{textAlign:"center",padding:"48px 0",color:"#475569",fontSize:13}}>
                      Sin movimientos registrados
                    </div>
                  ) : (
                    <>
                      <DonutWithTooltip data={walletTotals} total={walletTotal}/>
                      <SourceLegend items={walletTotals} total={walletTotal}/>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <p style={{fontSize:13,fontWeight:700,marginBottom:2}}>Evolución Mensual Real</p>
              <p style={{fontSize:11,color:"#64748B",marginBottom:18}}>
                Ingresos vs. Gastos reales de los últimos 6 meses · sin distorsión por transferencias internas
              </p>
              {monthlyData.every(m=>m.Ingresos===0&&m.Gastos===0) ? (
                <div style={{textAlign:"center",padding:"48px 0",color:"#475569",fontSize:13}}>
                  Agregá movimientos para ver la evolución mensual
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData}
                    margin={{top:28, right:10, left:10, bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:"#64748B",fontSize:11}}
                      axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:"#64748B",fontSize:10}} axisLine={false} tickLine={false}
                      tickFormatter={v=>fARSShort(v)} width={52}/>
                    <Tooltip content={<CustomTooltip/>} cursor={{fill:"rgba(99,102,241,.06)"}}/>
                    <Legend wrapperStyle={{fontSize:12,color:"#94A3B8",paddingTop:8}}/>
                    <Bar dataKey="Ingresos" fill="#34D399" radius={[5,5,0,0]} maxBarSize={32}>
                      <LabelList dataKey="net" position="top"
                        content={({x,y,width,value}) => {
                          if (!value && value!==0) return null;
                          const color = value>=0?"#34D399":"#F472B6";
                          const txt   = `${value>=0?"+":""}${fARSShort(value)}`;
                          return (
                            <text x={Number(x)+Number(width)/2+20} y={Number(y)-8}
                              textAnchor="middle" fill={color} fontSize={9} fontWeight="700">
                              {txt}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                    <Bar dataKey="Gastos" fill="#F472B6" radius={[5,5,0,0]} maxBarSize={32}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ═══ RECORDS ═══ */}
        {tab==="records" && (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div className="card" style={{padding:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,background:"#1E293B",
                    borderRadius:10,padding:"9px 12px",flex:1}}>
                  <Search size={14} color="#475569"/>
                  <input value={query} onChange={e=>setQuery(e.target.value)}
                    placeholder="Buscar por descripción o categoría…"
                    style={{background:"none",border:"none",outline:"none",flex:1,fontSize:13,
                      color:"#F1F5F9",fontFamily:"inherit"}}/>
                  {query&&<button onClick={()=>setQuery("")}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#475569",padding:0}}>
                    <X size={13}/>
                  </button>}
                </div>
                {/* Botón exportar CSV mejorado (incluye Tipo real, Fijo auto-detectado y Parte Propia) */}
                <button onClick={()=>{
                  const header = ["Fecha","Tipo","Descripción","Categoría","Monto Caja","Consumo Real","Billetera","Fijo"];
                  const rows = filtered.map(tx => {
                    const isTrans = isInternalTransfer(tx);
                    const isInv   = isInvestmentTx(tx);
                    const tipoStr = isTrans ? "Transferencia" : isInv ? "Inversión" : tx.type==="income" ? "Ingreso" : "Gasto";
                    const signedAmt = tx.type==="income" ? tx.amount : -tx.amount;
                    const realCons  = (tx.type==="expense" && !isTrans && !isInv) ? -getEffectiveExpense(tx) : 0;
                    return [
                      tx.date,
                      tipoStr,
                      `"${(tx.description||"").replace(/"/g,'""')}"`,
                      tx.category||"",
                      signedAmt,
                      realCons,
                      (tx.wallet==="manual"||tx.source==="cash")?"Efectivo":(ARG_BANKS.find(b=>b.id===tx.wallet)?.name||tx.wallet||"Efectivo"),
                      isAutoFixedTx(tx) ? "Sí" : "No",
                    ];
                  });
                  const csv = [header,...rows].map(r=>r.join(",")).join("\n");
                  const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href=url; a.download=`flowcash-registros-${new Date().toISOString().split("T")[0]}.csv`;
                  a.click(); URL.revokeObjectURL(url);
                }}
                  title="Exportar a CSV"
                  style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:10,
                    background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.25)",
                    color:"#818CF8",cursor:"pointer",fontSize:12,fontWeight:600,
                    fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,transition:"all .2s"}}>
                  <Download size={14}/>
                  Exportar CSV
                </button>
              </div>
              {/* Type filters ampliados */}
              <div style={{display:"flex",gap:5,marginBottom:8,overflowX:"auto",paddingBottom:2}}>
                {[
                  ["all","Todos","#818CF8"],
                  ["income","Ingresos","#34D399"],
                  ["expense","Gastos","#F472B6"],
                  ["investment","📈 Inversión","#A78BFA"],
                  ["transfer","⇄ Pases","#38BDF8"],
                  ["recurring","📅 Fijos","#FBBF24"],
                  ["split","👥 Compartidos","#38BDF8"],
                ].map(([val,label,color])=>(
                  <button key={val} onClick={()=>setFilterType(val)}
                    style={{flex:1,padding:"7px 8px",borderRadius:9,fontSize:11,fontWeight:700,
                      border:"none",cursor:"pointer",fontFamily:"inherit",transition:"all .2s",whiteSpace:"nowrap",
                      background:filterType===val?color+"22":"none",
                      color:filterType===val?color:"#475569"}}>
                    {label}
                  </button>
                ))}
              </div>
              {/* Category chips */}
              {availableCats.length>2 && (
                <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4}}>
                  {availableCats.map(cat=>{
                    const m = cat!=="all"?(CAT_META[cat]||CAT_META["Otros"]):null;
                    const color = m?m.color:"#818CF8";
                    return (
                      <button key={cat} onClick={()=>setFilterCat(cat)}
                        style={{flexShrink:0,padding:"5px 10px",borderRadius:20,fontSize:11,fontWeight:600,
                          border:`1px solid ${filterCat===cat?color+"60":color+"20"}`,cursor:"pointer",
                          fontFamily:"inherit",transition:"all .2s",whiteSpace:"nowrap",
                          background:filterCat===cat?color+"20":"none",
                          color:filterCat===cat?color:"#64748B"}}>
                        {cat==="all"?"Todas":cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <p style={{fontSize:12,color:"#64748B",paddingLeft:2}}>
              <span style={{fontWeight:600,color:"#94A3B8"}}>{filtered.length}</span> movimientos
              {filterCat!=="all" && <> · categoría "<span style={{color:"#818CF8"}}>{filterCat}</span>"</>}
            </p>

            {filtered.length===0 ? (
              <div className="card" style={{textAlign:"center",padding:"48px 0",color:"#475569"}}>
                <List size={32} style={{margin:"0 auto 10px",opacity:.2}}/>
                <p style={{fontSize:13}}>{txs.length===0?"Todavía no hay movimientos":"Sin resultados"}</p>
              </div>
            ) : (() => {
              const groups = {};
              filtered.forEach(tx=>{ if(!groups[tx.date]) groups[tx.date]=[]; groups[tx.date].push(tx); });
              const sortedDates = Object.keys(groups).sort((a,b)=>b.localeCompare(a));
              return sortedDates.map(date=>{
                const dayTxs = groups[date];
                // Balance diario sin distorsión por pases internos
                const dayNet = dayTxs.reduce((s,t) => {
                  if (isInternalTransfer(t)) return s;
                  return t.type==="income" ? s + t.amount : s - t.amount;
                }, 0);
                return (
                  <div key={date}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,marginTop:4}}>
                      <div style={{height:1,flex:1,background:"linear-gradient(to right,#1E293B,transparent)"}}/>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#64748B"}}>{fDateLong(date)}</span>
                        <span style={{fontSize:11,fontWeight:800,
                            color:dayNet>=0?"#34D399":"#F472B6",
                            background:dayNet>=0?"rgba(52,211,153,.1)":"rgba(244,114,182,.1)",
                            borderRadius:8,padding:"2px 8px",
                            border:`1px solid ${dayNet>=0?"rgba(52,211,153,.25)":"rgba(244,114,182,.25)"}`}}>
                          {dayNet>=0?"+":""}{fARS(dayNet)}
                        </span>
                      </div>
                      <div style={{height:1,flex:1,background:"linear-gradient(to left,#1E293B,transparent)"}}/>
                    </div>

                    <div className="card" style={{padding:0,overflow:"hidden"}}>
                      {dayTxs.map(tx=>{
                        const src     = sourceLabel(tx);
                        const isTrans = isInternalTransfer(tx);
                        const isInv   = isInvestmentTx(tx);
                        const isFixed = isAutoFixedTx(tx);
                        const split   = parseSplitInfo(tx);
                        return (
                          <div key={tx.id} className="tx-wrap" style={{borderBottom:"1px solid #1E293B"}}>
                            <SwipeableRow id={tx.id} onDeleteRequest={confirmDelete}>
                              <div className="tx-row">
                                <TxIcon tx={tx}/>
                                <div style={{flex:1,minWidth:0}}>
                                  <p style={{fontSize:13,fontWeight:600,overflow:"hidden",
                                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                    {split ? split.cleanDesc : tx.description}
                                  </p>
                                  <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3,flexWrap:"wrap"}}>
                                    <span style={{fontSize:11,color:"#64748B"}}>{tx.category}</span>
                                    <span style={{fontSize:11,color:"#334155"}}>·</span>
                                    <span style={{fontSize:10,fontWeight:600,color:src.color,
                                        background:src.color+"15",borderRadius:6,padding:"1px 6px",
                                        border:`1px solid ${src.color}28`}}>
                                      {src.icon} {src.text}
                                    </span>
                                    {isTrans && (
                                      <span style={{fontSize:10,fontWeight:700,color:"#38BDF8",
                                          background:"rgba(56,189,248,.1)",borderRadius:6,padding:"1px 6px",
                                          border:"1px solid rgba(56,189,248,.25)"}}>
                                        ⇄ pase entre cuentas
                                      </span>
                                    )}
                                    {isInv && (
                                      <span style={{fontSize:10,fontWeight:700,color:"#A78BFA",
                                          background:"rgba(167,139,250,.12)",borderRadius:6,padding:"1px 6px",
                                          border:"1px solid rgba(167,139,250,.25)"}}>
                                        📈 inversión
                                      </span>
                                    )}
                                    {isFixed && (
                                      <span style={{fontSize:10,fontWeight:600,color:"#FBBF24",
                                          background:"rgba(251,191,36,.1)",borderRadius:6,padding:"1px 6px",
                                          border:"1px solid rgba(251,191,36,.2)"}}>
                                        📅 fijo{tx.dueDay?` · día ${tx.dueDay}`:""}
                                      </span>
                                    )}
                                    {split && (
                                      <span style={{fontSize:10,fontWeight:700,color:"#38BDF8",
                                          background:"rgba(56,189,248,.12)",borderRadius:6,padding:"1px 6px",
                                          border:"1px solid rgba(56,189,248,.25)"}}>
                                        👥 Tu parte: {fARS(split.myShare)} · Te deben: {fARS(split.owed)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                                  <span style={{fontSize:13,fontWeight:700,
                                      color: isTrans ? "#38BDF8" : isInv ? "#A78BFA" : tx.type==="income"?"#34D399":"#F472B6"}}>
                                    {tx.type==="income"?"+":"-"}{fARS(tx.amount)}
                                  </span>
                                  <button className="tx-del-btn" onClick={()=>confirmDelete(tx.id)}
                                    style={{background:"none",border:"none",cursor:"pointer",
                                        color:"#334155",padding:"4px",borderRadius:6,display:"flex"}}>
                                    <Trash2 size={13}/>
                                  </button>
                                </div>
                              </div>
                            </SwipeableRow>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* ═══ GUIDE ═══ */}
        {tab==="guide" && (
          <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:720}}>
            <div className="card" style={{borderColor:"rgba(99,102,241,.25)",background:"rgba(99,102,241,.06)"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:32,height:32,borderRadius:9,background:"rgba(99,102,241,.2)",
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                  <Info size={15} color="#818CF8"/>
                </div>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:"#A5B4FC",marginBottom:5}}>Integración Real con APIs</p>
                  <p style={{fontSize:12,color:"#94A3B8",lineHeight:1.7}}>
                    Guía para conectar FlowCash con tus billeteras reales en producción.
                  </p>
                </div>
              </div>
            </div>
            {[{title:"Mercado Pago API",sub:"developers.mercadopago.com",color:"#00BCFF",
               steps:[
                 {n:"1",t:"Crear cuenta de desarrollador",d:'Ingresá a developers.mercadopago.com. Iniciá sesión y creá una cuenta de tipo "Desarrollador".'},
                 {n:"2",t:"Crear una Aplicación",d:"En el panel Developer, creá una nueva app. Habilitá: Pagos, Cobros y Transferencias."},
                 {n:"3",t:"Obtener el Access Token",d:'En "Credenciales de producción" copiá tu Access Token (APP_USR-...). Guardalo en .env.'},
                 {n:"4",t:"Endpoint de movimientos",d:"GET /v1/payments/search con header Authorization: Bearer {TOKEN}."},
                 {n:"5",t:"Webhook tiempo real",d:"Notificaciones → Webhook URL apuntando a tu backend para recibir cada pago."},
               ]},
              {title:"Lemon Cash SDK",sub:"Mini-Apps · lemon.me",color:"#FFD700",
               steps:[
                 {n:"1",t:"Mini-App SDK",d:"Lemon lanzó su SDK en nov 2025. Permite autenticación dentro de la app de Lemon."},
                 {n:"2",t:"Limitación actual",d:"El SDK no expone historial de movimientos hacia afuera. La opción práctica hoy es exportar el CSV desde la app."},
               ]},
            ].map(({title,sub,color,steps})=>(
              <div key={title} className="card">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <div style={{width:34,height:34,borderRadius:10,background:color+"18",
                      border:`1px solid ${color}30`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Key size={15} color={color}/>
                  </div>
                  <div>
                    <p style={{fontSize:13,fontWeight:700}}>{title}</p>
                    <p style={{fontSize:11,color:"#64748B"}}>{sub}</p>
                  </div>
                </div>
                {steps.map(({n,t,d})=>(
                  <div key={n} style={{display:"flex",gap:12,marginBottom:13}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:color+"18",
                        color,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",
                        justifyContent:"center",flexShrink:0,marginTop:1}}>{n}</div>
                    <div>
                      <p style={{fontSize:13,fontWeight:600,color:"#E2E8F0",marginBottom:3}}>{t}</p>
                      <p style={{fontSize:12,color:"#94A3B8",lineHeight:1.65}}>{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button onClick={() => { setForm(getInitialForm("expense")); setShowModal(true); }} className="grad-fab"
        style={{position:"fixed",bottom:24,right:20,width:56,height:56,borderRadius:16,
          border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:40,transition:"transform .15s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.09)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
        <Plus size={24} color="#fff" strokeWidth={2.5}/>
      </button>

      {/* TOAST */}
      {toast && (
        <div className="toast" style={{
          background:toast.ok?"rgba(52,211,153,.13)":"rgba(244,114,182,.13)",
          border:`1px solid ${toast.ok?"rgba(52,211,153,.3)":"rgba(244,114,182,.3)"}`,
          color:toast.ok?"#34D399":"#F472B6"}}>
          {toast.msg}
        </div>
      )}

      {/* MODAL PARA SALDAR DEUDA ("ME DEBEN") */}
      {settleModalTx && (
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setSettleModalTx(null);}}>
          <div className="glass-hi fade-in" style={{width:"100%",maxWidth:380,borderRadius:20,padding:24}}>
            <h3 style={{fontSize:16,fontWeight:800,marginBottom:6}}>Saldar cobro pendiente</h3>
            <p style={{fontSize:12,color:"#94A3B8",marginBottom:16,lineHeight:1.5}}>
              ¿En qué billetera te transfirió o pagó <b style={{color:"#38BDF8"}}>{settleModalTx.debtors}</b> los{" "}
              <b style={{color:"#34D399"}}>{fARS(settleModalTx.owed)}</b> de <i>"{settleModalTx.cleanDesc}"</i>?
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {connectedIds.map(id => {
                const bank = getBank(id); if(!bank) return null;
                return (
                  <button key={id}
                    onClick={() => handleSettleSplit(settleModalTx, id)}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"11px 14px",borderRadius:12,background:"#1E293B",
                      border:"1px solid #334155",color:"#F1F5F9",cursor:"pointer",fontFamily:"inherit"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <BankBadge id={id} size={28}/>
                      <span style={{fontSize:13,fontWeight:700}}>{bank.name}</span>
                    </div>
                    <span style={{fontSize:12,color:"#34D399",fontWeight:700}}>+{fARS(settleModalTx.owed)} →</span>
                  </button>
                );
              })}
            </div>
            <button onClick={()=>setSettleModalTx(null)}
              style={{width:"100%",padding:"11px",borderRadius:12,fontSize:13,fontWeight:600,
                background:"none",border:"1px solid #334155",color:"#94A3B8",cursor:"pointer",fontFamily:"inherit"}}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirmId && (
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setDeleteConfirmId(null);}}>
          <div className="glass-hi fade-in" style={{width:"100%",maxWidth:340,borderRadius:20,padding:24}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{width:44,height:44,borderRadius:12,background:"rgba(244,114,182,.1)",
                  border:"1px solid rgba(244,114,182,.2)",display:"flex",alignItems:"center",
                  justifyContent:"center",margin:"0 auto 12px"}}>
                <Trash2 size={20} color="#F472B6"/>
              </div>
              <h3 style={{fontSize:16,fontWeight:700,marginBottom:6}}>¿Eliminar movimiento?</h3>
              <p style={{fontSize:13,color:"#64748B",lineHeight:1.5}}>
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={()=>setDeleteConfirmId(null)}
                style={{padding:"12px",borderRadius:12,fontSize:13,fontWeight:600,
                  background:"#1E293B",border:"1px solid #334155",color:"#94A3B8",
                  cursor:"pointer",fontFamily:"inherit"}}>
                Cancelar
              </button>
              <button onClick={doDelete}
                style={{padding:"12px",borderRadius:12,fontSize:13,fontWeight:600,
                  background:"rgba(244,114,182,.15)",border:"1px solid rgba(244,114,182,.3)",
                  color:"#F472B6",cursor:"pointer",fontFamily:"inherit"}}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRM */}
      {showLogout && (
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowLogout(false);}}>
          <div className="glass-hi fade-in" style={{width:"100%",maxWidth:360,borderRadius:20,padding:24}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{width:44,height:44,borderRadius:12,background:"rgba(244,114,182,.1)",
                  border:"1px solid rgba(244,114,182,.2)",display:"flex",alignItems:"center",
                  justifyContent:"center",margin:"0 auto 12px"}}>
                <LogOut size={20} color="#F472B6"/>
              </div>
              <h3 style={{fontSize:16,fontWeight:700,marginBottom:6}}>Cerrar sesión</h3>
              <p style={{fontSize:13,color:"#64748B",lineHeight:1.5}}>
                Tus datos quedan guardados en este dispositivo.
              </p>
              <p style={{fontSize:11,color:"#475569",marginTop:6}}>
                Sesión: <span style={{color:"#818CF8"}}>{email}</span>
              </p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={()=>setShowLogout(false)}
                style={{padding:"12px",borderRadius:12,fontSize:13,fontWeight:600,
                  background:"#1E293B",border:"1px solid #334155",color:"#94A3B8",
                  cursor:"pointer",fontFamily:"inherit"}}>
                Cancelar
              </button>
              <button onClick={()=>{ setShowLogout(false); onLogout(); }}
                style={{padding:"12px",borderRadius:12,fontSize:13,fontWeight:600,
                  background:"rgba(244,114,182,.15)",border:"1px solid rgba(244,114,182,.3)",
                  color:"#F472B6",cursor:"pointer",fontFamily:"inherit"}}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TX MODAL (CON LAS 4 MEJORAS INTEGRADAS) */}
      {showModal && (
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div className="glass-hi fade-in"
            style={{width:"100%",maxWidth:540,borderRadius:22,padding:24,maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <h2 style={{fontSize:18,fontWeight:800,letterSpacing:"-.3px"}}>Nuevo Movimiento</h2>
              <button onClick={()=>setShowModal(false)}
                style={{width:32,height:32,borderRadius:9,background:"#1E293B",border:"none",cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                <X size={15} color="#94A3B8"/>
              </button>
            </div>

            {/* MEJORA 1: 4 Tipos de Movimiento (Gasto / Ingreso / Inversión / Transferir) */}
            <div className="pill" style={{marginBottom:18}}>
              {[
                ["expense",    "Gasto",      "#DC2626", "#BE123C"],
                ["income",     "Ingreso",    "#059669", "#047857"],
                ["investment", "Inversión",  "#7C3AED", "#6D28D9"],
                ["transfer",   "Transferir", "#0284C7", "#0369A1"],
              ].map(([val,label,c1,c2])=>(
                <button key={val} className="pill-o"
                  onClick={()=>setForm(f=>({
                    ...getInitialForm(val),
                    amount: f.amount,
                    date: f.date,
                  }))}
                  style={form.type===val?{background:`linear-gradient(135deg,${c1},${c2})`,color:"#fff"}:{}}>
                  {label}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>
                {form.type==="transfer" ? "MONTO A TRANSFERIR (ARS)" : form.type==="investment" ? "MONTO A INVERTIR (ARS)" : "MONTO TOTAL (ARS)"}
              </label>
              <div style={{display:"flex",alignItems:"center",gap:8,background:"#1E293B",borderRadius:12,
                  padding:"10px 12px 10px 16px",border:`1px solid ${form.amount?"#6366F1":"#334155"}`,
                  transition:"border-color .2s"}}>
                <span style={{fontSize:20,color:"#475569",fontWeight:600}}>$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={e=>{
                    const v = e.target.value.replace(/[^0-9.]/g,'');
                    setForm(f=>({...f,amount:v}));
                  }}
                  placeholder="0"
                  style={{background:"none",border:"none",outline:"none",flex:1,
                      fontSize:28,fontWeight:800,color:"#F1F5F9",fontFamily:"inherit",
                      width:"100%",minWidth:0}}/>
                <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                  {[
                    { dir: 1,  step: 1000, path: "M6 9 L10 5 L14 9" },
                    { dir: -1, step: 1000, path: "M6 7 L10 11 L14 7" },
                  ].map(({dir, step, path}) => (
                    <button
                      key={dir}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault();
                        setForm(f => {
                          const cur = parseFloat(f.amount) || 0;
                          const next = Math.max(0, cur + dir * step);
                          return {...f, amount: String(next)};
                        });
                      }}
                      style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                        border: "none", cursor: "pointer", padding: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                      <svg width="14" height="14" viewBox="0 0 20 16" fill="none"
                           stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={path}/>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── UI EXCLUSIVA PARA TRANSFERENCIA ENTRE BILLETERAS (Mejora 1) ── */}
            {form.type === "transfer" ? (
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  <div>
                    <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>
                      DESDE (ORIGEN)
                    </label>
                    <select className="input-fc" value={form.fromWallet}
                      onChange={e=>setForm(f=>({...f,fromWallet:e.target.value}))}>
                      {connectedIds.map(id => {
                        const b = getBank(id);
                        return <option key={id} value={id}>{b?.name || id} ({fARS(walletBalance(id))})</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>
                      HACIA (DESTINO)
                    </label>
                    <select className="input-fc" value={form.toWallet}
                      onChange={e=>setForm(f=>({...f,toWallet:e.target.value}))}>
                      {connectedIds.map(id => {
                        const b = getBank(id);
                        return <option key={id} value={id}>{b?.name || id} ({fARS(walletBalance(id))})</option>;
                      })}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>
                    NOTA OPCIONAL
                  </label>
                  <input className="input-fc" value={form.description}
                    onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                    placeholder="Ej: Fondeo semanal Lemon Cash"/>
                </div>
                <div style={{marginBottom:18}}>
                  <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>FECHA</label>
                  <input type="date" className="input-fc" value={form.date}
                    onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
                </div>
              </>
            ) : (
              <>
                {/* Description (con auto-detección de fijo mensual al escribir) */}
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>
                    DESCRIPCIÓN
                  </label>
                  <input className="input-fc" value={form.description}
                    onChange={e => handleDescriptionChange(e.target.value)}
                    placeholder={
                      form.type==="investment"
                        ? "Ej: Compra CEDEARs Bull Market / USDT"
                        : "¿En qué gastaste o de dónde viene?"
                    }/>
                </div>

                {/* MEJORA 2: Categoría SIN valor por defecto y con validación obligatoria */}
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <label style={{fontSize:11,color:"#64748B",fontWeight:600}}>CATEGORÍA *</label>
                    {!form.category && (
                      <span style={{fontSize:10,color:"#FBBF24",fontWeight:600}}>
                        Obligatorio elegir una
                      </span>
                    )}
                  </div>
                  <select
                    className="input-fc"
                    value={form.category}
                    onChange={e => {
                      const cat = e.target.value;
                      // Si elige Servicios o Salud y contiene palabra fija, sugerir fijo
                      setForm(f => ({ ...f, category: cat }));
                    }}
                    style={{
                      borderColor: !form.category ? "rgba(251,191,36,.45)" : "#334155",
                      color: !form.category ? "#94A3B8" : "#F1F5F9",
                    }}>
                    <option value="" disabled>Seleccionar categoría…</option>
                    {(form.type==="expense"
                      ? EXPENSE_CATS
                      : form.type==="investment"
                      ? INVESTMENT_CATS
                      : INCOME_CATS
                    ).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Date + Source */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:form.source==="digital"?10:16}}>
                  <div>
                    <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>FECHA</label>
                    <input type="date" className="input-fc" value={form.date}
                      onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>FUENTE</label>
                    <div className="pill" style={{padding:3}}>
                      {[["cash","💵 Efec.","#34D399"],["digital","💳 Dig.","#60A5FA"]].map(([val,ico,col])=>(
                        <button key={val} className="pill-o"
                          onClick={()=>{
                            const firstDigital = connectedIds.find(id=>id!=="efectivo")||"lemoncash";
                            setForm(f=>({...f,source:val,wallet:val==="cash"?"manual":firstDigital}));
                          }}
                          style={{...(form.source===val?{background:col+"22",color:col}:{}),fontSize:12}}>
                          {ico}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Digital wallet picker */}
                {form.source==="digital" && (
                  <div style={{marginBottom:14,animation:"fu .2s ease-out both"}}>
                    <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:8}}>
                      BILLETERA
                    </label>
                    {connectedIds.filter(id=>id!=="efectivo").length === 0 ? (
                      <div style={{padding:"12px 16px",borderRadius:12,background:"#1E293B",
                          border:"1px solid #334155",textAlign:"center"}}>
                        <p style={{fontSize:12,color:"#64748B",marginBottom:6}}>Sin billeteras digitales conectadas</p>
                        <button onClick={()=>{setShowModal(false);setShowBanks(true);}}
                          style={{fontSize:12,fontWeight:600,color:"#818CF8",background:"none",
                            border:"none",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>
                          Conectar billeteras
                        </button>
                      </div>
                    ) : (
                      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                        {connectedIds.filter(id=>id!=="efectivo").map(id=>{
                          const bank = getBank(id); if(!bank) return null;
                          const wBal  = walletBalance(id);
                          const req   = parseFloat(form.amount)||0;
                          const insuf = (form.type==="expense"||form.type==="investment")&&req>0&&wBal<req;
                          const sel   = form.wallet===id;
                          return (
                            <button key={id} onClick={()=>{ if(!insuf) setForm(f=>({...f,wallet:id})); }}
                              style={{display:"flex",alignItems:"center",gap:8,padding:"9px 13px",
                                borderRadius:12,border:`2px solid ${insuf?"#1E293B":sel?bank.color:"#334155"}`,
                                background:insuf?"#0F172A":sel?bank.color+"15":"#1E293B",
                                cursor:insuf?"not-allowed":"pointer",opacity:insuf?.4:1,
                                fontFamily:"inherit",transition:"all .2s"}}>
                              <BankBadge id={id} size={24}/>
                              <div style={{textAlign:"left"}}>
                                <p style={{fontSize:12,fontWeight:700,color:insuf?"#334155":sel?bank.color:"#94A3B8"}}>
                                  {bank.name}
                                </p>
                                <p style={{fontSize:10,color:insuf?"#334155":wBal>0?"#34D399":"#64748B",fontWeight:600}}>
                                  {wBal>=0?"+":""}{fARS(wBal)}
                                  {insuf&&<span style={{color:"#F472B6"}}> · sin saldo</span>}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* MEJORA 4: Modo "Dividir cuenta / Me deben" (solo en Gastos) */}
                {form.type === "expense" && (
                  <div style={{marginBottom:14,padding:12,borderRadius:13,
                      background: form.isSplit ? "rgba(56,189,248,.08)" : "#1E293B",
                      border: `1px solid ${form.isSplit ? "rgba(56,189,248,.35)" : "#334155"}`}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                        cursor:"pointer"}}
                        onClick={() => setForm(f => {
                          const nextSplit = !f.isSplit;
                          const half = f.amount ? String(Math.round(parseFloat(f.amount)/2)) : "";
                          return { ...f, isSplit: nextSplit, myShare: nextSplit ? half : "" };
                        })}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Users size={15} color={form.isSplit ? "#38BDF8" : "#64748B"}/>
                        <div>
                          <p style={{fontSize:12,fontWeight:700,color:form.isSplit?"#38BDF8":"#CBD5E1"}}>
                            Dividir cuenta / Me deben
                          </p>
                          <p style={{fontSize:10,color:"#64748B"}}>
                            Descontá el total de tu billetera pero registrá solo tu parte como gasto
                          </p>
                        </div>
                      </div>
                      <input type="checkbox" checked={form.isSplit} readOnly
                        style={{accentColor:"#38BDF8",width:16,height:16,cursor:"pointer"}}/>
                    </div>

                    {form.isSplit && (
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12,
                          paddingTop:12,borderTop:"1px solid rgba(56,189,248,.2)"}}>
                        <div>
                          <label style={{fontSize:10,color:"#38BDF8",fontWeight:700,display:"block",marginBottom:4}}>
                            TU PARTE REAL ($)
                          </label>
                          <input
                            type="number"
                            className="input-fc"
                            value={form.myShare}
                            onChange={e => setForm(f => ({ ...f, myShare: e.target.value }))}
                            placeholder="Ej: 29500"
                            style={{padding:"9px 12px",fontSize:13}}
                          />
                        </div>
                        <div>
                          <label style={{fontSize:10,color:"#38BDF8",fontWeight:700,display:"block",marginBottom:4}}>
                            ¿QUIÉN TE DEBE?
                          </label>
                          <input
                            type="text"
                            className="input-fc"
                            value={form.splitWith}
                            onChange={e => setForm(f => ({ ...f, splitWith: e.target.value }))}
                            placeholder="Ej: Facu, Luzzi"
                            style={{padding:"9px 12px",fontSize:13}}
                          />
                        </div>
                        {parseFloat(form.amount) > 0 && (
                          <div style={{gridColumn:"1 / -1",fontSize:11,color:"#94A3B8",
                              display:"flex",justifyContent:"space-between",padding:"4px 2px 0"}}>
                            <span>Tu consumo: <b style={{color:"#F1F5F9"}}>{fARS(parseFloat(form.myShare)||0)}</b></span>
                            <span>Queda por cobrar: <b style={{color:"#38BDF8"}}>
                              {fARS(Math.max(0, (parseFloat(form.amount)||0) - (parseFloat(form.myShare)||0)))}
                            </b></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* MEJORA 3: Recurring toggle con badge de auto-detectado */}
                {form.type==="expense" && (
                  <div style={{marginBottom: form.recurring ? 14 : 20}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <label style={{fontSize:11,color:"#64748B",fontWeight:600}}>
                        ¿QUÉ TIPO DE GASTO ES?
                      </label>
                      {form.autoRecurringDetected && form.recurring && (
                        <span style={{fontSize:10,color:"#FBBF24",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                          <Sparkles size={11}/> Auto-detectado como fijo
                        </span>
                      )}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[{val:false,label:"Puntual",sub:"Compra, café, salida…",icon:"🛒",color:"#818CF8"},
                        {val:true, label:"Fijo mensual",sub:"Calistenia, cuotas, HBO…",icon:"📅",color:"#FBBF24"}].map(
                        ({val,label,sub,icon,color})=>(
                          <button key={String(val)}
                            onClick={()=>setForm(f=>({...f,recurring:val,autoRecurringDetected:false,dueDay:val?f.dueDay:""}))}
                            style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:4,
                              padding:"11px 13px",borderRadius:13,border:"2px solid",cursor:"pointer",
                              fontFamily:"inherit",transition:"all .2s",textAlign:"left",
                              borderColor:form.recurring===val?color:"#1E293B",
                              background:form.recurring===val?color+"12":"#1E293B"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:14}}>{icon}</span>
                              <span style={{fontSize:12,fontWeight:700,color:form.recurring===val?color:"#94A3B8"}}>{label}</span>
                            </div>
                            <span style={{fontSize:10,color:form.recurring===val?color+"BB":"#475569"}}>{sub}</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {form.type==="expense" && form.recurring && (
                  <div style={{marginBottom:20,animation:"fu .2s ease-out both"}}>
                    <label style={{fontSize:11,color:"#64748B",fontWeight:600,display:"block",marginBottom:6}}>
                      ¿QUÉ DÍA DEL MES VENCE?{" "}
                      <span style={{color:"#475569",fontWeight:400}}>(opcional)</span>
                    </label>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,background:"#1E293B",borderRadius:12,
                          padding:"11px 16px",border:`1px solid ${form.dueDay?"#FBBF24":"#334155"}`,flex:1}}>
                        <Calendar size={14} color="#FBBF24"/>
                        <input type="number" min="1" max="31" value={form.dueDay}
                          onChange={e=>setForm(f=>({...f,dueDay:e.target.value}))}
                          placeholder="Ej: 5"
                          style={{background:"none",border:"none",outline:"none",flex:1,
                              fontSize:14,color:"#F1F5F9",fontFamily:"inherit",width:"100%"}}/>
                        {form.dueDay && <span style={{fontSize:12,color:"#64748B",whiteSpace:"nowrap"}}>de cada mes</span>}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Submit con validaciones claras */}
            <button className="btn-p" onClick={addTx}
              disabled={
                !form.amount ||
                parseFloat(form.amount) <= 0 ||
                (form.type === "transfer" && form.fromWallet === form.toWallet) ||
                (form.type !== "transfer" && (!form.description.trim() || !form.category)) ||
                ((form.type === "expense" || form.type === "investment") && form.source === "digital" &&
                 parseFloat(form.amount) > 0 && walletBalance(form.wallet) < parseFloat(form.amount))
              }
              style={{
                background: form.type === "expense"
                  ? "linear-gradient(135deg,#DC2626,#BE123C)"
                  : form.type === "income"
                  ? "linear-gradient(135deg,#059669,#047857)"
                  : form.type === "investment"
                  ? "linear-gradient(135deg,#7C3AED,#6D28D9)"
                  : "linear-gradient(135deg,#0284C7,#0369A1)"
              }}>
              {(form.type === "expense" || form.type === "investment") && form.source === "digital" &&
               parseFloat(form.amount) > 0 && walletBalance(form.wallet) < parseFloat(form.amount)
                ? "Saldo insuficiente en billetera"
                : form.type !== "transfer" && !form.category
                ? "Seleccioná una categoría para continuar"
                : form.type === "transfer"
                ? "Confirmar Transferencia"
                : form.type === "investment"
                ? "Registrar Inversión"
                : "Guardar Movimiento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}