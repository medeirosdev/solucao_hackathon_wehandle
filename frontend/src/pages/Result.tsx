import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, XCircle, Info, ArrowLeft, Download, Building2, FileText, ShieldCheck, Lightbulb, ScrollText, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { AnalysisResult, DocumentAnalysis } from '../types'

/* ── helpers ── */
function scoreColor(s: number) {
  if (s >= 85) return '#22c55e'
  if (s >= 70) return '#84cc16'
  if (s >= 50) return '#eab308'
  if (s >= 30) return '#f97316'
  return '#ef4444'
}

function scoreLabel(s: number): { label: string; color: string; bg: string; border: string } {
  if (s >= 85) return { label: 'Excelente', color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)'   }
  if (s >= 70) return { label: 'Bom',       color: '#84cc16', bg: 'rgba(132,204,22,0.08)',  border: 'rgba(132,204,22,0.25)'  }
  if (s >= 50) return { label: 'Regular',   color: '#eab308', bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.25)'   }
  if (s >= 30) return { label: 'Baixo',     color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)'  }
  return               { label: 'Crítico',  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'   }
}

/* ── Gauge SVG ── */
function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const r   = 52
  const circ = 2 * Math.PI * r
  const off  = circ - (Math.min(100, Math.max(0, score)) / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 130, height: 130 }}>
        <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r={r} fill="none" stroke="#252d44" strokeWidth="10" />
          <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9' }}>{Math.round(score)}</span>
          <span style={{ fontSize: 11, color: '#7d849e' }}>/100</span>
        </div>
      </div>
      <span style={{ fontSize: 13, color: '#8492a8', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

export default function Result() {
  const location = useLocation()
  const navigate = useNavigate()
  const result   = location.state?.result as AnalysisResult

  if (!result) { navigate('/'); return null }

  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)

  const hasVeto    = result.hardGates.some(g => g.triggered && g.multiplier === 0)
  const hasWarning = result.hardGates.some(g => g.triggered && g.multiplier > 0 && g.multiplier < 1)
  const finalScore = Math.round((result.scoreFormula + result.scoreIA) / 2)
  const badge      = scoreLabel(finalScore)

  return (
    <div style={{ minHeight: '100vh', background: '#0d0e14', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* Veto / Warning banner */}
      {hasVeto && (
        <div style={{ background: '#dc2626', color: '#fff', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <XCircle style={{ width: 22, height: 22, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 16, marginRight: 12 }}>VETO RECOMENDADO</span>
          <span style={{ fontSize: 14, opacity: 0.85 }}>Empresa identificada em lista de restrição. Contratação não recomendada.</span>
        </div>
      )}
      {hasWarning && !hasVeto && (
        <div style={{ background: '#d97706', color: '#fff', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle style={{ width: 22, height: 22, flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Atenção: empresa com situação cadastral irregular. Verifique os detalhes abaixo.</span>
        </div>
      )}

      {/* Topbar */}
      <div style={{ borderBottom: '1px solid #252d44', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7d849e', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} /> Nova Análise
          </button>
          <span style={{ color: '#454e6a' }}>|</span>
          <span style={{ color: '#7d849e', fontSize: 13 }}>Resultado da Auditoria</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/logs')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#12131c', border: '1px solid #252d44', borderRadius: 8, padding: '8px 16px', color: '#7d849e', fontSize: 13, cursor: 'pointer' }}>
            <ScrollText style={{ width: 15, height: 15 }} /> Logs
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#12131c', border: '1px solid #252d44', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
            <Download style={{ width: 16, height: 16 }} /> Exportar PDF
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Company header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#12131c', border: '1px solid #252d44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building2 style={{ width: 24, height: 24, color: '#7d849e' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{result.razaoSocial}</h1>
              {result.nomeFantasia && <p style={{ color: '#7d849e', fontSize: 13, marginTop: 2 }}>"{result.nomeFantasia}"</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <span style={{ fontFamily: 'monospace', color: '#7d849e', fontSize: 13 }}>
                  {result.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                </span>
                <Dot />
                <span style={{ color: '#7d849e', fontSize: 13 }}>{result.municipio} — {result.uf}</span>
                <Dot />
                <span style={{ color: '#7d849e', fontSize: 13 }}>{result.cnaeDescricao || result.cnae}</span>
                <Dot />
                <span style={{ color: '#7d849e', fontSize: 13 }}>{result.porte}</span>
              </div>
            </div>
          </div>

          {/* Score badge */}
          <div style={{ flexShrink: 0, border: `1px solid ${badge.border}`, background: badge.bg, borderRadius: 16, padding: '20px 28px', textAlign: 'center', minWidth: 120 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: badge.color, lineHeight: 1 }}>{finalScore}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: badge.color, marginTop: 4 }}>{badge.label}</div>
            <div style={{ fontSize: 11, color: '#7d849e', marginTop: 2 }}>score final</div>
          </div>
        </div>

        {/* Hard gates */}
        {result.hardGates.some(g => g.triggered) && (
          <Section title="Alertas Críticos">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.hardGates.filter(g => g.triggered).map(gate => (
                <div key={gate.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 12, background: gate.multiplier === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.08)', border: `1px solid ${gate.multiplier === 0 ? 'rgba(239,68,68,0.25)' : 'rgba(249,115,22,0.25)'}` }}>
                  <XCircle style={{ width: 18, height: 18, color: gate.multiplier === 0 ? '#ef4444' : '#f97316', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: gate.multiplier === 0 ? '#ef4444' : '#f97316', margin: 0 }}>{gate.label}</p>
                    <p style={{ color: '#8492a8', fontSize: 13, margin: '4px 0 0' }}>{gate.detail}</p>
                    <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>Multiplicador: ×{gate.multiplier}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Dual score */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Analítico */}
          <div style={cardStyle}>
            <p style={sectionTitle}>Score Analítico (Fórmula)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <ScoreGauge score={result.scoreFormula} label="Score da Fórmula" color={scoreColor(result.scoreFormula)} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {result.dimensions.map(dim => (
                  <div key={dim.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: '#8492a8' }}>{dim.label}</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#94a3b8' }}>{dim.score}/{dim.maxScore}</span>
                    </div>
                    <div style={{ background: '#252d44', borderRadius: 99, height: 5 }}>
                      <div style={{ background: scoreColor((dim.score / dim.maxScore) * 100), height: 5, borderRadius: 99, width: `${(dim.score / dim.maxScore) * 100}%`, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* IA */}
          <div style={cardStyle}>
            <p style={sectionTitle}>Score Semântico (IA)</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <ScoreGauge score={result.scoreIA} label="Score da IA" color={scoreColor(result.scoreIA)} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{result.parecerIA}</p>
                {result.conflitoCNAE && (
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                    <AlertTriangle style={{ width: 15, height: 15, color: '#eab308', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ color: '#ca8a04', fontSize: 12, margin: 0 }}>{result.conflitoCNAE}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Red Flags */}
        {result.redFlags.length > 0 && (
          <Section title="Alertas e Observações">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.redFlags.map((flag, i) => {
                const isC = flag.severity === 'critical'
                const isW = flag.severity === 'warning'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 12, background: isC ? 'rgba(239,68,68,0.07)' : isW ? 'rgba(234,179,8,0.07)' : '#12131c', border: `1px solid ${isC ? 'rgba(239,68,68,0.2)' : isW ? 'rgba(234,179,8,0.2)' : '#252d44'}` }}>
                    {isC && <XCircle       style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0, marginTop: 2 }} />}
                    {isW && <AlertTriangle style={{ width: 16, height: 16, color: '#eab308', flexShrink: 0, marginTop: 2 }} />}
                    {!isC && !isW && <Info style={{ width: 16, height: 16, color: '#60a5fa', flexShrink: 0, marginTop: 2 }} />}
                    <div>
                      <p style={{ fontSize: 14, color: isC ? '#fca5a5' : isW ? '#fde047' : '#94a3b8', margin: 0 }}>{flag.message}</p>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Fonte: {flag.source}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Documentos Analisados */}
        {result.documents && result.documents.length > 0 && (() => {
          const docs = result.documents!
          const avgScore = Math.round(docs.reduce((s, d) => s + d.scoreDocumento, 0) / docs.length)
          const avgColor = scoreColor(avgScore)
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ color: '#7d849e', fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', margin: 0 }}>
                  Documentos Analisados ({docs.length})
                </p>
                {docs.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0d0e14', border: `1px solid ${avgColor}30`, borderRadius: 10, padding: '6px 14px' }}>
                    <span style={{ fontSize: 11, color: '#7d849e' }}>Score médio dos docs</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: avgColor }}>{avgScore}</span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>/100</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {docs.map((doc, i) => (
                  <DocumentCard key={i} doc={doc} />
                ))}
              </div>
            </div>
          )
        })()}

        {/* Fontes */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 16, borderTop: '1px solid #252d44' }}>
          <span style={{ color: '#64748b', fontSize: 12 }}>Fontes consultadas:</span>
          {result.fontesDados.map((f, i) => (
            <span key={i} style={{ fontSize: 12, color: '#64748b', background: '#12131c', border: '1px solid #252d44', borderRadius: 6, padding: '2px 10px' }}>{f}</span>
          ))}
        </div>

        {/* Feedback */}
        <style>{`
          @keyframes popIn {
            0%   { transform: scale(0.85); opacity: 0; }
            60%  { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1);    opacity: 1; }
          }
          @keyframes btnPulse {
            0%   { transform: scale(1); }
            30%  { transform: scale(1.12); }
            60%  { transform: scale(0.96); }
            100% { transform: scale(1); }
          }
          .feedback-btn { transition: opacity 0.2s, filter 0.2s; }
          .feedback-btn:hover { filter: brightness(1.2); }
          .feedback-btn:disabled { cursor: default; }
          .feedback-btn.selected { animation: btnPulse 0.35s ease forwards; }
        `}</style>
        <div style={{ background: '#12131c', border: `1px solid ${feedback === 'positive' ? 'rgba(34,197,94,0.35)' : feedback === 'negative' ? 'rgba(249,115,22,0.35)' : '#252d44'}`, borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, transition: 'border-color 0.4s' }}>
          <div>
            {feedback ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, animation: 'popIn 0.4s ease forwards' }}>
                {feedback === 'positive'
                  ? <ThumbsUp  style={{ width: 22, height: 22, color: '#22c55e' }} />
                  : <ThumbsDown style={{ width: 22, height: 22, color: '#f97316' }} />
                }
                <div>
                  <p style={{ color: feedback === 'positive' ? '#22c55e' : '#f97316', fontSize: 14, fontWeight: 600, margin: 0 }}>
                    {feedback === 'positive' ? 'Obrigado! Feedback registrado.' : 'Registrado. Vamos revisar.'}
                  </p>
                  <p style={{ color: '#64748b', fontSize: 12, margin: '3px 0 0' }}>
                    {feedback === 'positive' ? 'Score confirmado como adequado.' : 'Score marcado para calibração do modelo.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, margin: 0 }}>Esse score reflete a realidade do mercado?</p>
                <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>Seu feedback treina o modelo para ser cada vez mais preciso</p>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button
              className={`feedback-btn${feedback === 'positive' ? ' selected' : ''}`}
              disabled={feedback !== null}
              onClick={() => setFeedback('positive')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: feedback === 'positive' ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.08)', border: `1px solid ${feedback === 'positive' ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.2)'}`, borderRadius: 8, padding: '8px 16px', color: '#22c55e', fontSize: 13, cursor: feedback ? 'default' : 'pointer', opacity: feedback === 'negative' ? 0.35 : 1 }}
            >
              <CheckCircle style={{ width: 15, height: 15 }} /> Sim, correto
            </button>
            <button
              className={`feedback-btn${feedback === 'negative' ? ' selected' : ''}`}
              disabled={feedback !== null}
              onClick={() => setFeedback('negative')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: feedback === 'negative' ? 'rgba(249,115,22,0.18)' : 'rgba(239,68,68,0.08)', border: `1px solid ${feedback === 'negative' ? 'rgba(249,115,22,0.5)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 8, padding: '8px 16px', color: feedback === 'negative' ? '#f97316' : '#ef4444', fontSize: 13, cursor: feedback ? 'default' : 'pointer', opacity: feedback === 'positive' ? 0.35 : 1 }}
            >
              <XCircle style={{ width: 15, height: 15 }} /> Nota deveria ser menor
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ── DocumentCard ── */
function DocumentCard({ doc }: { doc: DocumentAnalysis }) {
  const docScore = doc.scoreDocumento
  const docColor = scoreColor(docScore)
  const hasFlags = doc.redFlags && doc.redFlags.length > 0

  return (
    <div style={{ background: '#12131c', border: '1px solid #252d44', borderRadius: 16, overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #252d44', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0d0e14', border: '1px solid #252d44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText style={{ width: 16, height: 16, color: '#7d849e' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.fileName}</p>
            <p style={{ fontSize: 12, color: '#7d849e', margin: '2px 0 0' }}>{doc.tipo}</p>
          </div>
        </div>

        {/* score do documento */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* confiab / compat como pills secundários */}
          <div style={{ display: 'flex', gap: 10 }}>
            <MetricPill label="Confiabilidade" value={doc.confiabilidade} />
            <MetricPill label="Compatibilidade" value={doc.compatibilidade} />
          </div>
          {/* score principal do doc */}
          <div style={{ textAlign: 'center', background: '#0d0e14', border: `1px solid ${docColor}40`, borderRadius: 12, padding: '10px 16px', minWidth: 80 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: docColor, lineHeight: 1 }}>{docScore}</div>
            <div style={{ fontSize: 10, color: '#7d849e', marginTop: 3 }}>score doc.</div>
          </div>
        </div>
      </div>

      {/* badge "não computa" */}
      <div style={{ background: 'rgba(96,165,250,0.06)', borderBottom: '1px solid rgba(96,165,250,0.12)', padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Info style={{ width: 12, height: 12, color: '#60a5fa', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#7d849e' }}>Score documental não computado no resultado principal — reservado para integração futura</span>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {doc.resumo && (
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{doc.resumo}</p>
        )}

        {/* insights */}
        {doc.insights.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Lightbulb style={{ width: 13, height: 13, color: '#60a5fa' }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: '#7d849e' }}>Insights</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {doc.insights.map((ins, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#60a5fa', flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{ins}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* red flags do documento */}
        {hasFlags && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <ShieldCheck style={{ width: 13, height: 13, color: '#f97316' }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: '#7d849e' }}>Pontos de Atenção</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {doc.redFlags.map((flag, i) => {
                const isC = flag.severity === 'critical'
                const isW = flag.severity === 'warning'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, background: isC ? 'rgba(239,68,68,0.07)' : isW ? 'rgba(234,179,8,0.07)' : '#0d0e14', border: `1px solid ${isC ? 'rgba(239,68,68,0.2)' : isW ? 'rgba(234,179,8,0.2)' : '#1a1b26'}` }}>
                    {isC && <XCircle       style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0, marginTop: 2 }} />}
                    {isW && <AlertTriangle style={{ width: 14, height: 14, color: '#eab308', flexShrink: 0, marginTop: 2 }} />}
                    {!isC && !isW && <Info style={{ width: 14, height: 14, color: '#60a5fa', flexShrink: 0, marginTop: 2 }} />}
                    <div>
                      <p style={{ fontSize: 13, color: isC ? '#fca5a5' : isW ? '#fde047' : '#94a3b8', margin: 0, lineHeight: 1.5 }}>{flag.message}</p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>{flag.source}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricPill({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#22c55e' : value >= 40 ? '#eab308' : '#ef4444'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  )
}

/* ── small helpers ── */
function Dot() {
  return <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#454e6a', display: 'inline-block' }} />
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ color: '#7d849e', fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 14px' }}>{title}</p>
      {children}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#12131c',
  border: '1px solid #252d44',
  borderRadius: 16,
  padding: '24px',
}

const sectionTitle: React.CSSProperties = {
  color: '#7d849e',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  margin: '0 0 20px',
}
