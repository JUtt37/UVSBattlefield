// UVS Game with Ability System Integration

// UVS Ability System Integration
// Generated automatically from ability patterns

class AbilitySystem {
    constructor() {
        this.enhanceCosts = ['Commit', 'Flip', 'Discard', 'Remove', 'Destroy', 'Clear'];
        this.enhanceConditions = ['If this attack deals damage', 'If this attack is blocked', 'If you have'];
        this.responseTriggers = ['After this attack deals damage', 'After your attack resolves', 'At the start of'];
    }
    
    parseAbility(abilityText) {
        if (!abilityText || typeof abilityText !== 'string') {
            return null;
        }
        
        abilityText = abilityText.trim();
        
        // Enhance abilities
        if (abilityText.startsWith('E:') || abilityText.startsWith('Enhance:') || abilityText.startsWith('Enhance ')) {
            return this.parseEnhanceAbility(abilityText);
        }
        
        // Response abilities
        else if (abilityText.startsWith('R:') || abilityText.startsWith('Response:') || abilityText.startsWith('Response ')) {
            return this.parseResponseAbility(abilityText);
        }
        
        // Other abilities
        else {
            return {type: 'static', effect: abilityText};
        }
    }
    
    parseEnhanceAbility(abilityText) {
        let text = abilityText;
        if (abilityText.startsWith('E:')) {
            text = abilityText.substring(2).trim();
        } else if (abilityText.startsWith('Enhance:')) {
            text = abilityText.substring(8).trim();
        } else if (abilityText.startsWith('Enhance ')) {
            text = abilityText.substring(8).trim();
        }
        
        // Check for costs
        let cost = null;
        for (let costType of this.enhanceCosts) {
            if (text.toLowerCase().includes(costType.toLowerCase())) {
                cost = costType;
                break;
            }
        }
        
        // Check for conditions
        let condition = null;
        for (let conditionType of this.enhanceConditions) {
            if (text.toLowerCase().includes(conditionType.toLowerCase())) {
                condition = conditionType;
                break;
            }
        }
        
        return {
            type: 'enhance',
            cost: cost,
            condition: condition,
            effect: text,
            originalText: abilityText
        };
    }
    
    parseResponseAbility(abilityText) {
        let text = abilityText;
        if (abilityText.startsWith('R:')) {
            text = abilityText.substring(2).trim();
        } else if (abilityText.startsWith('Response:')) {
            text = abilityText.substring(9).trim();
        } else if (abilityText.startsWith('Response ')) {
            text = abilityText.substring(9).trim();
        }
        
        // Check for triggers
        let trigger = null;
        for (let triggerType of this.responseTriggers) {
            if (text.toLowerCase().includes(triggerType.toLowerCase())) {
                trigger = triggerType;
                break;
            }
        }
        
        return {
            type: 'response',
            trigger: trigger,
            effect: text,
            originalText: abilityText
        };
    }
    
    categorizeCardAbilities(card) {
        const abilities = card.abilities || [];
        const categorized = {
            enhances: [],
            responses: [],
            static: []
        };
        
        for (let ability of abilities) {
            const parsed = this.parseAbility(ability);
            if (parsed) {
                if (parsed.type === 'enhance') {
                    categorized.enhances.push(parsed);
                } else if (parsed.type === 'response') {
                    categorized.responses.push(parsed);
                } else {
                    categorized.static.push(parsed);
                }
            }
        }
        
        return categorized;
    }
    
    canPlayEnhance(card, gameState, playerIndex) {
        const categorized = this.categorizeCardAbilities(card);
        
        for (let enhance of categorized.enhances) {
            // Check cost
            if (enhance.cost) {
                if (!this.canPayCost(enhance.cost, gameState, playerIndex)) {
                    continue;
                }
            }
            
            // Check condition
            if (enhance.condition) {
                if (!this.checkCondition(enhance.condition, gameState, playerIndex)) {
                    continue;
                }
            }
            
            return true;
        }
        
        return false;
    }
    
    canPayCost(cost, gameState, playerIndex) {
        const player = gameState.players[playerIndex];
        
        if (cost === 'Commit') {
            const readyFoundations = player.foundations.filter(f => !f.committed);
            return readyFoundations.length >= 1;
        }
        
        else if (cost === 'Flip') {
            const faceDownFoundations = player.foundations.filter(f => f.faceDown);
            return faceDownFoundations.length >= 1;
        }
        
        else if (cost === 'Discard') {
            return player.hand.length >= 1;
        }
        
        else if (cost === 'Remove') {
            return true; // Can always remove the card itself
        }
        
        else if (cost === 'Destroy') {
            const readyFoundations = player.foundations.filter(f => !f.committed);
            return readyFoundations.length >= 1;
        }
        
        else if (cost === 'Clear') {
            return player.cardPool.length >= 1;
        }
        
        return false;
    }
    
    checkCondition(condition, gameState, playerIndex) {
        const player = gameState.players[playerIndex];
        
        const conditionText = condition.toLowerCase();
        
        if (conditionText.includes('this attack deals damage')) {
            return gameState.lastAttackDealtDamage || false;
        }
        
        else if (conditionText.includes('this attack is blocked')) {
            return gameState.lastAttackWasBlocked || false;
        }
        
        else if (conditionText.includes('this attack is not blocked')) {
            return !(gameState.lastAttackWasBlocked || false);
        }
        
        else if (conditionText.includes('or fewer foundations')) {
            const match = conditionText.match(/(\d+) or fewer foundations/);
            if (match) {
                const maxFoundations = parseInt(match[1]);
                return player.foundations.length <= maxFoundations;
            }
        }
        
        else if (conditionText.includes('or more foundations')) {
            const match = conditionText.match(/(\d+) or more foundations/);
            if (match) {
                const minFoundations = parseInt(match[1]);
                return player.foundations.length >= minFoundations;
            }
        }
        
        else if (conditionText.includes('or fewer cards in your hand')) {
            const match = conditionText.match(/(\d+) or fewer cards in your hand/);
            if (match) {
                const maxCards = parseInt(match[1]);
                return player.hand.length <= maxCards;
            }
        }
        
        else if (conditionText.includes('or more momentum')) {
            const match = conditionText.match(/(\d+) or more momentum/);
            if (match) {
                const minMomentum = parseInt(match[1]);
                return player.momentum.length >= minMomentum;
            }
        }
        
        else if (conditionText.includes('opponent is at desperation')) {
            const opponent = gameState.players[1 - playerIndex];
            return opponent.health <= 5; // Desperation threshold
        }
        
        return false; // Default to false if condition not recognized
    }
    
    executeEnhanceEffect(effect, gameState, playerIndex) {
        const player = gameState.players[playerIndex];
        const opponent = gameState.players[1 - playerIndex];
        
        const effectText = effect.toLowerCase();
        
        // Damage modifiers
        const damageMatch = effectText.match(/([+-])(\d+) damage/);
        if (damageMatch) {
            const modifier = damageMatch[1];
            const amount = parseInt(damageMatch[2]);
            if (modifier === '+') {
                gameState.attackSequence.damageModifier = (gameState.attackSequence.damageModifier || 0) + amount;
            } else {
                gameState.attackSequence.damageModifier = (gameState.attackSequence.damageModifier || 0) - amount;
            }
        }
        
        // Speed modifiers
        const speedMatch = effectText.match(/([+-])(\d+) speed/);
        if (speedMatch) {
            const modifier = speedMatch[1];
            const amount = parseInt(speedMatch[2]);
            if (modifier === '+') {
                gameState.attackSequence.speedModifier = (gameState.attackSequence.speedModifier || 0) + amount;
            } else {
                gameState.attackSequence.speedModifier = (gameState.attackSequence.speedModifier || 0) - amount;
            }
        }
        
        // Draw cards
        const drawMatch = effectText.match(/draw (\d+) card/);
        if (drawMatch) {
            const amount = parseInt(drawMatch[1]);
            for (let i = 0; i < amount; i++) {
                if (player.deck.length > 0) {
                    const card = player.deck.pop();
                    player.hand.push(card);
                }
            }
        }
        
        // Discard cards
        const discardMatch = effectText.match(/discard (\d+) card/);
        if (discardMatch) {
            const amount = parseInt(discardMatch[1]);
            for (let i = 0; i < Math.min(amount, player.hand.length); i++) {
                if (player.hand.length > 0) {
                    const card = player.hand.pop();
                    player.discard.push(card);
                }
            }
        }
        
        // Ready foundation
        if (effectText.includes('ready') && effectText.includes('foundation')) {
            const committedFoundations = player.foundations.filter(f => f.committed);
            if (committedFoundations.length > 0) {
                committedFoundations[0].committed = false;
            }
        }
        
        // Commit foundation
        if (effectText.includes('commit') && effectText.includes('foundation')) {
            const readyFoundations = player.foundations.filter(f => !f.committed);
            if (readyFoundations.length > 0) {
                readyFoundations[0].committed = true;
            }
        }
        
        // Lose vitality
        const loseMatch = effectText.match(/lose (\d+) vitality/);
        if (loseMatch) {
            const amount = parseInt(loseMatch[1]);
            opponent.health = Math.max(0, opponent.health - amount);
        }
        
        // Gain vitality
        const gainMatch = effectText.match(/gain (\d+) vitality/);
        if (gainMatch) {
            const amount = parseInt(gainMatch[1]);
            player.health = Math.min(player.health + amount, player.character[0].health);
        }
    }
    
    getAvailableEnhances(card, gameState, playerIndex) {
        const categorized = this.categorizeCardAbilities(card);
        const available = [];
        
        for (let enhance of categorized.enhances) {
            if (this.canPlayEnhance(card, gameState, playerIndex)) {
                available.push(enhance);
            }
        }
        
        return available;
    }
    
    // Game integration functions
    checkForEnhanceOpportunities(gameState, playerIndex) {
        const player = gameState.players[playerIndex];
        const opportunities = [];
        
        // Check hand cards
        for (let card of player.hand) {
            const enhances = this.getAvailableEnhances(card, gameState, playerIndex);
            if (enhances.length > 0) {
                opportunities.push({
                    card: card,
                    enhances: enhances,
                    location: 'hand'
                });
            }
        }
        
        // Check card pool
        for (let card of player.cardPool) {
            const enhances = this.getAvailableEnhances(card, gameState, playerIndex);
            if (enhances.length > 0) {
                opportunities.push({
                    card: card,
                    enhances: enhances,
                    location: 'cardPool'
                });
            }
        }
        
        return opportunities;
    }
    
    checkForResponseTriggers(gameState, triggerEvent) {
        const responses = [];
        
        // Check all players for response abilities
        for (let playerIndex = 0; playerIndex < gameState.players.length; playerIndex++) {
            const player = gameState.players[playerIndex];
            
            // Check hand cards
            for (let card of player.hand) {
                const categorized = this.categorizeCardAbilities(card);
                for (let response of categorized.responses) {
                    if (response.trigger && triggerEvent.includes(response.trigger.toLowerCase())) {
                        responses.push({
                            card: card,
                            response: response,
                            playerIndex: playerIndex,
                            location: 'hand'
                        });
                    }
                }
            }
            
            // Check foundations
            for (let foundation of player.foundations) {
                const categorized = this.categorizeCardAbilities(foundation);
                for (let response of categorized.responses) {
                    if (response.trigger && triggerEvent.includes(response.trigger.toLowerCase())) {
                        responses.push({
                            card: foundation,
                            response: response,
                            playerIndex: playerIndex,
                            location: 'foundations'
                        });
                    }
                }
            }
        }
        
        return responses;
    }
}

// Global ability system instance
const abilitySystem = new AbilitySystem();

// Enhanced game functions
function checkEnhanceAbilities() {
    const currentPlayer = game.currentPlayer;
    const opportunities = abilitySystem.checkForEnhanceOpportunities(game, currentPlayer);
    
    if (opportunities.length > 0) {
        console.log('Enhance opportunities found:', opportunities);
        // TODO: Show enhance options to player
        return opportunities;
    }
    
    return [];
}

function checkResponseAbilities(triggerEvent) {
    const responses = abilitySystem.checkForResponseTriggers(game, triggerEvent);
    
    if (responses.length > 0) {
        console.log('Response triggers found:', responses);
        // TODO: Show response options to players
        return responses;
    }
    
    return [];
}

// Enhanced attack sequence
function enhancedAttackSequence(attackCard) {
    // Original attack logic
    const originalResult = performAttack(attackCard);
    
    // Check for response abilities
    checkResponseAbilities('attack deals damage');
    
    return originalResult;
}


// Original game startup content
// UVS Game Startup Data
// Auto-loaded when game starts

const GAME_DATA = {
  "character": {
    "id": 9031,
    "image": "https://universus.cards/cards/libra/082.jpg",
    "name": "\u00b7Talim\u00b7",
    "type": "Character",
    "rarity": "Uncommon",
    "set": "SoulCalibur 6: Libra of Souls",
    "number": 82,
    "keywords": [],
    "abilities": [
      "E Destroy 1 foundation: Your next check to play an attack gets +1. Playable while committed.",
      "R: After a multiple copy of your attack resolves, add it to your hand. Add 1 card from your hand to your cardpool face down."
    ],
    "symbols": [
      "air",
      "chaos",
      "water"
    ],
    "difficulty": 6,
    "control": 6,
    "attuned": [],
    "block": {
      "modifier": 0,
      "zone": "mid"
    },
    "handSize": 6,
    "vitality": 27
  },
  "deck": {
    "foundations": [
      {
        "id": 10464,
        "image": "https://universus.cards/cards/yyhdt/052.jpg",
        "name": "Masho Concealment",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 52,
        "keywords": [
          "Ally",
          "Unique"
        ],
        "abilities": [
          "Response Commit: After your rival plays an enhance ability on a foundation, cancel it.",
          "Team Masho Enhance: This attack gets -1 speed or +1 damage."
        ],
        "symbols": [
          "air",
          "life",
          "void",
          "water"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "mid"
        }
      },
      {
        "id": 10492,
        "image": "https://universus.cards/cards/yyhdt/078.jpg",
        "name": "Body Memorization",
        "type": "Foundation",
        "rarity": "Uncommon",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 78,
        "keywords": [],
        "abilities": [
          "Enhance Remove: If 2 or more copies of this attack have been played this turn, reduce this attack's damage to 0."
        ],
        "symbols": [
          "air",
          "chaos",
          "earth"
        ],
        "difficulty": 2,
        "control": 4,
        "attuned": [],
        "block": {
          "modifier": 4,
          "zone": "mid"
        }
      },
      {
        "id": 10493,
        "image": "https://universus.cards/cards/yyhdt/079.jpg",
        "name": "Cruel Intent",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 79,
        "keywords": [],
        "abilities": [
          "Enhance Flip: Your Slam attack gets +2 speed. If it deals damage your rival flips 1 foundation."
        ],
        "symbols": [
          "air",
          "chaos",
          "earth"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "low"
        }
      },
      {
        "id": 10494,
        "image": "https://universus.cards/cards/yyhdt/080.jpg",
        "name": "Fearsome Transformations",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 80,
        "keywords": [],
        "abilities": [
          "Enhance Flip: Draw 1 card. If you have no momentum, discard 1 card."
        ],
        "symbols": [
          "air",
          "chaos",
          "earth"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "high"
        }
      },
      {
        "id": 10495,
        "image": "https://universus.cards/cards/yyhdt/081.jpg",
        "name": "Steaming Sphere's Power",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 81,
        "keywords": [],
        "abilities": [
          "Enhance Destroy: Add 1 Slam attack from your discard pile to your momentum.",
          "Response Flip: After your rival plays an ability that discards 1 or more of your momentum, cancel its effects."
        ],
        "symbols": [
          "air",
          "chaos",
          "earth"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        }
      },
      {
        "id": 10510,
        "image": "https://universus.cards/cards/yyhdt/096.jpg",
        "name": "Acrobatic Style",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 96,
        "keywords": [],
        "abilities": [
          "Response [Tenacious] Flip: After a rival foundation is committed due to your effect, ready this card."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "low"
        }
      },
      {
        "id": 10511,
        "image": "https://universus.cards/cards/yyhdt/097.jpg",
        "name": "Childlike Appearance",
        "type": "Foundation",
        "rarity": "Uncommon",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 97,
        "keywords": [],
        "abilities": [
          "Enhance Destroy, discard 1 momentum: Reduce this attack's speed to 0. If it is blocked, commit 1 rival foundation."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 2,
        "control": 4,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "high"
        }
      },
      {
        "id": 10512,
        "image": "https://universus.cards/cards/yyhdt/098.jpg",
        "name": "Power of the Serpent Yo-Yos",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 98,
        "keywords": [
          "Weapon"
        ],
        "abilities": [
          "Enhance: Your attack gets +1 speed. Only playable if it shares at least 2 symbols with your character.",
          "Enhance Flip: If your rival has no ready foundations, your next check to play a card gets +1."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 3,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        }
      },
      {
        "id": 10513,
        "image": "https://universus.cards/cards/yyhdt/099.jpg",
        "name": "Quick Recovery",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 99,
        "keywords": [],
        "abilities": [
          "Enhance Flip, discard 1 momentum: Gain 3 health."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        }
      },
      {
        "id": 10519,
        "image": "https://universus.cards/cards/yyhdt/105.jpg",
        "name": "Banshee Sword's Shriek",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 105,
        "keywords": [
          "Weapon"
        ],
        "abilities": [
          "Response Flip: After a Weapon attack is played, it gets +2 or -1 damage."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 0,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "mid"
        }
      },
      {
        "id": 10520,
        "image": "https://universus.cards/cards/yyhdt/106.jpg",
        "name": "Crowd's Darling",
        "type": "Foundation",
        "rarity": "Uncommon",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 106,
        "keywords": [],
        "abilities": [
          "First Form Discard 1 momentum: Your checks to play Weapon attacks get +1 for the rest of this turn.",
          "Enhance Commit: If your attack deals damage, add the top card of your deck to your momentum."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        }
      },
      {
        "id": 10521,
        "image": "https://universus.cards/cards/yyhdt/107.jpg",
        "name": "Hungry for Fame",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 107,
        "keywords": [],
        "abilities": [
          "Enhance Commit, flip: Add 1 card from your momentum to your hand."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "high"
        }
      },
      {
        "id": 10522,
        "image": "https://universus.cards/cards/yyhdt/108.jpg",
        "name": "No Restraint",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 108,
        "keywords": [
          "Fury"
        ],
        "abilities": [
          "Enhance Discard 1 momentum: Your Weapon attack gets +3 speed."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "low"
        }
      },
      {
        "id": 10531,
        "image": "https://universus.cards/cards/yyhdt/117.jpg",
        "name": "Uraotogi Expertise",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 117,
        "keywords": [
          "Ally",
          "Unique"
        ],
        "abilities": [
          "Form Commit: Draw 1 card. Only playable if you have played an attack this turn.",
          "Team Uraotogi Form Remove: Build 1 foundation that shares 3 symbols with your character from your discard pile."
        ],
        "symbols": [
          "air",
          "all",
          "chaos",
          "void"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "mid"
        }
      },
      {
        "id": 9037,
        "image": "https://universus.cards/cards/libra/088.jpg",
        "name": "Dancing Blades",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "SoulCalibur 6: Libra of Souls",
        "number": 88,
        "keywords": [],
        "abilities": [
          "E Commit, flip: Add 1 face down card from your card pool to your hand."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": []
      },
      {
        "id": 9038,
        "image": "https://universus.cards/cards/libra/089.jpg",
        "name": "Last Priestess of the Winds",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "SoulCalibur 6: Libra of Souls",
        "number": 89,
        "keywords": [],
        "abilities": [
          "R Flip: After a multiple attack is played, reduce its multiple rating to 0. Add the top card of your deck to your momentum.",
          "E: Your face down attack gets +1 speed and +1 damage."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        }
      },
      {
        "id": 9039,
        "image": "https://universus.cards/cards/libra/090.jpg",
        "name": "Pure of Heart",
        "type": "Foundation",
        "rarity": "Common",
        "set": "SoulCalibur 6: Libra of Souls",
        "number": 90,
        "keywords": [],
        "abilities": [
          "If this card leaves your hand due to your opponent's effect, add up to 2 of your opponent's foundations to their card pool.",
          "First E Commit: Choose 1 rival asset or foundation. Your rival cannot play abilities on that card during this attack."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 0,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "high"
        }
      },
      {
        "id": 7061,
        "image": "https://universus.cards/cards/mortalkombat/033.jpg",
        "name": "Called Shot",
        "type": "Foundation",
        "rarity": "Uncommon",
        "set": "Mortal Kombat",
        "number": 33,
        "keywords": [],
        "abilities": [
          "If you have at least 1 momentum, this card gets -1 difficulty and -1 to its block modifier.",
          "E Flip: If your low attack is completely blocked, it still deals 1 damage during the Damage Step. Your next check gets +1."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "high"
        }
      },
      {
        "id": 7060,
        "image": "https://universus.cards/cards/mortalkombat/034.jpg",
        "name": "Earthrealm Mercenary",
        "type": "Foundation",
        "rarity": "Uncommon",
        "set": "Mortal Kombat",
        "number": 34,
        "keywords": [],
        "abilities": [
          "E [Your attack] Commit: Your low attack gets +2 damage. If you have 2 or more momentum, commit 1 of your opponent's foundations.",
          "E [Once per turn] Discard 1 momentum: Your next check to play a card this turn gets +2."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 2,
        "control": 6,
        "attuned": []
      },
      {
        "id": 7059,
        "image": "https://universus.cards/cards/mortalkombat/035.jpg",
        "name": "Extended Lifespan",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Mortal Kombat",
        "number": 35,
        "keywords": [],
        "abilities": [
          "R Commit: After you flip any number of your foundations due to your opponent's effect, commit 1 of your opponent's foundations.",
          "R Flip: After your opponent adds any number of cards to their hand during the Combat Phase, draw 1 card."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        }
      },
      {
        "id": 7058,
        "image": "https://universus.cards/cards/mortalkombat/036.jpg",
        "name": "Sharpshooter",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "Mortal Kombat",
        "number": 36,
        "keywords": [],
        "abilities": [
          "E: Your low attack gets +1 speed, +1 damage and Powerful: 2.",
          "Deadlock E Commit: The speed of this attack cannot be reduced by effects. Your attack gets +4 speed."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 3,
        "control": 4,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        }
      },
      {
        "id": 7045,
        "image": "https://universus.cards/cards/mortalkombat/051.jpg",
        "name": "Avenging Her Father",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Mortal Kombat",
        "number": 51,
        "keywords": [],
        "abilities": [
          "R Flip: After this foundation is committed due to your opponent's effect, gain 2 vitality and ready 1 foundation. Playable while committed.",
          "E Flip 1 foundation: Your Tech or Slam attack gets +2 damage."
        ],
        "symbols": [
          "air",
          "life",
          "water"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "mid"
        }
      },
      {
        "id": 7044,
        "image": "https://universus.cards/cards/mortalkombat/052.jpg",
        "name": "Future Poolside Date",
        "type": "Foundation",
        "rarity": "Uncommon",
        "set": "Mortal Kombat",
        "number": 52,
        "keywords": [],
        "abilities": [
          "E [Discard Pile]: Gain 2 vitality. Only playable if this is the top card of your discard pile.",
          "E Discard 1 card: This attack gets -X speed. X equals 8 minus your printed hand size. Playable while committed."
        ],
        "symbols": [
          "air",
          "life",
          "water"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": []
      },
      {
        "id": 7043,
        "image": "https://universus.cards/cards/mortalkombat/053.jpg",
        "name": "Olympic Boxer",
        "type": "Foundation",
        "rarity": "Uncommon",
        "set": "Mortal Kombat",
        "number": 53,
        "keywords": [],
        "abilities": [
          "R Commit: After the damage of your attack is reduced by your opponent's effect, draw 1 card and gain 2 vitality.",
          "Deadlock E: Your Punch or Tech attack gets +2 speed."
        ],
        "symbols": [
          "air",
          "life",
          "water"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "high"
        }
      },
      {
        "id": 7042,
        "image": "https://universus.cards/cards/mortalkombat/054.jpg",
        "name": "Special Forces Elite",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "Mortal Kombat",
        "number": 54,
        "keywords": [],
        "abilities": [
          "E: Your Tech attack gets +1 speed.",
          "Deadlock R Remove: After your opponent plays a response ability during your Combat Phase, cancel its effects."
        ],
        "symbols": [
          "air",
          "life",
          "water"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "low"
        }
      },
      {
        "id": 7013,
        "image": "https://universus.cards/cards/mortalkombat/087.jpg",
        "name": "Expert Archery",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Mortal Kombat",
        "number": 87,
        "keywords": [],
        "abilities": [
          "E Flip: Shuffle up to 3 cards in either player's discard pile back into their deck.",
          "E Flip: Your next check to play a card gets +1. If that card is a Ranged attack it gets +2 instead."
        ],
        "symbols": [
          "air",
          "chaos",
          "fire"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": []
      },
      {
        "id": 7012,
        "image": "https://universus.cards/cards/mortalkombat/088.jpg",
        "name": "Foul Attitude",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Mortal Kombat",
        "number": 88,
        "keywords": [],
        "abilities": [
          "E Destroy: Reveal 1 Combo or Ranged attack from your hand and add it to your momentum."
        ],
        "symbols": [
          "air",
          "chaos",
          "fire"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "low"
        }
      },
      {
        "id": 7011,
        "image": "https://universus.cards/cards/mortalkombat/089.jpg",
        "name": "Redeemed Rogue",
        "type": "Foundation",
        "rarity": "Uncommon",
        "set": "Mortal Kombat",
        "number": 89,
        "keywords": [],
        "abilities": [
          "E Remove 1 Combo or Ranged attack from your discard pile: This attack gets +2 or -2 damage. Playable while committed.",
          "R Flip: After your opponent plays an ability that destroys 1 or more of your foundations, cancel its effect."
        ],
        "symbols": [
          "air",
          "chaos",
          "fire"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "high"
        }
      },
      {
        "id": 7010,
        "image": "https://universus.cards/cards/mortalkombat/090.jpg",
        "name": "Shaolin Fighter",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "Mortal Kombat",
        "number": 90,
        "keywords": [],
        "abilities": [
          "E [Your turn] Commit: Your Combo or Ranged attack gets +3 damage or gains Stun: 2.",
          "Desperation E Discard 1 momentum: This attack gets -4 damage. Playable while committed."
        ],
        "symbols": [
          "air",
          "chaos",
          "fire"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        }
      },
      {
        "id": 6978,
        "image": "https://universus.cards/cards/mortalkombat/123.jpg",
        "name": "Ageless and Wise",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Mortal Kombat",
        "number": 123,
        "keywords": [],
        "abilities": [
          "R Flip: After your opponent plays an ability that causes any number of foundations to leave your staging area, cancel its effects.",
          "Raiden E Commit: This attack gets -3 speed."
        ],
        "symbols": [
          "air",
          "order",
          "water"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "low"
        }
      },
      {
        "id": 6977,
        "image": "https://universus.cards/cards/mortalkombat/124.jpg",
        "name": "God of Thunder",
        "type": "Foundation",
        "rarity": "Rare",
        "set": "Mortal Kombat",
        "number": 124,
        "keywords": [],
        "abilities": [
          "E Destroy 1 foundation: Ready 1 of your foundations that has not been readied this Combat Phase. Playable while committed.",
          "E Commit: Your attack gets +2 damage."
        ],
        "symbols": [
          "air",
          "order",
          "water"
        ],
        "difficulty": 3,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "high"
        }
      },
      {
        "id": 6983,
        "image": "https://universus.cards/cards/mortalkombat/125.jpg",
        "name": "Out of Mercy",
        "type": "Foundation",
        "rarity": "Common",
        "set": "Mortal Kombat",
        "number": 125,
        "keywords": [],
        "abilities": [
          "E Flip: If you have 6 or fewer foundations, add 1 card from your hand to your momentum.",
          "E Commit: Your Charge or Fury attack gets +3 damage. You may discard 1 momentum to give it Stun: 2."
        ],
        "symbols": [
          "air",
          "order",
          "water"
        ],
        "difficulty": 2,
        "control": 4,
        "attuned": []
      },
      {
        "id": 6976,
        "image": "https://universus.cards/cards/mortalkombat/126.jpg",
        "name": "Sealer of Evil",
        "type": "Foundation",
        "rarity": "Uncommon",
        "set": "Mortal Kombat",
        "number": 126,
        "keywords": [],
        "abilities": [
          "E Commit: Seal and commit 1 of your opponent's {evil} foundations.",
          "E Commit: This attack gets -1 damage. If you have 6 or fewer foundations, this attack gets an additional -2 damage."
        ],
        "symbols": [
          "air",
          "order",
          "water"
        ],
        "difficulty": 2,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        }
      }
    ],
    "attacks": [
      {
        "id": 7014,
        "image": "https://universus.cards/cards/mortalkombat/086.jpg",
        "name": "Rising Monk",
        "type": "Attack",
        "rarity": "Rare",
        "set": "Mortal Kombat",
        "number": 86,
        "keywords": [
          "Kick",
          "Powerful: 2",
          "Combo (Ranged)"
        ],
        "abilities": [
          "Combo E: Discard all Ranged attacks from your card pool and draw 1 card for each card discarded this way.",
          "Deadlock E: Draw 2 cards."
        ],
        "symbols": [
          "air",
          "chaos",
          "fire"
        ],
        "difficulty": 4,
        "control": 2,
        "attuned": [],
        "block": {
          "modifier": 1,
          "zone": "high"
        },
        "attack": {
          "speed": 5,
          "zone": "low",
          "damage": 4
        }
      },
      {
        "id": 7048,
        "image": "https://universus.cards/cards/mortalkombat/048.jpg",
        "name": "Hand Cannon",
        "type": "Attack",
        "rarity": "Uncommon",
        "set": "Mortal Kombat",
        "number": 48,
        "keywords": [
          "Ranged",
          "Tech"
        ],
        "abilities": [
          "While this card is in your card pool, cards cannot leave your opponent's card pool or discard pile due to their effects.",
          "E Discard 1 card: Ready 1 foundation. This attack gets +2 speed and gains Safe for the rest of this turn."
        ],
        "symbols": [
          "air",
          "life",
          "water"
        ],
        "difficulty": 4,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        },
        "attack": {
          "speed": 4,
          "zone": "mid",
          "damage": 4
        }
      },
      {
        "id": 6981,
        "image": "https://universus.cards/cards/mortalkombat/120.jpg",
        "name": "Electrocute",
        "type": "Attack",
        "rarity": "Rare",
        "set": "Mortal Kombat",
        "number": 120,
        "keywords": [
          "Charge",
          "Throw"
        ],
        "abilities": [
          "If you have 6 or fewer foundations, this card gets -1 difficulty.",
          "E Discard X momentum: Commit X of your opponent's non-character cards.",
          "Deadlock E: This attack gets +5 damage."
        ],
        "symbols": [
          "air",
          "order",
          "water"
        ],
        "difficulty": 5,
        "control": 3,
        "attuned": [],
        "attack": {
          "speed": 5,
          "zone": "high",
          "damage": 5
        }
      },
      {
        "id": 7062,
        "image": "https://universus.cards/cards/mortalkombat/032.jpg",
        "name": "Slide Shots",
        "type": "Attack",
        "rarity": "Common",
        "set": "Mortal Kombat",
        "number": 32,
        "keywords": [
          "EX: 2",
          "Kick",
          "Multiple: 2",
          "Tech"
        ],
        "abilities": [
          "E: For the rest of this turn, after a Multiple copy of this attack resolves, you may flip 1 foundation to discard it from your card pool."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 4,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "high"
        },
        "attack": {
          "speed": 3,
          "zone": "low",
          "damage": 3
        }
      },
      {
        "id": 9034,
        "image": "https://universus.cards/cards/libra/085.jpg",
        "name": "Paayon Thrust",
        "type": "Attack",
        "rarity": "Uncommon",
        "set": "SoulCalibur 6: Libra of Souls",
        "number": 85,
        "keywords": [
          "Charge",
          "Punch",
          "Weapon"
        ],
        "abilities": [
          "E: If this attack is completely blocked, add it to your hand after it resolves.",
          "E: Your next Combo attack gets -2 difficulty and +2 damage."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 4,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 1,
          "zone": "mid"
        },
        "attack": {
          "speed": 4,
          "zone": "high",
          "damage": 4
        }
      },
      {
        "id": 10516,
        "image": "https://universus.cards/cards/yyhdt/102.jpg",
        "name": "Cage of Hell",
        "type": "Attack",
        "rarity": "Ultra",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 102,
        "keywords": [
          "Breaker: 1",
          "Stun: 1",
          "Weapon"
        ],
        "abilities": [
          "Enhance: Your next Weapon attack this turn gets +3 speed and +2 damage.",
          "Enhance: Add this card to your momentum during the End Phase."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 3,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 1,
          "zone": "low"
        },
        "attack": {
          "speed": 0,
          "zone": "low",
          "damage": 2
        }
      },
      {
        "id": 10509,
        "image": "https://universus.cards/cards/yyhdt/095.jpg",
        "name": "Walk The Dog",
        "type": "Attack",
        "rarity": "Ultra",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 95,
        "keywords": [
          "Powerful: 3",
          "Ranged",
          "Stun: 1",
          "Weapon"
        ],
        "abilities": [
          "This attack gets -1 difficulty for each committed foundation in your rival's stage (max. -4).",
          "Enhance: Draw 1 card for each copy of \"Walk the Dog\" in your card pool."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 8,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "low"
        },
        "attack": {
          "speed": 6,
          "zone": "low",
          "damage": 6
        }
      },
      {
        "id": 9035,
        "image": "https://universus.cards/cards/libra/086.jpg",
        "name": "Rapid Gale Barrage",
        "type": "Attack",
        "rarity": "Common",
        "set": "SoulCalibur 6: Libra of Souls",
        "number": 86,
        "keywords": [
          "Charge",
          "Reversal",
          "Weapon",
          "Combo (Combo)"
        ],
        "abilities": [
          "E: If this attack deals damage, your next check to play a card gets +1. Multiple copies of this attack gain this ability.",
          "Combo E: This attack gains Mulitple: 2."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 4,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "low"
        },
        "attack": {
          "speed": 4,
          "zone": "mid",
          "damage": 4
        }
      },
      {
        "id": 7064,
        "image": "https://universus.cards/cards/mortalkombat/030.jpg",
        "name": "Sand Grenade",
        "type": "Attack",
        "rarity": "Ultra",
        "set": "Mortal Kombat",
        "number": 30,
        "keywords": [
          "Powerful: 2",
          "Ranged",
          "Tech"
        ],
        "abilities": [
          "E: This attack gets +1 to its Powerful rating for each of your opponent's committed foundations.",
          "Deadlock E: Commit 2 of your opponent's foundations."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 5,
        "control": 2,
        "attuned": [],
        "block": {
          "modifier": 1,
          "zone": "low"
        },
        "attack": {
          "speed": 4,
          "zone": "low",
          "damage": 5
        }
      },
      {
        "id": 10518,
        "image": "https://universus.cards/cards/yyhdt/104.jpg",
        "name": "Chorus of a Thousand Skulls",
        "type": "Attack",
        "rarity": "Rare",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 104,
        "keywords": [
          "Echo",
          "Weapon"
        ],
        "abilities": [
          "Enhance: You may remove a Weapon attack from your card pool to pay for this attack's Echo cost.",
          "Shishiwakamaru Response: After you make the check to play this card, if you have tried to play 2 or more copies of this card this turn, your check gets +2."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 7,
        "control": 2,
        "attuned": [],
        "block": {
          "modifier": 1,
          "zone": "mid"
        },
        "attack": {
          "speed": 4,
          "zone": "low",
          "damage": 8
        }
      },
      {
        "id": 7063,
        "image": "https://universus.cards/cards/mortalkombat/031.jpg",
        "name": "Sand Trap",
        "type": "Attack",
        "rarity": "Rare",
        "set": "Mortal Kombat",
        "number": 31,
        "keywords": [
          "Tech",
          "Throw",
          "Weapon"
        ],
        "abilities": [
          "R: After the damage of this attack is reduced by your opponent's effect, commit 1 of their foundations."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 4,
        "control": 3,
        "attuned": [],
        "attack": {
          "speed": 2,
          "zone": "low",
          "damage": 5
        }
      },
      {
        "id": 8928,
        "image": "https://universus.cards/cards/yyh/079.jpg",
        "name": "Ice Dragon Seiryu",
        "type": "Attack",
        "rarity": "Ultra",
        "set": "Yu Yu Hakusho",
        "number": 79,
        "keywords": [
          "Punch",
          "Ranged",
          "Stun: 3"
        ],
        "abilities": [
          "E Discard 1 momentum: Your next check gets +1 for each of your opponent's committed foundations.",
          "E: Freeze all foundations committed due to this attack's Stun ability."
        ],
        "symbols": [
          "all",
          "chaos",
          "water"
        ],
        "difficulty": 5,
        "control": 2,
        "attuned": [],
        "block": {
          "modifier": 1,
          "zone": "high"
        },
        "attack": {
          "speed": 4,
          "zone": "high",
          "damage": 5
        }
      },
      {
        "id": 6982,
        "image": "https://universus.cards/cards/mortalkombat/119.jpg",
        "name": "Electric Fly",
        "type": "Attack",
        "rarity": "Common",
        "set": "Mortal Kombat",
        "number": 119,
        "keywords": [
          "Charge",
          "Slam"
        ],
        "abilities": [
          "E: If you have 6 or fewer foundations, this attack gets +4 damage and your next attack this turn gets +4 damage."
        ],
        "symbols": [
          "air",
          "order",
          "water"
        ],
        "difficulty": 5,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "mid"
        },
        "attack": {
          "speed": 5,
          "zone": "mid",
          "damage": 4
        }
      },
      {
        "id": 10490,
        "image": "https://universus.cards/cards/yyhdt/076.jpg",
        "name": "Armor of the Wolf",
        "type": "Attack",
        "rarity": "Ultra",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 76,
        "keywords": [
          "EX: 3",
          "Powerful: 3",
          "Slam"
        ],
        "abilities": [
          "When this card is added to your momentum, add it face up.",
          "Enhance [Momentum]: This attack gets +1 damage.",
          "Response: After your rival passes on an Enhance, this attack gets +1 damage."
        ],
        "symbols": [
          "air",
          "chaos",
          "earth"
        ],
        "difficulty": 5,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "high"
        },
        "attack": {
          "speed": 5,
          "zone": "mid",
          "damage": 5
        }
      },
      {
        "id": 7015,
        "image": "https://universus.cards/cards/mortalkombat/085.jpg",
        "name": "Straight Arrow",
        "type": "Attack",
        "rarity": "Common",
        "set": "Mortal Kombat",
        "number": 85,
        "keywords": [
          "Breaker: 1",
          "Ranged",
          "Stun: 1"
        ],
        "abilities": [
          "E Discard the top 4 cards of your deck: Add 1 Ranged attack discarded this way to your hand.",
          "Deadlock E: After this attack resolves, discard all cards from your card pool."
        ],
        "symbols": [
          "air",
          "chaos",
          "fire"
        ],
        "difficulty": 5,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 1,
          "zone": "mid"
        },
        "attack": {
          "speed": 4,
          "zone": "mid",
          "damage": 5
        }
      },
      {
        "id": 7016,
        "image": "https://universus.cards/cards/mortalkombat/084.jpg",
        "name": "Bo Flame",
        "type": "Attack",
        "rarity": "Common",
        "set": "Mortal Kombat",
        "number": 84,
        "keywords": [
          "Fury",
          "Ranged",
          "Safe"
        ],
        "abilities": [
          "E Discard the top 4 cards of your deck: If you discarded an attack this way, draw 1 card and your next check to play a card gets +1."
        ],
        "symbols": [
          "air",
          "chaos",
          "fire"
        ],
        "difficulty": 4,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "high"
        },
        "attack": {
          "speed": 2,
          "zone": "high",
          "damage": 4
        }
      },
      {
        "id": 10508,
        "image": "https://universus.cards/cards/yyhdt/094.jpg",
        "name": "Splatter Drop",
        "type": "Attack",
        "rarity": "Common",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 94,
        "keywords": [
          "Slam"
        ],
        "abilities": [
          "Enhance: If you have 3 or more attacks in your card pool, your rival commits 1 foundation."
        ],
        "symbols": [
          "air",
          "chaos",
          "order"
        ],
        "difficulty": 3,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 1,
          "zone": "mid"
        },
        "attack": {
          "speed": 1,
          "zone": "high",
          "damage": 4
        }
      },
      {
        "id": 9036,
        "image": "https://universus.cards/cards/libra/087.jpg",
        "name": "West Wind Combo",
        "type": "Attack",
        "rarity": "Rare",
        "set": "SoulCalibur 6: Libra of Souls",
        "number": 87,
        "keywords": [
          "Multiple: 2",
          "Punch",
          "Weapon",
          "Combo (Charge)"
        ],
        "abilities": [
          "Combo E: Add 1 card from your card pool to your momentum.",
          "E: If this attack deals damage, destroy one of your opponent's assets. Multiple copies of this attack gain this ability."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 4,
        "control": 3,
        "attuned": [],
        "block": {
          "modifier": 1,
          "zone": "high"
        },
        "attack": {
          "speed": 3,
          "zone": "mid",
          "damage": 5
        }
      }
    ],
    "actions": [
      {
        "id": 10405,
        "image": "https://universus.cards/cards/yyhdt/155.jpg",
        "name": "Genkai's Guidance",
        "type": "Action",
        "rarity": "Secret",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 155,
        "keywords": [],
        "abilities": [
          "First Form Remove, discard 1 card: Your rival discards 1 card.",
          "Response Destroy 3 foundations: After your rival plays an attack, remove it from the game."
        ],
        "symbols": [
          "air",
          "chaos",
          "death",
          "order",
          "void"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "low"
        }
      },
      {
        "id": 7017,
        "image": "https://universus.cards/cards/mortalkombat/083.jpg",
        "name": "Ancestral Quiver",
        "type": "Action",
        "rarity": "Ultra",
        "set": "Mortal Kombat",
        "number": 83,
        "keywords": [],
        "abilities": [
          "While this card is in your card pool, your checks get +1.",
          "F: Discard your opponent's entire momentum.",
          "F: Until the end of this turn, your opponent must lose 1 vitality as an additional cost to play cards.",
          "F Discard 1 momentum: Your attacks gain Stun: 2 for the rest of this turn."
        ],
        "symbols": [
          "air",
          "chaos",
          "fire"
        ],
        "difficulty": 4,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 0,
          "zone": "mid"
        }
      }
    ],
    "assets": [
      {
        "id": 10399,
        "image": "https://universus.cards/cards/yyhdt/148.jpg",
        "name": "Cape of No Return",
        "type": "Asset",
        "rarity": "Ultra",
        "set": "Yu Yu Hakusho: Dark Tournament",
        "number": 148,
        "keywords": [
          "Unique"
        ],
        "abilities": [
          "Enhance Remove: Remove this attack from the game."
        ],
        "symbols": [
          "air",
          "chaos",
          "void"
        ],
        "difficulty": 3,
        "control": 4,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "high"
        }
      },
      {
        "id": 9032,
        "image": "https://universus.cards/cards/libra/083.jpg",
        "name": "Syi Salika & Loka Luha",
        "type": "Asset",
        "rarity": "Ultra",
        "set": "SoulCalibur 6: Libra of Souls",
        "number": 83,
        "keywords": [
          "Unique",
          "Weapon"
        ],
        "abilities": [
          "E [Once per turn] Flip 1 foundation: Add the top card of your deck to your momentum. Only playable if you have 0 momentum.",
          "R [Once per Enhance Step]: After you destroy a foundation during the Enhance Step, this attack gets +2 or -2 speed."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 1,
        "control": 5,
        "attuned": [],
        "block": {
          "modifier": 3,
          "zone": "high"
        }
      },
      {
        "id": 6954,
        "image": "https://universus.cards/cards/mortalkombat/183.jpg",
        "name": "Kove",
        "type": "Asset",
        "rarity": "Ultra",
        "set": "Mortal Kombat",
        "number": 183,
        "keywords": [
          "Terrain"
        ],
        "abilities": [
          "While this card is in your staging area, attacks get -1 speed and -1 damage.",
          "R Add 1 of your foundations to your card pool: After an action card is played, your opponent adds the top card of their deck to their card pool. Copies of that action card cannot be played for the rest of this turn. Playable by either player."
        ],
        "symbols": [
          "air",
          "chaos",
          "water"
        ],
        "difficulty": 2,
        "control": 4,
        "attuned": [],
        "block": {
          "modifier": 2,
          "zone": "low"
        }
      }
    ]
  },
  "all_cards": [
    {
      "id": 10464,
      "image": "https://universus.cards/cards/yyhdt/052.jpg",
      "name": "Masho Concealment",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 52,
      "keywords": [
        "Ally",
        "Unique"
      ],
      "abilities": [
        "Response Commit: After your rival plays an enhance ability on a foundation, cancel it.",
        "Team Masho Enhance: This attack gets -1 speed or +1 damage."
      ],
      "symbols": [
        "air",
        "life",
        "void",
        "water"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "mid"
      }
    },
    {
      "id": 10492,
      "image": "https://universus.cards/cards/yyhdt/078.jpg",
      "name": "Body Memorization",
      "type": "Foundation",
      "rarity": "Uncommon",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 78,
      "keywords": [],
      "abilities": [
        "Enhance Remove: If 2 or more copies of this attack have been played this turn, reduce this attack's damage to 0."
      ],
      "symbols": [
        "air",
        "chaos",
        "earth"
      ],
      "difficulty": 2,
      "control": 4,
      "attuned": [],
      "block": {
        "modifier": 4,
        "zone": "mid"
      }
    },
    {
      "id": 10493,
      "image": "https://universus.cards/cards/yyhdt/079.jpg",
      "name": "Cruel Intent",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 79,
      "keywords": [],
      "abilities": [
        "Enhance Flip: Your Slam attack gets +2 speed. If it deals damage your rival flips 1 foundation."
      ],
      "symbols": [
        "air",
        "chaos",
        "earth"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "low"
      }
    },
    {
      "id": 10494,
      "image": "https://universus.cards/cards/yyhdt/080.jpg",
      "name": "Fearsome Transformations",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 80,
      "keywords": [],
      "abilities": [
        "Enhance Flip: Draw 1 card. If you have no momentum, discard 1 card."
      ],
      "symbols": [
        "air",
        "chaos",
        "earth"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "high"
      }
    },
    {
      "id": 10495,
      "image": "https://universus.cards/cards/yyhdt/081.jpg",
      "name": "Steaming Sphere's Power",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 81,
      "keywords": [],
      "abilities": [
        "Enhance Destroy: Add 1 Slam attack from your discard pile to your momentum.",
        "Response Flip: After your rival plays an ability that discards 1 or more of your momentum, cancel its effects."
      ],
      "symbols": [
        "air",
        "chaos",
        "earth"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      }
    },
    {
      "id": 10510,
      "image": "https://universus.cards/cards/yyhdt/096.jpg",
      "name": "Acrobatic Style",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 96,
      "keywords": [],
      "abilities": [
        "Response [Tenacious] Flip: After a rival foundation is committed due to your effect, ready this card."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "low"
      }
    },
    {
      "id": 10511,
      "image": "https://universus.cards/cards/yyhdt/097.jpg",
      "name": "Childlike Appearance",
      "type": "Foundation",
      "rarity": "Uncommon",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 97,
      "keywords": [],
      "abilities": [
        "Enhance Destroy, discard 1 momentum: Reduce this attack's speed to 0. If it is blocked, commit 1 rival foundation."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 2,
      "control": 4,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "high"
      }
    },
    {
      "id": 10512,
      "image": "https://universus.cards/cards/yyhdt/098.jpg",
      "name": "Power of the Serpent Yo-Yos",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 98,
      "keywords": [
        "Weapon"
      ],
      "abilities": [
        "Enhance: Your attack gets +1 speed. Only playable if it shares at least 2 symbols with your character.",
        "Enhance Flip: If your rival has no ready foundations, your next check to play a card gets +1."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 3,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      }
    },
    {
      "id": 10513,
      "image": "https://universus.cards/cards/yyhdt/099.jpg",
      "name": "Quick Recovery",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 99,
      "keywords": [],
      "abilities": [
        "Enhance Flip, discard 1 momentum: Gain 3 health."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      }
    },
    {
      "id": 10519,
      "image": "https://universus.cards/cards/yyhdt/105.jpg",
      "name": "Banshee Sword's Shriek",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 105,
      "keywords": [
        "Weapon"
      ],
      "abilities": [
        "Response Flip: After a Weapon attack is played, it gets +2 or -1 damage."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 0,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "mid"
      }
    },
    {
      "id": 10520,
      "image": "https://universus.cards/cards/yyhdt/106.jpg",
      "name": "Crowd's Darling",
      "type": "Foundation",
      "rarity": "Uncommon",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 106,
      "keywords": [],
      "abilities": [
        "First Form Discard 1 momentum: Your checks to play Weapon attacks get +1 for the rest of this turn.",
        "Enhance Commit: If your attack deals damage, add the top card of your deck to your momentum."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      }
    },
    {
      "id": 10521,
      "image": "https://universus.cards/cards/yyhdt/107.jpg",
      "name": "Hungry for Fame",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 107,
      "keywords": [],
      "abilities": [
        "Enhance Commit, flip: Add 1 card from your momentum to your hand."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "high"
      }
    },
    {
      "id": 10522,
      "image": "https://universus.cards/cards/yyhdt/108.jpg",
      "name": "No Restraint",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 108,
      "keywords": [
        "Fury"
      ],
      "abilities": [
        "Enhance Discard 1 momentum: Your Weapon attack gets +3 speed."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "low"
      }
    },
    {
      "id": 10531,
      "image": "https://universus.cards/cards/yyhdt/117.jpg",
      "name": "Uraotogi Expertise",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 117,
      "keywords": [
        "Ally",
        "Unique"
      ],
      "abilities": [
        "Form Commit: Draw 1 card. Only playable if you have played an attack this turn.",
        "Team Uraotogi Form Remove: Build 1 foundation that shares 3 symbols with your character from your discard pile."
      ],
      "symbols": [
        "air",
        "all",
        "chaos",
        "void"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "mid"
      }
    },
    {
      "id": 9037,
      "image": "https://universus.cards/cards/libra/088.jpg",
      "name": "Dancing Blades",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "SoulCalibur 6: Libra of Souls",
      "number": 88,
      "keywords": [],
      "abilities": [
        "E Commit, flip: Add 1 face down card from your card pool to your hand."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": []
    },
    {
      "id": 9038,
      "image": "https://universus.cards/cards/libra/089.jpg",
      "name": "Last Priestess of the Winds",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "SoulCalibur 6: Libra of Souls",
      "number": 89,
      "keywords": [],
      "abilities": [
        "R Flip: After a multiple attack is played, reduce its multiple rating to 0. Add the top card of your deck to your momentum.",
        "E: Your face down attack gets +1 speed and +1 damage."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      }
    },
    {
      "id": 9039,
      "image": "https://universus.cards/cards/libra/090.jpg",
      "name": "Pure of Heart",
      "type": "Foundation",
      "rarity": "Common",
      "set": "SoulCalibur 6: Libra of Souls",
      "number": 90,
      "keywords": [],
      "abilities": [
        "If this card leaves your hand due to your opponent's effect, add up to 2 of your opponent's foundations to their card pool.",
        "First E Commit: Choose 1 rival asset or foundation. Your rival cannot play abilities on that card during this attack."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 0,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "high"
      }
    },
    {
      "id": 7061,
      "image": "https://universus.cards/cards/mortalkombat/033.jpg",
      "name": "Called Shot",
      "type": "Foundation",
      "rarity": "Uncommon",
      "set": "Mortal Kombat",
      "number": 33,
      "keywords": [],
      "abilities": [
        "If you have at least 1 momentum, this card gets -1 difficulty and -1 to its block modifier.",
        "E Flip: If your low attack is completely blocked, it still deals 1 damage during the Damage Step. Your next check gets +1."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "high"
      }
    },
    {
      "id": 7060,
      "image": "https://universus.cards/cards/mortalkombat/034.jpg",
      "name": "Earthrealm Mercenary",
      "type": "Foundation",
      "rarity": "Uncommon",
      "set": "Mortal Kombat",
      "number": 34,
      "keywords": [],
      "abilities": [
        "E [Your attack] Commit: Your low attack gets +2 damage. If you have 2 or more momentum, commit 1 of your opponent's foundations.",
        "E [Once per turn] Discard 1 momentum: Your next check to play a card this turn gets +2."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 2,
      "control": 6,
      "attuned": []
    },
    {
      "id": 7059,
      "image": "https://universus.cards/cards/mortalkombat/035.jpg",
      "name": "Extended Lifespan",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Mortal Kombat",
      "number": 35,
      "keywords": [],
      "abilities": [
        "R Commit: After you flip any number of your foundations due to your opponent's effect, commit 1 of your opponent's foundations.",
        "R Flip: After your opponent adds any number of cards to their hand during the Combat Phase, draw 1 card."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      }
    },
    {
      "id": 7058,
      "image": "https://universus.cards/cards/mortalkombat/036.jpg",
      "name": "Sharpshooter",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "Mortal Kombat",
      "number": 36,
      "keywords": [],
      "abilities": [
        "E: Your low attack gets +1 speed, +1 damage and Powerful: 2.",
        "Deadlock E Commit: The speed of this attack cannot be reduced by effects. Your attack gets +4 speed."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 3,
      "control": 4,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      }
    },
    {
      "id": 7045,
      "image": "https://universus.cards/cards/mortalkombat/051.jpg",
      "name": "Avenging Her Father",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Mortal Kombat",
      "number": 51,
      "keywords": [],
      "abilities": [
        "R Flip: After this foundation is committed due to your opponent's effect, gain 2 vitality and ready 1 foundation. Playable while committed.",
        "E Flip 1 foundation: Your Tech or Slam attack gets +2 damage."
      ],
      "symbols": [
        "air",
        "life",
        "water"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "mid"
      }
    },
    {
      "id": 7044,
      "image": "https://universus.cards/cards/mortalkombat/052.jpg",
      "name": "Future Poolside Date",
      "type": "Foundation",
      "rarity": "Uncommon",
      "set": "Mortal Kombat",
      "number": 52,
      "keywords": [],
      "abilities": [
        "E [Discard Pile]: Gain 2 vitality. Only playable if this is the top card of your discard pile.",
        "E Discard 1 card: This attack gets -X speed. X equals 8 minus your printed hand size. Playable while committed."
      ],
      "symbols": [
        "air",
        "life",
        "water"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": []
    },
    {
      "id": 7043,
      "image": "https://universus.cards/cards/mortalkombat/053.jpg",
      "name": "Olympic Boxer",
      "type": "Foundation",
      "rarity": "Uncommon",
      "set": "Mortal Kombat",
      "number": 53,
      "keywords": [],
      "abilities": [
        "R Commit: After the damage of your attack is reduced by your opponent's effect, draw 1 card and gain 2 vitality.",
        "Deadlock E: Your Punch or Tech attack gets +2 speed."
      ],
      "symbols": [
        "air",
        "life",
        "water"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "high"
      }
    },
    {
      "id": 7042,
      "image": "https://universus.cards/cards/mortalkombat/054.jpg",
      "name": "Special Forces Elite",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "Mortal Kombat",
      "number": 54,
      "keywords": [],
      "abilities": [
        "E: Your Tech attack gets +1 speed.",
        "Deadlock R Remove: After your opponent plays a response ability during your Combat Phase, cancel its effects."
      ],
      "symbols": [
        "air",
        "life",
        "water"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "low"
      }
    },
    {
      "id": 7013,
      "image": "https://universus.cards/cards/mortalkombat/087.jpg",
      "name": "Expert Archery",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Mortal Kombat",
      "number": 87,
      "keywords": [],
      "abilities": [
        "E Flip: Shuffle up to 3 cards in either player's discard pile back into their deck.",
        "E Flip: Your next check to play a card gets +1. If that card is a Ranged attack it gets +2 instead."
      ],
      "symbols": [
        "air",
        "chaos",
        "fire"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": []
    },
    {
      "id": 7012,
      "image": "https://universus.cards/cards/mortalkombat/088.jpg",
      "name": "Foul Attitude",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Mortal Kombat",
      "number": 88,
      "keywords": [],
      "abilities": [
        "E Destroy: Reveal 1 Combo or Ranged attack from your hand and add it to your momentum."
      ],
      "symbols": [
        "air",
        "chaos",
        "fire"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "low"
      }
    },
    {
      "id": 7011,
      "image": "https://universus.cards/cards/mortalkombat/089.jpg",
      "name": "Redeemed Rogue",
      "type": "Foundation",
      "rarity": "Uncommon",
      "set": "Mortal Kombat",
      "number": 89,
      "keywords": [],
      "abilities": [
        "E Remove 1 Combo or Ranged attack from your discard pile: This attack gets +2 or -2 damage. Playable while committed.",
        "R Flip: After your opponent plays an ability that destroys 1 or more of your foundations, cancel its effect."
      ],
      "symbols": [
        "air",
        "chaos",
        "fire"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "high"
      }
    },
    {
      "id": 7010,
      "image": "https://universus.cards/cards/mortalkombat/090.jpg",
      "name": "Shaolin Fighter",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "Mortal Kombat",
      "number": 90,
      "keywords": [],
      "abilities": [
        "E [Your turn] Commit: Your Combo or Ranged attack gets +3 damage or gains Stun: 2.",
        "Desperation E Discard 1 momentum: This attack gets -4 damage. Playable while committed."
      ],
      "symbols": [
        "air",
        "chaos",
        "fire"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      }
    },
    {
      "id": 6978,
      "image": "https://universus.cards/cards/mortalkombat/123.jpg",
      "name": "Ageless and Wise",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Mortal Kombat",
      "number": 123,
      "keywords": [],
      "abilities": [
        "R Flip: After your opponent plays an ability that causes any number of foundations to leave your staging area, cancel its effects.",
        "Raiden E Commit: This attack gets -3 speed."
      ],
      "symbols": [
        "air",
        "order",
        "water"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "low"
      }
    },
    {
      "id": 6977,
      "image": "https://universus.cards/cards/mortalkombat/124.jpg",
      "name": "God of Thunder",
      "type": "Foundation",
      "rarity": "Rare",
      "set": "Mortal Kombat",
      "number": 124,
      "keywords": [],
      "abilities": [
        "E Destroy 1 foundation: Ready 1 of your foundations that has not been readied this Combat Phase. Playable while committed.",
        "E Commit: Your attack gets +2 damage."
      ],
      "symbols": [
        "air",
        "order",
        "water"
      ],
      "difficulty": 3,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "high"
      }
    },
    {
      "id": 6983,
      "image": "https://universus.cards/cards/mortalkombat/125.jpg",
      "name": "Out of Mercy",
      "type": "Foundation",
      "rarity": "Common",
      "set": "Mortal Kombat",
      "number": 125,
      "keywords": [],
      "abilities": [
        "E Flip: If you have 6 or fewer foundations, add 1 card from your hand to your momentum.",
        "E Commit: Your Charge or Fury attack gets +3 damage. You may discard 1 momentum to give it Stun: 2."
      ],
      "symbols": [
        "air",
        "order",
        "water"
      ],
      "difficulty": 2,
      "control": 4,
      "attuned": []
    },
    {
      "id": 6976,
      "image": "https://universus.cards/cards/mortalkombat/126.jpg",
      "name": "Sealer of Evil",
      "type": "Foundation",
      "rarity": "Uncommon",
      "set": "Mortal Kombat",
      "number": 126,
      "keywords": [],
      "abilities": [
        "E Commit: Seal and commit 1 of your opponent's {evil} foundations.",
        "E Commit: This attack gets -1 damage. If you have 6 or fewer foundations, this attack gets an additional -2 damage."
      ],
      "symbols": [
        "air",
        "order",
        "water"
      ],
      "difficulty": 2,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      }
    },
    {
      "id": 7014,
      "image": "https://universus.cards/cards/mortalkombat/086.jpg",
      "name": "Rising Monk",
      "type": "Attack",
      "rarity": "Rare",
      "set": "Mortal Kombat",
      "number": 86,
      "keywords": [
        "Kick",
        "Powerful: 2",
        "Combo (Ranged)"
      ],
      "abilities": [
        "Combo E: Discard all Ranged attacks from your card pool and draw 1 card for each card discarded this way.",
        "Deadlock E: Draw 2 cards."
      ],
      "symbols": [
        "air",
        "chaos",
        "fire"
      ],
      "difficulty": 4,
      "control": 2,
      "attuned": [],
      "block": {
        "modifier": 1,
        "zone": "high"
      },
      "attack": {
        "speed": 5,
        "zone": "low",
        "damage": 4
      }
    },
    {
      "id": 7048,
      "image": "https://universus.cards/cards/mortalkombat/048.jpg",
      "name": "Hand Cannon",
      "type": "Attack",
      "rarity": "Uncommon",
      "set": "Mortal Kombat",
      "number": 48,
      "keywords": [
        "Ranged",
        "Tech"
      ],
      "abilities": [
        "While this card is in your card pool, cards cannot leave your opponent's card pool or discard pile due to their effects.",
        "E Discard 1 card: Ready 1 foundation. This attack gets +2 speed and gains Safe for the rest of this turn."
      ],
      "symbols": [
        "air",
        "life",
        "water"
      ],
      "difficulty": 4,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      },
      "attack": {
        "speed": 4,
        "zone": "mid",
        "damage": 4
      }
    },
    {
      "id": 6981,
      "image": "https://universus.cards/cards/mortalkombat/120.jpg",
      "name": "Electrocute",
      "type": "Attack",
      "rarity": "Rare",
      "set": "Mortal Kombat",
      "number": 120,
      "keywords": [
        "Charge",
        "Throw"
      ],
      "abilities": [
        "If you have 6 or fewer foundations, this card gets -1 difficulty.",
        "E Discard X momentum: Commit X of your opponent's non-character cards.",
        "Deadlock E: This attack gets +5 damage."
      ],
      "symbols": [
        "air",
        "order",
        "water"
      ],
      "difficulty": 5,
      "control": 3,
      "attuned": [],
      "attack": {
        "speed": 5,
        "zone": "high",
        "damage": 5
      }
    },
    {
      "id": 7062,
      "image": "https://universus.cards/cards/mortalkombat/032.jpg",
      "name": "Slide Shots",
      "type": "Attack",
      "rarity": "Common",
      "set": "Mortal Kombat",
      "number": 32,
      "keywords": [
        "EX: 2",
        "Kick",
        "Multiple: 2",
        "Tech"
      ],
      "abilities": [
        "E: For the rest of this turn, after a Multiple copy of this attack resolves, you may flip 1 foundation to discard it from your card pool."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 4,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "high"
      },
      "attack": {
        "speed": 3,
        "zone": "low",
        "damage": 3
      }
    },
    {
      "id": 9034,
      "image": "https://universus.cards/cards/libra/085.jpg",
      "name": "Paayon Thrust",
      "type": "Attack",
      "rarity": "Uncommon",
      "set": "SoulCalibur 6: Libra of Souls",
      "number": 85,
      "keywords": [
        "Charge",
        "Punch",
        "Weapon"
      ],
      "abilities": [
        "E: If this attack is completely blocked, add it to your hand after it resolves.",
        "E: Your next Combo attack gets -2 difficulty and +2 damage."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 4,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 1,
        "zone": "mid"
      },
      "attack": {
        "speed": 4,
        "zone": "high",
        "damage": 4
      }
    },
    {
      "id": 10516,
      "image": "https://universus.cards/cards/yyhdt/102.jpg",
      "name": "Cage of Hell",
      "type": "Attack",
      "rarity": "Ultra",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 102,
      "keywords": [
        "Breaker: 1",
        "Stun: 1",
        "Weapon"
      ],
      "abilities": [
        "Enhance: Your next Weapon attack this turn gets +3 speed and +2 damage.",
        "Enhance: Add this card to your momentum during the End Phase."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 3,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 1,
        "zone": "low"
      },
      "attack": {
        "speed": 0,
        "zone": "low",
        "damage": 2
      }
    },
    {
      "id": 10509,
      "image": "https://universus.cards/cards/yyhdt/095.jpg",
      "name": "Walk The Dog",
      "type": "Attack",
      "rarity": "Ultra",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 95,
      "keywords": [
        "Powerful: 3",
        "Ranged",
        "Stun: 1",
        "Weapon"
      ],
      "abilities": [
        "This attack gets -1 difficulty for each committed foundation in your rival's stage (max. -4).",
        "Enhance: Draw 1 card for each copy of \"Walk the Dog\" in your card pool."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 8,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "low"
      },
      "attack": {
        "speed": 6,
        "zone": "low",
        "damage": 6
      }
    },
    {
      "id": 9035,
      "image": "https://universus.cards/cards/libra/086.jpg",
      "name": "Rapid Gale Barrage",
      "type": "Attack",
      "rarity": "Common",
      "set": "SoulCalibur 6: Libra of Souls",
      "number": 86,
      "keywords": [
        "Charge",
        "Reversal",
        "Weapon",
        "Combo (Combo)"
      ],
      "abilities": [
        "E: If this attack deals damage, your next check to play a card gets +1. Multiple copies of this attack gain this ability.",
        "Combo E: This attack gains Mulitple: 2."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 4,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "low"
      },
      "attack": {
        "speed": 4,
        "zone": "mid",
        "damage": 4
      }
    },
    {
      "id": 7064,
      "image": "https://universus.cards/cards/mortalkombat/030.jpg",
      "name": "Sand Grenade",
      "type": "Attack",
      "rarity": "Ultra",
      "set": "Mortal Kombat",
      "number": 30,
      "keywords": [
        "Powerful: 2",
        "Ranged",
        "Tech"
      ],
      "abilities": [
        "E: This attack gets +1 to its Powerful rating for each of your opponent's committed foundations.",
        "Deadlock E: Commit 2 of your opponent's foundations."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 5,
      "control": 2,
      "attuned": [],
      "block": {
        "modifier": 1,
        "zone": "low"
      },
      "attack": {
        "speed": 4,
        "zone": "low",
        "damage": 5
      }
    },
    {
      "id": 10518,
      "image": "https://universus.cards/cards/yyhdt/104.jpg",
      "name": "Chorus of a Thousand Skulls",
      "type": "Attack",
      "rarity": "Rare",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 104,
      "keywords": [
        "Echo",
        "Weapon"
      ],
      "abilities": [
        "Enhance: You may remove a Weapon attack from your card pool to pay for this attack's Echo cost.",
        "Shishiwakamaru Response: After you make the check to play this card, if you have tried to play 2 or more copies of this card this turn, your check gets +2."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 7,
      "control": 2,
      "attuned": [],
      "block": {
        "modifier": 1,
        "zone": "mid"
      },
      "attack": {
        "speed": 4,
        "zone": "low",
        "damage": 8
      }
    },
    {
      "id": 7063,
      "image": "https://universus.cards/cards/mortalkombat/031.jpg",
      "name": "Sand Trap",
      "type": "Attack",
      "rarity": "Rare",
      "set": "Mortal Kombat",
      "number": 31,
      "keywords": [
        "Tech",
        "Throw",
        "Weapon"
      ],
      "abilities": [
        "R: After the damage of this attack is reduced by your opponent's effect, commit 1 of their foundations."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 4,
      "control": 3,
      "attuned": [],
      "attack": {
        "speed": 2,
        "zone": "low",
        "damage": 5
      }
    },
    {
      "id": 8928,
      "image": "https://universus.cards/cards/yyh/079.jpg",
      "name": "Ice Dragon Seiryu",
      "type": "Attack",
      "rarity": "Ultra",
      "set": "Yu Yu Hakusho",
      "number": 79,
      "keywords": [
        "Punch",
        "Ranged",
        "Stun: 3"
      ],
      "abilities": [
        "E Discard 1 momentum: Your next check gets +1 for each of your opponent's committed foundations.",
        "E: Freeze all foundations committed due to this attack's Stun ability."
      ],
      "symbols": [
        "all",
        "chaos",
        "water"
      ],
      "difficulty": 5,
      "control": 2,
      "attuned": [],
      "block": {
        "modifier": 1,
        "zone": "high"
      },
      "attack": {
        "speed": 4,
        "zone": "high",
        "damage": 5
      }
    },
    {
      "id": 6982,
      "image": "https://universus.cards/cards/mortalkombat/119.jpg",
      "name": "Electric Fly",
      "type": "Attack",
      "rarity": "Common",
      "set": "Mortal Kombat",
      "number": 119,
      "keywords": [
        "Charge",
        "Slam"
      ],
      "abilities": [
        "E: If you have 6 or fewer foundations, this attack gets +4 damage and your next attack this turn gets +4 damage."
      ],
      "symbols": [
        "air",
        "order",
        "water"
      ],
      "difficulty": 5,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "mid"
      },
      "attack": {
        "speed": 5,
        "zone": "mid",
        "damage": 4
      }
    },
    {
      "id": 10490,
      "image": "https://universus.cards/cards/yyhdt/076.jpg",
      "name": "Armor of the Wolf",
      "type": "Attack",
      "rarity": "Ultra",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 76,
      "keywords": [
        "EX: 3",
        "Powerful: 3",
        "Slam"
      ],
      "abilities": [
        "When this card is added to your momentum, add it face up.",
        "Enhance [Momentum]: This attack gets +1 damage.",
        "Response: After your rival passes on an Enhance, this attack gets +1 damage."
      ],
      "symbols": [
        "air",
        "chaos",
        "earth"
      ],
      "difficulty": 5,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "high"
      },
      "attack": {
        "speed": 5,
        "zone": "mid",
        "damage": 5
      }
    },
    {
      "id": 7015,
      "image": "https://universus.cards/cards/mortalkombat/085.jpg",
      "name": "Straight Arrow",
      "type": "Attack",
      "rarity": "Common",
      "set": "Mortal Kombat",
      "number": 85,
      "keywords": [
        "Breaker: 1",
        "Ranged",
        "Stun: 1"
      ],
      "abilities": [
        "E Discard the top 4 cards of your deck: Add 1 Ranged attack discarded this way to your hand.",
        "Deadlock E: After this attack resolves, discard all cards from your card pool."
      ],
      "symbols": [
        "air",
        "chaos",
        "fire"
      ],
      "difficulty": 5,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 1,
        "zone": "mid"
      },
      "attack": {
        "speed": 4,
        "zone": "mid",
        "damage": 5
      }
    },
    {
      "id": 7016,
      "image": "https://universus.cards/cards/mortalkombat/084.jpg",
      "name": "Bo Flame",
      "type": "Attack",
      "rarity": "Common",
      "set": "Mortal Kombat",
      "number": 84,
      "keywords": [
        "Fury",
        "Ranged",
        "Safe"
      ],
      "abilities": [
        "E Discard the top 4 cards of your deck: If you discarded an attack this way, draw 1 card and your next check to play a card gets +1."
      ],
      "symbols": [
        "air",
        "chaos",
        "fire"
      ],
      "difficulty": 4,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "high"
      },
      "attack": {
        "speed": 2,
        "zone": "high",
        "damage": 4
      }
    },
    {
      "id": 10508,
      "image": "https://universus.cards/cards/yyhdt/094.jpg",
      "name": "Splatter Drop",
      "type": "Attack",
      "rarity": "Common",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 94,
      "keywords": [
        "Slam"
      ],
      "abilities": [
        "Enhance: If you have 3 or more attacks in your card pool, your rival commits 1 foundation."
      ],
      "symbols": [
        "air",
        "chaos",
        "order"
      ],
      "difficulty": 3,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 1,
        "zone": "mid"
      },
      "attack": {
        "speed": 1,
        "zone": "high",
        "damage": 4
      }
    },
    {
      "id": 9036,
      "image": "https://universus.cards/cards/libra/087.jpg",
      "name": "West Wind Combo",
      "type": "Attack",
      "rarity": "Rare",
      "set": "SoulCalibur 6: Libra of Souls",
      "number": 87,
      "keywords": [
        "Multiple: 2",
        "Punch",
        "Weapon",
        "Combo (Charge)"
      ],
      "abilities": [
        "Combo E: Add 1 card from your card pool to your momentum.",
        "E: If this attack deals damage, destroy one of your opponent's assets. Multiple copies of this attack gain this ability."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 4,
      "control": 3,
      "attuned": [],
      "block": {
        "modifier": 1,
        "zone": "high"
      },
      "attack": {
        "speed": 3,
        "zone": "mid",
        "damage": 5
      }
    },
    {
      "id": 10405,
      "image": "https://universus.cards/cards/yyhdt/155.jpg",
      "name": "Genkai's Guidance",
      "type": "Action",
      "rarity": "Secret",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 155,
      "keywords": [],
      "abilities": [
        "First Form Remove, discard 1 card: Your rival discards 1 card.",
        "Response Destroy 3 foundations: After your rival plays an attack, remove it from the game."
      ],
      "symbols": [
        "air",
        "chaos",
        "death",
        "order",
        "void"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "low"
      }
    },
    {
      "id": 7017,
      "image": "https://universus.cards/cards/mortalkombat/083.jpg",
      "name": "Ancestral Quiver",
      "type": "Action",
      "rarity": "Ultra",
      "set": "Mortal Kombat",
      "number": 83,
      "keywords": [],
      "abilities": [
        "While this card is in your card pool, your checks get +1.",
        "F: Discard your opponent's entire momentum.",
        "F: Until the end of this turn, your opponent must lose 1 vitality as an additional cost to play cards.",
        "F Discard 1 momentum: Your attacks gain Stun: 2 for the rest of this turn."
      ],
      "symbols": [
        "air",
        "chaos",
        "fire"
      ],
      "difficulty": 4,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 0,
        "zone": "mid"
      }
    },
    {
      "id": 10399,
      "image": "https://universus.cards/cards/yyhdt/148.jpg",
      "name": "Cape of No Return",
      "type": "Asset",
      "rarity": "Ultra",
      "set": "Yu Yu Hakusho: Dark Tournament",
      "number": 148,
      "keywords": [
        "Unique"
      ],
      "abilities": [
        "Enhance Remove: Remove this attack from the game."
      ],
      "symbols": [
        "air",
        "chaos",
        "void"
      ],
      "difficulty": 3,
      "control": 4,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "high"
      }
    },
    {
      "id": 9032,
      "image": "https://universus.cards/cards/libra/083.jpg",
      "name": "Syi Salika & Loka Luha",
      "type": "Asset",
      "rarity": "Ultra",
      "set": "SoulCalibur 6: Libra of Souls",
      "number": 83,
      "keywords": [
        "Unique",
        "Weapon"
      ],
      "abilities": [
        "E [Once per turn] Flip 1 foundation: Add the top card of your deck to your momentum. Only playable if you have 0 momentum.",
        "R [Once per Enhance Step]: After you destroy a foundation during the Enhance Step, this attack gets +2 or -2 speed."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 1,
      "control": 5,
      "attuned": [],
      "block": {
        "modifier": 3,
        "zone": "high"
      }
    },
    {
      "id": 6954,
      "image": "https://universus.cards/cards/mortalkombat/183.jpg",
      "name": "Kove",
      "type": "Asset",
      "rarity": "Ultra",
      "set": "Mortal Kombat",
      "number": 183,
      "keywords": [
        "Terrain"
      ],
      "abilities": [
        "While this card is in your staging area, attacks get -1 speed and -1 damage.",
        "R Add 1 of your foundations to your card pool: After an action card is played, your opponent adds the top card of their deck to their card pool. Copies of that action card cannot be played for the rest of this turn. Playable by either player."
      ],
      "symbols": [
        "air",
        "chaos",
        "water"
      ],
      "difficulty": 2,
      "control": 4,
      "attuned": [],
      "block": {
        "modifier": 2,
        "zone": "low"
      }
    }
  ]
};

// Game startup functions
function getCharacter() {
    return GAME_DATA.character;
}

function getDeck() {
    return GAME_DATA.deck;
}

function getAllCards() {
    return GAME_DATA.all_cards;
}

function getCardsByType(type) {
    return GAME_DATA.deck[type.toLowerCase() + 's'] || [];
}

function getCharacterStats() {
    const char = GAME_DATA.character;
    return {
        name: char.name,
        handSize: char.handSize,
        health: char.vitality,
        symbols: char.symbols,
        abilities: char.abilities,
        difficulty: char.difficulty,
        control: char.control,
        blockModifier: char.block?.modifier,
        blockZone: char.block?.zone
    };
}

// Auto-start game
console.log('🎮 UVS Game starting with:', GAME_DATA.character.name);

