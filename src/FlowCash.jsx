// FlowCash — Diseño nuevo (Claude Design) + Funcionalidad completa (backend, auth, wallets)
import { useState, useEffect, useRef, useCallback } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Legend,
} from "recharts";
import { authApi, txApi, walletApi } from './api.js';

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS — del handoff de Claude Design
   Aplicados como CSS variables + constantes JS
═══════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --fc-bg:            #0c0e1a;
  --fc-bg-2:          #11131f;
  --fc-surface:       #161826;
  --fc-surface-2:     #1c1f30;
  --fc-surface-3:     #252938;
  --fc-overlay:       rgba(12, 14, 26, 0.82);
  --fc-border:        rgba(255, 255, 255, 0.05);
  --fc-border-strong: rgba(255, 255, 255, 0.09);
  --fc-divider:       rgba(255, 255, 255, 0.035);

  --fc-fg:            #f4f5fa;
  --fc-fg-1:          rgba(244, 245, 250, 0.94);
  --fc-fg-2:          rgba(244, 245, 250, 0.70);
  --fc-fg-3:          rgba(244, 245, 250, 0.50);
  --fc-fg-4:          rgba(244, 245, 250, 0.34);

  --fc-violet:        #6c5cf0;
  --fc-violet-hi:     #8576f5;
  --fc-violet-lo:     #574ad0;
  --fc-violet-tint:   rgba(108, 92, 240, 0.14);
  --fc-violet-ring:   rgba(108, 92, 240, 0.36);
  --fc-indigo:        #4f46e5;

  --fc-grad-hero: linear-gradient(120deg, #4f46e5 0%, #6c5cf0 48%, #8b5cf6 100%);
  --fc-grad-fab:  linear-gradient(135deg, #6c5cf0 0%, #5b4ee6 100%);

  --fc-green:         #4ab38a;
  --fc-green-hi:      #5fc89e;
  --fc-green-tint:    rgba(74, 179, 138, 0.11);
  --fc-green-ring:    rgba(74, 179, 138, 0.28);

  --fc-pink:          #d96687;
  --fc-pink-hi:       #e57f9c;
  --fc-pink-tint:     rgba(217, 102, 135, 0.11);
  --fc-pink-ring:     rgba(217, 102, 135, 0.28);

  --fc-amber:         #d99850;
  --fc-amber-tint:    rgba(217, 152, 80, 0.12);
  --fc-info:          #6b8fd9;

  --fc-font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
  --fc-ease:        cubic-bezier(0.22, 0.61, 0.36, 1);
  --fc-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --fc-dur-fast:    120ms;
  --fc-dur-base:    200ms;
  --fc-dur-slow:    320ms;

  --fc-shadow-2: 0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35);
  --fc-shadow-3: 0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 48px rgba(0,0,0,0.45);
  --fc-shadow-violet: 0 16px 40px rgba(108,92,240,0.32), 0 3px 10px rgba(108,92,240,0.22);
  --fc-shadow-fab:    0 10px 24px rgba(108,92,240,0.42), 0 2px 6px rgba(0,0,0,0.30);
}

html, body {
  background: var(--fc-bg);
  color: var(--fc-fg-1);
  font-family: var(--fc-font-sans);
  font-size: 15px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
::-webkit-scrollbar-track { background: transparent; }

/* Animations */
@keyframes fcFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes fcPop  { from { opacity: 0; transform: scale(0.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
@keyframes fcSlideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
@keyframes slotUp   { from { transform: translateY(60%); opacity: 0; filter: blur(1px) } to { transform: translateY(0); opacity: 1; filter: blur(0) } }
@keyframes slotDown { from { transform: translateY(-60%); opacity: 0; filter: blur(1px) } to { transform: translateY(0); opacity: 1; filter: blur(0) } }

.fc-anim  { animation: fcSlideUp var(--fc-dur-slow) var(--fc-ease) both; }
.slot-wrap { display: inline-block; overflow: hidden; vertical-align: bottom; }
.slot-inner { display: inline-block; }

input, select, textarea { font-family: var(--fc-font-sans); }
input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { display: none; }
select option { background: var(--fc-surface-2); }

/* Tabular nums for money */
.fc-num { font-variant-numeric: tabular-nums lining-nums; }

/* Date/source grid mobile fix */
.date-source-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 420px) {
  .date-source-grid { grid-template-columns: 1fr; }
}
`;

/* ═══════════════════════════════════════════════════════════
   CATÁLOGO DE BANCOS Y BILLETERAS
═══════════════════════════════════════════════════════════ */
const ARG_BANKS = [
  { id:'galicia',    name:'Galicia',         color:'#FF6E00', type:'Banco' },
  { id:'santander',  name:'Santander',        color:'#EC0000', type:'Banco' },
  { id:'bbva',       name:'BBVA',             color:'#004481', type:'Banco' },
  { id:'macro',      name:'Macro',            color:'#FFCC00', type:'Banco' },
  { id:'icbc',       name:'ICBC',             color:'#C8102E', type:'Banco' },
  { id:'nacion',     name:'Banco Nación',     color:'#1F4E79', type:'Banco' },
  { id:'provincia',  name:'Banco Provincia',  color:'#16A085', type:'Banco' },
  { id:'ciudad',     name:'Banco Ciudad',     color:'#E63946', type:'Banco' },
  { id:'hsbc',       name:'HSBC',             color:'#DB0011', type:'Banco' },
  { id:'supervielle',name:'Supervielle',      color:'#FF6600', type:'Banco' },
  { id:'mp',         name:'Mercado Pago',     color:'#00B0FF', type:'Billetera' },
  { id:'naranjax',   name:'Naranja X',        color:'#FF6B1A', type:'Billetera' },
  { id:'uala',       name:'Ualá',             color:'#22D39A', type:'Billetera' },
  { id:'brubank',    name:'Brubank',          color:'#7C5CFF', type:'Billetera' },
  { id:'lemoncash',  name:'Lemon Cash',       color:'#FFD700', type:'Billetera' },
  { id:'modo',       name:'MODO',             color:'#3B47F1', type:'Billetera' },
  { id:'paypal',     name:'PayPal',           color:'#003087', type:'Billetera' },
];

const CATEGORIES = [
  { id:'sueldo',     label:'Sueldo',       icon:'briefcase', tone:'green',  type:'income'  },
  { id:'freelance',  label:'Freelance',    icon:'zap',       tone:'green',  type:'income'  },
  { id:'inversion',  label:'Inversión',    icon:'trendUp',   tone:'green',  type:'income'  },
  { id:'transferencia',label:'Transferencia',icon:'card',    tone:'green',  type:'income'  },
  { id:'otros-in',   label:'Otros',        icon:'wallet',    tone:'green',  type:'income'  },
  { id:'comida',     label:'Comida',       icon:'utensils',  tone:'pink',   type:'expense' },
  { id:'transporte', label:'Transporte',   icon:'car',       tone:'pink',   type:'expense' },
  { id:'compras',    label:'Compras',      icon:'bag',       tone:'pink',   type:'expense' },
  { id:'hogar',      label:'Hogar',        icon:'home',      tone:'pink',   type:'expense' },
  { id:'servicios',  label:'Servicios',    icon:'zap',       tone:'amber',  type:'expense' },
  { id:'salud',      label:'Salud',        icon:'star',      tone:'info',   type:'expense' },
  { id:'otros-ex',   label:'Otros',        icon:'wallet',    tone:'muted',  type:'expense' },
];

/* ═══════════════════════════════════════════════════════════
   ICON SET — del handoff de Claude Design (inline SVG)
═══════════════════════════════════════════════════════════ */
const ICON_PATHS = {
  plus:      '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  minus:     '<line x1="5" y1="12" x2="19" y2="12"/>',
  x:         '<path d="M18 6L6 18M6 6l12 12"/>',
  check:     '<path d="M5 12l5 5L20 7"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  chevronRight:'<path d="M9 18l6-6-6-6"/>',
  user:      '<circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0 1 12 0v1"/>',
  logout:    '<path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 0 1-2 2H5a2 2 0 0 0-2-2v-14a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1"/>',
  search:    '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  bank:      '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 10h20M6 2l6 3 6-3"/>',
  wallet:    '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.5"/>',
  cash:      '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  card:      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  trendUp:   '<path d="M7 17L12 12L15 15L20 8"/><path d="M14 8h6v6"/>',
  trendDown: '<path d="M7 7L12 12L15 9L20 14"/><path d="M14 14h6V8"/>',
  utensils:  '<path d="M3 3v6c0 1.5 1 3 3 3v9"/><path d="M6 3v6"/><path d="M18 3c-2 0-3 2-3 4s1 4 3 4v10"/>',
  car:       '<path d="M3 16V11l2-5h14l2 5v5"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/><path d="M9 16h6"/>',
  bag:       '<path d="M6 7v-1a4 4 0 0 1 8 0v1"/><rect x="3" y="7" width="18" height="14" rx="2"/>',
  home:      '<path d="M3 11l9-8 9 8"/><path d="M5 10v11h14V10"/>',
  zap:       '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  star:      '<path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  info:      '<circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/>',
  calendar:  '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alert:     '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  eye:       '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:    '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  mail:      '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  lock:      '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  trash:     '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>',
  shield:    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  refresh:   '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  dashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  chart:     '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  list:      '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
};

function Icon({ name, size=20, stroke=1.5, style, className }) {
  const d = ICON_PATHS[name];
  if (!d) return <span style={{color:'var(--fc-pink)',fontSize:10}}>?</span>;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className} dangerouslySetInnerHTML={{__html:d}}/>
  );
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const fmt = (n, prefix='+') => {
  if (n===0||n==null) return '$0';
  const sign = n<0 ? '−' : prefix==='−' ? '−' : prefix==='+' ? '+' : '';
  return `${sign}$${Math.abs(n).toLocaleString('es-AR',{maximumFractionDigits:0})}`;
};
const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('es-AR',{day:'2-digit',month:'short'});
};
const fmtDateLong = iso => {
  if (!iso) return '';
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('es-AR',{day:'2-digit',month:'long',weekday:'long'})
    .replace(/^\w/,c=>c.toUpperCase());
};
const todayISO = () => new Date().toISOString().split('T')[0];
const uid = () => Math.random().toString(36).slice(2,10);

/* ═══════════════════════════════════════════════════════════
   ATOM COMPONENTS — del design system nuevo
═══════════════════════════════════════════════════════════ */
function IconTile({ name, color='violet', size=40 }) {
  const palettes = {
    violet:{ bg:'var(--fc-violet-tint)', fg:'var(--fc-violet-hi)', bd:'var(--fc-violet-ring)' },
    green: { bg:'var(--fc-green-tint)',  fg:'var(--fc-green)',     bd:'var(--fc-green-ring)'  },
    pink:  { bg:'var(--fc-pink-tint)',   fg:'var(--fc-pink)',      bd:'var(--fc-pink-ring)'   },
    amber: { bg:'var(--fc-amber-tint)',  fg:'var(--fc-amber)',     bd:'rgba(217,152,80,.32)'  },
    info:  { bg:'rgba(107,143,217,.12)', fg:'var(--fc-info)',      bd:'rgba(107,143,217,.32)' },
    muted: { bg:'var(--fc-surface-2)',   fg:'var(--fc-fg-2)',      bd:'var(--fc-border)'      },
  };
  const p = palettes[color]||palettes.violet;
  return (
    <span style={{width:size,height:size,borderRadius:12,display:'inline-flex',alignItems:'center',
        justifyContent:'center',background:p.bg,color:p.fg,border:`1px solid ${p.bd}`,flex:'none'}}>
      <Icon name={name} size={Math.round(size*0.5)}/>
    </span>
  );
}

function BankBadge({ bankId, size=40 }) {
  const bank = bankId==='efectivo'
    ? {name:'Efectivo',color:'#4ab38a'}
    : ARG_BANKS.find(b=>b.id===bankId);
  if (!bank) return <IconTile name="wallet" color="muted" size={size}/>;
  return (
    <span style={{width:size,height:size,borderRadius:Math.round(size*0.28),display:'inline-flex',
        alignItems:'center',justifyContent:'center',background:bank.color+'20',
        border:`1px solid ${bank.color}40`,flex:'none',fontSize:Math.round(size*0.35),
        fontWeight:700,color:bank.color}}>
      {bank.name.slice(0,bank.id==='nacion'?2:1).toUpperCase()}
    </span>
  );
}

function Badge({ children, tone='muted' }) {
  const map = {
    muted:  {color:'var(--fc-fg-2)',      bg:'var(--fc-surface-2)',  bd:'var(--fc-border)'},
    amber:  {color:'var(--fc-amber)',     bg:'var(--fc-amber-tint)', bd:'rgba(217,152,80,.32)'},
    green:  {color:'var(--fc-green)',     bg:'var(--fc-green-tint)', bd:'var(--fc-green-ring)'},
    pink:   {color:'var(--fc-pink)',      bg:'var(--fc-pink-tint)',  bd:'var(--fc-pink-ring)'},
    violet: {color:'var(--fc-violet-hi)',bg:'var(--fc-violet-tint)',bd:'var(--fc-violet-ring)'},
  };
  const p=map[tone]||map.muted;
  return (
    <span style={{display:'inline-flex',padding:'3px 9px',borderRadius:999,
        fontSize:10,fontWeight:700,letterSpacing:'0.08em',
        color:p.color,background:p.bg,border:`1px solid ${p.bd}`}}>
      {children}
    </span>
  );
}

function Spinner({ size=20, color='var(--fc-violet-hi)' }) {
  return (
    <span style={{display:'inline-block',width:size,height:size,border:`2px solid ${color}30`,
        borderTopColor:color,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECURITY — Auth helpers
═══════════════════════════════════════════════════════════ */
const SESSION_KEY = 'fc_session_v1';
const loadSession = () => JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');
const saveSession = s  => sessionStorage.setItem(SESSION_KEY,JSON.stringify(s));
const clearSession= () => { sessionStorage.removeItem(SESSION_KEY); authApi.logout(); };

/* ═══════════════════════════════════════════════════════════
   SLOT MACHINE ANIMATION
═══════════════════════════════════════════════════════════ */
function useSlotMachine(target, duration=1000) {
  const [state, setState] = useState({val:target,animKey:0,dir:0});
  const prevRef = useRef(target);
  const timers  = useRef([]);
  useEffect(()=>{
    if (prevRef.current===target) return;
    const from=prevRef.current, to=target, dir=to>from?1:-1;
    prevRef.current=to;
    timers.current.forEach(clearTimeout); timers.current=[];
    const N=18, sumW=Array.from({length:N},(_,i)=>Math.pow(N-i,2)).reduce((a,b)=>a+b,0);
    const C=duration/sumW; let cum=0;
    for (let i=1;i<=N;i++){
      const interval=C*Math.pow(N-i+1,2); cum+=interval;
      const p=Math.pow(i/N,3);
      const val=i===N?to:Math.round(from+(to-from)*p);
      timers.current.push(setTimeout(()=>setState(prev=>({val,animKey:prev.animKey+1,dir})),Math.round(cum)));
    }
    return ()=>timers.current.forEach(clearTimeout);
  },[target,duration]);
  return state;
}

function SlotNumber({ slot, prefix='', suffix='', style }) {
  return (
    <span className="slot-wrap" style={style}>
      <span key={slot.animKey} className="slot-inner" style={{
        animation:slot.dir!==0?`${slot.dir>0?'slotUp':'slotDown'} 0.12s ease-out both`:'none'
      }}>
        {prefix}{slot.val===0?'$0':fmt(slot.val,slot.dir>0?'+':slot.dir<0?'-':'')}{suffix}
      </span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   SWIPEABLE ROW — para eliminar en mobile
═══════════════════════════════════════════════════════════ */
function SwipeableRow({ id, onDeleteRequest, children }) {
  const [swipeX, setSwipeX] = useState(0);
  const [opened, setOpened] = useState(false);
  const startX = useRef(0), moving = useRef(false);
  const PANEL=72, THRESH=48;
  const onTouchStart=e=>{startX.current=e.touches[0].clientX;moving.current=true;};
  const onTouchMove=e=>{
    if(!moving.current) return;
    const diff=startX.current-e.touches[0].clientX;
    if(diff>0) setSwipeX(Math.min(diff,PANEL));
    else if(opened) setSwipeX(Math.max(PANEL+diff,0));
  };
  const onTouchEnd=()=>{
    moving.current=false;
    if(swipeX>THRESH){setSwipeX(PANEL);setOpened(true);}
    else{setSwipeX(0);setOpened(false);}
  };
  return (
    <div style={{position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:PANEL,
          background:'#c0243c',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
           onClick={()=>{setSwipeX(0);setOpened(false);onDeleteRequest(id);}}>
        <Icon name="trash" size={18} color="#fff"/>
      </div>
      <div style={{transform:`translateX(-${swipeX}px)`,
          transition:moving.current?'none':'transform .22s ease-out'}}
           onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WALLET MANAGER MODAL
═══════════════════════════════════════════════════════════ */
function WalletManager({ activeKeys, onSave, onClose }) {
  const [selected, setSelected] = useState([...activeKeys]);
  const toggle = key => {
    if(key==='efectivo') return;
    setSelected(prev=>prev.includes(key)?prev.filter(k=>k!==key):[...prev,key]);
  };
  const groups = [
    {label:'Billeteras virtuales', type:'Billetera'},
    {label:'Bancos', type:'Banco'},
  ];
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',
        justifyContent:'center',padding:'16px 20px',background:'var(--fc-overlay)',
        backdropFilter:'blur(8px)',animation:'fcFade 200ms var(--fc-ease)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:'100%',maxWidth:500,background:'var(--fc-bg-2)',
          border:'1px solid var(--fc-border-strong)',borderRadius:22,padding:24,
          maxHeight:'85vh',overflowY:'auto',animation:'fcPop 220ms var(--fc-ease)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <p style={{fontSize:17,fontWeight:700,color:'var(--fc-fg-1)'}}>Mis billeteras</p>
            <p style={{fontSize:12,color:'var(--fc-fg-3)',marginTop:3}}>Activá las que usás</p>
          </div>
          <button onClick={onClose} style={{width:36,height:36,borderRadius:10,
              background:'var(--fc-surface-2)',border:'none',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',color:'var(--fc-fg-2)'}}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        {/* Efectivo siempre activo */}
        <div style={{display:'flex',alignItems:'center',gap:12,background:'var(--fc-surface)',
            border:'1px solid var(--fc-green-ring)',borderRadius:14,padding:'12px 16px',marginBottom:20}}>
          <BankBadge bankId="efectivo" size={36}/>
          <div style={{flex:1}}>
            <p style={{fontSize:13,fontWeight:700,color:'var(--fc-fg-1)'}}>Efectivo</p>
            <p style={{fontSize:11,color:'var(--fc-fg-3)'}}>Siempre activo</p>
          </div>
          <span style={{width:22,height:22,borderRadius:'50%',background:'var(--fc-green)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Icon name="check" size={13} stroke={2.5} style={{color:'#fff'}}/>
          </span>
        </div>

        {groups.map(({label,type})=>(
          <div key={type} style={{marginBottom:20}}>
            <p style={{fontSize:10,fontWeight:700,color:'var(--fc-fg-3)',letterSpacing:'0.1em',
                textTransform:'uppercase',marginBottom:10}}>{label}</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {ARG_BANKS.filter(b=>b.type===type).map(bank=>{
                const on=selected.includes(bank.id);
                return (
                  <button key={bank.id} onClick={()=>toggle(bank.id)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',
                      borderRadius:12,border:`1.5px solid ${on?bank.color+'60':'var(--fc-border-strong)'}`,
                      background:on?bank.color+'12':'var(--fc-surface)',cursor:'pointer',
                      fontFamily:'var(--fc-font-sans)',transition:'all 0.18s',textAlign:'left'}}>
                    <BankBadge bankId={bank.id} size={30}/>
                    <span style={{fontSize:12,fontWeight:600,flex:1,overflow:'hidden',
                        textOverflow:'ellipsis',whiteSpace:'nowrap',
                        color:on?bank.color:'var(--fc-fg-2)'}}>
                      {bank.name}
                    </span>
                    <span style={{width:18,height:18,borderRadius:'50%',flex:'none',display:'flex',
                        alignItems:'center',justifyContent:'center',transition:'all .18s',
                        background:on?bank.color:'transparent',
                        border:on?'none':'1px solid var(--fc-border-strong)'}}>
                      {on&&<Icon name="check" size={11} stroke={2.5} style={{color:'#fff'}}/>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button onClick={()=>onSave(selected)}
          style={{width:'100%',padding:14,borderRadius:14,fontSize:15,fontWeight:700,
            color:'#fff',border:'none',cursor:'pointer',fontFamily:'var(--fc-font-sans)',
            background:'var(--fc-violet)',boxShadow:'var(--fc-shadow-violet)'}}>
          Guardar billeteras
        </button>
        <p style={{fontSize:11,color:'var(--fc-fg-3)',textAlign:'center',marginTop:10}}>
          {selected.filter(k=>k!=='efectivo').length} billetera(s) adicional(es) activa(s)
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AUTH SCREEN — nuevo diseño
═══════════════════════════════════════════════════════════ */
function AuthScreen({ onAuth }) {
  const [mode, setMode]     = useState('login');
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [pw2, setPw2]       = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading]= useState(false);
  const [error, setError]   = useState('');
  const [ok, setOk]         = useState('');

  const submit = async () => {
    setError(''); setOk('');
    if(!email.trim()||!pw){setError('Completá todos los campos.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setError('Email inválido.');return;}
    if(pw.length<8){setError('Mínimo 8 caracteres.');return;}
    if(mode==='register'&&pw!==pw2){setError('Las contraseñas no coinciden.');return;}
    setLoading(true);
    try {
      const norm=email.trim().toLowerCase();
      const user=mode==='register' ? await authApi.register(norm,pw) : await authApi.login(norm,pw);
      const s={userId:user.id,email:user.email};
      saveSession(s);
      setOk(mode==='register'?'¡Cuenta creada!':'Bienvenido…');
      setTimeout(()=>onAuth(s),500);
    } catch(e){ setError(e.message||'Error de conexión.'); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:'var(--fc-bg)',display:'flex',
        alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:400,animation:'fcSlideUp 300ms var(--fc-ease) both'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:56,height:56,borderRadius:18,margin:'0 auto 16px',
              background:'var(--fc-grad-hero)',display:'flex',alignItems:'center',
              justifyContent:'center',boxShadow:'var(--fc-shadow-violet)'}}>
            <Icon name="wallet" size={26} style={{color:'#fff'}}/>
          </div>
          <h1 style={{fontSize:28,fontWeight:700,letterSpacing:'-0.02em',color:'var(--fc-fg-1)'}}>
            Flow<span style={{color:'var(--fc-violet-hi)'}}>Cash</span>
          </h1>
          <p style={{fontSize:13,color:'var(--fc-fg-3)',marginTop:4}}>
            {mode==='login'?'Iniciá sesión para continuar':'Creá tu cuenta gratuita'}
          </p>
        </div>

        <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border-strong)',
            borderRadius:22,padding:28}}>
          {/* Toggle */}
          <div style={{display:'flex',background:'var(--fc-surface-2)',borderRadius:14,padding:5,gap:4,marginBottom:24}}>
            {[['login','Iniciar sesión'],['register','Crear cuenta']].map(([v,l])=>(
              <button key={v} onClick={()=>{setMode(v);setError('');setOk('');}}
                style={{flex:1,padding:'10px',borderRadius:11,border:'none',cursor:'pointer',
                  fontSize:13,fontWeight:600,fontFamily:'var(--fc-font-sans)',transition:'all .2s',
                  background:mode===v?'var(--fc-violet)':'transparent',
                  color:mode===v?'#fff':'var(--fc-fg-3)',
                  boxShadow:mode===v?'var(--fc-shadow-violet)':'none'}}>
                {l}
              </button>
            ))}
          </div>

          {error && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
                borderRadius:10,background:'var(--fc-pink-tint)',border:'1px solid var(--fc-pink-ring)',
                marginBottom:16}}>
              <Icon name="alert" size={14} style={{color:'var(--fc-pink)',flexShrink:0}}/>
              <span style={{fontSize:12,color:'var(--fc-pink)',fontWeight:500}}>{error}</span>
            </div>
          )}
          {ok && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
                borderRadius:10,background:'var(--fc-green-tint)',border:'1px solid var(--fc-green-ring)',
                marginBottom:16}}>
              <Icon name="check" size={14} style={{color:'var(--fc-green)',flexShrink:0}}/>
              <span style={{fontSize:12,color:'var(--fc-green)',fontWeight:500}}>{ok}</span>
            </div>
          )}

          {[
            ['Email','email',email,setEmail,'mail','tu@email.com'],
            ['Contraseña','password',pw,setPw,'lock','Mínimo 8 caracteres'],
          ].map(([lbl,type,val,set,ico,ph])=>(
            <div key={lbl} style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
                  color:'var(--fc-fg-3)',display:'block',marginBottom:6}}>{lbl}</label>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',
                    color:'var(--fc-fg-3)',display:'flex'}}>
                  <Icon name={ico} size={15}/>
                </span>
                <input type={type==='password'?(showPw?'text':'password'):type} value={val}
                  onChange={e=>set(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}
                  placeholder={ph}
                  style={{width:'100%',height:46,background:'var(--fc-surface-2)',
                    border:'1px solid var(--fc-border-strong)',borderRadius:12,
                    paddingLeft:42,paddingRight:type==='password'?44:14,
                    color:'var(--fc-fg-1)',fontSize:14,outline:'none',
                    transition:'border-color .2s',fontFamily:'var(--fc-font-sans)'}}
                  onFocus={e=>e.target.style.borderColor='var(--fc-violet)'}
                  onBlur={e=>e.target.style.borderColor='var(--fc-border-strong)'}/>
                {type==='password' && (
                  <button onClick={()=>setShowPw(!showPw)}
                    style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
                      background:'none',border:'none',cursor:'pointer',color:'var(--fc-fg-3)',
                      display:'flex',padding:4}}>
                    <Icon name={showPw?'eyeOff':'eye'} size={15}/>
                  </button>
                )}
              </div>
            </div>
          ))}

          {mode==='register' && (
            <div style={{marginBottom:20}}>
              <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
                  color:'var(--fc-fg-3)',display:'block',marginBottom:6}}>Confirmar contraseña</label>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',
                    color:'var(--fc-fg-3)',display:'flex'}}><Icon name="lock" size={15}/></span>
                <input type={showPw?'text':'password'} value={pw2} onChange={e=>setPw2(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Repetí tu contraseña"
                  style={{width:'100%',height:46,background:'var(--fc-surface-2)',
                    border:`1px solid ${pw2&&pw2!==pw?'var(--fc-pink-ring)':pw2&&pw2===pw?'var(--fc-green-ring)':'var(--fc-border-strong)'}`,
                    borderRadius:12,paddingLeft:42,paddingRight:14,
                    color:'var(--fc-fg-1)',fontSize:14,outline:'none',fontFamily:'var(--fc-font-sans)'}}/>
              </div>
              {pw2&&pw2===pw&&<p style={{fontSize:11,color:'var(--fc-green)',marginTop:5,display:'flex',alignItems:'center',gap:4}}>
                <Icon name="check" size={11} stroke={2}/> Contraseñas coinciden
              </p>}
            </div>
          )}

          <button onClick={submit}
            disabled={loading||(mode==='register'&&(!pw2||pw2!==pw))}
            style={{width:'100%',height:48,borderRadius:14,fontSize:15,fontWeight:700,
              color:'#fff',border:'none',cursor:loading?'wait':'pointer',
              fontFamily:'var(--fc-font-sans)',display:'flex',alignItems:'center',
              justifyContent:'center',gap:10,transition:'opacity .2s',
              background:'var(--fc-violet)',boxShadow:'var(--fc-shadow-violet)',
              opacity:(loading||(mode==='register'&&(!pw2||pw2!==pw)))?0.5:1}}>
            {loading ? <><Spinner size={18} color="#fff"/> Procesando…</> : mode==='login'?'Entrar a FlowCash':'Crear mi cuenta'}
          </button>

          <div style={{marginTop:16,padding:'10px 14px',background:'var(--fc-violet-tint)',
              borderRadius:10,border:'1px solid var(--fc-violet-ring)',display:'flex',gap:8,alignItems:'flex-start'}}>
            <Icon name="shield" size={13} style={{color:'var(--fc-violet-hi)',marginTop:2,flexShrink:0}}/>
            <p style={{fontSize:11,color:'var(--fc-fg-3)',lineHeight:1.6}}>
              Tu contraseña se cifra con <span style={{color:'var(--fc-violet-hi)',fontWeight:600}}>bcrypt</span> antes de guardarse. Nadie puede acceder a tus datos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════ */
export default function FlowCash() {
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);
  useEffect(()=>{
    if(authApi.isLoggedIn()){
      const cached=loadSession();
      if(cached) authApi.me().then(d=>{setSession({userId:d.user.id,email:d.user.email});})
        .catch(()=>clearSession()).finally(()=>setChecked(true));
      else{clearSession();setChecked(true);}
    } else setChecked(true);
  },[]);
  if(!checked) return (
    <div style={{minHeight:'100vh',background:'var(--fc-bg)',display:'flex',
        alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <Spinner size={40}/>
      <p style={{fontSize:13,color:'var(--fc-fg-3)',fontFamily:'var(--fc-font-sans)'}}>Cargando FlowCash…</p>
    </div>
  );
  if(!session) return <AuthScreen onAuth={s=>{saveSession(s);setSession(s);}}/>;
  return <AppContent session={session} onLogout={()=>{clearSession();setSession(null);}}/>;
}

/* ═══════════════════════════════════════════════════════════
   APP CONTENT
═══════════════════════════════════════════════════════════ */
function AppContent({ session, onLogout }) {
  const {userId, email} = session;
  const [txs, setTxs]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [netError, setNetError]   = useState(null);
  const [tab, setTab]             = useState('dashboard');
  const [showAddTx, setShowAddTx] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showWalletMgr, setShowWalletMgr] = useState(false);
  const [deleteId, setDeleteId]   = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat]  = useState('all');
  const [query, setQuery]          = useState('');
  const [toast, setToast]          = useState(null);
  const [activeWalletKeys, setActiveWalletKeys] = useState(['efectivo']);

  // Load data
  useEffect(()=>{
    Promise.all([
      txApi.getAll(),
      walletApi.getActive().catch(()=>({wallets:['efectivo']})),
    ]).then(([txData, wData])=>{
      setTxs(txData.transactions||[]);
      // Map backend keys to frontend keys
      const map = {manual:'efectivo', mercadopago:'mp', lemoncash:'lemoncash',
        uala:'uala', brubank:'brubank', naranjaX:'naranjax', paypal:'paypal',
        santander:'santander', bbva:'bbva', galicia:'galicia', nacion:'nacion',
        macro:'macro', hsbc:'hsbc', icbc:'icbc', supervielle:'supervielle'};
      const mapped = (wData.wallets||['efectivo']).map(k=>map[k]||k);
      if(!mapped.includes('efectivo')) mapped.unshift('efectivo');
      setActiveWalletKeys(mapped);
      setLoading(false);
    }).catch(e=>{setNetError(e.message);setLoading(false);});
  },[userId]);

  // Computed
  const income   = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expenses = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const balance  = income-expenses;
  const savingsRate = income>0?Math.max(0,Math.round((balance/income)*100)):0;

  const slotBalance  = useSlotMachine(balance);
  const slotIncome   = useSlotMachine(income);
  const slotExpenses = useSlotMachine(expenses);

  const walletBalance = useCallback(wid=>{
    const wt = txs.filter(t=>(t.wallet===wid)||(wid==='efectivo'&&t.wallet==='manual'));
    return wt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
          -wt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  },[txs]);

  // Maps wallet key (frontend) → backend key
  const toBackendKey = k => ({
    efectivo:'manual',mp:'mercadopago',lemoncash:'lemoncash',uala:'uala',
    brubank:'brubank',naranjax:'naranjaX',paypal:'paypal',
    santander:'santander',bbva:'bbva',galicia:'galicia',nacion:'nacion',
    macro:'macro',hsbc:'hsbc',icbc:'icbc',supervielle:'supervielle',
  }[k]||k);

  const saveWallets = async keys => {
    try {
      await walletApi.save(keys.map(toBackendKey));
      setActiveWalletKeys(keys);
      setShowWalletMgr(false);
      showToastFn('Billeteras guardadas ✓');
    } catch(e){ showToastFn(e.message||'Error al guardar',false); }
  };

  const byCat = CATEGORIES
    .filter(c=>c.type==='expense')
    .map(c=>({...c,val:txs.filter(t=>t.type==='expense'&&t.category===c.id).reduce((s,t)=>s+t.amount,0)}))
    .filter(d=>d.val>0).sort((a,b)=>b.val-a.val);

  // Source distribution using activeWalletKeys
  const sourceSlices = activeWalletKeys.map(wid=>{
    const bank = wid==='efectivo' ? {name:'Efectivo',color:'#4ab38a'} : ARG_BANKS.find(b=>b.id===wid);
    const val = Math.max(0,walletBalance(wid));
    return {id:wid,label:bank?.name||wid,color:bank?.color||'#6c5cf0',val};
  }).filter(s=>s.val>0);
  const sourceTotal = sourceSlices.reduce((s,d)=>s+d.val,0);

  // Recurring
  const recurringExp = txs.filter(t=>t.type==='expense'&&t.recurring);
  const uniqueRecurring = Array.from(
    new Map(recurringExp.map(t=>[`${t.description}__${t.amount}`,t])).values()
  ).sort((a,b)=>(Number(a.dueDay)||99)-(Number(b.dueDay)||99));
  const monthlyCommitted = uniqueRecurring.reduce((s,t)=>s+t.amount,0);
  const todayDay = new Date().getDate();
  const isDueSoon = d=>d&&(Number(d)-todayDay)>=0&&(Number(d)-todayDay)<=7;

  // Monthly trend
  const monthlyData = (() => {
    const r=[];
    for(let i=5;i>=0;i--){
      const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
      const y=d.getFullYear(),m=d.getMonth();
      const lbl=d.toLocaleDateString('es-AR',{month:'short'}).replace('.','').toUpperCase();
      const mTxs=txs.filter(t=>{const td=new Date(t.date+'T00:00:00');return td.getFullYear()===y&&td.getMonth()===m;});
      const inc=mTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
      const exp=mTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      r.push({label:lbl,Ingresos:inc,Gastos:exp,net:inc-exp});
    }
    return r;
  })();

  const availableCats = ['all',...Array.from(new Set(txs.map(t=>t.category))).sort()];

  const filtered = txs.filter(t=>{
    const mt=filterType==='all'?true:filterType==='recurring'?!!t.recurring:t.type===filterType;
    const mc=filterCat==='all'||t.category===filterCat;
    const mq=t.description?.toLowerCase().includes(query.toLowerCase())||
             t.category?.toLowerCase().includes(query.toLowerCase());
    return mt&&mc&&mq;
  });

  // Actions
  const showToastFn = (msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};

  const addTx = async payload => {
    const backendWallet = toBackendKey(payload.wallet);
    const body = {...payload, wallet_name:backendWallet, amount:parseFloat(payload.amount)};
    try {
      const data = await txApi.create(body);
      const newTx = {
        ...body, id:data.transaction.id,
        wallet:backendWallet==='manual'?'manual':payload.wallet,
        date:payload.date, amount:parseFloat(payload.amount),
      };
      setTxs(p=>[newTx,...p]);
      setShowAddTx(false);
      showToastFn('Movimiento guardado ✓');
    } catch(e){ showToastFn(e.message||'Error al guardar',false); }
  };

  const doDelete = async () => {
    try {
      await txApi.delete(deleteId);
      setTxs(p=>p.filter(t=>t.id!==deleteId));
      setDeleteId(null);
      showToastFn('Movimiento eliminado',false);
    } catch(e){ showToastFn(e.message||'Error',false); setDeleteId(null); }
  };

  // Loading / error screens
  if(loading) return (
    <div style={{minHeight:'100vh',background:'var(--fc-bg)',display:'flex',
        alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
      <Spinner size={36}/>
      <p style={{fontSize:13,color:'var(--fc-fg-3)',fontFamily:'var(--fc-font-sans)'}}>Cargando tus movimientos…</p>
    </div>
  );

  if(netError) return (
    <div style={{minHeight:'100vh',background:'var(--fc-bg)',display:'flex',
        alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{textAlign:'center',maxWidth:320}}>
        <Icon name="alert" size={40} style={{color:'var(--fc-pink)',margin:'0 auto 16px',display:'block'}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:'var(--fc-fg-1)',marginBottom:8,fontFamily:'var(--fc-font-sans)'}}>
          Sin conexión al servidor
        </h2>
        <p style={{fontSize:13,color:'var(--fc-fg-3)',lineHeight:1.6,marginBottom:20,fontFamily:'var(--fc-font-sans)'}}>
          {netError}
        </p>
        <button onClick={()=>window.location.reload()} style={{padding:'10px 20px',borderRadius:12,
            border:'1px solid var(--fc-violet-ring)',background:'var(--fc-violet-tint)',
            color:'var(--fc-violet-hi)',cursor:'pointer',fontSize:13,fontWeight:600,
            fontFamily:'var(--fc-font-sans)'}}>
          Reintentar
        </button>
      </div>
    </div>
  );

  const TABS = [
    {id:'dashboard',label:'Dashboard',icon:'dashboard'},
    {id:'charts',   label:'Gráficos', icon:'chart'},
    {id:'records',  label:'Registros',icon:'list'},
  ];

  return (
    <div style={{minHeight:'100vh',background:'var(--fc-bg)',fontFamily:'var(--fc-font-sans)'}}>

      {/* TOP BAR */}
      <div style={{display:'flex',alignItems:'center',gap:14,padding:'18px 28px',
          position:'sticky',top:0,zIndex:100,
          backdropFilter:'blur(16px)',background:'rgba(12,14,26,0.85)',
          borderBottom:'1px solid var(--fc-border)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginRight:'auto'}}>
          <div style={{width:42,height:42,borderRadius:14,background:'var(--fc-grad-hero)',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'var(--fc-shadow-violet)'}}>
            <Icon name="wallet" size={20} style={{color:'#fff'}}/>
          </div>
          <div style={{fontSize:20,fontWeight:700,letterSpacing:'-0.02em'}}>
            <span style={{color:'var(--fc-fg-1)'}}>Flow</span>
            <span style={{color:'var(--fc-violet-hi)'}}>Cash</span>
          </div>
        </div>

        {/* Balance pill */}
        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'9px 16px',
            borderRadius:12,fontWeight:700,fontSize:14,fontVariantNumeric:'tabular-nums',
            background:balance>=0?'var(--fc-green-tint)':'var(--fc-pink-tint)',
            border:`1px solid ${balance>=0?'var(--fc-green-ring)':'var(--fc-pink-ring)'}`,
            color:balance>=0?'var(--fc-green)':'var(--fc-pink)'}}>
          <Icon name={balance>=0?'trendUp':'trendDown'} size={14} stroke={2}/>
          {fmt(balance,balance>=0?'+':'−')}
        </div>

        {/* Icon buttons */}
        {[
          {icon:'bank',   title:'Mis billeteras', onClick:()=>setShowWalletMgr(true),  danger:false},
          {icon:'user',   title:email,            onClick:null,                          danger:false},
          {icon:'logout', title:'Cerrar sesión',  onClick:()=>setShowLogout(true),       danger:true},
        ].map(({icon,title,onClick,danger})=>(
          <button key={icon} title={title} onClick={onClick||undefined}
            style={{width:44,height:44,borderRadius:14,display:'inline-flex',alignItems:'center',
              justifyContent:'center',border:`1px solid ${danger?'var(--fc-pink-ring)':'var(--fc-violet-ring)'}`,
              background:danger?'var(--fc-pink-tint)':'var(--fc-violet-tint)',
              color:danger?'var(--fc-pink)':'var(--fc-violet-hi)',
              cursor:onClick?'pointer':'default',transition:'all var(--fc-dur-fast) var(--fc-ease)'}}>
            <Icon name={icon} size={20}/>
          </button>
        ))}
      </div>

      {/* TAB BAR */}
      <div style={{display:'flex',gap:6,background:'var(--fc-surface)',
          border:'1px solid var(--fc-border)',borderRadius:18,padding:6,
          margin:'20px 28px 0'}}>
        {TABS.map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:10,
              padding:'13px 12px',borderRadius:14,fontSize:14,fontWeight:600,
              color:tab===t.id?'var(--fc-violet-hi)':'var(--fc-fg-3)',
              background:tab===t.id?'var(--fc-violet-tint)':'transparent',
              cursor:'pointer',transition:'all var(--fc-dur-fast) var(--fc-ease)'}}>
            <Icon name={t.icon} size={17}/>
            {t.label}
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={{padding:'20px 28px 120px'}} key={tab} className="fc-anim">

        {/* ── DASHBOARD ── */}
        {tab==='dashboard' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
            {/* Hero */}
            <div style={{position:'relative',overflow:'hidden',borderRadius:28,padding:'28px 28px 24px',
                background:'var(--fc-grad-hero)',boxShadow:'var(--fc-shadow-violet)',
                color:'#fff',gridColumn:'1/-1'}}>
              <div style={{position:'absolute',right:-60,top:-60,width:220,height:220,
                  borderRadius:'50%',background:'rgba(255,255,255,0.10)',filter:'blur(8px)'}}/>
              <div style={{fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',
                  opacity:.78,fontWeight:600,marginBottom:8}}>Saldo total</div>
              <div style={{fontSize:56,fontWeight:700,letterSpacing:'-0.02em',lineHeight:1,
                  fontVariantNumeric:'tabular-nums',marginBottom:6}}>
                <SlotNumber slot={slotBalance} prefix=""/>
              </div>
              <div style={{fontSize:13,opacity:.7,marginBottom:24}}>
                {txs.length} movimientos registrados
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {[
                  {slot:slotIncome,  label:'Ingresos del mes', icon:'trendUp',   color:'rgba(74,179,138,.9)'},
                  {slot:slotExpenses,label:'Gastos del mes',   icon:'trendDown',  color:'rgba(217,102,135,.9)'},
                ].map(({slot,label,icon,color})=>(
                  <div key={label} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.14)',
                      borderRadius:18,padding:'14px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <span style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.14)',
                          display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
                        <Icon name={icon} size={16} stroke={2} style={{color:'#fff'}}/>
                      </span>
                      <span style={{fontSize:12,opacity:.9}}>{label}</span>
                    </div>
                    <div style={{fontSize:26,fontWeight:700,color,fontVariantNumeric:'tabular-nums'}}>
                      <SlotNumber slot={slot} prefix=""/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Saldo por billetera */}
            <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border)',
                borderRadius:24,padding:24}}>
              <h2 style={{fontSize:17,fontWeight:700,color:'var(--fc-fg-1)',margin:'0 0 4px'}}>Saldo por billetera</h2>
              <p style={{fontSize:12,color:'var(--fc-fg-3)',marginBottom:16}}>Balance neto por fuente</p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {activeWalletKeys.map(wid=>{
                  const bank=wid==='efectivo'?{name:'Efectivo',color:'#4ab38a',type:'cash'}:ARG_BANKS.find(b=>b.id===wid);
                  if(!bank) return null;
                  const bal=walletBalance(wid);
                  return (
                    <div key={wid} style={{display:'flex',alignItems:'center',gap:12,
                        background:'var(--fc-surface-2)',borderRadius:14,padding:'12px 14px'}}>
                      <BankBadge bankId={wid} size={36}/>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:600,color:'var(--fc-fg-1)'}}>{bank.name}</p>
                        <p style={{fontSize:11,color:'var(--fc-fg-3)',marginTop:1}}>{bank.type}</p>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <p style={{fontSize:14,fontWeight:700,fontVariantNumeric:'tabular-nums',
                            color:bal>=0?bank.color:'var(--fc-pink)'}}>
                          {fmt(bal,bal>=0?'+':'−')}
                        </p>
                        <p style={{fontSize:10,color:'var(--fc-fg-3)',marginTop:2}}>
                          {bal>=0?'superávit':'déficit'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {txs.length>0 && (
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                      padding:'8px 14px',borderRadius:11,background:'var(--fc-violet-tint)',
                      border:'1px solid var(--fc-violet-ring)',marginTop:4}}>
                    <span style={{fontSize:11,fontWeight:600,color:'var(--fc-fg-3)'}}>Total verificado</span>
                    <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
                        color:balance>=0?'var(--fc-green)':'var(--fc-pink)'}}>
                      {fmt(balance,balance>=0?'+':'−')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tasa de ahorro */}
            <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border)',borderRadius:24,padding:24}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                <div>
                  <h2 style={{fontSize:17,fontWeight:700,color:'var(--fc-fg-1)',margin:'0 0 4px'}}>Tasa de ahorro</h2>
                  <p style={{fontSize:12,color:'var(--fc-fg-3)'}}>Ingresos disponibles tras gastos</p>
                </div>
                <div style={{textAlign:'center',padding:'8px 14px',borderRadius:12,
                    background:savingsRate>=50?'var(--fc-green-tint)':savingsRate>=20?'var(--fc-amber-tint)':'var(--fc-pink-tint)',
                    border:`1px solid ${savingsRate>=50?'var(--fc-green-ring)':savingsRate>=20?'rgba(217,152,80,.32)':'var(--fc-pink-ring)'}`}}>
                  <div style={{fontSize:26,fontWeight:700,lineHeight:1,
                      color:savingsRate>=50?'var(--fc-green)':savingsRate>=20?'var(--fc-amber)':'var(--fc-pink)'}}>
                    {savingsRate}%
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--fc-fg-3)',marginTop:4,textTransform:'uppercase',letterSpacing:'.05em'}}>
                    {savingsRate>=50?'Excelente':savingsRate>=20?'Buena':'Mejorable'}
                  </div>
                </div>
              </div>
              <div style={{height:6,background:'var(--fc-surface-2)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:99,transition:'width .6s ease',
                    width:`${Math.min(100,savingsRate)}%`,
                    background:savingsRate>=50?'var(--fc-green)':savingsRate>=20?'var(--fc-amber)':'var(--fc-pink)'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:7,fontSize:11,color:'var(--fc-fg-3)'}}>
                <span>0%</span><span>Meta: 20%+</span><span>100%</span>
              </div>
            </div>

            {/* Compromisos del mes */}
            <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border)',borderRadius:24,padding:24,gridColumn:'1/-1'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div>
                  <h2 style={{fontSize:17,fontWeight:700,color:'var(--fc-fg-1)',margin:'0 0 4px'}}>Compromisos del mes</h2>
                  <p style={{fontSize:12,color:'var(--fc-fg-3)'}}>Gastos fijos que se repiten</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:20,fontWeight:700,color:'var(--fc-pink)',fontVariantNumeric:'tabular-nums'}}>
                    {fmt(monthlyCommitted,'−')}
                  </p>
                  <p style={{fontSize:11,color:'var(--fc-fg-3)',marginTop:2}}>comprometido</p>
                </div>
              </div>
              {uniqueRecurring.length===0 ? (
                <p style={{fontSize:13,color:'var(--fc-fg-3)',textAlign:'center',padding:'20px 0'}}>
                  Sin gastos fijos. Al cargar un gasto, activá{' '}
                  <span style={{color:'var(--fc-violet-hi)',fontWeight:600}}>"Fijo mensual"</span>.
                </p>
              ) : (
                <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                    {uniqueRecurring.slice(0,6).map(tx=>{
                      const cat=CATEGORIES.find(c=>c.id===tx.category);
                      const soon=isDueSoon(tx.dueDay);
                      return (
                        <div key={tx.id} style={{display:'flex',alignItems:'center',gap:10,
                            background:soon?'var(--fc-amber-tint)':'var(--fc-surface-2)',
                            border:`1px solid ${soon?'rgba(217,152,80,.32)':'var(--fc-border)'}`,
                            borderRadius:14,padding:'11px 14px'}}>
                          <IconTile name={cat?.icon||'wallet'} color={cat?.tone||'muted'} size={34}/>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{fontSize:12,fontWeight:600,color:'var(--fc-fg-1)',overflow:'hidden',
                                textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}</p>
                            <p style={{fontSize:10,color:'var(--fc-fg-3)',marginTop:2}}>
                              {cat?.label}
                              {tx.dueDay&&<span style={{color:soon?'var(--fc-amber)':'var(--fc-fg-3)'}}> · día {tx.dueDay}</span>}
                              {soon&&<span style={{color:'var(--fc-amber)'}}> ⚠</span>}
                            </p>
                          </div>
                          <div style={{flexShrink:0,textAlign:'right'}}>
                            <p style={{fontSize:13,fontWeight:700,color:'var(--fc-pink)',fontVariantNumeric:'tabular-nums'}}>
                              {fmt(tx.amount,'−')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {income>0 && (
                    <div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,
                          color:'var(--fc-fg-3)',marginBottom:6}}>
                        <span>Impacto sobre ingresos</span>
                        <span style={{color:'var(--fc-pink)',fontWeight:700}}>
                          {Math.round((monthlyCommitted/income)*100)}%
                        </span>
                      </div>
                      <div style={{height:6,background:'var(--fc-surface-2)',borderRadius:99,overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:99,
                            width:`${Math.min(100,Math.round((monthlyCommitted/income)*100))}%`,
                            background:'linear-gradient(to right,var(--fc-pink),var(--fc-pink-hi))',
                            transition:'width .6s ease'}}/>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Últimos movimientos */}
            <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border)',borderRadius:24,padding:0,overflow:'hidden',gridColumn:'1/-1'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px 16px'}}>
                <h2 style={{fontSize:17,fontWeight:700,color:'var(--fc-fg-1)',margin:0}}>Últimos movimientos</h2>
                <button onClick={()=>setTab('records')}
                  style={{fontSize:13,color:'var(--fc-violet-hi)',background:'none',border:'none',
                    cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontFamily:'var(--fc-font-sans)',fontWeight:600}}>
                  Ver todos <Icon name="chevronRight" size={14}/>
                </button>
              </div>
              {txs.length===0 ? (
                <div style={{textAlign:'center',padding:'24px',color:'var(--fc-fg-3)',fontSize:13}}>
                  Todavía no hay movimientos. ¡Agregá el primero!
                </div>
              ) : txs.slice(0,5).map(tx=>{
                const cat=CATEGORIES.find(c=>c.id===tx.category);
                const isIncome=tx.type==='income';
                return (
                  <div key={tx.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 24px',
                      borderTop:'1px solid var(--fc-divider)'}}>
                    <IconTile name={cat?.icon||'wallet'} color={cat?.tone||'muted'} size={38}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:14,fontWeight:600,color:'var(--fc-fg-1)',overflow:'hidden',
                          textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description||tx.concept}</p>
                      <p style={{fontSize:12,color:'var(--fc-fg-3)',marginTop:3}}>
                        {cat?.label} · {fmtDate(tx.date)}
                      </p>
                    </div>
                    <div style={{fontSize:15,fontWeight:700,fontVariantNumeric:'tabular-nums',
                        color:isIncome?'var(--fc-green)':'var(--fc-pink)'}}>
                      {fmt(tx.amount,isIncome?'+':'−')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CHARTS ── */}
        {tab==='charts' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            {/* Gastos por categoría — barras */}
            <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border)',borderRadius:24,padding:24}}>
              <h2 style={{fontSize:17,fontWeight:700,color:'var(--fc-fg-1)',margin:'0 0 4px'}}>Gastos por categoría</h2>
              <p style={{fontSize:12,color:'var(--fc-fg-3)',marginBottom:20}}>
                {fmt(expenses,'−')} este mes
              </p>
              {byCat.length===0 ? (
                <div style={{textAlign:'center',color:'var(--fc-fg-3)',padding:32,fontSize:13}}>Sin gastos cargados.</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  {byCat.map(({id,label,icon,tone,val})=>(
                    <div key={id}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:10,fontSize:13,fontWeight:600,color:'var(--fc-fg-1)'}}>
                          <IconTile name={icon} color={tone} size={28}/>
                          {label}
                        </span>
                        <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',color:'var(--fc-fg-1)'}}>
                          {fmt(val)}
                        </span>
                      </div>
                      <div style={{height:6,background:'var(--fc-surface-2)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:3,
                            width:`${expenses>0?(val/expenses)*100:0}%`,
                            background:tone==='pink'?'var(--fc-pink)':tone==='amber'?'var(--fc-amber)':tone==='green'?'var(--fc-green)':'var(--fc-violet)',
                            transition:'width .4s var(--fc-ease)'}}/>
                      </div>
                      <div style={{fontSize:11,color:'var(--fc-fg-3)',marginTop:3,textAlign:'right'}}>
                        {expenses>0?Math.round((val/expenses)*100):0}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Distribución por fuente — donut mejorado */}
            <DonutWithTooltip slices={sourceSlices} total={sourceTotal}/>

            {/* Evolución mensual */}
            <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border)',
                borderRadius:24,padding:24,gridColumn:'1/-1'}}>
              <h2 style={{fontSize:17,fontWeight:700,color:'var(--fc-fg-1)',margin:'0 0 4px'}}>Ingresos vs Gastos</h2>
              <p style={{fontSize:12,color:'var(--fc-fg-3)',marginBottom:20}}>Últimos 6 meses</p>
              {monthlyData.every(m=>m.Ingresos===0&&m.Gastos===0) ? (
                <div style={{textAlign:'center',color:'var(--fc-fg-3)',padding:32,fontSize:13}}>
                  Agregá movimientos para ver la evolución mensual.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{top:28,right:10,left:10,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--fc-divider)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:'var(--fc-fg-3)',fontSize:12}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'var(--fc-fg-3)',fontSize:11}} axisLine={false} tickLine={false}
                      tickFormatter={v=>v>=1000?`$${(v/1000).toFixed(0)}k`:''} width={52}/>
                    <Tooltip contentStyle={{background:'var(--fc-surface)',border:'1px solid var(--fc-border-strong)',
                        borderRadius:12,fontSize:13}} formatter={v=>fmt(v)}/>
                    <Legend wrapperStyle={{fontSize:13,color:'var(--fc-fg-2)',paddingTop:10}}/>
                    <Bar dataKey="Ingresos" fill="var(--fc-green)" radius={[5,5,0,0]} maxBarSize={32}>
                      <LabelList dataKey="net" position="top" content={({x,y,width,value})=>{
                        if(!value&&value!==0) return null;
                        return (
                          <text x={Number(x)+Number(width)/2+18} y={Number(y)-8}
                            textAnchor="middle" fill={value>=0?'var(--fc-green)':'var(--fc-pink)'}
                            fontSize={10} fontWeight="700">
                            {value>=0?'+':'-'}${Math.abs(value>=1000?Math.round(value/1000):value)}{value>=1000?'k':''}
                          </text>
                        );
                      }}/>
                    </Bar>
                    <Bar dataKey="Gastos" fill="var(--fc-pink)" radius={[5,5,0,0]} maxBarSize={32}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ── RECORDS ── */}
        {tab==='records' && (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {/* Filters */}
            <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border)',borderRadius:20,padding:16}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{position:'relative',flex:1}}>
                  <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',
                      color:'var(--fc-fg-3)',display:'flex'}}>
                    <Icon name="search" size={17}/>
                  </span>
                  <input value={query} onChange={e=>setQuery(e.target.value)}
                    placeholder="Buscar movimiento…"
                    style={{width:'100%',background:'var(--fc-surface-2)',border:'1px solid var(--fc-border-strong)',
                      color:'var(--fc-fg-1)',borderRadius:12,height:44,paddingLeft:42,paddingRight:14,
                      fontFamily:'var(--fc-font-sans)',fontSize:13,outline:'none'}}/>
                </div>
                <div style={{display:'flex',gap:4,background:'var(--fc-surface-2)',
                    border:'1px solid var(--fc-border)',borderRadius:12,padding:4,flexShrink:0}}>
                  {[['all','Todos'],['income','Ingresos'],['expense','Gastos'],['recurring','Fijos']].map(([v,l])=>(
                    <div key={v} onClick={()=>setFilterType(v)}
                      style={{padding:'8px 12px',borderRadius:9,fontSize:12,fontWeight:600,cursor:'pointer',
                        color:filterType===v?'var(--fc-fg-1)':'var(--fc-fg-3)',
                        background:filterType===v?'var(--fc-surface-3)':'transparent',
                        transition:'all var(--fc-dur-fast) var(--fc-ease)'}}>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
              {availableCats.length>2 && (
                <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
                  {availableCats.map(cat=>{
                    const c=cat!=='all'?CATEGORIES.find(x=>x.id===cat):null;
                    const color=c?{pink:'var(--fc-pink)',green:'var(--fc-green)',amber:'var(--fc-amber)',violet:'var(--fc-violet-hi)',info:'var(--fc-info)',muted:'var(--fc-fg-2)'}[c.tone]:'var(--fc-violet-hi)';
                    return (
                      <button key={cat} onClick={()=>setFilterCat(cat)}
                        style={{flexShrink:0,padding:'6px 12px',borderRadius:999,fontSize:11,fontWeight:600,
                          border:`1px solid ${filterCat===cat?color:'var(--fc-border-strong)'}`,cursor:'pointer',
                          fontFamily:'var(--fc-font-sans)',transition:'all .18s',whiteSpace:'nowrap',
                          background:filterCat===cat?color+'22':'none',
                          color:filterCat===cat?color:'var(--fc-fg-3)'}}>
                        {cat==='all'?'Todas':CATEGORIES.find(x=>x.id===cat)?.label||cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary stats */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
              {[
                {label:'Total ingresos',val:income,    tone:'green',  icon:'trendUp'},
                {label:'Total gastos',  val:expenses,  tone:'pink',   icon:'trendDown'},
                {label:'Balance',       val:balance,   tone:'violet', icon:'wallet'},
              ].map(({label,val,tone,icon})=>{
                const palettes={green:{color:'var(--fc-green)',bg:'var(--fc-green-tint)',bd:'var(--fc-green-ring)'},
                  pink:{color:'var(--fc-pink)',bg:'var(--fc-pink-tint)',bd:'var(--fc-pink-ring)'},
                  violet:{color:'var(--fc-violet-hi)',bg:'var(--fc-violet-tint)',bd:'var(--fc-violet-ring)'}};
                const p=palettes[tone];
                return (
                  <div key={label} style={{background:'var(--fc-surface)',border:`1px solid ${p.bd}`,
                      borderRadius:18,padding:18}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <IconTile name={icon} color={tone}/>
                      <span style={{fontSize:12,color:'var(--fc-fg-3)',fontWeight:600}}>{label}</span>
                    </div>
                    <div style={{fontSize:24,fontWeight:700,color:p.color,fontVariantNumeric:'tabular-nums'}}>
                      {fmt(val,tone==='pink'?'−':'+')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grouped transactions */}
            {filtered.length===0 ? (
              <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border)',
                  borderRadius:20,padding:48,textAlign:'center',color:'var(--fc-fg-3)'}}>
                <Icon name="list" size={32} style={{margin:'0 auto 12px',display:'block',opacity:.3}}/>
                <p style={{fontSize:13}}>{txs.length===0?'Todavía no hay movimientos':'Sin resultados'}</p>
              </div>
            ) : (() => {
              const groups={};
              filtered.forEach(tx=>{if(!groups[tx.date])groups[tx.date]=[];groups[tx.date].push(tx);});
              return Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(date=>{
                const dayTxs=groups[date];
                const dayNet=dayTxs.reduce((s,t)=>t.type==='income'?s+t.amount:s-t.amount,0);
                return (
                  <div key={date}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                        padding:'12px 20px 8px',background:'var(--fc-bg-2)',borderRadius:'12px 12px 0 0',
                        border:'1px solid var(--fc-border)',borderBottom:'none'}}>
                      <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',
                          textTransform:'uppercase',color:'var(--fc-fg-3)'}}>
                        {fmtDateLong(date)}
                      </div>
                      <div style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
                          display:'inline-flex',alignItems:'center',gap:6,
                          color:dayNet===0?'var(--fc-fg-2)':dayNet>0?'var(--fc-green)':'var(--fc-pink)'}}>
                        <Icon name={dayNet>0?'trendUp':dayNet<0?'trendDown':'wallet'} size={14} stroke={2}/>
                        {fmt(dayNet,dayNet>=0?'+':'−')}
                      </div>
                    </div>
                    <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border)',
                        borderTop:'none',borderRadius:'0 0 16px 16px',overflow:'hidden'}}>
                      {dayTxs.map(tx=>{
                        const cat=CATEGORIES.find(c=>c.id===tx.category);
                        const bank=ARG_BANKS.find(b=>b.id===tx.wallet)||null;
                        const isIncome=tx.type==='income';
                        return (
                          <div key={tx.id} style={{borderBottom:'1px solid var(--fc-divider)'}}>
                            <SwipeableRow id={tx.id} onDeleteRequest={setDeleteId}>
                              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',
                                  transition:'background var(--fc-dur-fast) var(--fc-ease)'}}
                                onMouseEnter={e=>e.currentTarget.style.background='var(--fc-surface-2)'}
                                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                <IconTile name={cat?.icon||'wallet'} color={cat?.tone||'muted'} size={38}/>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <span style={{fontSize:14,fontWeight:600,color:'var(--fc-fg-1)',
                                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                      {tx.description||tx.concept}
                                    </span>
                                    {tx.recurring && <Badge tone="amber">FIJO</Badge>}
                                  </div>
                                  <div style={{fontSize:12,color:'var(--fc-fg-3)',marginTop:4,
                                      display:'flex',gap:8,alignItems:'center'}}>
                                    <span>{cat?.label||tx.category}</span>
                                    <span style={{opacity:.4}}>·</span>
                                    {tx.wallet==='manual'||tx.wallet==='efectivo'
                                      ? <span>Efectivo</span>
                                      : bank ? <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                                          <BankBadge bankId={bank.id} size={16}/>
                                          {bank.name}
                                        </span>
                                      : <span>{tx.wallet}</span>
                                    }
                                  </div>
                                </div>
                                <div style={{fontSize:15,fontWeight:700,fontVariantNumeric:'tabular-nums',
                                    color:isIncome?'var(--fc-green)':'var(--fc-pink)',flexShrink:0}}>
                                  {fmt(tx.amount,isIncome?'+':'−')}
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
      </div>

      {/* FAB */}
      <button onClick={()=>setShowAddTx(true)}
        style={{position:'fixed',bottom:28,right:28,width:64,height:64,borderRadius:24,
          background:'var(--fc-grad-fab)',boxShadow:'var(--fc-shadow-fab)',border:0,cursor:'pointer',
          color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,
          transition:'transform var(--fc-dur-fast) var(--fc-ease)'}}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.07)'}
        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
        <Icon name="plus" size={28} stroke={2.4} style={{color:'#fff'}}/>
      </button>

      {/* TOAST */}
      {toast && (
        <div style={{position:'fixed',bottom:108,left:'50%',transform:'translateX(-50%)',zIndex:400,
            padding:'10px 18px',borderRadius:12,fontSize:13,fontWeight:600,whiteSpace:'nowrap',
            pointerEvents:'none',animation:'fcSlideUp .3s var(--fc-ease)',
            background:toast.ok?'var(--fc-green-tint)':'var(--fc-pink-tint)',
            border:`1px solid ${toast.ok?'var(--fc-green-ring)':'var(--fc-pink-ring)'}`,
            color:toast.ok?'var(--fc-green)':'var(--fc-pink)'}}>
          {toast.msg}
        </div>
      )}

      {/* ADD TX MODAL */}
      {showAddTx && <AddTxModal activeWalletKeys={activeWalletKeys} walletBalance={walletBalance}
        onSave={addTx} onClose={()=>setShowAddTx(false)}/>}

      {/* DELETE CONFIRM */}
      {deleteId && (
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',
            justifyContent:'center',padding:'16px 20px',background:'var(--fc-overlay)',
            backdropFilter:'blur(6px)',animation:'fcFade 200ms var(--fc-ease)'}}
          onClick={e=>{if(e.target===e.currentTarget)setDeleteId(null);}}>
          <div style={{width:'100%',maxWidth:340,background:'var(--fc-bg-2)',
              border:'1px solid var(--fc-border-strong)',borderRadius:22,padding:24,
              animation:'fcPop 220ms var(--fc-ease)'}}>
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{width:48,height:48,borderRadius:14,background:'var(--fc-pink-tint)',
                  border:'1px solid var(--fc-pink-ring)',display:'flex',alignItems:'center',
                  justifyContent:'center',margin:'0 auto 14px'}}>
                <Icon name="trash" size={22} style={{color:'var(--fc-pink)'}}/>
              </div>
              <h3 style={{fontSize:16,fontWeight:700,marginBottom:8,color:'var(--fc-fg-1)'}}>¿Eliminar movimiento?</h3>
              <p style={{fontSize:13,color:'var(--fc-fg-3)'}}>Esta acción no se puede deshacer.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button onClick={()=>setDeleteId(null)}
                style={{padding:'12px',borderRadius:12,fontSize:13,fontWeight:600,
                  background:'var(--fc-surface-2)',border:'1px solid var(--fc-border-strong)',
                  color:'var(--fc-fg-2)',cursor:'pointer',fontFamily:'var(--fc-font-sans)'}}>
                Cancelar
              </button>
              <button onClick={doDelete}
                style={{padding:'12px',borderRadius:12,fontSize:13,fontWeight:600,
                  background:'var(--fc-pink-tint)',border:'1px solid var(--fc-pink-ring)',
                  color:'var(--fc-pink)',cursor:'pointer',fontFamily:'var(--fc-font-sans)'}}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRM */}
      {showLogout && (
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',
            justifyContent:'center',padding:'16px 20px',background:'var(--fc-overlay)',
            backdropFilter:'blur(6px)',animation:'fcFade 200ms var(--fc-ease)'}}
          onClick={e=>{if(e.target===e.currentTarget)setShowLogout(false);}}>
          <div style={{width:'100%',maxWidth:360,background:'var(--fc-bg-2)',
              border:'1px solid var(--fc-border-strong)',borderRadius:22,padding:24,
              animation:'fcPop 220ms var(--fc-ease)'}}>
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{width:48,height:48,borderRadius:14,background:'var(--fc-pink-tint)',
                  border:'1px solid var(--fc-pink-ring)',display:'flex',alignItems:'center',
                  justifyContent:'center',margin:'0 auto 14px'}}>
                <Icon name="logout" size={22} style={{color:'var(--fc-pink)'}}/>
              </div>
              <h3 style={{fontSize:16,fontWeight:700,marginBottom:6,color:'var(--fc-fg-1)'}}>Cerrar sesión</h3>
              <p style={{fontSize:13,color:'var(--fc-fg-3)'}}>Tus datos quedan guardados en la nube.</p>
              <p style={{fontSize:12,color:'var(--fc-fg-4)',marginTop:6}}>{email}</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button onClick={()=>setShowLogout(false)}
                style={{padding:'12px',borderRadius:12,fontSize:13,fontWeight:600,
                  background:'var(--fc-surface-2)',border:'1px solid var(--fc-border-strong)',
                  color:'var(--fc-fg-2)',cursor:'pointer',fontFamily:'var(--fc-font-sans)'}}>
                Cancelar
              </button>
              <button onClick={()=>{setShowLogout(false);onLogout();}}
                style={{padding:'12px',borderRadius:12,fontSize:13,fontWeight:600,
                  background:'var(--fc-pink-tint)',border:'1px solid var(--fc-pink-ring)',
                  color:'var(--fc-pink)',cursor:'pointer',fontFamily:'var(--fc-font-sans)'}}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WALLET MANAGER */}
      {showWalletMgr && <WalletManager activeKeys={activeWalletKeys}
        onSave={saveWallets} onClose={()=>setShowWalletMgr(false)}/>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DONUT WITH TOOLTIP — posicionado fuera de la dona
═══════════════════════════════════════════════════════════ */
function DonutWithTooltip({ slices, total }) {
  const [tip, setTip] = useState(null);
  const hasData = total>0 && slices.some(s=>s.val>0);
  return (
    <div style={{background:'var(--fc-surface)',border:'1px solid var(--fc-border)',borderRadius:24,padding:24}}>
      <h2 style={{fontSize:17,fontWeight:700,color:'var(--fc-fg-1)',margin:'0 0 4px'}}>Distribución por fuente</h2>
      <p style={{fontSize:12,color:'var(--fc-fg-3)',marginBottom:20}}>Saldo por billetera</p>
      {!hasData ? (
        <div style={{textAlign:'center',color:'var(--fc-fg-3)',padding:40,fontSize:13,minHeight:200,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
          Cargá ingresos para ver la distribución.
        </div>
      ) : (
        <>
          <div style={{position:'relative',marginBottom:4}}>
            {/* Tooltip arriba de la dona */}
            <div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',
                zIndex:20,pointerEvents:'none',
                opacity:tip?1:0,transition:'opacity .15s ease'}}>
              {tip && (
                <div style={{background:'var(--fc-surface)',border:`1px solid ${tip.color}55`,
                    borderRadius:12,padding:'10px 14px',whiteSpace:'nowrap',
                    boxShadow:'var(--fc-shadow-2)',display:'flex',flexDirection:'column',
                    alignItems:'center',gap:3}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <span style={{width:9,height:9,borderRadius:'50%',background:tip.color,flexShrink:0}}/>
                    <span style={{fontSize:12,fontWeight:700,color:'var(--fc-fg-1)'}}>{tip.label}</span>
                  </div>
                  <span style={{fontSize:14,fontWeight:700,color:tip.color,fontVariantNumeric:'tabular-nums'}}>
                    {fmt(tip.val)}
                  </span>
                  <span style={{fontSize:11,color:'var(--fc-fg-3)'}}>
                    {total>0?Math.round((tip.val/total)*100):0}% del total
                  </span>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={slices} cx="50%" cy="50%" innerRadius={60} outerRadius={88}
                     paddingAngle={4} dataKey="val" strokeWidth={0}
                     onMouseEnter={d=>setTip(d)}
                     onMouseLeave={()=>setTip(null)}>
                  {slices.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Centro */}
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
                textAlign:'center',pointerEvents:'none',zIndex:1}}>
              <p style={{fontSize:10,color:'var(--fc-fg-3)',fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>Total</p>
              <p style={{fontSize:14,fontWeight:700,color:'var(--fc-fg-1)',fontVariantNumeric:'tabular-nums'}}>
                {fmt(total)}
              </p>
            </div>
          </div>
          {/* Leyenda */}
          <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:12}}>
            {slices.map(s=>{
              const pct=total>0?Math.round((s.val/total)*100):0;
              return (
                <div key={s.id}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <BankBadge bankId={s.id} size={20}/>
                      <span style={{fontSize:12,fontWeight:600,color:'var(--fc-fg-1)'}}>{s.label}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontSize:11,color:'var(--fc-fg-3)',fontVariantNumeric:'tabular-nums'}}>
                        {fmt(s.val)}
                      </span>
                      <span style={{fontSize:13,fontWeight:700,color:s.color,minWidth:36,textAlign:'right',
                          fontVariantNumeric:'tabular-nums'}}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{height:5,background:'var(--fc-surface-2)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:99,width:`${pct}%`,background:s.color,transition:'width .4s var(--fc-ease)'}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADD TRANSACTION MODAL — diseño nuevo
═══════════════════════════════════════════════════════════ */
function AddTxModal({ activeWalletKeys, walletBalance, onSave, onClose }) {
  const [type, setType]         = useState('expense');
  const [amount, setAmount]     = useState('');
  const [concept, setConcept]   = useState('');
  const [category, setCategory] = useState('comida');
  const [wallet, setWallet]     = useState('efectivo');
  const [source, setSource]     = useState('efectivo'); // efectivo o digital
  const [fixed, setFixed]       = useState(false);
  const [dueDay, setDueDay]     = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [date, setDate]         = useState(todayISO());

  const cats = CATEGORIES.filter(c=>c.type===type);
  const digitalWallets = activeWalletKeys.filter(k=>k!=='efectivo');
  const valid = parseFloat(amount)>0 && concept.trim().length>0;

  const submit = () => {
    if(!valid) return;
    const backendCat = category;
    onSave({
      type, amount:parseFloat(amount), description:concept.trim(),
      category:backendCat, wallet:source==='efectivo'?'efectivo':wallet,
      source:source==='efectivo'?'cash':'digital',
      date, recurring:fixed, dueDay:fixed?dueDay:'',
      wallet_name:source==='efectivo'?'manual':(ARG_BANKS.find(b=>b.id===wallet)?.id||wallet),
    });
  };

  // Featured (first 2) + extra for dropdown
  const featured = digitalWallets.slice(0,2);
  const extra    = digitalWallets.slice(2);
  const selInExtra = extra.find(k=>k===wallet);

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,
        background:'var(--fc-overlay)',display:'flex',alignItems:'center',justifyContent:'center',
        padding:20,animation:'fcFade 200ms var(--fc-ease)'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'min(540px,100%)',maxHeight:'92vh',
          background:'var(--fc-bg-2)',border:'1px solid var(--fc-border-strong)',borderRadius:22,
          padding:22,boxShadow:'var(--fc-shadow-3)',animation:'fcPop 220ms var(--fc-ease)',
          display:'flex',flexDirection:'column',gap:16,overflowY:'auto'}}>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h2 style={{fontSize:18,fontWeight:700,letterSpacing:'-0.02em',color:'var(--fc-fg-1)'}}>
            Nuevo movimiento
          </h2>
          <button onClick={onClose} style={{width:36,height:36,borderRadius:10,
              background:'var(--fc-surface-2)',border:'none',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',color:'var(--fc-fg-2)'}}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        {/* Income / Expense */}
        <div style={{display:'flex',gap:6,background:'var(--fc-surface-2)',
            border:'1px solid var(--fc-border)',borderRadius:14,padding:5}}>
          {[['expense','Gasto'],['income','Ingreso']].map(([v,l])=>(
            <div key={v} onClick={()=>{setType(v);setCategory(v==='expense'?'comida':'sueldo');}}
              style={{flex:1,padding:'11px',borderRadius:11,fontSize:14,fontWeight:600,
                textAlign:'center',cursor:'pointer',transition:'all var(--fc-dur-fast) var(--fc-ease)',
                color:type===v?'#fff':v==='expense'?'var(--fc-pink)':'var(--fc-green)',
                background:type===v?v==='expense'?'#8b1a2f':'#1a5c3d':'transparent',
                boxShadow:type===v?'var(--fc-shadow-2)':'none'}}>
              {l}
            </div>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
              color:'var(--fc-fg-3)',display:'block',marginBottom:6}}>Monto</label>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',
                color:'var(--fc-fg-3)',fontSize:18,fontWeight:600}}>$</span>
            <input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))}
              placeholder="0" inputMode="decimal"
              style={{width:'100%',height:52,background:'var(--fc-surface)',
                border:'1px solid var(--fc-border-strong)',borderRadius:12,paddingLeft:30,paddingRight:14,
                color:type==='income'?'var(--fc-green)':'var(--fc-pink)',
                fontSize:24,fontWeight:700,fontVariantNumeric:'tabular-nums',outline:'none',fontFamily:'var(--fc-font-sans)'}}
              onFocus={e=>e.target.style.borderColor='var(--fc-violet)'}
              onBlur={e=>e.target.style.borderColor='var(--fc-border-strong)'}/>
          </div>
        </div>

        {/* Concept */}
        <div>
          <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
              color:'var(--fc-fg-3)',display:'block',marginBottom:6}}>Concepto</label>
          <input value={concept} onChange={e=>setConcept(e.target.value)}
            placeholder="Ej: Supermercado Coto"
            style={{width:'100%',height:44,background:'var(--fc-surface)',
              border:'1px solid var(--fc-border-strong)',borderRadius:12,padding:'0 14px',
              color:'var(--fc-fg-1)',fontSize:14,outline:'none',fontFamily:'var(--fc-font-sans)'}}
            onFocus={e=>e.target.style.borderColor='var(--fc-violet)'}
            onBlur={e=>e.target.style.borderColor='var(--fc-border-strong)'}/>
        </div>

        {/* Category chips */}
        <div>
          <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
              color:'var(--fc-fg-3)',display:'block',marginBottom:8}}>Categoría</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {cats.map(c=>{
              const active=category===c.id;
              return (
                <div key={c.id} onClick={()=>setCategory(c.id)}
                  style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:999,
                    fontSize:12,fontWeight:600,cursor:'pointer',transition:'all var(--fc-dur-fast) var(--fc-ease)',
                    background:active?'var(--fc-violet-tint)':'var(--fc-surface)',
                    border:`1px solid ${active?'var(--fc-violet-ring)':'var(--fc-border-strong)'}`,
                    color:active?'var(--fc-violet-hi)':'var(--fc-fg-2)'}}>
                  <Icon name={c.icon} size={12}/>
                  {c.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Date */}
        <div className="date-source-grid">
          <div>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
                color:'var(--fc-fg-3)',display:'block',marginBottom:6}}>Fecha</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{width:'100%',height:44,background:'var(--fc-surface)',
                border:'1px solid var(--fc-border-strong)',borderRadius:12,padding:'0 14px',
                color:'var(--fc-fg-1)',fontSize:13,outline:'none',fontFamily:'var(--fc-font-sans)'}}/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
                color:'var(--fc-fg-3)',display:'block',marginBottom:6}}>Fuente</label>
            <div style={{display:'flex',gap:4,background:'var(--fc-surface)',
                border:'1px solid var(--fc-border-strong)',borderRadius:12,padding:4}}>
              {[['efectivo','💵 Efectivo'],['digital','💳 Digital']].map(([v,l])=>(
                <button key={v} onClick={()=>{setSource(v);if(v==='efectivo')setWallet('efectivo');else if(digitalWallets.length>0)setWallet(digitalWallets[0]);}}
                  style={{flex:1,padding:'8px 6px',borderRadius:9,fontSize:12,fontWeight:600,
                    border:'none',cursor:'pointer',fontFamily:'var(--fc-font-sans)',transition:'all .18s',
                    background:source===v?'var(--fc-violet-tint)':'transparent',
                    color:source===v?'var(--fc-violet-hi)':'var(--fc-fg-3)'}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Wallet picker */}
        {source==='digital' && (
          <div style={{animation:'fcSlideUp .2s var(--fc-ease) both'}}>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
                color:'var(--fc-fg-3)',display:'block',marginBottom:8}}>
              {type==='expense'?'¿Desde qué billetera salió?':'¿En qué billetera entró?'}
            </label>
            {digitalWallets.length===0 ? (
              <div style={{padding:14,borderRadius:12,background:'var(--fc-surface)',
                  border:'1px solid var(--fc-border-strong)',textAlign:'center'}}>
                <p style={{fontSize:12,color:'var(--fc-fg-3)',marginBottom:6}}>Sin billeteras digitales activas</p>
              </div>
            ) : (
              <>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:featured.length>0&&extra.length>0?8:0}}>
                  {featured.map(wid=>{
                    const bank=ARG_BANKS.find(b=>b.id===wid);
                    if(!bank) return null;
                    const wBal=walletBalance(wid);
                    const req=parseFloat(amount)||0;
                    const insuf=type==='expense'&&req>0&&wBal<req;
                    const sel=wallet===wid&&!selInExtra;
                    return (
                      <button key={wid} onClick={()=>{if(!insuf){setWallet(wid);setDropOpen(false);}}}
                        style={{display:'flex',flexDirection:'column',gap:5,padding:'11px 13px',
                          borderRadius:12,border:`1.5px solid ${insuf?'var(--fc-border)':sel?bank.color:' var(--fc-border-strong)'}`,
                          background:insuf?'var(--fc-bg)':sel?bank.color+'12':'var(--fc-surface)',
                          cursor:insuf?'not-allowed':'pointer',opacity:insuf?.4:1,
                          fontFamily:'var(--fc-font-sans)',transition:'all .18s',textAlign:'left'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <BankBadge bankId={wid} size={24}/>
                          <span style={{fontSize:12,fontWeight:700,color:insuf?'var(--fc-fg-3)':sel?bank.color:'var(--fc-fg-2)'}}>
                            {bank.name}
                          </span>
                          {insuf&&<span style={{fontSize:9,fontWeight:700,color:'var(--fc-pink)',
                              background:'var(--fc-pink-tint)',borderRadius:5,padding:'1px 5px'}}>sin saldo</span>}
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between'}}>
                          <span style={{fontSize:10,color:'var(--fc-fg-3)'}}>{bank.type}</span>
                          <span style={{fontSize:10,fontWeight:700,fontVariantNumeric:'tabular-nums',
                              color:wBal>0?'var(--fc-green)':'var(--fc-fg-3)'}}>
                            {fmt(wBal,wBal>=0?'+':'−')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {extra.length>0 && (
                  <div>
                    <button onClick={()=>setDropOpen(d=>!d)}
                      style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'10px 13px',
                        borderRadius:11,border:`1.5px solid ${selInExtra?ARG_BANKS.find(b=>b.id===selInExtra)?.color||'var(--fc-violet)':dropOpen?'var(--fc-violet)':'var(--fc-border-strong)'}`,
                        cursor:'pointer',fontFamily:'var(--fc-font-sans)',fontSize:12,fontWeight:600,
                        transition:'all .18s',background:selInExtra||dropOpen?'var(--fc-violet-tint)':'var(--fc-surface)',
                        color:selInExtra?ARG_BANKS.find(b=>b.id===selInExtra)?.color||'var(--fc-violet-hi)':dropOpen?'var(--fc-violet-hi)':'var(--fc-fg-3)'}}>
                      <Icon name="chevronDown" size={14}
                        style={{transform:dropOpen?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}/>
                      <span style={{flex:1,textAlign:'left'}}>
                        {selInExtra?ARG_BANKS.find(b=>b.id===selInExtra)?.name:'Más billeteras'}
                      </span>
                      <span style={{fontSize:10,background:'var(--fc-surface-2)',padding:'2px 7px',
                          borderRadius:20,color:'var(--fc-fg-3)'}}>+{extra.length}</span>
                    </button>
                    {dropOpen && (
                      <div style={{background:'var(--fc-surface-2)',border:'1px solid var(--fc-border-strong)',
                          borderRadius:11,overflow:'hidden',marginTop:4,animation:'fcSlideUp .15s var(--fc-ease) both'}}>
                        {extra.map(wid=>{
                          const bank=ARG_BANKS.find(b=>b.id===wid); if(!bank) return null;
                          const wBal=walletBalance(wid);
                          const sel2=wallet===wid;
                          return (
                            <div key={wid} onClick={()=>{setWallet(wid);setDropOpen(false);}}
                              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
                                cursor:'pointer',borderBottom:'1px solid var(--fc-divider)',
                                background:sel2?'var(--fc-violet-tint)':'transparent',
                                transition:'background var(--fc-dur-fast) var(--fc-ease)'}}
                              onMouseEnter={e=>{if(!sel2)e.currentTarget.style.background='var(--fc-surface-3)';}}
                              onMouseLeave={e=>{if(!sel2)e.currentTarget.style.background='transparent';}}>
                              <BankBadge bankId={wid} size={28}/>
                              <div style={{flex:1}}>
                                <span style={{fontSize:12,fontWeight:600,color:sel2?'var(--fc-violet-hi)':'var(--fc-fg-1)'}}>
                                  {bank.name}
                                </span>
                              </div>
                              <span style={{fontSize:11,fontWeight:700,fontVariantNumeric:'tabular-nums',
                                  color:wBal>0?'var(--fc-green)':'var(--fc-fg-3)'}}>
                                {fmt(wBal,wBal>=0?'+':'−')}
                              </span>
                              {sel2&&<Icon name="check" size={14} stroke={2} style={{color:'var(--fc-violet-hi)',flexShrink:0}}/>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Fixed toggle */}
        {type==='expense' && (
          <div>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
                color:'var(--fc-fg-3)',display:'block',marginBottom:8}}>¿Qué tipo de gasto?</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[[false,'🛒 Puntual','Compra, café…'],[true,'📅 Fijo mensual','Alquiler, wifi…']].map(([v,lbl,sub])=>(
                <button key={String(v)} onClick={()=>setFixed(v)}
                  style={{display:'flex',flexDirection:'column',gap:4,padding:'11px 13px',
                    borderRadius:12,border:`1.5px solid ${fixed===v?'var(--fc-violet-ring)':'var(--fc-border-strong)'}`,
                    background:fixed===v?'var(--fc-violet-tint)':'var(--fc-surface)',
                    cursor:'pointer',fontFamily:'var(--fc-font-sans)',transition:'all .18s',textAlign:'left'}}>
                  <span style={{fontSize:12,fontWeight:700,color:fixed===v?'var(--fc-violet-hi)':'var(--fc-fg-2)'}}>{lbl}</span>
                  <span style={{fontSize:10,color:fixed===v?'var(--fc-violet-hi)':'var(--fc-fg-3)',opacity:.8}}>{sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Due day */}
        {type==='expense' && fixed && (
          <div style={{animation:'fcSlideUp .2s var(--fc-ease) both'}}>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
                color:'var(--fc-fg-3)',display:'block',marginBottom:6}}>
              Día de vencimiento <span style={{fontWeight:400,textTransform:'none',letterSpacing:0}}>(opcional)</span>
            </label>
            <div style={{display:'flex',alignItems:'center',gap:10,background:'var(--fc-surface)',
                border:`1px solid ${dueDay?'var(--fc-amber)':'var(--fc-border-strong)'}`,borderRadius:12,
                padding:'0 14px',height:44}}>
              <Icon name="calendar" size={14} style={{color:'var(--fc-amber)',flexShrink:0}}/>
              <input type="number" min="1" max="31" value={dueDay}
                onChange={e=>setDueDay(e.target.value)} placeholder="Ej: 5"
                style={{background:'none',border:'none',outline:'none',flex:1,
                    fontSize:14,color:'var(--fc-fg-1)',fontFamily:'var(--fc-font-sans)'}}/>
              {dueDay&&<span style={{fontSize:12,color:'var(--fc-fg-3)',whiteSpace:'nowrap'}}>de cada mes</span>}
            </div>
          </div>
        )}

        {/* Submit */}
        <button disabled={!valid} onClick={submit}
          style={{width:'100%',height:48,borderRadius:14,border:0,color:'#fff',marginTop:2,
            background:type==='expense'?'#8b1a2f':'#1a5c3d',
            boxShadow:valid?'var(--fc-shadow-2)':'none',
            fontSize:14,fontWeight:700,opacity:valid?1:0.45,fontFamily:'var(--fc-font-sans)',cursor:valid?'pointer':'not-allowed'}}>
          Guardar movimiento
        </button>
      </div>
    </div>
  );
}

// Inject global CSS
const styleEl = document.createElement('style');
styleEl.textContent = GLOBAL_CSS;
document.head.appendChild(styleEl);
