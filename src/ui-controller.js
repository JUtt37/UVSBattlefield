// UVS UI Controller - Bridges game engine with existing HTML

class UVSUIController {
    constructor() {
        this.game = window.uvsGame;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
    }

    setupEventListeners() {
        // Add game control buttons
        const gameHeader = document.querySelector('.game-header');
        if (gameHeader) {
            const controls = document.createElement('div');
            controls.className = 'game-controls';
            controls.innerHTML = `
                <button onclick="uiController.startGame()">Start Game</button>
                <button onclick="uiController.nextPhase()">Next Phase</button>
                <button onclick="uiController.nextStep()">Next Step</button>
                <button onclick="uiController.endTurn()">End Turn</button>
            `;
            gameHeader.appendChild(controls);
        }

        // Add hand display
        this.createHandDisplay();
    }

    createHandDisplay() {
        const gameBoard = document.querySelector('.game-board');
        if (gameBoard) {
            const handArea = document.createElement('div');
            handArea.id = 'hand-area';
            handArea.className = 'hand-area';
            handArea.innerHTML = `
                <h3>Your Hand</h3>
                <div id="hand-cards" class="hand-cards"></div>
            `;
            gameBoard.appendChild(handArea);
        }
    }

    startGame() {
        this.game.startGame();
        this.updateDisplay();
    }

    nextPhase() {
        this.game.nextPhase();
        this.updateDisplay();
    }

    nextStep() {
        this.game.nextStep();
        this.updateDisplay();
    }

    endTurn() {
        this.game.endTurn();
        this.updateDisplay();
    }

    playCard(cardId) {
        const activePlayer = this.game.gameState.activePlayer;
        this.game.playCard(activePlayer, cardId, 'cardpool');
        this.updateDisplay();
    }

    updateDisplay() {
        this.updatePlayerAreas();
        this.updateHandDisplay();
        this.updateGameInfo();
    }

    updatePlayerAreas() {
        this.game.players.forEach((player, index) => {
            const playerArea = document.querySelector(`.player-area:nth-child(${index + 1})`);
            if (playerArea) {
                // Update active state
                playerArea.classList.toggle('active', index === this.game.gameState.activePlayer);
                
                // Update zone displays
                this.updateZoneDisplay(playerArea, 'deck', player.deck);
                this.updateZoneDisplay(playerArea, 'cardpool', player.cardPool);
                this.updateZoneDisplay(playerArea, 'stage', player.stage);
                this.updateZoneDisplay(playerArea, 'discard', player.discard);
                this.updateZoneDisplay(playerArea, 'momentum', player.momentum);
            }
        });
    }

    updateZoneDisplay(playerArea, zoneName, zone) {
        const zoneElement = playerArea.querySelector(`.${zoneName}-zone`);
        if (zoneElement) {
            zoneElement.innerHTML = zone.cards.map(card => 
                `<div class="card" data-card-id="${card.cardId}">${this.game.cardDatabase[card.cardId]?.name || 'Unknown'}</div>`
            ).join('');
        }
    }

    updateHandDisplay() {
        const handCards = document.getElementById('hand-cards');
        if (handCards && this.game.gameStarted) {
            const activePlayer = this.game.players[this.game.gameState.activePlayer];
            handCards.innerHTML = activePlayer.hand.cards.map(card => 
                `<div class="hand-card" onclick="uiController.playCard('${card.cardId}')">
                    ${this.game.cardDatabase[card.cardId]?.name || 'Unknown'}
                </div>`
            ).join('');
        }
    }

    updateGameInfo() {
        const gameInfo = document.querySelector('.game-info');
        if (gameInfo) {
            gameInfo.innerHTML = `
                <div>Turn: ${this.game.gameState.turn}</div>
                <div>Phase: ${this.game.gameState.phase}</div>
                <div>Step: ${this.game.gameState.step}</div>
                <div>Active Player: ${this.game.gameState.activePlayer + 1}</div>
            `;
        }
    }
}

// Initialize UI controller
window.uiController = new UVSUIController();