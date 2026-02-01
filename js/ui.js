/**
 * UI - Screen management, transitions, and UI helpers
 */

const UI = (function() {
    // Screen elements
    let screens = {};
    let currentScreen = 'menu';

    // Level select state
    let selectedGridSize = 5;
    let selectedStateCount = 2;

    /**
     * Initialize UI
     */
    function init() {
        screens = {
            menu: document.getElementById('screen-menu'),
            levels: document.getElementById('screen-levels'),
            game: document.getElementById('screen-game'),
            tutorial: document.getElementById('screen-tutorial'),
            victory: document.getElementById('screen-victory')
        };

        setupEventListeners();
        initTutorialDemo();
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Main menu
        document.getElementById('btn-play').addEventListener('click', () => {
            GameAudio.playUIClick();
            showScreen('levels');
        });

        document.getElementById('btn-tutorial').addEventListener('click', () => {
            GameAudio.playUIClick();
            showTutorial();
        });

        // Level select
        document.getElementById('btn-back-menu').addEventListener('click', () => {
            GameAudio.playUIClick();
            showScreen('menu');
        });

        // Grid size tabs
        document.querySelectorAll('.grid-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const size = parseInt(tab.dataset.size);
                if (tab.classList.contains('locked')) {
                    GameAudio.playError();
                    return;
                }
                GameAudio.playUIClick();
                selectGridSize(size);
            });
        });

        // State toggle
        document.querySelectorAll('.state-toggle .state-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const states = parseInt(btn.dataset.states);
                if (btn.classList.contains('locked')) {
                    GameAudio.playError();
                    return;
                }
                GameAudio.playUIClick();
                selectStateCount(states);
            });
        });

        // Game controls
        document.getElementById('btn-back-levels').addEventListener('click', () => {
            GameAudio.playUIClick();
            Game.stop();
            showScreen('levels');
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            GameAudio.playUIClick();
            Game.reset();
        });

        // Tutorial
        document.getElementById('btn-got-it').addEventListener('click', () => {
            GameAudio.playUIClick();
            hideTutorial();
        });

        // Victory
        document.getElementById('btn-victory-levels').addEventListener('click', () => {
            GameAudio.playUIClick();
            hideVictory();
            showScreen('levels');
        });

        document.getElementById('btn-next-level').addEventListener('click', () => {
            GameAudio.playUIClick();
            hideVictory();
            playNextLevel();
        });
    }

    /**
     * Show a screen
     */
    function showScreen(name) {
        // Hide current screen
        if (screens[currentScreen]) {
            screens[currentScreen].classList.remove('active');
        }

        currentScreen = name;

        // Update screen content if needed
        if (name === 'menu') {
            updateMenuScreen();
        } else if (name === 'levels') {
            updateLevelSelectScreen();
        }

        // Show new screen
        screens[name].classList.add('active');
    }

    /**
     * Update main menu screen
     */
    function updateMenuScreen() {
        // Update score
        document.getElementById('menu-score').textContent = Storage.getTotalScore().toLocaleString();
    }

    /**
     * Update level select screen
     */
    function updateLevelSelectScreen() {
        // Update tabs
        const tab6x6 = document.getElementById('tab-6x6');
        const tab7x7 = document.getElementById('tab-7x7');
        const btn3state = document.getElementById('btn-3state');

        if (Storage.is6x6Unlocked()) {
            tab6x6.classList.remove('locked');
        }
        if (Storage.is7x7Unlocked()) {
            tab7x7.classList.remove('locked');
        }
        if (Storage.is3StateUnlocked()) {
            btn3state.classList.remove('locked');
        }

        // Show unlock message if needed
        const unlockMessage = document.getElementById('unlock-message');
        const completed5x5 = Storage.getCompletedCount(5);
        if (completed5x5 < 10 && !Storage.is6x6Unlocked()) {
            unlockMessage.textContent = `Complete ${10 - completed5x5} more levels in 5x5 to unlock more options`;
            unlockMessage.classList.add('visible');
        } else {
            unlockMessage.classList.remove('visible');
        }

        // Update 3-state section visibility in tutorial
        const tutorial3state = document.getElementById('tutorial-3state');
        if (Storage.is3StateUnlocked()) {
            tutorial3state.classList.add('visible');
        }

        updateLevelGrid();
    }

    /**
     * Select grid size tab
     */
    function selectGridSize(size) {
        selectedGridSize = size;

        // Update tab styles
        document.querySelectorAll('.grid-tabs .tab').forEach(tab => {
            tab.classList.remove('active');
            if (parseInt(tab.dataset.size) === size) {
                tab.classList.add('active');
            }
        });

        updateLevelGrid();
    }

    /**
     * Select state count
     */
    function selectStateCount(count) {
        selectedStateCount = count;

        // Update button styles
        document.querySelectorAll('.state-toggle .state-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.states) === count) {
                btn.classList.add('active');
            }
        });

        updateLevelGrid();
    }

    /**
     * Update the level grid buttons
     */
    function updateLevelGrid() {
        const container = document.getElementById('levels-grid');
        container.innerHTML = '';

        for (let i = 1; i <= 30; i++) {
            const levelId = `${selectedGridSize}x${selectedGridSize}_${selectedStateCount}state_${String(i).padStart(2, '0')}`;
            const levelData = Levels.getLevel(levelId);
            const stars = Storage.getLevelStars(levelId);

            // Determine difficulty
            let difficulty = 'easy';
            if (i > 10 && i <= 20) difficulty = 'medium';
            else if (i > 20) difficulty = 'hard';

            const btn = document.createElement('button');
            btn.className = `level-btn ${difficulty}`;
            if (stars > 0) btn.classList.add('has-stars');

            // Generate stars HTML
            let starsHtml = '';
            for (let s = 0; s < 3; s++) {
                starsHtml += `<span class="level-star ${s < stars ? 'filled' : ''}">★</span>`;
            }

            btn.innerHTML = `
                <span class="level-num">${i}</span>
                <div class="level-stars">${starsHtml}</div>
            `;

            btn.addEventListener('click', () => {
                if (levelData) {
                    GameAudio.playUIClick();
                    startLevel(levelId);
                }
            });

            container.appendChild(btn);
        }
    }

    /**
     * Start a level
     */
    function startLevel(levelId) {
        const levelData = Levels.getLevel(levelId);
        if (!levelData) {
            console.error('Level not found:', levelId);
            return;
        }

        showScreen('game');

        // Small delay to allow screen transition
        setTimeout(() => {
            Game.startLevel(levelData);
        }, 50);
    }

    /**
     * Play the next level
     */
    function playNextLevel() {
        const current = Game.getCurrentLevel();
        const nextNum = current.levelNumber + 1;

        if (nextNum > 30) {
            // No more levels in this category
            showScreen('levels');
            return;
        }

        const nextId = `${current.gridSize}x${current.gridSize}_${current.stateCount}state_${String(nextNum).padStart(2, '0')}`;
        startLevel(nextId);
    }

    /**
     * Show tutorial overlay
     */
    function showTutorial() {
        screens.tutorial.classList.add('active');
    }

    /**
     * Hide tutorial overlay
     */
    function hideTutorial() {
        screens.tutorial.classList.remove('active');
    }

    /**
     * Initialize tutorial demo canvas
     */
    function initTutorialDemo() {
        const canvas = document.getElementById('tutorial-canvas');
        const ctx = canvas.getContext('2d');
        const size = 3;
        const cellSize = 50;

        let demoGrid = [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0]
        ];

        function roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        function drawDemo() {
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    const x = col * cellSize;
                    const y = row * cellSize;
                    const state = demoGrid[row][col];

                    if (state === 1) {
                        ctx.fillStyle = '#00ff88';
                        ctx.shadowColor = 'rgba(0, 255, 136, 0.6)';
                        ctx.shadowBlur = 15;
                    } else {
                        ctx.fillStyle = '#1a1a2e';
                        ctx.shadowBlur = 0;
                    }

                    roundRect(ctx, x + 4, y + 4, cellSize - 8, cellSize - 8, 4);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    if (state === 0) {
                        ctx.strokeStyle = '#2a2a4e';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
        }

        // Animate demo - shows clicking center cell
        let step = 0;
        const patterns = [
            [[0,0,0],[0,1,0],[0,0,0]], // Initial: center on
            [[0,1,0],[1,0,1],[0,1,0]], // Click center: toggles center + neighbors
            [[0,0,0],[0,1,0],[0,0,0]], // Click center again: back to start
            [[0,1,0],[1,0,1],[0,1,0]], // Click again
        ];

        function animateDemo() {
            demoGrid = patterns[step].map(r => [...r]);
            drawDemo();
            step = (step + 1) % patterns.length;
        }

        drawDemo();
        setInterval(animateDemo, 1200);
    }

    /**
     * Show victory popup
     */
    function showVictory(moves, optimal, points, newUnlocks) {
        document.getElementById('victory-moves').textContent = moves;
        document.getElementById('victory-optimal').textContent = optimal;
        document.getElementById('victory-points').textContent = `+${points}`;

        // Calculate stars (3 stars for optimal, 2 for <150%, 1 for completion)
        const ratio = moves / optimal;
        let stars = 1;
        if (ratio <= 1) stars = 3;
        else if (ratio <= 1.5) stars = 2;

        const ratingContainer = document.getElementById('victory-rating');
        ratingContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.textContent = '★';
            if (i < stars) {
                star.classList.add('filled');
                star.style.animationDelay = `${i * 0.15}s`;
            }
            ratingContainer.appendChild(star);
        }

        screens.victory.classList.add('active');

        // Update menu and level screens for any unlocks
        updateMenuScreen();
    }

    /**
     * Hide victory popup
     */
    function hideVictory() {
        screens.victory.classList.remove('active');
    }

    /**
     * Get current screen name
     */
    function getCurrentScreen() {
        return currentScreen;
    }

    return {
        init,
        showScreen,
        showVictory,
        hideVictory,
        showTutorial,
        hideTutorial,
        getCurrentScreen,
        updateMenuScreen,
        updateLevelSelectScreen
    };
})();

window.UI = UI;
