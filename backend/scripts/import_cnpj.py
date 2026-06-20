"""
Importa os arquivos CSV da Receita Federal para o banco SQLite.

Uso:
    python scripts/import_cnpj.py --data-dir /caminho/para/csvs/

Os arquivos devem estar descompactados. Nomes esperados (glob):
    Empresas*.csv          → tabela empresas
    Estabelecimentos*.csv  → tabela estabelecimentos
    Socios*.csv            → tabela socios
    Simples.csv            → tabela simples
    Cnaes.csv              → tabela cnaes
    Motivos.csv            → tabela motivos
    Municipios.csv         → tabela municipios
    Naturezas.csv          → tabela naturezas
    Paises.csv             → tabela paises
    Qualificacoes.csv      → tabela qualificacoes
"""

import argparse
import csv
import os
import sqlite3
import sys
import time
from pathlib import Path

ENCODING = "latin-1"
SEPARATOR = ";"
BATCH_SIZE = 10_000

DB_PATH = os.getenv("DB_PATH", "./cnpj.db")
SCHEMA_PATH = Path(__file__).parent.parent / "db" / "schema.sql"


# Mapeamento: (glob_pattern, tabela, colunas_em_ordem)
TABLES = [
    (
        "Cnaes*.csv",
        "cnaes",
        ["codigo", "descricao"],
    ),
    (
        "Motivos*.csv",
        "motivos",
        ["codigo", "descricao"],
    ),
    (
        "Municipios*.csv",
        "municipios",
        ["codigo", "descricao"],
    ),
    (
        "Naturezas*.csv",
        "naturezas",
        ["codigo", "descricao"],
    ),
    (
        "Paises*.csv",
        "paises",
        ["codigo", "descricao"],
    ),
    (
        "Qualificacoes*.csv",
        "qualificacoes",
        ["codigo", "descricao"],
    ),
    (
        "Empresas*.csv",
        "empresas",
        [
            "cnpj_basico", "razao_social", "natureza_juridica",
            "qualificacao_responsavel", "capital_social", "porte_empresa",
            "ente_federativo",
        ],
    ),
    (
        "Estabelecimentos*.csv",
        "estabelecimentos",
        [
            "cnpj_basico", "cnpj_ordem", "cnpj_dv", "identificador_mf",
            "nome_fantasia", "situacao_cadastral", "data_situacao_cadastral",
            "motivo_situacao_cadastral", "data_inicio_atividade",
            "cnae_fiscal_principal", "cnae_fiscal_secundaria",
            "logradouro", "numero", "cep", "bairro", "municipio", "uf",
            "ddd_1", "telefone_1", "ddd_2", "telefone_2",
            "correio_eletronico", "situacao_especial", "data_situacao_especial",
        ],
    ),
    (
        "Simples*.csv",
        "simples",
        [
            "cnpj_basico", "opcao_pelo_simples", "data_opcao_simples",
            "data_exclusao_simples", "opcao_pelo_mei", "data_opcao_mei",
            "data_exclusao_mei",
        ],
    ),
    (
        "Socios*.csv",
        "socios",
        [
            "cnpj_basico", "identificador_socio", "nome_socio",
            "qualificacao_socio", "data_entrada_sociedade", "pais", "faixa_etaria",
        ],
    ),
]


def init_schema(conn: sqlite3.Connection) -> None:
    schema = SCHEMA_PATH.read_text()
    conn.executescript(schema)
    conn.commit()
    print("✓ Schema criado")


def import_table(
    conn: sqlite3.Connection,
    data_dir: Path,
    glob: str,
    table: str,
    columns: list[str],
) -> None:
    files = sorted(data_dir.glob(glob))
    if not files:
        print(f"  [skip] Nenhum arquivo para {table} ({glob})")
        return

    placeholders = ", ".join("?" * len(columns))
    sql = f"INSERT OR IGNORE INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"

    total = 0
    for filepath in files:
        print(f"  → {filepath.name}")
        t0 = time.time()
        batch: list[tuple] = []

        with open(filepath, encoding=ENCODING, errors="replace") as f:
            reader = csv.reader(f, delimiter=SEPARATOR)
            for row in reader:
                if not row:
                    continue
                # preenche/corta para o número exato de colunas
                padded = (row + [""] * len(columns))[: len(columns)]
                batch.append(tuple(padded))

                if len(batch) >= BATCH_SIZE:
                    conn.executemany(sql, batch)
                    conn.commit()
                    total += len(batch)
                    batch.clear()

        if batch:
            conn.executemany(sql, batch)
            conn.commit()
            total += len(batch)

        elapsed = time.time() - t0
        print(f"     {total:,} registros em {elapsed:.1f}s")

    print(f"✓ {table}: {total:,} registros importados")


def build_indexes(conn: sqlite3.Connection) -> None:
    conn.execute("CREATE INDEX IF NOT EXISTS idx_estab_cnpj  ON estabelecimentos (cnpj_basico)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_socios_cnpj ON socios (cnpj_basico)")
    conn.commit()
    print("✓ Índices criados")


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa CSVs da Receita Federal para SQLite")
    parser.add_argument("--data-dir", required=True, help="Pasta com os CSVs descompactados")
    parser.add_argument("--db", default=DB_PATH, help=f"Caminho do banco SQLite (padrão: {DB_PATH})")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.is_dir():
        print(f"Erro: {data_dir} não é um diretório válido", file=sys.stderr)
        sys.exit(1)

    print(f"Banco: {args.db}")
    print(f"Dados: {data_dir}\n")

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=100000")

    init_schema(conn)

    for glob, table, columns in TABLES:
        import_table(conn, data_dir, glob, table, columns)

    build_indexes(conn)
    conn.close()
    print("\nImportação concluída!")


if __name__ == "__main__":
    main()
