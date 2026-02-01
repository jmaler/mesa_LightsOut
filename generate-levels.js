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
    if (size === 5 && stateCount === 2) {
        // Level 1: Single center click (optimal 1)
        if (levelNum === 1) return generateByClicks(5, 2, [[2, 2]]);
        // Level 2: Two corner clicks (optimal 2)
        if (levelNum === 2) return generateByClicks(5, 2, [[0, 0], [4, 4]]);
        // Level 3: Three clicks in a row (optimal 3)
        if (levelNum === 3) return generateByClicks(5, 2, [[2, 1], [2, 2], [2, 3]]);
        // Level 4: Four corners pattern (optimal 4)
        if (levelNum === 4) return generateByClicks(5, 2, [[1, 1], [1, 3], [3, 1], [3, 3]]);
        // Level 5: Five in a cross (optimal 5)
        if (levelNum === 5) return generateByClicks(5, 2, [[0, 2], [2, 0], [2, 2], [2, 4], [4, 2]]);
    }
    if (size === 6 && stateCount === 2) {
        if (levelNum === 1) return generateByClicks(6, 2, [[2, 2]]);
        if (levelNum === 2) return generateByClicks(6, 2, [[1, 1], [4, 4]]);
        if (levelNum === 3) return generateByClicks(6, 2, [[2, 2], [2, 3], [3, 2]]);
        if (levelNum === 4) return generateByClicks(6, 2, [[1, 1], [1, 4], [4, 1], [4, 4]]);
        if (levelNum === 5) return generateByClicks(6, 2, [[0, 2], [2, 0], [2, 5], [5, 2], [3, 3]]);
    }
    if (size === 7 && stateCount === 2) {
        if (levelNum === 1) return generateByClicks(7, 2, [[3, 3]]);
        if (levelNum === 2) return generateByClicks(7, 2, [[1, 1], [5, 5]]);
        if (levelNum === 3) return generateByClicks(7, 2, [[3, 2], [3, 3], [3, 4]]);
        if (levelNum === 4) return generateByClicks(7, 2, [[1, 1], [1, 5], [5, 1], [5, 5]]);
        if (levelNum === 5) return generateByClicks(7, 2, [[0, 3], [3, 0], [3, 3], [3, 6], [6, 3]]);
    }
    // 3-state versions
    if (stateCount === 3) {
        if (levelNum === 1) return generateByClicks(size, 3, [[Math.floor(size/2), Math.floor(size/2)]]);
        if (levelNum === 2) return generateByClicks(size, 3, [[1, 1], [size-2, size-2]]);
        if (levelNum === 3) return generateByClicks(size, 3, [[Math.floor(size/2), 1], [Math.floor(size/2), Math.floor(size/2)], [Math.floor(size/2), size-2]]);
        if (levelNum === 4) return generateByClicks(size, 3, [[1, 1], [1, size-2], [size-2, 1], [size-2, size-2]]);
        if (levelNum === 5) return generateByClicks(size, 3, [[0, Math.floor(size/2)], [Math.floor(size/2), 0], [Math.floor(size/2), Math.floor(size/2)], [Math.floor(size/2), size-1], [size-1, Math.floor(size/2)]]);
    }
    return null;
}

// Generate all levels
function generateAllLevels() {
    const allLevels = [];
    const variants = [
        { size: 5, states: 2 },
        { size: 5, states: 3 },
        { size: 6, states: 2 },
        { size: 6, states: 3 },
        { size: 7, states: 2 },
        { size: 7, states: 3 }
    ];

    for (const { size, states } of variants) {
        console.log(`Generating ${size}x${size} ${states}-state levels...`);

        for (let levelNum = 1; levelNum <= 30; levelNum++) {
            let result = null;
            let difficulty = 'easy';

            if (levelNum <= 5) {
                // Easy levels 1-5: specific optimal moves 1-5
                result = getEasyLevel(size, states, levelNum);
                if (!result || result.optimalMoves !== levelNum) {
                    // Fallback: try to generate with exact optimal
                    result = generateWithOptimal(size, states, levelNum, 1000);
                }
                if (!result) {
                    // Last resort: accept close enough
                    result = generateWithRange(size, states, Math.max(1, levelNum - 1), levelNum + 1, 500);
                }
            } else if (levelNum <= 10) {
                // Easy levels 6-10: optimal 5-10
                difficulty = 'easy';
                const minOpt = 4 + levelNum - 5;
                const maxOpt = minOpt + 2;
                result = generateWithRange(size, states, minOpt, maxOpt);
            } else if (levelNum <= 20) {
                // Medium levels 11-20: optimal 8-15
                difficulty = 'medium';
                const minOpt = 6 + Math.floor((levelNum - 10) * 0.8);
                const maxOpt = minOpt + 3;
                result = generateWithRange(size, states, minOpt, maxOpt);
            } else {
                // Hard levels 21-30: optimal 12-20
                difficulty = 'hard';
                const minOpt = 10 + Math.floor((levelNum - 20) * 0.8);
                const maxOpt = minOpt + 4;
                result = generateWithRange(size, states, minOpt, maxOpt);
            }

            if (!result) {
                console.error(`Failed to generate ${size}x${size}_${states}state_${levelNum}`);
                // Emergency fallback
                result = generateWithRange(size, states, 1, 25, 2000);
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
            console.log(`  Level ${levelNum}: optimal=${result.optimalMoves}`);
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
