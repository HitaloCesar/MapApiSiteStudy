// ===================================================================================
// PASSO MAIS IMPORTANTE: COLE SEU TOKEN DE ACESSO DO MAPBOX AQUI
// ===================================================================================
mapboxgl.accessToken = 'pk.eyJ1IjoiaGl0YWxvY2VzYXIiLCJhIjoiY21meThmbDJtMGhtajJpcTRuMHE1cjhqbSJ9.1kCgp-2P5oC9qXY5KwaUtA';
// ===================================================================================

// --- CONFIGURAÇÃO INICIAL DO MAPA ---
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-streets-v12', // Estilo de satélite com ruas
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

// Funções para formatar números grandes para melhor leitura
const formatNumber = (num) => Number(num).toLocaleString('pt-BR');
const formatBigNumber = (num) => num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// Listeners para atualizar os valores na UI em tempo real
sizeSlider.addEventListener('input', (e) => sizeValueSpan.textContent = `${formatNumber(e.target.value)} m`);
massSlider.addEventListener('input', (e) => massValueSpan.textContent = `${formatNumber(e.target.value)} t`);
velocitySlider.addEventListener('input', (e) => velocityValueSpan.textContent = `${formatNumber(e.target.value)} km/s`);

// Inicia os valores na UI
sizeValueSpan.textContent = `${formatNumber(sizeSlider.value)} m`;
massValueSpan.textContent = `${formatNumber(massSlider.value)} t`;
velocityValueSpan.textContent = `${formatNumber(velocitySlider.value)} km/s`;

let impactCounter = 0;

// --- LÓGICA DE CÁLCULO E IMPACTO ---
map.on('click', (e) => {
    const coords = e.lngLat;
    const meteorMassTonnes = parseFloat(massSlider.value);
    const meteorVelocityKms = parseFloat(velocitySlider.value);

    const impactResults = calculateImpact(meteorMassTonnes, meteorVelocityKms);

    energyResultP.textContent = `Energia Liberada: ${formatBigNumber(impactResults.energyMegatons)} Megatons`;
    craterResultP.textContent = `Área de Devastação: ~${formatBigNumber(impactResults.devastationRadiusKm)} km de raio`;

    createImpactEffect(coords, impactResults.devastationRadiusMeters);
});

function calculateImpact(massInTonnes, velocityInKms) {
    const JOULES_EM_UM_MEGATON = 4.184e15;
    const CONSTANTE_DEVASTACAO = 0.05;

    const massaKg = massInTonnes * 1000;
    const velocidadeMps = velocityInKms * 1000;

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
    const craterLayerId = `impact-crater-${impactCounter}`;

    const heatmapPoints = { type: 'FeatureCollection', features: [] };
    const numberOfPoints = 150;
    for (let i = 0; i < numberOfPoints; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.sqrt(Math.random()) * devastationRadiusMeters;
        const bearing = Math.random() * 360;
        const distanceKm = radius / 1000;
        
        const point = turf.destination([centerCoords.lng, centerCoords.lat], distanceKm, bearing);
        const magnitude = 1.0 - (radius / devastationRadiusMeters);

        heatmapPoints.features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: point.geometry.coordinates },
            properties: { mag: magnitude }
        });
    }
    heatmapPoints.features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [centerCoords.lng, centerCoords.lat] },
        properties: { mag: 2.0 }
    });

    map.addSource(sourceId, { type: 'geojson', data: heatmapPoints });

    map.addLayer({
        id: heatmapLayerId,
        type: 'heatmap',
        source: sourceId,
        maxzoom: 15,
        paint: {
            'heatmap-weight': ['get', 'mag'],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(255, 220, 0, 0)',
                0.2, 'rgba(255, 220, 0, 0.4)',
                0.5, 'rgba(255, 165, 0, 0.6)',
                0.8, 'rgba(255, 69, 0, 0.7)',
                1, 'rgba(180, 0, 0, 0.8)'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 9, 25, 15, 80],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.9, 15, 0.7]
        }
    }, 'waterway-label');

    map.addLayer({
        id: craterLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
            'circle-radius': parseFloat(sizeSlider.value) / 2,
            'circle-color': '#000000',
            'circle-opacity': 0.65
        }
    });
}