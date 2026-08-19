from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS

import subprocess
import sys
import time
import threading
from pathlib import Path

app = Flask(__name__)
CORS(app)

processo_ping = None
BASE_DIR = Path(__file__).resolve().parent.parent


@app.route("/")
def home():
    return send_from_directory(str(BASE_DIR / "output"), "painel.html")


@app.route("/design")
def design():
    return send_from_directory(str(BASE_DIR / "output"), "painel_design.html")


@app.route("/monitor")
def monitor():
    return send_from_directory(str(BASE_DIR / "output"), "monitor.html")


@app.route("/data/<path:arquivo>")
def data(arquivo):
    return send_from_directory(str(BASE_DIR / "data"), arquivo)

@app.route("/data/eventos")
def eventos():
    return send_from_directory(str(BASE_DIR / "data"),"eventos.json")


@app.route("/assets/<path:arquivo>")
def assets(arquivo):
    return send_from_directory(str(BASE_DIR / "assets"), arquivo)


@app.route("/multi-ping/<estado>/<path:unidade>")
@app.route("/unidade/<estado>/<path:unidade>")
def unidade_view(estado, unidade):
    return send_from_directory(str(BASE_DIR / "output"), "multi_ping.html")


@app.route("/circuitos")
def circuitos():

    return send_from_directory(
        str(BASE_DIR / "output"),
        "circuitos.html"
    )

@app.route("/monitorar/<host>")
def monitorar(host):

    global processo_ping

    if processo_ping:
        try:
            if processo_ping.poll() is None:
                processo_ping.terminate()
                waited = 0.0
                while waited < 2.0 and processo_ping.poll() is None:
                    time.sleep(0.1)
                    waited += 0.1
                if processo_ping.poll() is None:
                    processo_ping.kill()
        except Exception:
            try:
                processo_ping.kill()
            except Exception:
                pass

    print(f"Iniciando monitor para: {host}")

    processo_ping = subprocess.Popen(
        [
            sys.executable,
            str(BASE_DIR / "python" / "monitorar_ping.py"),
            host
        ]
    )

    print("PID:", processo_ping.pid)

    # create a monitor lock file to indicate which host is being monitored
    try:
        lock = {
            "host": host,
            "pid": processo_ping.pid,
            "started": time.time()
        }
        with open(BASE_DIR / "data" / "monitor.lock", "w", encoding="utf-8") as lf:
            import json
            json.dump(lock, lf)
    except Exception:
        pass

    return {
        "status": "ok",
        "host": host
    }
@app.route(
    "/encerrar-monitor",
    methods=["POST"]
)
def encerrar_monitor():

    global processo_ping

    if processo_ping:

        try:

            if processo_ping.poll() is None:
                processo_ping.kill()

        except Exception:
            pass

    try:

        lock_path = (
            BASE_DIR /
            "data" /
            "monitor.lock"
        )

        if lock_path.exists():
            lock_path.unlink()

    except Exception:
        pass

    print(
        "Monitor encerrado"
    )

    return {
        "status": "ok"
    }

@app.route(
    "/api/ping-manual",
    methods=["POST"]
)
def ping_manual():

    try:

        payload = request.get_json()

        host = (
            payload.get("host", "")
            .strip()
        )

        if not host:

            return jsonify({
                "erro":
                "host_vazio"
            }), 400

        resultado = subprocess.run(
            [
                "ping",
                "-n",
                "1",
                host
            ],
            capture_output=True,
            text=True,
            timeout=3
        )

        saida = (
            resultado.stdout
            or ""
        )

        import re

        latencia = None
        ttl = None

        m = re.search(
            r"(\d+)\s*ms",
            saida,
            re.IGNORECASE
        )

        if m:

            latencia = int(
                m.group(1)
            )

        ttl_match = re.search(
            r"ttl=(\d+)",
            saida,
            re.IGNORECASE
        )

        if ttl_match:

            ttl = int(
                ttl_match.group(1)
            )

        return jsonify({

            "host":
                host,

            "status":
                "ONLINE"
                if resultado.returncode == 0
                else "OFFLINE",

            "latencia":
                latencia,

            "ttl":
                ttl

        })

    except Exception as erro:

        return jsonify({

            "status":
                "ERROR",

            "erro":
                str(erro)

        }), 500


@app.route(
    "/api/remover_ativo",
    methods=["POST"]
)

def remover_ativo():
    import json
    from datetime import datetime

    try:

        payload = request.get_json(force=True)

        host = str(
            payload.get("host", "")
        ).strip()

        motivo = str(
            payload.get("motivo", "")
        ).strip()

        if not host:

            return jsonify({
                "erro": "host_vazio"
            }), 400

        if not motivo:

            return jsonify({
                "erro": "motivo_obrigatorio"
            }), 400

        inv_file = (
            BASE_DIR /
            "data" /
            "inventario.json"
        )

        inv_org_file = (
            BASE_DIR /
            "data" /
            "inventario_organizado.json"
        )

        desmob_file = (
            BASE_DIR /
            "data" /
            "desmobilizados.json"
        )

        with open(
            inv_file,
            "r",
            encoding="utf-8"
        ) as f:

            inventario = json.load(f)

        with open(
            inv_org_file,
            "r",
            encoding="utf-8"
        ) as f:

            inventario_org = json.load(f)

        ativo = next(
            (
                x
                for x in inventario
                if x.get("host") == host
            ),
            None
        )

        if not ativo:

            return jsonify({
                "erro": "ativo_nao_encontrado"
            }), 404

        desmobilizados = []

        if desmob_file.exists():

            try:

                with open(
                    desmob_file,
                    "r",
                    encoding="utf-8"
                ) as f:

                    desmobilizados = json.load(f)

            except Exception:

                desmobilizados = []

        desmobilizados.append({

            "host":
                ativo.get("host"),

            "equipamento":
                ativo.get("equipamento"),

            "estado":
                ativo.get("estado"),

            "unidade":
                ativo.get("unidade"),

            "motivo":
                motivo,

            "data":
                datetime.now().strftime(
                    "%d/%m/%Y %H:%M:%S"
                )

        })

        with open(
            desmob_file,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                desmobilizados,
                f,
                indent=4,
                ensure_ascii=False
            )

        inventario = [

            x

            for x in inventario

            if x.get("host") != host

        ]

        estado = ativo.get("estado")
        unidade = ativo.get("unidade")

        if (
            estado in inventario_org
            and
            unidade in inventario_org[estado]
        ):

            inventario_org[estado][unidade] = [

                x

                for x in inventario_org[estado][unidade]

                if x.get("host") != host

            ]

        with open(
            inv_file,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                inventario,
                f,
                indent=4,
                ensure_ascii=False
            )

        with open(
            inv_org_file,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                inventario_org,
                f,
                indent=4,
                ensure_ascii=False
            )

        return jsonify({

            "status": "ok",

            "host": host

        })

    except Exception as erro:

        return jsonify({

            "erro": str(erro)

        }), 500


@app.route('/api/add_asset', methods=['POST'])
def api_add_asset():
    """Add a new asset to inventario.json and inventario_organizado.json atomically."""
    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "invalid-json"}), 400

    required = ["estado", "unidade", "equipamento", "host"]
    for r in required:
        if r not in payload or not str(payload[r]).strip():
            return jsonify({"error": f"missing_{r}"}), 400

    estado = str(payload["estado"]).strip()
    unidade = str(payload["unidade"]).strip()
    equipamento = str(payload["equipamento"]).strip()
    host = str(payload["host"]).strip()

    data_dir = BASE_DIR / "data"
    inv_org_file = data_dir / "inventario_organizado.json"
    inv_file = data_dir / "inventario.json"

    import json, tempfile

    # load files
    try:
        with open(inv_org_file, 'r', encoding='utf-8') as f:
            inv_org = json.load(f)
    except Exception:
        inv_org = {}

    try:
        with open(inv_file, 'r', encoding='utf-8') as f:
            inv = json.load(f)
    except Exception:
        inv = []

    # check duplicate host
    if any(x.get('host') == host for x in inv):
        return jsonify({"error": "exists", "host": host}), 409

    # ensure state and unit
    if estado not in inv_org:
        inv_org[estado] = {}

    if unidade not in inv_org[estado]:
        inv_org[estado][unidade] = []

    new_entry = {
        "estado": estado,
        "unidade": unidade,
        "equipamento": equipamento,
        "host": host
    }

    inv_org[estado][unidade].append(new_entry)
    inv.append(new_entry)

    # atomic write helper
    def atomic_write(path, obj):
        s = json.dumps(obj, ensure_ascii=False, indent=4)
        tmp = None
        try:
            tf = tempfile.NamedTemporaryFile(mode='w', delete=False, encoding='utf-8', dir=str(path.parent), prefix='tmp_write_')
            tf.write(s)
            tf.flush()
            tf.close()
            tmp = Path(tf.name)
            tmp.replace(path)
            return True
        except Exception as e:
            try:
                if tmp and tmp.exists():
                    tmp.unlink()
            except Exception:
                pass
            return False

    ok1 = atomic_write(inv_org_file, inv_org)
    ok2 = atomic_write(inv_file, inv)

    if not (ok1 and ok2):
        return jsonify({"error": "write_failed"}), 500

    return jsonify({"status": "ok", "host": host}), 201

def atualizador_circuitos():

    while True:
        print(
            "[CIRCUITOS] Novo ciclo"
        )

        try:

            print(
                "Atualizando circuitos..."
            )
            inicio = time.time()

            print(
                "[CIRCUITOS] Iniciando lote..."
            )

            subprocess.run(
                [
                    sys.executable,
                    str(
                        BASE_DIR /
                        "python" /
                        "monitorar_circuitos.py"
                    )
                ],
                timeout=2100
            )

            fim = time.time()

            print(
                f"[CIRCUITOS] Lote concluído em "
                f"{round(fim-inicio,2)}s"
            )

        except Exception as erro:

            print(
                f"[CIRCUITOS] ERRO: {erro}"
            )

            time.sleep(30)

def atualizador_inventario():

    while True:

        try:

            print(
                "Atualizando inventário..."
            )

            subprocess.run(
                [
                    sys.executable,
                    str(
                        BASE_DIR /
                        "python" /
                        "pingar.py"
                    )
                ]
            )


        except Exception as e:

            print(e)

        time.sleep(300)

if __name__ == "__main__":

    threading.Thread(
    target=atualizador_inventario,
    daemon=True
    ).start()

    threading.Thread(
    target=atualizador_circuitos,
    daemon=True
    ).start()

    app.run(
        host="127.0.0.1",
        port=5000
    )