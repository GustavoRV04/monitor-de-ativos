import json
from pathlib import Path
import subprocess
import re
import time
from statistics import mean
from datetime import datetime


def carregar_status():

    if ARQ_STATUS.exists():

        try:

            with open(
                ARQ_STATUS,
                "r",
                encoding="utf-8"
            ) as f:

                return json.load(f)

        except Exception:

            pass

    return {}


def salvar_status(status):

    with open(
        ARQ_STATUS,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            status,
            f,
            ensure_ascii=False,
            indent=4
        )


def classificar(loss_medio):

    if loss_medio >= 80:
        return "INDISPONIVEL"

    elif loss_medio >= 20:
        return "DEGRADADO"

    return "OPERACIONAL"

def testar_mtu(ip):

    try:

        resultado = subprocess.run(
            [
                "ping",
                "-n",
                "1",
                "-f",
                "-l",
                "1472",
                ip
            ],
            capture_output=True,
            text=True,
            encoding="cp850",
            errors="ignore",
            timeout=5
        )

        return resultado.returncode == 0

    except Exception:

        return False


def testar_circuito(ip):

    try:

        resultado = subprocess.run(
            [
                "ping",
                "-n",
                str(PINGS_POR_CIRCUITO),
                ip
            ],
            capture_output=True,
            text=True,
            encoding="cp850",
            errors="ignore",
            timeout=50,
        )

        saida = resultado.stdout

        loss = 100


        perda = re.search(
            r"\((\d+)%\s+de\s+perda\)",
            saida,
            re.IGNORECASE
        )

        if perda:

            loss = int(
                perda.group(1)
            )

        latencia = None

        tempos = re.findall(
            r"tempo[=<](\d+)",   
            saida,
            re.IGNORECASE
        )

        if tempos:

            valores = [
                int(x)
                for x in tempos
            ]

            latencia = round(
                mean(valores),
                2
            )

        return {

            "loss":
                loss,

            "latencia":
                latencia

        }

    except Exception as erro:

        print()
        print("ERRO:", ip)
        print(erro)
        print()

        return {

            "loss": 100,
            "latencia": None

        }
    


BASE_DIR = Path(__file__).resolve().parent.parent

ARQ_CIRCUITOS = (
    BASE_DIR /
    "data" /
    "circuitos.json"
)

ARQ_STATUS = (
    BASE_DIR /
    "data" /
    "status_circuitos.json"
)

ARQ_CURSOR = (
    BASE_DIR /
    "data" /
    "cursor_circuitos.json"
)

TAMANHO_LOTE = 50

PINGS_POR_CIRCUITO = 25

TAMANHO_HISTORICO = 5


with open(
    ARQ_CIRCUITOS,
    "r",
    encoding="utf-8"
) as f:

    circuitos = json.load(f)

ips = []

for circuito in circuitos:

    ip = str(
        circuito.get(
            "ip_primario",
            ""
        )
    ).strip()

    if (
        ip
        and ip.lower() != "nan"
        and "." in ip
    ):
        ips.append(ip)

ips = sorted(
    list(set(ips))
)

if ARQ_CURSOR.exists():

    with open(
        ARQ_CURSOR,
        "r",
        encoding="utf-8"
    ) as f:

        cursor = json.load(f)

    posicao = cursor.get(
        "posicao",
        0
    )

else:

    posicao = 0

fim = posicao + TAMANHO_LOTE

lote = ips[
    posicao:fim
]

nova_posicao = fim

if nova_posicao >= len(ips):
    nova_posicao = 0

with open(
    ARQ_CURSOR,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        {
            "posicao":
            nova_posicao
        },
        f,
        indent=4
    )

print()
print(
    f"IPs totais: {len(ips)}"
)

print(
    f"Monitorando lote: {len(lote)}"
)

print(
    f"Próxima posição: {nova_posicao}"
)

status_atual = carregar_status()

print()
print(
    "Monitorando circuitos..."
)

inicio = time.time()
operacional = 0
degradado = 0
indisponivel = 0

for ip in lote:

    


    resultado = testar_circuito(ip)

    mtu = testar_mtu(ip)

    loss = resultado["loss"]

    latencia = resultado["latencia"]

    anterior = status_atual.get(
        ip,
        {}
    )

    historico_latencia = anterior.get(
        "historico_latencia",
        []
    )

    if latencia is not None:

        historico_latencia.append(
            latencia
        )

    historico_latencia = historico_latencia[-TAMANHO_HISTORICO:]

    latencia_media = None

    if historico_latencia:

        latencia_media = round(
            mean(historico_latencia),
            2
        )

    historico = anterior.get(
        "historico",
        []
    )

    historico_horas = anterior.get(
        "historico_horas",
        []
    )

    historico.append(loss)

    historico_horas.append(
        datetime.now().strftime(
            "%H:%M:%S"
        )
)

    historico = historico[-TAMANHO_HISTORICO:]

    historico_horas = historico_horas[-TAMANHO_HISTORICO:]

    loss_medio = round(
        mean(historico),
        2
    )

    status = classificar(
        loss_medio
    )

    if status == "OPERACIONAL":

        operacional += 1

    elif status == "DEGRADADO":

        degradado += 1

    else:

        indisponivel += 1


    status_atual[ip] = {

        "status":
            status,

        "loss_atual":
            loss,

        "loss_medio":
            loss_medio,

        "latencia_media":
            latencia_media,

        "mtu_status":
            "OK"
            if mtu
            else "REDUZIDO",

        "historico_latencia":
            historico_latencia,

        "historico":
            historico,

        "historico_horas":
            historico_horas,

        "ultima_atualizacao":
            datetime.now().strftime(
                "%d/%m/%Y %H:%M:%S"
            )

    }

    print(
        f"{ip} -> "
        f"{status} | "
        f"loss={loss}% | "
        f"lat={latencia}ms"
    )
print()
print("Resumo do lote")
print(f"🟢 Operacionais: {operacional}")
print(f"🟡 Degradados: {degradado}")
print(f"🔴 Indisponíveis: {indisponivel}")

fim = time.time()

print()
print(
    f"Tempo do lote: "
    f"{round(fim - inicio,2)}s"
)


salvar_status(
    status_atual
)

print()
print(
    f"Status atualizados: {len(lote)}"
)