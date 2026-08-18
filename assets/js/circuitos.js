let circuitosGlobal = {};
let statusCircuitos = {};

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

    montarCircuitos();

}

function montarCircuitos(){

    const conteudo =
        document.getElementById(
            "conteudoCircuitos"
        );

    let html = "";

    let total = 0;
    let ativos = 0;
    let inativos = 0;

    Object.keys(
        circuitosGlobal
    ).forEach(estado => {

        Object.keys(
            circuitosGlobal[estado]
        ).forEach(unidade => {

            const lista =
                circuitosGlobal[estado][unidade];

            total += lista.length;

            lista.forEach(circuito => {

                const status =
                    String(
                        circuito.status || ""
                    ).toUpperCase();

                if(
                    status.includes(
                        "ATIVO"
                    )
                ){
                    ativos++;
                }
                else{
                    inativos++;
                }

            });

            let itens = "";

            lista.forEach(circuito => {
                const monitoramento =
                    statusCircuitos[
                        circuito.ip_primario
                    ];

            let classe = "circuito-online";
            let textoStatus = "🟢 OPERACIONAL";

            if(monitoramento){

                if(
                    monitoramento.loss >= 100
                ){

                    classe =
                        "circuito-offline";

                    textoStatus =
                        "🔴 INDISPONÍVEL";

                }
                else if(
                    monitoramento.loss >= 10
                ){

                    classe =
                        "circuito-warning";

                    textoStatus =
                        "🟡 DEGRADADO";

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

                    <div class="equipamentos">

                        ${itens}

                    </div>

                </div>
            `;

        });

    });




    document.getElementById(
        "totalCircuitos"
    ).innerText = total;

    document.getElementById(
        "totalAtivosCircuito"
    ).innerText = ativos;

    document.getElementById(
        "totalInativosCircuito"
    ).innerText = inativos;

    conteudo.innerHTML = html;

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
            onclick="monitorarCircuito('${ip}')"
        >
            Monitorar Circuito
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