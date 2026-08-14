let inventarioGlobal = {};
let statusGlobal = {};
let estadoAtual = null;

function generateSparkline(total){
    // simple deterministic sparkline based on total value
    const pts = [];
    for(let i=0;i<8;i++){
        const x = i * 12;
        const y = 12 + ((total + i*3) % 10) - 5; // keep within 2..22
        pts.push(`${x},${y}`);
    }
    return pts.join(' ');
}

async function carregar() {

    const respInventario =
        await fetch("/data/inventario_organizado.json");

    const respPing =
        await fetch("/data/resultado_ping.json");

    inventarioGlobal =
        await respInventario.json();

    const ping =
        await respPing.json();

    statusGlobal = {};

    ping.forEach(item => {

        statusGlobal[item.host] =
            item.status;

    });

    document.getElementById(
        "totalAtivos"
    ).innerText = ping.length;

    document.getElementById(
        "totalOnline"
    ).innerText =
        ping.filter(
            x => x.status === "ONLINE"
        ).length;

    document.getElementById(
        "totalOffline"
    ).innerText =
        ping.filter(
            x => x.status === "OFFLINE"
        ).length;

    montarMenu();

}

function montarMenu(){

    const menu =
        document.getElementById(
            "estadoMenu"
        );

    menu.innerHTML = "";

    Object.keys(
        inventarioGlobal
    ).forEach(estado => {

        menu.innerHTML += `
            <div
                class="menu-item"
                data-estado="${estado}"
                onclick="mostrarEstado('${estado}')"
            >
                ${estado}
            </div>
        `;

    });

    const estados =
        Object.keys(inventarioGlobal);

    if(estados.length > 0){

        mostrarEstado(estados[0]);

    }

}

function mostrarEstado(estado){

    estadoAtual = estado;

    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-estado') === estado);
    });

    const conteudo = document.getElementById("conteudo");
    conteudo.innerHTML = "";
    const unidades = inventarioGlobal[estado];

    // build HTML in one pass to reduce reflows
    let htmlAll = "";
    Object.keys(unidades).sort().forEach(unidade => {

            let totalOnline = 0;
            let totalOffline = 0;

            let htmlEquipamentos = "";

            unidades[unidade]
                .forEach(equipamento => {

                    const status =
                        statusGlobal[equipamento.host];

                    if(status === "ONLINE"){
                        totalOnline++;
                    }else{
                        totalOffline++;
                    }

                    const classe =
                        status === "ONLINE"
                        ? "online"
                        : "offline";

                    const icone =
                        status === "ONLINE"
                        ? "🟢"
                        : "🔴";

                    htmlEquipamentos += `
                        <div
                            class="equipamento ${classe}"
                            onclick="mostrarDetalhes('${equipamento.host}')"
                        >
                            <div class="left">
                                <span class="dot"></span>
                                <div>
                                    <span class="name">${equipamento.equipamento}</span>
                                    <span class="ip">${equipamento.host}</span>
                                </div>
                            </div>
                            <div class="meta">
                                <span class="uptime">${status === 'ONLINE' ? 'Online' : 'Offline'}</span>
                            </div>
                        </div>
                    `;
                });

            const sparkPoints = generateSparkline(totalOnline);

            htmlAll += `
                <div class="unidade-card">

                    <div class="card-header">

                        <div style="display:flex;align-items:center;gap:12px">
                            <h3>${unidade}</h3>
                            <div class="sparkline" aria-hidden="true">
                                <svg class="sparkline-svg" viewBox="0 0 96 24" preserveAspectRatio="none">
                                    <polyline points="${sparkPoints}"></polyline>
                                </svg>
                            </div>
                        </div>

                        <span class="badge">
                            ${totalOnline} Online
                        </span>

                    </div>

                    <div class="equipamentos">
                        ${htmlEquipamentos}
                    </div>

                    <div class="card-footer">
                        <button class="secondary-btn" onclick="abrirUnidade('${estado}', '${unidade}')">Ver Detalhes da Unidade</button>
                    </div>

                </div>
            `;
        });
    conteudo.innerHTML = htmlAll;
}

function abrirUnidade(estado, unidade) {
    const estadoCodificado = encodeURIComponent(String(estado || '').trim());
    const unidadeCodificada = encodeURIComponent(String(unidade || '').trim());
    const baseUrl = 'http://127.0.0.1:5000';
    window.location.href = `${baseUrl}/multi-ping/${estadoCodificado}/${unidadeCodificada}`;
}

function inicializarDashboard() {
    if (!document.getElementById('estadoMenu')) {
        setTimeout(inicializarDashboard, 50);
        return;
    }

    carregar();
    carregarEventos();
}

// delegate clicks on equipamento elements to avoid relying on inline onclick handlers
function attachEquipamentoDelegation(){
    const conteudo = document.getElementById('conteudo');
    if(!conteudo) return;
    conteudo.addEventListener('click', (ev)=>{
        const item = ev.target.closest && ev.target.closest('.equipamento');
        if(!item) return;
        const ipEl = item.querySelector('.ip');
        const host = ipEl ? ipEl.innerText : null;
        if(host){
            try{ mostrarDetalhes(host); }catch(e){ console.error(e); }
        }
    });
}

if (window.__componentsLoaded) {
    inicializarDashboard();
} else {
    window.addEventListener('components-ready', inicializarDashboard);
}

// refresh inventory and ping results every 5 minute
setInterval(carregar, 300000);
setInterval(carregarEventos, 300000);

// attach delegation after components have loaded
if (window.__componentsLoaded){
    attachEquipamentoDelegation();
} else {
    window.addEventListener('components-ready', attachEquipamentoDelegation);
}

function pesquisar(){

    const termo =
        document
            .getElementById("busca")
            .value
            .trim()
            .toUpperCase();

    const conteudo = document.getElementById("conteudo");
    conteudo.innerHTML = "";
    let htmlAll = "";
    Object.keys(inventarioGlobal).forEach(estado => {
        const unidades = inventarioGlobal[estado];
        Object.keys(unidades).forEach(unidade => {
            let htmlEquipamentos = "";
            let encontrou = false;
            unidades[unidade].forEach(equipamento => {
                const nome = equipamento.equipamento;
                const host = equipamento.host;
                const texto = (estado + " " + unidade + " " + nome + " " + host).toUpperCase();
                if(texto.includes(termo)){
                    encontrou = true;
                    const status = statusGlobal[host];
                    htmlEquipamentos += `
                        <div class="equipamento ${status === 'ONLINE' ? 'online' : 'offline'}">
                            <div class="left">
                                <span class="dot"></span>
                                <div>
                                    <span class="name">${nome}</span>
                                    <span class="ip">${host}</span>
                                </div>
                            </div>
                            <div class="meta">
                                <span class="uptime">${status === 'ONLINE' ? 'Online' : 'Offline'}</span>
                            </div>
                        </div>
                    `;
                }
            });
            if(encontrou){
                htmlAll += `
                    <div class="unidade-card">
                        <h3>${unidade}</h3>
                        <small>${estado}</small>
                        <div class="equipamentos">${htmlEquipamentos}</div>
                    </div>
                `;
            }
        });
    });
    conteudo.innerHTML = htmlAll || `
        <div class="unidade-card">
            Digite uma unidade, host ou equipamento para pesquisar.
        </div>
    `;

}

function mostrarDetalhes(host){


    const painel =
        document.getElementById(
            "detalhesEquipamento"
        );

    let equipamentoSelecionado = null;

    Object.values(inventarioGlobal)
        .forEach(unidades => {

            Object.values(unidades)
                .forEach(lista => {

                    lista.forEach(eq => {

                        if(eq.host === host){

                            equipamentoSelecionado = eq;

                        }

                    });

                });

        });

    if(!equipamentoSelecionado){
        return;
    }

    localStorage.setItem(
        "hostSelecionado",
        host
    );

    localStorage.setItem(
        "equipamentoSelecionado",
        equipamentoSelecionado.equipamento
    );

    const status =
        statusGlobal[host];

    painel.innerHTML = `
        <h2>
            ${equipamentoSelecionado.equipamento}
        </h2>

        <p>
            <b>Host:</b>
            ${host}
        </p>

        <p>
            <b>Estado:</b>
            ${equipamentoSelecionado.estado}
        </p>

        <p>
            <b>Unidade:</b>
            ${equipamentoSelecionado.unidade}
        </p>

        <p>
            <b>Status:</b>
            ${status}
        </p>

        <button
            onclick="monitorarPing('${host}')"
        >
            Monitorar Ping
        </button>
    `;
};

async function monitorarPing(host){

    try{

        console.log("Monitorando:", host);

        const resposta =
            await fetch(
                "http://127.0.0.1:5000/monitorar/" +
                encodeURIComponent(host)
            );

        console.log(
            "Status:",
            resposta.status
        );

        const json =
            await resposta.json();

        console.log(json);

        localStorage.setItem(
            "hostMonitorado",
            host
        );

        window.open(
            "http://127.0.0.1:5000/monitor",
            "_blank"
        );

    }
    catch(erro){

        console.error(erro);

        alert(
            "Erro ao conectar com a API."
        );

    }

};

async function carregarEventos() {

    try {

        const resp = await fetch(
            '/data/eventos'
        );

        const eventos =
            await resp.json();

        const lista =
            document.getElementById(
                'listaEventos'
            );

        if (!lista)
            return;

        if (!eventos.length) {

            lista.innerHTML =
                '<div class="evento-item">Nenhum evento registrado.</div>';

            return;
        }

        lista.innerHTML =
    eventos
    .slice(-20)
    .reverse()
    .map(evento => {

        let icone = "🟢";

        if (
            evento.status_novo === "OFFLINE"
        )
            icone = "🔴";

        else if (
            evento.saude_nova === "WARNING"
        )
            icone = "🟡";

        const hostCurto =
            evento.host
                .split(".")[0]
                .toUpperCase();
``

        const hora =
            evento.hora.split(" ")[1];

        return `
            <div class="evento-sidebar-item">

                ${icone}

            <span class="evento-texto">
                ${hora}
                ·
                ${hostCurto}
            </span>

    </div>
    `;

    }).join('');

    } catch (erro) {

        console.error(
            erro
        );

    }

}

