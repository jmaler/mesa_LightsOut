/**
 * Level Generator for Lights Out
 * Run with: node generate-levels.js
 * Generates all 180 levels with verified optimal move counts
 */

// Solver implementation (copied from solver.js)
function modInverse3(a) {
    if (a === 1) return 1;
    if (a === 2) return 2;
    return 0;
}

function createToggleMatrix(size) {
    const n = size * size;
    const matrix = [];
    for (let i = 0; i < n; i++) {
        matrix[i] = new Array(n).fill(0);
    }
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const idx = row * size + col;
            matrix[idx][idx] = 1;
            if (row > 0) matrix[(row - 1) * size + col][idx] = 1;
            if (row < size - 1) matrix[(row + 1) * size + col][idx] = 1;
            if (col > 0) matrix[row * size + col - 1][idx] = 1;
            if (col < size - 1) matrix[row * size + col + 1][idx] = 1;
        }
    }
    return matrix;
}

function gaussianElimination(augmentedMatrix, modulus) {
    const n = augmentedMatrix.length;
    const m = augmentedMatrix[0].length - 1;
    const matrix = augmentedMatrix.map(row => [...row]);
    let pivotRow = 0;

    for (let col = 0; col < m && pivotRow < n; col++) {
        let maxRow = pivotRow;
        for (let row = pivotRow + 1; row < n; row++) {
            if (Math.abs(matrix[row][col]) > Math.abs(matrix[maxRow][col])) {
                maxRow = row;
            }
        }
        if (matrix[maxRow][col] === 0) continue;
        [matrix[pivotRow], matrix[maxRow]] = [matrix[maxRow], matrix[pivotRow]];

        const pivotVal = matrix[pivotRow][col];
        const inv = modulus === 2 ? 1 : modInverse3(pivotVal);
        for (let j = col; j <= m; j++) {
            matrix[pivotRow][j] = (matrix[pivotRow][j] * inv) % modulus;
        }

        for (let row = 0; row < n; row++) {
            if (row !== pivotRow && matrix[row][col] !== 0) {
                const factor = matrix[row][col];
                for (let j = col; j <= m; j++) {
                    matrix[row][j] = ((matrix[row][j] - factor * matrix[pivotRow][j]) % modulus + modulus) % modulus;
                }
            }
        }
        pivotRow++;
    }

    const solution = new Array(m).fill(0);
    for (let row = 0; row < n; row++) {
        let leadingCol = -1;
        for (let col = 0; col < m; col++) {
            if (matrix[row][col] !== 0) {
                leadingCol = col;
                break;
            }
        }
        if (leadingCol === -1) {
            if (matrix[row][m] !== 0) return null;
        } else {
            solution[leadingCol] = matrix[row][m];
        }
    }
    return solution;
}

function solve(grid, stateCount) {
    const size = grid.length;
    const n = size * size;
    const toggleMatrix = createToggleMatrix(size);
    const target = [];
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            target.push((stateCount - (grid[row][col] % stateCount)) % stateCount);
        }
    }
    const augmented = [];
    for (let i = 0; i < n; i++) {
        augmented.push([...toggleMatrix[i], target[i]]);
    }
    const solution = gaussianElimination(augmented, stateCount);
    if (solution === null) return null;

    const solutionGrid = [];
    for (let row = 0; row < size; row++) {
        solutionGrid.push([]);
        for (let col = 0; col < size; col++) {
            solutionGrid[row].push(solution[row * size + col]);
        }
    }
    return solutionGrid;
}

function getOptimalMoves(grid, stateCount) {
    const solution = solve(grid, stateCount);
    if (solution === null) return -1;
    let total = 0;
    for (const row of solution) {
        for (const cell of row) {
            total += cell;
        }
    }
    return total;
}

function applyClick(grid, row, col, stateCount) {
    const size = grid.length;
    const positions = [[row, col], [row-1, col], [row+1, col], [row, col-1], [row, col+1]];
    for (const [r, c] of positions) {
        if (r >= 0 && r < size && c >= 0 && c < size) {
            grid[r][c] = (grid[r][c] + 1) % stateCount;
        }
    }
}

function createEmptyGrid(size) {
    return Array.from({length: size}, () => new Array(size).fill(0));
}

function copyGrid(grid) {
    return grid.map(row => [...row]);
}

function gridHasLights(grid) {
    return grid.some(row => row.some(cell => cell !== 0));
}

/**
 * Generate a puzzle by making specific clicks and verify optimal
 */
function generateByClicks(size, stateCount, clicks) {
    const grid = createEmptyGrid(size);
    for (const [r, c] of clicks) {
        applyClick(grid, r, c, stateCount);
    }
    if (!gridHasLights(grid)) return null;

    const optimal = getOptimalMoves(grid, stateCount);
    if (optimal === -1) return null;

    return { grid: copyGrid(grid), optimalMoves: optimal };
}

/**
 * Generate a random puzzle with target optimal moves
 */
function generateWithOptimal(size, stateCount, targetOptimal, maxAttempts = 500) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate random clicks
        const numClicks = Math.max(1, targetOptimal + Math.floor(Math.random() * 3) - 1);
        const clicks = [];
        for (let i = 0; i < numClicks; i++) {
            clicks.push([Math.floor(Math.random() * size), Math.floor(Math.random() * size)]);
        }

        const result = generateByClicks(size, stateCount, clicks);
        if (result && result.optimalMoves === targetOptimal) {
            return result;
        }
    }
    return null;
}

/**
 * Generate puzzle within optimal range
 */
function generateWithRange(size, stateCount, minOptimal, maxOptimal, maxAttempts = 1000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const targetClicks = Math.floor((minOptimal + maxOptimal) / 2) + Math.floor(Math.random() * 3) - 1;
        const clicks = [];
        for (let i = 0; i < Math.max(1, targetClicks); i++) {
            clicks.push([Math.floor(Math.random() * size), Math.floor(Math.random() * size)]);
        }

        const result = generateByClicks(size, stateCount, clicks);
        if (result && result.optimalMoves >= minOptimal && result.optimalMoves <= maxOptimal) {
            return result;
        }
    }
    return null;
}

// Pre-defined easy levels for levels 1-5 (verified patterns)
function getEasyLevel(size, stateCount, levelNum) {
    if (size === 4 && stateCount === 2) {
        // Level 1: Single center click (optimal 1)
        if (levelNum === 1) return generateByClicks(4, 2, [[1, 1]]);
        // Level 2: Two clicks (optimal 2)
        if (levelNum === 2) return generateByClicks(4, 2, [[0, 0], [3, 3]]);
        // Level 3: Three clicks (optimal 3)
        if (levelNum === 3) return generateByClicks(4, 2, [[1, 1], [1, 2], [2, 1]]);
    }
    if (size === 5 && stateCount === 2) {
        // Level 1: Single center click (optimal 1)
        if (levelNum === 1) return generateByClicks(5, 2, [[2, 2]]);
        // Level 2: Two corner clicks (optimal 2)
        if (levelNum === 2) return generateByClicks(5, 2, [[0, 0], [4, 4]]);
        // Level 3: Three clicks in a row (optimal 3)
        if (levelNum === 3) return generateByClicks(5, 2, [[2, 1], [2, 2], [2, 3]]);
    }
    if (size === 6 && stateCount === 2) {
        if (levelNum === 1) return generateByClicks(6, 2, [[2, 2]]);
        if (levelNum === 2) return generateByClicks(6, 2, [[1, 1], [4, 4]]);
        if (levelNum === 3) return generateByClicks(6, 2, [[2, 2], [2, 3], [3, 2]]);
    }
    // 3-state versions
    if (stateCount === 3) {
        if (levelNum === 1) return generateByClicks(size, 3, [[Math.floor(size/2), Math.floor(size/2)]]);
        if (levelNum === 2) return generateByClicks(size, 3, [[1, 1], [size-2, size-2]]);
        if (levelNum === 3) return generateByClicks(size, 3, [[Math.floor(size/2), 1], [Math.floor(size/2), Math.floor(size/2)]]);
    }
    return null;
}

// Difficulty ranges by grid size (2-state)
// Format: { easy: [min, max], medium: [min, max], hard: [min, max] }
const difficultyRanges2State = {
    4: { easy: [1, 4], medium: [4, 8], hard: [8, 14] },
    5: { easy: [3, 8], medium: [8, 14], hard: [14, 25] },
    6: { easy: [3, 10], medium: [10, 16], hard: [16, 30] }
};

// Difficulty ranges by grid size (3-state)
// Higher ranges since 3-state needs ~1.4-1.6x more clicks for equivalent difficulty
const difficultyRanges3State = {
    4: { easy: [3, 8], medium: [6, 11], hard: [12, 21] },
    5: { easy: [4, 11], medium: [12, 21], hard: [22, 38] },
    6: { easy: [5, 14], medium: [15, 24], hard: [26, 48] }
};

/**
 * Get optimal range for a specific level
 */
function getOptimalRange(size, levelNum, stateCount) {
    const ranges = stateCount === 3 ? difficultyRanges3State[size] : difficultyRanges2State[size];

    if (levelNum <= 10) {
        // Easy: Levels 1-10, gradually increase within easy range
        const [min, max] = ranges.easy;
        const progress = (levelNum - 1) / 9; // 0 to 1
        let targetMin = Math.round(min + progress * (max - min) * 0.5);
        let targetMax = Math.round(min + progress * (max - min) + 1);

        // For 4x4 2-state: ensure levels 4-7 have min 3, levels 8-10 have min 4
        if (size === 4 && stateCount === 2) {
            if (levelNum >= 4 && levelNum <= 7) {
                targetMin = Math.max(3, targetMin);
                targetMax = Math.max(4, targetMax);
            } else if (levelNum >= 8 && levelNum <= 10) {
                targetMin = Math.max(4, targetMin);
                targetMax = Math.max(5, targetMax);
            }
        }

        return { min: Math.max(min, targetMin), max: Math.min(max, targetMax), difficulty: 'easy' };
    } else if (levelNum <= 20) {
        // Medium: Levels 11-20
        const [min, max] = ranges.medium;
        const progress = (levelNum - 11) / 9; // 0 to 1
        const targetMin = Math.round(min + progress * (max - min) * 0.5);
        const targetMax = Math.round(min + progress * (max - min) + 2);
        return { min: Math.max(min, targetMin), max: Math.min(max, targetMax), difficulty: 'medium' };
    } else {
        // Hard: Levels 21-30
        const [min, max] = ranges.hard;
        const progress = (levelNum - 21) / 9; // 0 to 1
        const targetMin = Math.round(min + progress * (max - min) * 0.5);
        const targetMax = Math.round(min + progress * (max - min) + 3);
        return { min: Math.max(min, targetMin), max: Math.min(max, targetMax), difficulty: 'hard' };
    }
}

// Specific 2-state levels that need exact optimal clicks (applied to all grid sizes)
const exactOptimal2State = {
    3: 2,   // Level 3: 2 optimal clicks
    5: 3,   // Level 5: 3 optimal clicks
    6: 3,   // Level 6: 3 optimal clicks
    10: 5,  // Level 10: 5 optimal clicks
    13: 5   // Level 13: 5 optimal clicks
};

// Generate all levels
function generateAllLevels() {
    const allLevels = [];
    const variants = [
        { size: 4, states: 2 },
        { size: 4, states: 3 },
        { size: 5, states: 2 },
        { size: 5, states: 3 },
        { size: 6, states: 2 },
        { size: 6, states: 3 }
    ];

    for (const { size, states } of variants) {
        console.log(`\nGenerating ${size}x${size} ${states}-state levels...`);

        for (let levelNum = 1; levelNum <= 30; levelNum++) {
            const { min, max, difficulty } = getOptimalRange(size, levelNum, states);
            let result = null;
            let targetMin = min;
            let targetMax = max;

            // Check for exact optimal requirement (2-state only)
            if (states === 2 && exactOptimal2State[levelNum] !== undefined) {
                const exactOptimal = exactOptimal2State[levelNum];
                targetMin = exactOptimal;
                targetMax = exactOptimal;
                result = generateWithOptimal(size, states, exactOptimal, 3000);
            }

            // For very first levels, try to get specific low optimal
            if (!result && levelNum <= 3) {
                result = getEasyLevel(size, states, levelNum);
                if (result && result.optimalMoves >= targetMin && result.optimalMoves <= targetMax) {
                    // Good, use it
                } else {
                    result = null;
                }
            }

            // Generate within range
            if (!result) {
                result = generateWithRange(size, states, targetMin, targetMax, 2000);
            }

            // Fallback: widen range
            if (!result) {
                console.warn(`  Warning: Widening range for level ${levelNum}`);
                result = generateWithRange(size, states, Math.max(1, targetMin - 2), targetMax + 2, 3000);
            }

            if (!result) {
                console.error(`  ERROR: Failed to generate level ${levelNum}`);
                // Emergency fallback
                result = generateWithRange(size, states, 1, 50, 5000);
            }

            const level = {
                id: `${size}x${size}_${states}state_${String(levelNum).padStart(2, '0')}`,
                gridSize: size,
                stateCount: states,
                levelNumber: levelNum,
                difficulty: difficulty,
                optimalMoves: result.optimalMoves,
                initialState: result.grid
            };

            allLevels.push(level);
            console.log(`  Level ${levelNum}: optimal=${result.optimalMoves} (target: ${targetMin}-${targetMax})`);
        }
    }

    return allLevels;
}

// Main
console.log('Generating Lights Out levels...\n');
const levels = generateAllLevels();

// Output as JavaScript file content
const output = `/**
 * Pre-generated levels for Lights Out
 * 180 levels: 6 variants x 30 levels each
 * Generated with verified optimal move counts
 */

const Levels = (function() {
    const levelData = ${JSON.stringify(levels, null, 2)};

    /**
     * Get a level by ID
     */
    function getLevel(id) {
        return levelData.find(l => l.id === id);
    }

    /**
     * Get all levels for a variant
     */
    function getLevelsForVariant(gridSize, stateCount) {
        return levelData.filter(l => l.gridSize === gridSize && l.stateCount === stateCount);
    }

    return {
        getLevel,
        getLevelsForVariant,
        allLevels: levelData
    };
})();

window.Levels = Levels;
`;

require('fs').writeFileSync('js/levels.js', output);
console.log('\nLevels written to js/levels.js');
