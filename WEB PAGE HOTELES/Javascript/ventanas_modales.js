document.addEventListener('DOMContentLoaded', () => {
    const getEl = (selector, parent = document) => parent.querySelector(selector);
    const getAll = (selector, parent = document) => parent.querySelectorAll(selector);

    // --- Modal de Registro ---
    const modalRegistro = getEl("#modal");
    const botonesAbrirModalRegistro = getAll(".btn-abrir-modal");
    const formRegistroModal = getEl("#form-registro-modal");
    const botonCancelarSoloModal = getEl("#btn-cancelar-solo-modal");

    if (modalRegistro && botonesAbrirModalRegistro.length > 0) {
        botonesAbrirModalRegistro.forEach(boton => {
            boton.addEventListener("click", () => {
                const fechaEntradaEl = getEl('#entrada');
                const fechaSalidaEl = getEl('#salida');
                if (boton.classList.contains('btn-abrir-modal') && boton.textContent.trim().toUpperCase() === 'RESERVAR') {
                    if (!fechaEntradaEl || !fechaSalidaEl || !fechaEntradaEl.value || !fechaSalidaEl.value) {
                        alert("Por favor, seleccione las fechas de entrada y salida antes de registrarse para una reserva.");
                        return;
                    }
                }
                if (formRegistroModal) formRegistroModal.reset();
                getAll('#form-registro-modal .error-text').forEach(span => span.textContent = '');
                getAll('#form-registro-modal input.input-error').forEach(input => input.classList.remove('input-error'));
                modalRegistro.showModal();
            });
        });
    }

    if (botonCancelarSoloModal && modalRegistro) {
        botonCancelarSoloModal.addEventListener("click", () => modalRegistro.close());
    }

    if (modalRegistro) {
        modalRegistro.addEventListener('click', (event) => {
            if (event.target === modalRegistro) modalRegistro.close();
        });
    }

    // --- Modal de Video ---
    const botonAbrirModalVideo = getEl("#container-buttons");
    const modalVideo = getEl("#ctn-cover-video");

    if (botonAbrirModalVideo && modalVideo) {
        botonAbrirModalVideo.addEventListener("click", () => {
            typeof modalVideo.showModal === 'function' ? modalVideo.showModal() : modalVideo.show();
        });
        modalVideo.addEventListener('click', (event) => {
            if (event.target === modalVideo) modalVideo.close();
        });
    }

    // --- Formulario de Registro Modal ---
    if (formRegistroModal && modalRegistro) {
        formRegistroModal.addEventListener("submit", function(event) {
            event.preventDefault();
            let esValido = true;

            const campos = {
                nombres: { input: getEl('input[name="nombres"]', formRegistroModal), errorEl: getEl('#error-nombres'), msg: "El nombre es obligatorio." },
                apellidos: { input: getEl('input[name="apellidos"]', formRegistroModal), errorEl: getEl('#error-apellidos'), msg: "El apellido es obligatorio." },
                email: { input: getEl('input[name="email"]', formRegistroModal), errorEl: getEl('#error-email'), msg: "El email es obligatorio.", regexMsg: "El formato del email no es válido.", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
                ciudad: { input: getEl('input[name="ciudad"]', formRegistroModal), errorEl: getEl('#error-ciudad'), msg: "La ciudad es obligatoria." },
                telefono: { input: getEl('input[name="telefono"]', formRegistroModal), errorEl: getEl('#error-telefono'), optional: true, regexMsg: "Teléfono: 7-10 dígitos.", regex: /^\d{7,10}$/ }
            };

            // Limpiar errores previos
            Object.values(campos).forEach(c => {
                if (c.errorEl) c.errorEl.textContent = '';
                if (c.input) c.input.classList.remove('input-error');
            });

            for (const nombreCampo in campos) {
                const campo = campos[nombreCampo];
                const valor = campo.input ? campo.input.value.trim() : "";

                if (!campo.optional && valor === "") {
                    if (campo.errorEl) campo.errorEl.textContent = campo.msg;
                    if (campo.input) campo.input.classList.add('input-error');
                    esValido = false;
                } else if (campo.regex && valor !== "" && !campo.regex.test(valor)) {
                    if (campo.errorEl) campo.errorEl.textContent = campo.regexMsg;
                    if (campo.input) campo.input.classList.add('input-error');
                    esValido = false;
                }
            }

            
            const fechaEntrada = getEl('#entrada')?.value;
            const fechaSalida = getEl('#salida')?.value;
            const numAdultos = getEl('#adultos')?.value;
            const numNinos = getEl('#ninos')?.value;

            if (!fechaEntrada || !fechaSalida) {
                alert("Error: Fechas de entrada/salida son obligatorias. Cierre y selecciónelas.");
                return; 
            }
            const dEntrada = new Date(fechaEntrada + "T00:00:00");
            const dSalida = new Date(fechaSalida + "T00:00:00");
            const dHoy = new Date(); dHoy.setHours(0,0,0,0);

            if (dEntrada < dHoy) {
                alert("Fecha de entrada no puede ser anterior a hoy."); return;
            }
            if (dSalida <= dEntrada) {
                alert("Fecha de salida debe ser posterior a la de entrada."); return;
            }

            const idClienteSimulado = 'cli_' + Date.now();
            alert("¡Registro (simulado) exitoso! Serás redirigido para seleccionar tu habitación.");
            modalRegistro.close();

            const queryParams = new URLSearchParams({
                fechaEntrada, fechaSalida, adultos: numAdultos, ninos: numNinos,
                nombreCliente: campos.nombres.input.value.trim(),
                apellidoCliente: campos.apellidos.input.value.trim(),
                emailCliente: campos.email.input.value.trim(),
                ciudadCliente: campos.ciudad.input.value.trim(),
                telefonoCliente: campos.telefono.input.value.trim(),
                idClienteSimulado
            });
            window.location.href = `seleccionar_habitacion.html?${queryParams.toString()}`; 
        });
    }
});
