/**
 * UI - Screen management, transitions, and UI helpers
 */

const UI = (function() {
    // Screen elements
    let screens = {};
    let currentScreen = 'menu';

    // Level select state
    let selectedGridSize = 4;
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

        // Hint button
        document.getElementById('btn-hint').addEventListener('click', () => {
            GameAudio.playUIClick();
            Game.showHint();
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
        // Update 3-state section visibility in tutorial
        const tutorial3state = document.getElementById('tutorial-3state');
        if (Storage.is3StateUnlocked()) {
            tutorial3state.classList.add('visible');
        }

        generateModeCards();
        setupStateToggle();
        updateUnlockMessage();
        updateLevelGrid();
    }

    /**
     * Generate mode cards for grid sizes (4×4, 5×5, 6×6)
     */
    function generateModeCards() {
        const container = document.getElementById('mode-cards');
        container.innerHTML = '';

        const sizes = [4, 5, 6];

        sizes.forEach(size => {
            const isLocked = isGridSizeLocked(size);
            const completed = Storage.getCompletedCountForMode(size, selectedStateCount);
            const total = 30;
            const isActive = size === selectedGridSize;

            const card = document.createElement('div');
            card.className = 'mode-card';
            if (isActive) card.classList.add('active');
            if (isLocked) card.classList.add('locked');

            if (isLocked) {
                card.innerHTML = `
                    <span class="mode-size">${size}×${size}</span>
                    <span class="mode-lock-icon">🔒</span>
                `;
            } else {
                const progressPercent = (completed / total) * 100;
                card.innerHTML = `
                    <span class="mode-size">${size}×${size}</span>
                    <div class="mode-progress">
                        <div class="mode-progress-bar" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="mode-count">${completed}/${total}</span>
                `;
            }

            card.addEventListener('click', () => {
                if (isLocked) {
                    GameAudio.playError();
                    return;
                }
                GameAudio.playUIClick();
                selectGridSize(size);
            });

            container.appendChild(card);
        });
    }

    /**
     * Setup state toggle switch
     */
    function setupStateToggle() {
        const toggle = document.getElementById('state-toggle');
        const switchBtn = document.getElementById('toggle-switch');
        const isLocked = !isUnlocked();

        // Update toggle state
        if (selectedStateCount === 3) {
            toggle.classList.add('three-state');
        } else {
            toggle.classList.remove('three-state');
        }

        if (isLocked) {
            toggle.classList.add('locked');
        } else {
            toggle.classList.remove('locked');
        }

        // Remove old listener and add new one
        const newSwitch = switchBtn.cloneNode(true);
        switchBtn.parentNode.replaceChild(newSwitch, switchBtn);

        newSwitch.addEventListener('click', () => {
            if (isLocked) {
                GameAudio.playError();
                return;
            }
            GameAudio.playUIClick();
            toggleStateCount();
        });
    }

    /**
     * Toggle between 2-state and 3-state
     */
    function toggleStateCount() {
        selectedStateCount = selectedStateCount === 2 ? 3 : 2;
        const toggle = document.getElementById('state-toggle');

        if (selectedStateCount === 3) {
            toggle.classList.add('three-state');
        } else {
            toggle.classList.remove('three-state');
        }

        // Regenerate cards to update progress for new state count
        generateModeCards();
        updateLevelGrid();
    }

    /**
     * Check if grid size is locked
     */
    function isGridSizeLocked(size) {
        if (size === 4) return false;
        return !isUnlocked();
    }

    /**
     * Check if advanced modes are unlocked (10 levels in 4×4)
     */
    function isUnlocked() {
        return Storage.getCompletedCount(4) >= 10;
    }

    /**
     * Update unlock message
     */
    function updateUnlockMessage() {
        const message = document.getElementById('unlock-message');
        const completed = Storage.getCompletedCount(4);
        const remaining = 10 - completed;

        if (remaining > 0) {
            const key = remaining === 1 ? 'unlock_message_one' : 'unlock_message_other';
            message.textContent = I18n.t(key, { remaining });
            message.classList.add('visible');
        } else {
            message.classList.remove('visible');
        }
    }

    /**
     * Select grid size
     */
    function selectGridSize(size) {
        selectedGridSize = size;

        // Update card styles
        document.querySelectorAll('.mode-card').forEach((card, index) => {
            card.classList.remove('active');
            if ([4, 5, 6][index] === size) {
                card.classList.add('active');
            }
        });

        // Regenerate to update progress counts
        generateModeCards();
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
        const cellSize = 40;
        canvas.width = 120;
        canvas.height = 120;

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
    function showVictory(moves, optimal, points, newUnlocks, stars, hintsUsed) {
        document.getElementById('victory-moves').textContent = moves;
        document.getElementById('victory-optimal').textContent = optimal;
        document.getElementById('victory-points').textContent = `+${points}`;

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
