const map = new mapboxgl.Map({
    container: 'map',
    // CORREÇÃO: Voltando ao estilo de satélite colorido
    style: 'mapbox://styles/mapbox/satellite-streets-v11', 
    center: [-47.06, -22.90],
    zoom: 8,
    projection: 'globe'
});

// --- REFERÊNCIAS E EVENTOS DA UI ---

const sizeSlider = document.getElementById('meteorSize');
const sizeValueSpan = document.getElementById('sizeValue');
const massSlider = document.getElementById('meteorMass');
const massValueSpan = document.getElementById('massValue');
const velocitySlider = document.getElementById('meteorVelocity');
const velocityValueSpan = document.getElementById('velocityValue');
const energyResultP = document.getElementById('energyResult');
const craterResultP = document.getElementById('craterResult');

sizeSlider.addEventListener('input', (e) => sizeValueSpan.textContent = `${Number(e.target.value).toLocaleString()} m`);
massSlider.addEventListener('input', (e) => massValueSpan.textContent = `${Number(e.target.value).toLocaleString()} t`);
velocitySlider.addEventListener('input', (e) => velocityValueSpan.textContent = `${e.target.value} km/s`);

let impactCounter = 0;

// --- LÓGICA DE CÁLCULO E IMPACTO ---

map.on('click', (e) => {
    const coords = e.lngLat;
    const meteorMassTonnes = massSlider.value;
    const meteorVelocityKms = velocitySlider.value;

    const impactResults = calculateImpact(meteorMassTonnes, meteorVelocityKms);

    energyResultP.textContent = `Energia Liberada: ${impactResults.energyMegatons.toLocaleString(undefined, {maximumFractionDigits: 2})} Megatons`;
    craterResultP.textContent = `Área de Devastação: ~${impactResults.devastationRadiusKm.toLocaleString(undefined, {maximumFractionDigits: 2})} km de raio`;

    createImpactEffect(coords, impactResults.devastationRadiusMeters);
});

function calculateImpact(massInTonnes, velocityInKms) {
    const JOULES_EM_UM_MEGATON = 4.184e15;
    const CONSTANTE_DEVASTACAO = 0.05;

    const massaKg = massInTonnes * 1000;
    const velocidadeMps = velocityInKms * 1000;

    const energiaCineticaJoules = 0.5 * massaKg * Math.pow(velocidadeMps, 2);
    const devastationRadiusMeters = CONSTANTE_DEVASTACAO * Math.pow(energiaCineticaJoules, 1/3);

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

    const heatmapPoints = { 'type': 'FeatureCollection', 'features': [] };
    const numberOfPoints = 150; // Aumentei um pouco para um degradê mais suave
    for (let i = 0; i < numberOfPoints; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.sqrt(Math.random()) * devastationRadiusMeters;
        const offset = [radius * Math.cos(angle), radius * Math.sin(angle)];
        const pointCoords = turf.destination([centerCoords.lng, centerCoords.lat], Math.sqrt(offset[0]**2 + offset[1]**2) / 1000, turf.bearing([0,0], [offset[0], offset[1]]));
        const magnitude = 1.0 - (radius / devastationRadiusMeters);
        heatmapPoints.features.push({ 'type': 'Feature', 'geometry': { 'type': 'Point', 'coordinates': pointCoords.geometry.coordinates }, 'properties': { 'mag': magnitude } });
    }
     heatmapPoints.features.push({ 'type': 'Feature', 'geometry': { 'type': 'Point', 'coordinates': [centerCoords.lng, centerCoords.lat] }, 'properties': { 'mag': 2.0 } }); // Magnitude maior no centro para um "hotspot" mais forte

    map.addSource(sourceId, { 'type': 'geojson', 'data': heatmapPoints });

    // CAMADA HEATMAP (O DEGRADÊ COLORIDO)
    map.addLayer({
        'id': heatmapLayerId,
        'type': 'heatmap',
        'source': sourceId,
        'maxzoom': 15,
        'paint': {
            'heatmap-weight': ['get', 'mag'],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            // MELHORIA: Paleta de cores mais "quente" para o impacto
            'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(255, 255, 0, 0)',    // Transparente
                0.2, 'rgba(255, 255, 0, 0.5)',  // Amarelo
                0.5, 'rgba(255, 165, 0, 0.7)',  // Laranja
                0.8, 'rgba(255, 69, 0, 0.8)',   // Vermelho-Laranja
                1, 'rgba(139, 0, 0, 0.85)'     // Vermelho Escuro
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 9, 25, 15, 80],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.9, 15, 0.6]
        }
    }, 'waterway-label');

    // CAMADA DA CRATERA (PONTO CENTRAL ESCURO)
    map.addLayer({
        'id': craterLayerId,
        'type': 'circle',
        'source': sourceId,
        'paint': {
            'circle-radius': (sizeSlider.value / 1.5), // Um pouco maior para ser visível
            'circle-color': '#000000',
            'circle-opacity': 0.6
        }
    });
}
