import json

# Carrega o inventário
with open("inventario.json", "r", encoding="utf-8") as f:
    ativos = json.load(f)

inventario_organizado = {}

for ativo in ativos:

    estado = ativo["estado"]
    unidade = ativo["unidade"]

    if estado not in inventario_organizado:
        inventario_organizado[estado] = {}

    if unidade not in inventario_organizado[estado]:
        inventario_organizado[estado][unidade] = []

    inventario_organizado[estado][unidade].append(ativo)

# Salva o resultado
with open(
    "inventario_organizado.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        inventario_organizado,
        f,
        ensure_ascii=False,
        indent=4
    )

print("Inventário organizado com sucesso!")
print("Estados encontrados:")

for estado in inventario_organizado:
    print(estado)