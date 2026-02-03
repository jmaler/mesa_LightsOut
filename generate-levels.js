/**
 * Level Generator for Lights Out
 * Run with: node generate-levels.js
 * Generates all 180 levels with verified optimal move counts
 */

// Solver implementation with minimum weight solution finding
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

/**
 * Gaussian elimination that also returns null space basis and pivot columns
 */
function gaussianEliminationWithNullSpace(augmentedMatrix, modulus) {
    const n = augmentedMatrix.length;
    const m = augmentedMatrix[0].length - 1;
    const matrix = augmentedMatrix.map(row => [...row]);
    const pivotCols = [];
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
        pivotCols.push(col);
        pivotRow++;
    }

    // Check for inconsistency
    for (let row = pivotRow; row < n; row++) {
        if (matrix[row][m] !== 0) return { solution: null, nullSpace: [] };
    }

    // Find free variables (columns that are not pivot columns)
    const freeCols = [];
    for (let col = 0; col < m; col++) {
        if (!pivotCols.includes(col)) {
            freeCols.push(col);
        }
    }

    // Build particular solution (set free variables to 0)
    const solution = new Array(m).fill(0);
    for (let i = 0; i < pivotCols.length; i++) {
        solution[pivotCols[i]] = matrix[i][m];
    }

    // Build null space basis vectors
    const nullSpace = [];
    for (const freeCol of freeCols) {
        const basisVector = new Array(m).fill(0);
        basisVector[freeCol] = 1;
        // For each pivot row, compute the value needed
        for (let i = 0; i < pivotCols.length; i++) {
            basisVector[pivotCols[i]] = (modulus - matrix[i][freeCol]) % modulus;
        }
        nullSpace.push(basisVector);
    }

    return { solution, nullSpace };
}

/**
 * Find minimum weight solution by trying all null space combinations
 */
function findMinWeightSolution(baseSolution, nullSpace, modulus) {
    if (nullSpace.length === 0) {
        return baseSolution;
    }

    const n = baseSolution.length;
    let minWeight = Infinity;
    let minSolution = baseSolution;

    // For 2-state: try all 2^k combinations
    // For 3-state: try all 3^k combinations
    const numCombinations = Math.pow(modulus, nullSpace.length);

    for (let combo = 0; combo < numCombinations; combo++) {
        const candidate = [...baseSolution];
        let temp = combo;

        for (let i = 0; i < nullSpace.length; i++) {
            const coeff = temp % modulus;
            temp = Math.floor(temp / modulus);
            for (let j = 0; j < n; j++) {
                candidate[j] = (candidate[j] + coeff * nullSpace[i][j]) % modulus;
            }
        }

        // Calculate weight (sum of all values)
        let weight = 0;
        for (let j = 0; j < n; j++) {
            weight += candidate[j];
        }

        if (weight < minWeight) {
            minWeight = weight;
            minSolution = candidate;
        }
    }

    return minSolution;
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

    const { solution, nullSpace } = gaussianEliminationWithNullSpace(augmented, stateCount);
    if (solution === null) return null;

    // Find minimum weight solution
    const minSolution = findMinWeightSolution(solution, nullSpace, stateCount);

    const solutionGrid = [];
    for (let row = 0; row < size; row++) {
        solutionGrid.push([]);
        for (let col = 0; col < size; col++) {
            solutionGrid[row].push(minSolution[row * size + col]);
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
    4: { easy: [1, 3], medium: [3, 5], hard: [5, 7] },
    5: { easy: [3, 6], medium: [5, 8], hard: [8, 12] },
    6: { easy: [3, 8], medium: [7, 12], hard: [12, 18] }
};

// Difficulty ranges by grid size (3-state)
const difficultyRanges3State = {
    4: { easy: [3, 7], medium: [7, 10], hard: [10, 14] },
    5: { easy: [4, 8], medium: [8, 12], hard: [12, 20] },
    6: { easy: [5, 10], medium: [10, 18], hard: [18, 30] }
};

/**
 * Get target optimal for a specific level with progression and random variation
 * Returns a target value (not a range) that progresses through the difficulty range
 */
function getOptimalTarget(size, levelNum, stateCount) {
    const ranges = stateCount === 3 ? difficultyRanges3State[size] : difficultyRanges2State[size];

    let rangeMin, rangeMax, difficulty, progress;

    if (levelNum <= 10) {
        [rangeMin, rangeMax] = ranges.easy;
        difficulty = 'easy';
        progress = (levelNum - 1) / 9; // 0 to 1
    } else if (levelNum <= 20) {
        [rangeMin, rangeMax] = ranges.medium;
        difficulty = 'medium';
        progress = (levelNum - 11) / 9; // 0 to 1
    } else {
        [rangeMin, rangeMax] = ranges.hard;
        difficulty = 'hard';
        progress = (levelNum - 21) / 9; // 0 to 1
    }

    // Linear interpolation through the range
    const baseTarget = rangeMin + progress * (rangeMax - rangeMin);

    // Random variation: larger for higher numbers (0-1 for small, 0-3 for large)
    const maxVariation = Math.max(1, Math.floor(baseTarget / 5));
    const variation = Math.floor(Math.random() * (maxVariation * 2 + 1)) - maxVariation;

    // Calculate target and clamp to range
    let target = Math.round(baseTarget + variation);
    target = Math.max(rangeMin, Math.min(rangeMax, target));

    return { target, min: rangeMin, max: rangeMax, difficulty }
}

// Generate all levels
function generateAllLevels(existingLevels = null) {
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
            // Keep first 12 levels of 4x4 2-state unchanged (good for onboarding)
            // But recalculate optimal with fixed solver
            if (size === 4 && states === 2 && levelNum <= 12 && existingLevels) {
                const existing = existingLevels.find(l =>
                    l.gridSize === 4 && l.stateCount === 2 && l.levelNumber === levelNum
                );
                if (existing) {
                    // Recalculate correct optimal with fixed solver
                    const correctOptimal = getOptimalMoves(existing.initialState, states);
                    const level = {
                        ...existing,
                        optimalMoves: correctOptimal
                    };
                    allLevels.push(level);
                    console.log(`  Level ${levelNum}: optimal=${correctOptimal} (kept grid, fixed optimal from ${existing.optimalMoves})`);
                    continue;
                }
            }

            const { target, min, max, difficulty } = getOptimalTarget(size, levelNum, states);
            let result = null;

            // Try to generate with exact target first
            result = generateWithOptimal(size, states, target, 1500);

            // If exact target fails, try nearby values within range
            if (!result) {
                result = generateWithRange(size, states,
                    Math.max(min, target - 1),
                    Math.min(max, target + 1),
                    1500);
            }

            // Fallback: use full range
            if (!result) {
                result = generateWithRange(size, states, min, max, 2000);
            }

            // Emergency fallback: widen range
            if (!result) {
                console.warn(`  Warning: Widening range for level ${levelNum}`);
                result = generateWithRange(size, states, Math.max(1, min - 2), max + 3, 3000);
            }

            if (!result) {
                console.error(`  ERROR: Failed to generate level ${levelNum}`);
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
            console.log(`  Level ${levelNum}: optimal=${result.optimalMoves} (target: ${target}, range: ${min}-${max})`);
        }
    }

    return allLevels;
}

// Main
console.log('Generating Lights Out levels...\n');

// Load existing levels to preserve first 12 4x4 2-state levels
let existingLevels = null;
try {
    const fs = require('fs');
    const existingContent = fs.readFileSync('js/levels.js', 'utf8');
    const match = existingContent.match(/const levelData = (\[[\s\S]*?\]);/);
    if (match) {
        existingLevels = JSON.parse(match[1]);
        console.log('Loaded existing levels (will preserve first 12 4x4 2-state levels)');
    }
} catch (e) {
    console.log('No existing levels found, generating all fresh');
}

const levels = generateAllLevels(existingLevels);

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
