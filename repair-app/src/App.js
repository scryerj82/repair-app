import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── TRANSLATIONS ────────────────────────────────────────────────────────────
const T = {
  en: {
    title: 'Tech Assist AI',
    subtitle: 'Computer Repair · Powered by AI',
    placeholder: 'Describe your computer problem...',
    send: 'Send',
    listening: 'Listening...',
    speak: 'Speak',
    mute: 'Mute Voice',
    unmute: 'Unmute Voice',
    diag: 'Run Diagnostics',
    diagTitle: 'System Diagnostics',
    diagSub: 'Basic system info from your browser',
    clearChat: 'Clear Chat',
    typing: 'Thinking...',
    welcome: "Hi! I'm your AI tech support assistant. Tell me what's going on with your computer and I'll help you fix it. You can also tap the mic to speak.",
    apiNote: '⚙️ To enable AI responses, add your OpenAI API key to src/config.js',
    noSpeech: 'Speech recognition not supported in this browser. Try Chrome.',
  },
  es: {
    title: 'Tech Assist IA',
    subtitle: 'Reparación de Computadoras · Con IA',
    placeholder: 'Describe el problema con tu computadora...',
    send: 'Enviar',
    listening: 'Escuchando...',
    speak: 'Hablar',
    mute: 'Silenciar Voz',
    unmute: 'Activar Voz',
    diag: 'Diagnóstico',
    diagTitle: 'Diagnóstico del Sistema',
    diagSub: 'Información básica del sistema desde tu navegador',
    clearChat: 'Limpiar Chat',
    typing: 'Pensando...',
    welcome: '¡Hola! Soy tu asistente de soporte técnico con IA. Cuéntame qué pasa con tu computadora y te ayudaré a resolverlo. También puedes tocar el micrófono para hablar.',
    apiNote: '⚙️ Para activar respuestas con IA, agrega tu clave de OpenAI en src/config.js',
    noSpeech: 'Reconocimiento de voz no disponible en este navegador. Usa Chrome.',
  }
};

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a friendly, expert computer repair technician assistant with 25+ years of experience. 
Your job is to help people diagnose and fix computer problems in plain, simple language — no jargon unless necessary.
- Always ask one clarifying question at a time if you need more info
- Give step-by-step instructions that anyone can follow
- Be encouraging and patient, especially with non-technical users
- If a problem needs in-person help, say so clearly and kindly
- Keep responses concise but complete
- If the user writes in Spanish, reply in Spanish. If in English, reply in English.`;

// ─── CONFIG (user fills this in) ─────────────────────────────────────────────
// Create src/config.js with: export const OPENAI_API_KEY = 'sk-...your key...';
let API_KEY = '';
try { API_KEY = require('./config').OPENAI_API_KEY; } catch(e) {}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getSystemInfo() {
  const nav = window.navigator;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  return {
    browser: nav.userAgent.includes('Chrome') ? 'Chrome' : nav.userAgent.includes('Firefox') ? 'Firefox' : nav.userAgent.includes('Safari') ? 'Safari' : 'Unknown',
    platform: nav.platform || 'Unknown',
    language: nav.language,
    cores: nav.hardwareConcurrency || '?',
    memory: nav.deviceMemory ? nav.deviceMemory + ' GB' : 'Unknown',
    online: nav.onLine ? 'Connected' : 'Offline',
    connection: conn ? (conn.effectiveType || conn.type || 'Unknown') : 'Unknown',
    screen: `${window.screen.width}×${window.screen.height}`,
    colorDepth: window.screen.colorDepth + '-bit',
    touchscreen: ('ontouchstart' in window) ? 'Yes' : 'No',
    cookiesEnabled: nav.cookieEnabled ? 'Yes' : 'No',
  };
}

async function callOpenAI(messages) {
  if (!API_KEY) return null;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 600, temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function DiagPanel({ lang, onClose }) {
  const t = T[lang];
  const info = getSystemInfo();
  const rows = [
    ['Browser', info.browser], ['Platform', info.platform],
    ['Language', info.language], ['CPU Cores', info.cores],
    ['RAM', info.memory], ['Network', info.online],
    ['Connection', info.connection], ['Screen', info.screen],
    ['Color Depth', info.colorDepth], ['Touchscreen', info.touchscreen],
    ['Cookies', info.cookiesEnabled],
  ];
  return (
    <div style={styles.diagOverlay}>
      <div style={styles.diagPanel}>
        <div style={styles.diagHeader}>
          <div>
            <div style={styles.diagTitle}>{t.diagTitle}</div>
            <div style={styles.diagSub}>{t.diagSub}</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.diagGrid}>
          {rows.map(([k, v]) => (
            <div key={k} style={styles.diagRow}>
              <span style={styles.diagKey}>{k}</span>
              <span style={styles.diagVal}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ ...styles.msgWrap, justifyContent: isUser ? 'flex-end' : 'flex-start', animation: 'fadeUp 0.25s ease' }}>
      {!isUser && <div style={styles.avatar}>AI</div>}
      <div style={{ ...styles.bubble, ...(isUser ? styles.bubbleUser : styles.bubbleAI) }}>
        {msg.content.split('\n').map((line, i) => <p key={i} style={{ margin: '2px 0' }}>{line}</p>)}
      </div>
      {isUser && <div style={{ ...styles.avatar, background: 'var(--accent2)' }}>YOU</div>}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState('en');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showDiag, setShowDiag] = useState(false);
  const [hasApiKey] = useState(!!API_KEY);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const t = T[lang];

  // Welcome message
  useEffect(() => {
    setMessages([{ role: 'assistant', content: T[lang].welcome }]);
  }, [lang]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // TTS
  const speak = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang === 'es' ? 'es-MX' : 'en-US';
    utt.rate = 0.95;
    window.speechSynthesis.speak(utt);
  }, [voiceEnabled, lang]);

  // STT
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert(t.noSpeech); return; }
    const rec = new SpeechRecognition();
    rec.lang = lang === 'es' ? 'es-MX' : 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => setInput(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [lang, t]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // Send message
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      let reply;
      if (hasApiKey) {
        const apiMsgs = [{ role: 'system', content: SYSTEM_PROMPT }, ...updated.map(m => ({ role: m.role, content: m.content }))];
        reply = await callOpenAI(apiMsgs);
      } else {
        // Demo fallback — helpful canned responses
        await new Promise(r => setTimeout(r, 900));
        const lower = text.toLowerCase();
        if (lower.includes('slow') || lower.includes('lento'))
          reply = "A slow computer usually has one of these causes:\n1. Too many programs starting up automatically\n2. Low disk space (under 10% free)\n3. Malware or viruses\n4. Overheating\n\nLet's start simple — how old is the computer, and is it a laptop or desktop?";
        else if (lower.includes('blue screen') || lower.includes('bsod') || lower.includes('pantalla azul'))
          reply = "Blue screens are usually caused by a driver problem or failing hardware. A few questions:\n1. When did it start happening?\n2. Did you recently install new software or updates?\n3. Does it happen randomly or during specific tasks?";
        else if (lower.includes('wifi') || lower.includes('internet') || lower.includes('internet'))
          reply = "Internet issues can be the computer or the router. Quick test — can other devices connect to your WiFi? If yes, the problem is on your computer. If no, your router may need a restart.";
        else if (lower.includes('virus') || lower.includes('malware'))
          reply = "Good instinct to check for malware. Download Malwarebytes Free (malwarebytes.com) — it's safe and free. Run a full scan. While that runs, don't enter any passwords on that computer.";
        else
          reply = "Thanks for reaching out! I want to make sure I give you the right help. Can you describe what's happening in a little more detail? For example: what does the computer do (or not do), and when did it start?";
      }
      const assistantMsg = { role: 'assistant', content: reply };
      setMessages(prev => [...prev, assistantMsg]);
      speak(reply);
    } catch (err) {
      const errMsg = { role: 'assistant', content: '⚠️ Something went wrong connecting to the AI. Check your API key or internet connection.' };
      setMessages(prev => [...prev, errMsg]);
    }
    setLoading(false);
  }, [input, loading, messages, hasApiKey, speak]);

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div style={styles.app}>
      {/* Background grid */}
      <div style={styles.grid} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <span style={styles.logoDot} />
            <span style={styles.logoText}>{t.title}</span>
          </div>
          <div style={styles.subtitle}>{t.subtitle}</div>
        </div>
        <div style={styles.headerRight}>
          <button onClick={() => setLang(l => l === 'en' ? 'es' : 'en')} style={styles.langBtn}>
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
          <button onClick={() => setShowDiag(true)} style={styles.iconBtn} title={t.diag}>
            📊
          </button>
          <button onClick={() => { window.speechSynthesis?.cancel(); setVoiceEnabled(v => !v); }} style={styles.iconBtn} title={voiceEnabled ? t.mute : t.unmute}>
            {voiceEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      {/* API key notice */}
      {!hasApiKey && (
        <div style={styles.apiNotice}>{t.apiNote}</div>
      )}

      {/* Chat area */}
      <main style={styles.main}>
        <div style={styles.chatScroll}>
          {messages.map((m, i) => <Message key={i} msg={m} />)}
          {loading && (
            <div style={{ ...styles.msgWrap, justifyContent: 'flex-start' }}>
              <div style={styles.avatar}>AI</div>
              <div style={{ ...styles.bubble, ...styles.bubbleAI }}>
                <span style={styles.typing}>{t.typing}</span>
                <span style={styles.cursor} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input area */}
      <footer style={styles.footer}>
        <div style={styles.inputRow}>
          <button
            onClick={listening ? stopListening : startListening}
            style={{ ...styles.micBtn, ...(listening ? styles.micActive : {}) }}
            title={t.speak}
          >
            {listening ? (
              <>
                <span style={styles.micRing} />
                <span>🎙</span>
              </>
            ) : '🎤'}
          </button>
          <textarea
            style={styles.textarea}
            value={listening ? t.listening : input}
            onChange={e => !listening && setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t.placeholder}
            rows={1}
            disabled={listening}
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading} style={{ ...styles.sendBtn, opacity: (!input.trim() || loading) ? 0.4 : 1 }}>
            {t.send}
          </button>
        </div>
        <div style={styles.footerNote}>
          <button onClick={() => setMessages([{ role: 'assistant', content: t.welcome }])} style={styles.clearBtn}>{t.clearChat}</button>
        </div>
      </footer>

      {showDiag && <DiagPanel lang={lang} onClose={() => setShowDiag(false)} />}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  app: { display:'flex', flexDirection:'column', height:'100vh', position:'relative', overflow:'hidden' },
  grid: {
    position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
    backgroundImage:`linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)`,
    backgroundSize:'40px 40px',
  },
  header: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'14px 20px', borderBottom:'1px solid var(--border)',
    background:'rgba(7,13,26,0.95)', backdropFilter:'blur(12px)',
    position:'relative', zIndex:10,
  },
  headerLeft: { display:'flex', flexDirection:'column', gap:2 },
  logo: { display:'flex', alignItems:'center', gap:10 },
  logoDot: {
    width:10, height:10, borderRadius:'50%', background:'var(--accent)',
    boxShadow:'0 0 8px var(--accent)',
    animation:'pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
  },
  logoText: { fontFamily:'var(--font-ui)', fontWeight:800, fontSize:20, color:'var(--accent)', letterSpacing:1 },
  subtitle: { fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-dim)', letterSpacing:2, paddingLeft:20 },
  headerRight: { display:'flex', gap:8, alignItems:'center' },
  langBtn: {
    padding:'6px 14px', borderRadius:6, border:'1px solid var(--accent)',
    background:'transparent', color:'var(--accent)', fontFamily:'var(--font-mono)',
    fontSize:12, fontWeight:700, cursor:'pointer', letterSpacing:1,
    transition:'all 0.2s',
  },
  iconBtn: { background:'none', border:'none', fontSize:20, cursor:'pointer', padding:'4px 6px', borderRadius:6, transition:'background 0.2s' },
  apiNotice: {
    background:'rgba(255,215,0,0.08)', borderBottom:'1px solid rgba(255,215,0,0.2)',
    color:'var(--yellow)', fontFamily:'var(--font-mono)', fontSize:12,
    padding:'8px 20px', textAlign:'center', zIndex:9, position:'relative',
  },
  main: { flex:1, overflow:'hidden', position:'relative', zIndex:1 },
  chatScroll: { height:'100%', overflowY:'auto', padding:'20px 16px', display:'flex', flexDirection:'column', gap:14 },
  msgWrap: { display:'flex', gap:10, alignItems:'flex-end', width:'100%' },
  avatar: {
    width:36, height:36, borderRadius:8, background:'var(--bg3)',
    border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700, color:'var(--accent)',
    flexShrink:0,
  },
  bubble: {
    maxWidth:'72%', padding:'12px 16px', borderRadius:12, lineHeight:1.6,
    fontFamily:'var(--font-ui)', fontSize:15,
  },
  bubbleAI: {
    background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)',
    borderBottomLeftRadius:2,
  },
  bubbleUser: {
    background:'linear-gradient(135deg, var(--accent2), #005580)', color:'#fff',
    borderBottomRightRadius:2,
  },
  typing: { color:'var(--text-dim)', fontStyle:'italic', fontFamily:'var(--font-mono)', fontSize:13 },
  cursor: { display:'inline-block', width:2, height:14, background:'var(--accent)', marginLeft:4, animation:'blink 1s step-end infinite', verticalAlign:'middle' },
  footer: {
    borderTop:'1px solid var(--border)', padding:'12px 16px 16px',
    background:'rgba(7,13,26,0.97)', backdropFilter:'blur(12px)',
    position:'relative', zIndex:10,
  },
  inputRow: { display:'flex', gap:8, alignItems:'flex-end' },
  micBtn: {
    width:44, height:44, borderRadius:10, border:'1px solid var(--border)',
    background:'var(--bg3)', fontSize:18, cursor:'pointer', flexShrink:0,
    display:'flex', alignItems:'center', justifyContent:'center',
    position:'relative', transition:'all 0.2s',
  },
  micActive: { borderColor:'var(--red)', background:'rgba(255,77,109,0.15)', boxShadow:'0 0 12px rgba(255,77,109,0.3)' },
  micRing: {
    position:'absolute', inset:-4, borderRadius:14,
    border:'2px solid var(--red)', opacity:0,
    animation:'pulse-ring 1s ease-out infinite',
  },
  textarea: {
    flex:1, padding:'11px 14px', borderRadius:10, border:'1px solid var(--border)',
    background:'var(--bg3)', color:'var(--text)', fontFamily:'var(--font-ui)',
    fontSize:15, resize:'none', outline:'none', lineHeight:1.5,
    transition:'border-color 0.2s',
  },
  sendBtn: {
    padding:'11px 22px', borderRadius:10, border:'none',
    background:'linear-gradient(135deg, var(--accent), var(--accent2))',
    color:'#000', fontFamily:'var(--font-ui)', fontWeight:700,
    fontSize:14, cursor:'pointer', flexShrink:0, transition:'all 0.2s',
  },
  footerNote: { display:'flex', justifyContent:'flex-end', marginTop:8 },
  clearBtn: {
    background:'none', border:'none', color:'var(--text-dim)',
    fontFamily:'var(--font-mono)', fontSize:11, cursor:'pointer',
    letterSpacing:1, textDecoration:'underline',
  },
  diagOverlay: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:100,
    display:'flex', alignItems:'center', justifyContent:'center', padding:16,
  },
  diagPanel: {
    background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14,
    padding:24, maxWidth:480, width:'100%', maxHeight:'80vh', overflowY:'auto',
  },
  diagHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  diagTitle: { fontFamily:'var(--font-ui)', fontWeight:800, fontSize:18, color:'var(--accent)' },
  diagSub: { fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-dim)', marginTop:4 },
  closeBtn: {
    background:'none', border:'1px solid var(--border)', color:'var(--text-dim)',
    borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:14,
  },
  diagGrid: { display:'flex', flexDirection:'column', gap:8 },
  diagRow: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'8px 12px', background:'var(--bg3)', borderRadius:8,
    border:'1px solid var(--border)',
  },
  diagKey: { fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-dim)' },
  diagVal: { fontFamily:'var(--font-mono)', fontSize:12, color:'var(--green)', fontWeight:700 },
};
