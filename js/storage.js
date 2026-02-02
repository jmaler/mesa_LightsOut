/**
 * Storage - PlayMesa SDK wrapper for progress persistence
 * Uses star-based scoring: 0 = not played, 1-3 = stars earned
 * Points = basePoints × stars
 */

const Storage = (function() {
    const PROGRESS_KEY = 'lights_out_progress';

    // Default progress structure
    const defaultProgress = {
        levelStars: {},      // { 'levelId': stars (1-3) }
        totalScore: 0,
        unlocked5x5: false,
        unlocked6x6: false,
        unlocked3State: false
    };

    let cachedProgress = null;

    /**
     * Load progress from Mesa SDK
     * @returns {Promise<Object>}
     */
    async function loadProgress() {
        try {
            const data = await Mesa.data.getItem(PROGRESS_KEY);
            if (data && typeof data === 'string') {
                cachedProgress = JSON.parse(data);
                // Ensure all fields exist
                cachedProgress = { ...defaultProgress, ...cachedProgress };
                // Migrate old format if needed
                if (cachedProgress.completedLevels && !cachedProgress.levelStars) {
                    cachedProgress.levelStars = {};
                    for (const id of cachedProgress.completedLevels) {
                        cachedProgress.levelStars[id] = 1; // Assume 1 star for old completions
                    }
                    delete cachedProgress.completedLevels;
                }
                if (!cachedProgress.levelStars) {
                    cachedProgress.levelStars = {};
                }
            } else if (data && typeof data === 'object') {
                cachedProgress = { ...defaultProgress, ...data };
            } else {
                cachedProgress = { ...defaultProgress };
            }
        } catch (e) {
            console.warn('Failed to load progress:', e);
            cachedProgress = { ...defaultProgress };
        }
        return cachedProgress;
    }

    /**
     * Save progress to Mesa SDK
     * @returns {Promise<void>}
     */
    async function saveProgress() {
        if (!cachedProgress) return;
        try {
            await Mesa.data.setItem(PROGRESS_KEY, JSON.stringify(cachedProgress));
        } catch (e) {
            console.warn('Failed to save progress:', e);
        }
    }

    /**
     * Get current progress (cached)
     * @returns {Object}
     */
    function getProgress() {
        return cachedProgress || { ...defaultProgress };
    }

    /**
     * Get star rating for a level
     * @param {string} levelId
     * @returns {number} 0-3 (0 = not played)
     */
    function getLevelStars(levelId) {
        if (!cachedProgress || !cachedProgress.levelStars) return 0;
        return cachedProgress.levelStars[levelId] || 0;
    }

    /**
     * Complete a level with star rating
     * Only updates if new stars > old stars
     * @param {string} levelId - Level identifier
     * @param {number} basePoints - Base points for this level
     * @param {number} stars - Stars earned (1-3)
     * @returns {Promise<{isNewBest: boolean, pointsEarned: number, newUnlocks: string[]}>}
     */
    async function completeLevel(levelId, basePoints, stars) {
        if (!cachedProgress) {
            await loadProgress();
        }

        const oldStars = cachedProgress.levelStars[levelId] || 0;
        const newUnlocks = [];
        let pointsEarned = 0;
        let isNewBest = false;

        if (stars > oldStars) {
            isNewBest = true;
            // Calculate point difference
            const oldPoints = basePoints * oldStars;
            const newPoints = basePoints * stars;
            pointsEarned = newPoints - oldPoints;

            cachedProgress.levelStars[levelId] = stars;
            cachedProgress.totalScore += pointsEarned;

            // Check for unlocks (10 levels completed in 4x4)
            const completed4x4 = Object.keys(cachedProgress.levelStars)
                .filter(id => id.startsWith('4x4') && cachedProgress.levelStars[id] > 0).length;

            if (completed4x4 >= 10) {
                if (!cachedProgress.unlocked5x5) {
                    cachedProgress.unlocked5x5 = true;
                    newUnlocks.push('5x5');
                }
                if (!cachedProgress.unlocked6x6) {
                    cachedProgress.unlocked6x6 = true;
                    newUnlocks.push('6x6');
                }
                if (!cachedProgress.unlocked3State) {
                    cachedProgress.unlocked3State = true;
                    newUnlocks.push('3-state');
                }
            }

            await saveProgress();
        }

        return { isNewBest, pointsEarned, newUnlocks };
    }

    /**
     * Check if a level is completed (has any stars)
     * @param {string} levelId
     * @returns {boolean}
     */
    function isLevelCompleted(levelId) {
        return getLevelStars(levelId) > 0;
    }

    /**
     * Get total score
     * @returns {number}
     */
    function getTotalScore() {
        return cachedProgress ? cachedProgress.totalScore : 0;
    }

    /**
     * Check if 6x6 is unlocked
     * @returns {boolean}
     */
    function is6x6Unlocked() {
        return cachedProgress ? cachedProgress.unlocked6x6 : false;
    }

    /**
     * Check if 5x5 is unlocked
     * @returns {boolean}
     */
    function is5x5Unlocked() {
        return cachedProgress ? cachedProgress.unlocked5x5 : false;
    }

    /**
     * Check if 3-state is unlocked
     * @returns {boolean}
     */
    function is3StateUnlocked() {
        return cachedProgress ? cachedProgress.unlocked3State : false;
    }

    /**
     * Get count of completed levels for a grid size
     * @param {number} gridSize
     * @returns {number}
     */
    function getCompletedCount(gridSize) {
        if (!cachedProgress || !cachedProgress.levelStars) return 0;
        return Object.keys(cachedProgress.levelStars)
            .filter(id => id.startsWith(`${gridSize}x${gridSize}`) && cachedProgress.levelStars[id] > 0).length;
    }

    /**
     * Get count of completed levels for a specific mode (size + state)
     * @param {number} gridSize
     * @param {number} stateCount
     * @returns {number}
     */
    function getCompletedCountForMode(gridSize, stateCount) {
        if (!cachedProgress || !cachedProgress.levelStars) return 0;
        const prefix = `${gridSize}x${gridSize}_${stateCount}state`;
        return Object.keys(cachedProgress.levelStars)
            .filter(id => id.startsWith(prefix) && cachedProgress.levelStars[id] > 0).length;
    }

    /**
     * Submit score to leaderboard
     * @returns {Promise<void>}
     */
    async function submitToLeaderboard() {
        if (!cachedProgress) return;

        const score = cachedProgress.totalScore;
        const user = Mesa.user.get();
        const playerName = user ? user.username : 'Player';

        try {
            await Mesa.leaderboard.submit({
                key: 'total_score',
                playerName: playerName,
                displayValue: `${score.toLocaleString()} pts`,
                sortValue: score
            });
        } catch (e) {
            // Silently fail - leaderboard is optional
            console.warn('Leaderboard submit failed:', e);
        }
    }

    return {
        loadProgress,
        saveProgress,
        getProgress,
        getLevelStars,
        completeLevel,
        isLevelCompleted,
        getTotalScore,
        is5x5Unlocked,
        is6x6Unlocked,
        is3StateUnlocked,
        getCompletedCount,
        getCompletedCountForMode,
        submitToLeaderboard
    };
})();

window.Storage = Storage;
