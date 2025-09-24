// --- CONFIGURAÇÃO INICIAL ---

// COLE A SUA CHAVE DE ACESSO DO MAPBOX AQUI DENTRO DAS ASPAS
mapboxgl.accessToken = 'pk.eyJ1IjoiaGl0YWxvY2VzYXIiLCJhIjoiY21meThmbDJtMGhtajJpcTRuMHE1cjhqbSJ9.1kCgp-2P5oC9qXY5KwaUtA';

const map = new mapboxgl.Map({
    container: 'map', // ID do div no HTML
    style: 'mapbox://styles/mapbox/satellite-streets-v11', // Estilo de satélite, fica mais legal!
    center: [-47.06, -22.90], // Coordenadas iniciais (ex: Campinas)
    zoom: 8,
    projection: 'globe' // Projeção em globo para um efeito mais "espacial"
});

// Referências para os elementos da UI
const sizeSlider = document.getElementById('meteorSize');
const sizeValueSpan = document.getElementById('sizeValue');

// Atualiza o texto do tamanho do meteoro quando o slider muda
sizeSlider.addEventListener('input', (event) => {
    sizeValueSpan.textContent = `${event.target.value} km`;
});


// --- LÓGICA DO IMPACTO ---

// Adiciona um "ouvinte" de cliques no mapa
map.on('click', (e) => {
    const coords = e.lngLat; // Pega as coordenadas (longitude, latitude) do clique
    const meteorSize = sizeSlider.value; // Pega o valor atual do slider

    // Chama a função que cria o efeito visual
    createImpactEffect(coords, meteorSize);
});

function createImpactEffect(centerCoords, size) {
    // Remove efeitos antigos, caso existam, para não poluir o mapa
    if (map.getLayer('impact-crater')) map.removeLayer('impact-crater');
    if (map.getLayer('shockwave')) map.removeLayer('shockwave');
    if (map.getSource('impact-source')) map.removeSource('impact-source');

    const impactRadiusMeters = size * 1000; // Converte o tamanho de km para metros
    let currentShockwaveRadius = 0;
    
    // 1. CRIA A FONTE DE DADOS
    // Uma fonte de dados no Mapbox é como uma "planilha" de coordenadas.
    // Aqui, criamos uma fonte com um único ponto: o local do impacto.
    map.addSource('impact-source', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': [{
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [centerCoords.lng, centerCoords.lat]
                }
            }]
        }
    });

    // 2. CRIA A CAMADA DA CRATERA
    // Esta camada desenha um círculo escuro e fixo que representa a cratera.
    map.addLayer({
        'id': 'impact-crater',
        'type': 'circle',
        'source': 'impact-source',
        'paint': {
            'circle-radius': impactRadiusMeters / 10, // A cratera é 10% do raio de impacto
            'circle-color': '#000000',
            'circle-opacity': 0.8
        }
    });

    // 3. CRIA A CAMADA DA ONDA DE CHOQUE (QUE SERÁ ANIMADA)
    map.addLayer({
        'id': 'shockwave',
        'type': 'circle',
        'source': 'impact-source',
        'paint': {
            'circle-radius': 0, // Começa com raio 0
            'circle-color': 'transparent',
            'circle-stroke-color': '#ff9900', // Cor laranja/amarela
            'circle-stroke-width': 3,
            'circle-stroke-opacity': 1
        }
    });

    // 4. ANIMAÇÃO
    function animateShockwave() {
        currentShockwaveRadius += impactRadiusMeters / 100; // Aumenta o raio a cada "frame"
        
        // Se a onda de choque ainda não atingiu o tamanho máximo
        if (currentShockwaveRadius < impactRadiusMeters) {
            map.setPaintProperty('shockwave', 'circle-radius', currentShockwaveRadius);
            
            // Diminui a opacidade da borda conforme ela expande
            const opacity = 1 - (currentShockwaveRadius / impactRadiusMeters);
            map.setPaintProperty('shockwave', 'circle-stroke-opacity', opacity);

            // Pede para o navegador chamar esta função novamente no próximo frame
            requestAnimationFrame(animateShockwave);
        } else {
            // Animação terminou, remove as camadas para a próxima simulação
            map.removeLayer('impact-crater');
            map.removeLayer('shockwave');
            map.removeSource('impact-source');
        }
    }

    // Inicia a animação!
    animateShockwave();
}