'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase"; // <-- KONEKSI SUPABASE DARI FASE 2
import {
  Home, BookOpen, Eye, PenLine, Plus, ChevronRight, Trash2,
  Clock, Sparkles, X, RefreshCw, CheckCircle, Send,
  Bell, AlertCircle, ChevronDown, ChevronUp, Loader, MessageCircle
} from "lucide-react";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const QUOTES = [
  { text: "Sesungguhnya bersama kesulitan ada kemudahan.", source: "QS. Al-Insyirah: 6" },
  { text: "Dan bertawakkallah kepada Allah. Cukuplah Allah sebagai Pelindung.", source: "QS. Al-Ahzab: 3" },
  { text: "Barang siapa yang bersungguh-sungguh, ia pasti akan berhasil.", source: "Man Jadda Wa Jada" },
  { text: "Hafalan adalah mahkota yang kamu kenakan di dunia dan akhirat.", source: "Motivasi Spesial" },
  { text: "Setiap langkah kecil menuju hafalan yang lancar adalah ibadah.", source: "Untukmu, Nilam" },
];

const SURPRISES = [
  "Semangat ya Nilam! Hafalanmu pasti kembali lancar!",
  "Kamu sudah berusaha keras hari ini, itu luar biasa!",
  "Hafalan yang hilang itu bukan kegagalan — itu undangan untuk kembali.",
  "Otak kamu butuh istirahat juga. Tapi jangan lupa review ya!",
  "Percaya deh, hafalanmu lebih kuat dari yang kamu kira!",
];

const MOODS = ["🌟","😊","😐","😔","💪","🌸","🥱","🤲"];

const SM = {
  merah:  { dot:"#E07070", bg:"#FEF0F0", text:"#B03030", label:"Lupa Total" },
  kuning: { dot:"#E8A020", bg:"#FEF6E0", text:"#9A6200", label:"Samar-samar" },
  hijau:  { dot:"#5AAB8C", bg:"#EBF7F2", text:"#1A6B50", label:"Lancar" },
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
const addDays = (d: any, n: number) => { const x=new Date(d); x.setDate(x.getDate()+n); return x.toISOString(); };
const fmt = (d: any) => new Date(d).toLocaleDateString("id-ID",{day:"numeric",month:"short"});
const fmtDT = (d: any) => new Date(d).toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const isOverdue = (d: any) => new Date(d) <= new Date();
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);

const computeNext = (interval: number, q: number) => {
  const ni = q===0?1 : q===1?Math.max(1,Math.floor(interval*1.2)) : q===2?Math.max(2,Math.floor(interval*1.8)) : Math.max(4,Math.floor(interval*2.5));
  return { interval:ni, nextReview:addDays(new Date(),ni) };
};

// ─── QURAN API ───────────────────────────────────────────────────────────────
const qGetSurahs = async () => { const r=await fetch("https://api.alquran.cloud/v1/surah"); const d=await r.json(); return d.data; };
const qGetAyahs = async (num: number, s: number, e: number) => { const r=await fetch(`https://api.alquran.cloud/v1/surah/${num}`); const d=await r.json(); return d.data.ayahs.slice(s-1,e); };

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function HafalIn() {
  const [isMounted, setIsMounted] = useState(false);
  const [tab, setTab] = useState("home");
  const [hafalan, setHafalan] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const [surprise, setSurprise] = useState<string | null>(null);
  const [sprVis, setSprVis] = useState(false);

  const [surahs, setSurahs] = useState<any[]>([]);
  const [srchSurah, setSrchSurah] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [fSurah, setFSurah] = useState<any>(null);
  const [fStart, setFStart] = useState(1);
  const [fEnd, setFEnd] = useState(5);
  const [fArabic, setFArabic] = useState("");
  const [fStatus, setFStatus] = useState("merah");
  const [fetchingAr, setFetchingAr] = useState(false);
  const [showSurahPicker, setShowSurahPicker] = useState(false);

  const [revItem, setRevItem] = useState<any>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const [showJForm, setShowJForm] = useState(false);
  const [jMood, setJMood] = useState("😊");
  const [jNotes, setJNotes] = useState("");
  const [expandedJ, setExpandedJ] = useState<string | null>(null);
  const [replyTxt, setReplyTxt] = useState("");

  const [notifPerm, setNotifPerm] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try { return Notification.permission; } catch { return "denied"; }
    }
    return "default";
  });
  const notifChecked = useRef(false);

  const T="#3D3250", TM="#9B8FAD", C="#C97AB5", CS="#5AA88C", CA="#E8A020";
  const INP={width:"100%",padding:"11px 14px",borderRadius:"12px",border:"1.5px solid #E4DFF0",fontSize:"14px",background:"#FDFCFE",color:T,fontFamily:"'Inter',sans-serif",outline:"none",boxSizing:"border-box" as const};

  useEffect(() => {
    setIsMounted(true);
    setQuoteIdx(Math.floor(Math.random() * QUOTES.length));
    loadAll(); 
    loadSurahs();
  }, []);

  useEffect(() => {
    if (!hafalan.length || notifChecked.current) return;
    notifChecked.current = true;
    const due = hafalan.filter(h => isOverdue(h.nextReview));
    if (due.length > 0 && notifPerm === "granted") {
      try { new Notification("HafalIn - Review Time!",{body:`${due.length} hafalan butuh di-review hari ini, Nilam!`}); } catch {}
    }
  }, [hafalan.length, notifPerm]);

  // ── SUPABASE FETCHING ──
  const loadSurahs = async () => { try { setSurahs(await qGetSurahs()); } catch {} };

  const loadAll = async () => {
    setSyncing(true);
    try {
      const { data: hData } = await supabase.from('hafalans').select('*').order('nextReview', { ascending: true });
      const { data: jData } = await supabase.from('journals').select('*').order('date', { ascending: false });
      
      if (hData) setHafalan(hData);
      if (jData) setJournal(jData);
    } catch (e) {
      console.error("Gagal sync:", e);
    }
    setSyncing(false);
  };

  const doSurprise = () => {
    setSurprise(SURPRISES[Math.floor(Math.random() * SURPRISES.length)]);
    setSprVis(true); 
    setTimeout(() => setSprVis(false), 4200);
  };

  const fetchArabic = async () => {
    if (!fSurah) return;
    setFetchingAr(true); setFArabic("");
    try {
      const ayahs = await qGetAyahs(fSurah.number, fStart, fEnd);
      setFArabic(ayahs.map((a: any) => a.text).join(" ۝ "));
    } catch {}
    setFetchingAr(false);
  };

  const addHafalan = async () => {
    if (!fSurah || !fArabic) return;
    const ni = fStatus === "merah" ? 1 : fStatus === "kuning" ? 3 : 7;
    
    // Perhatikan nama key (kiri) ini HARUS SAMA PERSIS dengan nama kolom di tabel Supabase lu
    const it = {
      judul: `${fSurah.englishName} (${fStart}–${fEnd})`,
      judulAr: fSurah.name, 
      surahNum: fSurah.number,
      ayahStart: fStart, 
      ayahEnd: fEnd, 
      konten: fArabic,
      status: fStatus, 
      lastReview: new Date().toISOString(),
      nextReview: addDays(new Date(), ni), 
      interval: ni, 
      reviewCount: 0,
    };
    
    // Kirim data dan tangkap pesan errornya
    const { data, error } = await supabase.from('hafalans').insert([it]);
    
    if (error) {
      console.error("DETAIL ERROR SUPABASE:", error);
      alert(`Gagal simpan ke database: ${error.message}`); // Munculin pop-up biar lu langsung tau
      return; // Stop eksekusi biar formnya nggak ketutup
    }
    
    await loadAll();
    
    setFSurah(null); setFStart(1); setFEnd(5); setFArabic(""); setFStatus("merah"); setShowAdd(false);
  };

  const deleteHafalan = async (id: string) => {
    await supabase.from('hafalans').delete().eq('id', id);
    await loadAll();
  };

  const quickStatusUpdate = async (id: string, newStatus: string) => {
    await supabase.from('hafalans').update({ status: newStatus }).eq('id', id);
    await loadAll();
  };

  const submitReview = async (q: number) => {
    if (!revItem) return;
    const { interval, nextReview } = computeNext(revItem.interval, q);
    const st = q === 0 ? "merah" : q === 1 ? "kuning" : "hijau";
    
    await supabase.from('hafalans').update({
      status: st,
      lastReview: new Date().toISOString(),
      nextReview: nextReview,
      interval: interval,
      reviewCount: revItem.reviewCount + 1
    }).eq('id', revItem.id);
    
    await loadAll();
    setRevItem(null); setTab("hafalan");
  };

  const addJournal = async () => {
    if (!jNotes.trim()) return;
    
    // Simpan responsnya ke dalam variabel error
    const { error } = await supabase.from('journals').insert([{
      date: new Date().toISOString(),
      mood: jMood,
      notes: jNotes,
      replies: [] // <-- Ini tersangka utama, pastikan kolom replies (tipe JSONB) udah lu bikin
    }]);
    
    // Tangkap dan tampilkan errornya
    if (error) {
      console.error("DETAIL ERROR JURNAL:", error);
      alert(`Gagal simpan jurnal: ${error.message}`);
      return; // Stop eksekusi biar form nggak nutup
    }
    
    await loadAll();
    setJNotes(""); setJMood("😊"); setShowJForm(false);
  };

  const addReply = async (jid: string, currentReplies: any[]) => {
    if (!replyTxt.trim()) return;
    const nxtReplies = [...(currentReplies || []), { id: uid(), author: "Aku", text: replyTxt, ts: new Date().toISOString() }];
    await supabase.from('journals').update({ replies: nxtReplies }).eq('id', jid);
    await loadAll();
    setReplyTxt("");
  };

  const reqNotif = async () => {
    try { const p = await Notification.requestPermission(); setNotifPerm(p); } catch {}
  };

  const due = hafalan.filter(h => isOverdue(h.nextReview));
  const filtSurahs = surahs.filter(s =>
    s.englishName.toLowerCase().includes(srchSurah.toLowerCase()) ||
    s.name.includes(srchSurah) ||
    String(s.number).includes(srchSurah)
  );
  if (!isMounted) {
    // Tampilkan layar warna background saja selama 0.1 detik pertama untuk mencegah Hydration Error
    return <div style={{ minHeight: "100vh", background: "#FDF6F0" }} />; 
  }

  return (
    <div style={{fontFamily:"'Inter',sans-serif",background:"#FDF6F0",minHeight:"100vh",maxWidth:"430px",margin:"0 auto",color:T,paddingBottom:"76px",position:"relative"}}>
      
      {sprVis && <div style={{position:"fixed",top:"18px",left:"50%",transform:"translateX(-50%)",zIndex:1000,background:"#fff",borderRadius:"16px",padding:"14px 18px",boxShadow:"0 8px 28px rgba(201,122,181,.3)",border:"1px solid #F0E2F5",maxWidth:"320px",width:"88%",textAlign:"center",animation:"slideDown .28s ease"}}>
        <div style={{fontSize:"11px",color:C,fontWeight:700,letterSpacing:"1px",marginBottom:"5px",textTransform:"uppercase"}}>Pesan Untukmu 🌸</div>
        <div style={{fontSize:"14px",color:T,lineHeight:1.55}}>{surprise}</div>
      </div>}

      {/* ── HOME ──────────────────────────────────────────────────────────── */}
      {tab==="home" && <div style={{padding:"24px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
          <div>
            <div style={{fontSize:"12px",color:TM,marginBottom:"3px"}}>{new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"})}</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"26px",fontWeight:600,margin:0}}>Halo, Nilam!</h1>
            <p style={{fontSize:"14px",color:TM,margin:"4px 0 0"}}>Yuk cek hafalanmu hari ini</p>
          </div>
          <div style={{display:"flex",gap:"8px",alignItems:"center",marginTop:"4px"}}>
            {syncing && <Loader size={17} color={C} className="spin"/>}
            {!syncing && <button onClick={loadAll} className="ghost-btn"><RefreshCw size={18} color={TM}/></button>}
          </div>
        </div>

        {notifPerm !== "granted" && <div onClick={reqNotif} style={{background:"#FEF6E0",border:"1px solid #FAD98C",borderRadius:"14px",padding:"11px 14px",marginBottom:"14px",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px"}}>
          <Bell size={16} color={CA}/>
          <div>
            <div style={{fontSize:"13px",fontWeight:700,color:"#8A5500"}}>Aktifkan Notifikasi</div>
            <div style={{fontSize:"11px",color:"#9A6200",marginTop:"1px"}}>Biar kamu gak lupa review hafalan.</div>
          </div>
        </div>}

        <div style={{background:"linear-gradient(140deg,#C97AB5 0%,#9A58A0 100%)",borderRadius:"22px",padding:"20px",marginBottom:"18px",color:"#fff",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:"14px",top:"4px",fontSize:"60px",opacity:.1,fontFamily:"serif",lineHeight:1}}>"</div>
          <div style={{fontSize:"10px",fontWeight:700,letterSpacing:"1.5px",opacity:.75,marginBottom:"9px",textTransform:"uppercase"}}>Inspirasi Hari Ini</div>
          <p style={{fontFamily:"'Playfair Display',serif",fontSize:"15px",fontStyle:"italic",lineHeight:1.7,margin:"0 0 9px"}}>"{QUOTES[quoteIdx].text}"</p>
          <div style={{fontSize:"12px",opacity:.72}}>— {QUOTES[quoteIdx].source}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"18px"}}>
          {[
            {label:"Total",val:hafalan.length,color:C,bg:"#F5E8F2"},
            {label:"Perlu Ulang",val:hafalan.filter(h=>h.status==="merah").length,color:"#E07070",bg:"#FEF0F0"},
            {label:"Lancar",val:hafalan.filter(h=>h.status==="hijau").length,color:CS,bg:"#EBF7F2"},
          ].map(s=><div key={s.label} style={{background:s.bg,borderRadius:"16px",padding:"14px 8px",textAlign:"center"}}>
            <div style={{fontSize:"26px",fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:"11px",color:TM,marginTop:"4px"}}>{s.label}</div>
          </div>)}
        </div>

        {due.length>0 && <div style={{marginBottom:"18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px",fontWeight:700,color:T,marginBottom:"10px"}}>
            <Clock size={14} color="#E07070"/> Review Hari Ini ({due.length})
          </div>
          {due.slice(0,3).map(h=><div key={h.id} onClick={()=>{setRevItem(h);setRevealed(new Set());setTab("review");}} className="card" style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",padding:"13px 15px",marginBottom:"8px",border:`1px solid ${(SM as any)[h.status].bg}`}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <div style={{width:"9px",height:"9px",borderRadius:"50%",background:(SM as any)[h.status].dot,flexShrink:0}}/>
              <div>
                <div style={{fontSize:"14px",fontWeight:600}}>{h.judul}</div>
                {h.judulAr && <div className="arabic" style={{fontSize:"15px",color:TM,marginTop:"1px"}}>{h.judulAr}</div>}
              </div>
            </div>
            <ChevronRight size={15} color={C}/>
          </div>)}
        </div>}

        {due.length===0 && hafalan.length>0 && <div style={{background:"#EBF7F2",borderRadius:"16px",padding:"14px",marginBottom:"18px",display:"flex",alignItems:"center",gap:"12px"}}>
          <CheckCircle size={22} color={CS}/>
          <div>
            <div style={{fontWeight:700,fontSize:"14px",color:"#1A6B50"}}>Semua sudah di-review!</div>
            <div style={{fontSize:"12px",color:"#4A9A7A",marginTop:"2px"}}>Bagus banget, Nilam! Istirahat dulu ya.</div>
          </div>
        </div>}

        <button onClick={doSurprise} style={{width:"100%",background:`linear-gradient(135deg,${CA},#CC8810)`,border:"none",borderRadius:"16px",padding:"15px",color:"#fff",fontSize:"15px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",boxShadow:"0 4px 16px rgba(232,160,32,.3)"}}>
          <Sparkles size={17}/> Klik untuk Semangat!
        </button>
      </div>}

      {/* ── HAFALAN ───────────────────────────────────────────────────────── */}
      {tab==="hafalan" && <div style={{padding:"24px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:600,margin:0}}>Lost & Found</h2>
          <button onClick={()=>setShowAdd(true)} style={{background:C,border:"none",borderRadius:"12px",padding:"8px 14px",color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}>
            <Plus size={14}/> Tambah
          </button>
        </div>

        <div style={{display:"flex",gap:"7px",marginBottom:"14px",flexWrap:"wrap"}}>
          {Object.entries(SM).map(([k,v])=><div key={k} className="pill" style={{background:v.bg,color:v.text}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:v.dot}}/>{v.label}
          </div>)}
        </div>

        {hafalan.length===0 && !syncing && <div style={{textAlign:"center",padding:"44px 20px",color:TM}}>
          <div className="arabic" style={{fontSize:"28px",margin:"0 0 10px",color:C}}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <p style={{margin:0,fontSize:"14px"}}>Belum ada hafalan. Yuk tambahkan!</p>
        </div>}

        {hafalan.map(h => {
          const sm = (SM as any)[h.status];
          const od = isOverdue(h.nextReview);
          return <div key={h.id} className="card" style={{border:`1px solid ${od?"#FCD8D8":"#F2EEF8"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:"15px"}}>{h.judul}</div>
                {h.judulAr && <div className="arabic" style={{fontSize:"17px",color:C,marginTop:"2px"}}>{h.judulAr}</div>}
                <div style={{marginTop:"5px"}}>
                  {od ? <span className="pill" style={{background:"#FEF0F0",color:"#B03030"}}>⚠ Perlu review!</span>
                      : <span style={{fontSize:"12px",color:TM}}>Review: {fmt(h.nextReview)} · {h.reviewCount}× done</span>}
                </div>
              </div>
              <button className="ghost-btn" onClick={() => deleteHafalan(h.id)}><Trash2 size={14} color="#CCC"/></button>
            </div>
            <div style={{display:"flex",gap:"6px",marginBottom:"10px"}}>
              {Object.entries(SM).map(([k,v])=><button key={k} className="sbtn" onClick={() => quickStatusUpdate(h.id, k)} style={{borderColor:h.status===k?v.dot:"transparent",background:h.status===k?v.bg:"#F8F6FC",color:h.status===k?v.text:TM,fontWeight:h.status===k?700:400}}>
                <div style={{width:"6px",height:"6px",borderRadius:"50%",background:v.dot}}/>{v.label}
              </button>)}
            </div>
            <button onClick={()=>{setRevItem(h);setRevealed(new Set());setTab("review");}} style={{width:"100%",background:"#F5E8F2",border:"none",borderRadius:"10px",padding:"9px",color:C,fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
              <Eye size={14}/> Review Sekarang
            </button>
          </div>;
        })}

        {/* Add Modal */}
        {showAdd && <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal-box">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"20px",margin:0}}>Tambah Hafalan</h3>
              <button className="ghost-btn" onClick={()=>setShowAdd(false)}><X size={20} color={TM}/></button>
            </div>

            <div style={{fontSize:"13px",color:TM,marginBottom:"6px",fontWeight:600}}>Pilih Surat Al-Quran</div>
            <div onClick={()=>setShowSurahPicker(!showSurahPicker)} style={{...INP,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              {fSurah ? <div style={{display:"flex",alignItems:"center",gap:"10px"}}><span style={{fontSize:"14px",fontWeight:600}}>{fSurah.number}. {fSurah.englishName}</span><span className="arabic" style={{fontSize:"18px",color:C}}>{fSurah.name}</span></div> : <span style={{color:TM,fontSize:"14px"}}>Pilih surat...</span>}
              {showSurahPicker ? <ChevronUp size={15} color={TM}/> : <ChevronDown size={15} color={TM}/>}
            </div>

            {showSurahPicker && <div style={{background:"#fff",border:"1.5px solid #E4DFF0",borderRadius:"12px",marginBottom:"12px",maxHeight:"200px",overflowY:"auto"}}>
              <div style={{padding:"8px 10px",borderBottom:"1px solid #F0ECF8",position:"sticky",top:0,background:"#fff"}}>
                <input value={srchSurah} onChange={e=>setSrchSurah(e.target.value)} placeholder="Cari surat..." style={{...INP,padding:"7px 10px",fontSize:"13px"}}/>
              </div>
              {filtSurahs.map(s=><div key={s.number} onClick={()=>{setFSurah(s);setFStart(1);setFEnd(Math.min(5,s.numberOfAyahs));setFArabic("");setShowSurahPicker(false);setSrchSurah("");}} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #F8F6FC",display:"flex",justifyContent:"space-between",alignItems:"center",background:fSurah?.number===s.number?"#F5E8F2":"transparent"}}>
                <div><span style={{fontSize:"13px",fontWeight:500}}>{s.number}. {s.englishName}</span></div>
                <span className="arabic" style={{fontSize:"18px",color:C}}>{s.name}</span>
              </div>)}
            </div>}

            {fSurah && <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
                <div><div style={{fontSize:"12px",color:TM,marginBottom:"5px"}}>Ayat dari</div><input type="number" value={fStart} onChange={e=>setFStart(Math.max(1,Math.min(+e.target.value,fSurah.numberOfAyahs)))} min={1} max={fSurah.numberOfAyahs} style={INP}/></div>
                <div><div style={{fontSize:"12px",color:TM,marginBottom:"5px"}}>Sampai ayat</div><input type="number" value={fEnd} onChange={e=>setFEnd(Math.max(fStart,Math.min(+e.target.value,fSurah.numberOfAyahs)))} min={fStart} max={fSurah.numberOfAyahs} style={INP}/></div>
              </div>
              <button onClick={fetchArabic} disabled={fetchingAr} style={{width:"100%",background:fetchingAr?"#F0ECF8":"#F5E8F2",border:"none",borderRadius:"12px",padding:"10px",color:C,fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",marginBottom:"12px"}}>
                {fetchingAr ? <><Loader size={14} className="spin"/> Mengambil teks...</> : <><RefreshCw size={14}/> Ambil Teks Arab</>}
              </button>
              {fArabic && <div style={{background:"#FAF7FF",border:"1px solid #EDE4F8",borderRadius:"14px",padding:"16px 14px",marginBottom:"14px"}}>
                <div className="arabic" style={{fontSize:"22px",lineHeight:2.4,color:"#2D1F4A"}}>{fArabic}</div>
              </div>}
            </>}

            <div style={{fontSize:"13px",color:TM,marginBottom:"7px",fontWeight:600}}>Status awal hafalan:</div>
            <div style={{display:"flex",gap:"8px",marginBottom:"18px"}}>
              {Object.entries(SM).map(([k,v])=><button key={k} className="sbtn" onClick={()=>setFStatus(k)} style={{borderColor:fStatus===k?v.dot:"transparent",background:fStatus===k?v.bg:"#F8F6FC",color:fStatus===k?v.text:TM,fontWeight:fStatus===k?700:400}}>
                <div style={{width:"7px",height:"7px",borderRadius:"50%",background:v.dot}}/>{v.label}
              </button>)}
            </div>

            <button className="primary-btn" onClick={addHafalan} disabled={!fSurah||!fArabic} style={{opacity:(!fSurah||!fArabic)?0.5:1}}>Simpan Hafalan ✓</button>
          </div>
        </div>}
      </div>}

      {/* ── REVIEW ────────────────────────────────────────────────────────── */}
      {tab==="review" && <div style={{padding:"24px 20px"}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:600,marginBottom:"4px"}}>Blur & Reveal</h2>
        <p style={{fontSize:"13px",color:TM,marginBottom:"20px"}}>Tap setiap kata Arab untuk mengungkapnya</p>

        {!revItem ? <>
          {hafalan.map(h => {
            const sm = (SM as any)[h.status];
            return <div key={h.id} onClick={()=>{setRevItem(h);setRevealed(new Set());}} className="card" style={{cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{width:"10px",height:"10px",borderRadius:"50%",background:sm.dot}}/>
                <div>
                  <div style={{fontWeight:600,fontSize:"14px"}}>{h.judul}</div>
                  <div style={{fontSize:"12px",color:TM,marginTop:"2px"}}>Interval {h.interval} hari</div>
                </div>
              </div>
              <ChevronRight size={15} color={C}/>
            </div>;
          })}
        </> : <>
          <div className="card" style={{marginBottom:"14px"}}>
            <div style={{fontWeight:700,fontSize:"16px"}}>{revItem.judul}</div>
            {revItem.judulAr && <div className="arabic" style={{fontSize:"20px",color:C,marginTop:"2px"}}>{revItem.judulAr}</div>}
            
            {revItem.konten && <>
              <div style={{direction:"rtl",textAlign:"right",lineHeight:3,margin:"14px 0"}}>
                {revItem.konten.split(" ").map((w: string, i: number)=><span key={i} onClick={()=>setRevealed(p=>{const s=new Set(p);s.add(i);return s;})} className={`rword ${revealed.has(i)?"clear-w":"blur-w"}`}>{w}</span>)}
              </div>
              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={()=>setRevealed(new Set(revItem.konten.split(" ").map((_: any, i: number)=>i)))} style={{flex:1,background:"#F5E8F2",border:"none",borderRadius:"10px",padding:"8px",color:C,fontSize:"13px",fontWeight:700,cursor:"pointer"}}>Reveal Semua</button>
                <button onClick={()=>setRevealed(new Set())} style={{flex:1,background:"#F8F6FC",border:"none",borderRadius:"10px",padding:"8px",color:TM,fontSize:"13px",cursor:"pointer"}}>Reset</button>
              </div>
            </>}
          </div>

          <div className="card">
            <div style={{fontWeight:700,fontSize:"15px",marginBottom:"14px"}}>Gimana hafalannya tadi?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"12px"}}>
              {[
                {q:0,emoji:"😰",label:"Lupa Total",bg:"#FEF0F0",color:"#B03030"},
                {q:1,emoji:"😅",label:"Masih Susah",bg:"#FEF6E0",color:"#8A5500"},
                {q:2,emoji:"😊",label:"Oke!",bg:"#EBF7F2",color:"#1A6B50"},
                {q:3,emoji:"🎉",label:"Lancar Banget!",bg:"#F5E8F2",color:"#7A4090"},
              ].map(r=><button key={r.q} onClick={()=>submitReview(r.q)} style={{background:r.bg,border:"none",borderRadius:"14px",padding:"14px 10px",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:"26px",marginBottom:"4px"}}>{r.emoji}</div>
                <div style={{fontSize:"12px",fontWeight:700,color:r.color}}>{r.label}</div>
              </button>)}
            </div>
            <button onClick={()=>setRevItem(null)} style={{width:"100%",background:"none",border:"none",color:TM,fontSize:"13px",cursor:"pointer",padding:"6px"}}>Batal</button>
          </div>
        </>}
      </div>}

      {/* ── JURNAL ────────────────────────────────────────────────────────── */}
      {tab==="jurnal" && <div style={{padding:"24px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:600,margin:0}}>Jurnal Harian</h2>
          <button onClick={()=>setShowJForm(true)} style={{background:CS,border:"none",borderRadius:"12px",padding:"8px 14px",color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}>
            <Plus size={14}/> Tulis
          </button>
        </div>

        {journal.map(j => {
          const reps = j.replies || [];
          const isExp = expandedJ === j.id;
          return <div key={j.id} className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontSize:"26px"}}>{j.mood}</span>
                <div>
                  <div style={{fontSize:"12px",color:T,fontWeight:600}}>{new Date(j.date).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"})}</div>
                  <div style={{fontSize:"11px",color:TM}}>{new Date(j.date).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                {reps.length>0 && <span className="pill" style={{background:"#F5E8F2",color:C}}><MessageCircle size={10}/> {reps.length}</span>}
                <button className="ghost-btn" onClick={()=>setExpandedJ(isExp?null:j.id)}>{isExp?<ChevronUp size={17} color={TM}/>:<ChevronDown size={17} color={TM}/>}</button>
              </div>
            </div>

            <div className="chat-nilam">
              <div style={{fontSize:"11px",color:C,fontWeight:700,marginBottom:"5px"}}>Nilam</div>
              <p style={{fontSize:"14px",lineHeight:1.65,color:T,margin:0}}>{j.notes}</p>
            </div>

            {isExp && <>
              <div style={{marginTop:"10px",display:"flex",flexDirection:"column",gap:"8px"}}>
                {reps.map((r: any) => <div key={r.id} style={{display:"flex",justifyContent:"flex-end"}}>
                  <div className="chat-reply" style={{maxWidth:"82%"}}>
                    <div style={{fontSize:"11px",color:"rgba(255,255,255,.7)",fontWeight:700,marginBottom:"4px"}}>{r.author}</div>
                    <p style={{fontSize:"14px",lineHeight:1.55,margin:0}}>{r.text}</p>
                  </div>
                </div>)}
              </div>
              <div style={{display:"flex",gap:"8px",marginTop:"12px",alignItems:"center"}}>
                <input value={replyTxt} onChange={e=>setReplyTxt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addReply(j.id, reps)} placeholder="Balas curhatan Nilam..." style={{...INP,flex:1,padding:"9px 12px",fontSize:"13px"}}/>
                <button onClick={()=>addReply(j.id, reps)} style={{background:C,border:"none",borderRadius:"10px",padding:"9px 12px",color:"#fff",cursor:"pointer"}}><Send size={15}/></button>
              </div>
            </>}
          </div>;
        })}

        {showJForm && <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowJForm(false)}>
          <div className="modal-box">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"20px",margin:0}}>Tulis Jurnal</h3>
              <button className="ghost-btn" onClick={()=>setShowJForm(false)}><X size={20} color={TM}/></button>
            </div>
            <div style={{display:"flex",gap:"7px",marginBottom:"16px",flexWrap:"wrap"}}>
              {MOODS.map(m=><button key={m} onClick={()=>setJMood(m)} style={{fontSize:"22px",background:jMood===m?"#F5E8F2":"transparent",border:`2px solid ${jMood===m?C:"transparent"}`,borderRadius:"10px",padding:"5px",cursor:"pointer",width:"42px",height:"42px"}}>{m}</button>)}
            </div>
            <textarea value={jNotes} onChange={e=>setJNotes(e.target.value)} placeholder="Ceritain progresmu hari ini..." rows={5} style={{...INP,resize:"none",marginBottom:"16px"}}/>
            <button className="primary-btn" onClick={addJournal} style={{background:`linear-gradient(135deg,${CS},#3E8870)`}}>Simpan Jurnal ✓</button>
          </div>
        </div>}
      </div>}

      {/* ── BOTTOM NAV ────────────────────────────────────────────────────── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"430px",background:"#fff",borderTop:"1px solid #EDE8F5",display:"grid",gridTemplateColumns:"repeat(4,1fr)",boxShadow:"0 -4px 20px rgba(61,50,80,.09)",zIndex:100}}>
        {[
          {id:"home", icon:<Home size={20}/>, label:"Beranda"},
          {id:"hafalan", icon:<BookOpen size={20}/>, label:"Hafalan"},
          {id:"review", icon:<Eye size={20}/>, label:"Review"},
          {id:"jurnal", icon:<PenLine size={20}/>, label:"Jurnal"},
        ].map(t=><button key={t.id} className="tab-btn" onClick={()=>{setTab(t.id);if(t.id!=="review")setRevItem(null);}} style={{background:"none",border:"none",padding:"11px 8px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",color:tab===t.id?C:TM}}>
          {t.icon}
          <span style={{fontSize:"10px",fontWeight:tab===t.id?700:400}}>{t.label}</span>
        </button>)}
      </div>
    </div>
  );
}