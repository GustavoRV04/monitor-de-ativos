let circuitosGlobal = {};
let statusCircuitos = {};
let alarmesCircuitos = [];
let filtroAtual = "";
let circuitoFiltro = "";

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

const busca =
    document.getElementById(
        "busca"
    );

if(busca){

    busca.addEventListener(
        "input",
        filtrarCircuitos
    );

}

}

function abrirHistoricoCircuitos(
    estado,
    unidade
){

    const estadoCodificado =
        encodeURIComponent(estado);

    const unidadeCodificada =
        encodeURIComponent(unidade);

    window.location.href =
        `/circuitos-unidade/${estadoCodificado}/${unidadeCodificada}`;

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

    Object.values(statusCircuitos)
        .forEach(monitoramento => {

            if(
                monitoramento.status ===
                "OPERACIONAL"
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

        });

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
            
            const textoUnidade = `
                ${unidade}
                ${estado}
                ${JSON.stringify(lista)}
            `.toUpperCase();

            if(
                filtroAtual &&
                !textoUnidade.includes(
                    filtroAtual
                    )
            ){

                return;

            }

            total += lista.length;

            let itens = "";
            let unidadeTemFiltro = false;


            lista.forEach(circuito => {
                const monitoramento =
                    statusCircuitos[
                        circuito.ip_primario
                    ];
                    
                    if(

                        circuitoFiltro === ""

                    ){

                        unidadeTemFiltro = true;

                    }
                    else if(

                        monitoramento?.status ===
                        circuitoFiltro

                    ){

                        unidadeTemFiltro = true;

                    }

                const lossMedio =
                    monitoramento?.loss_medio ?? 0;

            let classe = "circuito-online";
            let textoStatus = "🟢 OPERACIONAL";
            let classeStatus = "status-operacional";

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

                    classeStatus = "status-indisponivel";

                }
                else if(
                    monitoramento.loss_medio >= 20
                ){

                    classe =
                        "circuito-warning";

                    textoStatus =
                        "🟡 DEGRADADO";
                    classeStatus = "status-degradado";

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
                    <div class="circuito-item ${classe}"
                        onclick="mostrarDetalhesCircuito(
                            '${circuito.ip_primario}',
                            '${circuito.tipo_circuito}',
                            '${circuito.operadora}',
                            '${circuito.designacao ?? "-"}',
                            '${circuito.velocidade ?? "-"}',
                            '${circuito.status}',
                            '${unidade}',
                            '${estado}',
                            '${monitoramento?.loss_medio}',
                            '${monitoramento?.latencia_media}',
                            '${monitoramento?.mtu_status ?? "-"}',
                            '${monitoramento?.ultima_atualizacao ?? "-"}'
                        )">

                        <span class="circuito-nome">
                            ${circuito.tipo_circuito}
                        </span>

                        <span class="circuito-designacao">
                            ${circuito.designacao ?? "-"}
                        </span>

                        <span class="circuito-operadora">
                            ${circuito.operadora}
                        </span>

                        <span class="circuito-ip">
                            ${circuito.ip_primario}
                        </span>

                        <span
                            class="circuito-status
                                ${classeStatus}
                            "
                        >
                            ${textoStatus}
                        </span>

                    </div>

                        </div>
                `;

            });

            if(
                !unidadeTemFiltro
            ){

                return;

            }
            const horaAtualizacao =
            ultimaAtualizacao
                ? ultimaAtualizacao.split(" ")[1]
                : "-";


            html += `
                <div class="cir-unidade-card">

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                        "
                    >

                        <h3>
                            ${unidade}
                        </h3>

                        <button
                            class="btn-historico-circuitos"
                            onclick="
                                abrirHistoricoCircuitos(
                                    '${estado}',
                                    '${unidade}'
                                )
                            "
                        >
                            📈
                        </button>

                    </div>

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
                        ${horaAtualizacao}

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
    designacao,
    velocidade,
    status,
    unidade,
    estado,
    loss,
    latencia,
    mtu,
    atualizacao
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
        <p><b>Designação:</b> ${designacao}</p><p>
        <b>Velocidade:</b>${velocidade}</p>
        <p><b>Status:</b> ${status}</p>
        <p><b>Estado:</b> ${estado}</p>
        <p><b>Unidade:</b> ${unidade}</p>
        <p><b>Loss Médio:</b> ${loss}%</p>
        <p><b>Latência Média:</b> ${latencia} ms</p>
        <p><b>MTU:</b><span style="color:${mtu === 'OK' ? '#1f9d6d' : '#d88b1d'};
            font-weight:700;
            ">
                ${
                    mtu === "OK"
                    ? "✅ 1500"
                    : "⚠ REDUZIDO"
                }
            </span>
        </p>
        <p><b>Última Atualização:</b> ${atualizacao}</p>

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

function filtrarCircuitos(){

    filtroAtual =
        document
            .getElementById("busca")
            .value
            .trim()
            .toUpperCase();

    montarCircuitos();

}

function aplicarFiltroCircuito(status){

    if(
        circuitoFiltro === status
    ){

        circuitoFiltro = "";

    }
    else{

        circuitoFiltro = status;

    }
    document
        .querySelectorAll(".card")
        .forEach(
            card =>
            card.classList.remove(
                "filtro-ativo"
            )
        );

    if(circuitoFiltro){

        document
            .querySelector(
                `[onclick*="${circuitoFiltro}"]`
            )
            ?.classList.add(
                "filtro-ativo"
            );

    }

    montarCircuitos();

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