async function carregarCriticos(){

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

    const criticos = [];

    Object.keys(circuitos)
        .forEach(estado => {

        Object.keys(
            circuitos[estado]
        )
        .forEach(unidade => {

            circuitos[estado][unidade]
            .forEach(circuito => {

                const monitoramento =
                    status[
                        circuito
                        .ip_primario
                    ];

                if(
                    !monitoramento
                ){
                    return;
                }

                if(
                    monitoramento.status ===
                    "OPERACIONAL"
                ){
                    return;
                }

                criticos.push({

                    estado,

                    unidade,

                    circuito:
                        circuito.tipo_circuito,

                    operadora:
                        circuito.operadora,

                    ip:
                        circuito.ip_primario,

                    status:
                        monitoramento.status,

                    loss:
                        monitoramento.loss_medio,

                    latencia:
                        monitoramento.latencia_media,

                    historico:
                        monitoramento.historico || [],

                    atualizacao:
                        monitoramento
                        .ultima_atualizacao

                });

            });

        });

    });

    criticos.sort(
        (a,b) =>
            b.atualizacao.localeCompare(
                a.atualizacao
            )
    );

    renderizarCriticos(
        criticos
    );

}

function renderizarCriticos(
    criticos
){

    let degradados = 0;
    let indisponiveis = 0;

    let html = "";

    criticos.forEach(item => {

        const classe =
            item.status ===
            "INDISPONIVEL"

            ? "critico-indisponivel"

            : "critico-degradado";

        if(
            item.status ===
            "INDISPONIVEL"
        ){
            indisponiveis++;
        }
        else{
            degradados++;
        }

        let historicoCompleto =
            [...item.historico];

        while(
            historicoCompleto.length < 5
        ){
            historicoCompleto.unshift(
                null
            );
        }
        const historicoTexto =
            item.historico.length
            ? `(${item.historico.length}/5) ` +
            item.historico.join(" → ")
            : "-";

        const historicoVisual =
            historicoCompleto
            .map(valor => {

                if(valor === null){

                    return `
                        <span
                            class="
                                hist-item
                                hist-empty
                            "
                        ></span>
                    `;
                }

                let classe =
                    "hist-ok";

                if(valor >= 80){

                    classe =
                        "hist-bad";
                }
                else if(valor >= 20){

                    classe =
                        "hist-warn";
                }

                return `
                    <span
                        class="
                            hist-item
                            ${classe}
                        "
                        title="${valor}%"
                    ></span>
                `;

            })
            .join("");

        html += `

            <div class="critico-item ${classe}">

                <div>
                    ${item.status}
                </div>

                <div>
                    ${item.unidade}
                </div>

                <div>
                    ${item.circuito}
                </div>

                <div>
                    ${item.ip}
                </div>

                <div class="critico-historico">

                    ${historicoVisual}

                </div>

                <div class="critico-loss">

                    ${item.loss}%

                </div>

                <div>
                    ${item.atualizacao}
                </div>

            </div>

        `;
    });

    document.getElementById(
        "totalDegradados"
    ).innerText =
        degradados;

    document.getElementById(
        "totalIndisponiveis"
    ).innerText =
        indisponiveis;

    document.getElementById(
        "listaCriticos"
    ).innerHTML =
        html;

}

if(
    window.__componentsLoaded
){
    carregarCriticos();
}
else{

    window.addEventListener(
        "components-ready",
        carregarCriticos
    );

}