import json
import re
import subprocess
import socket
import time

from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = Path(__file__).resolve().parent.parent
ARQ_RESULTADO = (
    BASE_DIR /
    "data" /
    "resultado_ping.json"
)

ARQ_EVENTOS = (
    BASE_DIR /
    "data" /
    "eventos.json"
)

with open(
    BASE_DIR / "data" / "inventario.json",
    "r",
    encoding="utf-8"
) as f:
    ativos = json.load(f)

resultado_anterior = []

if ARQ_RESULTADO.exists():

    try:

        with open(
            ARQ_RESULTADO,
            "r",
            encoding="utf-8"
        ) as f:

            resultado_anterior = json.load(f)

    except Exception:

        resultado_anterior = []


mapa_anterior = {
    x.get("host"): x
    for x in resultado_anterior
    if x.get("host")
}




def testar(ativo):
    host = ativo.get("host")

    PRECISION_COUNT = 2
    try:
        def run_ping_once():

            try:

                return subprocess.run(
                    ["ping", "-n", "1", host],
                    capture_output=True,
                    text=True,
                    timeout=2
                )

            except subprocess.TimeoutExpired:

                class PingTimeout:
                    stdout = ""
                    returncode = 1

            return PingTimeout()

        successes = 0
        latencias = []
        ttls = []
        success_flag = False

        for i in range(PRECISION_COUNT):
            resultado = run_ping_once()
            saida = resultado.stdout or ""
            out_l = saida.lower()

            # heuristics for success / timeout (supports PT-BR and EN)
            success = bool(re.search(r"reply from|resposta de|bytes=.*ttl=|ttl=", out_l))
            timeout_msgs = [
                r"request timed out",
                r"esgotado o tempo limite",
                r"destination host unreachable",
                r"host unreachable",
                r"destino inalcançavel",
            ]
            is_timeout = any(re.search(p, out_l) for p in timeout_msgs)

            m = re.search(r"(?:time|tempo)[=<>\s]*<?\s*(\d+)\s*ms", out_l)
            if not m:
                m = re.search(r"(\d+)\s*ms", out_l)
            if m:
                try:
                    lat = int(m.group(1))
                    latencias.append(lat)
                    match_ttl = re.search(r"ttl=(\d+)", out_l, re.IGNORECASE)
                    if match_ttl:
                        try:
                            ttls.append(int(match_ttl.group(1)))
                        except Exception:
                            pass
                except Exception:
                    pass

            if success or (resultado.returncode == 0 and not is_timeout):
                successes += 1
                success_flag = True

            # small pause between attempts to avoid bursts
            if i < PRECISION_COUNT - 1:
                time.sleep(0.08)

        # decide by majority
        needed = (PRECISION_COUNT // 2) + 1
        online = successes >= 1
        

        # compute average latency from successful samples
        latencia = None
        ttl = None
        if latencias:
            latencia = int(sum(latencias) / len(latencias))
        avg = None
        minimo = None
        maximo = None

        if latencias:
            avg = int(sum(latencias) / len(latencias))

            minimo = min(latencias)
            maximo = max(latencias)

        saude = "ONLINE"
        
        if not online: saude = "OFFLINE"
        
        elif latencia and latencia > 150: saude = "WARNING"
        
        elif (((PRECISION_COUNT - successes)/ PRECISION_COUNT) * 100) > 10: saude = "WARNING"

        if ttls:
            ttl = ttls[0]

        return {

        "equipamento":
            ativo.get("equipamento"),

        "host":
            host,

        "estado":
            ativo.get("estado"),

        "unidade":
            ativo.get("unidade"),

        "status":
            (
                "ONLINE"
                if online
                else "OFFLINE"
            ),

        "saude":
            saude,

        "latencia":
            latencia,

        "ttl":
            ttl,

        "avg":
            avg,

        "min":
            minimo,

        "max":
            maximo,

        "perda":
            round(
                (
                    (PRECISION_COUNT - successes)
                    / PRECISION_COUNT
                ) * 100,
                2
            ),

        "via":
            (
                "icmp"
                if success_flag
                else "unknown"
            ),

        "ultima_verificacao":
            datetime.now().strftime(
                "%d/%m/%Y %H:%M:%S"
            )

}
    except Exception as erro:

        print(
            f"ERRO HOST {host}: {erro}"
        )

        return {
            "equipamento": ativo.get("equipamento"),
            "host": host,
            "estado": ativo.get("estado"),
            "unidade": ativo.get("unidade"),
            "status": "OFFLINE",
            "latencia": None,
            "ttl": None,
            "via": "error",
            "ultima_verificacao":
                datetime.now().strftime(
                    "%d/%m/%Y %H:%M:%S"
                )
    }


with ThreadPoolExecutor(
    max_workers=30
) as executor:

    resultados = list(
        executor.map(
            testar,
            ativos
        )
    )

eventos = []

for atual in resultados:

    anterior = mapa_anterior.get(
        atual["host"]
    )

    if not anterior:
        continue

    status_anterior = anterior.get(
        "status"
    )

    status_atual = atual.get(
        "status"
    )

    saude_anterior = anterior.get(
    "saude",
    status_anterior
    )

    saude_atual = atual.get(
        "saude",
        status_atual
    )

    if (
        status_anterior != status_atual
        or
        saude_anterior != saude_atual
    ):

        eventos.append({

            "host": atual["host"],

            "equipamento":
                atual["equipamento"],

            "estado":
                atual["estado"],

            "unidade":
                atual["unidade"],

            "status_anterior":
                status_anterior,

            "status_novo":
                status_atual,

            "saude_anterior":
                saude_anterior,

            "saude_nova":
                saude_atual,

            "hora":
                datetime.now().strftime(
                    "%d/%m/%Y %H:%M:%S"
                )

    })


with open(
    BASE_DIR / "data" / "resultado_ping.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(resultados, f, indent=4, ensure_ascii=False)

eventos_existentes = []

if ARQ_EVENTOS.exists():

    try:

        with open(
            ARQ_EVENTOS,
            "r",
            encoding="utf-8"
        ) as f:

            eventos_existentes = json.load(f)

    except Exception:

        eventos_existentes = []


eventos_existentes.extend(
    eventos
)

eventos_existentes = (
    eventos_existentes[-500:]
)


with open(
    ARQ_EVENTOS,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        eventos_existentes,
        f,
        indent=4,
        ensure_ascii=False
    )

# cleanup temp files left in data folder
try:
    now = time.time()
    for p in (BASE_DIR / 'data').iterdir():
        if p.is_file() and p.name.startswith('tmp'):
            try:
                # more aggressive: remove tmp files older than 60 seconds
                if now - p.stat().st_mtime > 60:
                    # respect monitor lock: don't delete tmp files belonging to the active monitor
                    try:
                        lock_path = BASE_DIR / 'data' / 'monitor.lock'
                        if lock_path.exists():
                            import json as _json
                            lj = _json.load(open(lock_path, 'r', encoding='utf-8'))
                            lhost = lj.get('host')
                            if lhost:
                                prefix = f"tmp_monitor_{re.sub(r'[^A-Za-z0-9_-]', '_', lhost)}_"
                                if p.name.startswith(prefix):
                                    continue
                    except Exception:
                        pass
                    p.unlink()
            except Exception:
                pass
except Exception:
    pass


online = len(
    [x for x in resultados
     if x["status"] == "ONLINE"]
)

offline = len(
    [x for x in resultados
     if x["status"] == "OFFLINE"]
)

print()
print("ONLINE :", online)
print("OFFLINE:", offline)
print()
print("resultado_ping.json atualizado")
