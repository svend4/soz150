// ============================================================
// Writing OS — Brief-Generator
// AI schreibt professionelle Behördenbriefe in jedem Stil
// src/panels/BriefGeneratorPanel.jsx
// ============================================================
import { useState, useEffect } from 'react'
import { Cases, Documents }    from '../db'
import { useUI }               from '../store'

// Типы писем
const BRIEF_TYPES = [
  {
    id: 'sachstand',   icon: '📋', label: 'Sachstandsanfrage',
    color: '#5a7aaa',
    hint: 'Nach aktuellem Stand des Antrags/Verfahrens fragen',
    basis: '§ 25 SGB X (Akteneinsicht), § 17 SGB I (Auskunftspflicht)',
    prompt: 'Schreibe eine formelle Sachstandsanfrage nach aktuellem Bearbeitungsstand des Antrags.',
  },
  {
    id: 'akteneinsicht', icon: '📂', label: 'Antrag auf Akteneinsicht',
    color: '#7a5aaa',
    hint: 'Einsicht in die Verfahrensakte beantragen',
    basis: '§ 25 SGB X',
    prompt: 'Schreibe einen Antrag auf Akteneinsicht gemäß § 25 SGB X.',
  },
  {
    id: 'mahnung',     icon: '⚠️', label: 'Mahnung / Untätigkeit',
    color: '#cc7722',
    hint: 'Behörde zur Bearbeitung mahnen (§ 88 SGG Vorstufe)',
    basis: '§ 88 SGG (Untätigkeitsklage nach 6 Monaten)',
    prompt: 'Schreibe eine bestimmte Mahnung wegen Untätigkeit der Behörde und weise auf § 88 SGG (Untätigkeitsklage) hin.',
  },
  {
    id: 'beschwerde',  icon: '📢', label: 'Dienstaufsichtsbeschwerde',
    color: '#aa3322',
    hint: 'Beschwerde über rechtswidrige Behandlung',
    basis: 'Allgemeines Beschwerderecht',
    prompt: 'Schreibe eine sachliche aber bestimmte Dienstaufsichtsbeschwerde wegen rechtswidrigem/fehlerhaftem Verhalten der Behörde.',
  },
  {
    id: 'erinnerung',  icon: '🔔', label: 'Erinnerung / Nachfrage',
    color: '#5aaa7a',
    hint: 'Freundliche Nachfrage nach Stand',
    basis: '',
    prompt: 'Schreibe eine freundliche aber bestimmte Erinnerung/Nachfrage.',
  },
  {
    id: 'zielvereinbarung', icon: '🤝', label: 'Zielvereinbarung anfordern',
    color: '#5aaaaa',
    hint: 'Aufforderung zur Zielvereinbarung (§ 30 SGB IX für PB)',
    basis: '§ 30 SGB IX',
    prompt: 'Schreibe eine Aufforderung zur Aufnahme von Verhandlungen über die Zielvereinbarung gemäß § 30 SGB IX für das Persönliche Budget.',
  },
  {
    id: 'widerspruch_begruendung', icon: '⚖️', label: 'Widerspruchsbegründung nachreichen',
    color: '#aa5522',
    hint: 'Begründung zum bereits eingelegten Widerspruch nachreichen',
    basis: '§ 84 SGG',
    prompt: 'Schreibe ein Schreiben zur Nachreichung/Ergänzung der Widerspruchsbegründung.',
  },
  {
    id: 'kostenerstattung', icon: '💶', label: 'Kostenerstattung beantragen',
    color: '#7aaa5a',
    hint: 'Erstattung von Verfahrenskosten beantragen',
    basis: '§ 63 SGB X',
    prompt: 'Schreibe einen Antrag auf Kostenerstattung nach § 63 SGB X.',
  },
]

// Тон письма
const TONE_OPTIONS = [
  { id: 'formell',   label: 'Formell',   desc: 'Höflich, sachlich, korrekt' },
  { id: 'bestimmt',  label: 'Bestimmt',  desc: 'Klar, fordernd, aber höflich' },
  { id: 'dringend',  label: 'Dringend',  desc: 'Mit Nachdruck, Frist setzend' },
  { id: 'freundlich',label: 'Freundlich',desc: 'Kooperativ, lösungsorientiert' },
]

const HIST_KEY = 'wos-briefe'
const loadHist = () => { try { return JSON.parse(localStorage.getItem(HIST_KEY)||'[]') } catch { return [] } }
const saveHist = d => localStorage.setItem(HIST_KEY, JSON.stringify(d.slice(0, 30)))

export default function BriefGeneratorPanel({ T }) {
  const [cases,    setCases]   = useState([])
  const [selCase,  setSelCase] = useState(null)
  const [selType,  setSelType] = useState(BRIEF_TYPES[0])
  const [tone,     setTone]    = useState('formell')
  const [context,  setContext] = useState('')
  const [result,   setResult]  = useState('')
  const [loading,  setLoading] = useState(false)
  const [hist,     setHist]    = useState(loadHist)
  const [view,     setView]    = useState('form') // form | result | history
  const [formData, setFormData]= useState({})
  const { showToast }          = useUI()

  useEffect(() => { Cases.list().then(list => {
    setCases(list)
    if (list.length) setSelCase(list[0].id)
  })}, [])

  const setF = (k, v) => setFormData(f => ({ ...f, [k]: v }))

  // Загрузить данные дела из localStorage
  const getCaseContext = (caseId) => {
    if (!caseId) return ''
    const kase = cases.find(c => c.id === caseId)
    const fd = (() => { try { return JSON.parse(localStorage.getItem('wos-falldaten')||'{}')[caseId]||{} } catch { return {} } })()
    return [
      kase?.aktenzeichen ? `Az.: ${kase.aktenzeichen}` : '',
      fd.klaegerName ? `Kläger: ${fd.klaegerName}` : '',
      fd.behoerde    ? `Behörde: ${fd.behoerde}`   : '',
      fd.behoerdeSB  ? `Sachbearbeiter: ${fd.behoerdeSB}` : '',
      fd.streitgegenstand ? `Gegenstand: ${fd.streitgegenstand}` : '',
    ].filter(Boolean).join('\n')
  }

  const generate = async () => {
    setLoading(true); setResult('')
    const kase = cases.find(c => c.id === selCase)
    const toneDesc = TONE_OPTIONS.find(t => t.id === tone)?.desc || ''
    const caseCtx = getCaseContext(selCase)

    const systemPrompt = `Du bist ein Experte für deutsches Sozialrecht und professionelle Behördenkommunikation.
Schreibe einen vollständigen, sofort verwendbaren Brief auf Deutsch.

Ton: ${tone} — ${toneDesc}
Format: DIN 5008, vollständiger Briefkopf

Pflichtbestandteile:
- Absenderblock (Platzhalter [Name], [Adresse])
- Empfängerblock
- Datum: ${new Date().toLocaleDateString('de-DE')}
- Betreff-Zeile (fett/BETREFF:)
- Anrede: "Sehr geehrte Damen und Herren,"
- Brieftext mit korrekten §§-Zitaten
- Schlussparagraph mit Bitte um Rückmeldung
- "Mit freundlichen Grüßen" + Platzhalter

Rechtliche Grundlage für diesen Brief: ${selType.basis}
${caseCtx ? '\nFall-Kontext:\n' + caseCtx : ''}
${context ? '\nZusätzliche Angaben:\n' + context : ''}
${formData.deadline ? '\nFrist setzen bis: ' + formData.deadline : ''}
${formData.antragDate ? '\nAntrag gestellt am: ' + formData.antragDate : ''}
${formData.bescheidDate ? '\nBescheid erhalten am: ' + formData.bescheidDate : ''}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: 'user', content: selType.prompt }],
        })
      })
      if (!res.ok) throw new Error('API ' + res.status)
      const data = await res.json()
      const text = data.content[0]?.text || ''
      setResult(text)

      // Сохранить в историю
      const entry = {
        id: Date.now(), type: selType.id, tone, caseId: selCase,
        text, label: selType.label, az: kase?.aktenzeichen || '',
      }
      const h = [entry, ...hist]
      setHist(h); saveHist(h)
      setView('result')
    } catch (e) {
      showToast('❌ ' + e.message, 'err')
    }
    setLoading(false)
  }

  const saveToDb = async () => {
    if (!result) return
    const kase = cases.find(c => c.id === selCase)
    await Documents.save({
      caseId: selCase,
      type: 'schreiben',
      title: selType.label + (kase ? ' — ' + kase.aktenzeichen : ''),
      content: result,
    })
    showToast('✅ Brief in Dokumente gespeichert')
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Шапка */}
      <div style={{ padding:'8px 10px', borderBottom:`1px solid ${T.bd}`,
        background:T.sf, flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'flex-start', marginBottom:7 }}>
          <div style={{ fontSize:11, color:T.ac }}>✉️ Brief-Generator</div>
          <div style={{ display:'flex', gap:4 }}>
            {['form','result','history'].map(v => (
              <button key={v} onClick={() => setView(v)} style={fBtn(T, view===v)}>
                {v==='form' ? '✎ Eingabe' : v==='result' ? '📄 Ergebnis' : `📚 Verlauf (${hist.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto' }}>

        {/* ── FORM ── */}
        {view === 'form' && (
          <div style={{ padding:'10px 12px' }}>

            {/* Тип письма */}
            <div style={{ marginBottom:10 }}>
              <L T={T}>Briefart</L>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {BRIEF_TYPES.map(bt => (
                  <button key={bt.id} onClick={() => setSelType(bt)} title={bt.hint}
                    style={{ fontSize:8, padding:'4px 9px', cursor:'pointer',
                      color: selType.id===bt.id ? bt.color : T.dm,
                      background: selType.id===bt.id ? bt.color+'22' : T.sf,
                      border:`1px solid ${selType.id===bt.id ? bt.color+'55' : T.bd}`,
                      borderRadius:4 }}>
                    {bt.icon} {bt.label}
                  </button>
                ))}
              </div>
              {selType.basis && (
                <div style={{ fontSize:7, color:T.dm, marginTop:3 }}>
                  📜 {selType.basis}
                </div>
              )}
            </div>

            {/* Тон */}
            <div style={{ marginBottom:10 }}>
              <L T={T}>Ton / Stil</L>
              <div style={{ display:'flex', gap:4 }}>
                {TONE_OPTIONS.map(to => (
                  <button key={to.id} onClick={() => setTone(to.id)} title={to.desc}
                    style={{ flex:1, fontSize:8, padding:'4px 6px', cursor:'pointer',
                      textAlign:'center',
                      color: tone===to.id ? T.ac : T.dm,
                      background: tone===to.id ? T.ac+'20' : T.sf,
                      border:`1px solid ${tone===to.id ? T.ac+'44' : T.bd}`,
                      borderRadius:4 }}>
                    {to.label}
                    <div style={{ fontSize:6, marginTop:1, opacity:0.7 }}>{to.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Дело */}
            <div style={{ marginBottom:7 }}>
              <L T={T}>Akte</L>
              <select value={selCase||''} onChange={e => setSelCase(Number(e.target.value)||null)}
                style={inp(T)}>
                <option value="">— Keine Akte —</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.aktenzeichen}</option>)}
              </select>
            </div>

            {/* Доп. поля зависят от типа */}
            {selType.id === 'mahnung' && (
              <div style={{ marginBottom:7 }}>
                <L T={T}>Frist setzen bis (Datum)</L>
                <input type="date" value={formData.deadline||''} onChange={e => setF('deadline', e.target.value)} style={inp(T)} />
              </div>
            )}
            {['sachstand','akteneinsicht','mahnung'].includes(selType.id) && (
              <div style={{ marginBottom:7 }}>
                <L T={T}>Antrag gestellt am</L>
                <input type="date" value={formData.antragDate||''} onChange={e => setF('antragDate', e.target.value)} style={inp(T)} />
              </div>
            )}
            {['widerspruch_begruendung'].includes(selType.id) && (
              <div style={{ marginBottom:7 }}>
                <L T={T}>Bescheid-Datum</L>
                <input type="date" value={formData.bescheidDate||''} onChange={e => setF('bescheidDate', e.target.value)} style={inp(T)} />
              </div>
            )}

            {/* Свободный контекст */}
            <div style={{ marginBottom:12 }}>
              <L T={T}>Zusätzliche Angaben / Sachverhalt</L>
              <textarea value={context} onChange={e => setContext(e.target.value)}
                rows={4}
                placeholder={selType.hint + '\n\nBeispiel: Antrag auf PB 40h/Woche gestellt am 10.01.2025, bisher keine Rückmeldung...'}
                style={{ width:'100%', background:T.ip, border:`1px solid ${T.bd2}`,
                  borderRadius:4, padding:'7px 9px', color:T.tx, fontSize:9,
                  resize:'vertical', fontFamily:'inherit', outline:'none', lineHeight:1.6 }} />
            </div>

            <button onClick={generate} disabled={loading}
              style={{ width:'100%', padding:'10px', fontSize:11,
                color: loading ? T.dm : T.ai, background: loading ? T.sf2 : T.aiBg,
                border:`1px solid ${loading ? T.bd : T.aiBd}`,
                borderRadius:6, cursor: loading ? 'default' : 'pointer' }}>
              {loading
                ? <><span style={{ animation:'spin 1s linear infinite', display:'inline-block', marginRight:6 }}>⟳</span>Generiere Brief...</>
                : `✉️ ${selType.label} generieren`}
            </button>
          </div>
        )}

        {/* ── RESULT ── */}
        {view === 'result' && (
          <div style={{ padding:'10px 12px' }}>
            {!result ? (
              <div style={{ textAlign:'center', color:T.dm, fontSize:10, paddingTop:30 }}>
                Noch kein Brief generiert — ✎ Eingabe ausfüllen
              </div>
            ) : (
              <>
                <div style={{ display:'flex', gap:5, marginBottom:8 }}>
                  <button onClick={() => { navigator.clipboard.writeText(result); showToast('✅ Kopiert') }}
                    style={aBtn(T)}>📋 Kopieren</button>
                  <button onClick={saveToDb} style={sBtn(T)}>💾 In Dokumente speichern</button>
                </div>
                <textarea value={result} onChange={e => setResult(e.target.value)}
                  style={{ width:'100%', height:'calc(100vh - 220px)',
                    background:T.sf, border:`1px solid ${T.bd}`,
                    borderRadius:6, padding:'12px 14px', color:T.tx,
                    fontSize:9, fontFamily:"'Courier New', monospace",
                    lineHeight:1.9, resize:'none', outline:'none',
                    boxSizing:'border-box' }} />
              </>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {view === 'history' && (
          <div style={{ padding:'8px 10px' }}>
            {hist.length === 0 ? (
              <div style={{ textAlign:'center', color:T.dm, fontSize:10, paddingTop:30 }}>
                Noch keine gespeicherten Briefe
              </div>
            ) : hist.map(h => {
              const bt = BRIEF_TYPES.find(t => t.id === h.type) || BRIEF_TYPES[0]
              return (
                <div key={h.id}
                  onClick={() => { setResult(h.text); setView('result') }}
                  style={{ padding:'8px 10px', marginBottom:5, cursor:'pointer',
                    background:T.sf, border:`1px solid ${T.bd}`,
                    borderLeft:`3px solid ${bt.color}`, borderRadius:5 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div style={{ fontSize:9, color:T.tx }}>
                      {bt.icon} {h.label}
                    </div>
                    <button onClick={e => { e.stopPropagation(); const u=hist.filter(x=>x.id!==h.id); setHist(u); saveHist(u) }}
                      style={{ fontSize:10, color:T.err, background:'none', border:'none', cursor:'pointer' }}>✕</button>
                  </div>
                  <div style={{ fontSize:8, color:T.dm }}>
                    {h.az || '—'} · {h.tone} · {new Date(h.id).toLocaleDateString('de-DE')}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const L   = ({T, children}) => <label style={{ fontSize:8, color:T.dm, display:'block', marginBottom:3 }}>{children}</label>
const inp = T => ({ width:'100%', background:T.ip, border:`1px solid ${T.bd2}`, borderRadius:3, padding:'5px 7px', color:T.tx, fontSize:10, outline:'none', boxSizing:'border-box' })
const fBtn= (T,a) => ({ fontSize:8, padding:'3px 8px', cursor:'pointer', borderRadius:3, color:a?T.ac:T.dm, background:a?T.ac+'20':'none', border:`1px solid ${a?T.ac+'44':T.bd}` })
const aBtn= T => ({ fontSize:9, color:T.ai, background:T.aiBg, border:`1px solid ${T.aiBd}`, borderRadius:4, padding:'5px 10px', cursor:'pointer' })
const sBtn= T => ({ fontSize:9, color:T.dm, background:T.sf2, border:`1px solid ${T.bd}`, borderRadius:4, padding:'5px 10px', cursor:'pointer' })
