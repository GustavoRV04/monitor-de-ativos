from pathlib import Path
import pandas as pd
import json
import re

BASE_DIR = Path(__file__).resolve().parent.parent

arquivo_ativos = (
    BASE_DIR /
    "data" /
    "Switches e roteadores.xlsx"
)

arquivo_circuitos = (
    BASE_DIR /
    "data" /
    "Circuitos.xlsx"
)

saida_inventario = (
    BASE_DIR /
    "data" /
    "inventario.json"
)

saida_organizado = (
    BASE_DIR /
    "data" /
    "inventario_organizado.json"
)

saida_circuitos = (
    BASE_DIR /
    "data" /
    "circuitos.json"
)

saida_circuitos_organizado = (
    BASE_DIR /
    "data" /
    "circuitos_organizado.json"
)


print("Lendo planilhas...")

# =====================================================
# ATIVOS
# =====================================================

df_roteadores = pd.read_excel(
    arquivo_ativos,
    sheet_name="Roteadores",
    engine="openpyxl"
)

df_switches = pd.read_excel(
    arquivo_ativos,
    sheet_name="Switches",
    engine="openpyxl"
)

df_roteadores = df_roteadores.rename(
    columns={
        "Nome ": "HOST"
    }
)

df_switches = df_switches.rename(
    columns={
        "Switch": "HOST"
    }
)

df_ativos = pd.concat(
    [
        df_roteadores[
            ["HOST", "IP"]
        ],
        df_switches[
            ["HOST", "IP"]
        ]
    ],
    ignore_index=True
)

# =====================================================
# CIRCUITOS
# =====================================================

df_circuitos = pd.read_excel(
    arquivo_circuitos,
    engine="openpyxl"
)

rede_zero = df_circuitos[
    df_circuitos["Tipo de Circuito"]
        .astype(str)
        .str.upper()
        .str.contains(
            "REDE 0",
            na=False
        )
]

# =====================================================
# MAPA DAS UNIDADES
# =====================================================

mapa_unidades = {}

for _, linha in rede_zero.iterrows():

    uf = str(
        linha["UF"]
    ).strip().upper()

    cgc = str(
        linha["CGC"]
    ).strip().zfill(4)

    chave = f"{uf}{cgc}"

    nome_unidade = str(
        linha["Ponto Atendimento"]
    ).strip()

    mapa_unidades[chave] = {

        "estado":
            uf,

        "cgc":
            cgc,

        "nome_unidade":
            nome_unidade,

        "unidade":
            f"{cgc} - {nome_unidade}"

    }


# =====================================================
# EXTRAÇÃO UF + CGC
# =====================================================

def extrair_chave(host):

    host = str(host).upper()

    match = re.search(
        r"([A-Z]{2})(\d{4})",
        host
    )

    if not match:
        return None

    return (
        match.group(1)
        +
        match.group(2)
    )

# =====================================================
# INVENTÁRIO
# =====================================================

inventario = []

for _, linha in df_ativos.iterrows():

    host = str(
        linha["HOST"]
    ).strip()

    ip = str(
        linha["IP"]
    ).strip()

    chave = extrair_chave(
        host
    )

    if not chave:
        continue

    dados_unidade = mapa_unidades.get(
        chave
    )

    if not dados_unidade:
        continue

    host_upper = host.upper()

    tipo = "OUTRO"

    if "RA" in host_upper:
        tipo = "ROTEADOR"

    elif "SW" in host_upper:
        tipo = "SWITCH"

    inventario.append({

        "estado":
            dados_unidade["estado"],

        "cgc":
            dados_unidade["cgc"],

        "unidade":
            dados_unidade["unidade"],

        "equipamento":
            host,

        "host":
            host,

        "ip":
            ip,

        "tipo":
            tipo

    })

# =====================================================
# INVENTÁRIO ORGANIZADO
# =====================================================

inventario_organizado = {}

for ativo in inventario:

    estado = ativo["estado"]

    unidade = ativo["unidade"]

    if estado not in inventario_organizado:

        inventario_organizado[
            estado
        ] = {}

    if unidade not in inventario_organizado[
        estado
    ]:

        inventario_organizado[
            estado
        ][
            unidade
        ] = []

    inventario_organizado[
        estado
    ][
        unidade
    ].append(
        ativo
    )

# =====================================================
# SALVAR
# =====================================================

with open(
    saida_inventario,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        inventario,
        f,
        ensure_ascii=False,
        indent=4
    )

with open(
    saida_organizado,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        inventario_organizado,
        f,
        ensure_ascii=False,
        indent=4
    )


# =====================================================
# CIRCUITOS
# =====================================================

circuitos = []

for _, linha in df_circuitos.iterrows():

    circuitos.append({

        "estado":
            str(linha["UF"]).strip().upper(),

        "cgc":
            str(linha["CGC"]).strip().zfill(4),

        "unidade":
            f"{str(linha['CGC']).strip().zfill(4)} - {str(linha['Ponto Atendimento']).strip()}",

        "tipo_circuito":
            str(
                linha["Tipo de Circuito"]
            ).strip(),

        "velocidade":
            str(
                linha["Velocidade"]
            ).strip(),

        "designacao":
            str(
                linha["Designação"]
            ).strip(),

        "operadora":
            str(
                linha["Operadora"]
            ).strip(),

        "status":
            str(
                linha["Status"]
            ).strip(),

        "ip_primario":
            str(
                linha["Ip Primário"]
            ).strip(),

        "ip_secundario":
            str(
                linha["Ip Secundário"]
            ).strip()

    })

# =====================================================
# CIRCUITOS ORGANIZADOS
# =====================================================

circuitos_organizado = {}

for circuito in circuitos:

    estado = circuito["estado"]
    unidade = circuito["unidade"]

    if estado not in circuitos_organizado:
        circuitos_organizado[estado] = {}

    if unidade not in circuitos_organizado[estado]:
        circuitos_organizado[estado][unidade] = []

    circuitos_organizado[estado][unidade].append(circuito)

# =====================================================
# SALVAR CIRCUITOS
# =====================================================

with open(
    saida_circuitos,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        circuitos,
        f,
        ensure_ascii=False,
        indent=4
    )

with open(
    saida_circuitos_organizado,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        circuitos_organizado,
        f,
        ensure_ascii=False,
        indent=4
    )

print("circuitos.json criado")
print("circuitos_organizado.json criado")

print()
print("====================================")
print(f"Roteadores: {len(df_roteadores)}")
print(f"Switches: {len(df_switches)}")
print(f"Total lido: {len(df_ativos)}")
print(f"Ativos associados: {len(inventario)}")
print(f"Circuitos: {len(circuitos)}")
print("====================================")

print()
print("inventario.json criado")
print("inventario_organizado.json criado")