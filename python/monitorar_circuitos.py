# python/monitorar_circuitos.py

import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

arquivo_circuitos = (
    BASE_DIR /
    "data" /
    "circuitos.json"
)

saida = (
    BASE_DIR /
    "data" /
    "status_circuitos.json"
)

with open(
    arquivo_circuitos,
    "r",
    encoding="utf-8"
) as f:

    circuitos = json.load(f)

status_circuitos = {}

for circuito in circuitos:

    ip = str(
        circuito.get(
            "ip_primario",
            ""
        )
    ).strip()

    if (
        not ip
        or ip.lower() == "nan"
    ):
        continue

    status_circuitos[ip] = {

        "status":
            "OPERACIONAL",

        "loss":
            0,

        "latencia":
            0

    }

with open(
    saida,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        status_circuitos,
        f,
        indent=4,
        ensure_ascii=False
    )

print(
    f"Status gerados: {len(status_circuitos)}"
)