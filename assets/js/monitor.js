async function atualizar(){

    const API_BASE = 'http://127.0.0.1:5000';
    let inventarioCache = null;
    let host = localStorage.getItem("hostMonitorado") || null;

    // try to read monitor.lock from the backend to determine which host the monitor process is running for
    try{
        const lockResp = await fetch(`${API_BASE}/data/monitor.lock?t=${Date.now()}`, { cache: 'no-store' });
        if(lockResp.ok){
            const lockJson = await lockResp.json();
            if(lockJson && lockJson.host){
                // prefer explicit host from localStorage, otherwise use lock host
                if(!host) host = lockJson.host;
            }
        }
    }catch(e){
        // ignore - fallback to localStorage
    }

    host = host || "host";

    const elHost = document.getElementById("host");
    const elHostAlias = document.getElementById("hostAlias");
    if(elHost) elHost.innerText = host;
    if(elHostAlias) elHostAlias.innerText = host;

    const resposta = await fetch(`${API_BASE}/data/ping_detalhado.json?t=${Date.now()}`, { cache: 'no-store' });
    const dados = await resposta.json();

    // Decide how to filter the detailed ping data:
    // - If entries include a `host` property, filter by the chosen host.
    // - Otherwise, if a monitor.lock host exists we assume the file is for that host.
    let dadosFiltrados = [];
    if(Array.isArray(dados) && dados.length){
        const entriesHaveHost = dados.some(x => Object.prototype.hasOwnProperty.call(x, 'host'));
        if(entriesHaveHost){
            dadosFiltrados = dados.filter(x => String(x.host || '').toLowerCase() === String(host || '').toLowerCase());
        } else {
            // no host field in entries: assume file is the timeline for the current monitor.lock host
            dadosFiltrados = dados;
        }
    } else {
        dadosFiltrados = [];
    }

    // keep only the most recent entries to avoid huge history and timeout spam
    if(dadosFiltrados && dadosFiltrados.length > 300){
        dadosFiltrados = dadosFiltrados.slice(-300);
    }

    const sucessos = dadosFiltrados.filter(x => x.status === "ONLINE");
    const falhas = dadosFiltrados.filter(x => x.status === "OFFLINE");

    // compute packet loss based only on the filtered dataset for the current host
    const sampleCount = dadosFiltrados.length || 0;
    const enviados = dadosFiltrados.reduce((a,b)=>a + (b.enviados || 0),0);
    const recebidos = dadosFiltrados.reduce((a,b)=>a + (b.recebidos || 0),0);
    const perdidos = dadosFiltrados.reduce((a,b)=>a + (b.perdidos || 0),0);
    const perda = enviados ? Math.round((perdidos / enviados)* 100): 0;

    const tempos = sucessos.filter(x => x.tempo !== null).map(x => x.tempo);

    // populate header metadata (estado / unidade) using inventario.json
    try{
        if(!inventarioCache){

    const inv = await fetch(
        '/data/inventario.json'
    );

    inventarioCache =
        await inv.json();

}

        const inventario =
            inventarioCache;
        const hostEntry = inventario.find(e => e.host && e.host.toString().toLowerCase() === String(host).toLowerCase());
        if(hostEntry){
            const pageKicker = document.getElementById('pageKicker');
            if(pageKicker) pageKicker.innerText = `Inventory / ${hostEntry.estado} / ${hostEntry.unidade}`;
            const hostIpEl = document.getElementById('hostIp');
            if(hostIpEl) hostIpEl.innerText = `IP: ${hostEntry.host}`;
            const deviceEl = document.getElementById('deviceType');
            if(deviceEl) deviceEl.innerText = `Dispositivo: ${hostEntry.equipamento || '-'}`;
        }
    }catch(e){
        // ignore metadata errors
    }

    const elSucessos = document.getElementById("sucessos");
    const elFalhas = document.getElementById("falhas");
    const elPerda = document.getElementById("perda");
    const elStatusBox = document.getElementById("statusBox");
    const elHostStatus = document.getElementById("hostStatus");

    if(elSucessos) elSucessos.innerText = sucessos.length;
    if(elFalhas) elFalhas.innerText = falhas.length;
    if(elPerda) elPerda.innerText = perda;
    if(elStatusBox) {
        elStatusBox.textContent = (falhas.length === 0 ? "System healthy" : "Packet loss detected");
        elStatusBox.style.background = falhas.length === 0 ? "#dff7ee" : "#fff3d9";
        elStatusBox.style.color = falhas.length === 0 ? "#1f9d6d" : "#d88b1d";
    }
    if(elHostStatus) elHostStatus.textContent = falhas.length === 0 ? "Online" : "Warning";

    // render terminal lines but compress consecutive timeouts
    let html = "";
    const lines = dadosFiltrados.slice().reverse();
    let i = 0;
    while(i < lines.length){
        const item = lines[i];
        if(item.status === 'ONLINE'){
            const statusText = `reply from ${host} time=${item.tempo}ms ttl=${item.ttl ?? "-"}`;

            html += `
                <div class="terminal-line">
                    ${item.hora}  ${statusText}
                </div>
            `;
            i++;
            continue;
        }

        // group consecutive timeouts
        let j = i;
        while(j < lines.length && lines[j].status !== 'ONLINE') j++;
        const count = j - i;
        const first = lines[i];
        // only show timeout summaries if there is measurable packet loss
        if(perda > 0){
            // if only timeouts and many in a row, show a single paused message with count
            if(count === 1){
                html += `
                    <div class="terminal-line muted">
                        ${first.hora}  Request timeout
                    </div>
                `;
            } else {
                html += `
                    <div class="terminal-line muted">
                        ${first.hora}  Request timeout (x${count} consecutive) — output paused
                    </div>
                `;
            }
        }
        i = j;
    }

    const elHistorico = document.getElementById("historico");
    if(elHistorico) elHistorico.innerHTML = html || '<div class="terminal-line">Aguardando dados do host...</div>';

    // statistical summary
    let minimo = null, maximo = null, media = null;
    if(tempos.length){
        minimo = Math.min(...tempos);
        maximo = Math.max(...tempos);
        media = Math.round(tempos.reduce((a,b)=>a+b,0) / tempos.length);

        const elMin = document.getElementById("minimo");
        const elMax = document.getElementById("maximo");
        const elSummary = document.getElementById("summaryMedia");
        const elLatencyVal = document.getElementById("latencyVal");
        if(elMin) elMin.innerText = minimo;
        if(elMax) elMax.innerText = maximo;
        if(elSummary) elSummary.innerText = media;
        if(elLatencyVal) elLatencyVal.innerText = `${media} ms`;
    }

    // Update ping summary panel
    const elPingVia = document.getElementById('pingVia');
    const elPingAvg = document.getElementById('pingAvg');
    const elPingMin = document.getElementById('pingMin');
    const elPingMax = document.getElementById('pingMax');
    const elPingSuccess = document.getElementById('pingSuccess');
    const elPingSamples = document.getElementById('pingSamples');
    const elPingLoss = document.getElementById('pingLoss');

    const last = dadosFiltrados.length ? dadosFiltrados[dadosFiltrados.length-1] : null;
    const ttl = last?.ttl ?? "-";
    const current = last?.tempo ?? "-";
    const currentStatus = last?.status ?? "UNKNOWN";
    const via = last && last.via ? last.via : (tempos.length ? 'icmp' : 'unknown');

    const elTtl =
        document.getElementById(
            "ttlVal"
    );

    const elCurrent =
        document.getElementById(
            "pingCurrent"
    );

    const elStatus =
        document.getElementById(
            "pingStatus"
    );
    const elSent =
        document.getElementById(
            "packetsSent"
    );

    const elReceived =
        document.getElementById(
            "packetsReceived"
    );

    const elLost =
        document.getElementById(
            "packetsLost"
    );

    if(elSent)
        elSent.innerText = enviados;

    if(elReceived)
        elReceived.innerText = recebidos;

    if(elLost)
        elLost.innerText = perdidos;

    if(elTtl)
        elTtl.innerText = ttl;

    if(elPingVia) elPingVia.innerText = via;
    if(elPingAvg) elPingAvg.innerText = media;
    if(elPingMin) elPingMin.innerText = minimo;
    if(elPingMax) elPingMax.innerText = maximo;
    if(elPingSuccess) elPingSuccess.innerText = sucessos.length;
    if(elPingSamples) elPingSamples.innerText = sampleCount;
    if(elPingLoss) elPingLoss.innerText = perda;
    if(elTtl)
        elTtl.innerText = ttl;

    if(elCurrent)
        elCurrent.innerText = current;

    if(elStatus)
        elStatus.innerText = currentStatus;

    const elUltima = document.getElementById("ultimaAtualizacao");
    if(elUltima) elUltima.innerText = new Date().toLocaleTimeString();

}

// start after components are ready
function startMonitor(){

    atualizar();

    setInterval(
        atualizar,
        1000
    );

}

if(window.__componentsLoaded){
    startMonitor();
} else {
    window.addEventListener('components-ready', startMonitor);
}