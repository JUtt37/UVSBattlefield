// UVS Game Engine - Core Logic
// Based on UniVersus CCG Rules Reference Document

class UVSGameEngine {
    constructor() {
        this.gameState = {
            activePlayer: 0,
            turn: 1,
            phase: 'start', // start, combat, end
            step: 'ready', // ready, review, draw
            gameStarted: false,
            players: []
        };
        this.players = [];
        this.cardDatabase = {};
        this.init();
    }

    init() {
        // Initialize players
        this.players = [
            new UVSPlayer(0, "Player 1"),
            new UVSPlayer(1, "Player 2")
        ];
        this.gameState.players = this.players;
        this.loadCardDatabase();
    }

    loadCardDatabase() {
        // Load from card_db/cards.csv
        fetch('card_db/cards.csv')
            .then(response => response.text())
            .then(data => {
                const lines = data.split('\n');
                for (let i = 1; i < lines.length; i++) {
                    const [id, name, type, difficulty, block, check, symbols, text] = lines[i].split(',');
                    this.cardDatabase[id] = { id, name, type, difficulty: parseInt(difficulty), block: parseInt(block), check: parseInt(check), symbols, text };
                }
            });
    }

    startGame() {
        this.gameState.gameStarted = true;
        this.gameState.activePlayer = 0;
        this.gameState.turn = 1;
        this.gameState.phase = 'start';
        this.gameState.step = 'ready';
        
        // First player skips Start Phase
        this.players[0].startTurn(true);
        this.players[1].startTurn(false);
        
        this.updateUI();
    }

    nextPhase() {
        const phases = ['start', 'combat', 'end'];
        const currentIndex = phases.indexOf(this.gameState.phase);
        const nextIndex = (currentIndex + 1) % phases.length;
        
        this.gameState.phase = phases[nextIndex];
        
        if (this.gameState.phase === 'start') {
            this.gameState.step = 'ready';
            this.players[this.gameState.activePlayer].startTurn(false);
        } else if (this.gameState.phase === 'end') {
            this.endTurn();
        }
        
        this.updateUI();
    }

    nextStep() {
        if (this.gameState.phase !== 'start') return;
        
        const steps = ['ready', 'review', 'draw'];
        const currentIndex = steps.indexOf(this.gameState.step);
        const nextIndex = (currentIndex + 1) % steps.length;
        
        this.gameState.step = steps[nextIndex];
        
        if (this.gameState.step === 'ready') {
            this.players[this.gameState.activePlayer].readyCards();
        } else if (this.gameState.step === 'draw') {
            this.players[this.gameState.activePlayer].drawCards();
        }
        
        this.updateUI();
    }

    playCard(playerId, cardId, targetZone = 'cardpool') {
        const player = this.players[playerId];
        const card = player.hand.find(c => c.cardId === cardId);
        
        if (!card) return false;
        
        // Check progressive difficulty
        if (targetZone === 'cardpool' && player.cardPool.length >= 7) {
            alert('Card Pool is full (max 7 cards)');
            return false;
        }
        
        const requiredDifficulty = this.cardDatabase[cardId].difficulty + player.cardPool.length;
        const checkValue = this.cardDatabase[cardId].check;
        
        if (checkValue < requiredDifficulty) {
            alert(`Cannot play card: Need ${requiredDifficulty} check, but card only has ${checkValue}`);
            return false;
        }
        
        // Move card to target zone
        player.hand.remove(card);
        if (targetZone === 'cardpool') {
            player.cardPool.add(card);
        } else if (targetZone === 'stage') {
            player.stage.add(card);
        }
        
        this.updateUI();
        return true;
    }

    endTurn() {
        // Move attacks that dealt damage to momentum
        const player = this.players[this.gameState.activePlayer];
        player.moveAttacksToMomentum();
        
        // Switch active player
        this.gameState.activePlayer = (this.gameState.activePlayer + 1) % 2;
        this.gameState.turn++;
        this.gameState.phase = 'start';
        this.gameState.step = 'ready';
        
        // Start new turn
        this.players[this.gameState.activePlayer].startTurn(false);
        
        this.updateUI();
    }

    updateUI() {
        // This will be called by the UI controller
        if (window.updateGameDisplay) {
            window.updateGameDisplay();
        }
    }
}

class UVSPlayer {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.health = 20;
        this.handSize = 7;
        
        // UVS Zones
        this.deck = new UVSZone('deck');
        this.hand = new UVSZone('hand');
        this.cardPool = new UVSZone('cardpool');
        this.stage = new UVSZone('stage');
        this.discard = new UVSZone('discard');
        this.momentum = new UVSZone('momentum');
        this.removed = new UVSZone('removed');
        this.assets = new UVSZone('assets');
        this.character = new UVSZone('character');
        this.foundations = new UVSZone('foundations');
    }

    startTurn(isFirstPlayer) {
        if (!isFirstPlayer) {
            this.readyCards();
            this.drawCards();
        }
    }

    readyCards() {
        this.stage.cards.forEach(card => card.tapped = false);
    }

    drawCards() {
        const cardsToDraw = this.handSize - this.hand.size();
        for (let i = 0; i < cardsToDraw; i++) {
            if (this.deck.size() > 0) {
                const card = this.deck.draw();
                this.hand.add(card);
            }
        }
    }

    moveAttacksToMomentum() {
        // Move attacks that dealt damage to momentum
        this.cardPool.cards.forEach(card => {
            if (this.cardDatabase[card.cardId].type === 'attack' && card.counters.get('damage') > 0) {
                this.cardPool.remove(card);
                this.momentum.add(card);
            }
        });
    }
}

class UVSZone {
    constructor(name) {
        this.name = name;
        this.cards = [];
    }

    add(card) {
        this.cards.push(card);
    }

    remove(card) {
        const index = this.cards.indexOf(card);
        if (index > -1) {
            this.cards.splice(index, 1);
        }
    }

    size() {
        return this.cards.length;
    }

    draw() {
        return this.cards.pop();
    }
}

// Global game instance
window.uvsGame = new UVSGameEngine();