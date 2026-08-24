const partes =
    decodeURIComponent(
        window.location.pathname
    ).split("/");

const estado =
    partes[2];

const unidade =
    partes[3];

async function carregar(){

    const respCircuitos =
        await fetch(
            "/data/circuitos_organizado.json"
        );

    const respStatus =
        await fetch(
            "/data/status_circuitos.json"
        );

    const circuitos =
        await respCircuitos.json();

    const status =
        await respStatus.json();

    document
        .getElementById(
            "tituloUnidade"
        )
        .innerText =
        `${estado} - ${unidade}`;

    montarCircuitos(
        circuitos,
        status
    );

}

function montarCircuitos(
    circuitos,
    status
){

    const lista =
        circuitos?.[estado]?.[unidade];

    if(!lista){

        document
            .getElementById(
                "listaCircuitos"
            )
            .innerHTML =
            `
                <div
                    style="
                        padding:20px;
                    "
                >
                    Unidade não encontrada.
                </div>
            `;

        return;
    }

    let html = "";

    lista.forEach(
        circuito => {

            const monitoramento =
                status[
                    circuito
                    .ip_primario
                ];

            const historico =
                monitoramento?.historico || [];

            const horas =
                monitoramento?.historico_horas || [];
            
            const historicoDetalhado =
                historico
                    .map((valor,index) => {

                        const dataHora =
                            horas[index] || "-";

                        let classe =
                            "historico-ok";

                        let emoji =
                            "🟢";

                        if(valor >= 80){

                            classe =
                                "historico-bad";

                            emoji =
                                "🔴";

                        }
                        else if(valor >= 20){

                            classe =
                                "historico-warn";

                            emoji =
                                "🟡";

                        }

                        return `

                            <div class="
                                historico-linha
                                ${classe}
                            ">

                                <span>
                                    ${emoji}
                                </span>

                                <span>
                                    ${dataHora}
                                </span>

                                <span>
                                    ${valor}%
                                </span>

                            </div>

                        `;

                    })
                    .reverse()
                    .join("");
        

            html += `

                <div
                    class="
                        circuito-historico-card
                    "
                >

                    <h2>
                        ${circuito.tipo_circuito}
                    </h2>

                    <p>

                        <b>
                            Operadora:
                        </b>

                        ${circuito.operadora}

                    </p>

                    <p>

                        <b>
                            IP:
                        </b>

                        ${circuito.ip_primario}

                    </p>

                    <p>

                        <b>
                            Designação:
                        </b>

                        ${circuito.designacao}

                    </p>

                    <p>

                        <b>
                            Velocidade:
                        </b>

                        ${circuito.velocidade}

                    </p>

                    <div class="historico-lista">

                        ${historicoDetalhado}

                    </div>

                    <p
                        style="
                            margin-top:15px;
                            font-weight:700;
                        "
                    >
                        Loss Médio:
                        ${
                            monitoramento?.loss_medio
                            ?? "-"
                        }%
                    </p>
            `;

        }
    );

    document
        .getElementById(
            "listaCircuitos"
        )
        .innerHTML =
        html;

}

document.addEventListener(
    "DOMContentLoaded",
    carregar
);

