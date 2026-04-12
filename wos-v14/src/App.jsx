// Writing OS v50 — App.jsx v14 (38 панелей)
import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import LockScreen, { useAutoLock } from './security/LockScreen'
import { isPinConfigured, lock }   from './security/crypto'
import { useSettings }             from './store'
import { useDeadlines, usePWA }    from './hooks'
import { DeadlineAlert, ToastContainer } from './components'
import { initEmbedder }            from './rag/embedder'
import { VectorStore }             from './rag/vectorStore'
import { Documents }               from './db'

const P = path => lazy(() => import(path))
const Panels = {
  dashboard:      P('./panels/DashboardPanel'),
  editor:         P('./panels/EditorPanel'),
  cases:          P('./panels/CasesPanel'),
  workflow:       P('./panels/WorkflowPanel'),
  scanner:        P('./panels/ScannerPanel'),
  notes:          P('./panels/NotesPanel'),
  sprachmemo:     P('./panels/SprachMemoPanel'),
  evidence:       P('./panels/EvidencePanel'),
  todo:           P('./panels/TodoPanel'),
  ai:             P('./panels/AIPanel'),
  search:         P('./rag/SmartSearch'),
  bsg:            P('./panels/BSGSearchPanel'),
  translator:     P('./panels/TranslatorPanel'),
  paraanalyzer:   P('./panels/ParagraphenAnalyzer'),
  widassist:      P('./panels/WiderspruchAssistant'),
  antraege:       P('./panels/AntragsManager'),
  rechtsmittel:   P('./panels/RechtsmittelTracker'),
  vollmacht:      P('./panels/VollmachtPanel'),
  falldatenblatt: P('./panels/FallDatenblatt'),
  aktionsplan:    P('./panels/AktionsplanPanel'),
  schriftsatz:    P('./panels/SchriftsatzPanel'),
  frist:          P('./panels/FristrechnerPanel'),
  sgb:            P('./panels/SGBPanel'),
  briefgen:       P('./panels/BriefGeneratorPanel'),
  gutachten:      P('./panels/GutachtenPanel'),
  statistikpro:   P('./panels/StatistikProPanel'),
  budget:         P('./panels/BudgetCalculator'),
  pkh:            P('./panels/PKHPanel'),
  auftraege:      P('./panels/AuftragPanel'),
  stundenzettel:  P('./panels/StundenzettelPanel'),
  termine:        P('./panels/TerminePanel'),
  korrespondenz:  P('./panels/KorrespondenzPanel'),
  haushalt:       P('./panels/HaushaltsbuchPanel'),
  contacts:       P('./panels/ContactsPanel'),
  make:           P('./panels/MakePanel'),
  analytics:      P('./panels/AnalyticsPanel'),
  export:         P('./panels/ExportPanel'),
  settings:       P('./panels/SettingsPanel'),
}

const THEMES = {
  dark:  {bg:'#080808',sf:'#101010',sf2:'#141414',sf3:'#1a1a1a',bd:'#1e1e1e',bd2:'#252525',bd3:'#2e2e2e',tx:'#ddd5c5',dm:'#666666',ac:'#9a8a6a',ai:'#7a9a8a',aiBg:'#0c1812',aiBd:'#1a3028',ip:'#111111',err:'#cc2222',warn:'#cc7722',ok:'#3a8a3a'},
  sepia: {bg:'#1a1510',sf:'#221e18',sf2:'#2a2520',sf3:'#322d26',bd:'#3a3530',bd2:'#46403a',bd3:'#524c46',tx:'#e8dcc8',dm:'#8a7a6a',ac:'#c9a84c',ai:'#8aaa8a',aiBg:'#121a12',aiBd:'#1e3020',ip:'#201c16',err:'#cc3333',warn:'#cc8833',ok:'#4a9a4a'},
  light: {bg:'#f5f2ed',sf:'#ede9e2',sf2:'#e5e0d8',sf3:'#ddd8cf',bd:'#ccc8c0',bd2:'#bab5ac',bd3:'#aaa59c',tx:'#2a2520',dm:'#888078',ac:'#7a6a4a',ai:'#3a6a5a',aiBg:'#e8f0ec',aiBd:'#c0d8cc',ip:'#ffffff',err:'#cc2222',warn:'#aa5500',ok:'#2a7a2a'},
}

// 38 вкладок, 5 групп
const NAV = [
  {id:'dashboard',     icon:'🏠',label:'Start',        key:'`'         },
  // Dokumente
  {id:'editor',        icon:'✏️',label:'Editor',       key:'1',sep:true},
  {id:'cases',         icon:'⚖️',label:'Akten',         key:'2'         },
  {id:'workflow',      icon:'🔄',label:'Workflow',     key:'3'         },
  {id:'scanner',       icon:'📷',label:'OCR',          key:'4'         },
  {id:'notes',         icon:'📝',label:'Notizen',      key:'n'         },
  {id:'sprachmemo',    icon:'🎙',label:'Sprache',      key:'x'         },
  {id:'evidence',      icon:'🔎',label:'Beweise',      key:'v'         },
  {id:'todo',          icon:'✅',label:'ToDo',         key:'c'         },
  // KI & Suche
  {id:'ai',            icon:'🤖',label:'AI',           key:'5',sep:true},
  {id:'search',        icon:'🔍',label:'RAG',          key:'6'         },
  {id:'bsg',           icon:'🏛',label:'BSG',          key:'7'         },
  {id:'translator',    icon:'🌐',label:'Übersetzer',   key:'u'         },
  {id:'paraanalyzer',  icon:'§', label:'§ Analyse',    key:'y'         },
  // Recht
  {id:'widassist',     icon:'⚖️',label:'Widerspruch',  key:'w',sep:true},
  {id:'antraege',      icon:'📑',label:'Anträge',      key:'q'         },
  {id:'rechtsmittel',  icon:'🗺',label:'Instanzen',    key:'r'         },
  {id:'vollmacht',     icon:'📋',label:'Vollmacht',    key:'f'         },
  {id:'falldatenblatt',icon:'📊',label:'Datenblatt',   key:'d'         },
  {id:'aktionsplan',   icon:'🎯',label:'Aktionsplan',  key:'g'         },
  {id:'schriftsatz',   icon:'📜',label:'Schriftsatz',  key:'8'         },
  {id:'briefgen',      icon:'✉️',label:'Briefe KI',    key:'i'         },
  {id:'frist',         icon:'⏱',label:'Fristen',      key:'9'         },
  {id:'sgb',           icon:'📖',label:'SGB §§',       key:'0'         },
  {id:'gutachten',     icon:'🔬',label:'Gutachten',    key:'j'         },
  // PB-Management
  {id:'budget',        icon:'💶',label:'Budget',       key:'-',sep:true},
  {id:'pkh',           icon:'⚖', label:'PKH',          key:'='         },
  {id:'auftraege',     icon:'🤝',label:'Assistenz',    key:'a'         },
  {id:'stundenzettel', icon:'⏲',label:'Stunden',      key:'z'         },
  {id:'termine',       icon:'🗓',label:'Termine',      key:'t'         },
  {id:'korrespondenz', icon:'📬',label:'Briefe',       key:'k'         },
  {id:'haushalt',      icon:'💰',label:'Ausgaben',     key:'h'         },
  {id:'contacts',      icon:'📇',label:'Behörden',     key:'b'         },
  {id:'make',          icon:'⚡',label:'Make.com',     key:'m'         },
  // System
  {id:'statistikpro',  icon:'📈',label:'Statistik Pro',key:'o',sep:true},
  {id:'analytics',     icon:'📊',label:'Analytics',    key:'s'         },
  {id:'export',        icon:'📤',label:'Export',       key:'e'         },
  {id:'settings',      icon:'⚙️',label:'Settings',     key:'p'         },
]

export default function App() {
  const [locked,  setLocked]  = useState(isPinConfigured())
  const [tab,     setTab]     = useState('dashboard')
  const [theme,   setTheme]   = useState(()=>localStorage.getItem('wos-theme')||'dark')
  const T = THEMES[theme]||THEMES.dark
  const settings = useSettings()
  const {urgent,overdue} = useDeadlines()
  const {canInstall,install} = usePWA()
  const urgentCount = urgent.length+overdue.length

  useEffect(()=>{ localStorage.setItem('wos-theme',theme) },[theme])
  useAutoLock(useCallback(()=>{ lock(); setLocked(true) },[]),settings.autoLockMinutes)

  useEffect(()=>{
    const h=e=>{ if(locked||!e.altKey) return; const n=NAV.find(n=>n.key===e.key); if(n){e.preventDefault();setTab(n.id)} if(e.key==='l'){lock();setLocked(true)} }
    window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h)
  },[locked])

  useEffect(()=>{
    if(locked) return
    initEmbedder().catch(()=>{})
    ;(async()=>{ const docs=await Documents.list(); for(const d of docs) if(d.content&&!(await VectorStore.isIndexed(d.id))) VectorStore.indexDocument(d).catch(()=>{}) })()
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
    const p=new URLSearchParams(location.search); if(p.get('panel')) setTab(p.get('panel'))
  },[locked])

  const Panel=Panels[tab]; const nav=id=>setTab(id)
  const nth={dark:'sepia',sepia:'light',light:'dark'}
  const thi={dark:'🌙',sepia:'📜',light:'☀️'}

  return (
    <div style={{width:'100vw',height:'100dvh',background:T.bg,color:T.tx,fontFamily:"'JetBrains Mono','Fira Code','Courier New',monospace",display:'flex',flexDirection:'column',overflow:'hidden',fontSize:12}}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${T.bd3};border-radius:2px}textarea,input,select{user-select:text}@keyframes spin{to{transform:rotate(360deg)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes fadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}`}</style>
      {locked && <LockScreen T={T} onUnlock={()=>setLocked(false)}/>}
      {!locked && <>
        <DeadlineAlert T={T}/>
        <header style={{height:40,background:T.sf,borderBottom:`1px solid ${T.bd}`,display:'flex',alignItems:'center',padding:'0 6px',flexShrink:0,zIndex:50}}>
          <div style={{padding:'0 8px',fontSize:11,color:T.ac,fontWeight:'bold',letterSpacing:1,borderRight:`1px solid ${T.bd}`,flexShrink:0,userSelect:'none',cursor:'pointer'}} onClick={()=>setTab('dashboard')}>◈ WOS</div>
          <nav style={{display:'flex',flex:1,overflow:'auto',scrollbarWidth:'none'}}>
            {NAV.map(n=>{
              const active=tab===n.id
              return <span key={n.id} style={{display:'flex',alignItems:'center'}}>
                {n.sep&&<span style={{width:1,height:20,background:T.bd2,flexShrink:0,margin:'0 2px'}}/>}
                <button onClick={()=>setTab(n.id)} title={`${n.label} Alt+${n.key}`}
                  style={{display:'flex',alignItems:'center',gap:3,padding:'0 6px',height:40,border:'none',borderBottom:active?`2px solid ${T.ac}`:'2px solid transparent',background:'none',color:active?T.tx:T.dm,fontSize:9,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap',position:'relative'}}>
                  <span style={{fontSize:10}}>{n.icon}</span><span>{n.label}</span>
                  {n.id==='frist'&&urgentCount>0&&<span style={{position:'absolute',top:5,right:0,background:T.err,color:'#fff',borderRadius:8,fontSize:7,padding:'0 3px',lineHeight:'13px',minWidth:13,textAlign:'center'}}>{urgentCount}</span>}
                </button>
              </span>
            })}
          </nav>
          <div style={{display:'flex',gap:1,borderLeft:`1px solid ${T.bd}`,paddingLeft:4}}>
            {canInstall&&<IB T={T} onClick={install}>📱</IB>}
            <IB T={T} onClick={()=>setTheme(t=>nth[t])}>{thi[theme]}</IB>
            <IB T={T} onClick={()=>{lock();setLocked(true)}} title="Alt+L">🔐</IB>
          </div>
        </header>
        <main style={{flex:1,overflow:'hidden'}}>
          <Suspense fallback={<Spin T={T}/>}>
            {Panel && <Panel T={T} onNavigate={nav}/>}
          </Suspense>
        </main>
        <ToastContainer T={T}/>
      </>}
    </div>
  )
}

const IB=({T,onClick,title,children})=><button onClick={onClick} title={title} style={{width:30,height:30,border:'none',background:'none',color:T.dm,cursor:'pointer',fontSize:14,borderRadius:4}}>{children}</button>
const Spin=({T})=><div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:T.dm,fontSize:10,gap:8}}><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>◌</span>Laden...</div>
