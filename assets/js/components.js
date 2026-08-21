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

function alternarTema(){

    document.body.classList.toggle(
        "dark-mode"
    );

    const escuro =
        document.body.classList.contains(
            "dark-mode"
        );

    localStorage.setItem(
        "tema",
        escuro
            ? "dark"
            : "light"
    );

    const botao =
        document.getElementById(
            "themeToggle"
        );

    if(botao){

        botao.innerText =
            escuro
                ? "☀️"
                : "🌙";

    }

}

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const tema =
            localStorage.getItem(
                "tema"
            );

        if(tema === "dark"){

            document.body.classList.add(
                "dark-mode"
            );

            const botao =
                document.getElementById(
                    "themeToggle"
                );

            if(botao){

                botao.innerText =
                    "☀️";

            }

        }

    }
);
