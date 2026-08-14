const pathParts = window.location.pathname.split('/').filter(Boolean);
const routeName = pathParts[0];
const routeType = routeName === 'unidade' || routeName === 'multi-ping' ? routeName : null;
const API_BASE = 'http://127.0.0.1:5000';

const context = {
    estado: '',
    unidade: ''
};

if (routeType) {
    const estadoEncoded = pathParts[1] || '';
    const unidadeParts = pathParts.slice(2);
    context.estado = decodeURIComponent(estadoEncoded);
    context.unidade = decodeURIComponent(unidadeParts.join('/'));
}

const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const cardsContainer = document.getElementById('cards');
const searchInput = document.getElementById('searchInput');

function normalizeHost(host = '') {
    return String(host).trim().toLowerCase();
}

function formatLatency(value) {
    if (value === null || value === undefined || value === '') {
        return '--';
    }
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return `${num.toFixed(1)} ms`;
}

function formatLoss(value) {
    if (value === null || value === undefined || value === '') {
        return '--';
    }
    const num = Number(value);
    if (Number.isNaN(num)) return '--';
    return `${Math.max(0, Math.min(100, num)).toFixed(0)}%`;
}

function statusToClass(status){

    const clean = String(status).toUpperCase();

    if(clean === 'ONLINE')
        return 'ONLINE';

    if(clean === 'WARNING')
        return 'WARNING';

    return 'OFFLINE';

}

function buildSparkline(values) {
    const safeValues = values.filter(v => Number.isFinite(Number(v)));
    if (!safeValues.length) {
        return '<svg class="sparkline-svg" viewBox="0 0 180 90" preserveAspectRatio="none"><path d="M0 60 C 20 60, 35 58, 50 55 S 80 30, 100 35 S 135 25, 180 20 L180 90 L0 90 Z" fill="#edf5ff" stroke="#b8d4ff" stroke-width="2" fill-opacity="1"></path></svg>';
    }

    const min = Math.min(...safeValues);
    const max = Math.max(...safeValues);
    const range = max - min || 1;

    const points = safeValues.map((value, index) => {
        const x = (index / Math.max(safeValues.length - 1, 1)) * 180;
        const y = 80 - (((value - min) / range) * 52 + 13);
        return `${x},${y}`;
    }).join(' ');

    return `
        <svg class="sparkline-svg" viewBox="0 0 180 90" preserveAspectRatio="none">
            <polyline points="${points}" fill="none" stroke="#4e8ef7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
        </svg>
    `;
}

function renderCards(items) {
    if (!items.length) {
        cardsContainer.innerHTML = '<div class="empty">Nenhum ativo encontrado para esta unidade.</div>';
        return;
    }

    cardsContainer.innerHTML = items.map((item) => {
        const statusClass = statusToClass(item.saude || item.status);
        const latency = item.latencia ?? item.tempo ?? null;
        const avgValue = item.latencia ?? item.tempo ?? null;
        const lossValue = item.perda ?? item.packet_loss ?? (statusClass === 'OFFLINE' ? 100 : 0);

        return `
            <article class="asset-card ${statusClass === 'OFFLINE' ? 'error' : statusClass === 'WARNING' ? 'warning' : ''}">
                <div class="asset-head">
                    <div>
                        <h2 class="name">${item.equipamento || item.host || 'Ativo'}</h2>
                        <span class="ip">${item.host || 'IP indisponível'}</span>
                    </div>
                    <span class="status-badge status-${statusClass}"><span class="dot ${statusClass}"></span>${statusClass}</span>
                </div>

                <div class="sparkline-box">${buildSparkline([latency && Number(latency) ? Number(latency) : 35, latency && Number(latency) ? Number(latency) + 8 : 25, latency && Number(latency) ? Number(latency) - 6 : 55, latency && Number(latency) ? Number(latency) + 5 : 45, latency && Number(latency) ? Number(latency) : 30])}</div>

                <div class="stats">
                    <div class="metric">
                        <span class="metric-label">Ativo</span>
                        <span class="metric-value">${item.equipamento || '--'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Latency</span>
                        <span class="metric-value">${formatLatency(latency)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Perda</span>
                        <span class="metric-value">${formatLoss(lossValue)}</span>
                    </div>
                </div>

                <button class="cta" data-host="${item.host || ''}">Abrir monitor</button>
            </article>
        `;
    }).join('');

    cardsContainer.querySelectorAll('.cta').forEach((button) => {
        button.addEventListener('click', async () => {

        const host =
            button.getAttribute(
                'data-host'
            );

        if (!host) return;

        localStorage.setItem(
            'hostMonitorado',
            host
        );

        try{

            await fetch(
                `${API_BASE}/monitorar/${encodeURIComponent(host)}`
            );

        }catch(erro){

            console.error(
                erro
            );

        }

        window.location.href =
            `${API_BASE}/monitor`;

    }
);
    });
}

function applyFilters(items) {
    const query = (searchInput.value || '').trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
        const text = `${item.equipamento || ''} ${item.host || ''} ${item.estado || ''} ${item.unidade || ''}`.toLowerCase();
        return text.includes(query);
    });
}

async function loadData() {
    if (!context.estado || !context.unidade) {
        pageTitle.textContent = 'Unidade não informada';
        pageSubtitle.textContent = 'Selecione uma unidade no painel para visualizar os ativos.';
        cardsContainer.innerHTML = '<div class="empty">Nenhuma unidade foi informada na rota.</div>';
        return;
    }

    pageTitle.textContent = `${context.estado} - ${context.unidade}`;
    pageSubtitle.textContent = `Monitoramento em tempo real para ${context.unidade}.`;

    try {
        const [inventarioResponse, pingResponse] = await Promise.all([
            fetch(`${API_BASE}/data/inventario.json`, { cache: 'no-store' }),
            fetch(`${API_BASE}/data/resultado_ping.json`, { cache: 'no-store' })
        ]);

        const inventario = inventarioResponse.ok ? await inventarioResponse.json() : [];
        const pingResumo = pingResponse.ok ? await pingResponse.json() : [];

        const pingMap = new Map();
        pingResumo.forEach((entry) => {
            const hostKey = normalizeHost(entry.host || entry.hostname || entry.ip);
            if (!hostKey) return;
            pingMap.set(hostKey, { ...entry });
        });

        const itens = inventario
            .filter((item) => {
                const sameState = String(item.estado || '').toUpperCase() === String(context.estado || '').toUpperCase();
                const sameUnit = String(item.unidade || '').trim().toLowerCase() === String(context.unidade || '').trim().toLowerCase();
                return sameState && sameUnit;
            })
            .map((item) => {
                const hostKey = normalizeHost(item.host);
                const statusData = pingMap.get(hostKey) || {};
                return {
                    ...item,
                    status: statusData.status || 'OFFLINE',
                    latencia: statusData.latencia ?? statusData.tempo ?? null,
                    perda: statusData.perda ?? statusData.packet_loss ?? (statusData.status === 'ONLINE' ? 0 : 100),
                    tempo: statusData.tempo ?? statusData.latencia ?? null
                };
            });

        renderCards(applyFilters(itens));
    } catch (error) {
        console.error('Erro ao carregar dados de unidade:', error);
        cardsContainer.innerHTML = '<div class="empty">Não foi possível carregar os dados de monitoramento desta unidade.</div>';
    }
}

searchInput.addEventListener('input', async () => {
    const inventario = await fetch(`${API_BASE}/data/inventario.json`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
    const pingResumo = await fetch(`${API_BASE}/data/resultado_ping.json`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []);

    const pingMap = new Map();
    pingResumo.forEach((entry) => {
        const hostKey = normalizeHost(entry.host || entry.hostname || entry.ip);
        if (!hostKey) return;
        pingMap.set(hostKey, { ...entry });
    });

    const itens = inventario
        .filter((item) => String(item.estado || '').toUpperCase() === String(context.estado || '').toUpperCase() && String(item.unidade || '').trim().toLowerCase() === String(context.unidade || '').trim().toLowerCase())
        .map((item) => {
            const hostKey = normalizeHost(item.host);
            const statusData = pingMap.get(hostKey) || {};
            return {
                ...item,
                status: statusData.status || 'OFFLINE',
                latencia: statusData.latencia ?? statusData.tempo ?? null,
                perda: statusData.perda ?? statusData.packet_loss ?? (statusData.status === 'ONLINE' ? 0 : 100),
                tempo: statusData.tempo ?? statusData.latencia ?? null
            };
        });

    renderCards(applyFilters(itens));
});

document.getElementById('clearBtn').addEventListener('click', () => {
    searchInput.value = '';
    loadData();
});

document.getElementById('addBtn').addEventListener('click', () => {
    window.location.href = `${API_BASE}/`;
});

loadData();
setInterval(loadData, 60000);
