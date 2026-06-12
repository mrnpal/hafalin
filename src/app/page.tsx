'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Home, BookOpen, Eye, PenLine, Plus, ChevronRight, Trash2,
  Clock, X, RefreshCw, CheckCircle, Send,
  Bell, ChevronDown, ChevronUp, Loader, MessageCircle,
  Flame, Play, Square, Heart, Gift, Lock, Calendar, Dices
} from "lucide-react";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const QUOTES = [
  { text: "Sesungguhnya bersama kesulitan ada kemudahan.", source: "QS. Al-Insyirah: 6" },
  { text: "Dan bertawakkallah kepada Allah. Cukuplah Allah sebagai Pelindung.", source: "QS. Al-Ahzab: 3" },
  { text: "Barang siapa yang bersungguh-sungguh, ia pasti akan berhasil.", source: "Man Jadda Wa Jada" },
  { text: "Hafalan adalah mahkota yang kamu kenakan di dunia dan akhirat.", source: "Motivasi Spesial" },
  { text: "Setiap langkah kecil menuju hafalan yang lancar adalah ibadah.", source: "Untukmu, Nilam" },
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
const isOverdue = (d: any) => new Date(d) <= new Date();
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);

const computeNext = (interval: number, q: number) => {
  const ni = q===0?1 : q===1?Math.max(1,Math.floor(interval*1.2)) : q===2?Math.max(2,Math.floor(interval*1.8)) : Math.max(4,Math.floor(interval*2.5));
  return { interval:ni, nextReview:addDays(new Date(),ni) };
};

// ─── QURAN API ───────────────────────────────────────────────────────────────
const qGetSurahs = async () => { const r=await fetch("https://api.alquran.cloud/v1/surah"); const d=await r.json(); return d.data; };
const qGetAyahs = async (num: number, s: number, e: number) => { const r=await fetch(`https://api.alquran.cloud/v1/surah/${num}/quran-uthmani`); const d=await r.json(); return d.data.ayahs.slice(s-1,e); };
const toArabicNum = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function HafalIn() {
  const [isMounted, setIsMounted] = useState(false);
  const [tab, setTab] = useState("home");
  const [hafalan, setHafalan] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Fitur Streak & Progress Total
  const [streak, setStreak] = useState(0);
  const totalReviews = hafalan.reduce((acc, curr) => acc + (curr.reviewCount || 0), 0);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});

  // Fitur Audio Murottal
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  // FITUR FUN: Prank Tombol Kabur
  const [showPrank, setShowPrank] = useState(false);
  const [prankPos, setPrankPos] = useState({ top: 0, left: 0 });

  // FITUR FUN: Mesin Gacha Jajan
  const [gachaResult, setGachaResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

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

  const [notifPerm, setNotifPerm] = useState("default");

  const T="#3D3250", TM="#9B8FAD", C="#C97AB5", CS="#5AA88C", CA="#E8A020";
  const INP={width:"100%",padding:"11px 14px",borderRadius:"12px",border:"1.5px solid #E4DFF0",fontSize:"14px",background:"#FDFCFE",color:T,fontFamily:"'Inter',sans-serif",outline:"none",boxSizing:"border-box" as const};

  useEffect(() => {
    setIsMounted(true);
    setQuoteIdx(Math.floor(Math.random() * QUOTES.length));
    loadAll(); 
    loadSurahs();

    if (typeof window !== 'undefined') {
      try { setNotifPerm(Notification.permission); } catch {}
      
      const today = new Date().toISOString().split('T')[0];
      const stored = JSON.parse(localStorage.getItem('hafalin-streak') || '{"count": 0, "lastDate": ""}');
      
      if (stored.lastDate === today) {
        setStreak(stored.count);
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (stored.lastDate === yesterday.toISOString().split('T')[0]) {
          setStreak(stored.count);
        } else {
          setStreak(0);
          localStorage.setItem('hafalin-streak', JSON.stringify({ count: 0, lastDate: "" }));
        }
      }

      const storedHeatmap = JSON.parse(localStorage.getItem('hafalin-heatmap') || '{}');
      setHeatmap(storedHeatmap);
    }
  }, []);

  // Matikan audio kalau komponen review ditutup
  useEffect(() => {
    if (tab !== "review" && audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  }, [tab]);

  const loadSurahs = async () => { try { setSurahs(await qGetSurahs()); } catch {} };

  const loadAll = async () => {
    setSyncing(true);
    try {
      const { data: hData } = await supabase.from('hafalans').select('*').order('nextReview', { ascending: true });
      const { data: jData } = await supabase.from('journals').select('*').order('date', { ascending: false });
      if (hData) setHafalan(hData);
      if (jData) setJournal(jData);
    } catch (e) { console.error(e); }
    setSyncing(false);
  };

  const updateStreakAndHeatmap = () => {
    const today = new Date().toISOString().split('T')[0];
    const stored = JSON.parse(localStorage.getItem('hafalin-streak') || '{"count": 0, "lastDate": ""}');
    if (stored.lastDate !== today) {
      const newStreak = stored.count + 1;
      setStreak(newStreak);
      localStorage.setItem('hafalin-streak', JSON.stringify({ count: newStreak, lastDate: today }));
    }

    const currentHeatmap = { ...heatmap };
    currentHeatmap[today] = (currentHeatmap[today] || 0) + 1;
    setHeatmap(currentHeatmap);
    localStorage.setItem('hafalin-heatmap', JSON.stringify(currentHeatmap));
  };

  const fetchArabic = async () => {
    if (!fSurah) return;
    setFetchingAr(true); setFArabic("");
    try {
      const ayahs = await qGetAyahs(fSurah.number, fStart, fEnd);
      const bismillah1 = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ";
      const bismillah2 = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ";

      const formattedText = ayahs.map((a: any) => {
        let text = a.text;
        if (fSurah.number !== 1 && a.numberInSurah === 1) {
          text = text.replace(bismillah1, "").replace(bismillah2, "").trim();
        }
        return `${text} ﴿${toArabicNum(a.numberInSurah)}﴾`;
      }).join(" ");

      setFArabic(formattedText);
    } catch { 
      setFArabic(""); 
    }
    setFetchingAr(false);
  };

  const addHafalan = async () => {
    if (!fSurah || !fArabic) return;
    const ni = fStatus === "merah" ? 1 : fStatus === "kuning" ? 3 : 7;
    const it = {
      judul: `${fSurah.englishName} (${fStart}–${fEnd})`,
      judulAr: fSurah.name, surahNum: fSurah.number,
      ayahStart: fStart, ayahEnd: fEnd, konten: fArabic,
      status: fStatus, lastReview: new Date().toISOString(),
      nextReview: addDays(new Date(), ni), interval: ni, reviewCount: 0,
    };
    await supabase.from('hafalans').insert([it]);
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

  // Logika Memicu Prank "Tombol Kabur"
  const handleReviewClick = (q: number) => {
    if (q === 0) {
      setShowPrank(true);
      setPrankPos({ top: 0, left: 0 }); // Reset posisi pas popup muncul
    } else {
      submitReview(q);
    }
  };

  const movePrankBtn = () => {
    const randomX = Math.floor(Math.random() * 140) - 70; // geser kiri kanan
    const randomY = Math.floor(Math.random() * 80) - 40;  // geser atas bawah
    setPrankPos({ top: randomY, left: randomX });
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
    
    updateStreakAndHeatmap();
    await loadAll();
    setRevItem(null); setTab("hafalan");
  };

  // Logika Fitur Gacha
  const playGacha = () => {
    if (isSpinning || totalReviews < 15) return;
    setIsSpinning(true);
    setGachaResult(null);
    const items = ["🧋 Boba Brown Sugar", "🍜 Seblak Kuah Pedes", "🍕 Martabak Manis", "🍦 Es Krim Mixue", "💧 Zonk! Minum Air Putih"];
    
    let spins = 0;
    const spinInterval = setInterval(() => {
      setGachaResult(items[Math.floor(Math.random() * items.length)]);
      spins++;
      if (spins >= 15) { // Berhenti muter setelah 15x
        clearInterval(spinInterval);
        setIsSpinning(false);
      }
    }, 100);
  };

  const toggleAudio = async (item: any) => {
    if (isAudioPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
      return;
    }
    setAudioLoading(true);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${item.surahNum}/ar.alafasy`);
      const data = await res.json();
      const urls = data.data.ayahs.slice(item.ayahStart - 1, item.ayahEnd).map((a: any) => a.audio);

      let currentIdx = 0;
      const playSeq = () => {
        if (currentIdx >= urls.length) {
          setIsAudioPlaying(false);
          return;
        }
        const audio = new Audio(urls[currentIdx]);
        audioRef.current = audio;
        audio.play();
        setIsAudioPlaying(true);
        audio.onended = () => {
          currentIdx++;
          playSeq();
        };
      };
      playSeq();
    } catch (e) {
      console.error("Audio error", e);
      setIsAudioPlaying(false);
    }
    setAudioLoading(false);
  };

  const addJournal = async () => {
    if (!jNotes.trim()) return;
    await supabase.from('journals').insert([{
      date: new Date().toISOString(), mood: jMood, notes: jNotes, replies: []
    }]);
    await loadAll();
    setJNotes(""); setJMood("😊"); setShowJForm(false);
  };

  const addReply = async (jid: string, currentReplies: any[]) => {
    if (!replyTxt.trim()) return;
    const nxtReplies = [...(currentReplies || []), { id: uid(), author: "Nopal", text: replyTxt, ts: new Date().toISOString() }];
    await supabase.from('journals').update({ replies: nxtReplies }).eq('id', jid);
    await loadAll();
    setReplyTxt("");
  };

  const reqNotif = async () => {
    try { const p = await Notification.requestPermission(); setNotifPerm(p); } catch {}
  };

  const REWARDS = [
    { id: 1, type: "review", req: 5, img: "💌", title: "Surat Kecil 1", msg: "Bangga banget kamu udah mulai rutin review! Keep going bub." },
    { id: 2, type: "streak", req: 3, img: "📸", title: "Foto Estetik", msg: "Inget foto ini nggak? Harus senyum terus ya ngafalnya!" },
    { id: 3, type: "review", req: 20, img: "💖", title: "Surat Kecil 2", msg: "Masya Allah, hafalan kamu udah makin banyak! Aku selalu dukung kamu." },
    { id: 4, type: "streak", req: 7, img: "🎁", title: "Hadiah Spesial", msg: "Streak 1 Minggu! Kasih tau aku ya, kamu mau jajan apa hari ini? Aku traktir!" },
  ];

  if (!isMounted) return <div style={{ minHeight: "100vh", background: "#FDF6F0" }} />;

  const due = hafalan.filter(h => isOverdue(h.nextReview));
  const filtSurahs = surahs.filter(s =>
    s.englishName.toLowerCase().includes(srchSurah.toLowerCase()) ||
    s.name.includes(srchSurah) || String(s.number).includes(srchSurah)
  );

  return (
    <div style={{fontFamily:"'Inter',sans-serif",background:"#FDF6F0",minHeight:"100vh",maxWidth:"430px",margin:"0 auto",color:T,paddingBottom:"76px",position:"relative"}}>
      
      {/* ── MODAL PRANK JAILIN AYANG ────────────────────────────────────────── */}
      {showPrank && (
        <div className="modal-bg" style={{ zIndex: 1000, alignItems: "center" }}>
          <div style={{background:"#fff", padding:"30px 24px", borderRadius:"28px", textAlign:"center", width:"85%", maxWidth:"320px", boxShadow:"0 20px 40px rgba(61,50,80,.15)", animation:"fadeUp 0.3s ease"}}>
            <div style={{fontSize:"50px", marginBottom:"10px", lineHeight:1}}>💸</div>
            <h3 style={{fontFamily:"'Playfair Display',serif", fontSize:"22px", fontWeight:700, color:T, margin:"0 0 8px"}}>Waduh Lupa Total!</h3>
            <p style={{fontSize:"13px", color:TM, marginBottom:"24px", lineHeight:1.5}}>
              Karena kamu lupa total hafalannya, hukumannya kamu utang <b>traktir Nopal seblak</b>. Setuju kan?
            </p>
            
            <div style={{display:"flex", gap:"12px", justifyContent:"center", position:"relative", height:"44px"}}>
              <button 
                onClick={() => { setShowPrank(false); submitReview(0); }} 
                style={{flex:1, background:C, color:"#fff", border:"none", borderRadius:"14px", fontWeight:700, fontSize:"14px", cursor:"pointer", zIndex:2}}
              >
                Setuju 😔
              </button>
              
              <div style={{flex:1, position:"relative"}}>
                <button 
                  onMouseEnter={movePrankBtn} 
                  onClick={movePrankBtn} 
                  style={{
                    position: prankPos.top !== 0 ? "absolute" : "relative",
                    top: prankPos.top,
                    left: prankPos.left,
                    width: "100%", height:"100%", background:"#FEF0F0", color:"#B03030", border:"none", borderRadius:"14px", fontWeight:700, fontSize:"14px", cursor:"pointer", transition:"all 0.15s ease-out", zIndex:3
                  }}
                >
                  Nggak!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HOME (DASHBOARD CLEAN) ────────────────────────────────────────── */}
      {tab==="home" && <div style={{padding:"24px 20px"}}>
        
        {/* HERO CARD CLEAN */}
        <div style={{background:"#fff", border:"1px solid #F0ECF8", borderRadius:"24px", padding:"22px", marginBottom:"20px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 4px 20px rgba(61,50,80,.03)"}}>
          <div>
            <div style={{fontSize:"12px",color:TM,marginBottom:"4px",fontWeight:500}}>{new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"})}</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"28px",fontWeight:700,color:T,margin:0,lineHeight:1.2}}>Halo, Nilam!</h1>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px"}}>
            <div style={{background:"#FEF0F0",border:"1px solid #FCD8D8",borderRadius:"14px",padding:"8px 12px",display:"flex",alignItems:"center",gap:"6px"}}>
              <Flame size={16} color="#E07070" className={streak > 0 ? "animate-pulse" : ""} />
              <span style={{fontSize:"14px",fontWeight:700,color:"#B03030"}}>{streak} Hari</span>
            </div>
            {syncing && <Loader size={14} color={C} className="spin mr-1 mt-1"/>}
          </div>
        </div>

        {/* NOTIFIKASI REQUEST */}
        {notifPerm !== "granted" && <div onClick={reqNotif} style={{background:"#FEF6E0",border:"1px solid #FAD98C",borderRadius:"18px",padding:"14px 16px",marginBottom:"20px",cursor:"pointer",display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{background:"#FDEBB8",padding:"8px",borderRadius:"12px"}}><Bell size={18} color="#D98800"/></div>
          <div>
            <div style={{fontSize:"14px",fontWeight:700,color:"#8A5500"}}>Aktifkan Notifikasi</div>
            <div style={{fontSize:"12px",color:"#9A6200",marginTop:"2px"}}>Biar kamu gak lupa review hafalan.</div>
          </div>
        </div>}

        {/* INSPIRASI ELEGAN */}
        <div style={{background:"linear-gradient(135deg, #D69DC6 0%, #BA7AA9 100%)",borderRadius:"24px",padding:"22px",marginBottom:"24px",color:"#fff",position:"relative",overflow:"hidden",boxShadow:"0 4px 16px rgba(201,122,181,.25)"}}>
          <div style={{position:"absolute",right:"12px",top:"0px",fontSize:"72px",opacity:.08,fontFamily:"serif",lineHeight:1}}>"</div>
          <div style={{fontSize:"10px",fontWeight:700,letterSpacing:"1.5px",opacity:.8,marginBottom:"10px",textTransform:"uppercase"}}>Inspirasi Hari Ini</div>
          <p style={{fontFamily:"'Playfair Display',serif",fontSize:"16px",fontStyle:"italic",lineHeight:1.6,margin:"0 0 12px"}}>"{QUOTES[quoteIdx].text}"</p>
          <div style={{fontSize:"12px",opacity:.8,fontWeight:500}}>— {QUOTES[quoteIdx].source}</div>
        </div>

        {/* REVIEW HARI INI ATAU KABARI USTAD + GACHA JAJAN ATAU EMPTY STATE */}
        {due.length > 0 ? (
          <div style={{marginBottom:"24px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"15px",fontWeight:700,color:T}}>
                <Clock size={16} color="#E07070"/> Target Hari Ini
              </div>
              <span style={{fontSize:"12px",fontWeight:700,color:"#B03030",background:"#FEF0F0",padding:"4px 10px",borderRadius:"12px"}}>{due.length} Ayat</span>
            </div>
            {due.slice(0,3).map(h=><div key={h.id} onClick={()=>{setRevItem(h);setRevealed(new Set());setTab("review");}} style={{background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",padding:"16px",marginBottom:"10px",borderRadius:"18px",border:`1.5px solid ${(SM as any)[h.status].bg}`,boxShadow:"0 2px 8px rgba(61,50,80,.03)"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"10px",height:"10px",borderRadius:"50%",background:(SM as any)[h.status].dot,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:"15px",fontWeight:600,color:T}}>{h.judul}</div>
                  {h.judulAr && <div className="arabic" style={{fontSize:"16px",color:TM,marginTop:"2px"}}>{h.judulAr}</div>}
                </div>
              </div>
              <div style={{background:"#FDFCFE",padding:"6px",borderRadius:"10px"}}><ChevronRight size={16} color={C}/></div>
            </div>)}
          </div>
        ) : hafalan.length > 0 ? (
          <div style={{background:"#EBF7F2",border:"1px solid #C4EBDC",borderRadius:"24px",padding:"24px 20px",marginBottom:"24px",textAlign:"center",boxShadow:"0 4px 16px rgba(26,107,80,.08)"}}>
            <CheckCircle size={36} color={CS} style={{margin:"0 auto 12px"}}/>
            <div style={{fontWeight:700,fontSize:"17px",color:"#1A6B50",marginBottom:"6px"}}>Alhamdulillah, Selesai!</div>
            <div style={{fontSize:"13px",color:"#4A9A7A",marginBottom:"20px",lineHeight:1.5}}>Semua target hafalan hari ini udah kamu selesaikan.</div>
            
            {/* AREA MESIN GACHA DENGAN SYARAT REVIEW */}
            <div style={{background:"#fff", border:"1px dashed #C4EBDC", borderRadius:"18px", padding:"16px", marginBottom:"16px"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px"}}>
                <div style={{fontSize:"12px", fontWeight:700, color:"#1A6B50", textTransform:"uppercase", letterSpacing:"0.5px"}}>Gacha Traktiran</div>
                {totalReviews < 15 && (
                  <div style={{fontSize:"10px", fontWeight:700, color:"#B03030", background:"#FEF0F0", padding:"4px 8px", borderRadius:"8px", display:"flex", alignItems:"center", gap:"4px"}}>
                    <Lock size={10}/> Butuh {15 - totalReviews} Review Lagi
                  </div>
                )}
              </div>
              
              <div style={{fontSize:"18px", fontWeight:700, color:T, marginBottom:"12px", minHeight:"26px", display:"flex", alignItems:"center", justifyContent:"center"}}>
                {totalReviews < 15 ? (
                  <span style={{color:TM, fontSize:"13px", fontWeight:500}}>Kumpulin total 15 kali review buat buka gacha!</span>
                ) : isSpinning ? (
                  <span className="animate-pulse">{gachaResult || "Muter..."}</span>
                ) : gachaResult ? (
                  <span style={{color:gachaResult.includes("Zonk")?"#E07070":C}}>{gachaResult}</span>
                ) : (
                  <span style={{color:TM, fontSize:"14px", fontWeight:500}}>Coba puter, dapet apa nih?</span>
                )}
              </div>
              
              <button 
                onClick={playGacha} 
                disabled={isSpinning || totalReviews < 15}
                style={{
                  background: totalReviews < 15 ? "#F8F6FC" : "#F5E8F2", 
                  color: totalReviews < 15 ? TM : C, 
                  border:"none", borderRadius:"12px", padding:"10px 20px", fontSize:"13px", fontWeight:700, 
                  cursor:(isSpinning || totalReviews < 15) ? "not-allowed" : "pointer", 
                  display:"inline-flex", alignItems:"center", gap:"6px", transition:"all 0.2s"
                }}
              >
                <Dices size={16}/> {totalReviews < 15 ? "Gacha Terkunci" : isSpinning ? "Memutar..." : "Putar Gacha!"}
              </button>
            </div>

            <button onClick={() => {
              const waNumber = "6285336152654"; 
              const textMessage = (totalReviews >= 15 && gachaResult && !isSpinning && !gachaResult.includes("Zonk"))
                ? `Halo Ustad! Aku udah selesai ngafal hari ini, terus tadi muter gacha dapet: *${gachaResult}*! Jangan lupa beliin yaa 🤪`
                : `Halo Ustad! Aku udah selesai nge-review semua hafalan aku hari ini nih! Doain lancar terus yaa!`;
              
              const text = encodeURIComponent(textMessage);
              window.open(`https://wa.me/${waNumber}?text=${text}`, "_blank");
            }} 
            style={{width:"100%",background:"#1A6B50",border:"none",borderRadius:"14px",padding:"14px",color:"#fff",fontSize:"14px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
              <Heart size={18} fill="currentColor"/> {(totalReviews >= 15 && gachaResult && !gachaResult.includes("Zonk")) ? "Tagih Traktiran ke Ustad" : "Kabari Ustad"}
            </button>
          </div>
        ) : (
          /* TAMPILAN JIKA BELUM ADA HAFALAN SAMA SEKALI DI BERANDA */
          <div style={{background:"#fff", border:"1.5px dashed #EBD5E5", borderRadius:"24px", padding:"30px 20px", textAlign:"center", marginBottom:"24px", boxShadow:"0 4px 16px rgba(61,50,80,.02)"}}>
            <div style={{fontSize:"40px", marginBottom:"12px"}}>🌱</div>
            <h3 style={{fontFamily:"'Playfair Display',serif", fontSize:"18px", fontWeight:700, color:T, marginBottom:"6px"}}>Mulai Perjalananmu</h3>
            <p style={{fontSize:"13px", color:TM, lineHeight:1.5, marginBottom:"16px"}}>Belum ada target hafalan nih. Yuk, tambahkan ayat pertamamu sekarang!</p>
            <button onClick={() => setTab("hafalan")} style={{background:"#F5E8F2", border:"none", borderRadius:"12px", padding:"10px 20px", color:C, fontSize:"13px", fontWeight:700, cursor:"pointer"}}>
              Pergi ke Menu Hafalan
            </button>
          </div>
        )}

        {/* DASBOR AKTIVITAS & JEJAK ISTIQOMAH */}
        <div style={{background:"#fff", border:"1px solid #F0ECF8", borderRadius:"24px", padding:"20px", marginBottom:"24px", boxShadow:"0 4px 20px rgba(61,50,80,.03)"}}>
          <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"20px"}}>
            <Calendar size={18} color={C}/>
            <div style={{fontSize:"16px", fontWeight:700, color:T}}>Aktivitas Hafalan</div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"24px"}}>
            {[
              {label:"Total",val:hafalan.length,color:C,bg:"#F5E8F2"},
              {label:"Ulang",val:hafalan.filter(h=>h.status==="merah").length,color:"#E07070",bg:"#FEF0F0"},
              {label:"Lancar",val:hafalan.filter(h=>h.status==="hijau").length,color:CS,bg:"#EBF7F2"},
            ].map(s=><div key={s.label} style={{background:s.bg,borderRadius:"16px",padding:"14px 8px",textAlign:"center"}}>
              <div style={{fontSize:"24px",fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:"11px",color:TM,marginTop:"6px",fontWeight:600}}>{s.label}</div>
            </div>)}
          </div>
          
          <div style={{fontSize:"13px", fontWeight:600, color:TM, marginBottom:"12px"}}>Jejak Istiqomah (30 Hari)</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:"6px"}}>
            {Array.from({length: 28}, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (27 - i));
              const dateStr = d.toISOString().split('T')[0];
              const count = heatmap[dateStr] || 0;
              
              let bg = "#F8F6FC"; 
              let border = "1px solid #F0ECF8";
              if (count > 0 && count <= 2) { bg = "#F5E8F2"; border = "1px solid #EBD5E5"; }
              else if (count >= 3 && count <= 5) { bg = "#D69DC6"; border = "1px solid #D69DC6"; }
              else if (count > 5) { bg = "#C97AB5"; border = "1px solid #C97AB5"; }
              
              return (
                <div 
                  key={dateStr} 
                  style={{aspectRatio:"1/1", borderRadius:"6px", background:bg, border:border, transition:"background 0.3s ease"}} 
                  title={`${fmt(dateStr)}: ${count} review`}
                />
              );
            })}
          </div>
          
          <div style={{display:"flex", justifyContent:"flex-end", alignItems:"center", gap:"6px", marginTop:"14px"}}>
            <span style={{fontSize:"10px", color:TM, fontWeight:600}}>Sedikit</span>
            <div style={{width:"12px", height:"12px", borderRadius:"3px", background:"#F8F6FC", border:"1px solid #F0ECF8"}}/>
            <div style={{width:"12px", height:"12px", borderRadius:"3px", background:"#F5E8F2", border:"1px solid #EBD5E5"}}/>
            <div style={{width:"12px", height:"12px", borderRadius:"3px", background:"#D69DC6"}}/>
            <div style={{width:"12px", height:"12px", borderRadius:"3px", background:"#C97AB5"}}/>
            <span style={{fontSize:"10px", color:TM, fontWeight:600}}>Banyak</span>
          </div>
        </div>

        {/* FULL WIDTH REWARDS BUTTON */}
        <button onClick={() => setTab("rewards")} style={{width:"100%",background:"#FAF7FF",border:"1px dashed #C97AB5",borderRadius:"20px",padding:"16px",color:C,fontSize:"14px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",boxShadow:"0 4px 14px rgba(201,122,181,.08)"}}>
          <Gift size={20} color={C}/> Buka Hadiah Rahasia
        </button>

      </div>}

      {/* ── SECRET REWARDS ────────────────────────────────────────────────── */}
      {tab==="rewards" && <div style={{padding:"24px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
          <button onClick={()=>setTab("home")} className="ghost-btn"><ChevronRight size={24} style={{transform:"rotate(180deg)"}} color={T}/></button>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:600,margin:0}}>Hadiah Rahasia 🎁</h2>
        </div>
        
        <p style={{fontSize:"13px",color:TM,marginBottom:"20px",lineHeight:1.6}}>
          Koleksi kejutan spesial buat kamu! Terus review dan jaga streak-nya buat ngebuka gembok di bawah ini ya.
        </p>

        <div style={{background:"#fff",borderRadius:"16px",padding:"16px",marginBottom:"20px",border:"1px solid #EAE4F2",display:"flex",justifyContent:"space-around"}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:"20px",fontWeight:700,color:C}}>{totalReviews}</div><div style={{fontSize:"11px",color:TM}}>Total Review</div></div>
          <div style={{width:"1px",background:"#EAE4F2"}}></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:"20px",fontWeight:700,color:"#E07070"}}>{streak}</div><div style={{fontSize:"11px",color:TM}}>Streak Hari</div></div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:"14px"}}>
          {REWARDS.map(r => {
            const isUnlocked = r.type === "review" ? totalReviews >= r.req : streak >= r.req;
            return <div key={r.id} style={{background:isUnlocked?"#fff":"#F8F6FC",border:`1px solid ${isUnlocked?"#F0E2F5":"#EAE4F2"}`,borderRadius:"18px",padding:"16px",display:"flex",gap:"14px",alignItems:"center",position:"relative",overflow:"hidden"}}>
              <div style={{width:"60px",height:"60px",borderRadius:"14px",background:isUnlocked?"#FDF6F0":"#EAE4F2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",flexShrink:0}}>
                {isUnlocked ? r.img : <Lock size={24} color="#9B8FAD"/>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:"11px",color:isUnlocked?C:TM,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"4px"}}>
                  Syarat: {r.req} {r.type === "review" ? "Kali Review" : "Hari Streak"}
                </div>
                <div style={{fontSize:"15px",fontWeight:700,color:isUnlocked?T:TM,marginBottom:"4px"}}>{isUnlocked ? r.title : "Terkunci"}</div>
                <div style={{fontSize:"12px",color:TM,lineHeight:1.4}}>{isUnlocked ? r.msg : "Ayo semangat ngafalnya biar rahasianya kebuka!"}</div>
              </div>
            </div>;
          })}
        </div>
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

        {/* TAMPILAN JIKA BELUM ADA HAFALAN DI MENU HAFALAN */}
        {hafalan.length===0 && !syncing && (
          <div style={{background:"#fff", border:"1.5px dashed #EBD5E5", borderRadius:"24px", padding:"40px 20px", textAlign:"center", marginTop:"20px", boxShadow:"0 4px 20px rgba(61,50,80,.02)"}}>
            <div style={{fontSize:"48px", marginBottom:"12px"}}>📖</div>
            <h3 style={{fontFamily:"'Playfair Display',serif", fontSize:"20px", fontWeight:700, color:T, marginBottom:"8px"}}>Belum Ada Hafalan</h3>
            <p style={{fontSize:"13px", color:TM, lineHeight:1.6, marginBottom:"20px"}}>
              Ruang ini masih kosong nih. Yuk, mulai kumpulkan target surat atau ayat yang mau kamu hafal.
            </p>
            <button 
              onClick={()=>setShowAdd(true)} 
              style={{background:C, border:"none", borderRadius:"14px", padding:"12px 24px", color:"#fff", fontSize:"13px", fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:"8px", boxShadow:"0 4px 14px rgba(201,122,181,.25)"}}
            >
              <Plus size={16} /> Tambah Hafalan Pertama
            </button>
          </div>
        )}

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
          {/* TAMPILAN JIKA BELUM ADA HAFALAN DI MENU REVIEW */}
          {hafalan.length === 0 ? (
            <div style={{textAlign:"center", padding:"50px 20px", color:TM}}>
              <div style={{fontSize:"40px", marginBottom:"16px"}}>🔍</div>
              <p style={{fontSize:"14px", lineHeight:1.5, marginBottom:"20px"}}>Belum ada hafalan yang bisa di-review nih. Tambahkan ke daftarmu dulu ya!</p>
              <button onClick={() => setTab("hafalan")} style={{background:"#F5E8F2", border:"none", borderRadius:"12px", padding:"10px 20px", color:C, fontSize:"13px", fontWeight:700, cursor:"pointer"}}>
                Tambah Sekarang
              </button>
            </div>
          ) : (
            hafalan.map(h => {
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
            })
          )}
        </> : <>
          <div className="card" style={{marginBottom:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontWeight:700,fontSize:"16px"}}>{revItem.judul}</div>
                {revItem.judulAr && <div className="arabic" style={{fontSize:"20px",color:C,marginTop:"2px"}}>{revItem.judulAr}</div>}
              </div>
              
              {/* Fitur Audio Murottal */}
              <button 
                onClick={() => toggleAudio(revItem)}
                disabled={audioLoading}
                style={{background: isAudioPlaying ? "#FEF0F0" : "#F5E8F2", border:"none", borderRadius:"12px", padding:"10px", color: isAudioPlaying ? "#B03030" : C, cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", flexShrink:0}}
              >
                {audioLoading ? <Loader size={16} className="spin"/> : isAudioPlaying ? <Square size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
              </button>
            </div>
            
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
              ].map(r=><button key={r.q} onClick={() => handleReviewClick(r.q)} style={{background:r.bg,border:"none",borderRadius:"14px",padding:"14px 10px",cursor:"pointer",textAlign:"center"}}>
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

      {/* ── KEMBALI KE 4 BOTTOM NAV ───────────────────────────────────────── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"430px",background:"#fff",borderTop:"1px solid #EDE8F5",display:"grid",gridTemplateColumns:"repeat(4,1fr)",boxShadow:"0 -4px 20px rgba(61,50,80,.09)",zIndex:100}}>
        {[
          {id:"home", icon:<Home size={22}/>, label:"Beranda"},
          {id:"hafalan", icon:<BookOpen size={22}/>, label:"Hafalan"},
          {id:"review", icon:<Eye size={22}/>, label:"Review"},
          {id:"jurnal", icon:<PenLine size={22}/>, label:"Jurnal"},
        ].map(t=><button key={t.id} className="tab-btn" onClick={()=>{setTab(t.id);if(t.id!=="review")setRevItem(null);}} style={{background:"none",border:"none",padding:"14px 4px 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",color:tab===t.id?C:TM}}>
          {t.icon}
          <span style={{fontSize:"10px",fontWeight:tab===t.id?700:500}}>{t.label}</span>
        </button>)}
      </div>
    </div>
  );
}