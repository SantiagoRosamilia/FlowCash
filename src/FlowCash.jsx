import { useState, useEffect, useRef, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { authApi, txApi, walletApi } from './api.js';

/* ── CSS global ─────────────────────────────────────────── */
const G = `
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800&display=swap");
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:#0c0e1a;color:rgba(244,245,250,.94);font-family:"Plus Jakarta Sans",system-ui,sans-serif;font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
input,select,button{font-family:inherit}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.5)}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{display:none}
select option{background:#1c1f30}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes popIn{from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes slotU{from{transform:translateY(60%);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes slotD{from{transform:translateY(-60%);opacity:0}to{transform:translateY(0);opacity:1}}
.anim{animation:slideUp .25s cubic-bezier(.22,.61,.36,1) both}
.slot-w{display:inline-block;overflow:hidden;vertical-align:bottom}
.slot-i{display:inline-block}
@media(max-width:720px){
  .desk-only{display:none!important}
  .two-col{grid-template-columns:1fr!important}
  .three-col{grid-template-columns:1fr 1fr!important}
  .tx-modal{width:100%!important;max-height:95vh!important;border-radius:20px 20px 0 0!important;position:fixed!important;bottom:0!important;left:0!important;top:auto!important;transform:none!important}
}
`;

/* ── Tokens ─────────────────────────────────────────────── */
const C = {
  bg:      '#0c0e1a', bg2:'#11131f', surf:'#161826', surf2:'#1c1f30', surf3:'#252938',
  border:  'rgba(255,255,255,.05)', borderS:'rgba(255,255,255,.09)', div:'rgba(255,255,255,.035)',
  fg1:'rgba(244,245,250,.94)', fg2:'rgba(244,245,250,.70)', fg3:'rgba(244,245,250,.50)', fg4:'rgba(244,245,250,.34)',
  violet:'#6c5cf0', violetHi:'#8576f5', violetTint:'rgba(108,92,240,.14)', violetRing:'rgba(108,92,240,.36)',
  green:'#4ab38a', greenHi:'#5fc89e', greenTint:'rgba(74,179,138,.11)', greenRing:'rgba(74,179,138,.28)',
  pink:'#d96687',  pinkHi:'#e57f9c',  pinkTint:'rgba(217,102,135,.11)', pinkRing:'rgba(217,102,135,.28)',
  amber:'#d99850', amberTint:'rgba(217,152,80,.12)',
  heroGrad:'linear-gradient(120deg,#4f46e5 0%,#6c5cf0 48%,#8b5cf6 100%)',
  fabGrad: 'linear-gradient(135deg,#6c5cf0 0%,#5b4ee6 100%)',
};

const sh = {
  s1:'0 1px 0 rgba(255,255,255,.03) inset,0 1px 2px rgba(0,0,0,.30)',
  s2:'0 1px 0 rgba(255,255,255,.04) inset,0 8px 24px rgba(0,0,0,.35)',
  s3:'0 1px 0 rgba(255,255,255,.05) inset,0 18px 48px rgba(0,0,0,.45)',
  violet:'0 16px 40px rgba(108,92,240,.32),0 3px 10px rgba(108,92,240,.22)',
  fab:'0 10px 24px rgba(108,92,240,.42),0 2px 6px rgba(0,0,0,.30)',
};

/* ── Banks & Categories ─────────────────────────────────── */
const ARG_BANKS = [
  {id:'galicia',    name:'Galicia',         color:'#FF6E00', initials:'G',  type:'Banco'},
  {id:'santander',  name:'Santander',        color:'#EC0000', initials:'S',  type:'Banco'},
  {id:'bbva',       name:'BBVA',             color:'#004481', initials:'B',  type:'Banco'},
  {id:'macro',      name:'Macro',            color:'#0E2A8C', initials:'M',  type:'Banco'},
  {id:'icbc',       name:'ICBC',             color:'#C8102E', initials:'I',  type:'Banco'},
  {id:'nacion',     name:'Banco Nación',     color:'#1F4E79', initials:'N',  type:'Banco'},
  {id:'provincia',  name:'Banco Provincia',  color:'#16A085', initials:'P',  type:'Banco'},
  {id:'ciudad',     name:'Banco Ciudad',     color:'#E63946', initials:'C',  type:'Banco'},
  {id:'brubank',    name:'Brubank',          color:'#7C5CFF', initials:'BR', type:'Banco'},
  {id:'hsbc',       name:'HSBC',             color:'#DB0011', initials:'H',  type:'Banco'},
  {id:'supervielle',name:'Supervielle',      color:'#FF6600', initials:'SV', type:'Banco'},
  {id:'mp',         name:'Mercado Pago',     color:'#00B0FF', initials:'M',  type:'Billetera'},
  {id:'naranjax',   name:'Naranja X',        color:'#FF6B1A', initials:'NX', type:'Billetera'},
  {id:'uala',       name:'Ualá',             color:'#22D39A', initials:'U',  type:'Billetera'},
  {id:'modo',       name:'MODO',             color:'#3B47F1', initials:'MO', type:'Billetera'},
  {id:'reba',       name:'Reba',             color:'#FF4D7D', initials:'R',  type:'Billetera'},
  {id:'lemoncash',  name:'Lemon Cash',       color:'#FFD700', initials:'L',  type:'Billetera'},
  {id:'paypal',     name:'PayPal',           color:'#003087', initials:'PP', type:'Billetera'},
];

const CATS = [
  {id:'sueldo',     label:'Sueldo',      tone:'green',  icon:'💼', type:'income'},
  {id:'freelance',  label:'Freelance',   tone:'green',  icon:'⚡', type:'income'},
  {id:'inversion',  label:'Inversión',   tone:'green',  icon:'📈', type:'income'},
  {id:'otros-in',   label:'Otros',       tone:'green',  icon:'💰', type:'income'},
  {id:'comida',     label:'Comida',      tone:'pink',   icon:'🍽️', type:'expense'},
  {id:'transporte', label:'Transporte',  tone:'pink',   icon:'🚗', type:'expense'},
  {id:'compras',    label:'Compras',     tone:'pink',   icon:'🛍️', type:'expense'},
  {id:'hogar',      label:'Hogar',       tone:'pink',   icon:'🏠', type:'expense'},
  {id:'servicios',  label:'Servicios',   tone:'amber',  icon:'⚡', type:'expense'},
  {id:'salud',      label:'Salud',       tone:'violet', icon:'❤️', type:'expense'},
  {id:'otros-ex',   label:'Otros',       tone:'muted',  icon:'💸', type:'expense'},
];

/* ── Helpers ─────────────────────────────────────────────── */
const fmt = (n, sign='') => {
  if(n==null||n===0) return '$0';
  const abs = Math.abs(n);
  const s = abs.toLocaleString('es-AR',{maximumFractionDigits:0});
  const pre = n<0 ? '−' : sign==='+'?'+':sign==='−'?'':sign;
  return `${pre}$${s}`;
};
const fmtDate = iso => {
  if(!iso) return '';
  return new Date(iso+'T00:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'short'});
};
const todayISO = () => new Date().toISOString().split('T')[0];

const getBank = id => id==='efectivo'
  ? {id:'efectivo',name:'Efectivo',color:'#4ab38a',initials:'E',type:'Efectivo'}
  : ARG_BANKS.find(b=>b.id===id);

/* ── Session ─────────────────────────────────────────────── */
const SS = 'fc_sess';
const loadSess = () => JSON.parse(sessionStorage.getItem(SS)||'null');
const saveSess = s  => sessionStorage.setItem(SS,JSON.stringify(s));
const clearSess= () => { sessionStorage.removeItem(SS); authApi.logout(); };

/* ── Slot machine ────────────────────────────────────────── */
function useSlot(target, dur=900) {
  const [state, set] = useState({val:target,key:0,dir:0});
  const prev = useRef(target), timers = useRef([]);
  useEffect(()=>{
    if(prev.current===target) return;
    const from=prev.current, to=target, dir=to>from?1:-1;
    prev.current=to;
    timers.current.forEach(clearTimeout); timers.current=[];
    const N=16, sumW=Array.from({length:N},(_,i)=>Math.pow(N-i,2)).reduce((a,b)=>a+b,0);
    const Cv=dur/sumW; let cum=0;
    for(let i=1;i<=N;i++){
      cum+=Cv*Math.pow(N-i+1,2);
      const p=Math.pow(i/N,3), val=i===N?to:Math.round(from+(to-from)*p);
      timers.current.push(setTimeout(()=>set(prev=>({val,key:prev.key+1,dir})),Math.round(cum)));
    }
    return ()=>timers.current.forEach(clearTimeout);
  },[target]);
  return state;
}
function Slot({s,sign=''}){
  return <span className="slot-w">
    <span key={s.key} className="slot-i"
      style={{animation:s.dir?`${s.dir>0?'slotU':'slotD'} .12s ease-out both`:'none'}}>
      {fmt(s.val,sign)}
    </span>
  </span>;
}

/* ── Atoms ───────────────────────────────────────────────── */
function Spinner({size=20,color=C.violetHi}){
  return <span style={{display:'inline-block',width:size,height:size,border:`2px solid ${color}30`,
    borderTopColor:color,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>;
}

function BankBadge({id, size=40}) {
  const bank = getBank(id);
  if(!bank) return null;
  const r = Math.round(size*.28);
  return (
    <span style={{width:size,height:size,borderRadius:r,display:'inline-flex',alignItems:'center',
        justifyContent:'center',background:bank.color,flex:'none',
        fontSize:Math.round(size*.35),fontWeight:700,color:'#fff',flexShrink:0}}>
      {bank.initials?.slice(0,2)}
    </span>
  );
}

function CatIcon({id, size=38}) {
  const cat = CATS.find(c=>c.id===id)||{icon:'💸',tone:'muted'};
  const bg = {
    green:'rgba(74,179,138,.15)',pink:'rgba(217,102,135,.15)',
    amber:'rgba(217,152,80,.15)',violet:C.violetTint,muted:'rgba(255,255,255,.06)',
  }[cat.tone]||'rgba(255,255,255,.06)';
  return (
    <span style={{width:size,height:size,borderRadius:Math.round(size*.28),display:'inline-flex',
        alignItems:'center',justifyContent:'center',background:bg,flex:'none',fontSize:Math.round(size*.46)}}>
      {cat.icon}
    </span>
  );
}

function Badge({tone='muted',children}){
  const styles={
    muted: {color:C.fg2,bg:C.surf2,bd:C.borderS},
    amber: {color:C.amber,bg:C.amberTint,bd:'rgba(217,152,80,.32)'},
    green: {color:C.green,bg:C.greenTint,bd:C.greenRing},
    pink:  {color:C.pink,bg:C.pinkTint,bd:C.pinkRing},
    violet:{color:C.violetHi,bg:C.violetTint,bd:C.violetRing},
  }[tone]||{color:C.fg2,bg:C.surf2,bd:C.borderS};
  return <span style={{display:'inline-flex',padding:'3px 8px',borderRadius:999,fontSize:10,
    fontWeight:700,letterSpacing:'.08em',color:styles.color,background:styles.bg,
    border:`1px solid ${styles.bd}`}}>{children}</span>;
}

/* ── SwipeRow ────────────────────────────────────────────── */
function SwipeRow({id, onDelete, children}) {
  const [x, setX] = useState(0), [open, setOpen] = useState(false);
  const sx = useRef(0), mv = useRef(false);
  const PW=68, TH=40;
  return (
    <div style={{position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:PW,background:'#b91c3c',
          display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:0}}
        onClick={()=>{setX(0);setOpen(false);onDelete(id);}}>
        🗑️
      </div>
      <div style={{transform:`translateX(-${x}px)`,transition:mv.current?'none':'transform .22s ease-out',
          position:'relative',zIndex:1,background:C.surf}}
        onTouchStart={e=>{sx.current=e.touches[0].clientX;mv.current=true;}}
        onTouchMove={e=>{if(!mv.current)return;const d=sx.current-e.touches[0].clientX;
          if(d>0)setX(Math.min(d,PW));else if(open)setX(Math.max(PW+d,0));}}
        onTouchEnd={()=>{mv.current=false;if(x>TH){setX(PW);setOpen(true);}else{setX(0);setOpen(false);}}}>
        {children}
      </div>
    </div>
  );
}

/* ── AUTH ────────────────────────────────────────────────── */
function AuthScreen({onAuth}){
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');
  const [pw,setPw]=useState('');
  const [pw2,setPw2]=useState('');
  const [showPw,setShowPw]=useState(false);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
  const [ok,setOk]=useState('');

  const submit=async()=>{
    setErr('');setOk('');
    if(!email.trim()||!pw){setErr('Completá todos los campos.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setErr('Email inválido.');return;}
    if(pw.length<8){setErr('Mínimo 8 caracteres.');return;}
    if(mode==='register'&&pw!==pw2){setErr('Las contraseñas no coinciden.');return;}
    setLoading(true);
    try{
      const u=mode==='register'?await authApi.register(email.trim().toLowerCase(),pw):await authApi.login(email.trim().toLowerCase(),pw);
      const s={userId:u.id,email:u.email};
      saveSess(s);setOk(mode==='register'?'¡Cuenta creada!':'Bienvenido…');
      setTimeout(()=>onAuth(s),500);
    }catch(e){setErr(e.message||'Error de conexión.');}
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',
        justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:400,animation:'slideUp .3s ease both'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:56,height:56,borderRadius:18,margin:'0 auto 16px',
              background:C.heroGrad,display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:sh.violet,fontSize:26}}>💸</div>
          <h1 style={{fontSize:28,fontWeight:800,letterSpacing:'-.02em'}}>
            Flow<span style={{color:C.violetHi}}>Cash</span>
          </h1>
          <p style={{fontSize:13,color:C.fg3,marginTop:4}}>
            {mode==='login'?'Iniciá sesión para continuar':'Creá tu cuenta gratuita'}
          </p>
        </div>
        <div style={{background:C.surf,border:`1px solid ${C.borderS}`,borderRadius:22,padding:28}}>
          <div style={{display:'flex',background:C.surf2,borderRadius:14,padding:5,gap:4,marginBottom:24}}>
            {[['login','Iniciar sesión'],['register','Crear cuenta']].map(([v,l])=>(
              <button key={v} onClick={()=>{setMode(v);setErr('');setOk('');}}
                style={{flex:1,padding:'10px',borderRadius:11,border:'none',cursor:'pointer',
                  fontSize:13,fontWeight:600,transition:'all .2s',
                  background:mode===v?C.violet:'transparent',
                  color:mode===v?'#fff':C.fg3,
                  boxShadow:mode===v?sh.violet:'none'}}>{l}</button>
            ))}
          </div>
          {err&&<div style={{padding:'10px 14px',borderRadius:10,background:C.pinkTint,
              border:`1px solid ${C.pinkRing}`,marginBottom:14,fontSize:12,color:C.pink,fontWeight:500}}>
            ⚠️ {err}</div>}
          {ok&&<div style={{padding:'10px 14px',borderRadius:10,background:C.greenTint,
              border:`1px solid ${C.greenRing}`,marginBottom:14,fontSize:12,color:C.green,fontWeight:500}}>
            ✓ {ok}</div>}
          {[['Email','email',email,setEmail],['Contraseña','password',pw,setPw]].map(([lbl,tp,val,set])=>(
            <div key={lbl} style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',
                  color:C.fg3,display:'block',marginBottom:6}}>{lbl}</label>
              <div style={{position:'relative'}}>
                <input type={tp==='password'?(showPw?'text':'password'):tp} value={val}
                  onChange={e=>set(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}
                  placeholder={tp==='email'?'tu@email.com':'Mínimo 8 caracteres'}
                  style={{width:'100%',height:46,background:C.surf2,border:`1px solid ${C.borderS}`,
                    borderRadius:12,paddingLeft:42,paddingRight:tp==='password'?44:14,
                    color:C.fg1,fontSize:14,outline:'none'}}
                  onFocus={e=>e.target.style.borderColor=C.violet}
                  onBlur={e=>e.target.style.borderColor=C.borderS}/>
                <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',
                    fontSize:16,color:C.fg3}}>{tp==='email'?'✉':'🔒'}</span>
                {tp==='password'&&<button onClick={()=>setShowPw(!showPw)}
                  style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
                    background:'none',border:'none',cursor:'pointer',color:C.fg3,fontSize:15}}>
                  {showPw?'🙈':'👁'}
                </button>}
              </div>
            </div>
          ))}
          {mode==='register'&&<div style={{marginBottom:20}}>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',
                color:C.fg3,display:'block',marginBottom:6}}>Confirmar contraseña</label>
            <input type={showPw?'text':'password'} value={pw2} onChange={e=>setPw2(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Repetí tu contraseña"
              style={{width:'100%',height:46,background:C.surf2,
                border:`1px solid ${pw2&&pw2!==pw?C.pinkRing:pw2&&pw2===pw?C.greenRing:C.borderS}`,
                borderRadius:12,padding:'0 14px',color:C.fg1,fontSize:14,outline:'none'}}/>
            {pw2&&pw2===pw&&<p style={{fontSize:11,color:C.green,marginTop:5}}>✓ Coinciden</p>}
          </div>}
          <button onClick={submit}
            disabled={loading||(mode==='register'&&(!pw2||pw2!==pw))}
            style={{width:'100%',height:48,borderRadius:14,border:0,color:'#fff',cursor:'pointer',
              background:C.violet,boxShadow:sh.violet,fontSize:15,fontWeight:700,
              display:'flex',alignItems:'center',justifyContent:'center',gap:10,
              opacity:(loading||(mode==='register'&&(!pw2||pw2!==pw)))?.5:1}}>
            {loading?<><Spinner size={18} color="#fff"/> Procesando…</>:mode==='login'?'Entrar':'Crear cuenta'}
          </button>
          <div style={{marginTop:14,padding:'10px 14px',background:C.violetTint,borderRadius:10,
              border:`1px solid ${C.violetRing}`,fontSize:11,color:C.fg3,lineHeight:1.6}}>
            🔒 Tu contraseña se cifra con <b style={{color:C.violetHi}}>bcrypt</b> antes de guardarse.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ROOT ────────────────────────────────────────────────── */
export default function FlowCash(){
  const [sess,setSess]=useState(null);
  const [chk,setChk]=useState(false);
  useEffect(()=>{
    if(authApi.isLoggedIn()){
      const c=loadSess();
      if(c) authApi.me().then(d=>setSess({userId:d.user.id,email:d.user.email}))
        .catch(()=>clearSess()).finally(()=>setChk(true));
      else{clearSess();setChk(true);}
    } else setChk(true);
  },[]);
  if(!chk) return <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',
      justifyContent:'center',flexDirection:'column',gap:14}}>
    <Spinner size={36}/><p style={{fontSize:13,color:C.fg3}}>Cargando…</p></div>;
  if(!sess) return <AuthScreen onAuth={s=>{saveSess(s);setSess(s);}}/>;
  return <App sess={sess} onLogout={()=>{clearSess();setSess(null);}}/>;
}

/* ── APP ─────────────────────────────────────────────────── */
function App({sess,onLogout}){
  const {userId,email}=sess;
  const [txs,setTxs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [netErr,setNetErr]=useState(null);
  const [tab,setTab]=useState('dashboard');
  const [showAdd,setShowAdd]=useState(false);
  const [showBanks,setShowBanks]=useState(false);
  const [showLogout,setShowLogout]=useState(false);
  const [delId,setDelId]=useState(null);
  const [toast,setToast]=useState(null);
  const [connectedIds,setConnectedIds]=useState(['efectivo']);

  // backend key → UI id
  const bkToUi=k=>({manual:'efectivo',mercadopago:'mp',lemoncash:'lemoncash',
    uala:'uala',brubank:'brubank',naranjaX:'naranjax',paypal:'paypal',naranjax:'naranjax',
    santander:'santander',bbva:'bbva',galicia:'galicia',nacion:'nacion',
    macro:'macro',hsbc:'hsbc',icbc:'icbc',supervielle:'supervielle',modo:'modo',reba:'reba',
    lemoncash:'lemoncash',provincia:'provincia',ciudad:'ciudad',
  }[k]||k);
  const uiToBk=k=>({efectivo:'manual',mp:'mercadopago',lemoncash:'lemoncash',
    uala:'uala',brubank:'brubank',naranjax:'naranjaX',paypal:'paypal',
    santander:'santander',bbva:'bbva',galicia:'galicia',nacion:'nacion',
    macro:'macro',hsbc:'hsbc',icbc:'icbc',supervielle:'supervielle',modo:'modo',reba:'reba',
    provincia:'provincia',ciudad:'ciudad',
  }[k]||k);

  useEffect(()=>{
    Promise.all([txApi.getAll(),walletApi.getActive().catch(()=>({wallets:['manual']}))])
      .then(([td,wd])=>{
        setTxs(td.transactions||[]);
        const mapped=(wd.wallets||['manual']).map(bkToUi);
        if(!mapped.includes('efectivo')) mapped.unshift('efectivo');
        setConnectedIds(mapped);
        setLoading(false);
      }).catch(e=>{setNetErr(e.message);setLoading(false);});
  },[userId]);

  const showToast=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};

  // Computed
  const income  =txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expenses=txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const balance =income-expenses;
  const savingsRate=income>0?Math.max(0,Math.round((balance/income)*100)):0;
  const slBal=useSlot(balance), slInc=useSlot(income), slExp=useSlot(expenses);

  const walBal=useCallback(id=>{
    const isEfec=id==='efectivo';
    const wt=txs.filter(t=>isEfec?(t.wallet==='manual'||t.wallet==='efectivo'):t.wallet===id);
    return wt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
          -wt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  },[txs]);

  const addTx=async payload=>{
    try{
      const bkWallet=uiToBk(payload.walletId);
      const body={type:payload.type,amount:parseFloat(payload.amount),
        description:payload.concept,category:payload.category,
        date:payload.date,source:payload.walletId==='efectivo'?'cash':'digital',
        wallet_name:bkWallet,recurring:payload.fixed,
        dueDay:payload.fixed?payload.dueDay:''};
      const data=await txApi.create(body);
      setTxs(p=>[{...body,id:data.transaction.id,wallet:bkWallet,
        date:payload.date,amount:parseFloat(payload.amount)},...p]);
      setShowAdd(false);showToast('Movimiento guardado ✓');
    }catch(e){showToast(e.message||'Error al guardar',false);}
  };

  const doDelete=async()=>{
    try{await txApi.delete(delId);setTxs(p=>p.filter(t=>t.id!==delId));
      setDelId(null);showToast('Movimiento eliminado',false);}
    catch(e){showToast(e.message,false);setDelId(null);}
  };

  const saveBanks=async ids=>{
    try{await walletApi.save(ids.map(uiToBk));setConnectedIds(ids);showToast('Billeteras guardadas ✓');}
    catch(e){showToast(e.message,false);}
  };

  if(loading) return <div style={{minHeight:'100vh',background:C.bg,display:'flex',
      alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
    <Spinner size={36}/><p style={{fontSize:13,color:C.fg3}}>Cargando tus movimientos…</p></div>;

  if(netErr) return <div style={{minHeight:'100vh',background:C.bg,display:'flex',
      alignItems:'center',justifyContent:'center',padding:20,textAlign:'center'}}>
    <div><div style={{fontSize:40,marginBottom:16}}>📡</div>
      <h2 style={{fontSize:18,fontWeight:700,marginBottom:8}}>Sin conexión</h2>
      <p style={{color:C.fg3,fontSize:13,marginBottom:20}}>{netErr}</p>
      <button onClick={()=>window.location.reload()} style={{padding:'10px 20px',borderRadius:12,
          border:`1px solid ${C.violetRing}`,background:C.violetTint,color:C.violetHi,cursor:'pointer',
          fontSize:13,fontWeight:600}}>Reintentar</button></div></div>;

  // If showing banks page — full page
  if(showBanks) return <BanksPage connected={connectedIds} txs={txs}
    onSave={ids=>{saveBanks(ids);setShowBanks(false);}}
    onClose={()=>setShowBanks(false)}/>;

  const tabs=[{id:'dashboard',icon:'⊞',label:'Dashboard'},{id:'charts',icon:'📊',label:'Gráficos'},{id:'records',icon:'☰',label:'Registros'}];

  return (
    <div style={{minHeight:'100vh',background:C.bg}}>
      <style>{G}</style>

      {/* ── HEADER ── */}
      <header style={{display:'flex',alignItems:'center',gap:14,padding:'16px 32px',
          position:'sticky',top:0,zIndex:100,backdropFilter:'blur(20px)',
          background:'rgba(12,14,26,.88)',borderBottom:`1px solid ${C.border}`}}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginRight:'auto'}}>
          <div style={{width:42,height:42,borderRadius:12,background:C.heroGrad,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:20,boxShadow:sh.violet}}>💸</div>
          <span style={{fontSize:20,fontWeight:700,letterSpacing:'-.02em'}}>
            Flow<span style={{color:C.violetHi}}>Cash</span>
          </span>
        </div>
        {/* Balance pill */}
        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'9px 16px',
            borderRadius:12,fontWeight:700,fontSize:14,
            background:C.greenTint,border:`1px solid ${C.greenRing}`,color:C.green}}>
          📈 <Slot s={slBal} sign="+"/>
        </div>
        {/* Icon buttons */}
        <button style={btnIcon()} title={email}>👤</button>
        <button style={{...btnIcon(),position:'relative'}} onClick={()=>setShowBanks(true)} title="Mis bancos">
          🏦
          {connectedIds.filter(id=>id!=='efectivo').length>0&&<span style={{
            position:'absolute',top:-5,right:-5,minWidth:18,height:18,padding:'0 4px',
            borderRadius:999,background:C.violet,color:'#fff',fontSize:10,fontWeight:700,
            display:'flex',alignItems:'center',justifyContent:'center',
            border:`2px solid ${C.bg}`}}>
            {connectedIds.filter(id=>id!=='efectivo').length}
          </span>}
        </button>
        <button style={btnIcon(true)} onClick={()=>setShowLogout(true)} title="Salir">🚪</button>
      </header>

      {/* ── TABS ── */}
      <div style={{padding:'16px 32px 0'}}>
        <div style={{display:'flex',gap:6,background:C.surf,border:`1px solid ${C.border}`,
            borderRadius:16,padding:5}}>
          {tabs.map(t=>(
            <div key={t.id} onClick={()=>setTab(t.id)}
              style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:10,
                padding:'13px 12px',borderRadius:12,fontSize:14,fontWeight:600,
                color:tab===t.id?C.violetHi:C.fg3,
                background:tab===t.id?C.violetTint:'transparent',
                cursor:'pointer',transition:'all .15s ease'}}>
              <span style={{fontSize:16}}>{t.icon}</span>{t.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <main style={{padding:'20px 32px 120px'}} className="anim" key={tab}>
        {tab==='dashboard'&&<Dashboard txs={txs} income={income} expenses={expenses} balance={balance}
          savingsRate={savingsRate} slInc={slInc} slExp={slExp} slBal={slBal}
          connectedIds={connectedIds} walBal={walBal} onBanks={()=>setShowBanks(true)}/>}
        {tab==='charts'&&<Charts txs={txs} connectedIds={connectedIds} walBal={walBal}
          income={income} expenses={expenses}/>}
        {tab==='records'&&<Records txs={txs} income={income} expenses={expenses} balance={balance}
          onDelete={setDelId}/>}
      </main>

      {/* FAB */}
      <button onClick={()=>setShowAdd(true)}
        style={{position:'fixed',bottom:28,right:28,width:64,height:64,borderRadius:22,
          background:C.fabGrad,boxShadow:sh.fab,border:0,cursor:'pointer',fontSize:28,
          color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
          transition:'transform .15s ease',zIndex:50}}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.06)'}
        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>+</button>

      {/* TOAST */}
      {toast&&<div style={{position:'fixed',bottom:108,left:'50%',transform:'translateX(-50%)',
          zIndex:400,padding:'10px 18px',borderRadius:12,fontSize:13,fontWeight:600,
          whiteSpace:'nowrap',pointerEvents:'none',animation:'slideUp .3s ease',
          background:toast.ok?C.greenTint:C.pinkTint,
          border:`1px solid ${toast.ok?C.greenRing:C.pinkRing}`,
          color:toast.ok?C.green:C.pink}}>{toast.msg}</div>}

      {/* ADD TX */}
      {showAdd&&<AddTx connectedIds={connectedIds} walBal={walBal}
        onSave={addTx} onClose={()=>setShowAdd(false)}/>}

      {/* DELETE CONFIRM */}
      {delId&&<Modal onClose={()=>setDelId(null)} width={340}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>🗑️</div>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:6}}>¿Eliminar movimiento?</h3>
          <p style={{fontSize:13,color:C.fg3,marginBottom:20}}>Esta acción no se puede deshacer.</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <button onClick={()=>setDelId(null)} style={btnSec()}>Cancelar</button>
            <button onClick={doDelete} style={{...btnBase(),background:C.pinkTint,
                border:`1px solid ${C.pinkRing}`,color:C.pink}}>Eliminar</button>
          </div>
        </div>
      </Modal>}

      {/* LOGOUT */}
      {showLogout&&<Modal onClose={()=>setShowLogout(false)} width={360}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>👋</div>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:6}}>Cerrar sesión</h3>
          <p style={{fontSize:13,color:C.fg3,marginBottom:4}}>Tus datos quedan guardados en la nube.</p>
          <p style={{fontSize:12,color:C.fg4,marginBottom:20}}>{email}</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <button onClick={()=>setShowLogout(false)} style={btnSec()}>Cancelar</button>
            <button onClick={()=>{setShowLogout(false);onLogout();}}
              style={{...btnBase(),background:C.pinkTint,border:`1px solid ${C.pinkRing}`,color:C.pink}}>
              Salir</button>
          </div>
        </div>
      </Modal>}
    </div>
  );
}

function btnIcon(danger=false){
  return {width:44,height:44,borderRadius:14,display:'inline-flex',alignItems:'center',
    justifyContent:'center',border:`1px solid ${danger?C.pinkRing:C.violetRing}`,
    background:danger?C.pinkTint:C.violetTint,color:danger?C.pink:C.violetHi,
    cursor:'pointer',fontSize:18,transition:'all .15s ease',position:'relative'};
}
function btnBase(){return {border:0,padding:'11px 16px',borderRadius:12,fontSize:14,fontWeight:600,
  cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8};}
function btnSec(){return {...btnBase(),background:C.surf2,border:`1px solid ${C.borderS}`,color:C.fg1};}
function btnPrimary(){return {...btnBase(),background:C.violet,color:'#fff',boxShadow:sh.violet};}

/* ── Modal wrapper ───────────────────────────────────────── */
function Modal({children,onClose,width=500}){
  return <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:'fixed',inset:0,zIndex:200,background:'rgba(12,14,26,.82)',
        display:'flex',alignItems:'center',justifyContent:'center',padding:20,
        animation:'fadeIn .2s ease',backdropFilter:'blur(8px)'}}>
    <div style={{width:`min(${width}px,100%)`,background:C.bg2,border:`1px solid ${C.borderS}`,
        borderRadius:22,padding:24,boxShadow:sh.s3,animation:'popIn .22s ease',
        maxHeight:'90vh',overflowY:'auto'}}>
      {children}
    </div>
  </div>;
}

/* ── DASHBOARD ───────────────────────────────────────────── */
function Dashboard({txs,income,expenses,balance,savingsRate,slInc,slExp,slBal,connectedIds,walBal,onBanks}){
  const fixedTxs=txs.filter(t=>t.type==='expense'&&t.recurring);
  const monthlyFixed=Array.from(new Map(fixedTxs.map(t=>[`${t.description}__${t.amount}`,t])).values())
    .reduce((s,t)=>s+t.amount,0);
  const todayDay=new Date().getDate();
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}} className="two-col">
      {/* Left col */}
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        {/* Hero */}
        <div style={{position:'relative',overflow:'hidden',borderRadius:28,padding:'28px 28px 24px',
            background:C.heroGrad,boxShadow:sh.violet,color:'#fff'}}>
          <div style={{position:'absolute',right:-60,top:-60,width:220,height:220,borderRadius:'50%',
              background:'rgba(255,255,255,.1)',filter:'blur(8px)'}}/>
          <div style={{fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',opacity:.78,fontWeight:600}}>
            SALDO TOTAL</div>
          <div style={{fontSize:52,fontWeight:700,letterSpacing:'-.02em',lineHeight:1.05,marginTop:8,
              fontVariantNumeric:'tabular-nums'}}>
            <Slot s={slBal}/>
          </div>
          <div style={{fontSize:13,opacity:.7,marginTop:6,marginBottom:24}}>
            {txs.length} movimientos registrados
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[{s:slInc,label:'Ingresos del mes',sign:'+',color:'rgba(74,179,138,.9)',icon:'📈'},
              {s:slExp,label:'Gastos del mes',sign:'−',color:'rgba(217,102,135,.9)',icon:'📉'}].map(({s,label,sign,color,icon})=>(
              <div key={label} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.14)',
                  borderRadius:18,padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <span style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.14)',
                      display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{icon}</span>
                  <span style={{fontSize:12,opacity:.9}}>{label}</span>
                </div>
                <div style={{fontSize:24,fontWeight:700,color,fontVariantNumeric:'tabular-nums'}}>
                  <Slot s={s} sign={sign}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saldo por billetera */}
        <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:24,padding:24}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div>
              <h2 style={{fontSize:17,fontWeight:700}}>Saldo por Billetera</h2>
              <p style={{fontSize:12,color:C.fg3,marginTop:2}}>Balance neto por fuente (ingresos − gastos)</p>
            </div>
            <button onClick={onBanks} style={{fontSize:13,color:C.violetHi,background:'none',
                border:'none',cursor:'pointer',fontWeight:600}}>Gestionar →</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:2,marginTop:14}}>
            {connectedIds.map(id=>{
              const bank=getBank(id); if(!bank) return null;
              const bal=walBal(id);
              return (
                <div key={id} style={{display:'flex',alignItems:'center',gap:14,
                    padding:'13px 16px',borderRadius:14,
                    transition:'background .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surf2}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <BankBadge id={id} size={38}/>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:14,fontWeight:600}}>{bank.name}</p>
                    <p style={{fontSize:11,color:C.fg3}}>
                      {bank.type}
                      {id!=='efectivo'&&<span style={{marginLeft:6}}>•••• {1000+bank.id.length*137}</span>}
                    </p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:15,fontWeight:700,fontVariantNumeric:'tabular-nums',
                        color:bal>=0?bank.color:C.pink}}>{fmt(bal,bal>=0?'+':'−')}</p>
                    <p style={{fontSize:11,color:C.fg3}}>{bal>=0?'superávit':'déficit'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right col */}
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        {/* Tasa de ahorro */}
        <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:24,padding:24}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
            <div>
              <h2 style={{fontSize:17,fontWeight:700}}>Tasa de ahorro</h2>
              <p style={{fontSize:12,color:C.fg3,marginTop:2}}>Ingresos disponibles tras gastos</p>
            </div>
            <div style={{padding:'8px 14px',borderRadius:12,textAlign:'center',
                background:savingsRate>=50?C.greenTint:savingsRate>=20?C.amberTint:C.pinkTint,
                border:`1px solid ${savingsRate>=50?C.greenRing:savingsRate>=20?'rgba(217,152,80,.32)':C.pinkRing}`}}>
              <div style={{fontSize:24,fontWeight:700,
                  color:savingsRate>=50?C.green:savingsRate>=20?C.amber:C.pink}}>
                {savingsRate}%
              </div>
              <div style={{fontSize:10,fontWeight:700,color:C.fg3,marginTop:2,textTransform:'uppercase',letterSpacing:'.05em'}}>
                {savingsRate>=50?'Excelente':savingsRate>=20?'En meta':'Mejorable'}
              </div>
            </div>
          </div>
          <div style={{height:6,background:C.surf2,borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:99,transition:'width .6s ease',
                width:`${Math.min(100,savingsRate)}%`,
                background:savingsRate>=50?C.green:savingsRate>=20?C.amber:C.pink}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:7,fontSize:11,color:C.fg3}}>
            <span>0%</span><span>Meta: 20%+</span><span>100%</span>
          </div>
        </div>

        {/* Compromisos */}
        <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:24,padding:24}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
            <div>
              <h2 style={{fontSize:17,fontWeight:700}}>Compromisos del mes</h2>
              <p style={{fontSize:12,color:C.fg3,marginTop:2}}>Gastos fijos que se repiten</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:20,fontWeight:700,color:C.pink,fontVariantNumeric:'tabular-nums'}}>
                {fmt(monthlyFixed,'−')}
              </p>
              <p style={{fontSize:11,color:C.fg3}}>comprometido</p>
            </div>
          </div>
          {Array.from(new Map(fixedTxs.map(t=>[`${t.description}__${t.amount}`,t])).values())
            .slice(0,5).map(tx=>{
              const soon=tx.dueDay&&(Number(tx.dueDay)-todayDay)>=0&&(Number(tx.dueDay)-todayDay)<=7;
              return (
                <div key={tx.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',
                    borderBottom:`1px solid ${C.div}`}}>
                  <CatIcon id={tx.category} size={32}/>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:600}}>{tx.description}</p>
                    {tx.dueDay&&<p style={{fontSize:11,color:soon?C.amber:C.fg3}}>
                      {soon?'⚠ ':''}{CATS.find(c=>c.id===tx.category)?.label} · día {tx.dueDay}</p>}
                  </div>
                  <p style={{fontSize:14,fontWeight:700,color:C.pink,fontVariantNumeric:'tabular-nums'}}>
                    {fmt(tx.amount,'−')}
                  </p>
                </div>
              );
            })}
          {fixedTxs.length===0&&<p style={{fontSize:13,color:C.fg3,textAlign:'center',padding:'12px 0'}}>
            Sin gastos fijos. Marcá un gasto como "Fijo mensual" al cargarlo.</p>}
        </div>

        {/* Últimos movimientos */}
        <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:24,padding:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px 16px'}}>
            <h2 style={{fontSize:17,fontWeight:700}}>Últimos movimientos</h2>
            <button style={{fontSize:13,color:C.violetHi,background:'none',border:'none',
                cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
              Ver todos ›</button>
          </div>
          {txs.length===0?<div style={{padding:'20px 24px',color:C.fg3,fontSize:13,textAlign:'center'}}>
            Todavía no hay movimientos.</div>
          :txs.slice(0,5).map(tx=>{
            const cat=CATS.find(c=>c.id===tx.category);
            const bank=getBank(tx.wallet==='manual'?'efectivo':tx.wallet);
            const isIn=tx.type==='income';
            return (
              <div key={tx.id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 24px',
                  borderTop:`1px solid ${C.div}`,transition:'background .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background=C.surf2}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <CatIcon id={tx.category} size={38}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:14,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {tx.description}</p>
                  <div style={{fontSize:12,color:C.fg3,marginTop:3,display:'flex',alignItems:'center',gap:6}}>
                    <span>{cat?.label||tx.category}</span>
                    <span style={{opacity:.4}}>·</span>
                    <span>{fmtDate(tx.date)}</span>
                    {bank&&<><span style={{opacity:.4}}>·</span>
                      <span style={{display:'inline-flex',alignItems:'center',gap:4}}>
                        <BankBadge id={tx.wallet==='manual'?'efectivo':tx.wallet} size={16}/>
                        {bank.name}
                      </span></>}
                  </div>
                </div>
                <p style={{fontSize:15,fontWeight:700,fontVariantNumeric:'tabular-nums',
                    color:isIn?C.green:C.pink,flexShrink:0}}>
                  {fmt(tx.amount,isIn?'+':'−')}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── CHARTS ──────────────────────────────────────────────── */
function Charts({txs,connectedIds,walBal,income,expenses}){
  const byCat=CATS.filter(c=>c.type==='expense').map(c=>({
    ...c,val:txs.filter(t=>t.type==='expense'&&t.category===c.id).reduce((s,t)=>s+t.amount,0)
  })).filter(d=>d.val>0).sort((a,b)=>b.val-a.val);
  const catTotal=byCat.reduce((s,r)=>s+r.val,0);

  const sourceSlices=connectedIds.map(id=>{
    const bank=getBank(id);
    return {id,label:bank?.name||id,color:bank?.color||C.violet,val:Math.max(0,walBal(id))};
  }).filter(s=>s.val>0);
  const sourceTotal=sourceSlices.reduce((s,d)=>s+d.val,0);

  const trend=(()=>{
    const r=[];
    for(let i=5;i>=0;i--){
      const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
      const y=d.getFullYear(),m=d.getMonth();
      const lbl=d.toLocaleDateString('es-AR',{month:'short'}).replace('.','');
      const mt=txs.filter(t=>{const td=new Date(t.date+'T00:00:00');return td.getFullYear()===y&&td.getMonth()===m;});
      r.push({label:lbl.charAt(0).toUpperCase()+lbl.slice(1),
        in:mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),
        out:mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)});
    }
    return r;
  })();
  const maxTrend=Math.max(...trend.flatMap(t=>[t.in,t.out]),1)*1.1;

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}} className="two-col">
      {/* Gastos por categoría */}
      <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:24,padding:24}}>
        <h2 style={{fontSize:17,fontWeight:700}}>Gastos por categoría</h2>
        <p style={{fontSize:12,color:C.fg3,marginTop:2,marginBottom:20}}>
          {fmt(catTotal,'−')} este mes</p>
        {byCat.length===0?<div style={{textAlign:'center',color:C.fg3,padding:32,fontSize:13}}>Sin gastos cargados.</div>
        :<div style={{display:'flex',flexDirection:'column',gap:14}}>
          {byCat.map(({id,label,icon,tone,val})=>{
            const barColor={pink:C.pink,amber:C.amber,green:C.green,violet:C.violetHi,muted:C.fg3}[tone]||C.fg3;
            return (
              <div key={id}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{display:'inline-flex',alignItems:'center',gap:10,fontSize:14,fontWeight:600}}>
                    <CatIcon id={id} size={28}/>{label}
                  </span>
                  <span style={{fontSize:14,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>
                    {fmt(val)}</span>
                </div>
                <div style={{height:5,background:C.surf2,borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,background:barColor,
                      width:`${catTotal>0?(val/catTotal)*100:0}%`,transition:'width .4s ease'}}/>
                </div>
              </div>
            );
          })}
        </div>}
      </div>

      {/* Distribución por fuente */}
      <SourceDonut slices={sourceSlices} total={sourceTotal}/>

      {/* Ingresos vs Gastos */}
      <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:24,padding:24,
          gridColumn:'1 / -1'}}>
        <h2 style={{fontSize:17,fontWeight:700}}>Ingresos vs Gastos</h2>
        <p style={{fontSize:12,color:C.fg3,marginTop:2,marginBottom:20}}>Últimos 6 meses</p>
        <div style={{display:'flex',alignItems:'flex-end',gap:12,height:200}}>
          {trend.map((m,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
              <div style={{flex:1,display:'flex',alignItems:'flex-end',gap:4,width:'100%',justifyContent:'center'}}>
                <div style={{width:'40%',height:`${(m.in/maxTrend)*100}%`,background:C.green,
                    borderRadius:'5px 5px 0 0',minHeight:2,transition:'height .4s ease'}}/>
                <div style={{width:'40%',height:`${(m.out/maxTrend)*100}%`,background:C.pink,
                    borderRadius:'5px 5px 0 0',minHeight:2,transition:'height .4s ease'}}/>
              </div>
              <div style={{fontSize:12,fontWeight:i===5?700:500,
                  color:i===5?C.fg1:C.fg3}}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:18,marginTop:14,fontSize:13,color:C.fg2}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
            <span style={{width:12,height:12,borderRadius:3,background:C.green}}/> Ingresos
          </span>
          <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
            <span style={{width:12,height:12,borderRadius:3,background:C.pink}}/> Gastos
          </span>
        </div>
      </div>
    </div>
  );
}

function SourceDonut({slices,total}){
  const [tip,setTip]=useState(null);
  const hasData=total>0&&slices.some(s=>s.val>0);
  return (
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:24,padding:24}}>
      <h2 style={{fontSize:17,fontWeight:700}}>Distribución por fuente</h2>
      <p style={{fontSize:12,color:C.fg3,marginTop:2,marginBottom:16}}>
        Cuánto de tu saldo total vive en cada billetera</p>
      {!hasData?<div style={{textAlign:'center',color:C.fg3,padding:32,fontSize:13,
          minHeight:180,display:'flex',alignItems:'center',justifyContent:'center'}}>
        Cargá ingresos para ver la distribución.</div>
      :<>
        <div style={{position:'relative',marginBottom:4}}>
          <div style={{position:'absolute',top:-8,left:'50%',transform:'translateX(-50%)',
              zIndex:20,pointerEvents:'none',opacity:tip?1:0,transition:'opacity .15s'}}>
            {tip&&<div style={{background:C.surf,border:`1px solid ${tip.color}50`,borderRadius:12,
                padding:'10px 14px',whiteSpace:'nowrap',boxShadow:sh.s2,textAlign:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                <span style={{width:9,height:9,borderRadius:'50%',background:tip.color}}/>
                <span style={{fontSize:12,fontWeight:700}}>{tip.label}</span>
              </div>
              <p style={{fontSize:15,fontWeight:700,color:tip.color,fontVariantNumeric:'tabular-nums'}}>{fmt(tip.val)}</p>
              <p style={{fontSize:11,color:C.fg3}}>{total>0?Math.round((tip.val/total)*100):0}%</p>
            </div>}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={slices} cx="50%" cy="50%" innerRadius={64} outerRadius={90}
                   paddingAngle={3} dataKey="val" strokeWidth={0}
                   onMouseEnter={d=>setTip(d)} onMouseLeave={()=>setTip(null)}>
                {slices.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
              textAlign:'center',pointerEvents:'none'}}>
            <p style={{fontSize:11,color:C.fg3,fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>TOTAL</p>
            <p style={{fontSize:15,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmt(total)}</p>
          </div>
        </div>
        {/* Legend — collapsible list */}
        {slices.map((s,i)=>{
          const pct=total>0?Math.round((s.val/total)*100):0;
          return i===0?(
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',
                borderTop:`1px solid ${C.div}`}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:s.color,flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:600,flex:1}}>{s.label}</span>
              <span style={{fontSize:13,fontVariantNumeric:'tabular-nums',color:C.fg3}}>{fmt(s.val)}</span>
              <span style={{fontSize:14,fontWeight:700,color:s.color,minWidth:40,textAlign:'right',
                  fontVariantNumeric:'tabular-nums'}}>{pct}%</span>
            </div>
          ):null; // show only first, rest collapsed
        })}
        <p style={{fontSize:12,color:C.fg3,marginTop:6}}>
          Total distribuido: <b style={{color:C.fg1,fontVariantNumeric:'tabular-nums'}}>{fmt(total)}</b>
        </p>
      </>}
    </div>
  );
}

/* ── RECORDS ─────────────────────────────────────────────── */
function Records({txs,income,expenses,balance,onDelete}){
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');
  let list=txs;
  if(filter!=='all') list=list.filter(t=>t.type===filter);
  if(search) list=list.filter(t=>(t.description||'').toLowerCase().includes(search.toLowerCase()));

  const groups={};
  list.forEach(tx=>{if(!groups[tx.date])groups[tx.date]=[];groups[tx.date].push(tx);});
  const dates=Object.keys(groups).sort((a,b)=>b.localeCompare(a));

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}} className="three-col">
        {[{label:'Total ingresos',val:income,tone:'green',icon:'📈'},
          {label:'Total gastos',val:expenses,tone:'pink',icon:'📉'},
          {label:'Balance',val:balance,tone:'violet',icon:'💼'}].map(({label,val,tone,icon})=>{
          const colors={green:{c:C.green,bg:C.greenTint,bd:C.greenRing},
            pink:{c:C.pink,bg:C.pinkTint,bd:C.pinkRing},
            violet:{c:C.violetHi,bg:C.violetTint,bd:C.violetRing}}[tone];
          return (
            <div key={label} style={{background:C.surf,border:`1px solid ${colors.bd}`,borderRadius:18,padding:20}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <span style={{width:36,height:36,borderRadius:10,display:'inline-flex',alignItems:'center',
                    justifyContent:'center',background:colors.bg,fontSize:18}}>{icon}</span>
                <span style={{fontSize:12,color:C.fg3,fontWeight:600}}>{label}</span>
              </div>
              <div style={{fontSize:24,fontWeight:700,color:colors.c,fontVariantNumeric:'tabular-nums'}}>
                {fmt(val,tone==='pink'?'−':'+')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + filter */}
      <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:18,padding:12,
          display:'flex',gap:12,alignItems:'center'}}>
        <div style={{position:'relative',flex:1}}>
          <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',
              fontSize:16,color:C.fg3}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar movimiento…"
            style={{width:'100%',background:C.surf2,border:`1px solid ${C.borderS}`,
              color:C.fg1,borderRadius:12,height:44,paddingLeft:42,paddingRight:14,
              fontSize:13,outline:'none'}}/>
        </div>
        <div style={{display:'flex',gap:4,background:C.surf2,border:`1px solid ${C.border}`,
            borderRadius:12,padding:4,flexShrink:0}}>
          {[['all','Todos'],['income','Ingresos'],['expense','Gastos']].map(([v,l])=>(
            <div key={v} onClick={()=>setFilter(v)}
              style={{padding:'8px 14px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',
                color:filter===v?C.fg1:C.fg3,
                background:filter===v?C.surf3:'transparent',
                transition:'all .15s ease'}}>
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Grouped list */}
      {list.length===0?<div style={{background:C.surf,border:`1px solid ${C.border}`,
          borderRadius:18,padding:48,textAlign:'center',color:C.fg3,fontSize:13}}>
        {txs.length===0?'Todavía no hay movimientos.':'Sin resultados.'}</div>
      :dates.map(date=>{
        const dayTxs=groups[date];
        const net=dayTxs.reduce((s,t)=>t.type==='income'?s+t.amount:s-t.amount,0);
        const pos=net>=0;
        return (
          <div key={date}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'10px 16px',background:C.bg2,borderRadius:'12px 12px 0 0',
                border:`1px solid ${C.border}`,borderBottom:'none'}}>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:C.fg3}}>
                {new Date(date+'T00:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'long',weekday:'long'})
                  .replace(/^\w/,c=>c.toUpperCase())}
              </span>
              <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
                  color:net===0?C.fg2:pos?C.green:C.pink,
                  display:'inline-flex',alignItems:'center',gap:6}}>
                {net===0?'':pos?'↑ ':'↓ '}{fmt(net,pos?'+':'−')}
              </span>
            </div>
            <div style={{background:C.surf,border:`1px solid ${C.border}`,
                borderTop:'none',borderRadius:'0 0 16px 16px',overflow:'hidden'}}>
              {dayTxs.map(tx=>{
                const cat=CATS.find(c=>c.id===tx.category);
                const wid=tx.wallet==='manual'?'efectivo':tx.wallet;
                const bank=getBank(wid);
                const isIn=tx.type==='income';
                return (
                  <div key={tx.id} style={{borderBottom:`1px solid ${C.div}`}}>
                    <SwipeRow id={tx.id} onDelete={onDelete}>
                      <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',
                          transition:'background .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background=C.surf2}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <CatIcon id={tx.category} size={38}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:14,fontWeight:600,overflow:'hidden',
                                textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}</span>
                            {tx.recurring&&<Badge tone="amber">FIJO</Badge>}
                          </div>
                          <div style={{fontSize:12,color:C.fg3,marginTop:3,display:'flex',
                              alignItems:'center',gap:6}}>
                            <span>{cat?.label||tx.category}</span>
                            <span style={{opacity:.4}}>·</span>
                            <span>{fmtDate(tx.date)}</span>
                            {bank&&<><span style={{opacity:.4}}>·</span>
                              <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
                                <BankBadge id={wid} size={16}/>
                                {bank.name}
                              </span></>}
                          </div>
                        </div>
                        <div style={{fontSize:15,fontWeight:700,fontVariantNumeric:'tabular-nums',
                            color:isIn?C.green:C.pink,flexShrink:0}}>
                          {fmt(tx.amount,isIn?'+':'−')}
                        </div>
                      </div>
                    </SwipeRow>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── BANKS PAGE ──────────────────────────────────────────── */
function BanksPage({connected,txs,onSave,onClose}){
  const [local,setLocal]=useState([...connected]);
  const [view,setView]=useState('connected'); // 'connected' | 'directory'
  const [q,setQ]=useState('');
  const toggle=id=>{
    if(id==='efectivo') return;
    setLocal(prev=>prev.includes(id)?prev.filter(k=>k!==id):[...prev,id]);
  };
  const walBal=useCallback(id=>{
    const isEf=id==='efectivo';
    const wt=txs.filter(t=>isEf?(t.wallet==='manual'||t.wallet==='efectivo'):t.wallet===id);
    return wt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
          -wt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  },[txs]);
  const connectedNoEf=local.filter(id=>id!=='efectivo');
  const totalBanks=connectedNoEf.reduce((s,id)=>s+Math.max(0,walBal(id)),0);
  const banks=ARG_BANKS.filter(b=>b.type==='Banco'&&b.name.toLowerCase().includes(q.toLowerCase()));
  const wallets=ARG_BANKS.filter(b=>b.type==='Billetera'&&b.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{minHeight:'100vh',background:C.bg}}>
      <style>{G}</style>
      <header style={{display:'flex',alignItems:'center',gap:16,padding:'16px 32px',
          borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={{width:40,height:40,borderRadius:12,
            background:C.surf2,border:`1px solid ${C.borderS}`,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:C.fg2}}>✕</button>
        <h1 style={{fontSize:20,fontWeight:700}}>Mis Bancos</h1>
      </header>

      <div style={{padding:'24px 32px'}}>
        {/* Summary */}
        <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:20,padding:24,
            display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700}}>Mis bancos & billeteras</h2>
            <p style={{fontSize:13,color:C.fg3,marginTop:4}}>Conectá tus cuentas para ver el saldo unificado en tu Dashboard.</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:11,fontWeight:700,color:C.fg3,letterSpacing:'.08em',textTransform:'uppercase'}}>
              TOTAL EN BANCOS</p>
            <p style={{fontSize:28,fontWeight:700,fontVariantNumeric:'tabular-nums',marginTop:4}}>{fmt(totalBanks)}</p>
            <p style={{fontSize:12,color:C.fg3,marginTop:2}}>{connectedNoEf.length} cuentas vinculadas</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',background:C.surf,
            border:`1px solid ${C.border}`,borderRadius:16,padding:5,gap:4,marginBottom:20}}>
          {[['connected',`Conectados ${connectedNoEf.length}`],['directory',`Directorio ${ARG_BANKS.length}`]].map(([v,l])=>(
            <div key={v} onClick={()=>setView(v)}
              style={{padding:'12px',borderRadius:12,fontSize:14,fontWeight:600,textAlign:'center',
                cursor:'pointer',transition:'all .15s',
                color:view===v?C.violetHi:C.fg3,
                background:view===v?C.violetTint:'transparent'}}>
              {l}
            </div>
          ))}
        </div>

        {view==='connected'&&(
          connectedNoEf.length===0?
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:20,padding:48,
              textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>🏦</div>
            <h2 style={{fontSize:18,fontWeight:700,marginBottom:6}}>Todavía no hay bancos conectados</h2>
            <p style={{color:C.fg3,fontSize:13,marginBottom:20}}>
              Vinculá tu primera cuenta para ver tu saldo real al instante.</p>
            <button onClick={()=>setView('directory')} style={btnPrimary()}>+ Conectar un banco</button>
          </div>
          :<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}} className="two-col">
            {connectedNoEf.map(id=>{
              const bank=ARG_BANKS.find(b=>b.id===id); if(!bank) return null;
              const bal=walBal(id);
              return (
                <div key={id} style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:20,
                    padding:22,position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',right:-40,top:-40,width:160,height:160,borderRadius:'50%',
                      background:bank.color,opacity:.08,filter:'blur(4px)'}}/>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                      gap:12,marginBottom:16,position:'relative'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <BankBadge id={id} size={48}/>
                      <div>
                        <p style={{fontSize:16,fontWeight:700}}>{bank.name}</p>
                        <p style={{fontSize:12,color:C.fg3,marginTop:2}}>
                          {bank.type} · •••• {1000+bank.id.length*137}</p>
                      </div>
                    </div>
                    <Badge tone="green">CONECTADO</Badge>
                  </div>
                  <p style={{fontSize:28,fontWeight:700,fontVariantNumeric:'tabular-nums',
                      color:bal>=0?C.fg1:C.pink,position:'relative'}}>
                    {fmt(bal,bal>=0?'+':'−')}</p>
                  <p style={{fontSize:12,color:C.fg3,marginTop:4,marginBottom:16}}>Saldo neto del período</p>
                  <div style={{display:'flex',gap:8}}>
                    <button style={btnSec()}>Ver movimientos</button>
                    <button onClick={()=>toggle(id)}
                      style={{...btnBase(),background:'transparent',color:C.fg3}}>Desconectar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view==='directory'&&(
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',fontSize:16,color:C.fg3}}>🔍</span>
              <input value={q} onChange={e=>setQ(e.target.value)}
                placeholder="Buscar tu banco o billetera…"
                style={{width:'100%',background:C.surf,border:`1px solid ${C.borderS}`,
                  color:C.fg1,borderRadius:14,height:52,paddingLeft:48,paddingRight:16,
                  fontSize:15,outline:'none'}}/>
            </div>
            {[{title:'Bancos',items:banks},{title:'Billeteras virtuales',items:wallets}].map(({title,items})=>(
              <div key={title} style={{background:C.surf,border:`1px solid ${C.border}`,
                  borderRadius:20,overflow:'hidden'}}>
                <div style={{padding:'18px 20px 12px'}}>
                  <h2 style={{fontSize:17,fontWeight:700}}>{title}</h2>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)'}} className="three-col">
                  {items.map(b=>{
                    const linked=local.includes(b.id);
                    return (
                      <div key={b.id} onClick={()=>toggle(b.id)}
                        style={{display:'flex',alignItems:'center',gap:12,padding:16,
                          borderTop:`1px solid ${C.div}`,borderLeft:`1px solid ${C.div}`,
                          cursor:'pointer',transition:'background .15s',
                          background:linked?C.violetTint:'transparent'}}
                        onMouseEnter={e=>{if(!linked)e.currentTarget.style.background=C.surf2;}}
                        onMouseLeave={e=>{if(!linked)e.currentTarget.style.background='transparent';}}>
                        <BankBadge id={b.id} size={40}/>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:14,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.name}</p>
                          <p style={{fontSize:11,color:C.fg3,marginTop:2}}>{b.type}</p>
                        </div>
                        <span style={{width:24,height:24,borderRadius:8,flex:'none',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            background:linked?C.violet:'transparent',
                            border:linked?'0':`1.5px solid ${C.borderS}`,
                            color:'#fff',fontSize:14}}>
                          {linked&&'✓'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={()=>onSave(local)} style={{...btnPrimary(),width:'100%',justifyContent:'center',
                height:52,fontSize:15}}>
              Guardar cambios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ADD TX MODAL ────────────────────────────────────────── */
function AddTx({connectedIds,walBal,onSave,onClose}){
  const [type,setType]=useState('expense');
  const [amount,setAmount]=useState('');
  const [concept,setConcept]=useState('');
  const [category,setCategory]=useState('comida');
  const [walletId,setWalletId]=useState('efectivo');
  const [fixed,setFixed]=useState(false);
  const [dueDay,setDueDay]=useState('');
  const [date,setDate]=useState(todayISO());

  const cats=CATS.filter(c=>c.type===type);
  const valid=parseFloat(amount)>0&&concept.trim().length>0;

  const toneColor={green:C.green,pink:C.pink,amber:C.amber,violet:C.violetHi,muted:C.fg3};

  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:'fixed',inset:0,zIndex:200,background:'rgba(12,14,26,.82)',
        display:'flex',alignItems:'center',justifyContent:'center',padding:20,
        animation:'fadeIn .2s ease',backdropFilter:'blur(8px)'}}>
      <div className="tx-modal" onClick={e=>e.stopPropagation()}
        style={{width:'min(520px,100%)',maxHeight:'92vh',background:C.bg2,
          border:`1px solid ${C.borderS}`,borderRadius:22,padding:24,
          boxShadow:sh.s3,animation:'popIn .22s ease',
          display:'flex',flexDirection:'column',gap:16,overflowY:'auto'}}>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,letterSpacing:'-.02em'}}>Agregar movimiento</h2>
            <p style={{fontSize:13,color:C.fg3,marginTop:2}}>Cargá el detalle y sumalo a tu saldo.</p>
          </div>
          <button onClick={onClose} style={{width:36,height:36,borderRadius:10,background:C.surf2,
              border:'none',cursor:'pointer',display:'flex',alignItems:'center',
              justifyContent:'center',fontSize:18,color:C.fg2}}>✕</button>
        </div>

        {/* Gasto / Ingreso */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',background:C.surf2,
            border:`1px solid ${C.border}`,borderRadius:14,padding:5,gap:4}}>
          {[['expense','Gasto','📉'],['income','Ingreso','📈']].map(([v,l,ico])=>(
            <div key={v} onClick={()=>{setType(v);setCategory(v==='expense'?'comida':'sueldo');}}
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                padding:'12px',borderRadius:11,fontSize:14,fontWeight:600,cursor:'pointer',
                transition:'all .15s',
                color:type===v?'#fff':v==='expense'?C.pink:C.green,
                background:type===v?v==='expense'?'#7f1d2e':'#14532d':'transparent',
                boxShadow:type===v?sh.s2:'none'}}>
              <span>{ico}</span>{l}
            </div>
          ))}
        </div>

        {/* Monto + Concepto */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label style={labelStyle()}>MONTO</label>
            <div style={{display:'flex',alignItems:'center',gap:8,background:C.surf,
                border:`1px solid ${C.borderS}`,borderRadius:12,height:48,paddingLeft:14}}>
              <span style={{color:C.fg3,fontSize:16,fontWeight:600}}>$</span>
              <input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))}
                placeholder="0" inputMode="decimal"
                style={{background:'none',border:'none',outline:'none',flex:1,
                  fontSize:18,fontWeight:700,color:type==='income'?C.green:C.pink,fontVariantNumeric:'tabular-nums'}}/>
            </div>
          </div>
          <div>
            <label style={labelStyle()}>CONCEPTO</label>
            <input value={concept} onChange={e=>setConcept(e.target.value)}
              placeholder="Ej: Supermercado Coto"
              style={{width:'100%',height:48,background:C.surf,border:`1px solid ${C.borderS}`,
                borderRadius:12,padding:'0 14px',color:C.fg1,fontSize:13,outline:'none'}}
              onFocus={e=>e.target.style.borderColor=C.violet}
              onBlur={e=>e.target.style.borderColor=C.borderS}/>
          </div>
        </div>

        {/* Categoría */}
        <div>
          <label style={labelStyle()}>CATEGORÍA</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {cats.map(c=>{
              const active=category===c.id;
              const col=toneColor[c.tone]||C.fg3;
              return (
                <div key={c.id} onClick={()=>setCategory(c.id)}
                  style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 12px',
                    borderRadius:999,fontSize:12,fontWeight:600,cursor:'pointer',
                    transition:'all .15s',
                    background:active?col+'22':C.surf,
                    border:`1px solid ${active?col:C.borderS}`,
                    color:active?col:C.fg2}}>
                  <span style={{fontSize:13}}>{c.icon}</span>{c.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Billetera */}
        <div>
          <label style={labelStyle()}>BILLETERA</label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8}}>
            {connectedIds.map(id=>{
              const bank=getBank(id); if(!bank) return null;
              const active=walletId===id;
              return (
                <div key={id} onClick={()=>setWalletId(id)}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'8px 11px',
                    borderRadius:11,cursor:'pointer',transition:'all .15s',
                    background:active?C.violetTint:C.surf,
                    border:`1px solid ${active?C.violetRing:C.borderS}`}}>
                  <BankBadge id={id} size={28}/>
                  <span style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',
                      whiteSpace:'nowrap',color:active?C.violetHi:C.fg2}}>
                    {bank.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fecha */}
        <div>
          <label style={labelStyle()}>FECHA</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            style={{width:'100%',height:44,background:C.surf,border:`1px solid ${C.borderS}`,
              borderRadius:12,padding:'0 14px',color:C.fg1,fontSize:13,outline:'none'}}/>
        </div>

        {/* Fijo mensual */}
        {type==='expense'&&<div style={{background:C.surf,border:`1px solid ${C.borderS}`,
            borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,cursor:'pointer'}}
          onClick={()=>setFixed(!fixed)}>
          <div style={{width:22,height:22,borderRadius:8,border:`2px solid ${fixed?C.violet:C.borderS}`,
              background:fixed?C.violet:'transparent',display:'flex',alignItems:'center',
              justifyContent:'center',flexShrink:0,transition:'all .15s',fontSize:14}}>
            {fixed&&'✓'}
          </div>
          <div>
            <p style={{fontSize:14,fontWeight:600}}>Fijo mensual</p>
            <p style={{fontSize:12,color:C.fg3}}>Sumarlo a tus compromisos cada mes.</p>
          </div>
        </div>}
        {type==='expense'&&fixed&&<div>
          <label style={labelStyle()}>DÍA DE VENCIMIENTO <span style={{textTransform:'none',fontWeight:400,letterSpacing:0}}>(opcional)</span></label>
          <div style={{display:'flex',alignItems:'center',gap:10,background:C.surf,
              border:`1px solid ${dueDay?C.amber:C.borderS}`,borderRadius:12,height:44,padding:'0 14px'}}>
            <span style={{fontSize:16}}>📅</span>
            <input type="number" min="1" max="31" value={dueDay} onChange={e=>setDueDay(e.target.value)}
              placeholder="Ej: 5"
              style={{background:'none',border:'none',outline:'none',flex:1,fontSize:14,color:C.fg1}}/>
            {dueDay&&<span style={{fontSize:12,color:C.fg3}}>de cada mes</span>}
          </div>
        </div>}

        {/* Botones */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:10,marginTop:4}}>
          <button onClick={onClose} style={btnSec()}>Cancelar</button>
          <button disabled={!valid} onClick={()=>{if(valid)onSave({type,amount,concept:concept.trim(),
              category,walletId,fixed,dueDay,date});}}
            style={{...btnBase(),background:C.violet,color:'#fff',boxShadow:valid?sh.violet:'none',
              opacity:valid?1:.45,cursor:valid?'pointer':'not-allowed'}}>
            Guardar movimiento
          </button>
        </div>
      </div>
    </div>
  );
}

function labelStyle(){
  return {fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',
    color:C.fg3,display:'block',marginBottom:7};
}
