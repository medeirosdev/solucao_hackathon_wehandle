export interface DimensionWeight {
  id: string
  label: string
  weight: number
  enabled: boolean
}

export interface AnalysisRequest {
  cnpj: string
  context: string
  weights: DimensionWeight[]
  documents: File[]
}

export interface DimensionScore {
  id: string
  label: string
  score: number
  maxScore: number
  detail: string
}

export interface HardGate {
  id: string
  label: string
  triggered: boolean
  multiplier: number
  detail: string
}

export interface RedFlag {
  severity: 'critical' | 'warning' | 'info'
  message: string
  source: string
}

export interface DocumentAnalysis {
  fileName: string
  tipo: string
  resumo: string
  insights: string[]
  redFlags: RedFlag[]
  confiabilidade: number
  compatibilidade: number
  scoreDocumento: number
}

export interface AnalysisResult {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  situacaoCadastral: string
  uf: string
  municipio: string
  cnae: string
  cnaeDescricao: string
  porte: string
  dataAberturaAtividade: string
  scoreFormula: number
  scoreIA: number
  dimensions: DimensionScore[]
  hardGates: HardGate[]
  redFlags: RedFlag[]
  parecerIA: string
  conflitoCNAE: string | null
  fontesDados: string[]
  documents?: DocumentAnalysis[]
}

export interface LoadingStep {
  id: string
  label: string
  status: 'pending' | 'loading' | 'done' | 'error'
}
