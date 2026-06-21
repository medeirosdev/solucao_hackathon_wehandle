import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Trash2, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronRight, DollarSign } from 'lucide-react'

const API = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8000'

interface LogEntry {
  id:        number
  ts:        string
  level:     'error' | 'warning' | 'info'
  service:   string
  operation: string
  cnpj:      string | null
  message:   string
  traceback: string | null
}

function levelStyle(level: string) {
  if (level === 'error')   return { text: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'   }
  if (level === 'warning') return { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' }
  return                          { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)'  }
}

function LevelIcon({ level }: { level: string }) {
  const s = { width: 13, height: 13, flexShrink: 0 } as React.CSSProperties
  if (level === 'error')   return <AlertCircle   style={s} />
  if (level === 'warning') return <AlertTriangle style={s} />
  return <Info style={s} />
}

function formatTs(ts: string) {
  try {
    return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
  } catch { return ts }
}

export default function Logs() {
  const navigate = useNavigate()

  const [logs,        setLogs]        = useState<LogEntry[]>([])
  const [filter,      setFilter]      = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const [loading,     setLoading]     = useState(false)
  const [expanded,    setExpanded]    = useState<Set<number>>(new Set())
  const [autoRefresh, setAutoRefresh] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const qs = filter !== 'all' ? `?level=${filter}&limit=300` : '?limit=300'
      const res  = await fetch(`${API}/logs${qs}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    if (autoRefresh) {
      timer.current = setInterval(fetchLogs, 5000)
    } else {
      if (timer.current) clearInterval(timer.current)
    }
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [autoRefresh, fetchLogs])

  async function clearLogs() {
    if (!confirm('Apagar todos os logs?')) return
    await fetch(`${API}/logs`, { method: 'DELETE' })
    setLogs([])
  }

  function toggle(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const counts = {
    all:     logs.length,
    error:   logs.filter(l => l.level === 'error').length,
    warning: logs.filter(l => l.level === 'warning').length,
    info:    logs.filter(l => l.level === 'info').length,
  }

  const FILTERS: Array<'all' | 'error' | 'warning' | 'info'> = ['all', 'error', 'warning', 'info']
  const FILTER_LABELS = { all: 'Todos', error: 'Error', warning: 'Warning', info: 'Info' }
  const FILTER_COLORS: Record<string, string> = {
    all: '#7d849e', error: '#ef4444', warning: '#f59e0b', info: '#60a5fa',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Top bar ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #1f2024' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7d849e', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} /> Início
          </button>
          <span style={{ color: '#454e6a' }}>|</span>
          <span style={{ color: '#7d849e', fontSize: 13 }}>Logs do Sistema</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* costs link */}
          <button
            onClick={() => navigate('/costs')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #262629', borderRadius: 8, padding: '7px 12px', color: '#7d849e', fontSize: 13, cursor: 'pointer' }}
          >
            <DollarSign style={{ width: 13, height: 13 }} />
            Custos
          </button>

          {/* auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: autoRefresh ? 'rgba(96,165,250,0.1)' : 'transparent',
              border: `1px solid ${autoRefresh ? 'rgba(96,165,250,0.35)' : '#262629'}`,
              borderRadius: 8, padding: '7px 12px',
              color: autoRefresh ? '#60a5fa' : '#7d849e', fontSize: 13, cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: 13, height: 13, animation: autoRefresh ? 'spin 2s linear infinite' : 'none' }} />
            {autoRefresh ? 'Auto 5s' : 'Auto'}
          </button>

          {/* refresh now */}
          <button
            onClick={fetchLogs}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #262629', borderRadius: 8, padding: '7px 12px', color: '#7d849e', fontSize: 13, cursor: 'pointer' }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} />
            Atualizar
          </button>

          {/* clear */}
          <button
            onClick={clearLogs}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '7px 12px', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
            Limpar tudo
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── Filter pills ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          {FILTERS.map(f => {
            const active = filter === f
            const col    = FILTER_COLORS[f]
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: active ? `${col}15` : 'transparent',
                  border: `1px solid ${active ? `${col}45` : '#262629'}`,
                  borderRadius: 8, padding: '6px 14px',
                  color: active ? col : '#7d849e',
                  fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {FILTER_LABELS[f]}
                <span style={{
                  fontSize: 11, borderRadius: 99, padding: '1px 7px',
                  background: active ? `${col}22` : '#1f2024',
                  color: active ? col : '#64748b',
                }}>
                  {counts[f]}
                </span>
              </button>
            )
          })}
          {loading && (
            <RefreshCw style={{ width: 13, height: 13, color: '#454e6a', animation: 'spin 1s linear infinite', marginLeft: 8 }} />
          )}
        </div>

        {/* ── Log list ── */}
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#454e6a' }}>
            {loading ? 'Carregando...' : 'Nenhum registro encontrado'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Column header */}
            <div style={{ display: 'grid', gridTemplateColumns: '155px 80px 130px 1fr 16px', gap: 12, padding: '4px 14px 8px', color: '#454e6a', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              <span>Timestamp</span>
              <span>Nível</span>
              <span>Serviço</span>
              <span>Mensagem</span>
              <span />
            </div>

            {logs.map(log => {
              const c      = levelStyle(log.level)
              const isOpen = expanded.has(log.id)
              const hasTrace = !!log.traceback

              return (
                <div
                  key={log.id}
                  style={{ background: '#111115', border: '1px solid #1f2024', borderRadius: 10, overflow: 'hidden' }}
                >
                  {/* Row */}
                  <div
                    onClick={() => hasTrace && toggle(log.id)}
                    style={{
                      display: 'grid', gridTemplateColumns: '155px 80px 130px 1fr 16px',
                      alignItems: 'center', gap: 12, padding: '10px 14px',
                      cursor: hasTrace ? 'pointer' : 'default',
                    }}
                  >
                    {/* timestamp */}
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatTs(log.ts)}
                    </span>

                    {/* level badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: c.text, background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: 6, padding: '2px 7px',
                    }}>
                      <LevelIcon level={log.level} />
                      {log.level}
                    </span>

                    {/* service */}
                    <span style={{ fontSize: 12, color: '#7d849e', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.service}
                    </span>

                    {/* message + meta */}
                    <div style={{ overflow: 'hidden' }}>
                      <span style={{ fontSize: 13, color: '#c8d0e0' }}>{log.message}</span>
                      {log.operation && (
                        <span style={{ fontSize: 11, color: '#454e6a', marginLeft: 10, fontFamily: 'monospace' }}>
                          {log.operation}
                        </span>
                      )}
                      {log.cnpj && (
                        <span style={{ fontSize: 11, color: '#7c3aed', marginLeft: 10, fontFamily: 'monospace' }}>
                          {log.cnpj}
                        </span>
                      )}
                    </div>

                    {/* expand chevron */}
                    {hasTrace
                      ? isOpen
                        ? <ChevronDown  style={{ width: 14, height: 14, color: '#64748b' }} />
                        : <ChevronRight style={{ width: 14, height: 14, color: '#64748b' }} />
                      : <span />
                    }
                  </div>

                  {/* Traceback */}
                  {isOpen && log.traceback && (
                    <div style={{ borderTop: '1px solid #1f2024', padding: '14px 16px', background: '#0d0d11' }}>
                      <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#fca5a5', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.65 }}>
                        {log.traceback}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
