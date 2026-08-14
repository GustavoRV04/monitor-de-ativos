window.__componentsLoaded = false;

async function loadComponents() {
    const processed = new WeakSet();

    while (true) {
        const pending = Array.from(document.querySelectorAll('[data-include]'))
            .filter(el => !processed.has(el));

        if (!pending.length) break;

        for (const el of pending) {
            processed.add(el);
            const file = el.getAttribute("data-include");

            try {
                const resp = await fetch("/assets/components/" + file);
                if (resp.ok) {
                    const html = await resp.text();
                    el.innerHTML = html;
                }
            } catch (e) {
                console.error("Erro ao incluir:", file, e);
            }
        }
    }

    window.__componentsLoaded = true;
    window.dispatchEvent(new Event('components-ready'));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadComponents);
} else {
    loadComponents();
}
