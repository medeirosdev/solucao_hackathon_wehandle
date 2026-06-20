import type { AnalysisRequest, AnalysisResult, DocumentAnalysis } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const USE_MOCK  = import.meta.env.VITE_MOCK === 'true'

export async function analyzeCompany(request: AnalysisRequest): Promise<AnalysisResult> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1200))
    const mock = buildMock(request.cnpj)

    // se há documentos, chama o backend real apenas para validação de docs
    if (request.documents.length > 0) {
      try {
        const docs = await validateDocuments(
          request.documents,
          request.cnpj,
          mock.razaoSocial,
          request.context,
        )
        mock.documents = docs
      } catch {
        // backend indisponível — segue sem docs
      }
    }

    return mock
  }

  const formData = new FormData()
  formData.append('data', JSON.stringify({
    cnpj: request.cnpj,
    context: request.context,
    weights: request.weights,
  }))
  request.documents.forEach(f => formData.append('documents', f))

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) throw new Error(`Erro na análise: ${res.status}`)
  return _mapResponse(await res.json())
}

async function validateDocuments(
  files: File[],
  cnpj: string,
  razaoSocial: string,
  context: string,
): Promise<DocumentAnalysis[]> {
  const formData = new FormData()
  formData.append('cnpj', cnpj)
  formData.append('razao_social', razaoSocial)
  formData.append('context', context)
  files.forEach(f => formData.append('documents', f))

  const res = await fetch(`${API_BASE}/validate-documents`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) throw new Error(`Erro na validação: ${res.status}`)
  const data = await res.json()
  return (data.documents ?? []).map(_mapDoc)
}

function _mapDoc(d: Record<string, unknown>): DocumentAnalysis {
  return {
    fileName:        String(d.file_name ?? d.fileName ?? ''),
    tipo:            String(d.tipo ?? 'Documento'),
    resumo:          String(d.resumo ?? ''),
    insights:        (d.insights as string[]) ?? [],
    redFlags:        (d.red_flags as DocumentAnalysis['redFlags']) ?? [],
    confiabilidade:  Number(d.confiabilidade ?? 0),
    compatibilidade: Number(d.compatibilidade ?? 0),
    scoreDocumento:  Number(d.score_documento ?? d.scoreDocumento ?? 0),
  }
}

function _mapResponse(d: Record<string, unknown>): AnalysisResult {
  return {
    cnpj:                  String(d.cnpj ?? ''),
    razaoSocial:           String(d.razao_social ?? ''),
    nomeFantasia:          String(d.nome_fantasia ?? ''),
    situacaoCadastral:     String(d.situacao_cadastral ?? ''),
    uf:                    String(d.uf ?? ''),
    municipio:             String(d.municipio ?? ''),
    cnae:                  String(d.cnae ?? ''),
    cnaeDescricao:         String(d.cnae_descricao ?? ''),
    porte:                 String(d.porte ?? ''),
    dataAberturaAtividade: String(d.data_abertura_atividade ?? ''),
    scoreFormula:          Number(d.score_formula ?? 0),
    scoreIA:               Number(d.score_ia ?? 0),
    dimensions:            (d.dimensions as AnalysisResult['dimensions']) ?? [],
    hardGates:             (d.hard_gates  as AnalysisResult['hardGates'])  ?? [],
    redFlags:              (d.red_flags   as AnalysisResult['redFlags'])   ?? [],
    parecerIA:             String(d.parecer_ia ?? ''),
    conflitoCNAE:          (d.conflito_cnae as string | null) ?? null,
    fontesDados:           (d.fontes_dados as string[]) ?? [],
    documents:             ((d.documents as unknown[]) ?? []).map(x => _mapDoc(x as Record<string, unknown>)),
  }
}

function buildMock(cnpj: string): AnalysisResult {
  return {
    cnpj,
    razaoSocial:         'CONSTRUTORA ALFA LTDA',
    nomeFantasia:        'Alfa Construções',
    situacaoCadastral:   '02 - Ativa',
    uf:                  'SP',
    municipio:           'Campinas',
    cnae:                '4120400',
    cnaeDescricao:       'Construção de edifícios',
    porte:               'EPP',
    dataAberturaAtividade: '20150310',
    scoreFormula: 81,
    scoreIA:      74,
    dimensions: [
      { id: 'longevidade',           label: 'Longevidade',            score: 24, maxScore: 30, detail: 'Empresa com 10 anos de mercado' },
      { id: 'porte_capital',         label: 'Porte + Capital',        score: 15, maxScore: 20, detail: 'EPP · Capital R$ 250.000' },
      { id: 'estabilidade_societaria', label: 'Estabilidade Societária', score: 17, maxScore: 20, detail: '2 sócios PF · média 8 anos' },
      { id: 'regularidade_tributaria', label: 'Regularidade Tributária', score: 15, maxScore: 15, detail: 'Optante Simples Nacional ativo' },
      { id: 'completude_cadastral',  label: 'Completude Cadastral',   score: 10, maxScore: 15, detail: 'Email e endereço presentes, sem telefone 2' },
    ],
    hardGates: [
      { id: 'situacao_cadastral', label: 'Situação Cadastral', triggered: false, multiplier: 1.0, detail: 'Empresa ATIVA na Receita Federal' },
      { id: 'situacao_especial',  label: 'Situação Especial',  triggered: false, multiplier: 1.0, detail: 'Sem falência ou recuperação judicial' },
      { id: 'ceis',               label: 'CEIS / CNEP',        triggered: false, multiplier: 1.0, detail: 'Empresa não consta nas listas de sanções federais' },
      { id: 'lista_suja',         label: 'Lista Suja MTE',     triggered: false, multiplier: 1.0, detail: 'Empresa não consta no cadastro de trabalho escravo' },
    ],
    redFlags: [
      {
        severity: 'warning',
        message:  'Empresa sem telefone secundário cadastrado na Receita Federal.',
        source:   'Receita Federal — ESTABELECIMENTOS',
      },
      {
        severity: 'info',
        message:  'Capital social de R$ 250.000 — adequado para EPP mas pode ser limitante para contratos acima de R$ 2M.',
        source:   'Receita Federal — EMPRESAS',
      },
    ],
    parecerIA: 'A empresa apresenta perfil cadastral sólido com 10 anos de operação contínua no setor de construção civil. O CNAE principal (Construção de edifícios) é coerente com o contexto de contratação informado. Os sócios estão estáveis na sociedade há mais de 8 anos em média, indicando baixo risco de ruptura societária. Não foram identificadas restrições em listas públicas.',
    conflitoCNAE: null,
    fontesDados: [
      'Receita Federal do Brasil',
      'Portal da Transparência — CEIS/CNEP',
      'Ministério do Trabalho — Lista Suja',
      'Consumidor.gov.br — SENACON',
      'IBGE — Dados Municipais',
    ],
  }
}
