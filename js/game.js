/**
 * Game Engine - Core game logic, grid state, and rendering
 */

const Game = (function() {
    let canvas = null;
    let ctx = null;
    let gridSize = 5;
    let stateCount = 2;
    let grid = [];
    let moveCount = 0;
    let optimalMoves = 0;
    let hintsUsed = 0;
    let maxHints = 3;
    let levelId = '';
    let levelNumber = 1;
    let isPlaying = false;
    let previousBestStars = 0;

    // Animation state
    let animatingCells = [];
    let lastFrameTime = 0;

    // Colors
    const colors = {
        background: '#0a0a0f',
        cellOff: '#1a1a2e',
        cellDim: '#4a4a6a',
        cellOn: '#00ff88',
        border: '#2a2a4e',
        glowOn: 'rgba(0, 255, 136, 0.6)',
        glowDim: 'rgba(74, 74, 106, 0.4)'
    };

    /**
     * Initialize the game canvas
     */
    function init() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');

        // Handle clicks/touches
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', handleTouch, { passive: false });

        // Handle resize
        window.addEventListener('resize', resizeCanvas);
    }

    /**
     * Resize canvas to fit container while maintaining aspect ratio
     */
    function resizeCanvas() {
        const container = canvas.parentElement;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate size to fit container as a square
        const size = Math.min(containerWidth, containerHeight, 400);

        canvas.width = size;
        canvas.height = size;

        if (isPlaying) {
            render();
        }
    }

    /**
     * Start a new level
     * @param {Object} levelData - Level configuration
     */
    function startLevel(levelData) {
        gridSize = levelData.gridSize;
        stateCount = levelData.stateCount;
        levelNumber = levelData.levelNumber;
        levelId = levelData.id;
        optimalMoves = levelData.optimalMoves;
        moveCount = 0;
        hintsUsed = 0;

        // Get previous best stars for this level
        previousBestStars = Storage.getLevelStars(levelId);

        // Deep copy initial state
        grid = levelData.initialState.map(row => [...row]);

        isPlaying = true;
        animatingCells = [];

        resizeCanvas();
        updateUI();
        render();

        Mesa.game.gameplayStart();
    }

    /**
     * Reset current level to initial state
     */
    function reset() {
        const levelData = Levels.getLevel(levelId);
        if (levelData) {
            grid = levelData.initialState.map(row => [...row]);
            moveCount = 0;
            hintsUsed = 0;
            animatingCells = [];
            updateUI();
            render();
        }
    }

    /**
     * Handle canvas click
     */
    function handleClick(e) {
        if (!isPlaying) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        processInput(x, y);
    }

    /**
     * Handle touch input
     */
    function handleTouch(e) {
        if (!isPlaying) return;
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        processInput(x, y);
    }

    /**
     * Process input at canvas coordinates
     */
    function processInput(x, y) {
        // Account for CSS scaling (canvas may be rendered smaller/larger than its actual size)
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const scaledX = x * scaleX;
        const scaledY = y * scaleY;

        const cellSize = canvas.width / gridSize;
        const col = Math.floor(scaledX / cellSize);
        const row = Math.floor(scaledY / cellSize);

        if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
            toggleCell(row, col);
        }
    }

    /**
     * Toggle a cell and its neighbors
     */
    function toggleCell(row, col) {
        const affected = [
            [row, col],
            [row - 1, col],
            [row + 1, col],
            [row, col - 1],
            [row, col + 1]
        ];

        // Apply toggle and track animations
        for (const [r, c] of affected) {
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                const oldState = grid[r][c];
                grid[r][c] = (grid[r][c] + 1) % stateCount;

                // Add animation
                animatingCells.push({
                    row: r,
                    col: c,
                    startTime: performance.now(),
                    fromState: oldState,
                    toState: grid[r][c]
                });
            }
        }

        moveCount++;
        GameAudio.playClick(grid[row][col], stateCount);
        updateUI();
        render();

        // Check win condition
        if (checkWin()) {
            handleWin();
        }
    }

    /**
     * Check if all cells are off
     */
    function checkWin() {
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (grid[row][col] !== 0) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Handle win condition
     */
    async function handleWin() {
        isPlaying = false;
        Mesa.game.gameplayStop();
        GameAudio.playVictory();

        // Calculate stars using new algorithm
        const stars = calculateStars(moveCount, optimalMoves, hintsUsed);

        // Calculate points
        const maxPoints = calculateMaxPoints(levelNumber, gridSize, stateCount);
        const earnedPoints = maxPoints * stars;

        // Save progress with star rating
        const result = await Storage.completeLevel(levelId, maxPoints, stars);

        if (result.newUnlocks.length > 0) {
            GameAudio.playUnlock();
        }

        // Submit to leaderboard
        await Storage.submitToLeaderboard();

        // Show victory screen
        UI.showVictory(moveCount, optimalMoves, earnedPoints, result.newUnlocks, stars, hintsUsed);
    }

    /**
     * Calculate stars based on performance
     * @param {number} moves - Actual moves made
     * @param {number} optimal - Optimal moves
     * @param {number} hints - Hints used
     * @returns {number} Stars (1-3)
     */
    function calculateStars(moves, optimal, hints) {
        // Base efficiency: optimal/moves * 100
        let efficiency = (optimal / moves) * 100;

        // If any hint used, cap at 89% (no 3 stars possible)
        if (hints > 0) {
            efficiency = Math.min(efficiency, 89);
        }

        // Subtract hint penalty (10% per hint)
        const hintPenalty = hints * 10;
        const finalScore = efficiency - hintPenalty;

        // Determine stars
        if (finalScore > 90) return 3;
        if (finalScore > 70) return 2;
        return 1; // Minimum 1 star for completion
    }

    /**
     * Get current star rating (live calculation)
     */
    function getCurrentStars() {
        if (moveCount === 0) return 3; // Haven't moved yet, show max potential
        return calculateStars(moveCount, optimalMoves, hintsUsed);
    }

    /**
     * Calculate max points for a level
     * maxPoints = (level_number + 4) * (grid_size - 3) * (state_count == 3 ? 2 : 1)
     */
    function calculateMaxPoints(level, size, states) {
        return (level + 4) * (size - 3) * (states === 3 ? 2 : 1);
    }

    /**
     * Update UI elements
     */
    function updateUI() {
        document.getElementById('move-counter').textContent = moveCount;
        document.getElementById('optimal-moves').textContent = optimalMoves;
        const levelHeaderText = I18n.t('level_header', { gridSize, stateCount, levelNumber });
        const lastDot = levelHeaderText.lastIndexOf('\u00b7');
        const headerEl = document.getElementById('game-level-text');
        if (lastDot !== -1) {
            const mainPart = levelHeaderText.substring(0, lastDot).trim();
            const statesPart = levelHeaderText.substring(lastDot);
            headerEl.innerHTML = `${mainPart} <span class="header-states">${statesPart}</span>`;
        } else {
            headerEl.textContent = levelHeaderText;
        }

        // Update points display
        const maxPoints = calculateMaxPoints(levelNumber, gridSize, stateCount);
        const currentStars = getCurrentStars();
        const currentPoints = maxPoints * currentStars;
        const pointsDisplay = document.getElementById('points-display');

        if (previousBestStars > 0) {
            const bestPoints = maxPoints * previousBestStars;
            pointsDisplay.innerHTML = `${currentPoints}<span class="points-best">/${maxPoints * 3}</span>`;
        } else {
            pointsDisplay.innerHTML = `${currentPoints}<span class="points-best">/${maxPoints * 3}</span>`;
        }

        // Update current stars display
        const starsContainer = document.getElementById('current-stars');
        const starElements = starsContainer.querySelectorAll('.game-star');
        starElements.forEach((star, index) => {
            star.classList.remove('filled');
            if (index < currentStars) {
                star.classList.add('filled');
            }
        });

        // Update hint button text
        const hintBtn = document.getElementById('btn-hint');
        const hintsRemaining = maxHints - hintsUsed;
        hintBtn.textContent = I18n.t('hint_remaining', { remaining: hintsRemaining, max: maxHints });
        hintBtn.disabled = hintsRemaining <= 0;
        if (hintsRemaining <= 0) {
            hintBtn.classList.add('disabled');
        } else {
            hintBtn.classList.remove('disabled');
        }
    }

    /**
     * Render the game grid
     */
    function render() {
        if (!ctx) return;

        const now = performance.now();
        const cellSize = canvas.width / gridSize;
        const padding = 4;
        const cellDrawSize = cellSize - padding * 2;
        const borderRadius = 6;

        // Clear canvas
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Remove finished animations
        animatingCells = animatingCells.filter(anim => now - anim.startTime < 200);

        // Draw cells
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const x = col * cellSize + padding;
                const y = row * cellSize + padding;
                const state = grid[row][col];

                // Check for animation
                const anim = animatingCells.find(a => a.row === row && a.col === col);
                let animProgress = 1;
                if (anim) {
                    animProgress = Math.min(1, (now - anim.startTime) / 200);
                }

                // Determine color based on state
                let color, glowColor, glowSize;
                if (state === 0) {
                    color = colors.cellOff;
                    glowColor = null;
                    glowSize = 0;
                } else if (state === 1 && stateCount === 3) {
                    color = colors.cellDim;
                    glowColor = colors.glowDim;
                    glowSize = 10;
                } else {
                    color = colors.cellOn;
                    glowColor = colors.glowOn;
                    glowSize = 20;
                }

                // Apply animation scale
                const scale = anim ? 0.9 + 0.1 * animProgress : 1;
                const scaledSize = cellDrawSize * scale;
                const offset = (cellDrawSize - scaledSize) / 2;

                // Draw glow
                if (glowColor && glowSize > 0) {
                    ctx.shadowColor = glowColor;
                    ctx.shadowBlur = glowSize * animProgress;
                }

                // Draw cell with rounded corners
                ctx.fillStyle = color;
                ctx.beginPath();
                roundRect(ctx, x + offset, y + offset, scaledSize, scaledSize, borderRadius);
                ctx.fill();

                // Reset shadow
                ctx.shadowBlur = 0;

                // Draw border for off cells
                if (state === 0) {
                    ctx.strokeStyle = colors.border;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    roundRect(ctx, x + offset, y + offset, scaledSize, scaledSize, borderRadius);
                    ctx.stroke();
                }
            }
        }

        // Continue animation loop if needed
        if (animatingCells.length > 0) {
            requestAnimationFrame(() => render());
        }
    }

    /**
     * Draw rounded rectangle path
     */
    function roundRect(ctx, x, y, width, height, radius) {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Get current level info
     */
    function getCurrentLevel() {
        return {
            id: levelId,
            gridSize,
            stateCount,
            levelNumber
        };
    }

    /**
     * Stop the current game
     */
    function stop() {
        isPlaying = false;
        Mesa.game.gameplayStop();
    }

    /**
     * Show hint - highlights the next optimal move
     */
    function showHint() {
        if (!isPlaying) return;
        if (hintsUsed >= maxHints) {
            GameAudio.playError();
            return;
        }

        const solution = Solver.solve(grid, stateCount);
        if (!solution) return;

        // Find first cell with non-zero clicks needed
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (solution[row][col] > 0) {
                    hintsUsed++;
                    updateUI();
                    highlightHint(row, col);
                    return;
                }
            }
        }
    }

    /**
     * Highlight a cell as a hint
     */
    function highlightHint(row, col) {
        const cellSize = canvas.width / gridSize;
        const x = col * cellSize;
        const y = row * cellSize;
        const padding = 4;

        // Draw hint overlay
        ctx.save();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
        ctx.shadowBlur = 15;

        ctx.beginPath();
        roundRect(ctx, x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, 6);
        ctx.stroke();
        ctx.restore();

        // Clear hint after delay
        setTimeout(() => {
            render();
        }, 1500);
    }

    return {
        init,
        startLevel,
        reset,
        stop,
        showHint,
        getCurrentLevel,
        resizeCanvas
    };
})();

window.Game = Game;
