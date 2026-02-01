/**
 * Lights Out Solver
 * Uses Gaussian elimination over finite fields (GF(2) for 2-state, GF(3) for 3-state)
 * to determine solvability and calculate optimal solutions
 */

const Solver = (function() {
    /**
     * Modular inverse for GF(3)
     * In GF(3): 1^-1 = 1, 2^-1 = 2 (since 2*2 = 4 = 1 mod 3)
     */
    function modInverse3(a) {
        if (a === 1) return 1;
        if (a === 2) return 2;
        return 0; // 0 has no inverse
    }

    /**
     * Create the toggle matrix for a given grid size
     * Each row represents a cell, each column represents a click position
     * Matrix[i][j] = 1 if clicking cell j affects cell i
     */
    function createToggleMatrix(size) {
        const n = size * size;
        const matrix = [];

        for (let i = 0; i < n; i++) {
            matrix[i] = new Array(n).fill(0);
        }

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const idx = row * size + col;
                // Cell affects itself
                matrix[idx][idx] = 1;
                // Affects neighbors
                if (row > 0) matrix[(row - 1) * size + col][idx] = 1; // up
                if (row < size - 1) matrix[(row + 1) * size + col][idx] = 1; // down
                if (col > 0) matrix[row * size + col - 1][idx] = 1; // left
                if (col < size - 1) matrix[row * size + col + 1][idx] = 1; // right
            }
        }

        return matrix;
    }

    /**
     * Gaussian elimination over GF(p)
     * Returns the solution vector or null if no solution exists
     *
     * @param {number[][]} augmentedMatrix - The augmented matrix [A|b]
     * @param {number} modulus - 2 for 2-state, 3 for 3-state
     * @returns {number[]|null} - Solution vector or null
     */
    function gaussianElimination(augmentedMatrix, modulus) {
        const n = augmentedMatrix.length;
        const m = augmentedMatrix[0].length - 1; // Columns excluding augmented part
        const matrix = augmentedMatrix.map(row => [...row]); // Deep copy

        let pivotRow = 0;

        for (let col = 0; col < m && pivotRow < n; col++) {
            // Find pivot
            let maxRow = pivotRow;
            for (let row = pivotRow + 1; row < n; row++) {
                if (Math.abs(matrix[row][col]) > Math.abs(matrix[maxRow][col])) {
                    maxRow = row;
                }
            }

            if (matrix[maxRow][col] === 0) {
                continue; // No pivot in this column
            }

            // Swap rows
            [matrix[pivotRow], matrix[maxRow]] = [matrix[maxRow], matrix[pivotRow]];

            // Scale pivot row
            const pivotVal = matrix[pivotRow][col];
            let inv;
            if (modulus === 2) {
                inv = 1; // In GF(2), 1 is its own inverse
            } else {
                inv = modInverse3(pivotVal);
            }

            for (let j = col; j <= m; j++) {
                matrix[pivotRow][j] = (matrix[pivotRow][j] * inv) % modulus;
            }

            // Eliminate column
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

        // Check for inconsistency and extract solution
        const solution = new Array(m).fill(0);

        // Back-substitution (matrix is now in reduced row echelon form)
        for (let row = 0; row < n; row++) {
            // Find leading 1
            let leadingCol = -1;
            for (let col = 0; col < m; col++) {
                if (matrix[row][col] !== 0) {
                    leadingCol = col;
                    break;
                }
            }

            if (leadingCol === -1) {
                // All zeros in this row - check if RHS is also zero
                if (matrix[row][m] !== 0) {
                    return null; // Inconsistent - no solution
                }
            } else {
                solution[leadingCol] = matrix[row][m];
            }
        }

        return solution;
    }

    /**
     * Check if a puzzle configuration is solvable
     * @param {number[][]} grid - 2D array of cell states
     * @param {number} stateCount - 2 or 3
     * @returns {boolean}
     */
    function isSolvable(grid, stateCount) {
        const solution = solve(grid, stateCount);
        return solution !== null;
    }

    /**
     * Solve the puzzle and return the solution
     * @param {number[][]} grid - 2D array of cell states (values to reduce to 0)
     * @param {number} stateCount - 2 or 3
     * @returns {number[][]|null} - Solution grid (click counts) or null if unsolvable
     */
    function solve(grid, stateCount) {
        const size = grid.length;
        const n = size * size;
        const toggleMatrix = createToggleMatrix(size);

        // Create target vector (negated current state mod stateCount)
        // We want to add clicks such that the final state is 0
        // So we need to find x where Ax = -b (mod stateCount)
        const target = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                // For state s, we need (stateCount - s) % stateCount clicks to reach 0
                target.push((stateCount - (grid[row][col] % stateCount)) % stateCount);
            }
        }

        // Create augmented matrix
        const augmented = [];
        for (let i = 0; i < n; i++) {
            augmented.push([...toggleMatrix[i], target[i]]);
        }

        const solution = gaussianElimination(augmented, stateCount);

        if (solution === null) {
            return null;
        }

        // Convert flat solution to 2D grid
        const solutionGrid = [];
        for (let row = 0; row < size; row++) {
            solutionGrid.push([]);
            for (let col = 0; col < size; col++) {
                solutionGrid[row].push(solution[row * size + col]);
            }
        }

        return solutionGrid;
    }

    /**
     * Calculate the optimal number of moves to solve
     * @param {number[][]} grid - 2D array of cell states
     * @param {number} stateCount - 2 or 3
     * @returns {number} - Optimal move count, or -1 if unsolvable
     */
    function getOptimalMoves(grid, stateCount) {
        const solution = solve(grid, stateCount);
        if (solution === null) {
            return -1;
        }

        let totalMoves = 0;
        for (let row = 0; row < solution.length; row++) {
            for (let col = 0; col < solution[row].length; col++) {
                totalMoves += solution[row][col];
            }
        }

        return totalMoves;
    }

    /**
     * Generate a solvable puzzle by randomly clicking cells
     * @param {number} size - Grid size (5, 6, or 7)
     * @param {number} stateCount - 2 or 3
     * @param {number} targetClicks - Approximate number of clicks to generate puzzle
     * @returns {number[][]} - Initial grid state
     */
    function generatePuzzle(size, stateCount, targetClicks) {
        // Start with all zeros
        const grid = [];
        for (let i = 0; i < size; i++) {
            grid.push(new Array(size).fill(0));
        }

        // Randomly click cells
        for (let i = 0; i < targetClicks; i++) {
            const row = Math.floor(Math.random() * size);
            const col = Math.floor(Math.random() * size);
            applyClick(grid, row, col, stateCount);
        }

        return grid;
    }

    /**
     * Apply a click to the grid (toggle cell and neighbors)
     */
    function applyClick(grid, row, col, stateCount) {
        const size = grid.length;
        const positions = [
            [row, col],
            [row - 1, col],
            [row + 1, col],
            [row, col - 1],
            [row, col + 1]
        ];

        for (const [r, c] of positions) {
            if (r >= 0 && r < size && c >= 0 && c < size) {
                grid[r][c] = (grid[r][c] + 1) % stateCount;
            }
        }
    }

    /**
     * Generate a puzzle with specific difficulty constraints
     * @param {number} size - Grid size
     * @param {number} stateCount - 2 or 3
     * @param {number} minMoves - Minimum optimal moves
     * @param {number} maxMoves - Maximum optimal moves
     * @param {number} maxAttempts - Maximum generation attempts
     * @returns {{grid: number[][], optimalMoves: number}|null}
     */
    function generateWithDifficulty(size, stateCount, minMoves, maxMoves, maxAttempts = 100) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Estimate clicks based on target difficulty
            const targetClicks = Math.floor((minMoves + maxMoves) / 2);
            const grid = generatePuzzle(size, stateCount, targetClicks);

            // Check if puzzle has any non-zero cells
            let hasLight = false;
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (grid[r][c] !== 0) {
                        hasLight = true;
                        break;
                    }
                }
                if (hasLight) break;
            }

            if (!hasLight) continue;

            // Check solvability and optimal moves
            const optimalMoves = getOptimalMoves(grid, stateCount);

            if (optimalMoves >= minMoves && optimalMoves <= maxMoves) {
                return { grid, optimalMoves };
            }
        }

        return null;
    }

    return {
        solve,
        isSolvable,
        getOptimalMoves,
        generatePuzzle,
        generateWithDifficulty,
        applyClick
    };
})();

window.Solver = Solver;
