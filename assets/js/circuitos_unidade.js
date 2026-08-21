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
            
            const historicoVisual =
                historico
                    .map(valor => {

                        let classe =
                            "historico-ok";

                        if(valor >= 80){

                            classe =
                                "historico-bad";

                        }
                        else if(valor >= 20){

                            classe =
                                "historico-warn";

                        }

                        return `
                            <div
                                class="
                                historico-ponto
                                    ${classe}
                                "
                                title="${valor}%"
                            >
                            </div>
                        `;

                    })
                    .join("");

            const historicoHoras =
                horas
                    .map(hora => {

                        return `
                            <span>
                                ${hora}
                            </span>
                        `;

                    })
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

                    <div class="historico-blocos">
                        ${historicoVisual}
                    </div>

                    <div class="historico-horas">
                        ${historicoHoras}
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

