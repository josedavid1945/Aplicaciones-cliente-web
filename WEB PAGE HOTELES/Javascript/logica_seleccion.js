document.addEventListener('DOMContentLoaded', () => {
    const getEl = id => document.getElementById(id);
    const infoFechaEntradaEl = getEl('info-fecha-entrada');
    const infoFechaSalidaEl = getEl('info-fecha-salida');
    const infoAdultosEl = getEl('info-adultos');
    const infoNinosEl = getEl('info-ninos');
    const listaHabitacionesEl = getEl('lista-habitaciones-disponibles');

    const urlParams = new URLSearchParams(window.location.search);
    const parametrosReserva = {
        fechaEntrada: urlParams.get('fechaEntrada'),
        fechaSalida: urlParams.get('fechaSalida'),
        adultos: urlParams.get('adultos') || '0', // Default to '0' if null
        ninos: urlParams.get('ninos') || '0'     // Default to '0' if null
    };
    const datosClienteSimulado = {
        idClienteSimulado: urlParams.get('idClienteSimulado'),
        nombres: urlParams.get('nombreCliente'),
        apellidos: urlParams.get('apellidoCliente'),
        email: urlParams.get('emailCliente'),
        ciudad: urlParams.get('ciudadCliente'),
        telefono: urlParams.get('telefonoCliente')
    };

    if (!parametrosReserva.fechaEntrada || !parametrosReserva.fechaSalida || !datosClienteSimulado.nombres) {
        if (listaHabitacionesEl) {
            listaHabitacionesEl.innerHTML = `
                <p class="mensaje-informativo" style="color:red;">
                    Error: Faltan parámetros de búsqueda o datos del cliente. 
                    Por favor, <a href="vista_principal.html">inicie la reserva nuevamente</a>.
                </p>`;
        }
        return;
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return dateStr; } // Fallback
    };

    if (infoFechaEntradaEl) infoFechaEntradaEl.textContent = formatDate(parametrosReserva.fechaEntrada);
    if (infoFechaSalidaEl) infoFechaSalidaEl.textContent = formatDate(parametrosReserva.fechaSalida);
    if (infoAdultosEl) infoAdultosEl.textContent = parametrosReserva.adultos;
    if (infoNinosEl) infoNinosEl.textContent = parametrosReserva.ninos;

    if (listaHabitacionesEl) {
        cargarYMostrarHabitacionesDisponibles(parametrosReserva, datosClienteSimulado, listaHabitacionesEl);
    } else {
        console.error("Contenedor para lista de habitaciones no encontrado.");
    }
});

async function cargarYMostrarHabitacionesDisponibles(paramsReserva, clienteData, contenedorEl) {
    contenedorEl.innerHTML = '<p class="mensaje-informativo">Buscando habitaciones disponibles...</p>';
    try {
        const [habResponse, reservasResponse] = await Promise.all([
            fetch('../datos/habitaciones.json'),
            fetch('../datos/reservas.json')
        ]);

        if (!habResponse.ok) throw new Error(`Error habitaciones: ${habResponse.status}`);
        if (!reservasResponse.ok) throw new Error(`Error reservas: ${reservasResponse.status}`);

        const todasHabitaciones = await habResponse.json();
        const todasReservas = await reservasResponse.json();

        const fechaEntrada = new Date(paramsReserva.fechaEntrada + 'T00:00:00');
        const fechaSalida = new Date(paramsReserva.fechaSalida + 'T00:00:00');
        const totalHuespedes = parseInt(paramsReserva.adultos) + parseInt(paramsReserva.ninos);

        const habitacionesDisponibles = todasHabitaciones.filter(hab => {
            if (!hab.disponible_actualmente || hab.capacidad_maxima < totalHuespedes) return false;
            return !todasReservas.some(reserva => 
                reserva.id_habitacion_reservada === hab.id_habitacion &&
                reserva.estado_reserva !== 'cancelada' &&
                fechaEntrada < new Date(reserva.fecha_salida + 'T00:00:00') &&
                fechaSalida > new Date(reserva.fecha_llegada + 'T00:00:00')
            );
        });

        contenedorEl.innerHTML = '';
        if (habitacionesDisponibles.length > 0) {
            habitacionesDisponibles.forEach(hab => {
                const urlImagen = hab.url_imagen_principal ? `../${hab.url_imagen_principal}` : '../IMAGENES/placeholder_habitacion.png';
                const amenidadesHtml = (hab.amenidades && hab.amenidades.length > 0)
                    ? `<ul class="amenidades-lista">${hab.amenidades.map(am => `<li>${am}</li>`).join('')}</ul>`
                    : '<ul class="amenidades-lista"><li>Consultar amenidades</li></ul>';
                
                const divHabitacion = document.createElement('div');
                divHabitacion.className = 'habitacion-disponible-item';
                divHabitacion.innerHTML = `
                    <div class="imagen-habitacion-wrapper"> 
                        <img src="${urlImagen}" alt="${hab.tipo_habitacion}">
                    </div>
                    <div class="detalles">
                        <h3>${hab.tipo_habitacion} - ${hab.numero_habitacion || hab.id_habitacion}</h3>
                        <p>${hab.descripcion || 'Descripción no disponible.'}</p>
                        ${amenidadesHtml}
                        <p class="precio">$${Number(hab.precio_noche).toFixed(2)} por noche</p>
                        <button class="btn-seleccionar-habitacion" 
                                data-id-habitacion="${hab.id_habitacion}" 
                                data-nombre-hab="${hab.tipo_habitacion} - ${hab.numero_habitacion || hab.id_habitacion}">
                            Seleccionar y Reservar esta Habitación
                        </button>
                    </div>`;
                contenedorEl.appendChild(divHabitacion);
            });

            contenedorEl.querySelectorAll('.btn-seleccionar-habitacion').forEach(boton => {
                boton.addEventListener('click', (event) => {
                    const { idHabitacion, nombreHab } = event.target.dataset;
                    if (!paramsReserva.fechaEntrada || !clienteData.nombres) { // Verificación básica
                        alert("Error: No se pudieron recuperar detalles. Intente de nuevo.");
                        return;
                    }
                    procesarSeleccionHabitacion(idHabitacion, nombreHab, paramsReserva, clienteData); 
                });
            });
        } else {
            contenedorEl.innerHTML = '<p class="mensaje-informativo">Lo sentimos, no hay habitaciones disponibles para los criterios seleccionados.</p>';
        }
    } catch (error) {
        console.error("Error al cargar/mostrar habitaciones:", error);
        contenedorEl.innerHTML = `<p class="mensaje-informativo" style="color:red;">Error al buscar: ${error.message}</p>`;
    }
}

function procesarSeleccionHabitacion(idHabitacion, nombreHabitacion, paramsReserva, datosCliente) {
    if (!datosCliente || !datosCliente.nombres || !datosCliente.apellidos) {
        alert("Error: Faltan datos del cliente. Intente de nuevo.");
        return;
    }
    const idReservaSimulada = 'res_sim_' + Date.now();
    const nombreClienteCompleto = `${datosCliente.nombres || ''} ${datosCliente.apellidos || ''}`.trim();

    alert(`¡Habitación "${nombreHabitacion}" seleccionada (Simulación)!\nID Reserva (simulada): ${idReservaSimulada}\nCliente: ${nombreClienteCompleto}\n\nEsto es una simulación, no se guardaron datos.`);
    window.location.href = 'vista_principal.html'; 
}
