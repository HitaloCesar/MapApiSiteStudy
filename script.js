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
massSlider.addEventListener('input', (e) => massValueSpan.textContent = `${formatNumber(e.target.value)} t`);
velocitySlider.addEventListener('input', (e) => velocityValueSpan.textContent = `${formatNumber(e.target.value)} km/s`);

// Inicia os valores na UI
sizeValueSpan.textContent = `${formatNumber(sizeSlider.value)} m`;
massValueSpan.textContent = `${formatNumber(massSlider.value)} t`;
velocityValueSpan.textContent = `${formatNumber(velocitySlider.value)} km/s`;

let impactCounter = 0;

// --- LÓGICA DE CÁLCULO ---
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

// --- LÓGICA DE VISUALIZAÇÃO ---
map.on('click', (e) => {
    const coords = e.lngLat;
    const meteorMassTonnes = parseFloat(massSlider.value);
    const meteorVelocityKms = parseFloat(velocitySlider.value);
    const meteorDiameterMeters = parseFloat(sizeSlider.value);

    const impactResults = calculateImpact(meteorMassTonnes, meteorVelocityKms);
    
    energyResultP.textContent = `Energia Liberada: ${formatBigNumber(impactResults.energyMegatons)} Megatons`;
    craterResultP.textContent = `Raio da Zona de Impacto: ~${formatBigNumber(impactResults.devastationRadiusKm)} km`;

    createGradientCircleImpact(coords, impactResults.devastationRadiusMeters, meteorDiameterMeters);
});

// Função de interpolação linear para cores e opacidade
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function createGradientCircleImpact(centerCoords, devastationRadiusMeters, meteorDiameterMeters) {
    impactCounter++;
    const sourceId = `impact-source-${impactCounter}`;
    const meteorRadiusMeters = meteorDiameterMeters / 2;

    map.addSource(sourceId, {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [centerCoords.lng, centerCoords.lat] }
        }
    });

    const gradientSteps = 20;
    
    // ================================================================================
    // AQUI ESTÁ O AJUSTE: OPACIDADE MÁXIMA REDUZIDA
    // ================================================================================
    const maxOpacity = 0.45; // Antes era 0.65, agora é mais transparente
    // ================================================================================

    const hotZoneColor = [255, 255, 255]; // Branco
    const midColor = [255, 0, 0];       // Vermelho
    const endColor = [255, 165, 0];      // Laranja

    // Cria cada anel do degradê
    for (let i = gradientSteps - 1; i >= 0; i--) {
        const t = i / (gradientSteps - 1);
        const currentRadius = devastationRadiusMeters * t;
        
        let color, opacity;

        if (currentRadius <= meteorRadiusMeters) {
            color = `rgb(${hotZoneColor[0]}, ${hotZoneColor[1]}, ${hotZoneColor[2]})`;
            opacity = maxOpacity;
        } else {
            const fadeT = (currentRadius - meteorRadiusMeters) / (devastationRadiusMeters - meteorRadiusMeters);
            const r = lerp(midColor[0], endColor[0], fadeT);
            const g = lerp(midColor[1], endColor[1], fadeT);
            const b = lerp(midColor[2], endColor[2], fadeT);
            color = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
            opacity = lerp(maxOpacity, 0, fadeT);
        }

        map.addLayer({
            id: `impact-ring-${impactCounter}-${i}`,
            type: 'circle',
            source: sourceId,
            paint: {
                'circle-radius': [
                    'interpolate', ['exponential', 2], ['zoom'],
                    0, 0,
                    22, ['/', currentRadius, 0.005 * Math.cos(centerCoords.lat * Math.PI / 180)]
                ],
                'circle-color': color,
                'circle-opacity': opacity,
                'circle-blur': 0.5
            }
        });
    }
}
