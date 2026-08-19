let circuitosGlobal = {};
let statusCircuitos = {};
let alarmesCircuitos = [];

async function carregarCircuitos(){

    const respCircuitos =
        await fetch(
            "/data/circuitos_organizado.json"
        );

    const respStatus =
        await fetch(
            "/data/status_circuitos.json"
        );

    circuitosGlobal =
        await respCircuitos.json();

    statusCircuitos =
        await respStatus.json();

    const titulo =
    document.getElementById(
        "eventosTitulo"
    );

    if(titulo){

        titulo.innerText =
            "⚠ Circuitos Críticos";

    }

    montarCircuitos();
    montarAlarmesCircuitos();

}

function montarCircuitos(){

    const conteudo =
        document.getElementById(
            "conteudoCircuitos"
        );

    let html = "";

    let total = 0;
    let operacionais = 0;
    let degradados = 0;
    let indisponiveis = 0;

    Object.keys(
        circuitosGlobal
    ).forEach(estado => {

        Object.keys(
            circuitosGlobal[estado]
        ).forEach(unidade => {
            let totalOnline = 0;
            let totalWarning = 0;
            let totalOffline = 0;

            let ultimaAtualizacao = "";

            const lista =
                circuitosGlobal[estado][unidade];

            total += lista.length;

            let itens = "";

            lista.forEach(circuito => {
                const monitoramento =
                    statusCircuitos[
                        circuito.ip_primario
                    ];
                    if(monitoramento){

                        if(
                            monitoramento.status === "OPERACIONAL"
                        ){

                            operacionais++;

                        }
                        else if(
                            monitoramento.status ===
                            "DEGRADADO"
                        ){

                            degradados++;

                        }
                        else if(
                            monitoramento.status ===
                            "INDISPONIVEL"
                        ){

                            indisponiveis++;

                        }

                    }
                const lossMedio =
                    monitoramento?.loss_medio ?? 0;

            let classe = "circuito-online";
            let textoStatus = "🟢 OPERACIONAL";

            if(monitoramento){

                if(
                    monitoramento?.ultima_atualizacao
                ){
                    ultimaAtualizacao =
                        monitoramento.ultima_atualizacao;
                }

                if(
                    monitoramento.loss_medio >= 80
                ){

                    classe =
                        "circuito-offline";

                    textoStatus =
                        "🔴 INDISPONÍVEL";

                }
                else if(
                    monitoramento.loss_medio >= 20
                ){

                    classe =
                        "circuito-warning";

                    textoStatus =
                        "🟡 DEGRADADO";

                }
                if(lossMedio >= 80){

                    totalOffline++;

                }
                else if(lossMedio >= 20){

                    totalWarning++;

                }
                else{

                    totalOnline++;

                }

            }

                itens += `
                    <div class="equipamento ${classe}" onclick="mostrarDetalhesCircuito('${circuito.ip_primario}',
                        '${circuito.tipo_circuito}',
                        '${circuito.operadora}',
                        '${circuito.status}',
                        '${unidade}',
                        '${estado}')"
                    >

                        <div>

                            <div class="name">
                                ${circuito.tipo_circuito}
                            </div>

                            <div class="ip">
                                ${circuito.operadora}
                            </div>

                            <div class="ip">
                                ${circuito.ip_primario}
                            </div>

                        </div>

                        <div class="meta">

                            ${textoStatus}

                            <br>

                            Loss:
                            ${monitoramento?.loss_medio ?? "-"}%

                            <br>

                            Latência:
                            ${monitoramento?.latencia_media ?? "-"}ms

                            <br>

                            Atualizado:

                            <br>

                            ${monitoramento?.ultima_atualizacao ?? "-"}

                        </div>
                        </div>
                `;

            });

            html += `
                <div class="unidade-card">

                    <h3>
                        ${unidade}
                    </h3>

                    <small>
                        ${estado}
                    </small>

                    <div
                        style="
                            margin:10px 0;
                            font-size:13px;
                            font-weight:600;
                        "
                    >
                        🟢 ${totalOnline}
                        &nbsp;&nbsp;
                        🟡 ${totalWarning}
                        &nbsp;&nbsp;
                        🔴 ${totalOffline}
                    </div>

                    <div
                        style="
                            font-size:11px;
                            color:#666;
                            margin-bottom:10px;
                        "
                    >
                        Última atualização:
                        ${ultimaAtualizacao || "-"}
                    </div>

                    <div class="equipamentos">

                        ${itens}

                    </div>

                </div>
            `;

        });

    });





    document.getElementById(
    "totalOperacionais"
    ).innerText = operacionais;

    document.getElementById(
        "totalDegradados"
    ).innerText = degradados;

    document.getElementById(
        "totalIndisponiveis"
    ).innerText = indisponiveis;

    conteudo.innerHTML = html;

}

function montarAlarmesCircuitos(){

    const alarmes = Object.entries(
        statusCircuitos
    )
    .filter(
        ([ip,dados]) =>
            dados.status !==
            "OPERACIONAL"
    )
    .sort(
        (a,b) =>
            (
                b[1].ultima_atualizacao || ""
            ).localeCompare(
                a[1].ultima_atualizacao || ""
            )
    )
    .slice(0,10);

    const container =
        document.getElementById(
            "eventosLista"
        );

    if(!container){
        return;
    }

    let html = "";

    alarmes.forEach(
        ([ip,dados]) => {

            const icone =
                dados.status ===
                "INDISPONIVEL"
                ? "🔴"
                : "🟡";

            html += `
                <div class="evento-sidebar-item">

                    <div>

                        <strong>
                            ${icone}
                            ${ip}
                        </strong>

                        <br>

                        Loss:
                        ${dados.loss_medio}%

                        <br>

                        <small>
                            ${dados.ultima_atualizacao}
                        </small>

                    </div>

                </div>
            `;
        }
    );

    if(!html){

        html =
            "Nenhum circuito degradado ou indisponível.";

    }

    container.innerHTML =
        html;
}

    function montarAlarmesCircuitos(){

    const lista =
        Object.entries(
            statusCircuitos
        );

    const alarmes = lista

        .filter(
            ([ip,dados]) =>

                dados.status !==
                "OPERACIONAL"
        )

        .sort(
            (a,b) =>

                (
                    b[1]
                    .ultima_atualizacao || ""
                )

                .localeCompare(

                    a[1]
                    .ultima_atualizacao || ""

                )
        )

        .slice(0,10);

    const container =
        document.getElementById(
            "listaEventos"
        );

    if(!container){
        return;
    }

    let html = "";

    alarmes.forEach(
        ([ip,dados]) => {

            const icone =

                dados.status ===
                "INDISPONIVEL"

                ? "🔴"

                : "🟡";

            html += `

                <div
                    class="
                        evento-sidebar-item
                    "
                >

                    <div>

                        <strong>

                            ${icone}
                            ${ip}

                        </strong>

                        <br>

                        Loss:
                        ${dados.loss_medio}%

                        <br>

                        <small>

                            ${dados.ultima_atualizacao}

                        </small>

                    </div>

                </div>

            `;
        }
    );

    if(alarmes.length === 0){

        html = `

            <div
                class="
                    evento-sidebar-item
                "
            >

                ✅ Nenhum circuito
                degradado ou
                indisponível

            </div>

        `;
    }

    container.innerHTML =
        html;
}

    function mostrarDetalhesCircuito(
    ip,
    tipo,
    operadora,
    status,
    unidade,
    estado
){

    const painel =
        document.getElementById(
            "detalhesEquipamento"
        );

    if(!painel){
        console.error(
            "Elemento detalhesEquipamento não encontrado"
        );
        return;
    }

    painel.innerHTML = `
        <h2>${tipo}</h2>

        <p><b>IP:</b> ${ip}</p>
        <p><b>Operadora:</b> ${operadora}</p>
        <p><b>Status:</b> ${status}</p>
        <p><b>Estado:</b> ${estado}</p>
        <p><b>Unidade:</b> ${unidade}</p>

        <button
            class="btn-monitorar"
            onclick="monitorarCircuito('${ip}')"
        >
            📡 Monitorar Circuito
        </button>

    `;
}

async function monitorarCircuito(ip){

    try{

        await fetch(
            "/monitorar/" +
            encodeURIComponent(ip)
        );

        localStorage.setItem(
            "hostMonitorado",
            ip
        );

        window.open(
            "/monitor",
            "_blank"
        );

    }
    catch(erro){

        console.error(erro);

        alert(
            "Erro ao iniciar monitor."
        );

    }

}

if(window.__componentsLoaded){

    carregarCircuitos();

}
else{

    window.addEventListener(
        "components-ready",
        carregarCircuitos
    );

}