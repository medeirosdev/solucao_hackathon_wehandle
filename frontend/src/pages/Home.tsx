import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Upload, X, FileText, ArrowRight, ToggleLeft, ToggleRight, ScrollText, DollarSign } from 'lucide-react'
import type { DimensionWeight, AnalysisRequest } from '../types'

const DEFAULT_WEIGHTS: DimensionWeight[] = [
  { id: 'longevidade',             label: 'Longevidade',             weight: 30, enabled: true  },
  { id: 'porte_capital',           label: 'Porte + Capital Social',   weight: 20, enabled: true  },
  { id: 'estabilidade_societaria', label: 'Estabilidade Societária',  weight: 20, enabled: true  },
  { id: 'regularidade_tributaria', label: 'Regularidade Tributária',  weight: 15, enabled: true  },
  { id: 'completude_cadastral',    label: 'Completude Cadastral',     weight: 15, enabled: true  },
  { id: 'protestos',              label: 'Protestos / Dívida Ativa', weight: 0,  enabled: false },
]

function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function Home() {
  const navigate  = useNavigate()
  const fileRef   = useRef<HTMLInputElement>(null)
  const [cnpj,    setCnpj]    = useState('')
  const [context, setContext] = useState('')
  const [files,   setFiles]   = useState<File[]>([])
  const [dragging,setDragging]= useState(false)
  const [config,  setConfig]  = useState(false)
  const [weights, setWeights] = useState<DimensionWeight[]>(DEFAULT_WEIGHTS)

  const cnpjClean   = cnpj.replace(/\D/g, '')
  const cnpjValid   = cnpjClean.length === 14
  const totalWeight = weights.filter(w => w.enabled).reduce((s, w) => s + w.weight, 0)

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    setFiles(p => [...p, ...Array.from(e.dataTransfer.files)])
  }, [])

  function toggleW(id: string) {
    setWeights(p => p.map(w =>
      w.id === id ? { ...w, enabled: !w.enabled, weight: !w.enabled ? (w.weight || 10) : w.weight } : w
    ))
  }

  function setW(id: string, val: number) {
    setWeights(p => p.map(w => w.id === id ? { ...w, weight: val } : w))
  }

  function submit() {
    if (!cnpjValid) return
    const req: AnalysisRequest = { cnpj: cnpjClean, context, weights, documents: files }
    navigate('/loading', { state: { request: req } })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#a1a1aa', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* ── top bar ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #1f2024' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a855f7' }} />
          <span style={{ color: '#71717a', fontSize: 13, letterSpacing: '0.08em', fontWeight: 500 }}>
            wehandle <span style={{ color: '#404040', margin: '0 6px' }}>/</span> conformidade
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate('/costs')}
          title="Monitoramento de custos"
          style={{ background: 'none', border: '1px solid #404040', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#71717a', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6b7280'; (e.currentTarget as HTMLElement).style.color = '#a1a1aa' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#404040'; (e.currentTarget as HTMLElement).style.color = '#71717a' }}
        >
          <DollarSign style={{ width: 15, height: 15 }} />
          <span style={{ fontSize: 13 }}>Custos</span>
        </button>
        <button
          onClick={() => navigate('/logs')}
          title="Ver logs do sistema"
          style={{ background: 'none', border: '1px solid #404040', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#71717a', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6b7280'; (e.currentTarget as HTMLElement).style.color = '#a1a1aa' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#404040'; (e.currentTarget as HTMLElement).style.color = '#71717a' }}
        >
          <ScrollText style={{ width: 15, height: 15 }} />
          <span style={{ fontSize: 13 }}>Logs</span>
        </button>
        <button
          onClick={() => setConfig(true)}
          title="Configurar pesos"
          style={{ background: 'none', border: '1px solid #404040', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#71717a', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6b7280'; (e.currentTarget as HTMLElement).style.color = '#a1a1aa' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#404040'; (e.currentTarget as HTMLElement).style.color = '#71717a' }}
        >
          <Settings style={{ width: 15, height: 15 }} />
          <span style={{ fontSize: 13 }}>Pesos</span>
        </button>
        </div>
      </header>

      {/* ── main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 600 }}>

          {/* headline */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{ fontSize: 28, fontWeight: 600, color: '#fafafa', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              WeScore
            </h1>
            <p style={{ fontSize: 15, color: '#71717a', margin: 0 }}>
              Analise a confiabilidade de um fornecedor com dados públicos e IA
            </p>
          </div>

          {/* card */}
          <div style={{ background: '#111113', border: '1px solid #262629', borderRadius: 16, overflow: 'hidden' }}>

            {/* CNPJ */}
            <div style={{ padding: '20px 20px 0' }}>
              <label style={labelSt}>CNPJ</label>
              <input
                autoFocus
                type="text"
                value={cnpj}
                onChange={e => setCnpj(formatCNPJ(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="00.000.000/0000-00"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fafafa',
                  fontSize: 22,
                  fontFamily: 'monospace',
                  letterSpacing: '0.04em',
                  padding: '8px 0',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ height: 1, background: cnpjValid ? '#7c3aed' : '#262629', transition: 'background 0.3s', marginBottom: 16 }} />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#1f2024' }} />

            {/* Context */}
            <div style={{ padding: '16px 20px 0' }}>
              <label style={labelSt}>Contexto da contratação</label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                rows={4}
                placeholder={'Descreva o objetivo da contratação...\nEx: "Preciso contratar esta empresa para desenvolver um sistema financeiro por 12 meses."'}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  color: '#d4d4d8',
                  fontSize: 14,
                  lineHeight: 1.65,
                  padding: '6px 0 16px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#1f2024' }} />

            {/* Upload */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                background: dragging ? 'rgba(124,58,237,0.05)' : 'transparent',
                transition: 'background 0.2s',
              }}
            >
              <Upload style={{ width: 15, height: 15, color: '#6b7280', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {files.length === 0
                  ? 'Anexar documentos (balanço, contratos, certidões)'
                  : `${files.length} documento${files.length > 1 ? 's' : ''} anexado${files.length > 1 ? 's' : ''}`}
              </span>
              {files.length > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); setFiles([]) }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', lineHeight: 1 }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
              <input ref={fileRef} type="file" multiple accept=".pdf,image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files) setFiles(p => [...p, ...Array.from(e.target.files!)]) }} />
            </div>

            {/* Files list */}
            {files.length > 0 && (
              <div style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#0d0d0f', border: '1px solid #262629', borderRadius: 8 }}>
                    <FileText style={{ width: 13, height: 13, color: '#7c3aed', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#71717a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: '#1f2024' }} />

            {/* Footer action */}
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                {cnpjValid ? <span style={{ color: '#7c3aed' }}>✓ CNPJ válido</span> : 'Digite o CNPJ para continuar'}
              </span>
              <button
                onClick={submit}
                disabled={!cnpjValid}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: cnpjValid ? '#7c3aed' : '#1f2024',
                  color: cnpjValid ? '#fff' : '#6b7280',
                  border: 'none', borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: 14, fontWeight: 500,
                  cursor: cnpjValid ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (cnpjValid) (e.currentTarget).style.background = '#6d28d9' }}
                onMouseLeave={e => { if (cnpjValid) (e.currentTarget).style.background = '#7c3aed' }}
              >
                Analisar
                <ArrowRight style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>

          {/* hints */}
          <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginTop: 20 }}>
            Dados da Receita Federal · Portal da Transparência · IBGE · Consumidor.gov.br
          </p>
        </div>
      </main>

      {/* ── Config drawer ── */}
      {config && (
        <>
          {/* overlay */}
          <div
            onClick={() => setConfig(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }}
          />
          {/* panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 380,
            background: '#111113',
            borderLeft: '1px solid #262629',
            zIndex: 50,
            display: 'flex', flexDirection: 'column',
            animation: 'slideIn 0.2s ease',
          }}>
            <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

            {/* drawer header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #1f2024' }}>
              <div>
                <p style={{ color: '#fafafa', fontSize: 15, fontWeight: 600, margin: 0 }}>Calibragem dos Pesos</p>
                <p style={{ color: '#6b7280', fontSize: 12, margin: '2px 0 0' }}>Defina o quanto cada critério impacta o score</p>
              </div>
              <button onClick={() => setConfig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* total indicator */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1f2024', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#71717a' }}>Total dos pesos ativos</span>
              <span style={{
                fontFamily: 'monospace', fontSize: 13,
                color: totalWeight === 100 ? '#22c55e' : '#f59e0b',
                background: totalWeight === 100 ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${totalWeight === 100 ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                borderRadius: 6, padding: '3px 10px',
              }}>
                {totalWeight}%
              </span>
            </div>

            {/* sliders */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weights.map(w => (
                <div key={w.id} style={{
                  background: '#0d0d0f',
                  border: `1px solid ${w.enabled ? '#262629' : '#1f2024'}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  opacity: w.enabled ? 1 : 0.4,
                  transition: 'opacity 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: w.enabled ? 12 : 0 }}>
                    <span style={{ fontSize: 13, color: '#d4d4d8', fontWeight: 500 }}>{w.label}</span>
                    <button onClick={() => toggleW(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', lineHeight: 1 }}>
                      {w.enabled
                        ? <ToggleRight style={{ width: 22, height: 22, color: '#7c3aed' }} />
                        : <ToggleLeft  style={{ width: 22, height: 22, color: '#404040' }} />
                      }
                    </button>
                  </div>
                  {w.enabled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="range" min={0} max={100} value={w.weight}
                        onChange={e => setW(w.id, Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer' }}
                      />
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#7c3aed', width: 34, textAlign: 'right' }}>
                        {w.weight}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* drawer footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #1f2024' }}>
              {totalWeight !== 100 && (
                <p style={{ fontSize: 12, color: '#92400e', marginBottom: 12, textAlign: 'center' }}>
                  Os pesos precisam somar 100% para o score ser preciso
                </p>
              )}
              <button
                onClick={() => setConfig(false)}
                style={{ width: '100%', background: '#1f2024', border: '1px solid #404040', borderRadius: 10, padding: '11px', fontSize: 14, color: '#a1a1aa', cursor: 'pointer', fontWeight: 500 }}
              >
                Salvar e fechar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const labelSt: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#6b7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontWeight: 600,
  marginBottom: 4,
}
