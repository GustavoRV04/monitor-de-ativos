import json
import re
import subprocess
import sys
import time
import socket
from tempfile import NamedTemporaryFile

from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent

ARQ_SAIDA = (
    BASE_DIR /
    "data" /
    "ping_detalhado.json"
)

if len(sys.argv) < 2:

    print("Informe o host")

    sys.exit()

host = sys.argv[1]

historico = []

while True:

    inicio_ciclo = time.time()

    try:

        PRECISION_COUNT = 1

        def run_ping_once():

            try:

                return subprocess.run(["ping", "-n", "1", host], capture_output=True,text=True, timeout=1)

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

            # detect success lines
            success = bool(re.search(r"reply from|resposta de|bytes=.*ttl=|ttl=", out_l))

            # detect explicit timeout/unreachable messages
            timeout_msgs = [
                r"request timed out",
                r"esgotado o tempo limite",
                r"destination host unreachable",
                r"host unreachable",
                r"destino inalcançavel",
            ]

            is_timeout = any(re.search(p, out_l) for p in timeout_msgs)

            # extract latency if present
            m = re.search(r"(?:time|tempo)[=<>\s]*<?\s*(\d+)\s*ms", out_l)
            if not m:
                m = re.search(r"(\d+)\s*ms", out_l)

            if m:
                try:
                    latencias.append(int(m.group(1)))
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

            if i < PRECISION_COUNT - 1:
                time.sleep(0.08)

        needed = (PRECISION_COUNT // 2) + 1
        online = successes >= needed

        tempo = None
        if latencias:
            tempo = int(sum(latencias) / len(latencias))


        entry = {

    "host": host,

    "hora": datetime.now().strftime(
        "%H:%M:%S"
    ),

    "tempo": tempo,

    "ttl":
        max(ttls)
        if ttls
        else None,

    "status":
        "ONLINE"
        if online
        else "OFFLINE",

    "enviados":
        PRECISION_COUNT,

    "recebidos":
        successes,

    "perdidos":
        PRECISION_COUNT - successes,

    "via": None
}

        historico.append(entry)

        historico_online = [
            x["tempo"]
            for x in historico
            if x.get("tempo") is not None
        ]

        if historico_online:

            historico[-1]["min"] = min(
                historico_online
        )   

            historico[-1]["max"] = max(
               historico_online
        )

            historico[-1]["avg"] = int(
                sum(historico_online)
                / len(historico_online)
        )

        else:

            historico[-1]["min"] = None

            historico[-1]["max"] = None

            historico[-1]["avg"] = None

        total_enviados = sum(
            x.get("enviados", 0)
            for x in historico
        )

        total_perdidos = sum(
            x.get("perdidos", 0)
            for x in historico
        )

        historico[-1]["loss"] = (
            round(
                (
                total_perdidos /
                total_enviados
            ) * 100,
            2
    )
    if total_enviados
    else 0
)

        # If ICMP failed, try quick retries then TCP fallback (to avoid transient false negatives)
        if historico and historico[-1]["status"] == "OFFLINE":
            retried = False
            for _ in range(2):
                time.sleep(0.15)
                resultado = run_ping_once()
                saida = resultado.stdout or ""
                out_l = saida.lower()
                success = bool(re.search(r"reply from|resposta de|bytes=.*ttl=|ttl=", out_l))
                timeout_msgs = [
                    r"request timed out",
                    r"esgotado o tempo limite",
                    r"destination host unreachable",
                    r"host unreachable",
                    r"destino inalcançavel",
                ]
                is_timeout = any(re.search(p, out_l) for p in timeout_msgs)
                if success or (resultado.returncode == 0 and not is_timeout):
                    # update entry from this successful retry
                    try:
                        m = re.search(r"(?:time|tempo)[=<>\s]*<?\s*(\d+)\s*ms", out_l)
                        if not m:
                            m = re.search(r"(\d+)\s*ms", out_l)
                        tcp_tempo = None
                        if m:
                            tcp_tempo = int(m.group(1))
                        historico[-1]["status"] = "ONLINE"
                        historico[-1]["via"] = "icmp"
                        if historico[-1].get("tempo") is None and tcp_tempo is not None:
                            historico[-1]["tempo"] = tcp_tempo
                    except Exception:
                        pass
                    retried = True
                    break

            if not retried:
                tcp_ok = False
                tcp_tempo = None
                # try more ports and slightly longer timeout to detect management interfaces
                for port in (22, 23, 80, 443, 8080):
                    try:
                        start = time.time()
                        sock = socket.create_connection((host, port), timeout=1.2)
                        tcp_tempo = int((time.time() - start) * 1000)
                        sock.close()
                        tcp_ok = True
                        break
                    except Exception:
                        continue

                if tcp_ok:
                    historico[-1]["status"] = "ONLINE"
                    historico[-1]["via"] = "tcp"
                    if tempo is None:
                        tempo = tcp_tempo
                        historico[-1]["tempo"] = tempo

        historico = historico[-100:]

        # write to temp file then move to avoid partial writes and handle OneDrive locks
        try:
            # write temp files using a host-specific prefix so cleanup can identify them
            safe_host = re.sub(r'[^A-Za-z0-9_-]', '_', host)
            with NamedTemporaryFile("w", delete=False, encoding="utf-8", dir=str(ARQ_SAIDA.parent), prefix=f"tmp_monitor_{safe_host}_") as tf:
                json.dump(historico, tf, indent=4, ensure_ascii=False)
            # atomic replace
            Path(tf.name).replace(ARQ_SAIDA)
        except PermissionError as e:
            # retry a few times if OneDrive or lock prevents writing
            tries = 0
            written = False
            while tries < 3 and not written:
                try:
                    time.sleep(0.5)
                    with NamedTemporaryFile("w", delete=False, encoding="utf-8", dir=str(ARQ_SAIDA.parent), prefix=f"tmp_monitor_{safe_host}_") as tf:
                        json.dump(historico, tf, indent=4, ensure_ascii=False)
                    Path(tf.name).replace(ARQ_SAIDA)
                    written = True
                except PermissionError:
                    tries += 1
            if not written:
                print(f"PermissionError escrevendo {ARQ_SAIDA}: {e}")

        # cleanup stale temp files in the data folder (leftovers from previous runs)
        try:
            now = time.time()
            # when monitor lock exists, avoid deleting tmp files that belong to the current monitored host
            lock_host_prefix = None
            try:
                lock_path = BASE_DIR / 'data' / 'monitor.lock'
                if lock_path.exists():
                    import json as _json
                    lj = _json.load(open(lock_path, 'r', encoding='utf-8'))
                    lhost = lj.get('host')
                    if lhost:
                        lock_host_prefix = f"tmp_monitor_{re.sub(r'[^A-Za-z0-9_-]', '_', lhost)}_"
            except Exception:
                lock_host_prefix = None

            for p in ARQ_SAIDA.parent.iterdir():
                if p.is_file() and p.name.startswith('tmp'):
                    try:
                        # more aggressive: remove tmp files older than 60 seconds
                        if now - p.stat().st_mtime > 60:
                            # skip files that belong to the current monitor lock
                            if lock_host_prefix and p.name.startswith(lock_host_prefix):
                                continue
                            p.unlink()
                    except Exception:
                        pass
        except Exception:
            pass

        duracao = time.time() - inicio_ciclo

        espera = max(0, 1 - duracao)

        time.sleep(espera)

    except Exception as erro:

        print(erro)

        time.sleep(1)