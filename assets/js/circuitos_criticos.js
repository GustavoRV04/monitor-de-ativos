let ultimaExecucao = "";

let filtroStatus = "";
let filtroTipo = "";
let criticosGlobal = [];

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

                    designacao:
                        circuito.designacao,

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

                    historico_horas:
                        monitoramento.historico_horas || [],

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

    criticosGlobal = criticos;
}


function renderizarCriticos(
    criticos
){

    let degradados = 0;
    let indisponiveis = 0;

    let html = "";

    criticos.forEach(item => {

        if(
            filtroStatus &&
            item.status !== filtroStatus
        ){
            return;
        }

        if(
            filtroTipo &&
            item.circuito !== filtroTipo
        ){
            return;
        }


        const classe =
            item.status ===
            "INDISPONIVEL"

            ? "critico-indisponivel"

            : "critico-degradado";

        const classeStatus =
            item.status ===
            "INDISPONIVEL"

            ? "critico-status-off"

            : "critico-status-warn";

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

        let historicoHoras =
                [...(item.historico_horas || [])];

            while(
                historicoHoras.length < 5
            ){
                historicoHoras.unshift(
                    null
                );
            }

        const historicoVisual =
            historicoCompleto
            .map((valor,index) => {

                const hora =
                    historicoHoras[index];

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
                        title="
                        Loss: ${valor}%
                        Hora: ${hora ?? '-'}
                        "
                    ></span>
                `;

            })
            .join("");



        html += `

            <div class="critico-item ${classe}">

                <div class="${classeStatus}">
                    ${item.status}
                </div>

                <div>
                    ${item.unidade}
                </div>

                <div>
                    ${item.circuito}
                </div>

                <div>
                    ${item.designacao || "-"}
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

async function verificarAtualizacao(){

    try{

        const resp =
            await fetch(
                "/data/circuitos_meta.json"
                +
                "?t=" +
                Date.now()
            );

        const meta =
            await resp.json();

        if(
            !ultimaExecucao
        ){

            ultimaExecucao =
                meta.ultima_execucao;

            return;
        }

        if(
            meta.ultima_execucao !==
            ultimaExecucao
        ){

            location.reload();

        }

    }
    catch(erro){

        console.error(
            erro
        );

    }

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

setInterval(
    verificarAtualizacao,
    30000
);

function alterarFiltroStatus(valor){

    filtroStatus = valor;

    renderizarCriticos(
        criticosGlobal
    );

}

function alterarFiltroTipo(valor){

    filtroTipo = valor;

    renderizarCriticos(
        criticosGlobal
    );

}

function exportarExcel(){

    let dados = criticosGlobal;

    if(filtroStatus){

        dados = dados.filter(
            item =>
                item.status === filtroStatus
        );

    }

    if(filtroTipo){

        dados = dados.filter(
            item =>
                item.circuito === filtroTipo
        );

    }

    const linhas =
        dados.map(item => ({

            Status:
                item.status,

            Unidade:
                item.unidade,

            Tipo:
                item.circuito,

            Designacao:
                item.designacao || "",

            Operadora:
                item.operadora,

            IP:
                item.ip,

            Loss_Medio:
                item.loss,

            Latencia_Media:
                item.latencia,

            Atualizacao:
                item.atualizacao,

            Historico:
                item.historico.join(" | "),

            Historico_Horas:
                item.historico_horas.join(" | ")

        }));

    const worksheet =
        XLSX.utils.json_to_sheet(
            linhas
        );

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Circuitos Criticos"
    );

    XLSX.writeFile(
        workbook,
        `Circuitos_Criticos_${
            new Date()
                .toISOString()
                .slice(0,10)
        }.xlsx`
    );

}