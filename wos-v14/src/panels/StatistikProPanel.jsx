// ============================================================
// Writing OS — Statistik Pro
// Расширенная аналитика: Recharts, KPIs, временные тренды
// src/panels/StatistikProPanel.jsx
// ============================================================
import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  FunnelChart, Funnel, LabelList,
} from 'recharts'
import { Cases, Documents } from '../db'
import { useUI }             from '../store'

const COLORS = ['#5a7aaa','#7a5aaa','#5aaa7a','#aa7a5a','#5aaaaa','#aaa05a','#aa7aaa','#8a8a8a']

export default function StatistikProPanel({ T }) {
  const [cases,    setCases]    = useState([])
  const [docs,     setDocs]     = useState([])
  const [section,  setSection]  = useState('overview') // overview | cases | budget | timeline | fristen

  useEffect(() => {
    Cases.list().then(setCases)
    Documents.list().then(setDocs)
  }, [])

  // ── Данные из всех хранилищ ──────────────────────────────
  const raw = useMemo(() => {
    const fristen    = tryParse('wos-fristen',    [])
    const termine    = tryParse('wos-termine',    [])
    const todos      = tryParse('wos-todos',      {})
    const korr       = tryParse('wos-korrespondenz',[])
    const antraege   = tryParse('wos-antraege',   [])
    const haushalt   = tryParse('wos-haushalt',   [])
    const gutachten  = tryParse('wos-gutachten',  [])
    const rechtsmitt = tryParse('wos-rechtsmittel',[])
    return { fristen, termine, todos, korr, antraege, haushalt, gutachten, rechtsmitt }
  }, [cases, docs])

  // ── KPIs ────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const allTodos = Object.values(raw.todos).flat()
    const urgentFristen = raw.fristen.filter(f => {
      const d = Math.ceil((new Date(f.ende) - new Date()) / 86400000)
      return d >= 0 && d <= 7
    })
    const bewilligte = raw.antraege.filter(a => a.stage === 'bewilligt').length
    const abgelehnte = raw.antraege.filter(a => a.stage === 'abgelehnt').length
    const success    = bewilligte + abgelehnte > 0
      ? Math.round(bewilligte / (bewilligte + abgelehnte) * 100) : null
    const totalAusg  = raw.haushalt.reduce((s, h) => s + Number(h.amount||0), 0)
    const erstattbar = raw.haushalt.filter(h =>
      ['fahrt','porto','kopien','attest','gutachten'].includes(h.category)
    ).reduce((s, h) => s + Number(h.amount||0), 0)

    return {
      activeCases:   cases.filter(c => c.status !== 'abgeschlossen').length,
      totalDocs:     docs.length,
      urgentFristen: urgentFristen.length,
      openTodos:     allTodos.filter(t => !t.done).length,
      totalAntraege: raw.antraege.length,
      successRate:   success,
      totalAusgaben: totalAusg,
      erstattbar,
      openKorr:      raw.korr.filter(k => k.status === 'warten').length,
      gutachtenNeg:  raw.gutachten.filter(g => g.ergebnis === 'negativ').length,
    }
  }, [raw, cases, docs])

  // ── Данные для диаграмм ──────────────────────────────────

  // 1. Документы по типу
  const docsByType = useMemo(() => {
    const map = {}
    docs.forEach(d => { map[d.type||'sonstiges'] = (map[d.type||'sonstiges']||0) + 1 })
    return Object.entries(map)
      .map(([type, count]) => ({ type, count }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 8)
  }, [docs])

  // 2. Воронка дел по статусам
  const antraegeByStage = useMemo(() => {
    const ORDER = ['antrag','bearbeitung','bescheid','widerspruch','wbescheid','klage','urteil','bewilligt']
    const map = {}
    raw.antraege.forEach(a => { map[a.stage||'antrag'] = (map[a.stage||'antrag']||0) + 1 })
    return ORDER.filter(s => map[s]).map(s => ({ name: s, value: map[s] }))
  }, [raw.antraege])

  // 3. Расходы по месяцам
  const ausgabenByMonth = useMemo(() => {
    const map = {}
    raw.haushalt.forEach(h => {
      if (!h.date) return
      const m = h.date.slice(0,7)
      map[m] = (map[m]||0) + Number(h.amount||0)
    })
    return Object.entries(map)
      .sort(([a],[b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, betrag]) => ({ month: month.slice(5), betrag: Math.round(betrag*100)/100 }))
  }, [raw.haushalt])

  // 4. Срочность фристов
  const fristenByUrgency = useMemo(() => {
    const now = new Date()
    const cats = [
      { name: '🔴 ≤3 Tage',  count: 0, color: '#cc2222' },
      { name: '🟠 ≤7 Tage',  count: 0, color: '#cc7722' },
      { name: '🟡 ≤14 Tage', count: 0, color: '#aaaa22' },
      { name: '🟢 >14 Tage', count: 0, color: '#3a8a3a' },
      { name: '⚫ Abgelaufen',count: 0, color: '#444444' },
    ]
    raw.fristen.forEach(f => {
      const d = Math.ceil((new Date(f.ende) - now) / 86400000)
      if (d < 0)      cats[4].count++
      else if (d <= 3) cats[0].count++
      else if (d <= 7) cats[1].count++
      else if (d <= 14)cats[2].count++
      else             cats[3].count++
    })
    return cats.filter(c => c.count > 0)
  }, [raw.fristen])

  // 5. Корреспонденция по каналам
  const korrByChannel = useMemo(() => {
    const map = {}
    raw.korr.forEach(k => { map[k.channel||'sonstig'] = (map[k.channel||'sonstig']||0) + 1 })
    return Object.entries(map).map(([k, v]) => ({ name: k, value: v }))
  }, [raw.korr])

  // 6. Документы по месяцам (активность)
  const docActivity = useMemo(() => {
    const map = {}
    docs.forEach(d => {
      if (!d.createdAt) return
      const m = new Date(d.createdAt).toISOString().slice(0,7)
      map[m] = (map[m]||0) + 1
    })
    return Object.entries(map)
      .sort(([a],[b]) => a.localeCompare(b))
      .slice(-8)
      .map(([month, count]) => ({ month: month.slice(5), count }))
  }, [docs])

  const SECTIONS = [
    { id:'overview', label:'📊 Übersicht' },
    { id:'cases',    label:'⚖️ Verfahren' },
    { id:'budget',   label:'💶 Budget' },
    { id:'timeline', label:'📅 Aktivität' },
    { id:'fristen',  label:'⏱ Fristen' },
  ]

  const CT = { background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 6, padding: '6px 9px', fontSize: 8, color: T.dm }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Шапка */}
      <div style={{ padding:'8px 10px', borderBottom:`1px solid ${T.bd}`,
        background:T.sf, flexShrink:0 }}>
        <div style={{ fontSize:11, color:T.ac, marginBottom:7 }}>📈 Statistik Pro</div>
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={fBtn(T, section===s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'10px 12px' }}>

        {/* ── ÜBERSICHT ── */}
        {section === 'overview' && (
          <>
            {/* KPI-карточки */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:14 }}>
              {[
                { label:'Aktive Fälle',       val: kpis.activeCases,   color: T.ac,   icon:'⚖️' },
                { label:'Dokumente',           val: kpis.totalDocs,     color: T.ac,   icon:'📄' },
                { label:'Fristen ≤7 Tage',    val: kpis.urgentFristen, color: kpis.urgentFristen>0?T.err:T.ok, icon:'⏱' },
                { label:'Offene Aufgaben',     val: kpis.openTodos,     color: T.warn, icon:'✅' },
                { label:'Erfolgsquote',        val: kpis.successRate != null ? kpis.successRate+'%' : '—', color: T.ok, icon:'🏆' },
                { label:'Ausgaben gesamt',     val: kpis.totalAusgaben.toFixed(0)+' €', color: T.ac, icon:'💶' },
                { label:'Erstattungsfähig',    val: kpis.erstattbar.toFixed(0)+' €', color: T.ok, icon:'↩️' },
                { label:'Korr. ausstehend',    val: kpis.openKorr,      color: kpis.openKorr>0?T.warn:T.ok, icon:'📬' },
                { label:'Gutachten negativ',   val: kpis.gutachtenNeg,  color: kpis.gutachtenNeg>0?T.err:T.ok, icon:'🔬' },
              ].map((k, i) => (
                <div key={i} style={{ padding:'8px 9px', background:T.sf,
                  border:`1px solid ${T.bd}`, borderTop:`2px solid ${k.color}`,
                  borderRadius:5, textAlign:'center' }}>
                  <div style={{ fontSize:14, marginBottom:3 }}>{k.icon}</div>
                  <div style={{ fontSize:13, fontWeight:'bold', color:k.color }}>{k.val}</div>
                  <div style={{ fontSize:7, color:T.dm, marginTop:2 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Документы по типу */}
            {docsByType.length > 0 && (
              <ChartCard T={T} title="📄 Dokumente nach Typ">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={docsByType} margin={{top:5,right:5,bottom:25,left:5}}>
                    <XAxis dataKey="type" tick={{ fill:T.dm, fontSize:7 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fill:T.dm, fontSize:8 }} />
                    <Tooltip contentStyle={CT} />
                    <Bar dataKey="count" fill={T.ac} radius={[2,2,0,0]}>
                      {docsByType.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </>
        )}

        {/* ── VERFAHREN ── */}
        {section === 'cases' && (
          <>
            {antraegeByStage.length > 0 && (
              <ChartCard T={T} title="📑 Anträge nach Verfahrensstand">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={antraegeByStage} layout="vertical"
                    margin={{top:5,right:20,bottom:5,left:60}}>
                    <XAxis type="number" tick={{ fill:T.dm, fontSize:8 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill:T.dm, fontSize:8 }} />
                    <Tooltip contentStyle={CT} />
                    <Bar dataKey="value" fill={T.ac} radius={[0,2,2,0]}>
                      {antraegeByStage.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {korrByChannel.length > 0 && (
              <ChartCard T={T} title="📬 Korrespondenz nach Kanal">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={korrByChannel} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={60}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ stroke: T.dm }}>
                      {korrByChannel.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={CT} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </>
        )}

        {/* ── BUDGET ── */}
        {section === 'budget' && (
          <>
            {ausgabenByMonth.length > 0 ? (
              <ChartCard T={T} title="💶 Ausgaben nach Monat (€)">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={ausgabenByMonth} margin={{top:5,right:10,bottom:5,left:5}}>
                    <XAxis dataKey="month" tick={{ fill:T.dm, fontSize:9 }} />
                    <YAxis tick={{ fill:T.dm, fontSize:8 }} />
                    <Tooltip contentStyle={CT} formatter={v => v.toFixed(2)+' €'} />
                    <Bar dataKey="betrag" fill={T.ac} radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : (
              <Empty T={T} msg="Keine Ausgaben erfasst" />
            )}

            {/* Сводка */}
            <div style={{ padding:'10px 12px', background:T.sf,
              border:`1px solid ${T.bd}`, borderRadius:6, marginTop:8 }}>
              <div style={{ fontSize:9, color:T.ac, marginBottom:8 }}>Ausgaben-Zusammenfassung</div>
              {[
                ['Gesamt',           kpis.totalAusgaben.toFixed(2)+' €', T.tx],
                ['Erstattungsfähig §63 SGB X', kpis.erstattbar.toFixed(2)+' €', T.ok],
                ['Nicht erstattbar', (kpis.totalAusgaben - kpis.erstattbar).toFixed(2)+' €', T.dm],
              ].map(([k,v,color]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0',
                  borderBottom:`1px solid ${T.bd}` }}>
                  <span style={{ fontSize:9, color:T.dm }}>{k}</span>
                  <span style={{ fontSize:10, color, fontWeight:'bold' }}>{v}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── AKTIVITÄT ── */}
        {section === 'timeline' && (
          <>
            {docActivity.length > 0 ? (
              <ChartCard T={T} title="📅 Dokument-Aktivität (letzte 8 Monate)">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={docActivity} margin={{top:5,right:10,bottom:5,left:5}}>
                    <XAxis dataKey="month" tick={{ fill:T.dm, fontSize:9 }} />
                    <YAxis tick={{ fill:T.dm, fontSize:8 }} />
                    <Tooltip contentStyle={CT} />
                    <Line type="monotone" dataKey="count" stroke={T.ac}
                      strokeWidth={2} dot={{ fill:T.ac, r:3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : <Empty T={T} msg="Keine Dokumente vorhanden" />}
          </>
        )}

        {/* ── FRISTEN ── */}
        {section === 'fristen' && (
          <>
            {fristenByUrgency.length > 0 ? (
              <ChartCard T={T} title="⏱ Fristen nach Dringlichkeit">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={fristenByUrgency} dataKey="count" nameKey="name"
                      cx="50%" cy="50%" outerRadius={65}
                      label={({ name, count }) => `${name}: ${count}`}>
                      {fristenByUrgency.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={CT} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : <Empty T={T} msg="Keine Fristen erfasst" />}

            {/* Список срочных фристов */}
            {raw.fristen.filter(f => {
              const d = Math.ceil((new Date(f.ende) - new Date()) / 86400000)
              return d >= 0 && d <= 14
            }).length > 0 && (
              <div style={{ marginTop:8 }}>
                <div style={{ fontSize:9, color:T.err, marginBottom:6 }}>
                  ⚠️ Kritische Fristen (≤14 Tage):
                </div>
                {raw.fristen
                  .filter(f => { const d = Math.ceil((new Date(f.ende) - new Date()) / 86400000); return d >= 0 && d <= 14 })
                  .sort((a,b) => new Date(a.ende) - new Date(b.ende))
                  .map((f, i) => {
                    const d = Math.ceil((new Date(f.ende) - new Date()) / 86400000)
                    return (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between',
                        padding:'5px 8px', marginBottom:3, background:T.sf,
                        border:`1px solid ${T.bd}`,
                        borderLeft:`3px solid ${d<=3?T.err:d<=7?T.warn:'#aaaa22'}`,
                        borderRadius:4 }}>
                        <span style={{ fontSize:9, color:T.tx }}>{f.label || '—'}</span>
                        <span style={{ fontSize:9, color:d<=3?T.err:d<=7?T.warn:T.ac }}>
                          {d === 0 ? 'HEUTE!' : d+' Tage'}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────
function tryParse(key, def) {
  try { return JSON.parse(localStorage.getItem(key)||JSON.stringify(def)) } catch { return def }
}

function ChartCard({ T, title, children }) {
  return (
    <div style={{ background:T.sf, border:`1px solid ${T.bd}`,
      borderRadius:6, marginBottom:10, overflow:'hidden' }}>
      <div style={{ padding:'6px 10px', borderBottom:`1px solid ${T.bd}`,
        fontSize:8, color:T.ac }}>{title}</div>
      <div style={{ padding:'8px 6px' }}>{children}</div>
    </div>
  )
}

function Empty({ T, msg }) {
  return (
    <div style={{ textAlign:'center', color:T.dm, fontSize:10,
      padding:'30px 0', background:T.sf, border:`1px solid ${T.bd}`,
      borderRadius:6 }}>{msg}</div>
  )
}

const fBtn = (T, a) => ({
  fontSize:8, padding:'3px 9px', cursor:'pointer', borderRadius:3,
  color: a?T.ac:T.dm, background: a?T.ac+'20':'none',
  border:`1px solid ${a?T.ac+'44':T.bd}`,
})
