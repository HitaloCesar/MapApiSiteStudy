// --- CONFIGURAÇÃO INICIAL ---

// COLE A SUA CHAVE DE ACESSO DO MAPBOX AQUI DENTRO DAS ASPAS
mapboxgl.accessToken = 'pk.eyJ1IjoiaGl0YWxvY2VzYXIiLCJhIjoiY21meThmbDJtMGhtajJpcTRuMHE1cjhqbSJ9.1kCgp-2P5oC9qXY5KwaUtA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-streets-v11',
    center: [-47.06, -22.90],
    zoom: 8,
    projection: 'globe'
});

// --- REFERÊNCIAS E EVENTOS DA UI ---

// Elementos para o tamanho
const sizeSlider = document.getElementById('meteorSize');
const sizeValueSpan = document.getElementById('sizeValue');
// Elementos para a velocidade
const velocitySlider = document.getElementById('meteorVelocity');
const velocityValueSpan = document.getElementById('velocityValue');
// Elementos para os resultados
const energyResultP = document.getElementById('energyResult');
const craterResultP = document.getElementById('craterResult');

// Atualiza o texto do tamanho quando o slider muda
sizeSlider.addEventListener('input', (e) => {
    sizeValueSpan.textContent = `${e.target.value} m`;
});

// Atualiza o texto da velocidade quando o slider muda
velocitySlider.addEventListener('input', (e) => {
    velocityValueSpan.textContent = `${e.target.value} km/s`;
});

// Contador para garantir que cada impacto tenha uma ID única
let impactCounter = 0;


// --- LÓGICA DE CÁLCULO E IMPACTO ---

map.on('click', (e) => {
    // 1. Pega os inputs do usuário
    const coords = e.lngLat;
    const meteorDiameterMeters = sizeSlider.value;
    const meteorVelocityKms = velocitySlider.value;

    // 2. Calcula os resultados do impacto
    const impactResults = calculateImpact(meteorDiameterMeters, meteorVelocityKms);

    // 3. Mostra os resultados na UI
    energyResultP.textContent = `Energia Liberada: ${impactResults.energyMegatons.toFixed(2)} Megatons`;
    craterResultP.textContent = `Diâmetro da Cratera: ${impactResults.craterDiameterKm.toFixed(2)} km`;

    // 4. Cria o efeito visual no mapa
    createImpactEffect(coords, impactResults.craterDiameterMeters);
});

function calculateImpact(diameter, velocity) {
    // Constantes físicas
    const DENSIDADE_METEORO = 3000; // kg/m^3 (rocha)
    const JOULES_EM_UM_MEGATON = 4.184e15;
    const CONSTANTE_CRATERA = 0.0035;

    // Cálculos
    const raio = diameter / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(raio, 3);
    const massa = volume * DENSIDADE_METEORO;
    const velocidadeMps = velocity * 1000; // Converte km/s para m/s

    const energiaCineticaJoules = 0.5 * massa * Math.pow(velocidadeMps, 2);
    const crateraDiametroMeters = CONSTANTE_CRATERA * Math.pow(energiaCineticaJoules, 1/3);

    // Retorna os resultados de forma organizada
    return {
        energyMegatons: energiaCineticaJoules / JOULES_EM_UM_MEGATON,
        craterDiameterMeters: crateraDiametroMeters,
        craterDiameterKm: crateraDiametroMeters / 1000
    };
}

function createImpactEffect(centerCoords, craterDiameterMeters) {
    impactCounter++; // Incrementa para garantir IDs únicas
    const sourceId = `impact-source-${impactCounter}`;
    const craterLayerId = `impact-crater-${impactCounter}`;
    const shockwaveLayerId = `shockwave-${impactCounter}`;
    
    // --- FONTE DE DADOS (PONTO DO IMPACTO) ---
    map.addSource(sourceId, {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [centerCoords.lng, centerCoords.lat]}}]
        }
    });

    // --- CAMADA DA CRATERA (PERMANENTE) ---
    // Esta camada é adicionada e FICA no mapa.
    map.addLayer({
        'id': craterLayerId,
        'type': 'circle',
        'source': sourceId,
        'paint': {
            // Ajusta o raio do círculo na tela para corresponder ao tamanho real em metros
            'circle-radius': {
                stops: [
                    [0, 0],
                    [20, craterDiameterMeters / 20] // Ajuste dinâmico com o zoom
                ],
                base: 2
            },
            'circle-color': '#222', // Cor mais escura para a cratera
            'circle-opacity': 0.8,
            'circle-stroke-color': 'black',
            'circle-stroke-width': 1
        }
    });

    // --- CAMADA DA ONDA DE CHOQUE (ANIMADA E TEMPORÁRIA) ---
    map.addLayer({
        'id': shockwaveLayerId,
        'type': 'circle',
        'source': sourceId,
        'paint': {
            'circle-radius': 0,
            'circle-color': 'transparent',
            'circle-stroke-color': '#ff9900',
            'circle-stroke-width': 3,
            'circle-stroke-opacity': 1
        }
    });

    // --- ANIMAÇÃO DA ONDA DE CHOQUE ---
    let currentShockwaveRadius = 0;
    const maxShockwaveRadius = craterDiameterMeters * 2; // Onda de choque é maior que a cratera

    function animateShockwave() {
        currentShockwaveRadius += maxShockwaveRadius / 100;
        
        if (currentShockwaveRadius < maxShockwaveRadius) {
            map.setPaintProperty(shockwaveLayerId, 'circle-radius', currentShockwaveRadius);
            const opacity = 1 - (currentShockwaveRadius / maxShockwaveRadius);
            map.setPaintProperty(shockwaveLayerId, 'circle-stroke-opacity', opacity);
            requestAnimationFrame(animateShockwave);
        } else {
            // Ao final da animação, remove APENAS a onda de choque e sua fonte
            map.removeLayer(shockwaveLayerId);
        }
    }

    animateShockwave();
}