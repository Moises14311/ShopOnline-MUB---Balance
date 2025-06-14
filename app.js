// Configuración
const config = {
  currency: '$',
  dateFormat: 'es-ES'
};

// Datos
let productos = JSON.parse(localStorage.getItem("productos")) || [];
let sorteos = JSON.parse(localStorage.getItem("sorteos")) || [];

// Elementos DOM
const elementos = {
  tablaProductos: document.getElementById("tablaProductos"),
  tablaSorteos: document.getElementById("tablaSorteos"),
  grafico: document.getElementById("graficoVentas").getContext("2d"),
  graficoSorteos: document.getElementById("graficoSorteos").getContext("2d"),
  graficoResumenVentas: document.getElementById("graficoResumenVentas")?.getContext('2d'),
  graficoResumenSorteos: document.getElementById("graficoResumenSorteos")?.getContext('2d'),
  filtros: {
    fechaInicio: document.getElementById("fechaInicio"),
    fechaFin: document.getElementById("fechaFin")
  },
  formularios: {
    producto: {
      nombre: document.getElementById("nombreProducto"),
      cantidad: document.getElementById("cantidadProducto"),
      precio: document.getElementById("precioProducto"),
      inversion: document.getElementById("inversionProducto"),
      fecha: document.getElementById("fechaProducto")
    },
    sorteo: {
      producto: document.getElementById("nombreSorteo"),
      valor: document.getElementById("valorSorteo"),
      numeros: document.getElementById("numerosSorteo"),
      valorNumero: document.getElementById("valorNumeroSorteo"),
      ganancia: document.getElementById("gananciaSorteo"),
      fecha: document.getElementById("fechaSorteo")
    }
  }
};

// Gráficos
let chartVentas;
let chartSorteos;
let chartResumenVentas;
let chartResumenSorteos;

// Cargar datos
function cargarDatos() {
  try {
    const productosGuardados = localStorage.getItem("productos");
    const sorteosGuardados = localStorage.getItem("sorteos");
    
    if (productosGuardados) productos = JSON.parse(productosGuardados);
    if (sorteosGuardados) sorteos = JSON.parse(sorteosGuardados);
    
    // Establecer fechas por defecto
    const hoy = new Date().toISOString().split('T')[0];
    elementos.formularios.producto.fecha.value = hoy;
    elementos.formularios.sorteo.fecha.value = hoy;
    elementos.filtros.fechaInicio.value = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    elementos.filtros.fechaFin.value = hoy;
    
    render();
    mostrarPanel('resumen'); // Mover esta línea al final
  } catch (e) {
    console.error("Error al cargar datos:", e);
    alert("Error al cargar los datos guardados");
  }
}

// Guardar datos
function guardarDatos() {
  try {
    localStorage.setItem("productos", JSON.stringify(productos));
    localStorage.setItem("sorteos", JSON.stringify(sorteos));
  } catch (e) {
    console.error("Error al guardar datos:", e);
    alert("Error al guardar los datos");
  }
}

// Formatear número con separador de miles
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Renderizar aplicación
function render() {
  const { fechaInicio, fechaFin } = elementos.filtros;
  const productosFiltrados = filtrarProductos(fechaInicio.value, fechaFin.value);
  
  renderTablaProductos(productosFiltrados);
  renderKPIs(productosFiltrados);
  renderGraficoVentas(productosFiltrados);
  renderSorteos();
  renderGraficoSorteos();
  renderResumen(); // Añadir esta línea
}

// Filtrar productos por fecha
function filtrarProductos(inicio, fin) {
  if (!inicio && !fin) return productos;
  
  const fechaInicio = inicio ? new Date(inicio) : new Date(0);
  const fechaFin = fin ? new Date(fin) : new Date();
  
  return productos.filter(p => {
    const fechaProducto = new Date(p.fecha);
    return fechaProducto >= fechaInicio && fechaProducto <= fechaFin;
  });
}

// Obtener últimos 10 elementos
function getUltimos10(elementos) {
  return elementos.slice(-10).reverse();
}

// Renderizar tabla de productos
function renderTablaProductos(productos) {
  const ultimos10 = getUltimos10(productos);
  
  elementos.tablaProductos.innerHTML = ultimos10.map((p, i) => `
    <tr>
      <td>${new Date(p.fecha).toLocaleDateString(config.dateFormat)}</td>
      <td>${p.nombre}</td>
      <td>${p.cantidad}</td>
      <td>${config.currency}${formatNumber(Math.round(p.precio))}</td>
      <td>${config.currency}${formatNumber(Math.round(p.cantidad * p.precio))}</td>
      <td>
        <button class="btn-small btn-danger" onclick="eliminarProducto(${productos.length - 1 - i})">
          Eliminar
        </button>
      </td>
    </tr>
  `).join('');
}

// Renderizar KPIs
function renderKPIs(productos) {
  const { total, cantidad, inversion } = productos.reduce((acc, p) => {
    const totalProducto = p.cantidad * p.precio;
    return {
      total: acc.total + totalProducto,
      cantidad: acc.cantidad + p.cantidad,
      inversion: acc.inversion + p.inversion
    };
  }, { total: 0, cantidad: 0, inversion: 0 });

  const ganancia = total - inversion;
  const margen = inversion > 0 ? ((ganancia / inversion) * 100).toFixed(2) : 0;

  document.getElementById("totalProductos").textContent = formatNumber(cantidad);
  document.getElementById("dineroRecogido").textContent = `${config.currency}${formatNumber(Math.round(total))}`;
  document.getElementById("inversion").textContent = `${config.currency}${formatNumber(Math.round(inversion))}`;
  document.getElementById("ganancia").textContent = `${config.currency}${formatNumber(Math.round(ganancia))}`;
  document.getElementById("margen").textContent = `${margen}%`;

  mostrarConsejosVentas(productos);
}

// Renderizar gráfico de ventas
function renderGraficoVentas(productos) {
  const datosPorFecha = productos.reduce((acc, p) => {
    const fecha = p.fecha.split('T')[0];
    acc[fecha] = (acc[fecha] || 0) + (p.cantidad * p.precio);
    return acc;
  }, {});

  const fechas = Object.keys(datosPorFecha).sort();
  const ventas = fechas.map(f => datosPorFecha[f]);

  if (chartVentas) chartVentas.destroy();

  chartVentas = new Chart(elementos.grafico, {
    type: 'line',
    data: {
      labels: fechas,
      datasets: [{
        label: 'Ventas',
        data: ventas,
        backgroundColor: 'rgba(255, 159, 28, 0.2)',
        borderColor: 'rgba(255, 159, 28, 1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(46, 196, 182, 1)',
        pointBorderColor: '#fff',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${config.currency}${formatNumber(Math.round(ctx.raw))}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255,255,255,0.1)'
          },
          ticks: {
            callback: value => `${config.currency}${formatNumber(value)}`
          }
        },
        x: {
          grid: {
            color: 'rgba(255,255,255,0.1)'
          }
        }
      }
    }
  });
}

// Renderizar sorteos
function renderSorteos() {
  const ultimos10 = getUltimos10(sorteos);
  
  elementos.tablaSorteos.innerHTML = ultimos10.map((s, i) => `
    <tr>
      <td>${new Date(s.fecha).toLocaleDateString(config.dateFormat)}</td>
      <td>${s.producto}</td>
      <td>${config.currency}${formatNumber(Math.round(s.valor))}</td>
      <td>${s.numeros || '-'}</td>
      <td>${s.valorNumero ? config.currency + formatNumber(Math.round(s.valorNumero)) : '-'}</td>
      <td>${config.currency}${formatNumber(Math.round(s.ganancia))}</td>
      <td>${s.margen ? s.margen.toFixed(2) + '%' : '-'}</td>
      <td>
        <button class="btn-small btn-danger" onclick="eliminarSorteo(${sorteos.length - 1 - i})">
          Eliminar
        </button>
      </td>
    </tr>
  `).join('');

  const { valor, ganancia } = sorteos.reduce((acc, s) => ({
    valor: acc.valor + s.valor,
    ganancia: acc.ganancia + s.ganancia
  }), { valor: 0, ganancia: 0 });

  const gananciaNeta = ganancia - valor;

  document.getElementById("valorTotalSorteos").textContent = `${config.currency}${formatNumber(Math.round(valor))}`;
  document.getElementById("gananciaTotalSorteos").textContent = `${config.currency}${formatNumber(Math.round(ganancia))}`;
  document.getElementById("gananciaNetaSorteos").textContent = `${config.currency}${formatNumber(Math.round(gananciaNeta))}`;
}

// Renderizar gráfico de sorteos
function renderGraficoSorteos() {
  const datosPorFecha = sorteos.reduce((acc, s) => {
    const fecha = s.fecha.split('T')[0];
    acc[fecha] = (acc[fecha] || 0) + s.ganancia;
    return acc;
  }, {});

  const fechas = Object.keys(datosPorFecha).sort();
  const ganancias = fechas.map(f => datosPorFecha[f]);

  if (chartSorteos) chartSorteos.destroy();

  chartSorteos = new Chart(elementos.graficoSorteos, {
    type: 'bar',
    data: {
      labels: fechas,
      datasets: [{
        label: 'Ganancias',
        data: ganancias,
        backgroundColor: 'rgba(46, 196, 182, 0.5)',
        borderColor: 'rgba(46, 196, 182, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${config.currency}${formatNumber(Math.round(ctx.raw))}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255,255,255,0.1)'
          },
          ticks: {
            callback: value => `${config.currency}${formatNumber(value)}`
          }
        },
        x: {
          grid: {
            color: 'rgba(255,255,255,0.1)'
          }
        }
      }
    }
  });
}

// Renderizar panel de resumen
function renderResumen() {
  // Asegúrate de que los elementos del DOM existen
  if (!elementos.graficoResumenVentas || !elementos.graficoResumenSorteos) {
    console.error("Elementos de gráficos de resumen no encontrados");
    return;
  }

  // Calcular KPIs de ventas
  const ventasTotales = productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
  const inversionTotal = productos.reduce((sum, p) => sum + p.inversion, 0);
  const gananciaVentas = ventasTotales - inversionTotal;
  
  // Actualizar KPIs en el resumen
  document.getElementById("resumenTotalVentas").textContent = `${config.currency}${formatNumber(Math.round(ventasTotales))}`;
  document.getElementById("resumenGananciaVentas").textContent = `${config.currency}${formatNumber(Math.round(gananciaVentas))}`;
  document.getElementById("gananciaNetaVentas").textContent = `${config.currency}${formatNumber(Math.round(gananciaVentas))}`;

  // Renderizar gráficos
  renderGraficoResumenVentas();
  renderGraficoResumenSorteos();
  
  // Mostrar análisis y recomendaciones
  mostrarAnalisisResumen();
  mostrarRecomendacionesIA();
  
  // Calcular tendencias
  calcularTendencias();
}

// Renderizar gráfico de resumen de ventas
function renderGraficoResumenVentas() {
  const datosPorMes = productos.reduce((acc, p) => {
    const fecha = new Date(p.fecha);
    const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    acc[mes] = (acc[mes] || 0) + (p.cantidad * p.precio);
    return acc;
  }, {});

  const meses = Object.keys(datosPorMes).sort();
  const ventas = meses.map(m => datosPorMes[m]);

  if (chartResumenVentas) chartResumenVentas.destroy();

  chartResumenVentas = new Chart(elementos.graficoResumenVentas, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [{
        label: 'Ventas',
        data: ventas,
        backgroundColor: 'rgba(255, 159, 28, 0.5)',
        borderColor: 'rgba(255, 159, 28, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${config.currency}${formatNumber(Math.round(ctx.raw))}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255,255,255,0.1)'
          },
          ticks: {
            callback: value => `${config.currency}${formatNumber(value)}`
          }
        },
        x: {
          grid: {
            color: 'rgba(255,255,255,0.1)'
          }
        }
      }
    }
  });
}

// Renderizar gráfico de resumen de sorteos
function renderGraficoResumenSorteos() {
  const datosPorMes = sorteos.reduce((acc, s) => {
    const fecha = new Date(s.fecha);
    const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    acc[mes] = (acc[mes] || 0) + s.ganancia;
    return acc;
  }, {});

  const meses = Object.keys(datosPorMes).sort();
  const ganancias = meses.map(m => datosPorMes[m]);

  if (chartResumenSorteos) chartResumenSorteos.destroy();

  chartResumenSorteos = new Chart(elementos.graficoResumenSorteos, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [{
        label: 'Ganancias',
        data: ganancias,
        backgroundColor: 'rgba(46, 196, 182, 0.5)',
        borderColor: 'rgba(46, 196, 182, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${config.currency}${formatNumber(Math.round(ctx.raw))}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255,255,255,0.1)'
          },
          ticks: {
            callback: value => `${config.currency}${formatNumber(value)}`
          }
        },
        x: {
          grid: {
            color: 'rgba(255,255,255,0.1)'
          }
        }
      }
    }
  });
}

// Mostrar análisis en el resumen
function mostrarAnalisisResumen() {
  const panel = document.getElementById("analisisResumen");
  if (!panel) {
    console.error("Elemento analisisResumen no encontrado");
    return;
  }

  if (productos.length === 0 && sorteos.length === 0) {
    panel.innerHTML = `<p>No hay datos suficientes para mostrar análisis.</p>`;
    return;
  }

  // Análisis de ventas
  const ventasUltimoMes = calcularVentasUltimoPeriodo(30);
  const ventasMesAnterior = calcularVentasUltimoPeriodo(60, 30);
  const crecimientoVentas = ventasMesAnterior > 0 ? 
    ((ventasUltimoMes - ventasMesAnterior) / ventasMesAnterior * 100).toFixed(2) : 0;
  
  // Análisis de sorteos
  const sorteosUltimoMes = calcularSorteosUltimoPeriodo(30);
  const sorteosMesAnterior = calcularSorteosUltimoPeriodo(60, 30);
  const crecimientoSorteos = sorteosMesAnterior > 0 ? 
    ((sorteosUltimoMes - sorteosMesAnterior) / sorteosMesAnterior * 100).toFixed(2) : 0;
  
  // Producto más vendido
  const productoMasVendido = [...productos]
    .sort((a, b) => b.cantidad - a.cantidad)[0];
  
  // Sorteo más rentable
  const sorteoMasRentable = [...sorteos]
    .sort((a, b) => b.ganancia - a.ganancia)[0];

  panel.innerHTML = `
    <div class="consejos-grid">
      <div class="consejo-card">
        <h4>Rendimiento de Ventas</h4>
        <ul>
          <li>Ventas último mes: ${config.currency}${formatNumber(Math.round(ventasUltimoMes))}</li>
          <li>Crecimiento: <span class="${crecimientoVentas > 0 ? 'tendencia-up' : crecimientoVentas < 0 ? 'tendencia-down' : 'tendencia-neutral'}">${crecimientoVentas}%</span></li>
          ${productoMasVendido ? `<li>Producto más vendido: ${productoMasVendido.nombre} (${productoMasVendido.cantidad} unidades)</li>` : ''}
        </ul>
      </div>
      <div class="consejo-card">
        <h4>Rendimiento de Sorteos</h4>
        <ul>
          <li>Ganancias último mes: ${config.currency}${formatNumber(Math.round(sorteosUltimoMes))}</li>
          <li>Crecimiento: <span class="${crecimientoSorteos > 0 ? 'tendencia-up' : crecimientoSorteos < 0 ? 'tendencia-down' : 'tendencia-neutral'}">${crecimientoSorteos}%</span></li>
          ${sorteoMasRentable ? `<li>Sorteo más rentable: ${sorteoMasRentable.producto} (${config.currency}${formatNumber(Math.round(sorteoMasRentable.ganancia))})</li>` : ''}
        </ul>
      </div>
      <div class="consejo-card">
        <h4>Comparativa General</h4>
        <ul>
          <li>Total ventas: ${config.currency}${formatNumber(Math.round(productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0)))}</li>
          <li>Total sorteos: ${config.currency}${formatNumber(Math.round(sorteos.reduce((sum, s) => sum + s.ganancia, 0)))}</li>
          <li>Ganancia total: ${config.currency}${formatNumber(Math.round(
            (productos.reduce((sum, p) => sum + (p.cantidad * p.precio - p.inversion), 0) +
             sorteos.reduce((sum, s) => sum + s.ganancia, 0)))
          )}</li>
        </ul>
      </div>
    </div>
  `;
}

// Calcular ventas en un periodo
function calcularVentasUltimoPeriodo(dias, offset = 0) {
  const fechaFin = new Date();
  const fechaInicio = new Date(fechaFin);
  fechaInicio.setDate(fechaFin.getDate() - dias - offset);
  fechaFin.setDate(fechaFin.getDate() - offset);
  
  return productos
    .filter(p => {
      const fechaProducto = new Date(p.fecha);
      return fechaProducto >= fechaInicio && fechaProducto <= fechaFin;
    })
    .reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
}

// Calcular sorteos en un periodo
function calcularSorteosUltimoPeriodo(dias, offset = 0) {
  const fechaFin = new Date();
  const fechaInicio = new Date(fechaFin);
  fechaInicio.setDate(fechaFin.getDate() - dias - offset);
  fechaFin.setDate(fechaFin.getDate() - offset);
  
  return sorteos
    .filter(s => {
      const fechaSorteo = new Date(s.fecha);
      return fechaSorteo >= fechaInicio && fechaSorteo <= fechaFin;
    })
    .reduce((sum, s) => sum + s.ganancia, 0);
}

// Calcular tendencias
function calcularTendencias() {
  // Tendencias de ventas
  const ventasUltimaSemana = calcularVentasUltimoPeriodo(7);
  const ventasSemanaAnterior = calcularVentasUltimoPeriodo(14, 7);
  const tendenciaVentas = ventasSemanaAnterior > 0 ? 
    ((ventasUltimaSemana - ventasSemanaAnterior) / ventasSemanaAnterior * 100) : 0;
  
  // Tendencias de sorteos
  const sorteosUltimaSemana = calcularSorteosUltimoPeriodo(7);
  const sorteosSemanaAnterior = calcularSorteosUltimoPeriodo(14, 7);
  const tendenciaSorteos = sorteosSemanaAnterior > 0 ? 
    ((sorteosUltimaSemana - sorteosSemanaAnterior) / sorteosSemanaAnterior * 100) : 0;
  
  // Actualizar elementos de tendencia
  actualizarTendencia("resumenTendenciaVentas", tendenciaVentas);
  actualizarTendencia("resumenTendenciaSorteos", tendenciaSorteos);
}

function actualizarTendencia(elementId, porcentaje) {
  const elemento = document.getElementById(elementId);
  const valorAbsoluto = Math.abs(porcentaje).toFixed(2);
  
  if (porcentaje > 5) {
    elemento.innerHTML = `<span class="tendencia-up">↑ ${valorAbsoluto}%</span>`;
  } else if (porcentaje < -5) {
    elemento.innerHTML = `<span class="tendencia-down">↓ ${valorAbsoluto}%</span>`;
  } else {
    elemento.innerHTML = `<span class="tendencia-neutral">→ ${valorAbsoluto}%</span>`;
  }
}

// Mostrar recomendaciones de IA
function mostrarRecomendacionesIA() {
  const panel = document.getElementById("recomendacionesIA");
  if (!panel) {
    console.error("Elemento recomendacionesIA no encontrado");
    return;
  }

  // Predicciones para ventas
  const prediccionVentas = predecirVentas();
  const prediccionSorteos = predecirSorteos();
  
  // Recomendaciones basadas en datos
  const recomendaciones = generarRecomendaciones();
  
  panel.innerHTML = `
    <div class="prediccion-card">
      <h4>Predicción de Ventas</h4>
      <p>${prediccionVentas}</p>
    </div>
    <div class="prediccion-card">
      <h4>Predicción de Sorteos</h4>
      <p>${prediccionSorteos}</p>
    </div>
    <div class="prediccion-card">
      <h4>Recomendaciones Estratégicas</h4>
      <ul>
        ${recomendaciones.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
  `;
}

// Predecir ventas
function predecirVentas() {
  if (productos.length < 10) return "Se necesitan más datos para hacer una predicción precisa.";
  
  // Agrupar ventas por mes
  const ventasPorMes = productos.reduce((acc, p) => {
    const fecha = new Date(p.fecha);
    const mes = fecha.getMonth() + 1;
    const año = fecha.getFullYear();
    const clave = `${año}-${String(mes).padStart(2, '0')}`;
    
    acc[clave] = (acc[clave] || 0) + (p.cantidad * p.precio);
    return acc;
  }, {});
  
  // Preparar datos para regresión
  const meses = Object.keys(ventasPorMes).sort();
  const datosRegresion = meses.map((mes, i) => [i, ventasPorMes[mes]]);
  
  // Aplicar regresión lineal
  const resultado = regression.linear(datosRegresion);
  const pendiente = resultado.equation[0];
  const ultimoValor = ventasPorMes[meses[meses.length - 1]];
  
  // Generar predicción
  if (pendiente > 0) {
    return `Las ventas muestran una tendencia alcista (${(pendiente * 100 / ultimoValor).toFixed(2)}% mensual). Se espera crecimiento en el próximo mes.`;
  } else if (pendiente < 0) {
    return `Las ventas muestran una tendencia a la baja (${Math.abs(pendiente * 100 / ultimoValor).toFixed(2)}% mensual). Considere estrategias de promoción.`;
  } else {
    return "Las ventas se mantienen estables. Podría explorar nuevos productos o promociones.";
  }
}

// Predecir sorteos
function predecirSorteos() {
  if (sorteos.length < 5) return "Se necesitan más datos de sorteos para hacer una predicción.";
  
  // Agrupar ganancias por mes
  const gananciasPorMes = sorteos.reduce((acc, s) => {
    const fecha = new Date(s.fecha);
    const mes = fecha.getMonth() + 1;
    const año = fecha.getFullYear();
    const clave = `${año}-${String(mes).padStart(2, '0')}`;
    
    acc[clave] = (acc[clave] || 0) + s.ganancia;
    return acc;
  }, {});
  
  // Calcular tendencia
  const meses = Object.keys(gananciasPorMes).sort();
  const ultimoMes = gananciasPorMes[meses[meses.length - 1]];
  const penultimoMes = meses.length > 1 ? gananciasPorMes[meses[meses.length - 2]] : ultimoMes;
  const cambio = ((ultimoMes - penultimoMes) / penultimoMes * 100);
  
  if (cambio > 10) {
    return `Los sorteos muestran un fuerte crecimiento (${cambio.toFixed(2)}% respecto al mes anterior). Continúe con esta estrategia.`;
  } else if (cambio < -10) {
    return `Los sorteos han disminuido (${Math.abs(cambio).toFixed(2)}% respecto al mes anterior). Considere revisar los premios o la promoción.`;
  } else {
    return "Los sorteos se mantienen estables. Podría experimentar con diferentes tipos de premios para aumentar participación.";
  }
}

// Generar recomendaciones estratégicas
function generarRecomendaciones() {
  const recomendaciones = [];
  
  // Recomendaciones basadas en productos
  if (productos.length > 0) {
    const productosBajoMargen = productos.filter(p => {
      const margen = ((p.cantidad * p.precio - p.inversion) / p.inversion * 100);
      return margen < 20;
    });
    
    if (productosBajoMargen.length > 0) {
      recomendaciones.push(`Reconsidere los productos con bajo margen: ${productosBajoMargen.slice(0, 3).map(p => p.nombre).join(', ')}.`);
    }
    
    const productosMasVendidos = [...productos]
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 3);
    
    if (productosMasVendidos.length > 0) {
      recomendaciones.push(`Asegure stock suficiente de los productos más vendidos: ${productosMasVendidos.map(p => p.nombre).join(', ')}.`);
    }
  }
  
  // Recomendaciones basadas en sorteos
  if (sorteos.length > 0) {
    const sorteosAltoMargen = [...sorteos]
      .sort((a, b) => (b.margen || 0) - (a.margen || 0))
      .slice(0, 3);
    
    if (sorteosAltoMargen.length > 0) {
      recomendaciones.push(`Repita los sorteos con mayor margen: ${sorteosAltoMargen.map(s => s.producto).join(', ')}.`);
    }
    
    const frecuenciaSorteos = sorteos.length / (new Date(sorteos[sorteos.length - 1].fecha) - new Date(sorteos[0].fecha)) * 30 * 24 * 60 * 60 * 1000;
    
    if (frecuenciaSorteos < 0.5) {
      recomendaciones.push("Considere aumentar la frecuencia de sorteos para mantener el interés de los clientes.");
    }
  }
  
  // Recomendaciones generales
  if (recomendaciones.length === 0) {
    recomendaciones.push("Los datos muestran un buen equilibrio. Continúe monitoreando el rendimiento.");
  }
  
  return recomendaciones;
}

// Mostrar consejos de ventas
function mostrarConsejosVentas(productos) {
  const panel = document.getElementById("panelIA");
  
  if (productos.length === 0) {
    panel.innerHTML = `<h3>Análisis de Ventas</h3><p>No hay datos suficientes.</p>`;
    return;
  }

  // Productos más rentables
  const masRentables = [...productos]
    .sort((a, b) => (b.cantidad * b.precio - b.inversion) - (a.cantidad * a.precio - a.inversion))
    .slice(0, 3);

  // Productos más vendidos
  const masVendidos = [...productos]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 3);

  // Análisis por periodos
  const hoy = new Date();
  const semanaPasada = new Date(hoy);
  semanaPasada.setDate(hoy.getDate() - 7);
  
  const mesPasado = new Date(hoy);
  mesPasado.setMonth(hoy.getMonth() - 1);
  
  const añoPasado = new Date(hoy);
  añoPasado.setFullYear(hoy.getFullYear() - 1);

  const ventasSemana = productos.filter(p => new Date(p.fecha) >= semanaPasada)
    .reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
  
  const ventasMes = productos.filter(p => new Date(p.fecha) >= mesPasado)
    .reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
    
  const ventasAño = productos.filter(p => new Date(p.fecha) >= añoPasado)
    .reduce((sum, p) => sum + (p.cantidad * p.precio), 0);

  panel.innerHTML = `
    <h3>Análisis de Ventas</h3>
    <div class="consejos-grid">
      <div class="consejo-card">
        <h4>Productos más rentables</h4>
        <ul>
          ${masRentables.map(p => `
            <li>${p.nombre} - Ganancia: ${config.currency}${formatNumber(Math.round(p.cantidad * p.precio - p.inversion))}</li>
          `).join('')}
        </ul>
      </div>
      <div class="consejo-card">
        <h4>Productos más vendidos</h4>
        <ul>
          ${masVendidos.map(p => `
            <li>${p.nombre} - Vendidos: ${p.cantidad}</li>
          `).join('')}
        </ul>
      </div>
      <div class="consejo-card">
        <h4>Ventas por período</h4>
        <ul>
          <li>Última semana: ${config.currency}${formatNumber(Math.round(ventasSemana))}</li>
          <li>Último mes: ${config.currency}${formatNumber(Math.round(ventasMes))}</li>
          <li>Último año: ${config.currency}${formatNumber(Math.round(ventasAño))}</li>
        </ul>
      </div>
    </div>
  `;
}

// Mostrar consejos de sorteos
function mostrarConsejosSorteos() {
  const panel = document.getElementById("panelIASorteos");
  
  if (sorteos.length === 0) {
    panel.innerHTML = `<h3>Análisis de Sorteos</h3><p>No hay datos suficientes.</p>`;
    return;
  }

  // Sorteos más rentables
  const masRentables = [...sorteos]
    .sort((a, b) => b.ganancia - a.ganancia)
    .slice(0, 3);

  // Productos más sorteados
  const productosCount = sorteos.reduce((acc, s) => {
    acc[s.producto] = (acc[s.producto] || 0) + 1;
    return acc;
  }, {});

  const masSorteados = Object.entries(productosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  panel.innerHTML = `
    <h3>Análisis de Sorteos</h3>
    <div class="consejos-grid">
      <div class="consejo-card">
        <h4>Sorteos más rentables</h4>
        <ul>
          ${masRentables.map(s => `
            <li>${s.producto} - Ganancia: ${config.currency}${formatNumber(Math.round(s.ganancia))}</li>
          `).join('')}
        </ul>
      </div>
      <div class="consejo-card">
        <h4>Productos más sorteados</h4>
        <ul>
          ${masSorteados.map(([producto, count]) => `
            <li>${producto} - Veces: ${count}</li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

// Funciones CRUD
function agregarProducto() {
  const { nombre, cantidad, precio, inversion, fecha } = elementos.formularios.producto;
  
  if (!nombre.value || !cantidad.value || !precio.value || !inversion.value || !fecha.value) {
    alert("Por favor complete todos los campos");
    return;
  }

  // Validar valores numéricos
  if (cantidad.value <= 0 || precio.value <= 0 || inversion.value <= 0) {
    alert("Los valores numéricos deben ser mayores a cero");
    return;
  }

  productos.push({
    nombre: nombre.value,
    cantidad: parseInt(cantidad.value),
    precio: parseFloat(precio.value),
    inversion: parseFloat(inversion.value),
    fecha: fecha.value
  });

  guardarDatos();
  limpiarFormulario('producto');
  render();
}

function agregarSorteo() {
  const { producto, valor, numeros, valorNumero, ganancia, fecha } = elementos.formularios.sorteo;
  
  if (!producto.value || !valor.value || !ganancia.value || !fecha.value) {
    alert("Por favor complete los campos obligatorios");
    return;
  }

  // Validar valores numéricos
  if (valor.value <= 0 || ganancia.value <= 0) {
    alert("Los valores numéricos deben ser mayores a cero");
    return;
  }

  const margen = parseFloat(valor.value) > 0 ? 
    (parseFloat(ganancia.value) / parseFloat(valor.value)) * 100 : 0;

  sorteos.push({
    producto: producto.value,
    valor: parseFloat(valor.value),
    numeros: numeros.value || null,
    valorNumero: valorNumero.value ? parseFloat(valorNumero.value) : null,
    ganancia: parseFloat(ganancia.value),
    margen: margen,
    fecha: fecha.value
  });

  guardarDatos();
  limpiarFormulario('sorteo');
  render();
  mostrarConsejosSorteos();
}

function eliminarProducto(index) {
  if (!confirm('¿Eliminar este producto?')) return;
  productos.splice(index, 1);
  guardarDatos();
  render();
}

function eliminarSorteo(index) {
  if (!confirm('¿Eliminar este sorteo?')) return;
  sorteos.splice(index, 1);
  guardarDatos();
  render();
  mostrarConsejosSorteos();
}

// Funciones auxiliares
function limpiarFormulario(tipo) {
  const formulario = elementos.formularios[tipo];
  for (const key in formulario) {
    if (formulario[key].type !== 'button') {
      formulario[key].value = '';
    }
  }
}

function filtrarDatos() {
  render(); // Esto ahora incluirá renderResumen()
}

// Exportar datos completos
function exportarDatos() {
  const data = {
    productos,
    sorteos,
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_shoponline_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Importar datos
function importarDatos() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (!data.productos || !data.sorteos) {
          throw new Error("Formato de archivo inválido");
        }
        
        if (confirm(`¿Importar ${data.productos.length} productos y ${data.sorteos.length} sorteos?`)) {
          productos = data.productos;
          sorteos = data.sorteos;
          guardarDatos();
          render();
          alert("Datos importados correctamente");
        }
      } catch (error) {
        console.error("Error al importar:", error);
        alert("Error al importar los datos");
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

// Mostrar panel
function mostrarPanel(panel) {
  document.getElementById('panelResumen').classList.toggle('hidden', panel !== 'resumen');
  document.getElementById('panelVentas').classList.toggle('hidden', panel !== 'ventas');
  document.getElementById('panelSorteos').classList.toggle('hidden', panel !== 'sorteos');
  
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(panel));
  });
}

// Inicialización
document.addEventListener('DOMContentLoaded', cargarDatos);