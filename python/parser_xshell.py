from pathlib import Path
import json
import csv

XSHELL_PATH = r"C:\Users\p627651\Downloads\Xshell - App 1\Xshell - App\Xshell\Xshell\Sessions"

ativos = []

for arquivo in Path(XSHELL_PATH).rglob("*.xsh"):

    try:

        if arquivo.name.upper() == "TELNET.XSH":
            continue

        texto = arquivo.read_text(
            encoding="utf-16"
        )

        host = None

        for linha in texto.splitlines():

            linha = linha.strip()

            if linha.startswith("Host="):

                host = linha.replace(
                    "Host=",
                    ""
                ).strip()

                break

        if host:

            estado = "N/A"

            partes = arquivo.parts
            nome_equipamento = arquivo.stem.upper()

            # Primeiro tenta identificar pela estrutura de pastas
            if "SC" in partes:
                estado = "SC"

            elif "RS" in partes:
                estado = "RS"

            elif "PR" in partes:
                estado = "PR"

            # Se não encontrou, tenta identificar pelo nome do equipamento
            elif nome_equipamento.startswith("SC"):
                estado = "SC"

            elif nome_equipamento.startswith("RS"):
                estado = "RS"

            elif nome_equipamento.startswith("PR"):
                estado = "PR"

            ativos.append({
                "estado": estado,
                "unidade": arquivo.parent.name,
                "equipamento": arquivo.stem,
                "host": host
            })

    except Exception:
        pass

print(f"\nTotal de ativos encontrados: {len(ativos)}")

with open(
    "inventario.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        ativos,
        f,
        ensure_ascii=False,
        indent=4
    )

with open(
    "inventario.csv",
    "w",
    encoding="utf-8",
    newline=""
) as f:

    writer = csv.DictWriter(
        f,
        fieldnames=[
            "estado",
            "unidade",
            "equipamento",
            "host"
        ]
    )

    writer.writeheader()
    writer.writerows(ativos)

print("inventario.json criado")
print("inventario.csv criado")