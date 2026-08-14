function filtrarArvore() {

    const termo =
        document
            .getElementById("busca")
            .value
            .toUpperCase();

    const estados =
        document.querySelectorAll("details");

    estados.forEach(function(item){

        const texto =
            item.innerText.toUpperCase();

        if(termo === ""){

            item.style.display = "";
            return;
        }

        if(texto.includes(termo)){
            item.style.display = "";
            item.open = true;
        } else {
            item.style.display = "none";
        }

    });

}