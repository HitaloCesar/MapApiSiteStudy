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

// --- LÓGICA DE CÁLCULO (Permanece a mesma) ---
function calculateImpact(massInMillionsTonnes, velocityInKms) {
    const JOULES_EM_UM_MEGATON = 4.184e15;
    const CONSTANTE_DEVASTACAO = 0.05;
    const massaKg = massInMillionsTonnes * 1_000_000 * 1_000;
    const velocidadeMps = velocityInKms * 1_000;
    const energiaCineticaJoules = 0.5 * massaKg * Math.pow(velocidadeMps, 2);
    const devastationRadiusMeters = CONSTANTE_DEVASTACAO * Math.pow(energiaCineticaJoules, 1 / 3);
    return {
        energyMegatons: energiaCineticaJoules / JOULES_EM_UM_MEGATON,
        devastationRadiusMeters: devastationRadiusMeters,
        devastationRadiusKm: devastationRadiusMeters / 1000
    };
}


// --- LÓGICA DE VISUALIZAÇÃO (COMPLETAMENTE REFEITA) ---
map.on('click', (e) => {
    const coords = e.lngLat;
    const meteorMassMillionsTonnes = parseFloat(massSlider.value);
    const meteorVelocityKms = parseFloat(velocitySlider.value);

    const impactResults = calculateImpact(meteorMassMillionsTonnes, meteorVelocityKms);
    
    energyResultP.textContent = `Energia Liberada: ${formatBigNumber(impactResults.energyMegatons)} Megatons`;
    craterResultP.textContent = `Raio da Zona de Impacto: ~${formatBigNumber(impactResults.devastationRadiusKm)} km`;

    // Chama a nova função de criação de impacto
    createGradientCircleImpact(coords, impactResults.devastationRadiusMeters);
});

function createGradientCircleImpact(centerCoords, devastationRadiusMeters) {
    impactCounter++;
    const sourceId = `impact-source-${impactCounter}`;

    // A fonte de dados agora é apenas um único ponto: o epicentro.
    map.addSource(sourceId, {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [centerCoords.lng, centerCoords.lat]
            }
        }
    });

    // Define as "camadas" do nosso degradê
    const gradientSteps = 15; // Número de anéis para simular o degradê
    const startColor = [255, 255, 255]; // Branco
    const midColor = [255, 0, 0]; // Vermelho
    const endColor = [255, 165, 0]; // Laranja

    // Cria cada anel do degradê, de dentro para fora
    for (let i = 0; i < gradientSteps; i++) {
        const t = i / (gradientSteps - 1); // Posição atual no degradê (0.0 a 1.0)
        
        // Interpola a cor
        let r, g, b;
        if (t < 0.5) {
            const localT = t * 2;
            r = startColor[0] + (midColor[0] - startColor[0]) * localT;
            g = startColor[1] + (midColor[1] - startColor[1]) * localT;
            b = startColor[2] + (midColor[2] - startColor[2]) * localT;
        } else {
            const localT = (t - 0.5) * 2;
            r = midColor[0] + (endColor[0] - midColor[0]) * localT;
            g = midColor[1] + (endColor[1] - midColor[1]) * localT;
            b = midColor[2] + (endColor[2] - midColor[2]) * localT;
        }
        const color = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

        // O raio de cada anel aumenta
        const radius = devastationRadiusMeters * (1 - t);
        
        // A opacidade de cada anel diminui
        const opacity = 0.5 * (1 - t);

        map.addLayer({
            id: `impact-ring-${impactCounter}-${i}`,
            type: 'circle',
            source: sourceId,
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['exponential', 2],
                    ['zoom'],
                    // Para um raio de X metros no chão, quantos pixels ele deve ter em cada zoom
                    0, 0,
                    22, ['/', radius, 0.005 * Math.cos(centerCoords.lat * Math.PI / 180)]
                ],
                'circle-color': color,
                'circle-opacity': opacity,
                'circle-blur': 1 // Adiciona um blur para suavizar a transição entre os anéis
            }
        });
    }
}