// ===================================================================================
// PASSO MAIS IMPORTANTE: COLE SEU TOKEN DE ACESSO DO MAPBOX AQUI
// ===================================================================================
mapboxgl.accessToken = 'pk.eyJ1IjoiaGl0YWxvY2VzYXIiLCJhIjoiY21meThmbDJtMGhtajJpcTRuMHE1cjhqbSJ9.1kCgp-2P5oC9qXY5KwaUtA';
// ===================================================================================

// --- CONFIGURAÇÃO INICIAL DO MAPA ---
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: [-47.06, -22.90],
    zoom: 8,
    projection: 'globe'
});

// --- REFERÊNCIAS E EVENTOS DA INTERFACE (UI) ---
const sizeSlider = document.getElementById('meteorSize');
const sizeValueSpan = document.getElementById('sizeValue');
const massSlider = document.getElementById('meteorMass');
const massValueSpan = document.getElementById('massValue');
const velocitySlider = document.getElementById('meteorVelocity');
const velocityValueSpan = document.getElementById('velocityValue');
const energyResultP = document.getElementById('energyResult');
const craterResultP = document.getElementById('craterResult');

const formatNumber = (num) => Number(num).toLocaleString('pt-BR');
const formatBigNumber = (num) => num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// Listeners para atualizar os valores na UI em tempo real
sizeSlider.addEventListener('input', (e) => sizeValueSpan.textContent = `${formatNumber(e.target.value)} m`);
massSlider.addEventListener('input', (e) => massValueSpan.textContent = `${formatNumber(e.target.value)} Milhões de t`);
velocitySlider.addEventListener('input', (e) => velocityValueSpan.textContent = `${formatNumber(e.target.value)} km/s`);

// Inicia os valores na UI
sizeValueSpan.textContent = `${formatNumber(sizeSlider.value)} m`;
massValueSpan.textContent = `${formatNumber(massSlider.value)} Milhões de t`;
velocityValueSpan.textContent = `${formatNumber(velocitySlider.value)} km/s`;

let impactCounter = 0;

// --- LÓGICA DE CÁLCULO E IMPACTO ---
map.on('click', (e) => {
    const coords = e.lngLat;
    const meteorMassMillionsTonnes = parseFloat(massSlider.value);
    const meteorVelocityKms = parseFloat(velocitySlider.value);

    const impactResults = calculateImpact(meteorMassMillionsTonnes, meteorVelocityKms);

    energyResultP.textContent = `Energia Liberada: ${formatBigNumber(impactResults.energyMegatons)} Megatons`;
    craterResultP.textContent = `Raio da Zona de Impacto: ~${formatBigNumber(impactResults.devastationRadiusKm)} km`;

    createImpactEffect(coords, impactResults.devastationRadiusMeters);
});

function calculateImpact(massInMillionsTonnes, velocityInKms) {
    const JOULES_EM_UM_MEGATON = 4.184e15;
    const CONSTANTE_DEVASTACAO = 0.05;

    const massaKg = massInMillionsTonnes * 1_000_000 * 1_000; // Converte de milhões de toneladas para kg
    const velocidadeMps = velocityInKms * 1_000;

    const energiaCineticaJoules = 0.5 * massaKg * Math.pow(velocidadeMps, 2);
    const devastationRadiusMeters = CONSTANTE_DEVASTACAO * Math.pow(energiaCineticaJoules, 1 / 3);

    return {
        energyMegatons: energiaCineticaJoules / JOULES_EM_UM_MEGATON,
        devastationRadiusMeters: devastationRadiusMeters,
        devastationRadiusKm: devastationRadiusMeters / 1000
    };
}

function createImpactEffect(centerCoords, devastationRadiusMeters) {
    impactCounter++;
    const sourceId = `impact-source-${impactCounter}`;
    const heatmapLayerId = `impact-heatmap-${impactCounter}`;

    const heatmapPoints = { type: 'FeatureCollection', features: [] };
    
    // ================================================================================
    // AQUI ESTÁ A MÁGICA: AUMENTAMOS MUITO O NÚMERO DE PONTOS
    // ================================================================================
    const numberOfPoints = 700; // Antes era 150, agora é muito mais denso!
    // ================================================================================
    
    for (let i = 0; i < numberOfPoints; i++) {
        const distanceKm = (Math.sqrt(Math.random()) * devastationRadiusMeters) / 1000;
        const bearing = Math.random() * 360;
        const point = turf.destination([centerCoords.lng, centerCoords.lat], distanceKm, bearing);
        const magnitude = 1.0 - (distanceKm * 1000 / devastationRadiusMeters);
        heatmapPoints.features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: point.geometry.coordinates },
            properties: { mag: magnitude }
        });
    }
    heatmapPoints.features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [centerCoords.lng, centerCoords.lat] },
        properties: { mag: 2.5 }
    });

    map.addSource(sourceId, { type: 'geojson', data: heatmapPoints });

    map.addLayer({
        id: heatmapLayerId,
        type: 'heatmap',
        source: sourceId,
        paint: {
            'heatmap-weight': ['get', 'mag'],
            'heatmap-intensity': 2, // Aumenta a intensidade geral do "brilho"
            'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(255, 200, 0, 0)',
                0.25, 'rgba(255, 165, 0, 0.5)',
                0.5, 'rgba(255, 69, 0, 0.7)',
                0.75, 'rgba(255, 0, 0, 0.8)',
                1, 'rgba(255, 255, 255, 0.95)'
            ],
            // ================================================================================
            // TAMBÉM AUMENTAMOS O RAIO PARA FORÇAR A MISTURA DAS CORES
            // ================================================================================
            'heatmap-radius': [
                'interpolate', ['linear'], ['zoom'],
                0, 10,    // Raio maior em zoom baixo
                9, 30,
                15, 120   // Raio bem maior em zoom alto para garantir suavidade
            ],
            // ================================================================================
            'heatmap-opacity': 0.8
        }
    }, 'waterway-label');
}