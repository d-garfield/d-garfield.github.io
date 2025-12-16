// New function to get Pokemon data with caching
async function getPokemon(id) {
    try {
        const cached = localStorage.getItem('pokemon_' + id);
        if (cached) return JSON.parse(cached);
    } catch (e) {
        // localStorage error, fallback to fetch
        console.warn('localStorage error:', e);
    }
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await response.json();
    try {
        localStorage.setItem('pokemon_' + id, JSON.stringify(data));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            localStorage.clear();
        }
    }
    return data;
}
// Initialize autocomplete function
async function initializeAutocomplete() {
    try {
        // Load Pokemon names for autocomplete
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
        const data = await response.json();
        const pokemonList = document.getElementById('pokemon-list');
        
        data.results.forEach(pokemon => {
            const option = document.createElement('option');
            option.value = pokemon.name;
            pokemonList.appendChild(option);
            allPokemonNames.push(pokemon.name);
        });
    } catch (error) {
        console.error('Failed to load Pokemon names for autocomplete:', error);
    }
}