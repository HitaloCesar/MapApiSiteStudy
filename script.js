// --- CONFIGURAÇÃO INICIAL ---

// COLE A SUA CHAVE DE ACESSO DO MAPBOX AQUI DENTRO DAS ASPAS
mapboxgl.accessToken = 'pk.eyJ1IjoiaGl0YWxvY2VzYXIiLCJhIjoiY21meThmbDJtMGhtajJpcTRuMHE1cjhqbSJ9.1kCgp-2P5oC9qXY5KwaUtA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v10', // Estilo escuro para destacar o calor do impacto
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

// Listeners para atualizar os valores na UI em tempo real
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

    createImpactEffect(coords, impactResults.devastationRadiusKm * 1000); // Passa o raio em metros
});

function calculateImpact(massInTonnes, velocityInKms) {
    const JOULES_EM_UM_MEGATON = 4.184e15;
    const CONSTANTE_DEVASTACAO = 0.05; // Fator ajustado para o raio do heatmap

    const massaKg = massInTonnes * 1000;
    const velocidadeMps = velocityInKms * 1000;

    const energiaCineticaJoules = 0.5 * massaKg * Math.pow(velocidadeMps, 2);
    
    // O raio da devastação é proporcional à raiz cúbica da energia
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
    const craterLayerId = `impact-crater-${impactCounter}`; // Camada para o centro escuro

    // 1. GERAR OS PONTOS PARA O HEATMAP
    // Criamos uma coleção de pontos GeoJSON. Cada ponto tem uma propriedade "mag" (magnitude).
    const heatmapPoints = {
        'type': 'FeatureCollection',
        'features': []
    };
    const numberOfPoints = 100; // Mais pontos = heatmap mais suave
    for (let i = 0; i < numberOfPoints; i++) {
        // Distribui os pontos aleatoriamente dentro do raio de devastação
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.sqrt(Math.random()) * devastationRadiusMeters; // sqrt para uma distribuição mais uniforme
        const offset = [radius * Math.cos(angle), radius * Math.sin(angle)];
        
        // Converte o offset em metros para graus de longitude/latitude
        const pointCoords = turf.destination([centerCoords.lng, centerCoords.lat], Math.sqrt(offset[0]**2 + offset[1]**2) / 1000, turf.bearing([0,0], [offset[0], offset[1]]));
        
        // A magnitude é maior no centro e diminui para as bordas
        const magnitude = 1 - (radius / devastationRadiusMeters);

        heatmapPoints.features.push({
            'type': 'Feature',
            'geometry': { 'type': 'Point', 'coordinates': pointCoords.geometry.coordinates },
            'properties': { 'mag': magnitude }
        });
    }

    // Adiciona um ponto de alta magnitude bem no centro para garantir um "hotspot"
     heatmapPoints.features.push({
        'type': 'Feature',
        'geometry': { 'type': 'Point', 'coordinates': [centerCoords.lng, centerCoords.lat] },
        'properties': { 'mag': 1.5 } // Magnitude extra no centro
    });

    // 2. ADICIONAR A FONTE DE DADOS E AS CAMADAS AO MAPA
    map.addSource(sourceId, {
        'type': 'geojson',
        'data': heatmapPoints
    });

    // CAMADA HEATMAP (O DEGRADÊ)
    map.addLayer({
        'id': heatmapLayerId,
        'type': 'heatmap',
        'source': sourceId,
        'maxzoom': 12,
        'paint': {
            'heatmap-weight': ['get', 'mag'], // A intensidade de cada ponto vem da propriedade "mag"
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 12, 3],
            'heatmap-color': [ // Define as cores do degradê
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(33,102,172,0)',
                0.2, 'rgba(103,169,207,0.5)',
                0.4, 'rgba(209,229,240,0.6)',
                0.6, 'rgba(253,219,199,0.7)',
                0.8, 'rgba(239,138,98,0.8)',
                1, 'rgba(255,200,0,0.9)'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20, 12, 50],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 12, 0.7]
        }
    }, 'waterway-label'); // Adiciona a camada abaixo dos rótulos de rios

    // CAMADA DA CRATERA (PONTO CENTRAL ESCURO)
    map.addLayer({
        'id': craterLayerId,
        'type': 'circle',
        'source': sourceId,
        'paint': {
            'circle-radius': (sizeSlider.value / 2),
            'circle-color': '#000000',
            'circle-opacity': 0.6
        }
    });
}


// Adiciona a biblioteca Turf.js, necessária para cálculos geográficos (conversão de metros para coordenadas)
// Isso é feito adicionando a tag script no seu HTML ou, para simplificar aqui, injetando-a
const turfScript = document.createElement('script');
turfScript.src = 'https://npmcdn.com/@turf/turf/turf.min.js';
document.head.appendChild(turfScript);