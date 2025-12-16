// Seeded random functions for daily challenge
function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function seededShuffle(array, seed) {
    const random = mulberry32(seed);
    const shuffled = [...array]; 
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Hash function for daily challenge
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

// Check if Pokemon is fully evolved
function isFullyEvolved(pokemonName, evolutionChain) {
    function findInChain(chain) {
        if (chain.species.name === pokemonName) {
            return chain.evolves_to.length === 0;
        }
        for (let evolution of chain.evolves_to) {
            const result = findInChain(evolution);
            if (result !== null) return result;
        }
        return null;
    }
    return findInChain(evolutionChain);
}

// Get gradient color for stats
function getGradientColor(value) {
    if (value <= 30) return 'rgba(239, 68, 68, 0.6)';
    if (value <= 60) return 'rgba(249, 115, 22, 0.6)';
    if (value <= 90) return 'rgba(245, 158, 11, 0.6)';
    if (value <= 120) return 'rgba(132, 204, 22, 0.6)';
    if (value <= 150) return 'rgba(34, 197, 94, 0.6)';
    return 'rgba(16, 185, 129, 0.6)';
}

// Scoring functions for daily challenge
function calculateScore() {
    const maxScore = 1000;
    const perfectGuesses = pokemonQueue.length;
    const guessPenalty = Math.max(0, totalGuesses - perfectGuesses) * 50;
    const skipPenalty = totalSkips * 150;
    const score = Math.max(0, maxScore - guessPenalty - skipPenalty);
    return score;
}

function generateShareText(score) {
    const today = new Date().toLocaleDateString();
    const efficiency = Math.round((pokemonQueue.length / totalGuesses) * 100);
    
    return `🎮 BST Guesser Daily Challenge - ${today}
🎯 Score: ${score}/1000
📊 Guesses: ${totalGuesses}/${pokemonQueue.length * 3} (${efficiency}% efficiency)
⏭️ Skips: ${totalSkips}
🏆 ${getScoreRank(score)}

Can you beat my score? Play at: ${window.location.href}`;
}

function getScoreRank(score) {
    if (score >= 950) return "Pokémon Master! 🥇";
    if (score >= 850) return "Expert Trainer! 🥈";
    if (score >= 700) return "Skilled Trainer! 🥉";
    if (score >= 500) return "Novice Trainer 📚";
    return "Keep Training! 💪";
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
    }
}