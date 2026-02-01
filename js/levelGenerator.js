/**
 * Level Generator - Generates 180 pre-computed levels
 * Run this file in Node.js or browser console to generate levels.js
 *
 * Usage: node levelGenerator.js > levels.js
 */

(function() {
    // Solver functions (duplicated for standalone use)
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

    function generatePuzzle(size, stateCount, targetClicks) {
        const grid = [];
        for (let i = 0; i < size; i++) {
            grid.push(new Array(size).fill(0));
        }
        for (let i = 0; i < targetClicks; i++) {
            const row = Math.floor(Math.random() * size);
            const col = Math.floor(Math.random() * size);
            applyClick(grid, row, col, stateCount);
        }
        return grid;
    }

    function hasNonZero(grid) {
        for (const row of grid) {
            for (const cell of row) {
                if (cell !== 0) return true;
            }
        }
        return false;
    }

    // Difficulty ranges
    function getDifficultyRange(levelNum, gridSize) {
        // Base ranges for 5x5
        let min, max;
        if (levelNum <= 10) {
            min = 1; max = 10;
        } else if (levelNum <= 20) {
            min = 11; max = 20;
        } else {
            min = 21; max = 35;
        }

        // Adjust for larger grids
        if (gridSize === 6) {
            min += 5;
            max += 10;
        } else if (gridSize === 7) {
            min += 10;
            max += 15;
        }

        return { min, max };
    }

    function generateLevel(gridSize, stateCount, levelNum, maxAttempts = 1000) {
        const { min, max } = getDifficultyRange(levelNum, gridSize);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Estimate clicks
            const targetClicks = Math.floor(min + Math.random() * (max - min + 1));
            const grid = generatePuzzle(gridSize, stateCount, targetClicks);

            if (!hasNonZero(grid)) continue;

            const optimal = getOptimalMoves(grid, stateCount);
            if (optimal >= min && optimal <= max) {
                return { grid, optimalMoves: optimal };
            }
        }

        // Fallback: generate any solvable puzzle
        for (let attempt = 0; attempt < 100; attempt++) {
            const grid = generatePuzzle(gridSize, stateCount, 10);
            if (!hasNonZero(grid)) continue;
            const optimal = getOptimalMoves(grid, stateCount);
            if (optimal > 0) {
                return { grid, optimalMoves: optimal };
            }
        }

        return null;
    }

    // Generate all levels
    function generateAllLevels() {
        const levels = [];
        const configs = [
            { gridSize: 5, stateCount: 2 },
            { gridSize: 5, stateCount: 3 },
            { gridSize: 6, stateCount: 2 },
            { gridSize: 6, stateCount: 3 },
            { gridSize: 7, stateCount: 2 },
            { gridSize: 7, stateCount: 3 },
        ];

        for (const config of configs) {
            for (let levelNum = 1; levelNum <= 30; levelNum++) {
                const result = generateLevel(config.gridSize, config.stateCount, levelNum);
                if (!result) {
                    console.error(`Failed to generate: ${config.gridSize}x${config.gridSize} ${config.stateCount}-state level ${levelNum}`);
                    continue;
                }

                let difficulty = 'easy';
                if (levelNum > 10 && levelNum <= 20) difficulty = 'medium';
                else if (levelNum > 20) difficulty = 'hard';

                const levelId = `${config.gridSize}x${config.gridSize}_${config.stateCount}state_${String(levelNum).padStart(2, '0')}`;

                levels.push({
                    id: levelId,
                    gridSize: config.gridSize,
                    stateCount: config.stateCount,
                    levelNumber: levelNum,
                    difficulty: difficulty,
                    optimalMoves: result.optimalMoves,
                    initialState: result.grid
                });
            }
        }

        return levels;
    }

    // Output as JavaScript module
    function outputLevelsJS(levels) {
        let output = `/**
 * Pre-generated levels for Lights Out
 * 180 levels: 6 variants x 30 levels each
 */

const Levels = (function() {
    const levelData = ${JSON.stringify(levels, null, 2)};

    const levelMap = new Map();
    for (const level of levelData) {
        levelMap.set(level.id, level);
    }

    function getLevel(id) {
        return levelMap.get(id) || null;
    }

    function getAllLevels() {
        return levelData;
    }

    function getLevelsForConfig(gridSize, stateCount) {
        return levelData.filter(l => l.gridSize === gridSize && l.stateCount === stateCount);
    }

    return {
        getLevel,
        getAllLevels,
        getLevelsForConfig
    };
})();

window.Levels = Levels;
`;
        return output;
    }

    // Check if running in Node.js
    if (typeof module !== 'undefined' && module.exports) {
        const levels = generateAllLevels();
        console.log(outputLevelsJS(levels));
    } else {
        // Browser environment - expose generator
        window.LevelGenerator = {
            generateAllLevels,
            outputLevelsJS,
            generateLevel
        };
    }
})();
