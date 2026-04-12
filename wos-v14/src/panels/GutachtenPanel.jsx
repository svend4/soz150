// ============================================================
// Writing OS — Gutachten-Tracker
// Медицинские заключения: дата, врач, тип, результат,
// Erst- vs. Gegengutachten, аргументы для Widerspruch
// src/panels/GutachtenPanel.jsx
// ============================================================
import { useState, useEffect, useMemo } from 'react'
import { Cases } from '../db'
import { useUI } from '../store'

const GUTACHTEN_TYPES = [
  { id: 'pflegegrad',   icon: '🏥', label: 'Pflegegradgutachten (MDK/Medicproof)', color: '#5a7aaa' },
  { id: 'gdb',          icon: '♿', label: 'GdB-Gutachten (Versorgungsamt)',        color: '#7a5aaa' },
  { id: 'egh_bedarf',   icon: '📊', label: 'Bedarfsermittlung EGH (ITP/BEI)',       color: '#5aaa7a' },
  { id: 'facharzt',     icon: '🩺', label: 'Fachärztliches Attest/Gutachten',       color: '#aa7a5a' },
  { id: 'gegengutachten',icon:'⚖️', label: 'Gegengutachten (privat)',               color: '#cc4422' },
  { id: 'sozialmedizin',icon: '🔬', label: 'Sozialmedizinisches Gutachten',         color: '#5aaaaa' },
  { id: 'sonstiges',    icon: '📎', label: 'Sonstiges',                             color: '#8a8a8a' },
]

const ERGEBNIS_OPTS = [
  { id: 'positiv',    label: '✅ Positiv (für uns)',    color: '#3a8a3a' },
  { id: 'negativ',    label: '❌ Negativ (gegen uns)',  color: '#cc2222' },
  { id: 'teilweise',  label: '⚠️ Teilweise positiv',   color: '#cc7722' },
  { id: 'ausstehend', label: '⏳ Ausstehend',           color: '#666666' },
]

const KEY  = 'wos-gutachten'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)||'[]') } catch { return [] } }
const saveAll = d => localStorage.setItem(KEY, JSON.stringify(d))
let _ID = Date.now(); const nid = () => ++_ID

// Типичные ошибки MDK по типу заключения
const MDK_FEHLER = {
  pflegegrad: [
    'Kurzzeitbeobachtung: MDK-Gutachten basiert auf 30-60 Min. Besuch — nicht repräsentativ',
    'Kognitive Beeinträchtigungen werden oft unterschätzt (Modul 2)',
    'Schmerzen und Erschöpfung zum Zeitpunkt der Begutachtung nicht erfasst',
    'Hilfsmittel und Kompensationsstrategien werden als "selbständig" gewertet',
    'Nachtpflege und zeitlicher Aufwand nicht korrekt dokumentiert',
    'Tages-/Nachtabhängigkeit von Leistungen nicht berücksichtigt',
  ],
  gdb: [
    'Interaktion mehrerer Leiden wird nicht ausreichend berücksichtigt',
    'Psychische Erkrankungen strukturell unterbewertet',
    'Merkzeichen B/H nicht erkannt trotz vorliegender Voraussetzungen',
    'Aktuelle Facharztberichte nicht vollständig ausgewertet',
  ],
  egh_bedarf: [
    'ITP/BEI-Bogen unvollständig ausgefüllt',
    'Wunsch- und Wahlrecht (§ 8 SGB IX) nicht ausreichend berücksichtigt',
    'Selbstbestimmung vs. Fürsorge falsch gewichtet',
    'Stundenbedarfe zu niedrig angesetzt (kein Puffer für Bad days)',
  ],
}

export default function GutachtenPanel({ T }) {
  const [gutachten, setGutachten] = useState(load)
  const [cases,     setCases]     = useState([])
  const [selCase,   setSelCase]   = useState(null)
  const [view,      setView]      = useState('list')  // list | form | detail | compare
  const [editing,   setEditing]   = useState(null)
  const { showToast }             = useUI()

  useEffect(() => { Cases.list().then(list => {
    setCases(list)
    if (list.length) setSelCase(list[0].id)
  })}, [])

  const saveG = (g) => {
    const upd = g.id
      ? gutachten.map(x => x.id === g.id ? g : x)
      : [...gutachten, { ...g, id: nid(), createdAt: Date.now() }]
    setGutachten(upd); saveAll(upd)
    setView('list'); setEditing(null)
    showToast(g.id ? '✅ Aktualisiert' : '✅ Gutachten gespeichert')
  }

  const del = (id) => {
    if (!confirm('Löschen?')) return
    const u = gutachten.filter(g => g.id !== id)
    setGutachten(u); saveAll(u)
    if (view === 'detail') setView('list')
  }

  const caseGs = useMemo(() =>
    selCase ? gutachten.filter(g => g.caseId === selCase) : gutachten,
    [gutachten, selCase])

  // Сравнение Erst- vs Gegengutachten
  const compareData = useMemo(() => {
    const erst  = caseGs.filter(g => g.type !== 'gegengutachten')
    const gegen = caseGs.filter(g => g.type === 'gegengutachten')
    return { erst, gegen }
  }, [caseGs])

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Шапка */}
      <div style={{ padding:'8px 10px', borderBottom:`1px solid ${T.bd}`,
        background:T.sf, flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'flex-start', marginBottom:7 }}>
          <div>
            <div style={{ fontSize:11, color:T.ac }}>🔬 Gutachten-Tracker</div>
            <div style={{ fontSize:8, color:T.dm }}>
              {caseGs.length} Gutachten ·
              <span style={{ color:T.ok, marginLeft:4 }}>
                {caseGs.filter(g=>g.ergebnis==='positiv').length} pos
              </span> ·
              <span style={{ color:T.err, marginLeft:4 }}>
                {caseGs.filter(g=>g.ergebnis==='negativ').length} neg
              </span>
            </div>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {caseGs.length >= 2 && (
              <button onClick={() => setView(v => v==='compare'?'list':'compare')}
                style={sBtn(T, view==='compare')}>⚖️ Vergleich</button>
            )}
            <button onClick={() => {
              setEditing({ type:'pflegegrad', ergebnis:'ausstehend', caseId:selCase })
              setView('form')
            }} style={aBtn(T)}>+ Neu</button>
          </div>
        </div>
        <select value={selCase||''} onChange={e => setSelCase(Number(e.target.value)||null)}
          style={{ width:'100%', ...selS(T) }}>
          <option value="">Alle Akten</option>
          {cases.map(c => <option key={c.id} value={c.id}>{c.aktenzeichen}</option>)}
        </select>
      </div>

      <div style={{ flex:1, overflow:'auto' }}>

        {/* ── LIST ── */}
        {view === 'list' && (
          <div style={{ padding:'8px 10px' }}>
            {caseGs.length === 0 ? (
              <div style={{ textAlign:'center', color:T.dm, fontSize:10, paddingTop:30 }}>
                Noch kein Gutachten erfasst
              </div>
            ) : caseGs.map(g => {
              const gt  = GUTACHTEN_TYPES.find(t => t.id === g.type) || GUTACHTEN_TYPES[6]
              const erg = ERGEBNIS_OPTS.find(e => e.id === g.ergebnis) || ERGEBNIS_OPTS[3]
              return (
                <div key={g.id}
                  onClick={() => { setEditing(g); setView('detail') }}
                  style={{ padding:'9px 11px', marginBottom:6, cursor:'pointer',
                    background:T.sf, border:`1px solid ${T.bd}`,
                    borderLeft:`3px solid ${gt.color}`, borderRadius:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'flex-start', marginBottom:4 }}>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <span style={{ fontSize:16 }}>{gt.icon}</span>
                      <div>
                        <div style={{ fontSize:9, color:T.tx }}>
                          {g.title || gt.label}
                        </div>
                        <div style={{ fontSize:7, color:T.dm }}>
                          {g.gutachter || '—'} · {g.datum || '—'}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize:8, color:erg.color,
                      background:erg.color+'22', border:`1px solid ${erg.color+'44'}`,
                      borderRadius:4, padding:'2px 7px', flexShrink:0, marginLeft:6 }}>
                      {erg.label}
                    </span>
                  </div>
                  {g.ergebnisZahl && (
                    <div style={{ fontSize:8, color:T.ac, marginTop:2 }}>
                      📊 Ergebnis: {g.ergebnisZahl}
                    </div>
                  )}
                  {g.kritik && (
                    <div style={{ fontSize:8, color:T.dm, marginTop:3,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      ⚠️ {g.kritik.slice(0,80)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── COMPARE ── */}
        {view === 'compare' && (
          <div style={{ padding:'10px 12px' }}>
            <div style={{ fontSize:9, color:T.ac, marginBottom:10 }}>
              ⚖️ Erst- vs. Gegengutachten
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {/* Behördengutachten */}
              <div>
                <div style={{ fontSize:8, color:T.dm, marginBottom:5 }}>
                  🏢 Behördengutachten ({compareData.erst.length})
                </div>
                {compareData.erst.map(g => {
                  const gt  = GUTACHTEN_TYPES.find(t => t.id === g.type) || GUTACHTEN_TYPES[6]
                  const erg = ERGEBNIS_OPTS.find(e => e.id === g.ergebnis) || ERGEBNIS_OPTS[3]
                  return (
                    <div key={g.id} style={{ padding:'7px 9px', marginBottom:5,
                      background:T.sf, border:`1px solid ${T.bd}`,
                      borderTop:`2px solid ${erg.color}`, borderRadius:5 }}>
                      <div style={{ fontSize:8, color:T.ac, marginBottom:3 }}>
                        {gt.icon} {g.title || gt.label}
                      </div>
                      <div style={{ fontSize:7, color:T.dm }}>
                        {g.gutachter} · {g.datum}
                      </div>
                      {g.ergebnisZahl && <div style={{ fontSize:9, color:erg.color, marginTop:3 }}>{g.ergebnisZahl}</div>}
                      {g.kritik && <div style={{ fontSize:7, color:T.warn, marginTop:3, lineHeight:1.5 }}>⚠️ {g.kritik.slice(0,120)}</div>}
                    </div>
                  )
                })}
              </div>
              {/* Gegengutachten */}
              <div>
                <div style={{ fontSize:8, color:T.dm, marginBottom:5 }}>
                  ⚖️ Gegengutachten ({compareData.gegen.length})
                </div>
                {compareData.gegen.length === 0 ? (
                  <div style={{ padding:'10px', background:T.sf,
                    border:`1px dashed ${T.bd}`, borderRadius:5,
                    fontSize:8, color:T.dm, textAlign:'center' }}>
                    Kein Gegengutachten erfasst.<br/>
                    + Neu → Typ: Gegengutachten
                  </div>
                ) : compareData.gegen.map(g => {
                  const erg = ERGEBNIS_OPTS.find(e => e.id === g.ergebnis) || ERGEBNIS_OPTS[3]
                  return (
                    <div key={g.id} style={{ padding:'7px 9px', marginBottom:5,
                      background:T.sf, border:`1px solid ${T.bd}`,
                      borderTop:`2px solid ${erg.color}`, borderRadius:5 }}>
                      <div style={{ fontSize:8, color:T.ac, marginBottom:3 }}>
                        ⚖️ {g.title || 'Gegengutachten'}
                      </div>
                      <div style={{ fontSize:7, color:T.dm }}>
                        {g.gutachter} · {g.datum}
                      </div>
                      {g.ergebnisZahl && <div style={{ fontSize:9, color:erg.color, marginTop:3 }}>{g.ergebnisZahl}</div>}
                      {g.fazit && <div style={{ fontSize:7, color:T.tx, marginTop:3, lineHeight:1.5 }}>{g.fazit.slice(0,120)}</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Аргументы для оспаривания */}
            {compareData.erst.length > 0 && (
              <div style={{ marginTop:12, padding:'10px 12px',
                background:T.aiBg, border:`1px solid ${T.aiBd}`, borderRadius:6 }}>
                <div style={{ fontSize:9, color:T.ai, marginBottom:7 }}>
                  💡 Typische Fehler & Angriffspunkte
                </div>
                {compareData.erst.map(g => {
                  const fehler = MDK_FEHLER[g.type] || []
                  if (!fehler.length) return null
                  const gt = GUTACHTEN_TYPES.find(t => t.id === g.type)
                  return (
                    <div key={g.id} style={{ marginBottom:8 }}>
                      <div style={{ fontSize:8, color:T.ac, marginBottom:4 }}>
                        {gt?.icon} {gt?.label}:
                      </div>
                      {fehler.map((f, i) => (
                        <div key={i} style={{ fontSize:8, color:T.dm,
                          padding:'3px 0', borderBottom:`1px solid ${T.bd+'44'}`,
                          lineHeight:1.6 }}>
                          • {f}
                        </div>
                      ))}
                    </div>
                  )
                })}
                <button onClick={() => {
                  const args = compareData.erst.flatMap(g => MDK_FEHLER[g.type]||[])
                  navigator.clipboard.writeText(args.map(a => '• ' + a).join('\n'))
                  showToast('✅ Argumente kopiert')
                }} style={{ width:'100%', marginTop:8, fontSize:9,
                  color:T.ai, background:T.aiBg, border:`1px solid ${T.aiBd}`,
                  borderRadius:4, padding:'5px', cursor:'pointer' }}>
                  📋 Alle Argumente kopieren
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── DETAIL ── */}
        {view === 'detail' && editing && (
          <div style={{ padding:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <button onClick={() => { setView('list'); setEditing(null) }}
                style={{ background:'none', border:'none', color:T.dm, cursor:'pointer' }}>←</button>
              <span style={{ fontSize:11, color:T.tx, flex:1 }}>
                {editing.title || GUTACHTEN_TYPES.find(t=>t.id===editing.type)?.label}
              </span>
              <button onClick={() => setView('form')} style={sBtn(T)}>✎</button>
              <button onClick={() => del(editing.id)}
                style={{ fontSize:12, color:T.err, background:'none', border:'none', cursor:'pointer' }}>🗑</button>
            </div>

            {[
              ['Typ',       GUTACHTEN_TYPES.find(t=>t.id===editing.type)?.label || '—'],
              ['Gutachter', editing.gutachter || '—'],
              ['Institution',editing.institution || '—'],
              ['Datum',     editing.datum || '—'],
              ['Ergebnis',  ERGEBNIS_OPTS.find(e=>e.id===editing.ergebnis)?.label || '—'],
              ['Zahlenwert',editing.ergebnisZahl || '—'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', marginBottom:6, gap:10 }}>
                <span style={{ fontSize:8, color:T.dm, width:80, flexShrink:0 }}>{k}:</span>
                <span style={{ fontSize:9, color:T.tx }}>{v}</span>
              </div>
            ))}

            {editing.kritik && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:8, color:T.warn, marginBottom:3 }}>⚠️ Kritik am Gutachten:</div>
                <div style={{ fontSize:9, color:T.tx, lineHeight:1.7,
                  background:T.sf, border:`1px solid ${T.bd}`, borderRadius:5,
                  padding:'8px 10px', whiteSpace:'pre-wrap' }}>
                  {editing.kritik}
                </div>
              </div>
            )}

            {editing.fazit && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:8, color:T.ac, marginBottom:3 }}>📋 Fazit / Zusammenfassung:</div>
                <div style={{ fontSize:9, color:T.tx, lineHeight:1.7,
                  background:T.sf, border:`1px solid ${T.bd}`, borderRadius:5,
                  padding:'8px 10px', whiteSpace:'pre-wrap' }}>
                  {editing.fazit}
                </div>
              </div>
            )}

            {/* Стандартные аргументы */}
            {MDK_FEHLER[editing.type]?.length > 0 && (
              <div style={{ marginTop:12, padding:'8px 10px',
                background:T.aiBg, border:`1px solid ${T.aiBd}`, borderRadius:5 }}>
                <div style={{ fontSize:8, color:T.ai, marginBottom:5 }}>
                  💡 Typische Fehler bei diesem Gutachten-Typ:
                </div>
                {MDK_FEHLER[editing.type].map((f, i) => (
                  <div key={i} style={{ fontSize:8, color:T.dm,
                    padding:'3px 0', borderBottom:`1px solid ${T.bd+'44'}`, lineHeight:1.6 }}>
                    • {f}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FORM ── */}
        {view === 'form' && editing && (
          <GutachtenForm T={T} initial={editing} cases={cases}
            onSave={saveG}
            onCancel={() => { setView(editing.id ? 'detail' : 'list') }} />
        )}
      </div>
    </div>
  )
}

function GutachtenForm({ T, initial, cases, onSave, onCancel }) {
  const [form, setForm] = useState({ ergebnis:'ausstehend', ...initial })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ padding:12 }}>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
        <button onClick={onCancel}
          style={{ background:'none', border:'none', color:T.dm, cursor:'pointer' }}>←</button>
        <span style={{ fontSize:10, color:T.ac }}>
          {form.id ? '✎ Bearbeiten' : '+ Neues Gutachten'}
        </span>
      </div>

      {/* Тип */}
      <div style={{ marginBottom:10 }}>
        <label style={lbl(T)}>Gutachten-Typ</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {GUTACHTEN_TYPES.map(gt => (
            <button key={gt.id} onClick={() => set('type', gt.id)}
              style={{ fontSize:8, padding:'4px 8px', cursor:'pointer',
                color: form.type===gt.id ? gt.color : T.dm,
                background: form.type===gt.id ? gt.color+'22' : T.sf,
                border:`1px solid ${form.type===gt.id ? gt.color+'55' : T.bd}`,
                borderRadius:4 }}>
              {gt.icon} {gt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ergebnis */}
      <div style={{ marginBottom:10 }}>
        <label style={lbl(T)}>Ergebnis</label>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {ERGEBNIS_OPTS.map(e => (
            <button key={e.id} onClick={() => set('ergebnis', e.id)}
              style={{ fontSize:8, padding:'4px 9px', cursor:'pointer',
                color: form.ergebnis===e.id ? e.color : T.dm,
                background: form.ergebnis===e.id ? e.color+'22' : T.sf,
                border:`1px solid ${form.ergebnis===e.id ? e.color+'44' : T.bd}`,
                borderRadius:4 }}>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {[
        ['title',        'Bezeichnung (optional)',       'text'],
        ['gutachter',    'Gutachter / Arzt',             'text'],
        ['institution',  'Institution (MDK, Facharzt…)', 'text'],
        ['datum',        'Datum des Gutachtens',         'date'],
        ['ergebnisZahl', 'Zahlenwert (z.B. PG 2, GdB 50)','text'],
      ].map(([k,l,type]) => (
        <div key={k} style={{ marginBottom:7 }}>
          <label style={lbl(T)}>{l}</label>
          <input type={type} value={form[k]||''} onChange={e => set(k, e.target.value)}
            style={inp(T)} />
        </div>
      ))}

      <div style={{ marginBottom:7 }}>
        <label style={lbl(T)}>Kritik / Fehler im Gutachten</label>
        <textarea value={form.kritik||''} onChange={e => set('kritik', e.target.value)}
          rows={3} placeholder="z.B. Beobachtungszeit nur 30 Min., Nachtpflege nicht erfasst..."
          style={{ ...inp(T), resize:'vertical', fontFamily:'inherit', padding:'5px 7px', lineHeight:1.5 }} />
      </div>

      <div style={{ marginBottom:7 }}>
        <label style={lbl(T)}>Akte</label>
        <select value={form.caseId||''} onChange={e => set('caseId', Number(e.target.value)||null)}
          style={inp(T)}>
          <option value="">— Keine —</option>
          {cases.map(c => <option key={c.id} value={c.id}>{c.aktenzeichen}</option>)}
        </select>
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={lbl(T)}>Fazit / Zusammenfassung</label>
        <textarea value={form.fazit||''} onChange={e => set('fazit', e.target.value)}
          rows={2} style={{ ...inp(T), resize:'vertical', fontFamily:'inherit', padding:'5px 7px', lineHeight:1.5 }} />
      </div>

      <div style={{ display:'flex', gap:6 }}>
        <button onClick={onCancel}
          style={{ flex:1, padding:8, color:T.dm, background:T.sf2,
            border:`1px solid ${T.bd}`, borderRadius:5, cursor:'pointer', fontSize:10 }}>
          Abbrechen
        </button>
        <button onClick={() => form.type && onSave(form)} disabled={!form.type}
          style={{ flex:2, padding:8, color:T.ai, background:T.aiBg,
            border:`1px solid ${T.aiBd}`, borderRadius:5, cursor:'pointer',
            fontSize:10, opacity:form.type?1:0.4 }}>
          ✓ Speichern
        </button>
      </div>
    </div>
  )
}

const lbl  = T => ({ fontSize:8, color:T.dm, display:'block', marginBottom:2 })
const inp  = T => ({ width:'100%', background:T.ip, border:`1px solid ${T.bd2}`, borderRadius:3, padding:'5px 7px', color:T.tx, fontSize:10, outline:'none', boxSizing:'border-box' })
const aBtn = T => ({ fontSize:9, color:T.ai, background:T.aiBg, border:`1px solid ${T.aiBd}`, borderRadius:4, padding:'4px 10px', cursor:'pointer' })
const sBtn = (T, a) => ({ fontSize:9, color:a?T.ac:T.dm, background:a?T.ac+'20':T.sf2, border:`1px solid ${a?T.ac+'44':T.bd}`, borderRadius:4, padding:'4px 9px', cursor:'pointer' })
const selS = T => ({ background:T.ip, border:`1px solid ${T.bd2}`, borderRadius:4, padding:'4px 7px', color:T.tx, fontSize:9, outline:'none' })
