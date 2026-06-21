import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Circle, AlertCircle, Loader } from 'lucide-react'
import type { LoadingStep, AnalysisRequest } from '../types'
import { analyzeCompany } from '../services/api'

const STEPS: LoadingStep[] = [
  { id: 'receita',          label: 'Consultando dados da Receita Federal (CNPJ)...',      status: 'pending' },
  { id: 'estabelecimentos', label: 'Carregando estabelecimentos e sócios...',              status: 'pending' },
  { id: 'simples',          label: 'Verificando Simples Nacional e MEI...',               status: 'pending' },
  { id: 'ceis',             label: 'Cruzando CEIS / CNEP (Portal da Transparência)...',  status: 'pending' },
  { id: 'lista_suja',       label: 'Verificando Lista Suja do Trabalho Escravo (MTE)...', status: 'pending' },
  { id: 'consumidor',       label: 'Consultando reclamações no Consumidor.gov.br...',     status: 'pending' },
  { id: 'ibge',             label: 'Analisando contexto econômico via IBGE...',           status: 'pending' },
  { id: 'formula',          label: 'Calculando Score Analítico (fórmula parametrizada)...', status: 'pending' },
  { id: 'ia',               label: 'Analisando semântica e gerando parecer com IA...',   status: 'pending' },
]

function StepIcon({ status }: { status: LoadingStep['status'] }) {
  const size = { width: 20, height: 20, flexShrink: 0 } as React.CSSProperties
  if (status === 'done')    return <CheckCircle  style={{ ...size, color: '#22c55e' }} />
  if (status === 'loading') return <Loader       style={{ ...size, color: '#a855f7', animation: 'spin 1s linear infinite' }} />
  if (status === 'error')   return <AlertCircle  style={{ ...size, color: '#ef4444' }} />
  return <Circle style={{ ...size, color: '#3d4460' }} />
}

export default function Loading() {
  const location = useLocation()
  const navigate = useNavigate()
  const request  = location.state?.request as AnalysisRequest

  const [steps,    setSteps]    = useState<LoadingStep[]>(STEPS)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const activeIndex             = useRef(0)

  function setStepStatus(index: number, status: LoadingStep['status']) {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s))
  }

  useEffect(() => {
    if (!request) { navigate('/'); return }

    async function run() {
      try {
        for (let i = 0; i < STEPS.length - 2; i++) {
          activeIndex.current = i
          setStepStatus(i, 'loading')
          await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
          setStepStatus(i, 'done')
        }

        activeIndex.current = STEPS.length - 2
        setStepStatus(STEPS.length - 2, 'loading')
        setStepStatus(STEPS.length - 1, 'loading')

        const result = await analyzeCompany(request)

        setStepStatus(STEPS.length - 2, 'done')
        setStepStatus(STEPS.length - 1, 'done')

        await new Promise(r => setTimeout(r, 500))
        navigate('/result', { state: { result } })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[WeScore]', msg)
        setStepStatus(activeIndex.current, 'error')
        setErrorMsg(msg)
      }
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const done    = steps.filter(s => s.status === 'done').length
  const percent = Math.round((done / steps.length) * 100)

  return (
    <div style={{ minHeight: '100vh', background: '#0d0e14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 99, padding: '8px 18px', marginBottom: 20 }}>
            <Loader style={{ width: 16, height: 16, color: '#a855f7', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#a855f7', fontSize: 13, fontWeight: 600 }}>Motor trabalhando</span>
          </div>
          <h1 style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>Analisando Fornecedor</h1>
          <p style={{ color: '#8492a8', fontFamily: 'monospace', fontSize: 16 }}>
            {request?.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ background: '#3d4460', borderRadius: 99, height: 6, marginBottom: 32 }}>
          <div style={{ background: '#a855f7', height: 6, borderRadius: 99, width: `${percent}%`, transition: 'width 0.5s ease' }} />
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map(step => (
            <div key={step.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 16px',
              borderRadius: 12,
              border: `1px solid ${step.status === 'loading' ? 'rgba(168,85,247,0.3)' : step.status === 'error' ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
              background: step.status === 'loading' ? 'rgba(168,85,247,0.07)' : step.status === 'error' ? 'rgba(239,68,68,0.07)' : 'transparent',
              transition: 'all 0.3s',
            }}>
              <StepIcon status={step.status} />
              <span style={{
                fontSize: 14,
                color: step.status === 'loading' ? '#c084fc' : step.status === 'done' ? '#7d849e' : step.status === 'error' ? '#ef4444' : '#3d4460',
                transition: 'color 0.3s',
              }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {errorMsg ? (
          <div style={{ marginTop: 24, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>Falha na análise</p>
            <p style={{ color: '#fca5a5', fontSize: 12, fontFamily: 'monospace', margin: '0 0 14px', lineHeight: 1.5 }}>{errorMsg}</p>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 18px', color: '#ef4444', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
            >
              ← Tentar novamente
            </button>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 24 }}>{percent}% concluído</p>
        )}
      </div>
    </div>
  )
}
