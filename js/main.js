/**
 * Main Application Controller
 * Initializes all modules and manages application lifecycle
 */

(async function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }

    console.log('[Lights Out] Initializing...');

    // Show loading state
    Mesa.game.loadingStart();

    try {
        // Initialize Mesa SDK
        await Mesa.init();
        console.log('[Lights Out] Mesa SDK initialized, environment:', Mesa.getEnvironment());

        // Load saved progress
        await Storage.loadProgress();
        console.log('[Lights Out] Progress loaded');

        // Initialize UI
        UI.init();
        console.log('[Lights Out] UI initialized');

        // Initialize game engine
        Game.init();
        console.log('[Lights Out] Game engine initialized');

        // Update initial screen state
        UI.updateMenuScreen();

        // Handle resize events
        window.addEventListener('resize', () => {
            Game.resizeCanvas();
        });

        // Handle visibility change (pause/resume)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (UI.getCurrentScreen() === 'game') {
                    Mesa.game.gameplayStop();
                }
            } else {
                if (UI.getCurrentScreen() === 'game') {
                    Mesa.game.gameplayStart();
                }
            }
        });

        // Listen for Mesa events
        Mesa.on('mute', (data) => {
            console.log('[Lights Out] Mute state changed:', data.muted);
        });

        Mesa.on('error', (data) => {
            console.warn('[Lights Out] Mesa error:', data);
        });

        console.log('[Lights Out] Initialization complete');

    } catch (error) {
        console.error('[Lights Out] Initialization failed:', error);
    } finally {
        // Hide loading state
        Mesa.game.loadingEnd();
    }
})();
