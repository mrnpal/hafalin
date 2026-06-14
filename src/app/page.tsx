'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Home, BookOpen, Eye, PenLine, Plus, ChevronRight, Trash2,
  Clock, X, RefreshCw, CheckCircle, Send,
  Bell, ChevronDown, ChevronUp, Loader, MessageCircle,
  Flame, Play, Square, Heart, Gift, Lock, Calendar, Dices, Phone,
  Settings, LogOut, User, Save
} from "lucide-react";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const QUOTES = [
  { text: "Sesungguhnya bersama kesulitan ada kemudahan.", source: "QS. Al-Insyirah: 6" },
  { text: "Dan bertawakkallah kepada Allah. Cukuplah Allah sebagai Pelindung.", source: "QS. Al-Ahzab: 3" },
  { text: "Barang siapa yang bersungguh-sungguh, ia pasti akan berhasil.", source: "Man Jadda Wa Jada" },
  { text: "Hafalan adalah mahkota yang kamu kenakan di dunia dan akhirat.", source: "Motivasi Spesial" },
  { text: "Setiap langkah kecil menuju hafalan yang lancar adalah ibadah.", source: "Motivasi Hafalan" },
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

  // ── AUTH STATE ───────────────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login'|'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authMentorWa, setAuthMentorWa] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // ── APP STATE ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("home");
  const [hafalan, setHafalan] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const totalReviews = hafalan.reduce((acc, curr) => acc + (curr.reviewCount || 0), 0);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});

  // ── USER PROFILE / SETTINGS ──────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingName, setSettingName] = useState('');
  const [settingWa, setSettingWa] = useState('');
  const [settingTilangPass, setSettingTilangPass] = useState('');
  const [settingSaving, setSettingSaving] = useState(false);

  // ── LOCK SCREEN ──────────────────────────────────────────────────────────
  const [isLocked, setIsLocked] = useState(false);
  const [tilangPass, setTilangPass] = useState("");

  // ── AUDIO ────────────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  // ── FUN FEATURES ─────────────────────────────────────────────────────────
  const [showPrank, setShowPrank] = useState(false);
  const [prankPos, setPrankPos] = useState({ top: 0, left: 0 });
  const [gachaResult, setGachaResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // ── ADD HAFALAN ──────────────────────────────────────────────────────────
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

  // ── REVIEW ───────────────────────────────────────────────────────────────
  const [revItem, setRevItem] = useState<any>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  // ── JOURNAL ──────────────────────────────────────────────────────────────
  const [showJForm, setShowJForm] = useState(false);
  const [jMood, setJMood] = useState("😊");
  const [jNotes, setJNotes] = useState("");
  const [expandedJ, setExpandedJ] = useState<string | null>(null);
  const [replyTxt, setReplyTxt] = useState("");
  const [surprise, setSurprise] = useState<string | null>(null);
  const [sprVis, setSprVis] = useState(false);

  const [notifPerm, setNotifPerm] = useState("default");

  const T="#3D3250", TM="#9B8FAD", C="#C97AB5", CS="#5AA88C", CA="#E8A020";
  const INP={width:"100%",padding:"11px 14px",borderRadius:"12px",border:"1.5px solid #E4DFF0",fontSize:"14px",background:"#FDFCFE",color:T,fontFamily:"'Inter',sans-serif",outline:"none",boxSizing:"border-box" as const};

  // ── DERIVED PROFILE DATA ─────────────────────────────────────────────────
  const displayName = userProfile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Pengguna';
  const mentorWa = userProfile?.mentor_wa || '';
  const currentTilangPassword = userProfile?.tilang_password || 'BISMILLAH';

  // ─── MOUNT & AUTH INIT ────────────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true);
    setQuoteIdx(Math.floor(Math.random() * QUOTES.length));
    loadSurahs();

    if (typeof window !== 'undefined') {
      try { setNotifPerm(Notification.permission); } catch {}
    }

    // Check existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setHafalan([]);
        setJournal([]);
        setStreak(0);
        setHeatmap({});
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data whenever user changes
  useEffect(() => {
    if (user) loadAll();
  }, [user?.id]);

  // Stop audio when leaving review tab
  useEffect(() => {
    if (tab !== "review" && audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  }, [tab]);

  const loadSurahs = async () => { try { setSurahs(await qGetSurahs()); } catch {} };

  // ─── AUTH FUNCTIONS ────────────────────────────────────────────────────────
  const handleAuth = async () => {
    if (!authEmail || !authPassword) { setAuthError('Email dan password wajib diisi.'); return; }
    if (authMode === 'register' && !authName.trim()) { setAuthError('Nama wajib diisi.'); return; }
    setAuthError('');
    setAuthSubmitting(true);
    try {
      if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: { data: { full_name: authName.trim() } }
        });
        if (error) throw error;
        // Profil user_stats akan dibuat otomatis saat loadAll() dipanggil
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
      }
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('Invalid login credentials')) setAuthError('Email atau password salah.');
      else if (msg.includes('User already registered')) setAuthError('Email ini sudah terdaftar. Coba login.');
      else if (msg.includes('Password should be at least')) setAuthError('Password minimal 6 karakter.');
      else if (msg.includes('Unable to validate email') || msg.includes('valid email')) setAuthError('Format email tidak valid.');
      else setAuthError(msg);
    }
    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowSettings(false);
    setTab('home');
  };

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  const openSettings = () => {
    setSettingName(userProfile?.display_name || displayName);
    setSettingWa(userProfile?.mentor_wa || '');
    setSettingTilangPass(userProfile?.tilang_password || 'BISMILLAH');
    setShowSettings(true);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSettingSaving(true);
    try {
      await supabase.from('user_stats').update({
        display_name: settingName,
        mentor_wa: settingWa,
        tilang_password: settingTilangPass
      }).eq('user_id', user.id);
      setUserProfile((p: any) => ({
        ...p,
        display_name: settingName,
        mentor_wa: settingWa,
        tilang_password: settingTilangPass
      }));
      setShowSettings(false);
    } catch (e) { console.error("Error saving settings:", e); }
    setSettingSaving(false);
  };

  // ─── DATA LOADING ──────────────────────────────────────────────────────────
  const loadAll = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { data: hData } = await supabase
        .from('hafalans').select('*')
        .eq('user_id', user.id)
        .order('nextReview', { ascending: true });

      const { data: jData } = await supabase
        .from('journals').select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      const { data: sData } = await supabase
        .from('user_stats').select('*')
        .eq('user_id', user.id)
        .single();

      if (hData) setHafalan(hData);
      if (jData) setJournal(jData);

      const today = new Date().toISOString().split('T')[0];

      if (sData) {
        setUserProfile(sData);
        let currStreak = sData.streak_count || 0;
        const lastDate = sData.last_streak_date || "";
        let currHeatmap = sData.heatmap_data || {};

        if (lastDate !== today && lastDate !== "") {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastDate !== yesterdayStr) {
            currStreak = 0;
            await supabase.from('user_stats').update({ streak_count: 0 }).eq('user_id', user.id);
          }

          const last = new Date(lastDate);
          const now = new Date();
          const diffDays = Math.ceil(Math.abs(now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
          const unlockedDate = localStorage.getItem(`hafalin-unlocked-${user.id}`);
          if (diffDays >= 3 && unlockedDate !== today) {
            setIsLocked(true);
          }
        }
        setStreak(currStreak);
        setHeatmap(currHeatmap);
      } else {
        // Buat profil baru untuk user baru
        const newProfile = {
          user_id: user.id,
          streak_count: 0,
          last_streak_date: "",
          heatmap_data: {},
          display_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Pengguna',
          mentor_wa: authMentorWa || '',
          tilang_password: 'BISMILLAH'
        };
        await supabase.from('user_stats').insert([newProfile]);
        setUserProfile(newProfile);
      }
    } catch (e) { console.error("Error Load:", e); }
    setSyncing(false);
  };

  const updateStreakAndHeatmap = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data: sData } = await supabase.from('user_stats').select('*').eq('user_id', user.id).single();
      if (sData) {
        let newStreak = sData.streak_count || 0;
        let newHeatmap = sData.heatmap_data || {};
        if (sData.last_streak_date !== today) newStreak += 1;
        newHeatmap[today] = (newHeatmap[today] || 0) + 1;
        await supabase.from('user_stats').update({
          streak_count: newStreak,
          last_streak_date: today,
          heatmap_data: newHeatmap
        }).eq('user_id', user.id);
        setStreak(newStreak);
        setHeatmap(newHeatmap);
      }
    } catch (e) { console.error("Error Update Stats:", e); }
  };

  // ─── LOCK SCREEN ──────────────────────────────────────────────────────────
  const unlockApp = () => {
    if (tilangPass.toUpperCase() === currentTilangPassword.toUpperCase()) {
      setIsLocked(false);
      localStorage.setItem(`hafalin-unlocked-${user?.id}`, new Date().toISOString().split('T')[0]);
    } else {
      alert("Password salah! Hubungi mentormu untuk minta passwordnya ya.");
    }
  };

  // ─── HAFALAN FUNCTIONS ────────────────────────────────────────────────────
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
    } catch { setFArabic(""); }
    setFetchingAr(false);
  };

  const addHafalan = async () => {
    if (!fSurah || !fArabic || !user) return;
    const ni = fStatus === "merah" ? 1 : fStatus === "kuning" ? 3 : 7;
    const it = {
      user_id: user.id,
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
    if (!user) return;
    await supabase.from('hafalans').delete().eq('id', id).eq('user_id', user.id);
    await loadAll();
  };

  const quickStatusUpdate = async (id: string, newStatus: string) => {
    if (!user) return;
    await supabase.from('hafalans').update({ status: newStatus }).eq('id', id).eq('user_id', user.id);
    await loadAll();
  };

  // ─── REVIEW FUNCTIONS ─────────────────────────────────────────────────────
  const handleReviewClick = (q: number) => {
    if (q === 0) { setShowPrank(true); setPrankPos({ top: 0, left: 0 }); }
    else { submitReview(q); }
  };

  const movePrankBtn = () => {
    setPrankPos({ top: Math.floor(Math.random() * 80) - 40, left: Math.floor(Math.random() * 140) - 70 });
  };

  const submitReview = async (q: number) => {
    if (!revItem || !user) return;
    const { interval, nextReview } = computeNext(revItem.interval, q);
    const st = q === 0 ? "merah" : q === 1 ? "kuning" : "hijau";
    await supabase.from('hafalans').update({
      status: st, lastReview: new Date().toISOString(),
      nextReview, interval, reviewCount: revItem.reviewCount + 1
    }).eq('id', revItem.id).eq('user_id', user.id);
    await updateStreakAndHeatmap();
    await loadAll();
    setRevItem(null); setTab("hafalan");
  };

  // ─── GACHA ────────────────────────────────────────────────────────────────
  const playGacha = () => {
    if (isSpinning || totalReviews < 15) return;
    setIsSpinning(true); setGachaResult(null);
    const items = ["🧋 Boba Brown Sugar", "🍜 Seblak Kuah Pedes", "🍕 Martabak Manis", "🍦 Es Krim Mixue", "💧 Zonk! Minum Air Putih"];
    let spins = 0;
    const spinInterval = setInterval(() => {
      setGachaResult(items[Math.floor(Math.random() * items.length)]);
      spins++;
      if (spins >= 15) { clearInterval(spinInterval); setIsSpinning(false); }
    }, 100);
  };

  // ─── AUDIO ────────────────────────────────────────────────────────────────
  const toggleAudio = async (item: any) => {
    if (isAudioPlaying && audioRef.current) { audioRef.current.pause(); setIsAudioPlaying(false); return; }
    setAudioLoading(true);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${item.surahNum}/ar.alafasy`);
      const data = await res.json();
      const urls = data.data.ayahs.slice(item.ayahStart - 1, item.ayahEnd).map((a: any) => a.audio);
      let currentIdx = 0;
      const playSeq = () => {
        if (currentIdx >= urls.length) { setIsAudioPlaying(false); return; }
        const audio = new Audio(urls[currentIdx]);
        audioRef.current = audio;
        audio.play(); setIsAudioPlaying(true);
        audio.onended = () => { currentIdx++; playSeq(); };
      };
      playSeq();
    } catch (e) { console.error("Audio error", e); setIsAudioPlaying(false); }
    setAudioLoading(false);
  };

  // ─── JOURNAL ──────────────────────────────────────────────────────────────
  const addJournal = async () => {
    if (!jNotes.trim() || !user) return;
    await supabase.from('journals').insert([{
      user_id: user.id, date: new Date().toISOString(), mood: jMood, notes: jNotes, replies: []
    }]);
    await loadAll();
    if (jMood === "😔" || jMood === "🥱" || jMood === "😐") {
      const ayatList = [
        "« لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا »\nAllah tidak membebani seseorang melainkan sesuai dengan kesanggupannya. (Al-Baqarah: 286)\n\nCapek itu wajar kok, istirahat dulu ya. Kamu udah hebat hari ini ❤️",
        "« فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا »\nKarena sesungguhnya sesudah kesulitan itu ada kemudahan. (Al-Insyirah: 5)\n\nJangan sedih berlarut ya, badainya pasti berlalu. Semangat terus! 🤗",
        "« وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ »\nDan kelak Tuhanmu pasti memberikan karunia-Nya kepadamu, lalu hatimu menjadi puas. (Ad-Duha: 5)\n\nSenyum lagi dong, masa depanmu secerah semangatmu ✨"
      ];
      setSurprise(ayatList[Math.floor(Math.random() * ayatList.length)]);
      setSprVis(true);
      setTimeout(() => setSprVis(false), 9000);
    }
    setJNotes(""); setJMood("😊"); setShowJForm(false);
  };

  const addReply = async (jid: string, currentReplies: any[]) => {
    if (!replyTxt.trim() || !user) return;
    const nxtReplies = [...(currentReplies || []), {
      id: uid(), author: displayName, text: replyTxt, ts: new Date().toISOString()
    }];
    await supabase.from('journals').update({ replies: nxtReplies }).eq('id', jid).eq('user_id', user.id);
    await loadAll();
    setReplyTxt("");
  };

  const reqNotif = async () => {
    try { const p = await Notification.requestPermission(); setNotifPerm(p); } catch {}
  };

  const REWARDS = [
    { id: 1, type: "review", req: 5, img: "💌", title: "Pencapaian Pertama!", msg: "Bangga banget kamu udah mulai rutin review! Keep going ya." },
    { id: 2, type: "streak", req: 3, img: "📸", title: "Streak 3 Hari", msg: "3 hari berturut-turut! Konsistensimu keren banget." },
    { id: 3, type: "review", req: 20, img: "💖", title: "Hafidz Muda", msg: "Masya Allah, 20 kali review! Hafalanmu pasti makin kuat." },
    { id: 4, type: "streak", req: 7, img: "🎁", title: "Streak 1 Minggu!", msg: "Luar biasa! Seminggu penuh istiqomah. Kamu layak dapat reward hari ini!" },
  ];

  if (!isMounted) return <div style={{ minHeight: "100vh", background: "#FDF6F0" }} />;

  // ── AUTH LOADING SCREEN ────────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#FDF6F0,#F5E8F2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"40px",marginBottom:"14px"}}>📖</div>
        <Loader size={24} color="#C97AB5" className="spin"/>
      </div>
    </div>
  );

  // ── AUTH SCREEN ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#FDF6F0 0%,#F5E8F2 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:"'Inter',sans-serif"}}>
        <div style={{width:"100%",maxWidth:"360px"}}>
          {/* Logo */}
          <div style={{textAlign:"center",marginBottom:"32px"}}>
            <div style={{fontSize:"52px",marginBottom:"10px"}}>📖</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"32px",fontWeight:700,color:"#3D3250",margin:"0 0 6px"}}>HafalIn</h1>
            <p style={{fontSize:"14px",color:"#9B8FAD",margin:0}}>Aplikasi Hafalan Al-Quranmu</p>
          </div>

          {/* Card */}
          <div style={{background:"#fff",borderRadius:"28px",padding:"28px 24px",boxShadow:"0 20px 60px rgba(201,122,181,.15)"}}>
            {/* Tab toggle */}
            <div style={{display:"flex",gap:"6px",marginBottom:"24px",background:"#F8F6FC",borderRadius:"14px",padding:"4px"}}>
              {(['login','register'] as const).map(m => (
                <button key={m} onClick={() => { setAuthMode(m); setAuthError(''); }} style={{flex:1,padding:"9px",border:"none",borderRadius:"10px",fontWeight:600,fontSize:"14px",cursor:"pointer",background:authMode===m?"#fff":"transparent",color:authMode===m?"#C97AB5":"#9B8FAD",boxShadow:authMode===m?"0 2px 8px rgba(201,122,181,.15)":"none",transition:"all .2s"}}>
                  {m === 'login' ? 'Masuk' : 'Daftar'}
                </button>
              ))}
            </div>

            {authMode === 'register' && (
              <div style={{marginBottom:"12px"}}>
                <div style={{fontSize:"12px",color:"#9B8FAD",marginBottom:"5px",fontWeight:600}}>Nama Lengkap</div>
                <input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Contoh: Nilam Safitri" style={INP}/>
              </div>
            )}

            <div style={{marginBottom:"12px"}}>
              <div style={{fontSize:"12px",color:"#9B8FAD",marginBottom:"5px",fontWeight:600}}>Email</div>
              <input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="email@kamu.com" style={INP}/>
            </div>

            <div style={{marginBottom:authMode==='register'?"12px":"20px"}}>
              <div style={{fontSize:"12px",color:"#9B8FAD",marginBottom:"5px",fontWeight:600}}>Password</div>
              <input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Min. 6 karakter" onKeyDown={e=>e.key==='Enter'&&handleAuth()} style={INP}/>
            </div>

            {authMode === 'register' && (
              <div style={{marginBottom:"20px"}}>
                <div style={{fontSize:"12px",color:"#9B8FAD",marginBottom:"5px",fontWeight:600}}>No. WA Mentor <span style={{color:"#E8A020",fontSize:"11px"}}>(opsional)</span></div>
                <input value={authMentorWa} onChange={e=>setAuthMentorWa(e.target.value)} placeholder="628xxxxxxxxx (tanpa +)" style={INP}/>
                <div style={{fontSize:"11px",color:"#9B8FAD",marginTop:"5px",lineHeight:1.5}}>Untuk tombol hubungi mentor saat kamu bolos hafalan.</div>
              </div>
            )}

            {authError && (
              <div style={{background:"#FEF0F0",border:"1px solid #FCD8D8",borderRadius:"10px",padding:"10px 12px",marginBottom:"14px",fontSize:"13px",color:"#B03030"}}>
                {authError}
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={authSubmitting}
              className="primary-btn"
              style={{opacity:authSubmitting?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}
            >
              {authSubmitting
                ? <><Loader size={16} className="spin"/> {authMode==='login'?'Masuk...':'Mendaftar...'}</>
                : authMode==='login' ? 'Masuk 🚪' : 'Daftar Sekarang ✨'}
            </button>

            {authMode === 'register' && (
              <div style={{fontSize:"11px",color:"#9B8FAD",textAlign:"center",marginTop:"14px",lineHeight:1.5}}>
                Dengan mendaftar, kamu setuju untuk menjaga istiqomah hafalanmu 😊
              </div>
            )}
          </div>

          <div style={{textAlign:"center",marginTop:"20px",fontSize:"12px",color:"#9B8FAD"}}>
            Made with ❤️ untuk para penghafal Quran
          </div>
        </div>
      </div>
    );
  }

  // ── LOCK SCREEN ────────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#FDF6F0 0%,#F5E8F2 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",color:T,fontFamily:"'Inter',sans-serif",textAlign:"center"}}>
        <div style={{background:"#fff",padding:"40px 24px",borderRadius:"32px",boxShadow:"0 20px 40px rgba(201,122,181,.15)",width:"100%",maxWidth:"340px"}}>
          <div style={{fontSize:"60px",marginBottom:"16px"}}>🚨</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"24px",fontWeight:700,color:"#B03030",margin:"0 0 12px"}}>Surat Tilang Kangen</h1>
          <p style={{fontSize:"13px",color:T,lineHeight:1.6,marginBottom:"6px"}}>
            Halo, <b>{displayName}</b>!
          </p>
          <p style={{fontSize:"13px",color:T,lineHeight:1.6,marginBottom:"24px"}}>
            Kamu bolos hafalan 3 hari berturut-turut. Aplikasi dikunci otomatis. Hubungi mentormu untuk minta password buka gembok!
          </p>
          <input
            type="password"
            placeholder="Masukkan Password Rahasia"
            value={tilangPass}
            onChange={e => setTilangPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && unlockApp()}
            style={{...INP, textAlign:"center", marginBottom:"14px", border:"2px solid #EBD5E5"}}
          />
          <button onClick={unlockApp} style={{width:"100%",background:C,color:"#fff",border:"none",borderRadius:"14px",padding:"14px",fontWeight:700,fontSize:"14px",cursor:"pointer",marginBottom:"14px",boxShadow:"0 4px 14px rgba(201,122,181,.25)"}}>
            Buka Gembok 🔓
          </button>
          <div style={{fontSize:"12px",color:TM,marginBottom:"12px"}}>Gak tau passwordnya?</div>
          {mentorWa ? (
            <button onClick={() => {
              const text = encodeURIComponent(`Assalamualaikum! Ini ${displayName}, maaf udah bolos ngafal 3 hari 🥺 Minta password buat buka aplikasinya dong...`);
              window.open(`https://wa.me/${mentorWa}?text=${text}`, "_blank");
            }} style={{width:"100%",background:"#FDFCFE",border:`1.5px dashed ${C}`,borderRadius:"14px",padding:"12px",color:C,fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
              <Phone size={16}/> Hubungi Mentor via WA
            </button>
          ) : (
            <div style={{fontSize:"12px",color:TM}}>Belum ada nomor mentor. Hubungi mentormu secara langsung ya.</div>
          )}
        </div>
      </div>
    );
  }

  const due = hafalan.filter(h => isOverdue(h.nextReview));
  const filtSurahs = surahs.filter(s =>
    s.englishName.toLowerCase().includes(srchSurah.toLowerCase()) ||
    s.name.includes(srchSurah) || String(s.number).includes(srchSurah)
  );

  return (
    <div style={{fontFamily:"'Inter',sans-serif",background:"#FDF6F0",minHeight:"100vh",maxWidth:"430px",margin:"0 auto",color:T,paddingBottom:"76px",position:"relative"}}>

      {/* ── SETTINGS MODAL ──────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowSettings(false)}>
          <div className="modal-box">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"20px",margin:0}}>Pengaturan Profil</h3>
              <button className="ghost-btn" onClick={()=>setShowSettings(false)}><X size={20} color={TM}/></button>
            </div>

            {/* User info card */}
            <div style={{background:"#F8F6FC",borderRadius:"16px",padding:"14px",marginBottom:"20px",display:"flex",alignItems:"center",gap:"12px"}}>
              <div style={{width:"44px",height:"44px",borderRadius:"50%",background:`linear-gradient(135deg,${C},#A860A0)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <User size={20} color="#fff"/>
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:"15px",color:T,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayName}</div>
                <div style={{fontSize:"12px",color:TM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
              </div>
            </div>

            <div style={{marginBottom:"12px"}}>
              <div style={{fontSize:"12px",color:TM,marginBottom:"5px",fontWeight:600}}>Nama Tampilan</div>
              <input value={settingName} onChange={e=>setSettingName(e.target.value)} placeholder="Nama kamu" style={INP}/>
            </div>

            <div style={{marginBottom:"12px"}}>
              <div style={{fontSize:"12px",color:TM,marginBottom:"5px",fontWeight:600}}>No. WA Mentor</div>
              <input value={settingWa} onChange={e=>setSettingWa(e.target.value)} placeholder="628xxxxxxxxx" style={INP}/>
              <div style={{fontSize:"11px",color:TM,marginTop:"4px"}}>Format internasional tanpa + (contoh: 6281234567890)</div>
            </div>

            <div style={{marginBottom:"20px"}}>
              <div style={{fontSize:"12px",color:TM,marginBottom:"5px",fontWeight:600}}>Password Tilang Kangen</div>
              <input value={settingTilangPass} onChange={e=>setSettingTilangPass(e.target.value)} placeholder="Password buat buka lock screen" style={INP}/>
              <div style={{fontSize:"11px",color:TM,marginTop:"4px"}}>Dipakai jika kamu absen 3 hari. Kasih tau ke mentormu.</div>
            </div>

            <button onClick={saveSettings} disabled={settingSaving} className="primary-btn" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",marginBottom:"12px",opacity:settingSaving?0.6:1}}>
              {settingSaving ? <><Loader size={16} className="spin"/> Menyimpan...</> : <><Save size={16}/> Simpan Perubahan</>}
            </button>

            <button onClick={handleSignOut} style={{width:"100%",background:"#FEF0F0",border:"1px solid #FCD8D8",borderRadius:"14px",padding:"12px",color:"#B03030",fontSize:"14px",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
              <LogOut size={16}/> Keluar dari Akun
            </button>
          </div>
        </div>
      )}

      {/* ── MOOD AYAT POPUP ─────────────────────────────────────────────────── */}
      {sprVis && (
        <div style={{position:"fixed",top:"18px",left:"50%",transform:"translateX(-50%)",zIndex:1000,background:"#fff",borderRadius:"16px",padding:"16px 20px",boxShadow:"0 8px 28px rgba(201,122,181,.3)",border:"1px solid #F0E2F5",maxWidth:"340px",width:"90%",textAlign:"center",animation:"slideDown .3s ease"}}>
          <div style={{fontSize:"11px",color:C,fontWeight:800,letterSpacing:"1px",marginBottom:"8px",textTransform:"uppercase"}}>Pesan Untukmu 🌸</div>
          <div style={{fontSize:"14px",color:T,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{surprise}</div>
        </div>
      )}

      {/* ── PRANK MODAL ─────────────────────────────────────────────────────── */}
      {showPrank && (
        <div className="modal-bg" style={{zIndex:1000,alignItems:"center"}}>
          <div style={{background:"#fff",padding:"30px 24px",borderRadius:"28px",textAlign:"center",width:"85%",maxWidth:"320px",boxShadow:"0 20px 40px rgba(61,50,80,.15)",animation:"fadeUp 0.3s ease"}}>
            <div style={{fontSize:"50px",marginBottom:"10px",lineHeight:1}}>💸</div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:700,color:T,margin:"0 0 8px"}}>Waduh Lupa Total!</h3>
            <p style={{fontSize:"13px",color:TM,marginBottom:"24px",lineHeight:1.5}}>
              Hukumannya kamu utang traktir mentormu seblak. Setuju kan?
            </p>
            <div style={{display:"flex",gap:"12px",justifyContent:"center",position:"relative",height:"44px"}}>
              <button onClick={() => { setShowPrank(false); submitReview(0); }} style={{flex:1,background:C,color:"#fff",border:"none",borderRadius:"14px",fontWeight:700,fontSize:"14px",cursor:"pointer",zIndex:2}}>Setuju 😔</button>
              <div style={{flex:1,position:"relative"}}>
                <button onMouseEnter={movePrankBtn} onClick={movePrankBtn} style={{position:prankPos.top!==0?"absolute":"relative",top:prankPos.top,left:prankPos.left,width:"100%",height:"100%",background:"#FEF0F0",color:"#B03030",border:"none",borderRadius:"14px",fontWeight:700,fontSize:"14px",cursor:"pointer",transition:"all 0.15s ease-out",zIndex:3}}>Nggak!</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HOME ────────────────────────────────────────────────────────────── */}
      {tab==="home" && <div style={{padding:"24px 20px"}}>

        {/* Hero Card */}
        <div style={{background:"#fff",border:"1px solid #F0ECF8",borderRadius:"24px",padding:"22px",marginBottom:"20px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 4px 20px rgba(61,50,80,.03)"}}>
          <div>
            <div style={{fontSize:"12px",color:TM,marginBottom:"4px",fontWeight:500}}>{new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"})}</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"26px",fontWeight:700,color:T,margin:0,lineHeight:1.2}}>Halo, {displayName}! 👋</h1>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"6px"}}>
            <div style={{background:"#FEF0F0",border:"1px solid #FCD8D8",borderRadius:"14px",padding:"8px 12px",display:"flex",alignItems:"center",gap:"6px"}}>
              <Flame size={16} color="#E07070"/>
              <span style={{fontSize:"14px",fontWeight:700,color:"#B03030"}}>{streak} Hari</span>
            </div>
            <button onClick={openSettings} style={{background:"#F8F6FC",border:"1px solid #EAE4F2",borderRadius:"10px",padding:"6px 10px",display:"flex",alignItems:"center",gap:"5px",cursor:"pointer",color:TM,fontSize:"11px",fontWeight:600}}>
              <Settings size={12}/> Profil & Keluar
            </button>
          </div>
        </div>

        {/* Notifikasi */}
        {notifPerm !== "granted" && (
          <div onClick={reqNotif} style={{background:"#FEF6E0",border:"1px solid #FAD98C",borderRadius:"18px",padding:"14px 16px",marginBottom:"20px",cursor:"pointer",display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{background:"#FDEBB8",padding:"8px",borderRadius:"12px"}}><Bell size={18} color="#D98800"/></div>
            <div>
              <div style={{fontSize:"14px",fontWeight:700,color:"#8A5500"}}>Aktifkan Notifikasi</div>
              <div style={{fontSize:"12px",color:"#9A6200",marginTop:"2px"}}>Biar kamu gak lupa review hafalan.</div>
            </div>
          </div>
        )}

        {/* Quote */}
        <div style={{background:"linear-gradient(135deg,#D69DC6,#BA7AA9)",borderRadius:"24px",padding:"22px",marginBottom:"24px",color:"#fff",position:"relative",overflow:"hidden",boxShadow:"0 4px 16px rgba(201,122,181,.25)"}}>
          <div style={{position:"absolute",right:"12px",top:"0px",fontSize:"72px",opacity:.08,fontFamily:"serif",lineHeight:1}}>"</div>
          <div style={{fontSize:"10px",fontWeight:700,letterSpacing:"1.5px",opacity:.8,marginBottom:"10px",textTransform:"uppercase"}}>Inspirasi Hari Ini</div>
          <p style={{fontFamily:"'Playfair Display',serif",fontSize:"16px",fontStyle:"italic",lineHeight:1.6,margin:"0 0 12px"}}>"{QUOTES[quoteIdx].text}"</p>
          <div style={{fontSize:"12px",opacity:.8,fontWeight:500}}>— {QUOTES[quoteIdx].source}</div>
        </div>

        {/* Target Hari Ini / Selesai / Empty */}
        {due.length > 0 ? (
          <div style={{marginBottom:"24px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"15px",fontWeight:700,color:T}}>
                <Clock size={16} color="#E07070"/> Target Hari Ini
              </div>
              <span style={{fontSize:"12px",fontWeight:700,color:"#B03030",background:"#FEF0F0",padding:"4px 10px",borderRadius:"12px"}}>{due.length} Item</span>
            </div>
            {due.slice(0,3).map(h => (
              <div key={h.id} onClick={()=>{setRevItem(h);setRevealed(new Set());setTab("review");}} style={{background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",padding:"16px",marginBottom:"10px",borderRadius:"18px",border:`1.5px solid ${(SM as any)[h.status].bg}`,boxShadow:"0 2px 8px rgba(61,50,80,.03)"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"10px",height:"10px",borderRadius:"50%",background:(SM as any)[h.status].dot,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:"15px",fontWeight:600,color:T}}>{h.judul}</div>
                    {h.judulAr && <div className="arabic" style={{fontSize:"16px",color:TM,marginTop:"2px"}}>{h.judulAr}</div>}
                  </div>
                </div>
                <div style={{background:"#FDFCFE",padding:"6px",borderRadius:"10px"}}><ChevronRight size={16} color={C}/></div>
              </div>
            ))}
          </div>
        ) : hafalan.length > 0 ? (
          <div style={{background:"#EBF7F2",border:"1px solid #C4EBDC",borderRadius:"24px",padding:"24px 20px",marginBottom:"24px",textAlign:"center",boxShadow:"0 4px 16px rgba(26,107,80,.08)"}}>
            <CheckCircle size={36} color={CS} style={{margin:"0 auto 12px"}}/>
            <div style={{fontWeight:700,fontSize:"17px",color:"#1A6B50",marginBottom:"6px"}}>Alhamdulillah, Selesai!</div>
            <div style={{fontSize:"13px",color:"#4A9A7A",marginBottom:"20px",lineHeight:1.5}}>Semua target hafalan hari ini sudah diselesaikan.</div>

            {/* Gacha */}
            <div style={{background:"#fff",border:"1px dashed #C4EBDC",borderRadius:"18px",padding:"16px",marginBottom:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <div style={{fontSize:"12px",fontWeight:700,color:"#1A6B50",textTransform:"uppercase",letterSpacing:"0.5px"}}>Gacha Traktiran</div>
                {totalReviews < 15 && <div style={{fontSize:"10px",fontWeight:700,color:"#B03030",background:"#FEF0F0",padding:"4px 8px",borderRadius:"8px",display:"flex",alignItems:"center",gap:"4px"}}><Lock size={10}/> Butuh {15 - totalReviews} Review Lagi</div>}
              </div>
              <div style={{fontSize:"18px",fontWeight:700,color:T,marginBottom:"12px",minHeight:"26px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {totalReviews < 15
                  ? <span style={{color:TM,fontSize:"13px",fontWeight:500}}>Kumpulin 15 kali review buat buka gacha!</span>
                  : isSpinning ? <span>{gachaResult || "Muter..."}</span>
                  : gachaResult ? <span style={{color:gachaResult.includes("Zonk")?C:"#1A6B50"}}>{gachaResult}</span>
                  : <span style={{color:TM,fontSize:"14px"}}>Coba puter, dapet apa nih?</span>}
              </div>
              <button onClick={playGacha} disabled={isSpinning||totalReviews<15} style={{background:totalReviews<15?"#F8F6FC":"#F5E8F2",color:totalReviews<15?TM:C,border:"none",borderRadius:"12px",padding:"10px 20px",fontSize:"13px",fontWeight:700,cursor:(isSpinning||totalReviews<15)?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:"6px"}}>
                <Dices size={16}/> {totalReviews<15?"Gacha Terkunci":isSpinning?"Memutar...":"Putar Gacha!"}
              </button>
            </div>

            {mentorWa && (
              <button onClick={() => {
                const textMessage = (totalReviews>=15 && gachaResult && !isSpinning && !gachaResult.includes("Zonk"))
                  ? `Halo! Aku (${displayName}) udah selesai ngafal hari ini, tadi muter gacha dapet: *${gachaResult}*! 🎉`
                  : `Halo! Ini ${displayName}, udah selesai review semua hafalan hari ini. Doain lancar terus ya!`;
                window.open(`https://wa.me/${mentorWa}?text=${encodeURIComponent(textMessage)}`, "_blank");
              }} style={{width:"100%",background:"#1A6B50",border:"none",borderRadius:"14px",padding:"14px",color:"#fff",fontSize:"14px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                <Heart size={18} fill="currentColor"/> Kabari Mentor
              </button>
            )}
          </div>
        ) : (
          <div style={{background:"#fff",border:"1.5px dashed #EBD5E5",borderRadius:"24px",padding:"30px 20px",textAlign:"center",marginBottom:"24px"}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>🌱</div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",fontWeight:700,color:T,marginBottom:"6px"}}>Mulai Perjalananmu</h3>
            <p style={{fontSize:"13px",color:TM,lineHeight:1.5,marginBottom:"16px"}}>Belum ada target hafalan nih. Yuk, tambahkan ayat pertamamu!</p>
            <button onClick={()=>setTab("hafalan")} style={{background:"#F5E8F2",border:"none",borderRadius:"12px",padding:"10px 20px",color:C,fontSize:"13px",fontWeight:700,cursor:"pointer"}}>Pergi ke Menu Hafalan</button>
          </div>
        )}

        {/* Aktivitas & Heatmap */}
        <div style={{background:"#fff",border:"1px solid #F0ECF8",borderRadius:"24px",padding:"20px",marginBottom:"24px",boxShadow:"0 4px 20px rgba(61,50,80,.03)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"20px"}}>
            <Calendar size={18} color={C}/>
            <div style={{fontSize:"16px",fontWeight:700,color:T}}>Aktivitas Hafalan</div>
            {syncing && <Loader size={14} color={C} className="spin"/>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"24px"}}>
            {[
              {label:"Total",val:hafalan.length,color:C,bg:"#F5E8F2"},
              {label:"Ulang",val:hafalan.filter(h=>h.status==="merah").length,color:"#E07070",bg:"#FEF0F0"},
              {label:"Lancar",val:hafalan.filter(h=>h.status==="hijau").length,color:CS,bg:"#EBF7F2"},
            ].map(s=>(
              <div key={s.label} style={{background:s.bg,borderRadius:"16px",padding:"14px 8px",textAlign:"center"}}>
                <div style={{fontSize:"24px",fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</div>
                <div style={{fontSize:"11px",color:TM,marginTop:"6px",fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:"13px",fontWeight:600,color:TM,marginBottom:"12px"}}>Jejak Istiqomah (28 Hari)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7, 1fr)",gap:"6px"}}>
            {Array.from({length:28},(_,i)=>{
              const d=new Date(); d.setDate(d.getDate()-(27-i));
              const dateStr=d.toISOString().split('T')[0];
              const count=heatmap[dateStr]||0;
              let bg="#F8F6FC",border="1px solid #F0ECF8";
              if(count>0&&count<=2){bg="#F5E8F2";border="1px solid #EBD5E5";}
              else if(count>=3&&count<=5){bg="#D69DC6";border="1px solid #D69DC6";}
              else if(count>5){bg="#C97AB5";border="1px solid #C97AB5";}
              return <div key={dateStr} style={{aspectRatio:"1/1",borderRadius:"6px",background:bg,border,transition:"background 0.3s"}} title={`${fmt(dateStr)}: ${count} review`}/>;
            })}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:"6px",marginTop:"14px"}}>
            <span style={{fontSize:"10px",color:TM,fontWeight:600}}>Sedikit</span>
            {["#F8F6FC","#F5E8F2","#D69DC6","#C97AB5"].map(bg=><div key={bg} style={{width:"12px",height:"12px",borderRadius:"3px",background:bg}}/>)}
            <span style={{fontSize:"10px",color:TM,fontWeight:600}}>Banyak</span>
          </div>
        </div>

        <button onClick={()=>setTab("rewards")} style={{width:"100%",background:"#FAF7FF",border:"1px dashed #C97AB5",borderRadius:"20px",padding:"16px",color:C,fontSize:"14px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",boxShadow:"0 4px 14px rgba(201,122,181,.08)"}}>
          <Gift size={20} color={C}/> Buka Hadiah Rahasia
        </button>

      </div>}

      {/* ── REWARDS ─────────────────────────────────────────────────────────── */}
      {tab==="rewards" && <div style={{padding:"24px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
          <button onClick={()=>setTab("home")} className="ghost-btn"><ChevronRight size={24} style={{transform:"rotate(180deg)"}} color={T}/></button>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:600,margin:0}}>Hadiah Rahasia 🎁</h2>
        </div>
        <div style={{background:"#fff",borderRadius:"16px",padding:"16px",marginBottom:"20px",border:"1px solid #EAE4F2",display:"flex",justifyContent:"space-around"}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:"20px",fontWeight:700,color:C}}>{totalReviews}</div><div style={{fontSize:"11px",color:TM}}>Total Review</div></div>
          <div style={{width:"1px",background:"#EAE4F2"}}/>
          <div style={{textAlign:"center"}}><div style={{fontSize:"20px",fontWeight:700,color:"#E07070"}}>{streak}</div><div style={{fontSize:"11px",color:TM}}>Streak Hari</div></div>
        </div>
        <div style={{display:"grid",gap:"14px"}}>
          {REWARDS.map(r => {
            const isUnlocked = r.type === "review" ? totalReviews >= r.req : streak >= r.req;
            return (
              <div key={r.id} style={{background:isUnlocked?"#fff":"#F8F6FC",border:`1px solid ${isUnlocked?"#F0E2F5":"#EAE4F2"}`,borderRadius:"18px",padding:"16px",display:"flex",gap:"14px",alignItems:"center"}}>
                <div style={{width:"60px",height:"60px",borderRadius:"14px",background:isUnlocked?"#FDF6F0":"#EAE4F2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",flexShrink:0}}>
                  {isUnlocked ? r.img : <Lock size={24} color="#9B8FAD"/>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"11px",color:isUnlocked?C:TM,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"4px"}}>
                    Syarat: {r.req} {r.type==="review"?"Kali Review":"Hari Streak"}
                  </div>
                  <div style={{fontSize:"15px",fontWeight:700,color:isUnlocked?T:TM,marginBottom:"4px"}}>{isUnlocked?r.title:"Terkunci"}</div>
                  <div style={{fontSize:"12px",color:TM,lineHeight:1.4}}>{isUnlocked?r.msg:"Ayo semangat ngafalnya biar rahasia ini kebuka!"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>}

      {/* ── HAFALAN ─────────────────────────────────────────────────────────── */}
      {tab==="hafalan" && <div style={{padding:"24px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:600,margin:0}}>Daftar Hafalan</h2>
          <button onClick={()=>setShowAdd(true)} style={{background:C,border:"none",borderRadius:"12px",padding:"8px 14px",color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}>
            <Plus size={14}/> Tambah
          </button>
        </div>
        <div style={{display:"flex",gap:"7px",marginBottom:"14px",flexWrap:"wrap"}}>
          {Object.entries(SM).map(([k,v])=>(
            <div key={k} className="pill" style={{background:v.bg,color:v.text}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:v.dot}}/>{v.label}
            </div>
          ))}
        </div>

        {hafalan.length===0 && !syncing && (
          <div style={{background:"#fff",border:"1.5px dashed #EBD5E5",borderRadius:"24px",padding:"40px 20px",textAlign:"center",marginTop:"20px"}}>
            <div style={{fontSize:"48px",marginBottom:"12px"}}>📖</div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"20px",fontWeight:700,color:T,marginBottom:"8px"}}>Belum Ada Hafalan</h3>
            <p style={{fontSize:"13px",color:TM,lineHeight:1.6,marginBottom:"20px"}}>Ruang ini masih kosong. Yuk, tambahkan ayat pertamamu!</p>
            <button onClick={()=>setShowAdd(true)} style={{background:C,border:"none",borderRadius:"14px",padding:"12px 24px",color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:"8px",boxShadow:"0 4px 14px rgba(201,122,181,.25)"}}>
              <Plus size={16}/> Tambah Hafalan Pertama
            </button>
          </div>
        )}

        {hafalan.map(h => {
          const sm = (SM as any)[h.status];
          const od = isOverdue(h.nextReview);
          return (
            <div key={h.id} className="card" style={{border:`1px solid ${od?"#FCD8D8":"#F2EEF8"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:"15px"}}>{h.judul}</div>
                  {h.judulAr && <div className="arabic" style={{fontSize:"17px",color:C,marginTop:"2px"}}>{h.judulAr}</div>}
                  <div style={{marginTop:"5px"}}>
                    {od ? <span className="pill" style={{background:"#FEF0F0",color:"#B03030"}}>⚠ Perlu review!</span>
                        : <span style={{fontSize:"12px",color:TM}}>Review: {fmt(h.nextReview)} · {h.reviewCount}× selesai</span>}
                  </div>
                </div>
                <button className="ghost-btn" onClick={()=>deleteHafalan(h.id)}><Trash2 size={14} color="#CCC"/></button>
              </div>
              <div style={{display:"flex",gap:"6px",marginBottom:"10px"}}>
                {Object.entries(SM).map(([k,v])=>(
                  <button key={k} className="sbtn" onClick={()=>quickStatusUpdate(h.id,k)} style={{borderColor:h.status===k?v.dot:"transparent",background:h.status===k?v.bg:"#F8F6FC",color:h.status===k?v.text:TM,fontWeight:h.status===k?700:400}}>
                    <div style={{width:"6px",height:"6px",borderRadius:"50%",background:v.dot}}/>{v.label}
                  </button>
                ))}
              </div>
              <button onClick={()=>{setRevItem(h);setRevealed(new Set());setTab("review");}} style={{width:"100%",background:"#F5E8F2",border:"none",borderRadius:"10px",padding:"9px",color:C,fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                <Eye size={14}/> Review Sekarang
              </button>
            </div>
          );
        })}

        {/* Add Hafalan Modal */}
        {showAdd && (
          <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
            <div className="modal-box">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
                <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"20px",margin:0}}>Tambah Hafalan</h3>
                <button className="ghost-btn" onClick={()=>setShowAdd(false)}><X size={20} color={TM}/></button>
              </div>
              <div style={{fontSize:"13px",color:TM,marginBottom:"6px",fontWeight:600}}>Pilih Surat Al-Quran</div>
              <div onClick={()=>setShowSurahPicker(!showSurahPicker)} style={{...INP,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                {fSurah ? (
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"14px",fontWeight:600}}>{fSurah.number}. {fSurah.englishName}</span>
                    <span className="arabic" style={{fontSize:"18px",color:C}}>{fSurah.name}</span>
                  </div>
                ) : <span style={{color:TM,fontSize:"14px"}}>Pilih surat...</span>}
                {showSurahPicker ? <ChevronUp size={15} color={TM}/> : <ChevronDown size={15} color={TM}/>}
              </div>
              {showSurahPicker && (
                <div style={{background:"#fff",border:"1.5px solid #E4DFF0",borderRadius:"12px",marginBottom:"12px",maxHeight:"200px",overflowY:"auto"}}>
                  <div style={{padding:"8px 10px",borderBottom:"1px solid #F0ECF8",position:"sticky",top:0,background:"#fff"}}>
                    <input value={srchSurah} onChange={e=>setSrchSurah(e.target.value)} placeholder="Cari surat..." style={{...INP,padding:"7px 10px",fontSize:"13px"}}/>
                  </div>
                  {filtSurahs.map(s=>(
                    <div key={s.number} onClick={()=>{setFSurah(s);setFStart(1);setFEnd(Math.min(5,s.numberOfAyahs));setFArabic("");setShowSurahPicker(false);setSrchSurah("");}} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #F8F6FC",display:"flex",justifyContent:"space-between",alignItems:"center",background:fSurah?.number===s.number?"#F5E8F2":"transparent"}}>
                      <span style={{fontSize:"13px",fontWeight:500}}>{s.number}. {s.englishName}</span>
                      <span className="arabic" style={{fontSize:"18px",color:C}}>{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {fSurah && <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
                  <div><div style={{fontSize:"12px",color:TM,marginBottom:"5px"}}>Ayat dari</div><input type="number" value={fStart} onChange={e=>setFStart(Math.max(1,Math.min(+e.target.value,fSurah.numberOfAyahs)))} min={1} max={fSurah.numberOfAyahs} style={INP}/></div>
                  <div><div style={{fontSize:"12px",color:TM,marginBottom:"5px"}}>Sampai ayat</div><input type="number" value={fEnd} onChange={e=>setFEnd(Math.max(fStart,Math.min(+e.target.value,fSurah.numberOfAyahs)))} min={fStart} max={fSurah.numberOfAyahs} style={INP}/></div>
                </div>
                <button onClick={fetchArabic} disabled={fetchingAr} style={{width:"100%",background:fetchingAr?"#F0ECF8":"#F5E8F2",border:"none",borderRadius:"12px",padding:"10px",color:C,fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",marginBottom:"12px"}}>
                  {fetchingAr ? <><Loader size={14} className="spin"/> Mengambil teks...</> : <><RefreshCw size={14}/> Ambil Teks Arab</>}
                </button>
                {fArabic && (
                  <div style={{background:"#FAF7FF",border:"1px solid #EDE4F8",borderRadius:"14px",padding:"16px 14px",marginBottom:"14px"}}>
                    <div className="arabic" style={{fontSize:"22px",lineHeight:2.4,color:"#2D1F4A"}}>{fArabic}</div>
                  </div>
                )}
              </>}
              <div style={{fontSize:"13px",color:TM,marginBottom:"7px",fontWeight:600}}>Status awal hafalan:</div>
              <div style={{display:"flex",gap:"8px",marginBottom:"18px"}}>
                {Object.entries(SM).map(([k,v])=>(
                  <button key={k} className="sbtn" onClick={()=>setFStatus(k)} style={{borderColor:fStatus===k?v.dot:"transparent",background:fStatus===k?v.bg:"#F8F6FC",color:fStatus===k?v.text:TM,fontWeight:fStatus===k?700:400}}>
                    <div style={{width:"7px",height:"7px",borderRadius:"50%",background:v.dot}}/>{v.label}
                  </button>
                ))}
              </div>
              <button className="primary-btn" onClick={addHafalan} disabled={!fSurah||!fArabic} style={{opacity:(!fSurah||!fArabic)?0.5:1}}>Simpan Hafalan ✓</button>
            </div>
          </div>
        )}
      </div>}

      {/* ── REVIEW ──────────────────────────────────────────────────────────── */}
      {tab==="review" && <div style={{padding:"24px 20px"}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:600,marginBottom:"4px"}}>Blur & Reveal</h2>
        <p style={{fontSize:"13px",color:TM,marginBottom:"20px"}}>Tap setiap kata Arab untuk mengungkapnya</p>

        {!revItem ? <>
          {hafalan.length === 0 ? (
            <div style={{textAlign:"center",padding:"50px 20px",color:TM}}>
              <div style={{fontSize:"40px",marginBottom:"16px"}}>🔍</div>
              <p style={{fontSize:"14px",lineHeight:1.5,marginBottom:"20px"}}>Belum ada hafalan yang bisa di-review. Tambahkan dulu ya!</p>
              <button onClick={()=>setTab("hafalan")} style={{background:"#F5E8F2",border:"none",borderRadius:"12px",padding:"10px 20px",color:C,fontSize:"13px",fontWeight:700,cursor:"pointer"}}>Tambah Sekarang</button>
            </div>
          ) : (
            hafalan.map(h => {
              const sm = (SM as any)[h.status];
              return (
                <div key={h.id} onClick={()=>{setRevItem(h);setRevealed(new Set());}} className="card" style={{cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <div style={{width:"10px",height:"10px",borderRadius:"50%",background:sm.dot}}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:"14px"}}>{h.judul}</div>
                      <div style={{fontSize:"12px",color:TM,marginTop:"2px"}}>Interval {h.interval} hari</div>
                    </div>
                  </div>
                  <ChevronRight size={15} color={C}/>
                </div>
              );
            })
          )}
        </> : <>
          <div className="card" style={{marginBottom:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontWeight:700,fontSize:"16px"}}>{revItem.judul}</div>
                {revItem.judulAr && <div className="arabic" style={{fontSize:"20px",color:C,marginTop:"2px"}}>{revItem.judulAr}</div>}
              </div>
              <button onClick={()=>toggleAudio(revItem)} disabled={audioLoading} style={{background:isAudioPlaying?"#FEF0F0":"#F5E8F2",border:"none",borderRadius:"12px",padding:"10px",color:isAudioPlaying?"#B03030":C,cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
                {audioLoading ? <Loader size={16} className="spin"/> : isAudioPlaying ? <Square size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
              </button>
            </div>
            {revItem.konten && <>
              <div style={{direction:"rtl",textAlign:"right",lineHeight:3,margin:"14px 0"}}>
                {revItem.konten.split(" ").map((w: string, i: number)=>(
                  <span key={i} onClick={()=>setRevealed(p=>{const s=new Set(p);s.add(i);return s;})} className={`rword ${revealed.has(i)?"clear-w":"blur-w"}`}>{w}</span>
                ))}
              </div>
              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={()=>setRevealed(new Set(revItem.konten.split(" ").map((_: any,i: number)=>i)))} style={{flex:1,background:"#F5E8F2",border:"none",borderRadius:"10px",padding:"8px",color:C,fontSize:"13px",fontWeight:700,cursor:"pointer"}}>Reveal Semua</button>
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
              ].map(r=>(
                <button key={r.q} onClick={()=>handleReviewClick(r.q)} style={{background:r.bg,border:"none",borderRadius:"14px",padding:"14px 10px",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:"26px",marginBottom:"4px"}}>{r.emoji}</div>
                  <div style={{fontSize:"12px",fontWeight:700,color:r.color}}>{r.label}</div>
                </button>
              ))}
            </div>
            <button onClick={()=>setRevItem(null)} style={{width:"100%",background:"none",border:"none",color:TM,fontSize:"13px",cursor:"pointer",padding:"6px"}}>Batal</button>
          </div>
        </>}
      </div>}

      {/* ── JURNAL ──────────────────────────────────────────────────────────── */}
      {tab==="jurnal" && <div style={{padding:"24px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:600,margin:0}}>Jurnal Harian</h2>
          <button onClick={()=>setShowJForm(true)} style={{background:CS,border:"none",borderRadius:"12px",padding:"8px 14px",color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}>
            <Plus size={14}/> Tulis
          </button>
        </div>

        {journal.length===0 && !syncing && (
          <div style={{textAlign:"center",padding:"40px 20px",color:TM}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>✍️</div>
            <p style={{fontSize:"14px",lineHeight:1.5}}>Belum ada catatan. Tulis perasaan dan progres hafalanmu hari ini!</p>
          </div>
        )}

        {journal.map(j => {
          const reps = j.replies || [];
          const isExp = expandedJ === j.id;
          return (
            <div key={j.id} className="card">
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
                <div style={{fontSize:"11px",color:C,fontWeight:700,marginBottom:"5px"}}>{displayName}</div>
                <p style={{fontSize:"14px",lineHeight:1.65,color:T,margin:0}}>{j.notes}</p>
              </div>
              {isExp && <>
                <div style={{marginTop:"10px",display:"flex",flexDirection:"column",gap:"8px"}}>
                  {reps.map((r: any) => (
                    <div key={r.id} style={{display:"flex",justifyContent:"flex-end"}}>
                      <div className="chat-reply" style={{maxWidth:"82%"}}>
                        <div style={{fontSize:"11px",color:"rgba(255,255,255,.7)",fontWeight:700,marginBottom:"4px"}}>{r.author}</div>
                        <p style={{fontSize:"14px",lineHeight:1.55,margin:0}}>{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:"8px",marginTop:"12px",alignItems:"center"}}>
                  <input value={replyTxt} onChange={e=>setReplyTxt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addReply(j.id,reps)} placeholder="Balas catatan ini..." style={{...INP,flex:1,padding:"9px 12px",fontSize:"13px"}}/>
                  <button onClick={()=>addReply(j.id,reps)} style={{background:C,border:"none",borderRadius:"10px",padding:"9px 12px",color:"#fff",cursor:"pointer"}}><Send size={15}/></button>
                </div>
              </>}
            </div>
          );
        })}

        {showJForm && (
          <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowJForm(false)}>
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
          </div>
        )}
      </div>}

      {/* ── BOTTOM NAV ──────────────────────────────────────────────────────── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"430px",background:"#fff",borderTop:"1px solid #EDE8F5",display:"grid",gridTemplateColumns:"repeat(4,1fr)",boxShadow:"0 -4px 20px rgba(61,50,80,.09)",zIndex:100}}>
        {[
          {id:"home",icon:<Home size={22}/>,label:"Beranda"},
          {id:"hafalan",icon:<BookOpen size={22}/>,label:"Hafalan"},
          {id:"review",icon:<Eye size={22}/>,label:"Review"},
          {id:"jurnal",icon:<PenLine size={22}/>,label:"Jurnal"},
        ].map(t=>(
          <button key={t.id} className="tab-btn" onClick={()=>{setTab(t.id);if(t.id!=="review")setRevItem(null);}} style={{background:"none",border:"none",padding:"14px 4px 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",color:tab===t.id?C:TM}}>
            {t.icon}
            <span style={{fontSize:"10px",fontWeight:tab===t.id?700:500}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
