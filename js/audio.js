/**
 * Audio System - Web Audio API procedural sound effects
 * No audio files needed - all sounds generated programmatically
 */

const Audio = (function() {
    let audioContext = null;
    let masterGain = null;

    function init() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioContext.createGain();
            masterGain.connect(audioContext.destination);
            masterGain.gain.value = 0.3;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    function isMuted() {
        return Mesa.audio.isMuted();
    }

    function ensureContext() {
        if (!audioContext) {
            init();
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        return audioContext !== null;
    }

    /**
     * Play a cell toggle sound
     * @param {number} newState - The new state of the cell (0, 1, or 2)
     * @param {number} stateCount - Total states (2 or 3)
     */
    function playClick(newState, stateCount) {
        if (isMuted() || !ensureContext()) return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(masterGain);

        // Pitch varies based on state
        const baseFreq = 400;
        const freqMultiplier = 1 + (newState / stateCount) * 0.5;
        osc.frequency.value = baseFreq * freqMultiplier;
        osc.type = 'sine';

        const now = audioContext.currentTime;
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Play victory sound - ascending arpeggio
     */
    function playVictory() {
        if (isMuted() || !ensureContext()) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const duration = 0.15;

        notes.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.connect(gain);
            gain.connect(masterGain);

            osc.frequency.value = freq;
            osc.type = 'sine';

            const startTime = audioContext.currentTime + (i * duration);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration + 0.1);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.15);
        });

        // Final chord
        setTimeout(() => {
            if (isMuted() || !ensureContext()) return;

            const chordFreqs = [523.25, 659.25, 783.99];
            chordFreqs.forEach(freq => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();

                osc.connect(gain);
                gain.connect(masterGain);

                osc.frequency.value = freq;
                osc.type = 'triangle';

                const now = audioContext.currentTime;
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

                osc.start(now);
                osc.stop(now + 0.5);
            });
        }, notes.length * duration * 1000);
    }

    /**
     * Play unlock sound - sparkle/chime effect
     */
    function playUnlock() {
        if (isMuted() || !ensureContext()) return;

        const frequencies = [1200, 1500, 1800, 2400];

        frequencies.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.connect(gain);
            gain.connect(masterGain);

            osc.frequency.value = freq;
            osc.type = 'sine';

            const startTime = audioContext.currentTime + (i * 0.05);
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.start(startTime);
            osc.stop(startTime + 0.35);
        });
    }

    /**
     * Play UI click sound - soft pop
     */
    function playUIClick() {
        if (isMuted() || !ensureContext()) return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(masterGain);

        osc.frequency.value = 800;
        osc.type = 'sine';

        const now = audioContext.currentTime;
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        // Quick frequency drop for pop effect
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    /**
     * Play error sound - low buzz
     */
    function playError() {
        if (isMuted() || !ensureContext()) return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(masterGain);

        osc.frequency.value = 150;
        osc.type = 'sawtooth';

        const now = audioContext.currentTime;
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // Initialize on first user interaction
    function initOnInteraction() {
        if (!audioContext) {
            init();
        }
        document.removeEventListener('click', initOnInteraction);
        document.removeEventListener('touchstart', initOnInteraction);
    }

    document.addEventListener('click', initOnInteraction);
    document.addEventListener('touchstart', initOnInteraction);

    return {
        init,
        playClick,
        playVictory,
        playUnlock,
        playUIClick,
        playError
    };
})();

window.GameAudio = Audio;
