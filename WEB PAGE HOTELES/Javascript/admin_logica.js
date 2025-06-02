document.addEventListener('DOMContentLoaded', () => {
    // --- Helpers ---
    const getEl = id => document.getElementById(id);
    const toggle = (el, show) => { if (el) el.style.display = show ? 'block' : 'none'; };
    const fetchJSON = async (url, errorMsgPrefix = 'Error HTTP') => {
        const response = await fetch(url);
        // Esta validación es crucial para saber si el archivo/endpoint fue accesible
        if (!response.ok) throw new Error(`${errorMsgPrefix}: ${response.status} ${response.statusText || ''}`);
        return response.json();
    };
    const parseNaiveDateString = (dateStr) => { // Interpreta YYYY-MM-DD como fecha local a las 00:00
        if (!dateStr) return null;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };
    const renderTable = (sectionElement, title, headers, data, rowHtmlFn, noDataMsg) => {
        sectionElement.innerHTML = `<h2>${title}</h2>`;
        // Esta validación es la básica "si no se encuentran datos"
        if (!data || data.length === 0) {
            sectionElement.innerHTML += `<p>${noDataMsg}</p>`;
            return;
        }
        const table = document.createElement('table');
        table.className = 'tabla-datos';
        table.innerHTML = `
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${data.map(item => `<tr>${rowHtmlFn(item)}</tr>`).join('')}</tbody>`;
        sectionElement.appendChild(table);
    };

    // --- Selectores Principales ---
    const loginForm = getEl('login-form');
    const loginContainer = getEl('login-container');
    const adminPanel = getEl('admin-panel');
    const loginError = getEl('login-error');
    const logoutButton = getEl('logout-button');
    const adminNavButtons = document.querySelectorAll('.admin-nav button');
    
    const sections = {
        bienvenida: getEl('section-bienvenida'),
        habitaciones: getEl('section-habitaciones'),
        reservas: getEl('section-reservas'),
        clientes: getEl('section-clientes')
    };

    // --- Lógica de Login ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = loginForm.elements['admin-username'].value;
            const password = loginForm.elements['admin-password'].value;
            const adminUsers = await fetchJSON('../datos/usuarios_admin.json', 'Error al cargar datos de admin');
            const adminUser = adminUsers[0]; // Asume que el primer usuario es el válido
                
                if (adminUser && username === adminUser.usuario && password === adminUser.password_simple) {
                    toggle(loginContainer, false);
                    toggle(adminPanel, true);
                    toggle(loginError, false);
                    sessionStorage.setItem('isAdminLoggedIn', 'true');
                    showSection('bienvenida');
                } else {
                    loginError.textContent = 'Usuario o contraseña incorrectos.';
                    toggle(loginError, true);
                }
        });
    }

    // --- Lógica de Logout ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('isAdminLoggedIn');
            toggle(loginContainer, true);
            toggle(adminPanel, false);
        });
    }
    
    // --- Lógica de Navegación del Panel Admin ---
    adminNavButtons.forEach(button => {
        button.addEventListener('click', () => showSection(button.dataset.section || button.getAttribute('data-section')));
    });

    const sectionLoaders = {
        habitaciones: cargarYMostrarHabitaciones,
        reservas: cargarYMostrarReservas,
        clientes: cargarYMostrarClientes
    };

    function showSection(sectionName) {
        Object.values(sections).forEach(section => toggle(section, false));
        const sectionToShow = sections[sectionName];
        if (sectionToShow) { // Comprobación básica de existencia de la sección
            toggle(sectionToShow, true);
            sectionLoaders[sectionName]?.(); // Llama al cargador si existe
        } else {
            console.warn(`Sección '${sectionName}' no encontrada. Mostrando bienvenida.`);
            toggle(sections.bienvenida, true); // Fallback a bienvenida
        }
    }

    // --- Carga y Muestra de Secciones Específicas ---
    async function cargarYMostrarHabitaciones() {
        const sectionElement = sections.habitaciones;
        try {
            // Ya no necesitamos cargar 'reservas.json' aquí para el cálculo de disponibilidad
            const habitacionesData = await fetchJSON('../datos/habitaciones.json', 'Error HTTP al cargar habitaciones');

            renderTable(sectionElement, 'Gestión de Habitaciones',
                // Columna simplificada a "Disponible"
                ['ID', 'Número', 'Tipo', 'Precio/Noche', 'Capacidad', 'Disponible', 'Acciones'],
                habitacionesData,
                (hab) => {
                    // Lógica de disponibilidad simplificada: usa directamente el campo del JSON
                    const disponible = hab.disponible_actualmente; 
                    return `<td>${hab.id_habitacion}</td>
                            <td>${hab.numero_habitacion}</td>
                            <td>${hab.tipo_habitacion}</td>
                            <td>$${Number(hab.precio_noche).toFixed(2)}</td>
                            <td>${hab.capacidad_maxima}</td>
                            <td>${disponible ? 'Sí' : 'No'}</td> 
                            <td>
                                <button class="btn-accion btn-editar" data-id="${hab.id_habitacion}">Editar</button>
                                <button class="btn-accion btn-eliminar" data-id="${hab.id_habitacion}">Eliminar</button>
                            </td>`;
                }, 'No hay habitaciones registradas.' // Mensaje si no hay datos
            );
        } catch (error) {
            console.error('Error al cargar datos para habitaciones:', error);
            sectionElement.innerHTML = '<h2>Gestión de Habitaciones</h2><p style="color:red;">Error al cargar datos. Verifique la consola.</p>';
        }
    }

    async function cargarYMostrarClientes() {
        const sectionElement = sections.clientes;
        if (!sectionElement) return console.error("Sección clientes no encontrada.");
        sectionElement.innerHTML = '<h2>Clientes Registrados</h2><p>Cargando clientes...</p>';
        try {
            const clientesData = await fetchJSON('../datos/clientes.json', 'Error HTTP al cargar clientes');
            renderTable(sectionElement, 'Clientes Registrados',
                ['ID Cliente', 'Nombres', 'Apellidos', 'Email', 'Ciudad', 'Teléfono', 'Fecha Registro'],
                clientesData,
                (cliente) => {
                    const fechaReg = cliente.fecha_registro ? 
                        new Date(cliente.fecha_registro).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                    // El uso de '||' para valores por defecto no es una validación compleja
                    return `<td>${cliente.id_cliente}</td>
                            <td>${cliente.nombres}</td>
                            <td>${cliente.apellidos}</td>
                            <td>${cliente.email}</td>
                            <td>${cliente.ciudad || 'No especificada'}</td>
                            <td>${cliente.telefono || 'No especificado'}</td>
                            <td>${fechaReg}</td>`;
                }, 'No hay clientes registrados.'
            );
        } catch (error) {
            console.error('Error al cargar los clientes:', error);
            sectionElement.innerHTML = '<h2>Clientes Registrados</h2><p style="color:red;">Error al cargar datos. Verifique la consola.</p>';
        }
    }
    
    async function cargarYMostrarReservas() {
        const sectionElement = sections.reservas;
        if (!sectionElement) return console.error("Sección de reservas no encontrada.");
        sectionElement.innerHTML = '<h2>Gestión de Reservas</h2><p>Cargando reservas...</p>';
        try {
            const [reservasData, habitacionesData, clientesData] = await Promise.all([
                fetchJSON('../datos/reservas.json', 'Error HTTP al cargar reservas'),
                fetchJSON('../datos/habitaciones.json', 'Error HTTP al cargar habitaciones'),
                fetchJSON('../datos/clientes.json', 'Error HTTP al cargar clientes')
            ]);

            const habitacionesMap = habitacionesData.reduce((map, hab) => (map[hab.id_habitacion] = hab, map), {});
            const clientesMap = clientesData.reduce((map, cli) => (map[cli.id_cliente] = cli, map), {});
            
            renderTable(sectionElement, 'Gestión de Reservas',
                ['ID Reserva', 'Cliente', 'Habitación', 'Llegada', 'Salida', 'Adultos', 'Niños', 'Estado', 'Creada el', 'Acciones'],
                reservasData,
                (res) => {
                    const hab = habitacionesMap[res.id_habitacion_reservada];
                    const cli = clientesMap[res.id_cliente];
                    // Estas comprobaciones de existencia de hab y cli son simples y útiles para evitar errores
                    const clienteNombre = cli ? `${cli.nombres} ${cli.apellidos}` : 'Cliente no encontrado';
                    const habDetalle = hab ? `${hab.numero_habitacion} (${hab.tipo_habitacion})` : 'Habitación no encontrada';
                    const llegadaF = parseNaiveDateString(res.fecha_llegada)?.toLocaleDateString('es-EC') || 'N/A';
                    const salidaF = parseNaiveDateString(res.fecha_salida)?.toLocaleDateString('es-EC') || 'N/A';
                    const creacionF = res.fecha_creacion_reserva ? 
                        new Date(res.fecha_creacion_reserva).toLocaleString('es-EC', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

                    return `<td>${res.id_reserva}</td>
                            <td>${clienteNombre}</td>
                            <td>${habDetalle}</td>
                            <td>${llegadaF}</td>
                            <td>${salidaF}</td>
                            <td>${res.numero_adultos}</td>
                            <td>${res.numero_ninos}</td>
                            <td>${res.estado_reserva}</td>
                            <td>${creacionF}</td>
                            <td>
                                <button class="btn-accion btn-editar" data-id="${res.id_reserva}">Editar</button>
                                <button class="btn-accion btn-cancelar-reserva" data-id="${res.id_reserva}">Cancelar</button>
                            </td>`;
                }, 'No hay reservas registradas.'
            );
        } catch (error) {
            console.error('Error al cargar datos para reservas:', error);
            sectionElement.innerHTML = '<h2>Gestión de Reservas</h2><p style="color:red;">Error al cargar datos. Verifique la consola.</p>';
        }
    }
});