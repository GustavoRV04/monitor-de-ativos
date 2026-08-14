// handles Add Asset modal and submit
function setupAddAsset(){
    const btn = document.getElementById('addAssetBtn');
    if(!btn) return;
    const modal = document.getElementById('addAssetModal');
    const form = document.getElementById('addAssetForm');
    const cancel = document.getElementById('addAssetCancel');

    btn.addEventListener('click', (e)=>{
        e.preventDefault();
        if(modal) modal.style.display = 'flex';
    });

    if(cancel) cancel.addEventListener('click', ()=>{
        if(modal) modal.style.display = 'none';
    });

    if(form){
        form.addEventListener('submit', async (ev)=>{
            ev.preventDefault();
            const payload = {
                estado: document.getElementById('add_estado').value,
                unidade: document.getElementById('add_unidade').value.trim(),
                equipamento: document.getElementById('add_equipamento').value.trim(),
                host: document.getElementById('add_host').value.trim()
            };

            try{
                const resp = await fetch('/api/add_asset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if(resp.ok){
                    const json = await resp.json();
                    console.log('Added', json);
                    if(modal) modal.style.display = 'none';
                    // refresh dashboard inventory
                    if(typeof carregar === 'function') carregar();
                } else {
                    const txt = await resp.text();
                    alert('Erro ao salvar: ' + resp.status + '\n' + txt);
                }

            }catch(e){
                console.error(e);
                alert('Erro ao conectar com a API');
            }

        });
    }
}

if(window.__componentsLoaded){
    setupAddAsset();
} else {
    window.addEventListener('components-ready', setupAddAsset);
}
