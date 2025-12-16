// startGame function 
async function startGame(mode) {
    gameMode = mode;
    homeMenu.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    pokemonQueue = [];
    currentPokemonIndex = 0;
    totalGuesses = 0;
    totalSkips = 0;
    incorrectGuesses = 0;

    // Set game title
    if (mode === 'daily') {
        gameTitle.textContent = 'Daily Challenge';
    } else {
        gameTitle.textContent = 'Infinite Mode';
    }

    // Show loading progress
    const loadingProgress = document.getElementById('loadingProgress');
    if (loadingProgress) {
        loadingProgress.style.width = '0%';
    }

    try {
        // Generate the queue
        await generatePokemonQueue();

        // Update loading progress
        if (loadingProgress) {
            loadingProgress.style.width = '100%';
        }

        // Hide loading, show game
        loadingScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        // Load first Pokemon
        await loadPokemon(currentPokemonIndex);

        // Reset chart and sprite display
        if (myChart) myChart.destroy();
        pokemonSprite.style.display = 'block';

        // Reset hints section
        document.getElementById('hints').style.display = 'block';

        // Reset button states
        guessButton.classList.remove('hidden');
        nextButton.classList.add('hidden');
        restartButton.classList.add('hidden');
        skipButton.classList.remove('hidden');

    } catch (error) {
        console.error('Failed to start game:', error);
        loadingScreen.classList.add('hidden');
        homeMenu.classList.remove('hidden');
        alert('Failed to load game. Please check your internet connection and try again.');
    }
}

// generate function version 1 million
async function generatePokemonQueue() {
    const onlyFullyEvolved = fullyEvolvedToggle.checked;
    const queueSize = gameMode === 'daily' ? 5 : 10;

    if (gameMode === 'daily') {
        const today = new Date();
        const seedString = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        const seed = hashCode(seedString);

        const allIds = Array.from({length: 1025}, (_, i) => i + 1);
        const shuffledIds = seededShuffle(allIds, seed);

        let pokemonIdsIndex = 0;
        let validPokemon = [];

        // Keep fetching until we have enough valid Pokémon
        while (validPokemon.length < queueSize && pokemonIdsIndex < shuffledIds.length) {
            const batchIds = shuffledIds.slice(pokemonIdsIndex, pokemonIdsIndex + 10); // Larger batch for better results
            const promises = batchIds.map(id => getPokemon(id).catch(() => null));
            const results = await Promise.all(promises);
            
            for (const pokemon of results) {
                if (pokemon && !validPokemon.some(existing => existing.id === pokemon.id)) {
                    if (onlyFullyEvolved) {
                        // Check if this Pokémon is fully evolved
                        try {
                            const speciesResponse = await fetch(pokemon.species.url);
                            const species = await speciesResponse.json();
                            const evolutionResponse = await fetch(species.evolution_chain.url);
                            const evolution = await evolutionResponse.json();
                            
                            if (isFullyEvolved(pokemon.name, evolution.chain)) {
                                validPokemon.push(pokemon);
                            }
                        } catch (error) {
                            console.error('Evolution check error:', error);
                            // Skip this Pokémon if evolution check fails
                        }
                    } else {
                        // If not filtering for fully evolved, add all valid Pokémon
                        validPokemon.push(pokemon);
                    }
                    
                    if (validPokemon.length >= queueSize) break;
                }
            }
            pokemonIdsIndex += 10;
        }

        // Set the queue to our valid Pokémon (up to queueSize)
        pokemonQueue = validPokemon.slice(0, queueSize);

        // Final safety check
        if (pokemonQueue.length < queueSize) {
            console.warn(`Only loaded ${pokemonQueue.length} Pokémon instead of ${queueSize}`);
        }
        
        console.log(`Daily challenge loaded ${pokemonQueue.length} Pokémon (Fully evolved: ${onlyFullyEvolved}):`, pokemonQueue.map(p => p.name));
    } else {
        // Infinite mode logic (unchanged)
        const batchSize = 5;
        while (pokemonQueue.length < queueSize) {
            const ids = Array.from({length: batchSize}, () => Math.floor(Math.random() * 1025) + 1);
            const promises = ids.map(id => 
                getPokemon(id).catch(() => null)
            );
            
            const results = await Promise.all(promises);
            const validPokemon = results.filter(p => p !== null && !pokemonQueue.some(existing => existing.id === p.id));
            
            if (onlyFullyEvolved) {
                for (const pokemon of validPokemon) {
                    if (pokemonQueue.length >= queueSize) break;
                    try {
                        const speciesResponse = await fetch(pokemon.species.url);
                        const species = await speciesResponse.json();
                        const evolutionResponse = await fetch(species.evolution_chain.url);
                        const evolution = await evolutionResponse.json();
                        
                        if (isFullyEvolved(pokemon.name, evolution.chain)) {
                            pokemonQueue.push(pokemon);
                        }
                    } catch (error) {
                        console.error('Evolution check error:', error);
                    }
                }
            } else {
                pokemonQueue.push(...validPokemon.slice(0, queueSize - pokemonQueue.length));
            }
        }
    }
}

// Check guess
function checkGuess() {
    totalGuesses++;
    guessesDisplay.textContent = `Total Guesses: ${totalGuesses}`;
    const guess = guessInput.value.trim().toLowerCase();
    
    if (guess === currentPokemon.name) {
        // Green color for correct answer
        message.innerHTML = `<span style="color: #10b981;">Correct! It's ${currentPokemon.name.charAt(0).toUpperCase() + currentPokemon.name.slice(1)}!</span>`;
        
        // Only show sprite if not hidden by toggle
        if (!hideSpriteToggle.checked) {
            pokemonSprite.classList.remove('blurred-grey');
            pokemonSprite.style.filter = 'none';
            pokemonSprite.style.width = '300px';
            pokemonSprite.style.maxWidth = '300px';
        }
        
        // Update button visibility
        guessButton.classList.add('hidden');
        skipButton.classList.add('hidden');
        nextButton.classList.remove('hidden');
        
    } else {
        incorrectGuesses++;
        
        // Only update sprite blur if sprite is visible
        if (!hideSpriteToggle.checked) {
            currentBlur = Math.max(currentBlur - 3, 0);
            pokemonSprite.style.filter = `blur(${currentBlur}px) grayscale(100%)`;
        }

        // Red color for incorrect answer
        message.innerHTML = `<span style="color: #ef4444;">Incorrect.</span>`;
        
        // Only show hints if hints toggle is enabled
        if (hintsToggle.checked) {
            const abilityHint = currentPokemon.abilities[0].ability.name.charAt(0).toUpperCase() + currentPokemon.abilities[0].ability.name.slice(1);
            const typeHint = currentPokemon.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)).join(', ');
            
            if (incorrectGuesses === 2) {
                document.getElementById('typeHint').textContent = `Type(s): ${typeHint}`;
            } else if (incorrectGuesses >= 3) {
                document.getElementById('typeHint').textContent = `Type(s): ${typeHint}`;
                document.getElementById('abilityHint').textContent = `Ability: ${abilityHint}`;
            }
        }
    }
    guessInput.value = '';
    guessInput.focus();
}

// Next Pokemon
function nextPokemon() {
    currentPokemonIndex++;
    
    if (gameMode === 'infinite') {
        // For infinite mode, check if we need to load more Pokemon
        if (currentPokemonIndex >= pokemonQueue.length) {
            // Load next Pokemon and then proceed
            loadNextInfinitePokemon().then(() => {
                loadPokemon(currentPokemonIndex);
                resetButtonStates();
            }).catch(error => {
                console.error('Error loading next Pokemon:', error);
                // Fallback: just load what we have
                if (pokemonQueue.length > currentPokemonIndex) {
                    loadPokemon(currentPokemonIndex);
                    resetButtonStates();
                }
            });
        } else {
            // We already have this Pokemon loaded
            loadPokemon(currentPokemonIndex);
            resetButtonStates();
        }
    } else {
        // Daily challenge logic
        if (currentPokemonIndex >= pokemonQueue.length) {
            endGame();
        } else {
            loadPokemon(currentPokemonIndex);
            resetButtonStates();
        }
    }
}

// Skip Pokemon function
function skipPokemon() {
    totalSkips++; // Track skips
    
    // Orange color for skipped Pokemon
    message.innerHTML = `<span style="color: #f97316;">Skipped! It was ${currentPokemon.name.charAt(0).toUpperCase() + currentPokemon.name.slice(1)}!</span>`;
    
    // Only show sprite if not hidden by toggle
    if (!hideSpriteToggle.checked) {
        pokemonSprite.classList.remove('blurred-grey');
        pokemonSprite.style.filter = 'none';
    }
    
    // Always reveal all hints when skipping (regardless of toggle)
    const abilityHint = currentPokemon.abilities[0].ability.name.charAt(0).toUpperCase() + currentPokemon.abilities[0].ability.name.slice(1);
    const typeHint = currentPokemon.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)).join(', ');
    document.getElementById('typeHint').textContent = `Type(s): ${typeHint}`;
    document.getElementById('abilityHint').textContent = `Ability: ${abilityHint}`;
    
    // Hide skip button, show next button
    skipButton.classList.add('hidden');
    guessButton.classList.add('hidden');
    nextButton.classList.remove('hidden');
}

// Game variables
let currentPokemon = null;
let pokemonQueue = [];
let currentPokemonIndex = 0;
let totalGuesses = 0;
let totalSkips = 0;
let currentBlur = 30; 
let myChart = null;
let gameMode = '';
let incorrectGuesses = 0;

// DOM elements
const dailyChallengeButton = document.getElementById('dailyChallengeButton');
const infiniteModeButton = document.getElementById('infiniteModeButton');
const homeMenu = document.getElementById('homeMenu');
const gameScreen = document.getElementById('gameScreen');
const gameTitle = document.getElementById('gameTitle');
const returnToMenuButton = document.getElementById('returnToMenuButton');
const pokemonSprite = document.getElementById('pokemonSprite');
const statChart = document.getElementById('statChart');
const guessInput = document.getElementById('guessInput');
const guessButton = document.getElementById('guessButton');
const nextButton = document.getElementById('nextButton');
const restartButton = document.getElementById('restartButton');
const message = document.getElementById('message');
const guessesDisplay = document.getElementById('guesses');
const progressDisplay = document.getElementById('progress');
const fullyEvolvedToggle = document.getElementById('fullyEvolvedToggle');
const loadingScreen = document.getElementById('loadingScreen');
const skipButton = document.getElementById('skipButton'); 
const hintsToggle = document.getElementById('hintsToggle');
const hideSpriteToggle = document.getElementById('hideSpriteToggle');

// Pokemon names for autocomplete
const allPokemonNames = [];

// Translations (will finish later my french is ass mais J'aime le francais)
const translations = {
    en: {
        title: "BST Guesser",
        language: "Language:",
        fullyEvolved: "Only Fully Evolved Pokémon",
        dailyChallenge: "Daily Challenge",
        infiniteQuiz: "Infinite Quiz",
        loadingPokemon: "Loading Pokémon...",
        guessPokemon: "Guess the Pokémon!",
        enterPokemonName: "Enter Pokémon name",
        totalGuesses: "Total Guesses:",
        pokemon: "Pokémon:",
        infiniteMode: "Infinite Mode",
        returnToMenu: "Return to Menu",
        nextPokemon: "Next Pokémon",
        restartChallenge: "Restart Challenge",
        submitGuess: "Submit Guess",
        skip: "Skip",
        returnToLast: "Return to Last",
        correct: "Correct! It's",
        incorrect: "Incorrect.",
        skipped: "Skipped! It was",
        types: "Type(s):",
        ability: "Ability:",
        dailyChallengeComplete: "Daily Challenge Complete!",
        score: "Score:",
        pokemonMaster: "Pokémon Master! 🥇",
        expertTrainer: "Expert Trainer! 🥈",
        skilledTrainer: "Skilled Trainer! 🥉",
        noviceTrainer: "Novice Trainer 📚",
        keepTraining: "Keep Training! 💪",
        shareResults: "📤 Share Results",
        copied: "✅ Copied!",
        sessionComplete: "Session Complete!",
        pokemonGuessed: "Pokémon Guessed:",
        skips: "Skips:",
        guesses: "Guesses:",
        efficiency: "efficiency",
        canYouBeat: "Can you beat my score? Play at:",
        madeWith: "Made with ❤️ by and for Pokémon fans | Data powered by",
        allRightsReserved: "All rights reserved",
        privacyPolicy: "🔒 Privacy Policy",
        termsOfService: "📋 Terms of Service",
        privacyText: "This website does not collect personal information. Third-party services (such as ad networks) may use cookies for analytics and advertising. All Pokémon data is sourced from PokéAPI.",
        termsText: "By using this site, you agree to use it for entertainment purposes only. All Pokémon data is provided by the PokéAPI and is for non-commercial use. Pokémon © Nintendo/Game Freak.",
        followTwitter: "Follow on Twitter/X",
        viewGithub: "View on GitHub"
    },
    fr: {
        title: "Devineur BST",
        language: "Langue :",
        fullyEvolved: "Pokémon complètement évolués seulement",
        dailyChallenge: "Défi Quotidien",
        infiniteQuiz: "Quiz Infini",
        loadingPokemon: "Chargement des Pokémon...",
        guessPokemon: "Devinez le Pokémon !",
        enterPokemonName: "Entrez le nom du Pokémon",
        totalGuesses: "Total des tentatives :",
        pokemon: "Pokémon :",
        infiniteMode: "Mode Infini",
        returnToMenu: "Retour au Menu",
        nextPokemon: "Pokémon Suivant",
        restartChallenge: "Redémarrer le Défi",
        submitGuess: "Soumettre",
        skip: "Passer",
        returnToLast: "Retour au Précédent",
        correct: "Correct ! C'est",
        incorrect: "Incorrect.",
        skipped: "Passé ! C'était",
        types: "Type(s) :",
        ability: "Capacité :",
        dailyChallengeComplete: "Défi Quotidien Terminé !",
        score: "Score :",
        pokemonMaster: "Maître Pokémon ! 🥇",
        expertTrainer: "Dresseur Expert ! 🥈",
        skilledTrainer: "Dresseur Habile ! 🥉",
        noviceTrainer: "Dresseur Novice 📚",
        keepTraining: "Continuez l'Entraînement ! 💪",
        shareResults: "📤 Partager les Résultats",
        copied: "✅ Copié !",
        sessionComplete: "Session Terminée !",
        pokemonGuessed: "Pokémon Devinés :",
        skips: "Passés :",
        guesses: "Tentatives :",
        efficiency: "efficacité",
        canYouBeat: "Pouvez-vous battre mon score ? Jouez sur :",
        madeWith: "Fait avec ❤️ par et pour les fans de Pokémon | Données fournies par",
        allRightsReserved: "Tous droits réservés",
        privacyPolicy: "🔒 Politique de Confidentialité",
        termsOfService: "📋 Conditions d'Utilisation",
        privacyText: "Ce site web ne collecte pas d'informations personnelles. Les services tiers (comme les réseaux publicitaires) peuvent utiliser des cookies pour l'analyse et la publicité. Toutes les données Pokémon proviennent de PokéAPI.",
        termsText: "En utilisant ce site, vous acceptez de l'utiliser uniquement à des fins de divertissement. Toutes les données Pokémon sont fournies par PokéAPI et sont destinées à un usage non commercial. Pokémon © Nintendo/Game Freak.",
        followTwitter: "Suivre sur Twitter/X",
        viewGithub: "Voir sur GitHub"
    }
};

let currentLanguage = 'en';

// Translation function - WIP
function translate(key) {
    return translations[currentLanguage][key] || translations.en[key] || key;
}

// Update all translatable elements - WIP
function updateLanguage() {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        element.textContent = translate(key);
    });
    
    // Update placeholders
    const guessInput = document.getElementById('guessInput');
    if (guessInput) {
        guessInput.placeholder = translate('enterPokemonName');
    }
    
    // Update loading text
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = translate('loadingPokemon');
    }
    
    // Update tooltips
    document.querySelector('a[title*="Twitter"]')?.setAttribute('title', translate('followTwitter'));
    document.querySelector('a[title*="GitHub"]')?.setAttribute('title', translate('viewGithub'));
}


// Load Pokemon
async function loadPokemon(index) {
    // For infinite mode, make sure we have enough Pokemon loaded ahead
    if (gameMode === 'infinite' && index >= pokemonQueue.length) {
        await loadNextInfinitePokemon();
    }
    
    // Safety check
    if (index >= pokemonQueue.length) {
        if (gameMode === 'daily') {
            endGame();
            return;
        } else {
            console.error('Pokemon not available for infinite mode');
            return;
        }
    }
    
    currentPokemon = pokemonQueue[index];
    incorrectGuesses = 0;
    currentBlur = 30;
    
    // Handle sprite visibility based on toggle
    if (hideSpriteToggle.checked) {
        pokemonSprite.style.display = 'none';
    } else {
        pokemonSprite.style.display = 'block';
        pokemonSprite.src = currentPokemon.sprites.front_default;
        pokemonSprite.classList.add('blurred-grey');
        pokemonSprite.style.filter = 'blur(30px) grayscale(100%)';
    }
    
    // Update progress - show different text for infinite mode
    if (gameMode === 'infinite') {
        progressDisplay.textContent = `Pokémon: ${index + 1} (Infinite Mode)`;
    } else {
        progressDisplay.textContent = `Pokémon: ${index + 1}/${pokemonQueue.length}`;
    }
    
    // Clear input and set initial message and hints
    guessInput.value = '';
    message.textContent = 'Guess the Pokémon!';
    document.getElementById('typeHint').innerHTML = '<span style="color: #9ca3af;">Type(s): ???</span>';
    document.getElementById('abilityHint').innerHTML = '<span style="color: #9ca3af;">Ability: ???</span>';
    
    // Reset button states
    skipButton.classList.remove('hidden');
    
    // Create chart with a small delay so it works properly
    setTimeout(() => {
        createChart(currentPokemon.stats, currentPokemon.name);
    }, 100);
    
    guessInput.focus();
}







// Helper function to reset button states
function resetButtonStates() {
    guessButton.classList.remove('hidden');
    nextButton.classList.add('hidden');
    skipButton.classList.remove('hidden');
}

// function to load next Pokemon for infinite mode
async function loadNextInfinitePokemon() {
    const onlyFullyEvolved = fullyEvolvedToggle.checked;
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        try {
            const pokemonId = Math.floor(Math.random() * 1025) + 1;
            const pokemon = await getPokemon(pokemonId);
            
            // Check if we already have this Pokemon in recent history (avoid immediate repeats)
            const recentPokemon = pokemonQueue.slice(-10); // Check last 10
            if (recentPokemon.some(p => p.id === pokemon.id)) {
                attempts++;
                continue;
            }
            
            if (onlyFullyEvolved) {
                const speciesResponse = await fetch(pokemon.species.url);
                const species = await speciesResponse.json();
                const evolutionResponse = await fetch(species.evolution_chain.url);
                const evolution = await evolutionResponse.json();
                
                if (isFullyEvolved(pokemon.name, evolution.chain)) {
                    pokemonQueue.push(pokemon);
                    return;
                }
            } else {
                pokemonQueue.push(pokemon);
                return;
            }
        } catch (error) {
            console.error('Error fetching Pokemon:', error);
        }
        attempts++;
    }
    
    // Fallback - add a random Pokemon without evolution check (if we can't find a valid one)
    try {
        const pokemonId = Math.floor(Math.random() * 1025) + 1;
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
        const pokemon = await response.json();
        pokemonQueue.push(pokemon);
    } catch (error) {
        console.error('Failed to load fallback Pokemon:', error);
    }
}

// Update the loadPokemon function to handle infinite mode progress display
async function loadPokemon(index) {
    // For infinite mode, make sure we have enough Pokemon loaded 
    if (gameMode === 'infinite' && index >= pokemonQueue.length) {
        await loadNextInfinitePokemon();
    }
    
    // Safety check
    if (index >= pokemonQueue.length) {
        if (gameMode === 'daily') {
            endGame();
            return;
        } else {
            console.error('Pokemon not available for infinite mode');
            return;
        }
    }
    
    currentPokemon = pokemonQueue[index];
    incorrectGuesses = 0;
    currentBlur = 30;
    
    // Handle sprite visibility based on toggle
    if (hideSpriteToggle.checked) {
        pokemonSprite.style.display = 'none';
    } else {
        pokemonSprite.style.display = 'block';
        pokemonSprite.src = currentPokemon.sprites.front_default;
        pokemonSprite.classList.add('blurred-grey');
        pokemonSprite.style.filter = 'blur(30px) grayscale(100%)';
    }
    
    // Update progress - show different text for infinite mode
    if (gameMode === 'infinite') {
        progressDisplay.textContent = `Pokémon: ${index + 1} (Infinite Mode)`;
    } else {
        progressDisplay.textContent = `Pokémon: ${index + 1}/${pokemonQueue.length}`;
    }
    
    // Clear input and set initial message and hints
    guessInput.value = '';
    message.textContent = 'Guess the Pokémon!';
    document.getElementById('typeHint').innerHTML = '<span style="color: #9ca3af;">Type(s): ???</span>';
    document.getElementById('abilityHint').innerHTML = '<span style="color: #9ca3af;">Ability: ???</span>';
    
    // Reset button states
    skipButton.classList.remove('hidden');
    
    // Create chart with a small delay so it works properly
    setTimeout(() => {
        createChart(currentPokemon.stats, currentPokemon.name);
    }, 100);
    
    guessInput.focus();
}

// End game function
function endGame() {
    if (gameMode === 'daily') {
        const score = calculateScore();
        const rank = getScoreRank(score);
        
        message.innerHTML = `
            <div class="text-center space-y-2">
                <div class="text-xl font-bold text-green-400">Daily Challenge Complete!</div>
                <div class="text-lg">🎯 Score: ${score}/1000</div>
                <div class="text-md">${rank}</div>
                <div class="text-sm text-gray-300">Total Guesses: ${totalGuesses}</div>
                <div class="text-sm text-gray-300">Skips: ${totalSkips}</div>
            </div>
        `;
        
        // Share button logic
        const existingShareButton = document.getElementById('shareResultsButton');
        if (existingShareButton) {
            existingShareButton.remove();
        }
        
        const shareButton = document.createElement('button');
        shareButton.id = 'shareResultsButton';
        shareButton.textContent = '📤 Share Results';
        shareButton.className = 'bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-4 mb-4';
        shareButton.onclick = async () => {
            const shareText = generateShareText(score);
            const copied = await copyToClipboard(shareText);
            if (copied) {
                shareButton.textContent = '✅ Copied!';
                shareButton.className = 'bg-green-600 text-white px-4 py-2 rounded mt-4 mb-4';
                setTimeout(() => {
                    shareButton.textContent = '📤 Share Results';
                    shareButton.className = 'bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-4 mb-4';
                }, 2000);
            }
        };
        
        const inputContainer = document.querySelector('#gameScreen .flex.flex-col.items-center.justify-center.space-y-4');
        const messageElement = document.getElementById('message');
        inputContainer.insertBefore(shareButton, messageElement.nextSibling);
        
    } else {
        message.innerHTML = `
            <div class="text-center space-y-2">
                <div class="text-xl font-bold text-blue-400">Session Complete!</div>
                <div class="text-lg">Pokémon Guessed: ${currentPokemonIndex + 1}</div>
                <div class="text-sm text-gray-300">Total Guesses: ${totalGuesses}</div>
                <div class="text-sm text-gray-300">Skips: ${totalSkips}</div>
            </div>
        `;
    }
    
    // Hide hints on results screen
    document.getElementById('hints').style.display = 'none';
    
    guessButton.classList.add('hidden');
    nextButton.classList.add('hidden');
    skipButton.classList.add('hidden');
    restartButton.classList.remove('hidden');
    pokemonSprite.style.display = 'none';
    if (myChart) myChart.destroy();
}





// Return Function
function returnToMenu() {
    gameScreen.classList.add('hidden');
    loadingScreen.classList.add('hidden');
    homeMenu.classList.remove('hidden');
    if (myChart) myChart.destroy();
    pokemonSprite.style.display = 'block';
    
    // Remove share button if it exists
    const shareButton = document.getElementById('shareResultsButton');
    if (shareButton) {
        shareButton.remove();
    }
}



// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeAutocomplete();
    
    // Language selector event listener
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            currentLanguage = this.value;
            updateLanguage();
            
            // Save language preference
            localStorage.setItem('bstGuesserLanguage', currentLanguage);
        });
        
        // Load saved language preference
        const savedLanguage = localStorage.getItem('bstGuesserLanguage');
        if (savedLanguage && translations[savedLanguage]) {
            currentLanguage = savedLanguage;
            languageSelect.value = currentLanguage;
            updateLanguage();
        }
    }
    
    // Register Chart.js plugin
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }
    
    // Event listeners
    dailyChallengeButton.addEventListener('click', () => startGame('daily'));
    infiniteModeButton.addEventListener('click', () => startGame('infinite'));
    returnToMenuButton.addEventListener('click', returnToMenu);
    guessButton.addEventListener('click', checkGuess);
    nextButton.addEventListener('click', nextPokemon);
    restartButton.addEventListener('click', () => startGame(gameMode));
    skipButton.addEventListener('click', skipPokemon);

    // Enter key functionality
    guessInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            if (!guessButton.classList.contains('hidden')) {
                checkGuess();
            } else if (!nextButton.classList.contains('hidden')) {
                nextPokemon();
            }
        }
    });
});