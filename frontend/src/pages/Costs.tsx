import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, DollarSign, Zap, BarChart2, Hash } from 'lucide-react'

const API = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8000'

interface Stats {
  total_calls:             number
  total_prompt_tokens:     number
  total_completion_tokens: number
  total_tokens:            number
  total_cost_usd:          number
  by_service:              { service: string; calls: number; tokens: number; cost: number }[]
  by_day:                  { day: string; calls: number; tokens: number; cost: number }[]
  prices:                  { input: number; output: number }
}

interface HistoryRow {
  id:                number
  ts:                string
  service:           string
  operation:         string
  cnpj:              string
  model:             string
  prompt_tokens:     number
  completion_tokens: number
  total_tokens:      number
  cost_usd:          number
}

function fmt$(v: number, decimals = 6) {
  if (v === 0) return '$0.000000'
  if (v < 0.000001) return `$${v.toExponential(3)}`
  return `$${v.toFixed(decimals)}`
}

function fmtTs(ts: string) {
  try { return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }) }
  catch { return ts }
}

function fmtNum(n: number) {
  return n.toLocaleString('pt-BR')
}

function ServiceLabel({ s }: { s: string }) {
  const map: Record<string, string> = {
    ai_service:       'Análise Semântica',
    document_service: 'Análise de Documentos',
  }
  return <>{map[s] ?? s}</>
}

/* ── Mini bar chart (SVG) ── */
function DailyChart({ data }: { data: Stats['by_day'] }) {
  if (data.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#454e6a', fontSize: 13 }}>
      Sem dados nos últimos 30 dias
    </div>
  )

  const max = Math.max(...data.map(d => d.cost), 0.000001)
  const W = 600, H = 100, BAR_W = Math.min(32, (W / data.length) - 4)

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 24}`} style={{ minWidth: 200 }}>
        {data.map((d, i) => {
          const barH = Math.max(3, (d.cost / max) * H)
          const x = (i / data.length) * W + (W / data.length - BAR_W) / 2
          const y = H - barH
          return (
            <g key={d.day}>
              <rect x={x} y={y} width={BAR_W} height={barH} rx={3} fill="#7c3aed" opacity={0.75} />
              {/* day label every ~5 days */}
              {(data.length <= 10 || i % Math.ceil(data.length / 10) === 0) && (
                <text x={x + BAR_W / 2} y={H + 16} textAnchor="middle" fontSize={9} fill="#64748b">
                  {d.day.slice(5)}
                </text>
              )}
              {/* tooltip on hover via title */}
              <title>{d.day}: {fmt$(d.cost)} ({d.calls} chamada{d.calls !== 1 ? 's' : ''})</title>
            </g>
          )
        })}
        {/* baseline */}
        <line x1={0} y1={H} x2={W} y2={H} stroke="#252d44" strokeWidth={1} />
      </svg>
    </div>
  )
}

export default function Costs() {
  const navigate = useNavigate()
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, hRes] = await Promise.all([
        fetch(`${API}/usage`),
        fetch(`${API}/usage/history?limit=50`),
      ])
      const s = await sRes.json()
      const h = await hRes.json()
      setStats(s)
      setHistory(h.history ?? [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const avgCost = stats && stats.total_calls > 0
    ? stats.total_cost_usd / stats.total_calls
    : 0

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Top bar ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #1f2024' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7d849e', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} /> Início
          </button>
          <span style={{ color: '#454e6a' }}>|</span>
          <span style={{ color: '#7d849e', fontSize: 13 }}>Monitoramento de Custos</span>
        </div>
        <button
          onClick={fetchAll}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #262629', borderRadius: 8, padding: '7px 12px', color: '#7d849e', fontSize: 13, cursor: 'pointer' }}
        >
          <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </header>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Summary cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <SummaryCard
            icon={<DollarSign style={{ width: 18, height: 18 }} />}
            label="Custo Total"
            value={stats ? fmt$(stats.total_cost_usd) : '—'}
            sub="USD acumulado"
            accent="#a78bfa"
          />
          <SummaryCard
            icon={<Hash style={{ width: 18, height: 18 }} />}
            label="Chamadas à API"
            value={stats ? fmtNum(stats.total_calls) : '—'}
            sub="total de requisições"
            accent="#60a5fa"
          />
          <SummaryCard
            icon={<Zap style={{ width: 18, height: 18 }} />}
            label="Tokens Consumidos"
            value={stats ? fmtNum(stats.total_tokens) : '—'}
            sub={stats ? `${fmtNum(stats.total_prompt_tokens)} entrada · ${fmtNum(stats.total_completion_tokens)} saída` : '—'}
            accent="#34d399"
          />
          <SummaryCard
            icon={<BarChart2 style={{ width: 18, height: 18 }} />}
            label="Custo Médio / Chamada"
            value={avgCost > 0 ? fmt$(avgCost) : '—'}
            sub="USD por análise"
            accent="#f59e0b"
          />
        </div>

        {/* ── Chart + By service ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>

          {/* Daily chart */}
          <div style={{ background: '#111115', border: '1px solid #1f2024', borderRadius: 16, padding: '20px 24px' }}>
            <p style={sectionLabel}>Custo diário — últimos 30 dias</p>
            {stats ? <DailyChart data={stats.by_day} /> : <Skeleton height={120} />}
          </div>

          {/* By service */}
          <div style={{ background: '#111115', border: '1px solid #1f2024', borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={sectionLabel}>Por serviço</p>
            {stats && stats.by_service.length === 0 && (
              <span style={{ color: '#454e6a', fontSize: 13 }}>Nenhum dado ainda</span>
            )}
            {stats?.by_service.map(s => {
              const pct = stats.total_cost_usd > 0 ? (s.cost / stats.total_cost_usd) * 100 : 0
              return (
                <div key={s.service}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#c8d0e0', fontWeight: 500 }}><ServiceLabel s={s.service} /></span>
                    <span style={{ fontSize: 12, color: '#a78bfa', fontFamily: 'monospace' }}>{fmt$(s.cost)}</span>
                  </div>
                  <div style={{ background: '#252d44', borderRadius: 99, height: 5 }}>
                    <div style={{ background: '#7c3aed', height: 5, borderRadius: 99, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#454e6a', marginTop: 4, display: 'block' }}>
                    {fmtNum(s.calls)} chamada{s.calls !== 1 ? 's' : ''} · {fmtNum(s.tokens)} tokens
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Pricing reference ── */}
        <div style={{ background: '#111115', border: '1px solid #252d44', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 32 }}>
          <span style={{ fontSize: 12, color: '#7d849e', fontWeight: 600 }}>Tabela DeepSeek-V3 (deepseek-chat)</span>
          <span style={{ fontSize: 12, color: '#7d849e' }}>
            Entrada: <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>$0.27 / 1M tokens</span>
          </span>
          <span style={{ fontSize: 12, color: '#7d849e' }}>
            Saída: <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>$1.10 / 1M tokens</span>
          </span>
          <span style={{ fontSize: 11, color: '#454e6a', marginLeft: 'auto' }}>
            Preços cache miss · fonte: platform.deepseek.com
          </span>
        </div>

        {/* ── History table ── */}
        <div>
          <p style={sectionLabel}>Histórico de chamadas (últimas 50)</p>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#454e6a', fontSize: 13 }}>
              {loading ? 'Carregando...' : 'Nenhuma chamada registrada ainda. Faça uma análise para ver os dados.'}
            </div>
          ) : (
            <div style={{ background: '#111115', border: '1px solid #1f2024', borderRadius: 12, overflow: 'hidden' }}>
              {/* header */}
              <div style={{ display: 'grid', gridTemplateColumns: '155px 140px 1fr 80px 80px 80px 100px', gap: 12, padding: '8px 16px', borderBottom: '1px solid #1f2024', color: '#454e6a', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                <span>Timestamp</span>
                <span>Serviço</span>
                <span>Operação</span>
                <span style={{ textAlign: 'right' }}>Entrada</span>
                <span style={{ textAlign: 'right' }}>Saída</span>
                <span style={{ textAlign: 'right' }}>Total</span>
                <span style={{ textAlign: 'right' }}>Custo USD</span>
              </div>
              {history.map((row, i) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '155px 140px 1fr 80px 80px 80px 100px',
                    gap: 12, padding: '9px 16px', alignItems: 'center',
                    borderBottom: i < history.length - 1 ? '1px solid #1a1a1e' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtTs(row.ts)}</span>
                  <span style={{ fontSize: 12, color: '#7d849e' }}><ServiceLabel s={row.service} /></span>
                  <span style={{ fontSize: 11, color: '#454e6a', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.operation}>{row.operation}</span>
                  <span style={{ fontSize: 12, color: '#c8d0e0', textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(row.prompt_tokens)}</span>
                  <span style={{ fontSize: 12, color: '#c8d0e0', textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(row.completion_tokens)}</span>
                  <span style={{ fontSize: 12, color: '#c8d0e0', textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(row.total_tokens)}</span>
                  <span style={{ fontSize: 12, color: '#a78bfa', textAlign: 'right', fontFamily: 'monospace' }}>{fmt$(row.cost_usd)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

/* ── helpers ── */

function SummaryCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent: string
}) {
  return (
    <div style={{ background: '#111115', border: '1px solid #1f2024', borderRadius: 16, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: accent }}>
        {icon}
        <span style={{ fontSize: 12, color: '#7d849e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#454e6a', marginTop: 6 }}>{sub}</div>
    </div>
  )
}

function Skeleton({ height }: { height: number }) {
  return <div style={{ background: '#1f2024', borderRadius: 8, height, animation: 'pulse 1.5s ease infinite' }} />
}

const sectionLabel: React.CSSProperties = {
  color: '#7d849e', fontSize: 11, fontWeight: 600,
  letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px',
}
