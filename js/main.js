import {
    setupKnob,
    updateVUMeter,
    throttle,
    isElementVisible,
    formatControlValue
} from './utils.js';

// Import arpeggiator module
import { 
    isArpeggiatorEnabled, 
    initArpeggiator, 
    addNoteToArpeggiator,
    removeNoteFromArpeggiator,
    updateArpeggiatorOctave,
    stopArpeggiator,
    clearArpeggiatorNotes
} from './arpeggiator.js';

// Import audio nodes
import { 
    AudioNodeFactory,
    filter,
    reverb,
    delay,
    chorus,
    distortion,
    flanger,
    phaser,
    eq,
    masterCompressor,
    stereoWidener,
    widthCompensation,
    masterVolume,
    masterPanner,
    initAudioNodes,
    ensureVisualizersConnected,
    updateReverb
} from './audioNodes.js';


// Initialize LFO tracking system
let lfoActive = false;
let lfoDestination = 'off';
let lfoBaseValues = {};
lfoBaseValues.pan = 0; // Default to center
lfoBaseValues.masterVolume = parseFloat(document.getElementById('masterVolume').value) // Current master volume

// Initialize synth variables
let synth;
let currentStep = 0; // Initialize currentStep at the global level

const activeNotes = new Set();
const activeComputerKeys = new Set();

// Keep track of sequencer active keys
const sequencerActiveKeys = new Map();

// Create envelope settings to reuse
const synthSettings = {
    envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 0.5
    }
};

// Initialize LFO setup early
const lfo = new Tone.LFO({
    frequency: 1,
    amplitude: 0.5,
    type: "sine"
}).start();

// Initialize drone state
let isDroneActive = false;
let droneSynth = null;

const drumSounds = {};

// Animation control system
const animations = {
    // Flags to track which animations are active
    isRunning: false,
    oscilloscope: {
        active: true,
        element: null,
        context: null,
        lastUpdate: 0
    },
    lfoScope: {
        active: true,
        element: null,
        context: null,
        lastUpdate: 0
    },
    // Add any other visualizations here
    
    // Performance settings
    settings: {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        frameInterval: 1, // Will be adjusted based on device
        throttleAmount: 1, // Default: update every frame
        lastFrameTime: 0,
        fpsLimit: 60 // Default target FPS
    }
};

// Initialize animation settings based on device with optimization
// Added error handling to prevent crashes
function initAnimationSettings() {
    try {
        // Detect mobile device directly instead of using animations.settings.isMobile
        // This fixes the "isMobile is not defined" error
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Store the mobile detection in animation settings
        animations.settings.isMobile = isMobile;
        
        // Set performance-related settings based on device capability
        if (isMobile) {
            // More aggressive throttling for mobile devices
            animations.settings.throttleAmount = 2; // Update every 2nd frame
            animations.settings.fpsLimit = 30; // Target 30fps on mobile
        } else {
            // Check if we can detect slow devices even on desktop
            let slowDevice = false;
            try {
                slowDevice = navigator.hardwareConcurrency <= 2;
            } catch (e) {
                // Some browsers might not support hardwareConcurrency
                console.debug('Could not detect CPU cores, assuming standard device');
                slowDevice = false;
            }
            
            if (slowDevice) {
                animations.settings.throttleAmount = 2;
                animations.settings.fpsLimit = 45; // Compromise for slower desktops
            }
        }
        
        animations.settings.frameInterval = 1000 / animations.settings.fpsLimit;
    } catch (error) {
        console.warn('Error initializing animation settings, using safe defaults:', error);
        // Set safe defaults in case of error
        animations.settings.throttleAmount = 2; // Conservative default
        animations.settings.fpsLimit = 30; // Conservative default
        animations.settings.frameInterval = 1000 / 30; // Based on 30fps
    }
    
    // Cache DOM references
    const oscilloscopeElement = document.getElementById('oscilloscope');
    animations.oscilloscope.element = oscilloscopeElement;
    animations.oscilloscope.context = oscilloscopeElement?.getContext('2d', { alpha: false }); // Optimize canvas for performance
    
    const lfoScopeElement = document.getElementById('lfoScope');
    animations.lfoScope.element = lfoScopeElement;
    animations.lfoScope.context = lfoScopeElement?.getContext('2d', { alpha: false });
    
    // Pre-size canvases if possible to avoid reflow
    if (oscilloscopeElement) {
        const parent = oscilloscopeElement.parentElement;
        if (parent) {
            oscilloscopeElement.width = parent.clientWidth;
            oscilloscopeElement.height = parent.clientHeight;
        }
    }
    
    if (lfoScopeElement) {
        const parent = lfoScopeElement.parentElement;
        if (parent) {
            lfoScopeElement.width = parent.clientWidth;
            lfoScopeElement.height = parent.clientHeight;
        }
    }
    
    // Create optimized version of element visibility detection with throttling
    animations.checkVisibility = throttle(() => {
        animations.oscilloscope.visible = isElementVisible(animations.oscilloscope.element);
        animations.lfoScope.visible = isElementVisible(animations.lfoScope.element);
    }, 500); // Check visibility at most every 500ms
    
    // Create throttled versions of update functions
    animations.throttledLfoUpdate = throttle(updateLfoModulation, 16); // ~60fps
        
    console.log(`Animation settings initialized: ${animations.settings.isMobile ? 'Mobile' : 'Desktop'} mode, ${animations.settings.fpsLimit}fps target`);
}

// Optimized main animation loop
function mainAnimationLoop(timestamp) {
    if (!animations.isRunning) return;
    
    requestAnimationFrame(mainAnimationLoop);
    
    // Throttle frame rate if needed
    const elapsed = timestamp - animations.settings.lastFrameTime;
    if (elapsed < animations.settings.frameInterval) {
        return; // Skip this frame
    }
    
    // Update time tracking with performance optimizations
    animations.settings.lastFrameTime = timestamp - (elapsed % animations.settings.frameInterval);
    
    // Check visibility occasionally (not every frame)
    if (timestamp % 500 < 16) { // Check roughly every 500ms
        animations.checkVisibility();
    }
    
    // Only update what's visible and active
    if (animations.oscilloscope.active && animations.oscilloscope.visible) {
        updateOscilloscope(timestamp);
    }
    
    if (animations.lfoScope.active && animations.lfoScope.visible) {
        updateLfoScope(timestamp);
    }

    // If LFO is active, update it using throttled function
    if (lfoActive && lfoDestination !== 'off') {
        animations.throttledLfoUpdate(timestamp);
        
        // Check if basic LFO visualizer is visible
        const basicLfoVisible = document.querySelector('.lfo-scope')?.style.display !== 'none';
        
        // Only update the basic LFO scope if it's visible
        if (basicLfoVisible) {
            updateLfoScope(timestamp);
        }
    }
    
    // Performance monitoring in development mode
    if (window.DEBUG_PERFORMANCE && timestamp % 1000 < 16) {
        const fps = Math.round(1000 / elapsed);
        console.log(`FPS: ${fps}`);
    }
}

// Start all animations
function startAnimations() {
    if (!animations.isRunning) {
        animations.isRunning = true;
        animations.settings.lastFrameTime = performance.now();
        requestAnimationFrame(mainAnimationLoop);
        console.log('Animations started');
    }
}

// Stop all animations
function stopAnimations() {
    animations.isRunning = false;
    console.log('Animations stopped');
}

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        stopAnimations();
    } else if (document.visibilityState === 'visible') {
        startAnimations();
    }
});

// Update the oscilloscope visualization
function updateOscilloscope(timestamp) {
    const { element, context } = animations.oscilloscope;
    if (!element || !context || !window.waveform) return;
    
    const width = element.width;
    const height = element.height;
    const values = window.waveform.getValue();
    const currentScheme = colorSchemes[currentColorSchemeIndex];

    context.fillStyle = currentScheme.bg;
    context.fillRect(0, 0, width, height);

    context.beginPath();
    context.strokeStyle = currentScheme.wave;
    context.lineWidth = 1;  // Thinner line for simpler appearance
    
    // Calculate a step size to reduce the number of points sampled
    const step = Math.max(1, Math.floor(values.length / 80));  // Even fewer points for simplicity
    // Scale the amplitude down significantly to make the wave more compact
    const amplitudeScale = 0.4; 
    
    for (let i = 0; i < values.length; i += step) {
        const x = (i / values.length) * width;
        // Scale the amplitude and center in the middle of the canvas
        const y = (height / 2) + ((values[i] * amplitudeScale) * (height / 2));

        if (i === 0) {
            context.moveTo(x, y);
        } else {
            context.lineTo(x, y);
        }
    }

    context.stroke();
    
    // Update tracking time
    animations.oscilloscope.lastUpdate = timestamp;
}

function updateLfoScope(timestamp) {
    const { element, context } = animations.lfoScope;
    if (!element || !context) return;
    
    // Get current LFO settings with cached references for better performance
    if (!updateLfoScope.elements) {
        updateLfoScope.elements = {
            waveform: document.getElementById('lfoWaveform'),
            rate: document.getElementById('lfoRate'),
            amount: document.getElementById('lfoAmount')
        };
        updateLfoScope.cyclesShown = 2; // Show 2 complete cycles
        
        // Precompute colors for different waveforms to avoid recreating them each frame
        updateLfoScope.colors = {
            sine: {
                main: '#00e5ff',
                shadow: '#00e5ff',
                fill: 'rgba(0, 229, 255, 0.2)',
                fillBottom: 'rgba(0, 229, 255, 0.05)'
            },
            square: {
                main: '#ff1744',
                shadow: '#ff1744',
                fill: 'rgba(255, 23, 68, 0.2)',
                fillBottom: 'rgba(255, 23, 68, 0.05)'
            },
            triangle: {
                main: '#00c853',
                shadow: '#00c853',
                fill: 'rgba(0, 200, 83, 0.2)',
                fillBottom: 'rgba(0, 200, 83, 0.05)'
            },
            sawtooth: {
                main: '#ffab00',
                shadow: '#ffab00',
                fill: 'rgba(255, 171, 0, 0.2)',
                fillBottom: 'rgba(255, 171, 0, 0.05)'
            },
            random: {
                main: '#d500f9',
                shadow: '#d500f9',
                fill: 'rgba(213, 0, 249, 0.2)',
                fillBottom: 'rgba(213, 0, 249, 0.05)'
            }
        };
        
        // Pre-computed waveform functions map for better performance
        updateLfoScope.waveformFunctions = {
            sine: (t, centerY, amplitude) => centerY - Math.sin(t) * amplitude,
            square: (t, centerY, amplitude) => centerY - (Math.sin(t) > 0 ? 1 : -1) * amplitude,
            triangle: (t, centerY, amplitude) => centerY - (Math.asin(Math.sin(t)) * (2 / Math.PI)) * amplitude,
            sawtooth: (t, centerY, amplitude) => centerY - ((t % (Math.PI * 2)) / Math.PI - 1) * amplitude,
            random: (t, centerY, amplitude) => {
                const segment = Math.floor(t / (Math.PI / 4)); // Change every 1/8th of cycle
                return centerY - (Math.sin(segment * 1000) * 2 - 1) * amplitude;
            }
        };
    }
    
    const waveform = updateLfoScope.elements.waveform.value;
    const rate = parseFloat(updateLfoScope.elements.rate.value);
    const amount = parseInt(updateLfoScope.elements.amount.value) / 100;
    
    const width = element.width;
    const height = element.height;
    const centerY = height / 2;
    
    // Clear the canvas
    context.clearRect(0, 0, width, height);
    
    // Draw background (solid color is more efficient than gradient)
    context.fillStyle = 'rgba(15, 15, 25, 0.9)';
    context.fillRect(0, 0, width, height);

    // Horizontal center line
    context.beginPath();
    context.moveTo(0, centerY);
    context.lineTo(width, centerY);
    context.strokeStyle = 'rgba(150, 150, 200, 0.4)';
    context.lineWidth = 1;
    context.stroke();

    // Efficient grid rendering - draw all horizontal lines at once
    context.beginPath();
    context.strokeStyle = 'rgba(100, 100, 150, 0.15)';
    // Top and bottom lines
    context.moveTo(0, height * 0.25);
    context.lineTo(width, height * 0.25);
    context.moveTo(0, height * 0.75);
    context.lineTo(width, height * 0.75);
    context.stroke();

    // Draw vertical grid lines efficiently
    context.beginPath();
    for (let i = 0; i <= 8; i++) {
        const x = (i / 8) * width;
        context.moveTo(x, 0);
        context.lineTo(x, height);
    }
    context.stroke();

    // Calculate amplitude based on amount setting
    const amplitude = (height / 2) * 0.8 * amount;

    // Time is based on current time for animation
    const now = timestamp / 1000; // Current time in seconds
    const waveOffset = now * rate * Math.PI * 2;
    
    // Get the correct waveform generator function
    const generateY = updateLfoScope.waveformFunctions[waveform] || updateLfoScope.waveformFunctions.sine;
    
    // Get color scheme for current waveform
    const colorScheme = updateLfoScope.colors[waveform] || updateLfoScope.colors.sine;

    // Points array to store waveform path
    const points = [];
    
    // Calculate points with optimized step size based on screen width
    // Use fewer points for better performance (every 2px is sufficient for most displays)
    const step = Math.max(1, Math.floor(width / 300)); // Adaptive based on canvas width
    
    for (let x = 0; x <= width; x += step) {
        // Calculate phase at this x position
        const t = (x / width) * (updateLfoScope.cyclesShown * Math.PI * 2) + waveOffset;
        // Get y position using the appropriate waveform function
        const y = generateY(t, centerY, amplitude);
        points.push({ x, y });
    }
    
    // Fill the waveform area first
    context.beginPath();
    context.moveTo(0, centerY);
    
    points.forEach(point => {
        context.lineTo(point.x, point.y);
    });
    
    context.lineTo(width, centerY);
    context.closePath();
    
    // Create fill gradient
    const fillGradient = context.createLinearGradient(0, 0, 0, height);
    fillGradient.addColorStop(0, colorScheme.fill);
    fillGradient.addColorStop(1, colorScheme.fillBottom);
    context.fillStyle = fillGradient;
    context.fill();
    
    // Now draw the line itself (more efficiently with a single path)
    context.beginPath();
    
    if (points.length > 0) {
        context.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            context.lineTo(points[i].x, points[i].y);
        }
    }
    
    // Set line style with glow effect
    context.strokeStyle = colorScheme.main;
    context.lineWidth = 2;
    
    // Optimize rendering with efficient glow effect
    context.shadowColor = colorScheme.shadow;
    context.shadowBlur = 4;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.stroke();
    
    // Reset shadow for remaining drawing
    context.shadowBlur = 0;
    
    // Draw current playhead position (position indicator)
    const cyclePosition = (now * rate) % 1;
    const playheadX = cyclePosition * (width / updateLfoScope.cyclesShown);
    
    context.beginPath();
    context.moveTo(playheadX, 0);
    context.lineTo(playheadX, height);
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = 1;
    context.stroke();
    
    // Add frequency label
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.font = '10px sans-serif';
    context.textAlign = 'right';
    context.fillText(`${rate.toFixed(1)} Hz`, width - 5, height - 5);
    
    if (lfoActive && lfoDestination !== 'off') {
        // Show active modulation target
        context.fillStyle = 'rgba(255, 255, 255, 0.8)';
        context.textAlign = 'left';
        context.fillText(lfoDestination, 5, height - 5);
    }
    
    // Update tracking time
    animations.lfoScope.lastUpdate = timestamp;
}

// Cached elements for LFO
let lfoWaveformElement = null;
let lfoRateElement = null;
let lfoAmountElement = null;

// LFO waveform calculation functions (optimization)
const lfoWaveformFunctions = {
    sine: (phase) => Math.sin(phase * Math.PI * 2),
    triangle: (phase) => 1 - Math.abs((phase * 4) % 4 - 2),
    square: (phase) => phase < 0.5 ? 1 : -1,
    sawtooth: (phase) => (phase * 2) - 1,
    random: (phase) => {
        const segments = 8;
        const segmentIndex = Math.floor(phase * segments);
        return Math.sin(segmentIndex * 1000) * 2 - 1;
    }
};

// Add this new function to calculate the current LFO value
function getLfoValue() {
    // Get current LFO settings
    const waveform = document.getElementById('lfoWaveform').value;
    const rate = parseFloat(document.getElementById('lfoRate').value);
    
    // Calculate current phase based on time
    const now = performance.now() / 1000; // Current time in seconds
    const phase = (now * rate) % 1; // Phase between 0 and 1
    
    // Get the appropriate waveform function
    let value;
    switch (waveform) {
        case 'sine':
            value = Math.sin(phase * Math.PI * 2);
            break;
        case 'triangle':
            value = 1 - Math.abs((phase * 4) % 4 - 2);
            break;
        case 'square':
            value = phase < 0.5 ? 1 : -1;
            break;
        case 'sawtooth':
            value = (phase * 2) - 1;
            break;
        case 'random':
            // Use segment-based approach for random to match visualization
            const segments = 8;
            const segmentIndex = Math.floor(phase * segments);
            // Use deterministic "random" based on segment index
            value = Math.sin(segmentIndex * 1000) * 2 - 1;
            break;
        default:
            value = Math.sin(phase * Math.PI * 2); // Default to sine
    }
    
    return value; // Value between -1 and 1
}

// Optimized LFO modulation with reduced DOM access
function updateLfoModulation(timestamp) {
    // Skip if LFO is inactive or destination is off
    if (!lfoActive || lfoDestination === 'off') return;
    
    // Get LFO value (scaled between -1 and 1)
    let lfoValue = getLfoValue();
    
    // Get target element
    const targetElement = document.getElementById(lfoDestination);
    if (!targetElement) return;
    
    // Get amount setting (as a percentage)
    const amount = parseFloat(document.getElementById('lfoAmount').value) / 100;
    
    // Get min and max values from the range input
    const min = parseFloat(targetElement.min);
    const max = parseFloat(targetElement.max);
    
    // Get base value (or use current value if not set)
    let baseValue = lfoBaseValues[lfoDestination];
    if (baseValue === undefined) {
        baseValue = parseFloat(targetElement.value);
        lfoBaseValues[lfoDestination] = baseValue;
    }
    
    // Calculate new value, scaling the LFO output appropriately
    const range = max - min;
    const scaledLfo = lfoValue * range * amount / 2;
    let newValue = baseValue + scaledLfo;
    
    // Ensure value stays within range
    newValue = Math.max(min, Math.min(max, newValue));
    
    // Update input element
    targetElement.value = newValue;
    
    // Update display value
    const valueDisplay = document.getElementById(`${lfoDestination}Value`);
    if (valueDisplay) {
        // Format based on parameter type
        if (lfoDestination === 'masterPan') {
            // Special formatting for pan display
            let displayText = "C"; // Center by default
            
            if (newValue < -0.05) {
                // Left side
                const leftAmount = Math.abs(Math.round(newValue * 100));
                displayText = `L${leftAmount}`;
            } else if (newValue > 0.05) {
                // Right side
                const rightAmount = Math.round(newValue * 100);
                displayText = `R${rightAmount}`;
            }
            
            valueDisplay.textContent = displayText;
        } else {
            // Default formatting for other parameters
            valueDisplay.textContent = formatControlValue(lfoDestination, newValue);
        }
    }
    
    updateAudioParameter(lfoDestination, newValue);
    
    // Update knob position if a knob updater exists
    if (knobUpdaters[lfoDestination]) {
        knobUpdaters[lfoDestination](newValue);
    }
}

// Cache for parameter related elements
const parameterElementCache = new Map();

// Apply LFO modulation to a parameter with DOM caching
function applyLfoToParameter(paramId, lfoOutput) {
    // Get or cache elements for this parameter
    if (!parameterElementCache.has(paramId)) {
        const input = document.getElementById(paramId);
        if (!input) return;
        
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const range = max - min;
        const modRange = range * 0.5;
        const knob = document.getElementById(`${paramId}Knob`);
        
        parameterElementCache.set(paramId, {
            input,
            min,
            max,
            range,
            modRange,
            knob
        });
    }
    
    // Get cached elements and values
    const cache = parameterElementCache.get(paramId);
    if (!cache) return;
    
    const { input, min, max, range, modRange, knob } = cache;
    
    // Get base value - this still needs to be dynamic
    const baseValue = lfoBaseValues[paramId] || (min + range / 2);
    
    // Calculate modulated value
    const modValue = baseValue + (lfoOutput * modRange);
    const clampedValue = Math.max(min, Math.min(max, modValue));
    
    // Only update the DOM if the value has changed significantly
    // This avoids unnecessary updates that won't be visually noticeable
    if (Math.abs(parseFloat(input.value) - clampedValue) > 0.001) {
        // Update input value
        input.value = clampedValue;
        
        // Update the parameter
        updateAudioParameter(paramId, clampedValue);
        
        // Update knob rotation using GSAP (only if knob exists)
        if (knob) {
            const normalizedValue = (clampedValue - min) / range;
            const rotation = normalizedValue * 270 - 135;
            
            gsap.to(knob, {
                rotation: rotation,
                duration: 0.05,
                overwrite: true
            });
        }
    }
}





// The handleMonoNoteChange function can be removed as we only use poly mode

// Function to update the detune value based on octave and semitone settings
function updateDetune() {
    const octave = parseInt(document.getElementById('oscillatorOctave').value);
    const semi = parseInt(document.getElementById('oscillatorSemi').value);
    const detune = octave * 1200 + semi * 100; // Convert octaves and semitones to cents

    synth.set({
        detune: detune
    });
}

// Enhanced synth creation with memory optimization and improved audio quality
function createSynth() {
    // Performance metrics tracking
    const startTime = performance.now();
    
    // Store a reference to the old synth
    const oldSynth = synth;
    
    // Create the new synth first to prevent race conditions
    createNewSynth();
    
    // Properly dispose of old synth if it exists
    if (oldSynth) {
        try {
            // Release all notes to prevent hanging notes
            oldSynth.releaseAll();
            
            // Mark the synth as being disposed using a safer approach
            // Use _disposing flag to avoid the property setter issue
            oldSynth._disposing = true;
            
            // Calculate a dynamic timeout based on current release time
            const releaseTime = parseFloat(document.getElementById('release').value) || 1.0;
            const disposeTimeout = Math.max(500, releaseTime * 1000 + 100); // At least 500ms, but longer for longer release times
            
            // Store the timeout ID so it can be cleared if needed
            oldSynth._disposeTimeoutId = setTimeout(() => {
                try {
                    if (oldSynth && oldSynth.disconnect && !oldSynth._wasDisposed && oldSynth._disposing) {
                        // Cancel any existing timeout before disposal
                        if (oldSynth._disposeTimeoutId) {
                            clearTimeout(oldSynth._disposeTimeoutId);
                        }
                        
                        oldSynth.disconnect();
                        oldSynth.dispose();
                        oldSynth._wasDisposed = true;
                        
                        // Clean up references for garbage collection
                        delete oldSynth._disposeTimeoutId;
                    }
                } catch (disposeErr) {
                    console.warn("Error disposing old synth:", disposeErr);
                }
            }, disposeTimeout);
        } catch (releaseErr) {
            console.warn("Error releasing notes on old synth:", releaseErr);
        }
    }
    
    // Log performance metrics
    const duration = performance.now() - startTime;
    if (window.DEBUG_PERFORMANCE) {
        console.log(`Synth creation took ${duration.toFixed(2)}ms`);
    }
    
    window.synth = synth;
    window.activeNotes = activeNotes;

    // Also expose updateVUMeter function for visual feedback from MIDI
    window.updateVUMeter = updateVUMeter;
    return synth;
    
    // Helper function to create a new synth instance
    function createNewSynth() {
        // Clear all active notes when switching synth types
        activeNotes.clear();
        activeComputerKeys.clear();

        // Remove active class from all keys
        document.querySelectorAll('.key.active, .black-key.active').forEach(key => {
            key.classList.remove('active');
        });

        // Get current settings
        const waveformType = document.getElementById('waveform').value;
        const level = parseFloat(document.getElementById('oscillatorLevel').value || 0.8);
        
        // Prepare enhanced audio settings with better defaults
        const enhancedSettings = {
            ...synthSettings,
            envelope: {
                ...synthSettings.envelope,
                // Add curve settings for better envelope shape
                attackCurve: 'exponential',
                releaseCurve: 'exponential'
            },
            oscillator: {
                type: waveformType,
                // Improve stability with phase reset on new notes
                phase: 0
                // Removed problematic partials setting that was causing errors
            },
            volume: Tone.gainToDb(level),
            // No portamento needed for poly synth
            portamento: 0
        };
        
        // Get the number of voices from UI or use default
        const maxVoices = parseInt(document.getElementById('voices')?.value || 8);
        
        // Configure polyphonic synth with optimal performance settings (8 voices)
        const increasedVoices = maxVoices; // Use exactly the requested number of voices for better performance
        
        synth = new Tone.PolySynth({
            maxPolyphony: increasedVoices,
            voice: Tone.Synth,
            options: enhancedSettings
        });
        
        // Apply additional polyphonic optimizations
        synth.set({
            // Use voice stealing algorithms for consistent performance
            maxPolyphony: increasedVoices,
            // Setting a voice limit dynamically based on system capability
            voice: {
                portamento: 0, // Individual voices don't need portamento
                volume: Tone.gainToDb(level)
            }
        });

        // Create optimized connection to effects chain
        // Connect directly to filter for now to simplify the chain
        // This avoids potential issues with the limiter
        synth.connect(filter);
        
        // Ensure visualizers are connected when creating a new synth
        ensureVisualizersConnected();

        // Apply specific settings
        updateDetune();
        
        // Register with voice manager if it's been created
        if (typeof VoiceManager !== 'undefined') {
            try {
                // Use the local VoiceManager, not window.VoiceManager
                VoiceManager.registerSynth(synth, "poly");
            } catch (err) {
                console.warn('Error registering with voice manager:', err);
            }
        }
    }
}

// Voice management for better performance with polyphonic synths
const VoiceManager = {
    // Track active voices to prevent memory leaks and manage performance
    activeVoices: new Map(),
    
    // Configuration options for voice management - optimized for better performance
    options: {
        maxTotalVoices: 16,         // Reduced maximum total voices for better performance
        voiceTimeout: 30000,        // Maximum time in ms to keep an unused voice alive
        cleanupInterval: 60000,     // Interval in ms to run voice cleanup
        maxPolyphonyStandard: 8,    // Reduced default max polyphony for better performance
        maxPolyphonyHigh: 8,        // Set to 8 voices even for high-performance devices
        maxPolyphonyLow: 4          // Reduced to 4 for low-performance devices
    },
    
    // Initialize voice manager with system detection
    init() {
        // Adjust voice limits based on system capabilities
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
        const isLowPower = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isHighPower = hardwareConcurrency >= 8 && !isLowPower;
        
        // Set appropriate polyphony limits
        if (isLowPower) {
            this.options.maxPolyphonyStandard = this.options.maxPolyphonyLow;
        } else if (isHighPower) {
            this.options.maxPolyphonyStandard = this.options.maxPolyphonyHigh;
        }
        
        // Set up periodic cleanup to prevent memory leaks
        setInterval(() => this.cleanupVoices(), this.options.cleanupInterval);
        
        console.log(`Voice Manager initialized with max polyphony: ${this.options.maxPolyphonyStandard}`);
        return this;
    },
    
    // Register a new synth for voice management
    registerSynth(synth, type = "poly") {
        const id = this.generateId();
        this.activeVoices.set(id, {
            synth,
            type,
            maxVoices: type === "poly" ? this.options.maxPolyphonyStandard : 1,
            lastUsed: Date.now(),
            activeNotes: new Set()
        });
        
        // Configure voice stealing for polyphonic synths
        if (type === "poly" && synth.set) {
            synth.set({
                maxPolyphony: this.options.maxPolyphonyStandard,
                voice: { volume: -6 } // Slightly quieter to prevent clipping with many voices
            });
        }
        
        return id;
    },
    
    // Update a synth's status when used
    useSynth(id) {
        const synthInfo = this.activeVoices.get(id);
        if (synthInfo) {
            synthInfo.lastUsed = Date.now();
        }
    },
    
    // Track active notes for a synth
    noteOn(id, note) {
        const synthInfo = this.activeVoices.get(id);
        if (synthInfo) {
            synthInfo.activeNotes.add(note);
            synthInfo.lastUsed = Date.now();
        }
    },
    
    // Remove tracking for released notes
    noteOff(id, note) {
        const synthInfo = this.activeVoices.get(id);
        if (synthInfo) {
            synthInfo.activeNotes.delete(note);
            synthInfo.lastUsed = Date.now();
        }
    },
    
    // Cleanup unused voices to free resources
    cleanupVoices() {
        const now = Date.now();
        let totalVoices = 0;
        
        // Count total active voices
        this.activeVoices.forEach(info => {
            totalVoices += info.activeNotes.size || 1;
        });
        
        // If we're over the limit, aggressively clean up
        if (totalVoices > this.options.maxTotalVoices) {
            // Sort by least recently used
            const entries = Array.from(this.activeVoices.entries())
                .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
                
            // Dispose of oldest voices until we're under limit
            for (const [id, info] of entries) {
                if (totalVoices <= this.options.maxTotalVoices * 0.8) break;
                
                // Only dispose if no active notes and not the main synth
                if (info.activeNotes.size === 0 && info.synth !== window.synth) {
                    console.debug(`Disposing unused synth to free resources`);
                    if (info.synth.dispose) info.synth.dispose();
                    this.activeVoices.delete(id);
                    totalVoices--;
                }
            }
        }
        
        // Clean up synths not used for a while - but never the main synth
        this.activeVoices.forEach((info, id) => {
            // Skip if it's the main active synth
            if (info.synth === window.synth) {
                // Update lastUsed for the main synth to prevent it from timing out
                info.lastUsed = now;
                return;
            }
            
            if (info.activeNotes.size === 0 && 
                (now - info.lastUsed > this.options.voiceTimeout)) {
                
                console.debug(`Disposing idle synth after ${this.options.voiceTimeout}ms`);
                if (info.synth.dispose) info.synth.dispose();
                this.activeVoices.delete(id);
            }
        });
    },
    
    // Generate a unique ID for tracking synths
    generateId() {
        return `synth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

// Initialize the voice manager system
try {
    VoiceManager.init();
    
    // Create initial synth with voice management
    synth = createSynth();
    
    // Let the voice manager track it, but catch any potential errors
    try {
        const synthId = VoiceManager.registerSynth(synth, "poly");
        console.log("Voice manager initialized with synth ID:", synthId);
    } catch (e) {
        console.warn("Voice manager registration failed:", e);
        // We still have the synth, so the application will work
    }
} catch (e) {
    console.warn("Voice manager initialization failed:", e);
    // Fallback to create synth without voice management
    synth = createSynth("poly");
}

// Initialize the sequencer after synth creation
// This is important to ensure the sequencer has access to a valid synth
setupSequencer();
// Setup oscilloscope
const canvas = document.getElementById('oscilloscope');
const ctx = canvas.getContext('2d');

// Define color schemes for oscilloscope
const colorSchemes = [{
        bg: 'rgba(18, 18, 18, 0.3)',
        wave: '#00e5ff',
        name: 'Cyan'
    },
    {
        bg: 'rgba(20, 20, 30, 0.3)',
        wave: '#9d46ff',
        name: 'Purple'
    },
    {
        bg: 'rgba(10, 30, 15, 0.3)',
        wave: '#00c853',
        name: 'Green'
    },
    {
        bg: 'rgba(30, 15, 10, 0.3)',
        wave: '#ff6d00',
        name: 'Orange'
    },
    {
        bg: 'rgba(30, 10, 15, 0.3)',
        wave: '#ff1744',
        name: 'Red'
    },
    {
        bg: 'rgba(25, 25, 10, 0.3)',
        wave: '#ffab00',
        name: 'Amber'
    },
    {
        bg: 'rgba(10, 25, 25, 0.3)',
        wave: '#18ffff',
        name: 'Teal'
    },
    {
        bg: 'rgba(30, 10, 30, 0.3)',
        wave: '#d500f9',
        name: 'Pink'
    }
];

let currentColorSchemeIndex = 0;

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function drawOscilloscope() {
    // This is now just a setup function
    resizeCanvas();
    
    // Register the oscilloscope in the animation system
    animations.oscilloscope.element = canvas;
    animations.oscilloscope.context = ctx;
    animations.oscilloscope.active = true;
    
    // The actual drawing is now done in updateOscilloscope()
    console.log('Oscilloscope initialized in unified animation system');
}

// Add click event to change color scheme
document.querySelector('.oscilloscope').addEventListener('click', () => {
    currentColorSchemeIndex = (currentColorSchemeIndex + 1) % colorSchemes.length;

    // Create a notification element (this wasn't properly defined in the original code)
    const notification = document.createElement('div');
    notification.style.position = 'absolute';
    notification.style.top = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.background = 'rgba(0, 0, 0, 0.7)';
    notification.style.color = 'white';
    notification.style.padding = '5px 10px';
    notification.style.borderRadius = '4px';
    notification.style.fontSize = '12px';
    notification.textContent = `Color: ${colorSchemes[currentColorSchemeIndex].name}`;

    document.querySelector('.oscilloscope').appendChild(notification);

    // Remove notification after a short delay
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 1500);
});
drawOscilloscope();

// Store timeouts by note in a map of arrays
const sequencerActiveTimeouts = new Map(); // Note -> Array of timeout IDs


// Helper function to highlight a key when a note plays in the sequencer
function highlightKeyFromSequencer(note, duration = 0.2) { // Slightly shorter duration
    // Only proceed if it's a valid note
    if (!note) return;

    // Try multiple selectors to find the key
    const keyElement = document.querySelector(`.key[data-note="${note}"]`) ||
        document.querySelector(`.black-key[data-note="${note}"]`);

    if (!keyElement) return;

    // Add the active class to highlight the key
    keyElement.classList.add('active');

    // Store the timeout ID so we can clear it if needed
    const timeoutId = setTimeout(() => {
        // Get the current list of timeouts for this note
        const timeouts = sequencerActiveTimeouts.get(note) || [];
        
        // Remove this timeout from the list
        const index = timeouts.indexOf(timeoutId);
        if (index !== -1) {
            timeouts.splice(index, 1);
        }
        
        // If this was the last timeout, remove the highlight
        if (timeouts.length === 0) {
            keyElement.classList.remove('active');
            sequencerActiveTimeouts.delete(note);
        } else {
            // Otherwise, update the timeouts list
            sequencerActiveTimeouts.set(note, timeouts);
        }
    }, duration * 1000);

    // Add this timeout to the list for this note
    const timeouts = sequencerActiveTimeouts.get(note) || [];
    timeouts.push(timeoutId);
    sequencerActiveTimeouts.set(note, timeouts);
}

// Clear any active key highlights
function clearSequencerKeyHighlights() {
    sequencerActiveTimeouts.forEach((timeouts, note) => {
        // Clear all timeouts for this note
        timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        
        // Remove the 'active' class
        const keyElement = document.querySelector(`.key[data-note="${note}"]`) ||
            document.querySelector(`.black-key[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.remove('active');
        }
    });
    sequencerActiveTimeouts.clear();
}

// Generate notes from C3 to B4
const generateNotes = () => {
    const notes = [];
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (let octave = 1; octave <= 8; octave++) {  // Changed from 6 to 8
        noteNames.forEach(note => {
            notes.push(`${note}${octave}`);
        });
    }
    return notes;
};

// Create sequencer with proper note names
const createSequencer = () => {
    const sequencerElement = document.getElementById('sequencer');
    const notes = generateNotes();

    // Clear existing steps
    sequencerElement.innerHTML = '';

    for (let i = 0; i < 16; i++) {
        const step = document.createElement('div');
        step.className = 'step';
        step.setAttribute('data-step', i + 1);

        const led = document.createElement('div');
        led.className = 'step-led';
        step.appendChild(led);

        const select = document.createElement('select');
        // Add a data attribute to help with identifying
        select.setAttribute('data-step-select', i);

        notes.forEach(note => {
            const option = document.createElement('option');
            option.value = note;
            option.textContent = note;
            select.appendChild(option);
        });

        // Set default notes in an interesting pattern
        const noteIndex = i % notes.length;
        select.value = notes[noteIndex];

        step.appendChild(select);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'step-toggle active';
        toggle.textContent = 'On';
        toggle.onclick = () => {
            toggle.classList.toggle('active');
            toggle.textContent = toggle.classList.contains('active') ? 'On' : 'Off';
        };
        step.appendChild(toggle);

        sequencerElement.appendChild(step);
    }
};

const keyboardMouseHandlers = {
    // Handle mouse down on any key
    handleMouseDown: function(e) {
        // Find closest .key or .black-key parent
        const key = e.target.closest('.key, .black-key');
        if (!key) return;
        
        const note = key.getAttribute('data-note');
        if (!note) return;
        
        key.classList.add('active');
        
        // For polyphonic mode
        if (!activeNotes.has(note)) {
            activeNotes.add(note);
            if (synth && !synth.disposed) {
                // If arpeggiator is enabled, add the note to it
                if (isArpeggiatorEnabled) {
                    addNoteToArpeggiator(note);
                } else {
                    // Otherwise play normally
                    synth.triggerAttack(note);
                    updateVUMeter(0.8);
                }
            }
        }
    },
    
    // Handle mouse up on any key
    handleMouseUp: function(e) {
        // Find closest .key or .black-key parent
        const key = e.target.closest('.key, .black-key');
        if (!key) return;
        
        const note = key.getAttribute('data-note');
        if (!note) return;
        
        key.classList.remove('active');
        
        if (activeNotes.has(note)) {
            activeNotes.delete(note);
            if (synth && !synth.disposed) {
                // If arpeggiator is enabled, remove the note from it
                if (isArpeggiatorEnabled) {
                    removeNoteFromArpeggiator(note);
                } else {
                    synth.triggerRelease(note);
                }
            }
        }
    },
    
    // Handle mouse leave on any key
    handleMouseLeave: function(e) {
        // Find closest .key or .black-key parent
        const key = e.target.closest('.key, .black-key');
        if (!key || !key.classList.contains('active')) return;
        
        const note = key.getAttribute('data-note');
        if (!note) return;
        
        key.classList.remove('active');
        
        if (activeNotes.has(note)) {
            activeNotes.delete(note);
            if (synth && !synth.disposed) {
                synth.triggerRelease(note);
            }
        }
    }
};

// Create keyboard with polyphonic support - optimized for memory and performance
const createKeyboard = () => {
    const keyboardElement = document.getElementById('keyboard');
    if (!keyboardElement) return;
    
    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    // Full range from C1 to C8 regardless of device
    const startOctave = 1;
    const endOctave =8;

    // Clear keyboard and reset the key element cache
    keyboardElement.innerHTML = '';
    resetKeyboardCache();
    
    // Add event listeners to the keyboard container (event delegation)
    keyboardElement.addEventListener('mousedown', keyboardMouseHandlers.handleMouseDown);
    keyboardElement.addEventListener('mouseup', keyboardMouseHandlers.handleMouseUp);
    keyboardElement.addEventListener('mouseleave', keyboardMouseHandlers.handleMouseLeave);
    
    // Calculate key dimensions
    const isMobile = window.innerWidth <= 768;
    const keyWidth = isMobile ? 30 : 40; // Smaller on mobile
    
    // Create a container with fixed width to allow horizontal scrolling
    const keysContainer = document.createElement('div');
    keysContainer.className = 'keys-container';
    keysContainer.style.position = 'relative';
    keysContainer.style.display = 'flex';
    
    // Define black key positions (reused for each octave)
    const blackKeyPositions = [
        { after: 'C', note: 'C#' },
        { after: 'D', note: 'D#' },
        { after: 'F', note: 'F#' },
        { after: 'G', note: 'G#' },
        { after: 'A', note: 'A#' }
    ];
    
    // Create all white keys
    const whiteKeysFragment = document.createDocumentFragment();
    let whiteKeyCount = 0;
    
    for (let octave = startOctave; octave <= endOctave; octave++) {
        // Only create C for the last octave
        const octaveNotes = octave === endOctave ? ['C'] : notes;

        for (let i = 0; i < octaveNotes.length; i++) {
            const key = document.createElement('div');
            key.className = 'key';
            
            // Add special class for C keys (visual indicator)
            if (octaveNotes[i] === 'C') {
                key.classList.add('octave-start');
            }
            
            // Highlight keys in the current octave
            if (octave === (window.currentOctave || 4)) {
                key.classList.add('current-octave');
            }
            
            key.textContent = isMobile ? '' : `${octaveNotes[i]}${octave}`;
            key.setAttribute('data-note', `${octaveNotes[i]}${octave}`);
            
            // Set fixed width instead of flex stretching
            key.style.width = `${keyWidth}px`;
            key.style.flex = '0 0 auto';
            
            whiteKeysFragment.appendChild(key);
            whiteKeyCount++;
        }
    }
    
    // Add all white keys to the container
    keysContainer.appendChild(whiteKeysFragment);
    
    // Now create and position black keys
    const blackKeysFragment = document.createDocumentFragment();
    const whiteKeys = keysContainer.querySelectorAll('.key');
    
    // Create black keys for each octave
    let whiteKeyIndex = 0;
    
    for (let octave = startOctave; octave <= endOctave; octave++) {
        // Skip black keys for the last octave (we only create C8)
        if (octave === endOctave) continue;
        
        for (let i = 0; i < notes.length; i++) {
            const whiteNote = notes[i];
            const blackKeyInfo = blackKeyPositions.find(pos => pos.after === whiteNote);
            
            if (blackKeyInfo) {
                const blackKey = document.createElement('div');
                blackKey.className = 'black-key';
                blackKey.setAttribute('data-note', `${blackKeyInfo.note}${octave}`);
                
                // Get the current white key
                const currentWhiteKey = whiteKeys[whiteKeyIndex];
                
                // Position using absolute positioning relative to the white key's left edge
                const leftOffset = keyWidth * 0.7; // Position black key 70% to the right of the white key
                blackKey.style.left = `${whiteKeyIndex * keyWidth + leftOffset}px`;
                blackKey.style.width = `${keyWidth * 0.6}px`; // 60% of white key width
                
                // Highlight keys in the current octave
                if (octave === (window.currentOctave || 4)) {
                    blackKey.classList.add('current-octave');
                }
                
                blackKeysFragment.appendChild(blackKey);
            }
            
            whiteKeyIndex++;
        }
    }
    
    // Add all black keys to the container
    keysContainer.appendChild(blackKeysFragment);
    
    // Add octave markers
    for (let octave = startOctave; octave <= endOctave; octave++) {
        const markerPos = (octave - startOctave) * 7 * keyWidth;
        
        const marker = document.createElement('div');
        marker.className = 'octave-marker';
        marker.textContent = `C${octave}`;
        marker.style.position = 'absolute';
        marker.style.bottom = '2px';
        marker.style.left = `${markerPos}px`;
        marker.style.fontSize = '10px';
        marker.style.color = 'rgba(255, 255, 255, 0.5)';
        marker.style.zIndex = '3';
        marker.style.pointerEvents = 'none';
        keysContainer.appendChild(marker);
    }
    
    // Add container to keyboard element
    keyboardElement.appendChild(keysContainer);
    
    // Enable horizontal scrolling
    keyboardElement.style.overflowX = 'auto';
    keyboardElement.style.overflowY = 'hidden';
    
    // Scroll to the current octave
    const scrollToOctave = window.currentOctave || 4;
    const scrollPosition = (scrollToOctave - startOctave) * 7 * keyWidth;
    setTimeout(() => {
        keyboardElement.scrollLeft = scrollPosition;
    }, 10);
    
    // Store keyboard API for external access
    window.keyboardAPI = {
        scrollToOctave: (octave) => {
            const scrollPos = (octave - startOctave) * 7 * keyWidth;
            keyboardElement.scrollTo({
                left: scrollPos,
                behavior: 'smooth'
            });
        },
        highlightCurrentOctave: (octave) => {
            // Remove highlighting from all keys
            document.querySelectorAll('.key.current-octave, .black-key.current-octave')
                .forEach(el => el.classList.remove('current-octave'));
            
            // Add highlighting to keys in current octave
            const octaveKeys = document.querySelectorAll(
                `.key[data-note^="A${octave}"], .key[data-note^="B${octave}"], .key[data-note^="C${octave}"], ` +
                `.key[data-note^="D${octave}"], .key[data-note^="E${octave}"], .key[data-note^="F${octave}"], ` +
                `.key[data-note^="G${octave}"], .black-key[data-note$="${octave}"]`
            );
            
            octaveKeys.forEach(key => key.classList.add('current-octave'));
        }
    };
    
    return window.keyboardAPI;
};

// Cached steps element reference for better performance
let cachedStepElements = null;

// Update sequencer visuals with optimized DOM access
const updateSequencer = (currentStep) => {
    // Cache the step elements if not already cached
    if (!cachedStepElements || cachedStepElements.length === 0) {
        cachedStepElements = document.querySelectorAll('.step');
    }
    
    // Update the active class for each step
    // This is more efficient than forEach and requerying each time
    for (let i = 0; i < cachedStepElements.length; i++) {
        if (i === currentStep) {
            if (!cachedStepElements[i].classList.contains('active')) {
                cachedStepElements[i].classList.add('active');
            }
        } else if (cachedStepElements[i].classList.contains('active')) {
            cachedStepElements[i].classList.remove('active');
        }
    }
};

// Function to reset sequencer step cache when the sequencer is rebuilt
function resetSequencerCache() {
    cachedStepElements = null;
}

// Setup all knobs and store their update functions
const knobUpdaters = {};
const knobs = [
    ['filterCutoffKnob', 'filterCutoff'],
    ['filterResKnob', 'filterRes'],
    ['attackKnob', 'attack'],
    ['decayKnob', 'decay'],
    ['sustainKnob', 'sustain'],
    ['releaseKnob', 'release'],
    ['reverbMixKnob', 'reverbMix'],
    ['reverbDecayKnob', 'reverbDecay'],
    ['delayTimeKnob', 'delayTime'],
    ['delayFeedbackKnob', 'delayFeedback'],
    ['tempoKnob', 'tempo'],
    ['oscillatorOctaveKnob', 'oscillatorOctave'],
    ['oscillatorSemiKnob', 'oscillatorSemi'],
    ['oscillatorLevelKnob', 'oscillatorLevel'],
    ['chorusMixKnob', 'chorusMix'],
    ['distortionMixKnob', 'distortionMix'],
    ['flangerMixKnob', 'flangerMix'],
    ['phaserMixKnob', 'phaserMix'],
    ['lfoRateKnob', 'lfoRate'],
    ['lfoAmountKnob', 'lfoAmount'],
    ['droneOctaveKnob', 'droneOctave'],
    ['droneVolumeKnob', 'droneVolume'],
    // Add the EQ knobs to the list
    ['eqLowKnob', 'eqLow'],
    ['eqMidKnob', 'eqMid'],
    ['eqHighKnob', 'eqHigh'],
    ['eqMidFreqKnob', 'eqMidFreq'],
    ['eqQKnob', 'eqQ'],
    // Add pulse width and FM Sine knobs
    ['pulseWidthKnob', 'pulseWidth'],
    ['harmonicityKnob', 'harmonicity'],
    ['modulationIndexKnob', 'modulationIndex'],
    // Add drum volume knobs
    ['kickVolumeKnob', 'kickVolume'],
    ['snareVolumeKnob', 'snareVolume'],
    ['hihatVolumeKnob', 'hihatVolume'],
    ['clapVolumeKnob', 'clapVolume'],
    ['compressorKnob', 'compressor'],
    ['stereoWidthKnob', 'stereoWidth'],
    ['masterVolumeKnob', 'masterVolume'],
    ['masterPanKnob', 'masterPan'],
    // Add arpeggiator knobs
    ['arpRateKnob', 'arpRate'],
    ['arpGateKnob', 'arpGate'],
    ['arpSwingKnob', 'arpSwing']
];

// Add detune and voices knobs to the knobs array
knobs.push(['detuneKnob', 'detune']);
knobs.push(['voicesKnob', 'voices']);

// Add to knobUpdaters for proper rotation handling
knobUpdaters.detune = (value) => {
    const min = -100;
    const max = 100;
    const normalizedValue = (value - min) / (max - min);
    const rotation = normalizedValue * 270 - 135;
    gsap.to(document.getElementById('detuneKnob'), {
        rotation: rotation,
        duration: 0.1
    });
};

knobUpdaters.voices = (value) => {
    const min = 1;
    const max = 8;
    const normalizedValue = (value - min) / (max - min);
    const rotation = normalizedValue * 270 - 135;
    gsap.to(document.getElementById('voicesKnob'), {
        rotation: rotation,
        duration: 0.1
    });
};

knobUpdaters.masterVolume = setupKnob('masterVolumeKnob', 'masterVolume');
knobUpdaters.masterPan = setupKnob('masterPanKnob', 'masterPan');

// Apply knob setup to all knobs at once
knobs.forEach(([knobId, inputId]) => {
    knobUpdaters[inputId] = setupKnob(knobId, inputId);
});

// ADSR Envelope Visualizer
function updateADSRVisualizer() {
    const svg = document.getElementById('adsrVisualizerSvg');
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    const attack = parseFloat(document.getElementById('attack').value);
    const decay = parseFloat(document.getElementById('decay').value);
    const sustain = parseFloat(document.getElementById('sustain').value);
    const release = parseFloat(document.getElementById('release').value);

    // Calculate widths for each segment
    const totalTime = attack + decay + 1 + release; // Add 1 for sustain display
    const attackWidth = (attack / totalTime) * width;
    const decayWidth = (decay / totalTime) * width;
    const sustainWidth = (1 / totalTime) * width;
    const releaseWidth = (release / totalTime) * width;

    // Calculate y positions (inverted, as 0,0 is top-left)
    const startY = height - 10; // Start near bottom
    const peakY = 10; // Attack peak near top
    const sustainY = height - 10 - (sustain * (height - 20)); // Sustain level

    // Create path
    const path = [
        `M0,${startY}`, // Start
        `L${attackWidth},${peakY}`, // Attack
        `L${attackWidth + decayWidth},${sustainY}`, // Decay
        `L${attackWidth + decayWidth + sustainWidth},${sustainY}`, // Sustain
        `L${attackWidth + decayWidth + sustainWidth + releaseWidth},${startY}` // Release
    ].join(' ');

    document.getElementById('adsrPath').setAttribute('d', path);
}

// Filter Response Curve
function updateFilterResponse() {
    const svg = document.getElementById('filterResponseSvg');
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    const filterType = document.getElementById('filterTypeToggle').checked ? "highpass" : "lowpass";
    const cutoff = parseFloat(document.getElementById('filterCutoff').value);
    const resonance = parseFloat(document.getElementById('filterRes').value);

    // Calculate log scale for x-axis (frequency)
    const frequencyToX = (freq) => {
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);
        const logPos = (Math.log10(freq) - minLog) / (maxLog - minLog);
        return logPos * width;
    };

    // Generate points for the filter curve
    const points = [];
    for (let freq = 20; freq <= 20000; freq = freq * 1.1) {
        const x = frequencyToX(freq);

        // Calculate filter response at this frequency
        let response = 0;
        if (filterType === "lowpass") {
            if (freq < cutoff) {
                response = 1;
            } else {
                // Simple rolloff model with resonance peak
                const ratio = cutoff / freq;
                response = ratio;
                if (Math.abs(freq - cutoff) < cutoff * 0.2) {
                    response += (resonance / 10) * (1 - Math.abs((freq - cutoff) / (cutoff * 0.2)));
                }
            }
        } else { // highpass
            if (freq > cutoff) {
                response = 1;
            } else {
                // Simple rolloff model with resonance peak
                const ratio = freq / cutoff;
                response = ratio;
                if (Math.abs(freq - cutoff) < cutoff * 0.2) {
                    response += (resonance / 10) * (1 - Math.abs((freq - cutoff) / (cutoff * 0.2)));
                }
            }
        }

        // Clamp response between 0 and 1.5 (for resonance peaks)
        response = Math.max(0, Math.min(1.5, response));

        // Convert to y coordinate (inverted, as 0,0 is top-left)
        const y = height - (response * (height * 0.8));
        points.push(`${x},${y}`);
    }

    // Create the filter curve path
    const path = `M0,${height} L${points.join(' L')} L${width},${height}`;
    document.getElementById('filterCurve').setAttribute('d', `M${points.join(' L')}`);

    // Create the filled area for the filter curve
    document.getElementById('filterArea').setAttribute('d', `M0,${height} L${points.join(' L')} L${width},${height} Z`);
}

// Improved EQ Response Curve Visualization
function updateEqResponse() {
    const svg = document.getElementById('eqResponseSvg');
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    // Get EQ parameters
    const lowGain = parseFloat(document.getElementById('eqLow').value);
    const midGain = parseFloat(document.getElementById('eqMid').value);
    const highGain = parseFloat(document.getElementById('eqHigh').value);
    const midFreq = parseFloat(document.getElementById('eqMidFreq').value);
    const q = parseFloat(document.getElementById('eqQ').value);

    // EQ crossover frequencies
    const lowMidCrossover = 400; // Fixed in Tone.EQ3
    const midHighCrossover = 2500; // Fixed in Tone.EQ3

    // Create a logarithmic scale for frequencies (20Hz - 20kHz)
    const freqToX = (freq) => {
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);
        const normalized = (Math.log10(freq) - minLog) / (maxLog - minLog);
        return normalized * width;
    };

    // Convert gain in dB to y-coordinate (0dB at center)
    const gainToY = (gain) => {
        // Scale to fit in the view (±12dB maps to 80% of height)
        const maxDb = 12;
        const scaledGain = Math.max(-maxDb, Math.min(maxDb, gain));
        // Map -12...12 to 80%...20% of height
        return height * (0.5 - (scaledGain / (maxDb * 2.5)));
    };

    // Generate the EQ curve points
    const points = [];

    // Generate points across the frequency spectrum
    for (let freq = 20; freq <= 20000; freq = freq * 1.05) { // Logarithmic steps
        const x = freqToX(freq);

        // Calculate the gain at this frequency
        let gain = 0;

        // Model the 3-band EQ with crossovers and Q factor
        if (freq < lowMidCrossover) {
            // Low band
            gain = lowGain;
            // Smooth transition to mid band
            if (freq > lowMidCrossover / 2) {
                const t = (freq - lowMidCrossover / 2) / (lowMidCrossover / 2);
                gain = lowGain * (1 - t) + midGain * t;
            }
        } else if (freq < midHighCrossover) {
            // Mid band with focus around midFreq
            gain = midGain;

            // Apply Q factor around the mid frequency center
            const octaveWidth = 1 / q;
            const freqRatio = freq / midFreq;
            const octaveDistance = Math.abs(Math.log2(freqRatio));

            // Smooth transition to low or high bands at crossover points
            if (freq < lowMidCrossover * 1.5) {
                const t = (freq - lowMidCrossover) / (lowMidCrossover * 0.5);
                gain = lowGain * (1 - t) + midGain * t;
            } else if (freq > midHighCrossover / 1.5) {
                const t = (freq - midHighCrossover / 1.5) / (midHighCrossover / 3);
                gain = midGain * (1 - t) + highGain * t;
            }

            // Apply the Q factor (which focuses the mid band around midFreq)
            if (octaveDistance < octaveWidth) {
                // If we're within the Q-affected region near midFreq
                const qIntensity = 1 - (octaveDistance / octaveWidth);
                // Emphasize the effect more for higher Q values
                const qEffect = midGain * qIntensity * (q / 3);
                gain = midGain + qEffect;
            }
        } else {
            // High band
            gain = highGain;
            // Smooth transition from mid band
            if (freq < midHighCrossover * 1.5) {
                const t = (freq - midHighCrossover) / (midHighCrossover * 0.5);
                gain = midGain * (1 - t) + highGain * t;
            }
        }

        const y = gainToY(gain);
        points.push(`${x},${y}`);
    }

    // Create the EQ curve path
    const pathStr = `M${points.join(' L')}`;
    document.getElementById('eqCurve').setAttribute('d', pathStr);

    // Create the filled area (from curve to the center line)
    const centerY = gainToY(0); // 0dB line
    document.getElementById('eqArea').setAttribute('d', `${pathStr} L${width},${centerY} L0,${centerY} Z`);

    // Update mid frequency marker position
    const midX = freqToX(midFreq);
    document.getElementById('eqMidMarker').setAttribute('x1', midX);
    document.getElementById('eqMidMarker').setAttribute('x2', midX);

    // Generate frequency grid and labels
    const freqGrid = document.getElementById('eqGrid');
    const labelsGroup = document.getElementById('eqLabels');

    // Clear existing grid lines and labels
    freqGrid.innerHTML = '';
    labelsGroup.innerHTML = '';

    // Major frequency points to show on the grid
    const freqPoints = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

    // Add frequency grid lines and labels
    freqPoints.forEach(freq => {
        const x = freqToX(freq);

        // Add vertical grid line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'eq-grid');
        line.setAttribute('x1', x);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', x);
        line.setAttribute('y2', height);
        freqGrid.appendChild(line);

        // Add frequency label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'eq-label');
        label.setAttribute('x', x);
        label.setAttribute('y', height - 5);

        // Format frequency for display
        let freqText = freq.toString();
        if (freq >= 1000) {
            freqText = (freq / 1000) + 'k';
        }

        label.textContent = freqText;
        labelsGroup.appendChild(label);
    });

    // Add gain labels on y-axis
    const gainPoints = [-12, -6, 0, 6, 12];
    gainPoints.forEach(gain => {
        const y = gainToY(gain);

        // Add horizontal grid line (except for 0dB which has its own line)
        if (gain !== 0) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'eq-grid');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', width);
            line.setAttribute('y2', y);
            freqGrid.appendChild(line);
        }

        // Add gain label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'eq-gain-label');
        label.setAttribute('x', 20);
        label.setAttribute('y', y + 3); // +3 to center text vertically
        label.textContent = gain + 'dB';
        labelsGroup.appendChild(label);
    });
}

// EQ visualization will be initialized in the main DOMContentLoaded handler

// Add event listeners for the EQ controls
document.getElementById('eqLow').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('eqLowValue').textContent = `${value.toFixed(1)} dB`;

    // Update the EQ3 low gain value
    eq.low.value = value;

    // Update the EQ visualization
    updateEqResponse();
});

document.getElementById('eqMid').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('eqMidValue').textContent = `${value.toFixed(1)} dB`;

    // Update the EQ3 mid gain value
    eq.mid.value = value;

    // Update the EQ visualization
    updateEqResponse();
});

document.getElementById('eqHigh').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('eqHighValue').textContent = `${value.toFixed(1)} dB`;

    // Update the EQ3 high gain value
    eq.high.value = value;

    // Update the EQ visualization
    updateEqResponse();
});

document.getElementById('eqMidFreq').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('eqMidFreqValue').textContent = `${value.toFixed(0)} Hz`;

    // Update the EQ visualization (mid frequency isn't directly accessible in Tone.EQ3)
    updateEqResponse();
});

document.getElementById('eqQ').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('eqQValue').textContent = value.toFixed(1);

    // Update the EQ visualization (Q factor isn't directly accessible in Tone.EQ3)
    updateEqResponse();
});

// Enhanced drum sound initialization with resource optimization
function initializeDrumSounds() {
    console.log("Initializing drum sounds with optimized resources...");
    
    // Create a dedicated drum processing chain using standard Tone.js objects
    // This helps isolate drum processing from the main synth
    const drumBus = new Tone.Gain(1);
    const drumCompressor = new Tone.Compressor({
        threshold: -20,
        ratio: 3,
        attack: 0.002,
        release: 0.15,
        knee: 10
    });
    
    // Connect the drum bus to the main output chain
    drumBus.connect(drumCompressor);
    drumCompressor.connect(eq);
    
    // Define drum presets as templates to avoid code duplication
    const drumPresets = {
        kick: {
            type: 'membrane',
            options: {
                pitchDecay: 0.05,
                octaves: 5,
                oscillator: {
                    type: 'sine'
                },
                envelope: {
                    attack: 0.001,
                    decay: 0.4,
                    sustain: 0.01,
                    release: 1.4,
                    attackCurve: 'exponential'
                }
            }
        },
        snare: {
            type: 'noise',
            options: {
                noise: {
                    type: 'white'
                },
                envelope: {
                    attack: 0.001,
                    decay: 0.2,
                    sustain: 0.02,
                    release: 0.4
                }
            }
        },
        hihat: {
            type: 'metal',
            options: {
                frequency: 200,
                envelope: {
                    attack: 0.001,
                    decay: 0.1,
                    release: 0.1
                },
                harmonicity: 5.1,
                modulationIndex: 32,
                resonance: 4000,
                octaves: 1.5
            },
            volume: -20
        },
        clap: {
            type: 'noise',
            options: {
                noise: {
                    type: 'pink'
                },
                envelope: {
                    attack: 0.001,
                    decay: 0.3,
                    sustain: 0,
                    release: 0.1
                }
            }
        },
        tom: {
            type: 'membrane',
            options: {
                pitchDecay: 0.2,
                octaves: 3,
                envelope: {
                    attack: 0.001,
                    decay: 0.2,
                    sustain: 0.01,
                    release: 0.8
                }
            }
        },
        rimshot: {
            type: 'metal',
            options: {
                frequency: 800,
                envelope: {
                    attack: 0.001,
                    decay: 0.05,
                    release: 0.05
                },
                harmonicity: 3,
                modulationIndex: 40,
                resonance: 3000,
                octaves: 1
            }
        },
        cowbell: {
            type: 'metal',
            options: {
                frequency: 800,
                envelope: {
                    attack: 0.001,
                    decay: 0.4,
                    release: 0.4
                },
                harmonicity: 5.1,
                modulationIndex: 16,
                resonance: 600,
                octaves: 0.4
            }
        },
        cymbal: {
            type: 'metal',
            options: {
                frequency: 250,
                envelope: {
                    attack: 0.001,
                    decay: 0.8,
                    release: 1.4
                },
                harmonicity: 8,
                modulationIndex: 40,
                resonance: 1000,
                octaves: 1.5
            }
        }
    };
    
    // Create and connect each drum sound using the factory pattern
    Object.entries(drumPresets).forEach(([name, preset]) => {
        // Create the appropriate synth type
        switch (preset.type) {
            case 'membrane':
                drumSounds[name] = new Tone.MembraneSynth(preset.options);
                break;
            case 'noise':
                drumSounds[name] = new Tone.NoiseSynth(preset.options);
                break;
            case 'metal':
                drumSounds[name] = new Tone.MetalSynth(preset.options);
                break;
        }
        
        // Apply volume adjustment if specified
        if (preset.volume !== undefined) {
            drumSounds[name].volume.value = preset.volume;
        }
        
        // Connect to drum bus instead of directly to EQ
        drumSounds[name].connect(drumBus);
    });
    
    // Add reference to the drum bus for future use
    drumSounds.bus = drumBus;
    drumSounds.compressor = drumCompressor;
    
    // Buffer optimization
    // Removed the shared resonance optimization as it might cause issues
    // We'll keep each sound independent for better stability
    
    console.log("Optimized drum sounds initialized:", Object.keys(drumSounds).filter(k => k !== 'bus' && k !== 'compressor'));
}

// Enhanced drum trigger system with optimized sound generation
// and improved performance characteristics
function triggerDrumSound(type) {
    // Validate the drum type before processing
    if (!type || !drumSounds[type]) {
        console.warn(`Invalid drum type: ${type}`);
        return;
    }
    
    // Auto-start audio context if needed
    if (Tone.context.state !== 'running') {
        console.log("Starting Tone.js audio context...");
        
        // Show visual indicator while audio is starting
        updateVUMeter(0.2);
        
        // Start audio context
        Tone.start().then(() => {
            console.log("Audio context started successfully");
            // Play the drum sound with a slight delay to ensure audio is ready
            setTimeout(() => playDrumSound(type), 50);
        }).catch(err => {
            console.error("Failed to start audio context:", err);
        });
    } else {
        // Audio context is running, play immediately
        playDrumSound(type);
    }
}

// Optimized drum sound playback with performance enhancements
function playDrumSound(type) {
    // Double-check the drum sound exists
    if (!drumSounds[type]) {
        console.error(`Drum sound '${type}' not initialized!`, Object.keys(drumSounds).filter(k => k !== 'bus' && k !== 'compressor'));
        return;
    }
    
    // Get volume with validation and fallback
    let volume;
    try {
        const volumeElement = document.getElementById(`${type}Volume`);
        volume = volumeElement ? parseFloat(volumeElement.value) : 0.7; // Default if element not found
    } catch (e) {
        console.warn(`Couldn't get volume for ${type}, using default`, e);
        volume = 0.7; // Fallback volume
    }
    
    // Volume safety check (prevent extreme values)
    volume = Math.max(0, Math.min(1, volume));
    
    // Use optimized drum triggering based on drum type
    try {
        // Get drum-specific settings from a central configuration
        const drumConfig = {
            'kick': { note: 'C1', duration: '8n', volumeScale: 1.0 },
            'snare': { note: null, duration: '8n', volumeScale: 1.0 },
            'hihat': { note: null, duration: '32n', volumeScale: 0.6 },
            'clap': { note: null, duration: '16n', volumeScale: 1.0 },
            'tom': { note: 'E2', duration: '8n', volumeScale: 1.0 },
            'rimshot': { note: null, duration: '32n', volumeScale: 1.0 },
            'cowbell': { note: null, duration: '8n', volumeScale: 1.0 },
            'cymbal': { note: null, duration: '16n', volumeScale: 1.0 }
        };
        
        const config = drumConfig[type] || { note: null, duration: '8n', volumeScale: 1.0 };
        
        // Set the volume first to ensure it's applied when the sound triggers
        const adjustedVolume = volume * config.volumeScale;
        drumSounds[type].volume.value = Tone.gainToDb(adjustedVolume);
        
        // Trigger the sound with appropriate parameters
        if (config.note) {
            // For pitched instruments (kick, tom)
            drumSounds[type].triggerAttackRelease(config.note, config.duration);
        } else {
            // For unpitched instruments (snare, hihat, etc.)
            drumSounds[type].triggerAttackRelease(config.duration);
        }
        
        // Update drum bus processing for dynamic compression
        // Only adjust if the compressor exists and has the expected properties
        if (drumSounds.compressor && typeof drumSounds.compressor.threshold !== 'undefined') {
            try {
                // Adjust compressor threshold based on overall drum activity
                // Lower threshold during busy sections
                const activeCount = document.querySelectorAll('.drum-pad.active').length;
                if (activeCount > 2) {
                    // For heavy drum activity, increase compression
                    if (typeof drumSounds.compressor.threshold.rampTo === 'function') {
                        drumSounds.compressor.threshold.rampTo(-25, 0.1);
                        drumSounds.compressor.ratio.rampTo(4, 0.1);
                    } else {
                        // Fallback if rampTo isn't available
                        drumSounds.compressor.threshold.value = -25;
                        drumSounds.compressor.ratio.value = 4;
                    }
                } else {
                    // For lighter drum activity, reduce compression
                    if (typeof drumSounds.compressor.threshold.rampTo === 'function') {
                        drumSounds.compressor.threshold.rampTo(-20, 0.2);
                        drumSounds.compressor.ratio.rampTo(3, 0.2);
                    } else {
                        // Fallback if rampTo isn't available
                        drumSounds.compressor.threshold.value = -20;
                        drumSounds.compressor.ratio.value = 3;
                    }
                }
            } catch (err) {
                // Silently handle errors to prevent breaking drum functionality
                console.debug('Error adjusting drum compression:', err);
            }
        }
        
        // Log success at debug level only
        if (window.DEBUG_AUDIO) {
            console.log(`Playing ${type} with volume ${adjustedVolume.toFixed(2)}`);
        }
    } catch (err) {
        console.error(`Error playing drum sound ${type}:`, err);
    }

    // Provide visual feedback using VU meter with scaled response
    // VU feedback is important for user interaction
    updateVUMeter(volume * 0.7);
    
    // Show visual feedback on the drum pad itself
    const drumPad = document.querySelector(`.drum-pad[data-sound="${type}"]`);
    if (drumPad) {
        // Add active class temporarily
        drumPad.classList.add('active');
        
        // Remove after animation completes
        setTimeout(() => {
            drumPad.classList.remove('active');
        }, 100);
    }
}

createSequencer();

// Create keyboard and initialize components in the main DOMContentLoaded handler at the bottom of the file


// Recalculate keyboard positions on window resize
window.addEventListener('resize', () => {
    // Small delay to ensure DOM has updated
    setTimeout(createKeyboard, 100);
});

let isPlaying = false;
// currentStep is already declared at the top of the file

// Connect UI controls to synth parameters
document.getElementById('waveform').addEventListener('change', e => {
    const waveformType = e.target.value;
    
    // Show/hide pulse width control based on selected waveform
    const pulseWidthContainer = document.getElementById('pulseWidthContainer');
    const harmonicityContainer = document.getElementById('harmonicityContainer');
    const modulationIndexContainer = document.getElementById('modulationIndexContainer');
    
    // Hide all special controls first
    pulseWidthContainer.style.display = 'none';
    harmonicityContainer.style.display = 'none';
    modulationIndexContainer.style.display = 'none';
    
    // Show relevant controls based on waveform type
    if (waveformType === 'pulse') {
        pulseWidthContainer.style.display = 'block';
    } else if (waveformType === 'fmsine') {
        harmonicityContainer.style.display = 'block';
        modulationIndexContainer.style.display = 'block';
        // Make sure mobile labels are applied when FM Sine is selected
        adjustFMSineLabelsForMobile();
    }
    
    // Configure oscillator with selected waveform
    if (waveformType === 'pulse') {
        // For pulse wave, include the width parameter
        const pulseWidth = parseFloat(document.getElementById('pulseWidth').value || 0.5);
        synth.set({
            oscillator: {
                type: waveformType,
                width: pulseWidth
            }
        });
    } else if (waveformType === 'fmsine') {
        // For FM sine, include harmonicity and modulationIndex parameters
        const harmonicity = parseFloat(document.getElementById('harmonicity').value || 1);
        const modulationIndex = parseFloat(document.getElementById('modulationIndex').value || 10);
        synth.set({
            oscillator: {
                type: waveformType,
                harmonicity: harmonicity,
                modulationIndex: modulationIndex
            }
        });
    } else {
        // For other waveforms, just set the type
        synth.set({
            oscillator: {
                type: waveformType
            }
        });
    }
    
    // Update LFO destination visibility based on waveform
    updateLfoDestinationOptions(waveformType);
});

// Add event listener for the pulse width knob
document.getElementById('pulseWidth').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('pulseWidthValue').textContent = value.toFixed(2);

    // Update the visual knob rotation
    if (knobUpdaters.pulseWidth) {
        knobUpdaters.pulseWidth(value);
    } else {
        // If the knob updater doesn't exist yet, create it
        const min = 0.05;
        const max = 0.95;
        const normalizedValue = (value - min) / (max - min);
        const rotation = normalizedValue * 270 - 135;
        gsap.to(document.getElementById('pulseWidthKnob'), {
            rotation: rotation,
            duration: 0.1
        });
    }

    // Update oscillator width parameter only if waveform is pulse
    if (document.getElementById('waveform').value === 'pulse') {
        synth.set({
            oscillator: {
                width: value
            }
        });
    }
});

// Add event listener for the harmonicity knob
document.getElementById('harmonicity').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('harmonicityValue').textContent = value.toFixed(1);

    // Update the visual knob rotation
    if (knobUpdaters.harmonicity) {
        knobUpdaters.harmonicity(value);
    } else {
        // If the knob updater doesn't exist yet, create it
        const min = 0.1;
        const max = 10;
        const normalizedValue = (value - min) / (max - min);
        const rotation = normalizedValue * 270 - 135;
        gsap.to(document.getElementById('harmonicityKnob'), {
            rotation: rotation,
            duration: 0.1
        });
    }

    // Update oscillator harmonicity parameter only if waveform is fmsine
    if (document.getElementById('waveform').value === 'fmsine') {
        synth.set({
            oscillator: {
                harmonicity: value
            }
        });
    }
});

// Add event listener for the modulation index knob
document.getElementById('modulationIndex').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('modulationIndexValue').textContent = value.toFixed(1);

    // Update the visual knob rotation
    if (knobUpdaters.modulationIndex) {
        knobUpdaters.modulationIndex(value);
    } else {
        // If the knob updater doesn't exist yet, create it
        const min = 0;
        const max = 50;
        const normalizedValue = (value - min) / (max - min);
        const rotation = normalizedValue * 270 - 135;
        gsap.to(document.getElementById('modulationIndexKnob'), {
            rotation: rotation,
            duration: 0.1
        });
    }

    // Update oscillator modulationIndex parameter only if waveform is fmsine
    if (document.getElementById('waveform').value === 'fmsine') {
        synth.set({
            oscillator: {
                modulationIndex: value
            }
        });
    }
});

// Filter type toggle
document.getElementById('filterTypeToggle').addEventListener('change', e => {
    const filterType = e.target.checked ? "highpass" : "lowpass";
    filter.type = filterType;
    document.getElementById('filterTypeState').textContent = e.target.checked ? "HP" : "LP";
    updateFilterResponse();
});

document.getElementById('filterCutoff').addEventListener('input', e => {
    filter.frequency.value = e.target.value;
    document.getElementById('filterCutoffValue').textContent = `${Math.round(e.target.value)} Hz`;
    updateFilterResponse();
});

document.getElementById('filterRes').addEventListener('input', e => {
    filter.Q.value = e.target.value;
    document.getElementById('filterResValue').textContent = parseFloat(e.target.value).toFixed(1);
    updateFilterResponse();
});

document.getElementById('reverbMix').addEventListener('input', e => {
    reverb.wet.value = e.target.value;
    document.getElementById('reverbMixValue').textContent = parseFloat(e.target.value).toFixed(2);
});

// New reverb decay control
document.getElementById('reverbDecay').addEventListener('input', e => {
    const value = parseFloat(e.target.value);

    // Update the display immediately for better UX
    document.getElementById('reverbDecayValue').textContent = `${value.toFixed(1)}s`;

    // We'll use a debounce approach to avoid recreating the reverb on every tiny change
    // Clear any pending reverb update
    if (window.reverbUpdateTimeout) {
        clearTimeout(window.reverbUpdateTimeout);
    }

    // Set a new timeout to update the reverb after a short delay
    window.reverbUpdateTimeout = setTimeout(() => updateReverb(value), 300); // 300ms debounce
});

document.getElementById('delayTime').addEventListener('input', e => {
    delay.delayTime.value = e.target.value;
    document.getElementById('delayTimeValue').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('delayFeedback').addEventListener('input', e => {
    delay.feedback.value = e.target.value;
    document.getElementById('delayFeedbackValue').textContent = parseFloat(e.target.value).toFixed(2);
});

// New effect controls
document.getElementById('chorusMix').addEventListener('input', e => {
    chorus.wet.value = e.target.value;
    document.getElementById('chorusMixValue').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('distortionMix').addEventListener('input', e => {
    distortion.wet.value = e.target.value;
    document.getElementById('distortionMixValue').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('flangerMix').addEventListener('input', e => {
    flanger.wet.value = e.target.value;
    document.getElementById('flangerMixValue').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('phaserMix').addEventListener('input', e => {
    phaser.wet.value = e.target.value;
    document.getElementById('phaserMixValue').textContent = parseFloat(e.target.value).toFixed(2);
});

// New oscillator control event listeners
document.getElementById('oscillatorOctave').addEventListener('input', e => {
    const value = parseInt(e.target.value);
    document.getElementById('oscillatorOctaveValue').textContent = value;
    updateDetune();
});

document.getElementById('oscillatorSemi').addEventListener('input', e => {
    const value = parseInt(e.target.value);
    document.getElementById('oscillatorSemiValue').textContent = value;
    updateDetune();
});

document.getElementById('oscillatorLevel').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('oscillatorLevelValue').textContent = value.toFixed(2);

    // Update oscillator level
    synth.set({
        volume: Tone.gainToDb(value)
    });
});

// Add detune control (fine tuning in cents)
document.getElementById('detune').addEventListener('input', e => {
    const value = parseInt(e.target.value);
    document.getElementById('detuneValue').textContent = value + " ¢";

    // Update knob rotation visually
    knobUpdaters.detune(value);

    // Apply fine detune (this is separate from octave/semitone detune)
    synth.set({
        oscillator: {
            detune: value // Fine detune in cents
        }
    });
});

// Add voices control
document.getElementById('voices').addEventListener('input', e => {
    const value = parseInt(e.target.value);
    document.getElementById('voicesValue').textContent = value;

    // Update knob rotation visually
    knobUpdaters.voices(value);

    // Create a new PolySynth with the specified number of voices
    // Store current oscillator settings
    const waveformType = document.getElementById('waveform').value;
    const level = parseFloat(document.getElementById('oscillatorLevel').value);
    const detune = parseInt(document.getElementById('detune').value);

    // Create a new PolySynth with the specified number of voices
    const oldSynth = synth;
    synth = new Tone.PolySynth({
        maxPolyphony: value,
        voice: Tone.Synth,
        options: {
            ...synthSettings,
            oscillator: {
                type: waveformType,
                detune: detune
            },
            volume: Tone.gainToDb(level)
        }
    });

    // Connect to the effects chain
    synth.connect(filter);

    // Apply octave/semitone detune
    updateDetune();

    // Properly dispose of the old synth to prevent memory leaks
    // First release all notes, then disconnect, then dispose
    if (oldSynth) {
        oldSynth.releaseAll();
        // Use a try-catch block to prevent errors if disposal fails
        try {
            setTimeout(() => {
                if (oldSynth) {
                    oldSynth.disconnect();
                    oldSynth.dispose();
                }
            }, 100);
        } catch (err) {
            console.warn('Error disposing synth:', err);
        }
    }
});

// ADSR controls
document.getElementById('attack').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    synth.set({
        envelope: {
            attack: value
        }
    });
    // Update common settings for recreating synths
    synthSettings.envelope.attack = value;
    document.getElementById('attackValue').textContent = `${value.toFixed(2)}s`;
    updateADSRVisualizer();
});

document.getElementById('decay').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    synth.set({
        envelope: {
            decay: value
        }
    });
    // Update common settings for recreating synths
    synthSettings.envelope.decay = value;
    document.getElementById('decayValue').textContent = `${value.toFixed(2)}s`;
    updateADSRVisualizer();
});

document.getElementById('sustain').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    synth.set({
        envelope: {
            sustain: value
        }
    });
    // Update common settings for recreating synths
    synthSettings.envelope.sustain = value;
    document.getElementById('sustainValue').textContent = value.toFixed(2);
    updateADSRVisualizer();
});

document.getElementById('release').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    synth.set({
        envelope: {
            release: value
        }
    });
    // Update common settings for recreating synths
    synthSettings.envelope.release = value;
    document.getElementById('releaseValue').textContent = `${value.toFixed(2)}s`;
    updateADSRVisualizer();
});

document.getElementById('startSequencer').addEventListener('click', async function() {
    if (!isPlaying) {
        try {
            // Start audio context
            await Tone.start();
            
            // Reset step counter to start from beginning
            currentStep = 15; // So it becomes 0 on first beat
            
            // IMPORTANT: Ensure the audio analyzers are connected
            ensureVisualizersConnected();
            
            // Ensure synth exists and is ready
            if (!synth || synth.disposed) {
                console.log("Recreating synth for sequencer");
                synth = createSynth();
            }
            
            // Reset and restart transport completely
            Tone.Transport.cancel(); // Cancel all scheduled events
            Tone.Transport.stop();
            setupSequencer(); // Recreate the sequencer events
            Tone.Transport.start();
            
            isPlaying = true;
            this.innerHTML = '<i class="fas fa-stop"></i><span>Stop</span>';
            this.classList.add('playing');
            
            // Force an update of the oscilloscope to ensure it's running
            if (animations && animations.oscilloscope && animations.oscilloscope.element) {
                updateOscilloscope(performance.now());
            }
            
            // Play a silent note to trigger audio processing
            synth.triggerAttackRelease("C4", 0.01, "+0.1", 0.01);
            
            // Kick-start the VU meter with a tiny pulse
            updateVUMeter(0.2);
        } catch (err) {
            console.error("Error starting sequencer:", err);
        }
    } else {
        isPlaying = false;
        this.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
        this.classList.remove('playing');
        
        // Stop transport rather than just setting isPlaying flag
        Tone.Transport.pause();
        
        // Clear any active key highlights when stopping
        clearSequencerKeyHighlights();
    }
});


document.getElementById('compressor').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('compressorValue').textContent = value.toFixed(2);

    // Map 0-1 to appropriate compression settings
    // When value is 0: no compression (threshold 0, ratio 1)
    // When value is 1: heavy compression (threshold -30, ratio 20)

    // Adjust threshold: 0 to -30 dB
    masterCompressor.threshold.value = value * -30;

    // Adjust ratio: 1 to 20
    masterCompressor.ratio.value = 1 + (value * 19);

    // For visual feedback, update VU meter slightly
    if (value > 0) {
        updateVUMeter(value * 0.5);
    }
});

// Add an event listener for the stereo width knob (add with other event listeners)
document.getElementById('stereoWidth').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('stereoWidthValue').textContent = value.toFixed(2);

    // Map the 0-2 range of the UI knob directly to the 0-1 range of the StereoWidener
    // 0 = mono (width of 0)
    // 1 = normal stereo (width of 0.5)
    // 2 = extra wide stereo (width of 1)
    stereoWidener.width.value = value / 2;

    // Simple compensation formula
    const compensation = 1 + (value * 0.3); // Adjust the 0.3 multiplier as needed
    widthCompensation.gain.value = compensation;

    // For visual feedback
    updateVUMeter(0.3);
});

document.getElementById('masterVolume').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('masterVolumeValue').textContent = value.toFixed(2);

    // Set the gain value directly (values from 0-1 work as-is with Tone.Gain)
    masterVolume.gain.value = value;

    // For visual feedback
    updateVUMeter(value * 0.5);
});

document.getElementById('masterPan').addEventListener('input', async (e) => {
    // Start audio context if it's not running
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }
    
    const value = parseFloat(e.target.value);
    masterPanner.pan.value = value;
        
    // Create a more descriptive pan display
    let displayText = "C"; // Center by default 

    if (value < -0.05) {
        // Left side
        const leftAmount = Math.abs(Math.round(value * 100));
        displayText = `L${leftAmount}`;
    } else if (value > 0.05) {
        // Right side
        const rightAmount = Math.round(value * 100);
        displayText = `R${rightAmount}`;
    }

    document.getElementById('masterPanValue').textContent = displayText;

    // Optional: Visual feedback
    updateVUMeter(0.3);
});

// The init patch with basic settings
const initPatch = {
    voiceMode: "poly",
    waveform: "sine",
    filterCutoff: "8000",
    filterRes: "1",
    filterType: false,
    reverbMix: "0.1",
    reverbDecay: "1.5",
    delayTime: "0.1",
    delayFeedback: "0.1",
    tempo: "120",
    attack: "0.01",
    decay: "0.1",
    sustain: "0.5",
    release: "0.5",
    oscillatorOctave: "0",
    oscillatorSemi: "0",
    oscillatorLevel: "0.8",
    detune: "0",
    chorusMix: "0",
    distortionMix: "0",
    flangerMix: "0",
    phaserMix: "0",
    lfoRate: "1",
    lfoAmount: "50",
    lfoDestination: "off",
    lfoWaveform: "sine",
    droneOctave: "-1",
    eqLow: "0",
    eqMid: "0",
    eqHigh: "0",
    eqMidFreq: "1000",
    eqQ: "1",
    compressor: "0",
    stereoWidth: "0.5",
    masterVolume: "0.25",
    masterPan: "0",
    sequencer: [{
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        }
    ]
};

// Init Patch button
document.getElementById('initPatchButton').addEventListener('click', function() {
    applyPreset(initPatch);

    // Visual feedback
    this.classList.add('success');
    setTimeout(() => {
        this.classList.remove('success');
    }, 1000);

    // If drone is active, reset it
    if (isDroneActive) {
        toggleDrone();
    }
});

// The currently active preset name
let activePresetName = null;

// Import optimized preset functions
import { getPresetByName, getPresetsByCategory, clearPresetCache } from './presets.js';

// Optimized preset initialization with lazy loading
function initializePresets() {
    // Use an initialization timestamp instead of console.time to avoid timer warnings
    const initStartTime = performance.now();
    
    // Apply the default preset 
    // Use the first preset or a specific default one if first is too complex
    const defaultPresetName = "Default";
    const defaultPreset = getPresetByName(defaultPresetName) || builtInPresets[0];
    
    applyPreset(defaultPreset.settings);
    activePresetName = defaultPreset.name;

    // Render the presets list with deferred loading for better startup performance
    setTimeout(() => {
        renderPresetList();
        
        // Log the time taken without using console.time/timeEnd
        const timeElapsed = performance.now() - initStartTime;
        console.log(`Preset initialization completed in ${timeElapsed.toFixed(2)}ms`);
    }, 100); // Short delay to improve initial page load performance
    
    // Pre-cache the most common preset categories for faster access later
    setTimeout(() => {
        // Do this in the background after initial load
        ['pad', 'lead', 'bass', 'keys'].forEach(category => {
            getPresetsByCategory(category);
        });
    }, 1000);
}

// Optimized preset list rendering with virtualization and on-demand loading
function renderPresetList() {
    const presetList = document.getElementById('presetList');
    if (!presetList) return;
    
    // Clear the list to avoid memory leaks from removed event listeners
    presetList.innerHTML = '';
    
    // Track presets by category for better organization
    const presetsByCategory = {};
    
    // Create preset item generator function for reuse
    const createPresetItem = (preset, isCustom = false) => {
        const presetItem = document.createElement('div');
        presetItem.className = 'preset-item' + (activePresetName === preset.name ? ' active' : '');
        
        // Add data attributes for filtering and sorting
        presetItem.dataset.name = preset.name;
        presetItem.dataset.category = preset.category;
        presetItem.dataset.custom = isCustom.toString();
        
        // Use efficient innerHTML for template (better than creating multiple elements)
        presetItem.innerHTML = `
            <i class="fas fa-music"></i>
            <span class="preset-name">${preset.name}</span>
            <span class="preset-tag ${preset.category}">${preset.category}</span>
        `;
        
        // Use event delegation pattern for better performance
        // The click handler is added to the container element instead of each preset item
        presetItem.addEventListener('click', () => {
            // Set as active (efficiently select only what we need)
            const activeItems = presetList.querySelectorAll('.preset-item.active');
            activeItems.forEach(item => item.classList.remove('active'));
            
            presetItem.classList.add('active');
            activePresetName = preset.name;

            // Show loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'preset-loading-indicator';
            loadingIndicator.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Loading...';
            presetItem.appendChild(loadingIndicator);

            // Apply the preset (get from cache if possible)
            const presetToApply = isCustom ? preset : getPresetByName(preset.name);
            applyPreset(initPatch);
            setTimeout(() => {
                applyPreset(presetToApply.settings);

                // Turn off drone if it's active
                if (isDroneActive) {
                    toggleDrone();
                }
                
                // Remove loading indicator
                presetItem.removeChild(loadingIndicator);
            }, 1000);
            
        });
        
        return presetItem;
    };
    
    // Group built-in presets by category for better organization
    builtInPresets.forEach(preset => {
        if (!presetsByCategory[preset.category]) {
            presetsByCategory[preset.category] = [];
        }
        presetsByCategory[preset.category].push(preset);
    });
    
    // Create category headers and add presets in custom order
    // Define the desired category order: pads, leads, keys, plucks, bass, fx, custom
    const categoryOrder = ['pad', 'lead', 'keys', 'pluck', 'bass', 'fx', 'drum', 'seq', 'ambient', 'arp'];
    // Get all categories and sort them according to the custom order (any categories not in the order array go at the end)
    const categories = Object.keys(presetsByCategory).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        // If both categories are in the list, sort by their position
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }
        // If only a is in the list, it comes first
        if (indexA !== -1) {
            return -1;
        }
        // If only b is in the list, it comes first
        if (indexB !== -1) {
            return 1;
        }
        // If neither is in the list, use alphabetical order
        return a.localeCompare(b);
    });
    
    categories.forEach(category => {
        // Create category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'preset-category-header';
        categoryHeader.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        presetList.appendChild(categoryHeader);
        
        // Add presets for this category
        presetsByCategory[category].forEach(preset => {
            presetList.appendChild(createPresetItem(preset));
        });
    });

    // Add custom presets with optimized localStorage access
    try {
        const customPresetsRaw = localStorage.getItem('customPresets');
        if (customPresetsRaw) {
            const customPresets = JSON.parse(customPresetsRaw);
            
            // Only render if there are custom presets
            if (customPresets && customPresets.length > 0) {
                // Add custom presets header
                const customHeader = document.createElement('div');
                customHeader.className = 'preset-category-header custom-header';
                customHeader.textContent = 'Custom Presets';
                presetList.appendChild(customHeader);
                
                // Add each custom preset
                customPresets.forEach(preset => {
                    presetList.appendChild(createPresetItem(preset, true));
                });
            }
        }
    } catch (e) {
        console.error('Error loading custom presets:', e);
        // Recover gracefully from corrupt localStorage data
        localStorage.removeItem('customPresets');
    }
}

// Function to perform a clean reset of the synth state
function performCleanReset() {
    console.log("Performing clean reset...");

    // Stop the sequencer if it's running
    if (isPlaying) {
        // Pause the transport
        Tone.Transport.pause();
        
        // Clear any active key highlights
        clearSequencerKeyHighlights();
        
        // Also update UI to show sequencer as stopped
        const playButton = document.getElementById('startSequencer');
        if (playButton) {
            playButton.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
            playButton.classList.remove('playing');
        }
        
        // Reset isPlaying flag
        isPlaying = false;
    }
   
 // Stop any playing notes
    if (synth) {
        synth.releaseAll();
    }
    
    // Reset LFO state
    if (window.lfoAnimationFrame) {
        cancelAnimationFrame(window.lfoAnimationFrame);
        window.lfoAnimationFrame = null;
    }
    
    // Reset step counter and sequencer state
    currentStep = 0;
    
    // Clear any held notes
    activeNotes.clear();
    activeComputerKeys.clear();
    sequencerActiveKeys.clear();
    
    // Clear any transports or scheduled events
    Tone.Transport.cancel();
    
    // Clear any pending timeouts for sequencer
    if (typeof sequencerActiveTimeouts !== 'undefined' && sequencerActiveTimeouts instanceof Map) {
        sequencerActiveTimeouts.forEach((timeoutIds) => {
            timeoutIds.forEach(id => clearTimeout(id));
        });
        sequencerActiveTimeouts.clear();
    }
    
    // Stop all LFO activity
    stopLfo();
    
    // Stop and restart audio context if needed
    if (Tone.context.state !== "running") {
        Tone.context.resume();
    }
    
    // Disconnect and reconnect audio nodes
    try {
        // Clean up existing connections
        masterVolume.disconnect();
        stereoWidener.disconnect();
        
        // Rebuild the audio chain
        stereoWidener.connect(masterVolume);
        masterVolume.toDestination();
        
        // Reconnect analysis nodes
        masterVolume.connect(window.waveform);
        stereoWidener.connect(window.fft);
    } catch (e) {
        console.warn("Error resetting audio connections:", e);
    }
    
    console.log("Clean reset completed");
}

// Apply a preset to the synth
function applyPreset(settings) {
    // Perform a clean reset before applying the new preset
    performCleanReset();
    
    // Update all parameters and trigger input events to update visuals
    Object.entries(settings).forEach(([key, value]) => {
        if (key !== 'sequencer' && key !== 'drumMachine') {
            if (key === 'filterType') {
                // Handle toggle separately
                document.getElementById('filterTypeToggle').checked = value;
                document.getElementById('filterTypeToggle').dispatchEvent(new Event('change'));
            } else if (key === 'waveform') {
                // For waveform, we need to trigger a change event to show/hide oscillator specific controls
                const input = document.getElementById(key);
                if (input) {
                    input.value = value;
                    input.dispatchEvent(new Event('input'));
                    input.dispatchEvent(new Event('change')); // Dispatch change event explicitly
                }
            // Special handling for FM Sine parameters if they're in the preset
            } else if ((key === 'harmonicity' || key === 'modulationIndex') && 
                      settings.waveform === 'fmsine') {
                const input = document.getElementById(key);
                if (input) {
                    input.value = value;
                    input.dispatchEvent(new Event('input'));
                }
            } else {
                const input = document.getElementById(key);
                if (input) {
                    input.value = value;
                    input.dispatchEvent(new Event('input'));

                    // Voice mode handling can be removed - always use poly mode
                    // We always use poly mode in this application
                }
            }
        }
    });

    // Update sequencer if available
    if (settings.sequencer) {
        const steps = document.querySelectorAll('.step');
        settings.sequencer.forEach((stepSetup, i) => {
            if (i < steps.length) {
                const step = steps[i];
                const select = step.querySelector('select');
                if (select && stepSetup.note) {
                    select.value = stepSetup.note;
                }

                const toggle = step.querySelector('.step-toggle');
                if (toggle) {
                    toggle.classList.toggle('active', stepSetup.active);
                    toggle.textContent = stepSetup.active ? 'On' : 'Off';
                }
            }
        });
    }

    // Add LFO settings loading near the end of the function
    if (settings.lfoDestination) {
        loadLfoPresetSettings(settings);
    }

    // Ensure synth settings is updated for recreating synths
    synthSettings.envelope.attack = parseFloat(document.getElementById('attack').value);
    synthSettings.envelope.decay = parseFloat(document.getElementById('decay').value);
    synthSettings.envelope.sustain = parseFloat(document.getElementById('sustain').value);
    synthSettings.envelope.release = parseFloat(document.getElementById('release').value);

    // Then recreate the synth to apply all settings consistently
    createSynth();

    // Update ADSR Visualizer
    updateADSRVisualizer();

    // Update Filter Response Curve
    updateFilterResponse();

    // Update EQ Response Curve
    updateEqResponse();
    
    // Ensure visualizers are connected after preset load
    ensureVisualizersConnected();

    // Update VU meter to provide visual feedback that preset was loaded
    updateVUMeter(0.6);
}

// Enhanced LFO Preset Loading Function
function loadLfoPresetSettings(settings) {
    // Ensure LFO-related settings are properly handled
    const lfoDestinationSelect = document.getElementById('lfoDestination');
    const lfoRateInput = document.getElementById('lfoRate');
    const lfoAmountInput = document.getElementById('lfoAmount');
    const lfoWaveformSelect = document.getElementById('lfoWaveform');

    // Default to off if no LFO settings found
    const lfoDestination = settings.lfoDestination || 'off';
    const lfoRate = settings.lfoRate || 1;
    const lfoAmount = settings.lfoAmount || 50;
    const lfoWaveform = settings.lfoWaveform || 'sine';
    const lfoSync = settings.lfoSync !== undefined ? settings.lfoSync : false;

    // Update destination options based on current waveform
    const currentWaveform = document.getElementById('waveform').value;
    updateLfoDestinationOptions(currentWaveform);

    // Check if the destination is valid for the current waveform
    const isDestinationAvailable = Array.from(lfoDestinationSelect.options)
        .find(opt => opt.value === lfoDestination && !opt.disabled);

    // Set all LFO-related controls
    // Only set the destination if it's valid for the current waveform
    if (isDestinationAvailable) {
        lfoDestinationSelect.value = lfoDestination;
    } else {
        lfoDestinationSelect.value = 'off';
    }
    
    lfoRateInput.value = lfoRate;
    lfoAmountInput.value = lfoAmount;
    lfoWaveformSelect.value = lfoWaveform;

    // Trigger change events to ensure proper initialization
    lfoDestinationSelect.dispatchEvent(new Event('change'));
    lfoRateInput.dispatchEvent(new Event('input'));
    lfoAmountInput.dispatchEvent(new Event('input'));
    lfoWaveformSelect.dispatchEvent(new Event('change'));
}

// Get the current setup
function getCurrentSetup() {
    const setup = {
        voiceMode: "poly", // Always using poly mode
        waveform: document.getElementById('waveform').value,
        filterCutoff: document.getElementById('filterCutoff').value,
        filterRes: document.getElementById('filterRes').value,
        filterType: document.getElementById('filterTypeToggle').checked,
        reverbMix: document.getElementById('reverbMix').value,
        reverbDecay: document.getElementById('reverbDecay').value,
        delayTime: document.getElementById('delayTime').value,
        delayFeedback: document.getElementById('delayFeedback').value,
        tempo: document.getElementById('tempo').value,
        attack: document.getElementById('attack').value,
        decay: document.getElementById('decay').value,
        sustain: document.getElementById('sustain').value,
        release: document.getElementById('release').value,
        oscillatorOctave: document.getElementById('oscillatorOctave').value,
        oscillatorSemi: document.getElementById('oscillatorSemi').value,
        oscillatorLevel: document.getElementById('oscillatorLevel').value,
        chorusMix: document.getElementById('chorusMix').value,
        distortionMix: document.getElementById('distortionMix').value,
        flangerMix: document.getElementById('flangerMix').value,
        phaserMix: document.getElementById('phaserMix').value,
        lfoDestination: document.getElementById('lfoDestination').value,
        lfoRate: document.getElementById('lfoRate').value,
        lfoAmount: document.getElementById('lfoAmount').value,
        lfoWaveform: document.getElementById('lfoWaveform').value,
        droneOctave: document.getElementById('droneOctave').value,
        eqLow: document.getElementById('eqLow').value,
        eqMid: document.getElementById('eqMid').value,
        eqHigh: document.getElementById('eqHigh').value,
        eqMidFreq: document.getElementById('eqMidFreq').value,
        eqQ: document.getElementById('eqQ').value,
        compressor: document.getElementById('compressor').value,
        stereoWidth: document.getElementById('stereoWidth').value,
        masterVolume: document.getElementById('masterVolume').value,
        masterPan: document.getElementById('masterPan').value,
        sequencer: Array.from(document.querySelectorAll('.step')).map(step => ({
            note: step.querySelector('select').value,
            active: step.querySelector('.step-toggle').classList.contains('active')
        })),
    };
    
    // Add waveform-specific parameters
    if (setup.waveform === 'pulse') {
        setup.pulseWidth = document.getElementById('pulseWidth').value;
    } else if (setup.waveform === 'fmsine') {
        setup.harmonicity = document.getElementById('harmonicity').value;
        setup.modulationIndex = document.getElementById('modulationIndex').value;
    }
    
    // Validate LFO destination based on current waveform
    // If destination is one of the waveform-specific controls but the waveform doesn't match, reset to 'off'
    if (setup.lfoDestination === 'pulseWidth' && setup.waveform !== 'pulse') {
        setup.lfoDestination = 'off';
    } else if ((setup.lfoDestination === 'harmonicity' || setup.lfoDestination === 'modulationIndex') && 
               setup.waveform !== 'fmsine') {
        setup.lfoDestination = 'off';
    }
    
    return setup;
}

// Modal handling for new preset
const presetModal = document.getElementById('presetModal');
const presetNameInput = document.getElementById('presetName');
const presetCategorySelect = document.getElementById('presetCategory');

document.getElementById('newPresetBtn').addEventListener('click', () => {
    presetModal.classList.add('active');
    presetNameInput.value = '';
    presetNameInput.focus();
});

document.getElementById('cancelPresetBtn').addEventListener('click', () => {
    presetModal.classList.remove('active');
});

document.getElementById('savePresetBtn').addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    if (!name) {
        alert('Please enter a name for your preset');
        return;
    }

    const category = presetCategorySelect.value;

    // Get current custom presets
    const customPresets = JSON.parse(localStorage.getItem('customPresets') || '[]');

    // Check if a preset with this name already exists
    const existingIndex = customPresets.findIndex(p => p.name === name);

    // Create the new preset
    const newPreset = {
        name,
        category,
        settings: getCurrentSetup()
    };

    // Update or add to the presets array
    if (existingIndex >= 0) {
        customPresets[existingIndex] = newPreset;
    } else {
        customPresets.push(newPreset);
    }

    // Save back to localStorage
    localStorage.setItem('customPresets', JSON.stringify(customPresets));

    // Close modal
    presetModal.classList.remove('active');

    // Set as active preset
    activePresetName = name;

    // Refresh the preset list
    renderPresetList();

    // Visual feedback
    const savePresetBtn = document.getElementById('newPresetBtn');
    savePresetBtn.classList.add('success');
    setTimeout(() => {
        savePresetBtn.classList.remove('success');
    }, 1000);
});

// Delete preset functionality
document.getElementById('deletePresetBtn').addEventListener('click', () => {
    // Check if a preset is selected and it's a custom preset (not built-in)
    const isBuiltIn = builtInPresets.some(p => p.name === activePresetName);
    if (!activePresetName || isBuiltIn) {
        alert('Please select a custom preset to delete');
        return;
    }

    if (confirm(`Are you sure you want to delete the preset "${activePresetName}"?`)) {
        // Get current custom presets
        const customPresets = JSON.parse(localStorage.getItem('customPresets') || '[]');

        // Remove the preset
        const filteredPresets = customPresets.filter(p => p.name !== activePresetName);

        // Save back to localStorage
        localStorage.setItem('customPresets', JSON.stringify(filteredPresets));

        // Reset active preset to first built-in preset
        activePresetName = builtInPresets[0].name;

        // Apply first built-in preset
        applyPreset(builtInPresets[0].settings);

        // Refresh the preset list
        renderPresetList();

        // Visual feedback
        const deletePresetBtn = document.getElementById('deletePresetBtn');
        deletePresetBtn.classList.add('success');
        setTimeout(() => {
            deletePresetBtn.classList.remove('success');
        }, 1000);
    }
});

document.getElementById('chaosButton').addEventListener('click', () => {
    // Randomize waveform
    const waveforms = ['sine', 'square', 'sawtooth', 'triangle', 'pulse', 'fmsine']; // removed , 'amsine', 'fatsawtooth', 'fatsquare'
    const randomWaveform = waveforms[Math.floor(Math.random() * waveforms.length)];
    const waveformInput = document.getElementById('waveform');
    waveformInput.value = randomWaveform;
    waveformInput.dispatchEvent(new Event('change'));

    // Randomize filter type
    document.getElementById('filterTypeToggle').checked = Math.random() > 0.5;
    document.getElementById('filterTypeToggle').dispatchEvent(new Event('change'));

    // Randomize drone type
    const droneTypes = ['oscillator', 'white', 'pink'];
    const randomDroneType = droneTypes[Math.floor(Math.random() * droneTypes.length)];
    const droneTypeInput = document.getElementById('droneType');
    droneTypeInput.value = randomDroneType;
    droneTypeInput.dispatchEvent(new Event('change'));

    // Randomize LFO waveform
    const lfoWaveforms = ['sine', 'triangle', 'square', 'sawtooth', 'random'];
    const randomLfoWaveform = lfoWaveforms[Math.floor(Math.random() * lfoWaveforms.length)];
    const lfoWaveformInput = document.getElementById('lfoWaveform');
    lfoWaveformInput.value = randomLfoWaveform;
    lfoWaveformInput.dispatchEvent(new Event('change'));

    // Randomize LFO destination (including a chance to turn it off)
    const lfoDestinations = [
        'off', 'oscillatorLevel', 'detune', 'filterCutoff', 'filterRes',
        'attack', 'decay', 'sustain', 'release',
        'reverbMix', 'reverbDecay', 'delayTime', 'delayFeedback',
        'chorusMix', 'flangerMix', 'phaserMix', 'distortionMix',
        'masterVolume', 'pan', 'stereoWidth'
    ];
    // Give more weight to actual destinations vs 'off'
    const randomLfoDestination = Math.random() > 0.2 ?
        lfoDestinations[Math.floor(Math.random() * lfoDestinations.length)] :
        'off';
    const lfoDestinationInput = document.getElementById('lfoDestination');
    lfoDestinationInput.value = randomLfoDestination;
    lfoDestinationInput.dispatchEvent(new Event('change'));

    // Randomize all knob values
    knobs.forEach(([knobId, inputId]) => {
        if (inputId === 'voices') return; // Skip randomizing voices

        const input = document.getElementById(inputId);
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const randomValue = Math.random() * (max - min) + min;
        input.value = randomValue;
        input.dispatchEvent(new Event('input'));
    });

    // Randomize sequencer notes
    const notes = generateNotes();
    document.querySelectorAll('.step select').forEach(select => {
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        select.value = randomNote;
    });

    // Randomize step toggles
    document.querySelectorAll('.step-toggle').forEach(toggle => {
        const shouldBeActive = Math.random() > 0.5;
        toggle.classList.toggle('active', shouldBeActive);
        toggle.textContent = shouldBeActive ? 'On' : 'Off';
    });

    // Visual feedback
    const chaosButton = document.getElementById('chaosButton');
    gsap.to(chaosButton, {
        scale: 1.1,
        duration: 0.1,
        yoyo: true,
        repeat: 1
    });

    // Handle drone state with randomization
    if (isDroneActive) {
        // If drone is active, turn it off
        toggleDrone();
    } else {
        // 30% chance to activate the drone when pressing Chaos
        if (Math.random() < 0.3) {
            toggleDrone(); // Randomly activate drone
        }
    }
});

// Performance-optimized parameter caching for Nudge button
const nudgeCache = {
    notes: null,
    parameters: null,
    stepSelects: null,
    initialized: false,
    
    // Initialize the cache
    init: function() {
        if (this.initialized) return;
        
        // Define parameter groups
        this.parameters = [
            {
                type: 'filter',
                elements: ['filterCutoff', 'filterRes'],
                inputs: {}, // Will store DOM elements
                knobs: {}
            },
            {
                type: 'reverb',
                elements: ['reverbMix', 'reverbDecay'],
                inputs: {},
                knobs: {}
            },
            {
                type: 'delay',
                elements: ['delayTime', 'delayFeedback'],
                inputs: {},
                knobs: {}
            },
            {
                type: 'oscillator',
                elements: ['oscillatorOctave', 'oscillatorSemi', 'oscillatorLevel'],
                inputs: {},
                knobs: {}
            },
            {
                type: 'modulation',
                elements: ['chorusMix', 'flangerMix', 'phaserMix', 'distortionMix'],
                inputs: {},
                knobs: {}
            },
            {
                type: 'eq',
                elements: ['eqLow', 'eqMid', 'eqHigh', 'eqMidFreq', 'eqQ'],
                inputs: {},
                knobs: {}
            },
            {
                type: 'filter type',
                elements: ['filterTypeToggle'],
                inputs: {}
            },
            // LFO parameters
            {
                type: 'lfo',
                elements: ['lfoRate', 'lfoAmount'],
                dropdowns: ['lfoWaveform', 'lfoDestination'],
                inputs: {},
                selects: {},
                knobs: {}
            },
            // ADSR parameters
            {
                type: 'adsr',
                elements: ['attack', 'decay', 'sustain', 'release'],
                inputs: {},
                knobs: {}
            },
            // Drone parameters
            {
                type: 'drone',
                elements: ['droneOctave', 'droneVolume'],
                dropdowns: ['droneType'],
                inputs: {},
                selects: {},
                knobs: {}
            }
        ];
        
        // Cache DOM elements for each parameter group
        this.parameters.forEach(param => {
            // Cache input elements
            if (param.elements) {
                param.elements.forEach(id => {
                    param.inputs[id] = document.getElementById(id);
                    
                    // Also cache knob elements when they exist
                    const knobId = `${id}Knob`;
                    const knob = document.getElementById(knobId);
                    if (knob) {
                        param.knobs[id] = knob;
                    }
                });
            }
            
            // Cache dropdown elements
            if (param.dropdowns) {
                param.dropdowns.forEach(id => {
                    param.selects[id] = document.getElementById(id);
                });
            }
        });
        
        // Special handling for step selectors - these are handled dynamically
        this.stepSelects = null;
        
        this.initialized = true;
    },
    
    // Reset the cache (call when DOM structure changes)
    reset: function() {
        this.initialized = false;
        this.stepSelects = null;
        this.parameters = null;
    },
    
    // Get step selects with lazy loading
    getStepSelects: function() {
        if (!this.stepSelects) {
            this.stepSelects = Array.from(document.querySelectorAll('.step select'));
        }
        return this.stepSelects;
    }
};

// Nudge button functionality - Memory optimized implementation
document.getElementById('nudgeButton').addEventListener('click', () => {
    // Initialize parameter cache if needed
    if (!nudgeCache.initialized) {
        nudgeCache.init();
    }
    
    // Get all available notes just once
    const notes = generateNotes();

    // Randomly select 1-3 parameter groups to modify (slightly increased from original 1-2)
    const numChanges = Math.floor(Math.random() * 3) + 1;
    const selectedParams = nudgeCache.parameters
        .sort(() => Math.random() - 0.5)
        .slice(0, numChanges);

    selectedParams.forEach(param => {
        if (param.type === 'notes') {
            // Get cached or fresh step selectors
            const stepSelects = nudgeCache.getStepSelects();
            if (!stepSelects || stepSelects.length === 0) return;
            
            // Modify 1-2 random step notes
            const numNoteChanges = Math.floor(Math.random() * 2) + 1;
            // Create a copy of the array to avoid modifying the cached one
            const randomSelects = [...stepSelects]
                .sort(() => Math.random() - 0.5)
                .slice(0, numNoteChanges);

            randomSelects.forEach(select => {
                const currentNote = select.value;
                const currentIndex = notes.indexOf(currentNote);
                const variation = Math.floor(Math.random() * 5) - 2; // -2 to +2 steps
                const newIndex = Math.max(0, Math.min(notes.length - 1, currentIndex + variation));
                select.value = notes[newIndex];

                // Visual feedback
                gsap.to(select, {
                    backgroundColor: 'rgba(98, 0, 234, 0.3)',
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1
                });
            });
        } else if (param.type === 'filter type') {
            // Handle toggle type controls
            const element = param.elements[Math.floor(Math.random() * param.elements.length)];
            const input = param.inputs[element]; // Use cached element
            if (!input) return;
            
            input.checked = Math.random() > 0.5;
            input.dispatchEvent(new Event('change'));

            // Visual feedback for toggle
            const toggleContainer = input.closest('.toggle-container');
            if (toggleContainer) {
                gsap.to(toggleContainer, {
                    opacity: 0.5,
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1
                });
            }
        } else if (param.dropdowns && param.dropdowns.length > 0) {
            // Handle parameters with both sliders and dropdowns (LFO and drone)

            // 50% chance to adjust a slider vs 50% chance to change a dropdown
            if (Math.random() > 0.5 && param.elements && param.elements.length > 0) {
                // Adjust a slider (similar to standard parameter handling)
                const element = param.elements[Math.floor(Math.random() * param.elements.length)];
                const input = param.inputs[element]; // Use cached element
                if (!input) return;
                
                // Get current value and constraints
                const currentValue = parseFloat(input.value);
                const range = parseFloat(input.max) - parseFloat(input.min);
                const variation = (Math.random() * 0.2 - 0.1) * range; // ±10% variation
                const newValue = Math.max(
                    parseFloat(input.min),
                    Math.min(parseFloat(input.max), currentValue + variation)
                );
                
                // Apply the change
                input.value = newValue;
                input.dispatchEvent(new Event('input'));

                // Visual feedback (using cached knob reference)
                const knob = param.knobs[element];
                if (knob) {
                    gsap.to(knob, {
                        boxShadow: '0 0 15px rgba(0, 229, 255, 0.8)',
                        duration: 0.3,
                        yoyo: true,
                        repeat: 1
                    });
                }
            } else if (param.dropdowns && param.dropdowns.length > 0) {
                // Change a dropdown - but only sometimes and only move to adjacent values
                const dropdown = param.dropdowns[Math.floor(Math.random() * param.dropdowns.length)];
                const select = param.selects[dropdown]; // Use cached element
                if (!select || !select.options || select.options.length === 0) return;
                
                const currentIndex = select.selectedIndex;

                // For most dropdowns, we'll shift by -1, 0, or 1 position
                let shift = Math.floor(Math.random() * 3) - 1;

                // Special case for LFO destination - don't shift too often,
                // as changing the destination is a more dramatic change
                if (dropdown === 'lfoDestination' && Math.random() < 0.7) {
                    shift = 0; // 70% chance to leave destination unchanged
                }

                // Only apply changes if needed
                if (shift !== 0) {
                    const newIndex = Math.max(0, Math.min(select.options.length - 1, currentIndex + shift));
                    select.selectedIndex = newIndex;
                    select.dispatchEvent(new Event('change'));

                    // Visual feedback
                    gsap.to(select, {
                        backgroundColor: 'rgba(0, 229, 255, 0.2)',
                        duration: 0.3,
                        yoyo: true,
                        repeat: 1
                    });
                }
            }
        } else {
            // Standard parameter handling (knobs/sliders)
            const element = param.elements[Math.floor(Math.random() * param.elements.length)];
            const input = param.inputs[element]; // Use cached element
            if (!input) return;
            
            const currentValue = parseFloat(input.value);
            const range = parseFloat(input.max) - parseFloat(input.min);
            const variation = (Math.random() * 0.2 - 0.1) * range; // ±10% variation
            const newValue = Math.max(
                parseFloat(input.min),
                Math.min(parseFloat(input.max), currentValue + variation)
            );
            input.value = newValue;
            input.dispatchEvent(new Event('input'));

            // Visual feedback using cached knob reference
            const knob = param.knobs[element];
            if (knob) {
                gsap.to(knob, {
                    boxShadow: '0 0 15px rgba(0, 229, 255, 0.8)',
                    duration: 0.3,
                    yoyo: true,
                    repeat: 1
                });
            }
        }
    });

    // Handle drone toggle with a small probability (less aggressive than CHAOS)
    // Only 10% chance to toggle drone state
    if (Math.random() < 0.1) {
        toggleDrone();
    }

    // Visual feedback for the button itself
    const nudgeButton = document.getElementById('nudgeButton');
    gsap.to(nudgeButton, {
        scale: 1.1,
        duration: 0.1,
        yoyo: true,
        repeat: 1
    });
});


// Declare globals at the top level to avoid initialization errors
// Global sequencer event ID to allow for proper cleanup
var sequencerEventId = null;

// More robust implementation of the sequencer
function setupSequencer() {
    // Clear any existing sequencer events to avoid duplicates
    if (sequencerEventId !== null) {
        try {
            Tone.Transport.clear(sequencerEventId);
        } catch (e) {
            console.warn("Error clearing previous sequencer event:", e);
        }
    }
    
    // Set the tempo from the UI
    const tempo = parseInt(document.getElementById('tempo').value || 120);
    Tone.Transport.bpm.value = tempo;
    
    // Create a counter variable within this closure to avoid any global state issues
    let localStepCounter = -1; // Start at -1 so first increment makes it 0
    
    // Reset the global currentStep to ensure consistent starting point
    currentStep = 0;
    
    // Use 8n like in the original version, not 16n
    sequencerEventId = Tone.Transport.scheduleRepeat(time => {
        // Use the local counter to keep track of steps
        localStepCounter = (localStepCounter + 1) % 16;
        
        // Update the global currentStep for visual feedback
        currentStep = localStepCounter;
        
        // Make sure visualizers are connected EVERY time we process a step
        ensureVisualizersConnected();
        
        if (isPlaying) {
            // Get the UI elements for this step
            const steps = document.querySelectorAll('.step');
            if (steps.length > currentStep) {
                const step = steps[currentStep];
                const select = step.querySelector('select');
                const toggle = step.querySelector('.step-toggle');
                
                // Only play if this step is toggled on
                if (toggle && toggle.classList.contains('active')) {
                    const note = select.value;
                    
                    // Check if synth exists and recreate if needed
                    if (!synth || synth.disposed) {
                        console.log("Recreating synth during sequencer playback");
                        synth = createSynth();
                    }
                    
                    // Play the note with the synth - use 8n like original
                    try {
                        // Schedule the audio at the specified time
                        synth.triggerAttackRelease(note, '8n', time);
                        
                        // Schedule visual updates to sync with audio using Tone.Draw
                        Tone.Draw.schedule(() => {
                            // Update VU meter at the exact time the note plays
                            updateVUMeter(0.8);
                            
                            // Highlight the corresponding key
                            highlightKeyFromSequencer(note, 0.25);
                            
                            // Visual feedback - also synchronized with audio
                            gsap.to(step, {
                                scale: 1.03,
                                duration: 0.1,
                                yoyo: true,
                                repeat: 1
                            });
                        }, time); // Use the same time as audio for perfect sync
                    } catch (e) {
                        console.warn("Error playing note from sequencer:", e);
                        // If error occurs, ensure visualizers are reconnected
                        ensureVisualizersConnected();
                    }
                }
                
                // Always update the visual display
                updateSequencer(currentStep);
                
                // Force oscilloscope update on each beat to keep visualizations running
                if (animations && animations.oscilloscope && animations.oscilloscope.element) {
                    updateOscilloscope(performance.now());
                }
            }
        }
    }, "8n"); // Use 8n to match the original version
}

// Call the setup function to initialize the sequencer
setupSequencer();

// Update tempo exactly as described
document.getElementById('tempo').addEventListener('input', (e) => {
    const tempo = parseInt(e.target.value);
    document.getElementById('tempoValue').textContent = `${tempo} BPM`;
    
    // Update Tone.js Transport BPM directly
    Tone.Transport.bpm.value = tempo;
});

// Set initial tempo - this is already done in setupSequencer so we don't need to duplicate it
// Tone.Transport.bpm.value is set when setupSequencer runs at initialization

// Add octave control with polyphony support
let currentOctave = 4;
window.currentOctave = currentOctave; // Make it accessible globally



// Create a more efficient keyboard handler with optimized event listeners and DOM access
// Create cached keyMap and DOM element lookup tables
const keyboardNoteMap = {
    'a': 'C',
    'w': 'C#',
    's': 'D',
    'e': 'D#',
    'd': 'E',
    'f': 'F',
    't': 'F#',
    'g': 'G',
    'y': 'G#',
    'h': 'A',
    'u': 'A#',
    'j': 'B',
    'k': 'C+1', // +1 octave
    'l': 'D+1'  // +1 octave
};

// Efficient DOM caching to reduce expensive lookups
const keyElementCache = new Map();

// Function to get key element with caching
function getKeyElement(note) {
    if (keyElementCache.has(note)) {
        return keyElementCache.get(note);
    }
    
    // Only do the DOM query if we don't have it cached
    const element = document.querySelector(`.key[data-note="${note}"]`) || 
                   document.querySelector(`.black-key[data-note="${note}"]`);
    
    if (element) {
        keyElementCache.set(note, element);
    }
    return element;
}

// Function to reset keyboard cache (call when keyboard is recreated)
function resetKeyboardCache() {
    keyElementCache.clear();
}

function updateOctaveIndicator(octave) {
    // Store old octave for comparison
    const oldOctave = currentOctave;
    
    // Cache the indicator element reference
    if (!updateOctaveIndicator.element) {
        updateOctaveIndicator.element = document.querySelector('.octave-indicator');
    }
    
    if (updateOctaveIndicator.element) {
        updateOctaveIndicator.element.textContent = octave;
    }
    
    // Update currentOctave and window.currentOctave
    currentOctave = octave;
    window.currentOctave = octave;
    
    // Update Quick Chord octave display as well
    const quickChordOctaveDisplay = document.getElementById('currentOctave');
    if (quickChordOctaveDisplay) {
        quickChordOctaveDisplay.textContent = `C${octave}`;
    }

    // Scroll and highlight keys if keyboard API is available
    if (window.keyboardAPI) {
        window.keyboardAPI.scrollToOctave(octave);
        window.keyboardAPI.highlightCurrentOctave(octave);
    }
        
    // This is the function that actually transposes the arpeggiator notes
    if (typeof updateArpeggiatorOctave === 'function') {
        updateArpeggiatorOctave(oldOctave, octave);
    }
}

// Optimized keyboard event handler
document.addEventListener('keydown', e => {
    // Toggle play/pause with spacebar
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling with spacebar
        document.getElementById('startSequencer').click(); // Simulate clicking the play button
        return;
    }

    if (e.repeat) return; // Prevent repeat triggers

    // Handle octave shifting with performance optimizations
    if (e.key === 'z' && currentOctave > 1) {
        const oldOctave = currentOctave;
        currentOctave--;
        updateOctaveIndicator(currentOctave);
        
        // Update arpeggiator notes to match new octave
        if (typeof updateArpeggiatorOctave === 'function') {
            updateArpeggiatorOctave(oldOctave, currentOctave);
        }
        
        // Simplified throttling optimization
        if (typeof animations !== 'undefined' && animations.settings) {
            try {
                animations.settings.throttleAmount += 1;
                setTimeout(() => {
                    animations.settings.throttleAmount -= 1;
                }, 100);
            } catch (e) { /* Silent fail */ }
        }
        return;
    }
    
    if (e.key === 'x' && currentOctave < 7) {
        const oldOctave = currentOctave;
        currentOctave++;
        updateOctaveIndicator(currentOctave);
        
        // Update arpeggiator notes to match new octave
        if (typeof updateArpeggiatorOctave === 'function') {
            updateArpeggiatorOctave(oldOctave, currentOctave);
        }
        
        // Simplified throttling optimization
        if (typeof animations !== 'undefined' && animations.settings) {
            try {
                animations.settings.throttleAmount += 1;
                setTimeout(() => {
                    animations.settings.throttleAmount -= 1;
                }, 100);
            } catch (e) { /* Silent fail */ }
        }
        return;
    }

    // Look up the note in our cached keyboard map
    const baseNote = keyboardNoteMap[e.key];
    if (!baseNote) return;
    
    // Generate the actual note with octave
    const note = baseNote.includes('+1') 
        ? `${baseNote.replace('+1', '')}${currentOctave + 1}` 
        : `${baseNote}${currentOctave}`;

    // Polyphonic mode - add new note if not already active
    if (!activeComputerKeys.has(e.key)) {
        activeComputerKeys.add(e.key);
        activeNotes.add(note);
        
        // Ensure synth exists before triggering
        if (synth && !synth.disposed) {
            if (isArpeggiatorEnabled) {
                // Add note to arpeggiator instead of playing directly
                addNoteToArpeggiator(note);
            } else {
                synth.triggerAttack(note);
                updateVUMeter(0.8);
            }
            
            // Update visual keyboard using cached element
            const keyElement = getKeyElement(note);
            if (keyElement) {
                keyElement.classList.add('active');
            }
        }
    }
});

document.addEventListener('keyup', e => {
    // Look up the note in our cached keyboard map
    const baseNote = keyboardNoteMap[e.key];
    if (!baseNote) return;
    
    // Generate the actual note with octave
    const note = baseNote.includes('+1') 
        ? `${baseNote.replace('+1', '')}${currentOctave + 1}` 
        : `${baseNote}${currentOctave}`;

    if (activeComputerKeys.has(e.key)) {
        activeComputerKeys.delete(e.key);
        activeNotes.delete(note);
        
        // Safe version of triggerRelease with error handling
        try {
            // Only trigger release if synth exists and isn't disposed
            if (synth && !synth.disposed) {
                if (isArpeggiatorEnabled) {
                    // Remove note from arpeggiator
                    removeNoteFromArpeggiator(note);
                } else {
                    synth.triggerRelease(note);
                }

                // Update visual keyboard using cached element
                const keyElement = getKeyElement(note);
                if (keyElement) {
                    keyElement.classList.remove('active');
                }
            } else {
                console.debug("Recreating synth after disposal");
                synth = createSynth("poly");
            }
        } catch (err) {
            console.debug("Recovering from synth error");
            try {
                synth = createSynth("poly");
            } catch (e) { /* Silent fail */ }
        }
    }
});

// Connect LFO controls
// Update these handlers to restart LFO when changed
document.getElementById('lfoRate').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('lfoRateValue').textContent = value.toFixed(2) + ' Hz';

    // Enhanced LFO visualizer has been removed

    // If LFO is running, restart it to apply new rate
    if (lfoActive) {
        restartLfo();
    }
});

document.getElementById('lfoAmount').addEventListener('input', function(e) {
    const amount = parseInt(e.target.value);
    document.getElementById('lfoAmountValue').textContent = `${amount}%`;
    
    // Enhanced LFO visualizer has been removed

    // Only restart if LFO is active
    if (lfoDestination !== 'off') {
        restartLfo();
    }
});

document.getElementById('lfoWaveform').addEventListener('change', function(e) {
    const waveform = e.target.value;
    
    // Enhanced LFO visualizer has been removed
    
    // Only restart if LFO is active
    if (lfoDestination !== 'off') {
        restartLfo();
    }
});

// Function to stop LFO
function stopLfo() {
    lfoActive = false;
    
    // Cancel any pending animation frame
    if (window.lfoAnimationFrame) {
        cancelAnimationFrame(window.lfoAnimationFrame);
        window.lfoAnimationFrame = null;
    }
    
    // Enhanced LFO visualizer has been removed
    
    console.log('LFO stopped');
}

// Function to restart LFO (for when parameters change)
function restartLfo() {
    stopLfo();
    startLfo();
}

// Function to start LFO
function startLfo() {
    // Don't start if destination is off
    if (lfoDestination === 'off') return;

    lfoActive = true;

    // Get parameter info
    const input = document.getElementById(lfoDestination);
    if (!input) return;

}

// Function to update audio parameter directly
function updateAudioParameter(paramId, value) {
    switch (paramId) {
        case 'filterCutoff':
            filter.frequency.value = value;
            document.getElementById('filterCutoffValue').textContent = `${Math.round(value)} Hz`;
            break;
        case 'filterRes':
            filter.Q.value = value;
            document.getElementById('filterResValue').textContent = parseFloat(value).toFixed(1);
            break;
        case 'oscillatorLevel':
            synth.set({
                volume: Tone.gainToDb(value)
            });
            document.getElementById('oscillatorLevelValue').textContent = value.toFixed(2);
            break;
        case 'pulseWidth':
            // Only apply if current waveform is pulse
            if (document.getElementById('waveform').value === 'pulse') {
                synth.set({
                    oscillator: {
                        width: value
                    }
                });
            }
            document.getElementById('pulseWidthValue').textContent = value.toFixed(2);
            break;
        case 'harmonicity':
            // Only apply if current waveform is fmsine
            if (document.getElementById('waveform').value === 'fmsine') {
                synth.set({
                    oscillator: {
                        harmonicity: value
                    }
                });
            }
            document.getElementById('harmonicityValue').textContent = value.toFixed(1);
            break;
        case 'modulationIndex':
            // Only apply if current waveform is fmsine
            if (document.getElementById('waveform').value === 'fmsine') {
                synth.set({
                    oscillator: {
                        modulationIndex: value
                    }
                });
            }
            document.getElementById('modulationIndexValue').textContent = value.toFixed(1);
            break;
        case 'reverbMix':
            reverb.wet.value = value;
            document.getElementById('reverbMixValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'reverbDecay':
            document.getElementById('reverbDecayValue').textContent = `${value.toFixed(1)}s`;
            // We don't change the actual reverb time continuously as it would create artifacts
            break;
        case 'delayTime':
            delay.delayTime.value = value;
            document.getElementById('delayTimeValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'delayFeedback':
            delay.feedback.value = value;
            document.getElementById('delayFeedbackValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'chorusMix':
            chorus.wet.value = value;
            document.getElementById('chorusMixValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'flangerMix':
            flanger.wet.value = value;
            document.getElementById('flangerMixValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'distortionMix':
            distortion.wet.value = value;
            document.getElementById('distortionMixValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'phaserMix':
            phaser.wet.value = value;
            document.getElementById('phaserMixValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'attack':
            synth.set({
                envelope: {
                    attack: value
                }
            });
            synthSettings.envelope.attack = value;
            document.getElementById('attackValue').textContent = `${value.toFixed(2)}s`;
            break;
        case 'decay':
            synth.set({
                envelope: {
                    decay: value
                }
            });
            synthSettings.envelope.decay = value;
            document.getElementById('decayValue').textContent = `${value.toFixed(2)}s`;
            break;
        case 'sustain':
            synth.set({
                envelope: {
                    sustain: value
                }
            });
            synthSettings.envelope.sustain = value;
            document.getElementById('sustainValue').textContent = value.toFixed(2);
            break;
        case 'release':
            synth.set({
                envelope: {
                    release: value
                }
            });
            synthSettings.envelope.release = value;
            document.getElementById('releaseValue').textContent = `${value.toFixed(2)}s`;
            break;
        case 'eqLow':
            eq.low.value = value;
            document.getElementById('eqLowValue').textContent = `${value.toFixed(1)} dB`;
            updateEqResponse();
            break;
        case 'eqMid':
            eq.mid.value = value;
            document.getElementById('eqMidValue').textContent = `${value.toFixed(1)} dB`;
            updateEqResponse();
            break;
        case 'eqHigh':
            eq.high.value = value;
            document.getElementById('eqHighValue').textContent = `${value.toFixed(1)} dB`;
            updateEqResponse();
            break;
        case 'eqMidFreq':
            document.getElementById('eqMidFreqValue').textContent = `${Math.round(value)} Hz`;
            updateEqResponse();
            break;
        case 'eqQ':
            document.getElementById('eqQValue').textContent = value.toFixed(1);
            updateEqResponse();
            break;
        case 'pan':
            masterPanner.pan.value = value;
            let displayText = "C"; // Center by default
            if (value < -0.05) {
                displayText = `L${Math.abs(Math.round(value * 100))}`;
            } else if (value > 0.05) {
                displayText = `R${Math.round(value * 100)}`;
            }
            document.getElementById('masterPanValue').textContent = displayText;
            break;
        case 'compressor':
            const compValue = value;
            masterCompressor.threshold.value = compValue * -30;
            masterCompressor.ratio.value = 1 + (compValue * 19);
            document.getElementById('compressorValue').textContent = compValue.toFixed(2);
            break;
        case 'arpRate':
            arpeggiatorSettings.rate = value;
            document.getElementById('arpRateValue').textContent = `${Math.round(value)} BPM`;
            if (isArpeggiatorEnabled) {
                updateArpeggiatorTiming();
            }
            break;
        case 'arpGate':
            arpeggiatorSettings.gate = value;
            document.getElementById('arpGateValue').textContent = `${Math.round(value)}%`;
            break;
        case 'arpSwing':
            arpeggiatorSettings.swing = value;
            document.getElementById('arpSwingValue').textContent = `${Math.round(value)}%`;
            break;            
        case 'stereoWidth':
            const widthValue = value;

            // Map 0-2 range to 0-1 width parameter
            if (widthValue <= 1) {
                // 0-1 range maps to mono-normal (0-0.5 width)
                stereoWidener.width.value = widthValue * 0.5;
            } else {
                // 1-2 range maps to normal-extra wide (0.5-1 width)
                stereoWidener.width.value = 0.5 + (widthValue - 1) * 0.5;
            }

            // Apply compensation gain
            if (widthValue > 1) {
                const compensation = 1 + (widthValue - 1) * 0.5;
                widthCompensation.gain.value = compensation;
            } else {
                widthCompensation.gain.value = 1;
            }

            document.getElementById('stereoWidthValue').textContent = widthValue.toFixed(2);
            break;
        case 'masterVolume':
            const volumeValue = value;
            masterVolume.gain.value = volumeValue;
            document.getElementById('masterVolumeValue').textContent = volumeValue.toFixed(2);
            break;
    }

    // Update visualizations if needed
    if (['filterCutoff', 'filterRes'].includes(paramId)) {
        updateFilterResponse();
    } else if (['attack', 'decay', 'sustain', 'release'].includes(paramId)) {
        updateADSRVisualizer();
    } else if (['eqLow', 'eqMid', 'eqHigh', 'eqMidFreq', 'eqQ'].includes(paramId)) {
        updateEqResponse();
    }
}


// Replace your LFO destination handler with this implementation
document.getElementById('lfoDestination').addEventListener('change', function(e) {
    // Stop any existing LFO animation
    stopLfo();

    // Get new destination
    const newDestination = e.target.value;

    // If turning off, we're done
    if (newDestination === 'off') {
        lfoDestination = 'off';
        
        // Update enhanced visualizer if available
        if (window.lfoOscilloscope) {
            window.lfoOscilloscope.updateParameters(undefined, undefined, undefined, 'off');
        }
        return;
    }

    // Store the destination
    lfoDestination = newDestination;

    // Store the base value
    const input = document.getElementById(newDestination);
    if (input) {
        lfoBaseValues[newDestination] = parseFloat(input.value);
    }
    
    // Enhanced LFO visualizer has been removed

    // Start the LFO
    startLfo();
});

// Completely revamped LFO Scope visualization
function initLfoScope() {
    const lfoScopeCanvas = document.getElementById('lfoScope');
    if (!lfoScopeCanvas) {
        console.error('LFO scope canvas not found');
        return;
    }

    // Store in animation system first
    animations.lfoScope.element = lfoScopeCanvas;
    animations.lfoScope.context = lfoScopeCanvas.getContext('2d');
    animations.lfoScope.active = true;
    
    // Set canvas dimensions explicitly
    lfoScopeCanvas.width = lfoScopeCanvas.parentElement.clientWidth;
    lfoScopeCanvas.height = 80; // Fixed height
    
    console.log('LFO scope initialized in unified animation system');
}

// Trigger initial LFO destination setup
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('lfoDestination').dispatchEvent(new Event('change'));
});

// Drone button event listener
document.getElementById('droneButton').addEventListener('click', toggleDrone);

// Drone octave control
document.getElementById('droneOctave').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('droneOctaveValue').textContent = value.toString();

    // If drone is active, update its pitch
    if (isDroneActive && droneSynth) {
        updateDronePitch();
    }
});

// Drone type select
document.getElementById('droneType').addEventListener('change', () => {
    // If drone is active, restart it with the new type
    if (isDroneActive) {
        stopDrone();
        startDrone();
    }
});

document.getElementById('droneVolume').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('droneVolumeValue').textContent = value.toFixed(2);

    // Update volume if drone is active
    if (isDroneActive && droneSynth) {
        droneSynth.volume.value = Tone.gainToDb(value);
    }
});

function toggleDrone() {
    const droneButton = document.getElementById('droneButton');
    const droneWave = document.getElementById('droneWave');

    if (isDroneActive) {
        stopDrone();
        droneButton.classList.remove('active');
        droneButton.innerHTML = '<i class="fas fa-power-off"></i><span>Start Drone</span>';
        droneWave.classList.remove('active');
    } else {
        startDrone();
        droneButton.classList.add('active');
        droneButton.innerHTML = '<i class="fas fa-power-off"></i><span>Stop Drone</span>';
        droneWave.classList.add('active');
    }

    isDroneActive = !isDroneActive;
}

function startDrone() {
    // Get current synth settings
    const droneType = document.getElementById('droneType').value;
    const droneVolume = parseFloat(document.getElementById('droneVolume').value);

    // Create appropriate drone based on type
    if (droneType === 'oscillator') {
        // Create a monophonic synth with current waveform
        const waveform = document.getElementById('waveform').value;

        droneSynth = new Tone.MonoSynth({
            oscillator: {
                type: waveform
            },
            envelope: {
                attack: 0.5,
                decay: 0.2,
                sustain: 1.0,
                release: 1.0
            },
            volume: Tone.gainToDb(droneVolume) // Set volume explicitly
        }).connect(filter); // Connect to the same effects chain

        // Start the drone with current note
        updateDronePitch();
        droneSynth.triggerAttack(getDroneNote());

    } else if (droneType === 'white' || droneType === 'pink') {
        // Create noise generator
        droneSynth = new Tone.Noise({
            type: droneType,
            volume: Tone.gainToDb(droneVolume) // Set volume explicitly
        }).connect(filter); // Connect to the same effects chain

        droneSynth.start();
    }

    // Visual feedback
    updateVUMeter(0.7);
}

function stopDrone() {
    if (droneSynth) {
        // For oscillator drone
        if (droneSynth instanceof Tone.MonoSynth) {
            droneSynth.triggerRelease();
            // Allow time for release to complete before disposal
            setTimeout(() => {
                if (droneSynth) {
                    droneSynth.dispose();
                    droneSynth = null;
                }
            }, 1000);
        }
        // For noise drone
        else {
            droneSynth.stop();
            droneSynth.dispose();
            droneSynth = null;
        }

        // Visual feedback
        updateVUMeter(0.3);
    }
}

function getDroneNote() {
    // Get base note from oscillator
    const oscillatorOctave = parseInt(document.getElementById('oscillatorOctave').value);
    const oscillatorSemi = parseInt(document.getElementById('oscillatorSemi').value);

    // Get drone octave offset
    const droneOctave = parseInt(document.getElementById('droneOctave').value);

    // Calculate the resulting octave (base octave + drone octave offset)
    // Default to octave 3 for the root note
    const resultOctave = 3 + oscillatorOctave + droneOctave;

    // Convert semitones to a note (C is the default)
    let rootNote = 'C';
    if (oscillatorSemi > 0) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        rootNote = notes[oscillatorSemi % 12];
    }

    // Return the complete note
    return `${rootNote}${resultOctave}`;
}

function updateDronePitch() {
    if (droneSynth && droneSynth instanceof Tone.MonoSynth) {
        // Update the pitch without re-triggering
        droneSynth.setNote(getDroneNote());
    }
}

// Add event listeners for the fine control cutoff slider
document.addEventListener('DOMContentLoaded', () => {
    const filterCutoff = document.getElementById('filterCutoff');
    const filterCutoffLow = document.getElementById('filterCutoffLow');
    const filterCutoffValue = document.getElementById('filterCutoffValue');

    // Update low slider when main slider changes
    filterCutoff.addEventListener('input', () => {
        const value = parseFloat(filterCutoff.value);
        // Only update low slider if main slider is within low range
        if (value <= 1000) {
            filterCutoffLow.value = value;
        }

        // Update filter and value display (existing functionality)
        if (filter) {
            filter.frequency.value = value;
        }
        filterCutoffValue.textContent = Math.round(value) + ' Hz';

        // Update filter response visualization (if it exists)
        if (typeof updateFilterResponse === 'function') {
            updateFilterResponse();
        }
    });

    // Update main slider when low slider changes
    filterCutoffLow.addEventListener('input', () => {
        const value = parseFloat(filterCutoffLow.value);
        filterCutoff.value = value;

        // Update filter and value display
        if (filter) {
            filter.frequency.value = value;
        }
        filterCutoffValue.textContent = Math.round(value) + ' Hz';

        // Update knob rotation
        if (knobUpdaters.filterCutoff) {
            knobUpdaters.filterCutoff(value);
        }

        // Update filter response visualization
        if (typeof updateFilterResponse === 'function') {
            updateFilterResponse();
        }
    });
});

// Add Quick Chord module octave switcher functionality
function setupChordOctaveSwitcher() {
    // Get octave control elements
    const decreaseOctaveBtn = document.getElementById('decreaseOctave');
    const increaseOctaveBtn = document.getElementById('increaseOctave');
    const currentOctaveDisplay = document.getElementById('currentOctave');

    // Skip if elements don't exist
    if (!decreaseOctaveBtn || !increaseOctaveBtn || !currentOctaveDisplay) {
        console.log('Chord octave controls not found in the DOM');
        return;
    }

    // Function to update octave
    function updateOctave(newOctave) {
        // Ensure octave stays within valid range
        newOctave = Math.max(1, Math.min(7, newOctave));

        // Call updateOctaveIndicator which now handles everything including arpeggiator updates
        updateOctaveIndicator(newOctave);
    }

    // Decrease octave button
    decreaseOctaveBtn.addEventListener('click', function() {
        updateOctave(window.currentOctave - 1);
    });

    // Increase octave button
    increaseOctaveBtn.addEventListener('click', function() {
        updateOctave(window.currentOctave + 1);
    });

    // Initialize display with the global currentOctave
    updateOctave(window.currentOctave || 4);
}

// Add Quick Chord functionality for playing chords
function setupChordPads() {
    // Chord type definitions (intervals from root)
    const chordTypes = {
        'maj': [0, 4, 7],      // Major (root, major 3rd, perfect 5th)
        'min': [0, 3, 7],      // Minor (root, minor 3rd, perfect 5th)
        'dim': [0, 3, 6],      // Diminished (root, minor 3rd, diminished 5th)
        'aug': [0, 4, 8],      // Augmented (root, major 3rd, augmented 5th)
        'sus2': [0, 2, 7],     // Suspended 2nd (root, major 2nd, perfect 5th)
        'sus4': [0, 5, 7],     // Suspended 4th (root, perfect 4th, perfect 5th)
        'maj7': [0, 4, 7, 11], // Major 7th (root, major 3rd, perfect 5th, major 7th)
        'min7': [0, 3, 7, 10], // Minor 7th (root, minor 3rd, perfect 5th, minor 7th)
        'dom7': [0, 4, 7, 10], // Dominant 7th (root, major 3rd, perfect 5th, minor 7th)
        'maj9': [0, 4, 7, 11, 14] // Major 9th (root, major 3rd, perfect 5th, major 7th, major 9th)
    };

    // Skip setup if the chord buttons are not in the DOM
    const chordButtons = document.querySelectorAll('.chord-button');
    const noteButtons = document.querySelectorAll('.note-button');
    
    if (chordButtons.length === 0 || noteButtons.length === 0) {
        console.log('Chord pads not found in the DOM');
        return;
    }

    let selectedChordType = null;
    let selectedNote = null;
    let activeChordTimeout = null;
    let holdModeActive = false;
    let lastPlayedChord = null;
    let bassNoteActive = false; // State for bass note toggle
    let bassSynth = null;       // Synth instance for bass note

    // Create HOLD and BASS NOTE buttons container
    const chordPadContainer = document.querySelector('.chord-buttons') || noteButtons[0].parentElement.parentElement;
    
    if (chordPadContainer) {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'chord-controls-container';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.gap = '10px';

        // HOLD button
        const holdBtnContainer = document.createElement('div');
        holdBtnContainer.className = 'hold-button-container';
        
        const holdBtn = document.createElement('button');
        holdBtn.id = 'chordHoldButton';
        holdBtn.className = 'chord-hold-button';
        holdBtn.innerHTML = '<i class="fas fa-hand-paper"></i> HOLD';
        holdBtn.title = 'Toggle chord hold mode';
        
        holdBtnContainer.appendChild(holdBtn);
        controlsContainer.appendChild(holdBtnContainer);

        // BASS NOTE button
        const bassBtnContainer = document.createElement('div');
        bassBtnContainer.className = 'bass-button-container';
        
        const bassBtn = document.createElement('button');
        bassBtn.id = 'bassNoteButton';
        bassBtn.className = 'bass-note-button';
        bassBtn.innerHTML = '<i class="fas fa-volume-down"></i> BASS';
        bassBtn.title = 'Toggle bass note';
        
        bassBtnContainer.appendChild(bassBtn);
        controlsContainer.appendChild(bassBtnContainer);

        // Add to DOM after chord pads
        chordPadContainer.parentNode.insertBefore(controlsContainer, chordPadContainer.nextSibling);

        // Hold button functionality
        holdBtn.addEventListener('click', function() {
            holdModeActive = !holdModeActive;
            this.classList.toggle('active', holdModeActive);
            
            if (!holdModeActive && lastPlayedChord) {
                if (synth && !synth.disposed) {
                    synth.releaseAll();
                    activeNotes.clear();
                    removeKeyboardHighlights();
                }
                if (bassSynth) {
                    stopBassNote();
                }
                lastPlayedChord = null;
            }
        });

        // Bass note button functionality - only toggles the state
        bassBtn.addEventListener('click', function() {
            bassNoteActive = !bassNoteActive;
            this.classList.toggle('active', bassNoteActive);
            // No automatic play here; bass note will play only when chord is played
        });
    }

    // Add click event to chord buttons
    chordButtons.forEach(button => {
        button.addEventListener('click', function() {
            chordButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            selectedChordType = this.getAttribute('data-chord-type');

            if (selectedChordType && selectedNote) {
                playChord(selectedNote, selectedChordType);
            }
        });
    });

    // Add click event to note buttons
    noteButtons.forEach(button => {
        button.addEventListener('click', function() {
            noteButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            selectedNote = this.getAttribute('data-note');

            if (selectedChordType && selectedNote) {
                playChord(selectedNote, selectedChordType);
            }
        });
    });

    // Function to play bass note
    function playBassNote(rootNote, duration = null) {
        if (!bassNoteActive) return; // Only play if bass note is toggled on

        if (!synth || synth.disposed) {
            synth = createSynth();
            if (!synth || synth.disposed) return;
        }

        if (bassSynth && !bassSynth.disposed) {
            bassSynth.triggerRelease();
            bassSynth.dispose();
        }

        bassSynth = new Tone.MonoSynth({
            oscillator: {
                type: 'sawtooth'
            },
            envelope: {
                attack: 0.1,
                decay: 0.2,
                sustain: 0.8,
                release: 1.0
            },
            filter: {
                frequency: 200,
                Q: 1
            },
            volume: -12
        }).connect(filter);

        const octave = parseInt(document.getElementById('currentOctave').textContent.replace(/\D/g, ''));
        const bassOctave = Math.max(1, octave - 1);
        const bassNote = `${rootNote}${bassOctave}`;

        if (duration) {
            bassSynth.triggerAttackRelease(bassNote, duration);
        } else {
            bassSynth.triggerAttack(bassNote);
        }

        highlightBassKey(bassNote);
    }

    // Function to stop bass note
    function stopBassNote() {
        if (bassSynth && !bassSynth.disposed) {
            bassSynth.triggerRelease();
            setTimeout(() => {
                if (bassSynth && !bassSynth.disposed) {
                    bassSynth.dispose();
                    bassSynth = null;
                }
            }, 1000);
        }
        removeBassKeyHighlight();
    }

    // Function to highlight bass key
    function highlightBassKey(note) {
        const keyElement = document.querySelector(`.key[data-note="${note}"], .black-key[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.add('active', 'bass-highlighted');
        }
    }

    // Function to remove bass key highlight
    function removeBassKeyHighlight() {
        document.querySelectorAll('.bass-highlighted').forEach(key => {
            key.classList.remove('active', 'bass-highlighted');
        });
    }

    // Modified highlightChordOnKeyboard
    function highlightChordOnKeyboard(notes) {
        removeKeyboardHighlights();
        if (activeChordTimeout) {
            clearTimeout(activeChordTimeout);
        }

        notes.forEach(noteWithOctave => {
            const keyElement = document.querySelector(`.key[data-note="${noteWithOctave}"], .black-key[data-note="${noteWithOctave}"]`);
            if (keyElement) {
                keyElement.classList.add('active', 'chord-highlighted');
            }
        });

        if (!holdModeActive) {
            activeChordTimeout = setTimeout(removeKeyboardHighlights, 500);
        }
    }

    // Function to remove keyboard highlights
    function removeKeyboardHighlights() {
        document.querySelectorAll('.chord-highlighted').forEach(key => {
            key.classList.remove('active', 'chord-highlighted', 'hold-active');
        });
        if (!bassNoteActive || !holdModeActive) {
            removeBassKeyHighlight();
        }
    }

    // Modified playChord to sync bass note with chord playback
    function playChord(note, chordType) {
        if (!chordTypes[chordType]) return;

        if (!synth || synth.disposed) {
            console.warn("Synth unavailable or disposed - recreating");
            synth = createSynth();
            if (!synth || synth.disposed) return;
        }

        try {
            const octave = parseInt(document.getElementById('currentOctave').textContent.replace(/\D/g, ''));
            const notes = chordTypes[chordType].map(interval => {
                const noteIndex = getNoteIndex(note);
                const newNoteIndex = noteIndex + interval;
                const newOctave = octave + Math.floor(newNoteIndex / 12);
                const newNote = getNoteFromIndex(newNoteIndex % 12);
                return `${newNote}${newOctave}`;
            });

            // Stop any existing bass note before playing new chord
            if (bassSynth) {
                stopBassNote();
            }

            if (activeNotes.size > 0) {
                synth.releaseAll();
                activeNotes.clear();
            }

            highlightChordOnKeyboard(notes);

            lastPlayedChord = {
                note: note,
                chordType: chordType,
                notes: notes
            };

            if (isArpeggiatorEnabled) {
                clearArpeggiatorNotes();
                notes.forEach(note => addNoteToArpeggiator(note));
                // Bass note doesn't make sense with arpeggiator, so skip it
            } else if (holdModeActive) {
                synth.triggerAttack(notes);
                document.querySelectorAll('.chord-highlighted').forEach(key => {
                    key.classList.add('hold-active');
                });
                if (activeChordTimeout) {
                    clearTimeout(activeChordTimeout);
                    activeChordTimeout = null;
                }
                if (bassNoteActive) {
                    playBassNote(note); // Play bass note without duration for hold
                }
            } else {
                synth.triggerAttackRelease(notes, "8n");
                if (bassNoteActive) {
                    playBassNote(note, "8n"); // Play bass note with same duration as chord
                }
            }

            notes.forEach(note => activeNotes.add(note));
            updateVUMeter(0.8);
        } catch (err) {
            console.warn("Error playing chord:", err);
            try {
                synth = createSynth();
            } catch (createErr) {
                console.error("Failed to recover synth after chord error:", createErr);
            }
        }
    }

    // Helper functions remain unchanged
    function getNoteIndex(note) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return notes.indexOf(note);
    }

    function getNoteFromIndex(index) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return notes[index];
    }
}

// Add module collapsible functionality
function setupCollapsibleModules() {
    const allModules = document.querySelectorAll('.module');
    
    allModules.forEach(moduleEl => {
        const moduleName = moduleEl.className.split(' ').find(cls => cls.endsWith('-module') || cls.endsWith('-container'));
        const headerEl = moduleEl.querySelector('.module-header');
        
        if (!headerEl) {
            console.log(`Header not found in module: ${moduleSelector}`);
            return;
        }
        
        // First, remove any existing collapse buttons and their event listeners
        const existingBtn = headerEl.querySelector('.module-collapse-btn');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        // Create a new collapse button
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'module-collapse-btn';
        collapseBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        collapseBtn.setAttribute('title', 'Collapse module');
        headerEl.appendChild(collapseBtn);
        
        // Add click handler using a separate function to ensure clean event binding
        const toggleCollapse = (event) => {
            event.stopPropagation();
            const wasCollapsed = moduleEl.classList.contains('collapsed');
            moduleEl.classList.toggle('collapsed');
            
            // Update the icon
            const icon = collapseBtn.querySelector('i');
            if (moduleEl.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
                collapseBtn.setAttribute('title', 'Expand module');
                
                // Special handling for sequencer module
                if (moduleEl.classList.contains('sequencer-container')) {
                    // Also hide keyboard and sequencer elements
                    const keyboard = document.getElementById('keyboard');
                    const sequencer = document.getElementById('sequencer');
                    
                    if (keyboard) keyboard.style.display = 'none';
                    if (sequencer) sequencer.style.display = 'none';
                }
            } else {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
                collapseBtn.setAttribute('title', 'Collapse module');
                
                // Special handling for sequencer module
                if (moduleEl.classList.contains('sequencer-container')) {
                    // Show keyboard and sequencer elements
                    const keyboard = document.getElementById('keyboard');
                    const sequencer = document.getElementById('sequencer');
                    
                    if (keyboard) keyboard.style.display = '';
                    if (sequencer) sequencer.style.display = '';
                }
            }
            
            // Add this to update animation visibility based on module state
            // For modules with canvas animations
            if (moduleName === 'oscilloscope' || moduleName === 'lfo') {
                // Get the animation key name
                const animKey = moduleName === 'oscilloscope' ? 'oscilloscope' :
                                moduleName === 'lfo' ? 'lfoScope' : 
                                moduleName === 'spectrum' ? 'spectrum' : 'particles';
                
                // Update active state in the animation system
                if (animations[animKey]) {
                    animations[animKey].active = !moduleEl.classList.contains('collapsed');
                    console.log(`${animKey} visibility updated: ${animations[animKey].active}`);
                }
            }
        };

        // Remove any existing event listeners (as best as we can)
        collapseBtn.replaceWith(collapseBtn.cloneNode(true));
        
        // Re-select the button after replacing it
        const newBtn = headerEl.querySelector('.module-collapse-btn');
        newBtn.addEventListener('click', toggleCollapse);
    });
    
    // Add a global keyboard shortcut for toggling all modules
    setupCollapseKeyboardShortcut();
}

// Function to toggle all module collapse states
function toggleAllModules(collapse) {
    // Get all modules
    const allModules = document.querySelectorAll('.module');
    
    allModules.forEach(moduleEl => {
        // Get the current state
        const isCollapsed = moduleEl.classList.contains('collapsed');
        
        // Only change if needed
        if (collapse && !isCollapsed) {
            // Collapse this module
            moduleEl.classList.add('collapsed');
            
            // Update the icon
            const icon = moduleEl.querySelector('.module-collapse-btn i');
            if (icon) {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
                icon.parentElement.setAttribute('title', 'Expand module');
            }
            
            // Handle sequencer specially
            if (moduleEl.classList.contains('sequencer-container')) {
                // Also hide keyboard and sequencer elements
                const keyboard = document.getElementById('keyboard');
                const sequencer = document.getElementById('sequencer');
                
                if (keyboard) keyboard.style.display = 'none';
                if (sequencer) sequencer.style.display = 'none';
            }
        } 
        else if (!collapse && isCollapsed) {
            // Expand this module
            moduleEl.classList.remove('collapsed');
            
            // Update the icon
            const icon = moduleEl.querySelector('.module-collapse-btn i');
            if (icon) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
                icon.parentElement.setAttribute('title', 'Collapse module');
            }
            
            // Handle sequencer specially
            if (moduleEl.classList.contains('sequencer-container')) {
                // Show keyboard and sequencer elements
                const keyboard = document.getElementById('keyboard');
                const sequencer = document.getElementById('sequencer');
                
                if (keyboard) keyboard.style.display = '';
                if (sequencer) sequencer.style.display = '';
            }
        }
    });
}

// Setup the keyboard shortcut for collapsing all modules
function setupCollapseKeyboardShortcut() {
    // Remove any existing event listener
    document.removeEventListener('keydown', handleCollapseKeypress);
    
    // Add a new event listener
    document.addEventListener('keydown', handleCollapseKeypress);
    
    console.log('Collapse keyboard shortcut (c) setup complete');
}

// Handle the keypress event
function handleCollapseKeypress(event) {
    // Check if it's the 'c' key and not in an input field
    if (event.key.toLowerCase() === 'c' && !['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) {
        event.preventDefault();
        
        // Determine the target state
        // If any module is expanded, collapse everything
        // If all modules are collapsed, expand everything
        const anyExpanded = Array.from(document.querySelectorAll('.module')).some(
            module => !module.classList.contains('collapsed')
        );
        
        // Toggle all modules based on the determined state
        toggleAllModules(anyExpanded);
        
        console.log(anyExpanded ? 'All modules collapsed' : 'All modules expanded');
    }
}

// Collapsible modules will be initialized in the main DOMContentLoaded handler

window.addEventListener('resize', function() {
    // Debounce resize operations
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    
    this.resizeTimeout = setTimeout(function() {
        // Update canvas dimensions
        const canvases = [
            animations.oscilloscope.element,
            animations.lfoScope.element
        ];
        
        canvases.forEach(canvas => {
            if (canvas && canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                // Height can be fixed or dynamic depending on the canvas
            }
        });
        
        // Enhanced LFO visualizer has been removed
        
        if (animations.isRunning) {
            if (animations.oscilloscope.element) updateOscilloscope(performance.now());
            if (animations.lfoScope.element) updateLfoScope(performance.now());
        }
        
        // Update FM Sine labels when window size changes
        adjustFMSineLabelsForMobile();
        
        console.log('Canvas dimensions and labels updated after resize');
    }, 250); // 250ms debounce
});

// Add drum pad click event listeners
function setupDrumPads() {
    // Get all drum pads
    const drumPads = document.querySelectorAll('.drum-pad');
    console.log(`Found ${drumPads.length} drum pads`);
    
    // Add click event listeners to each drum pad
    drumPads.forEach(pad => {
        const sound = pad.getAttribute('data-sound');
        pad.addEventListener('click', () => {
            console.log(`Drum pad clicked: ${sound}`);
            triggerDrumSound(sound);
        });
    });
}

// Create a unified DOMContentLoaded handler that consolidates all initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('SynthXR: Initializing application...');
    
    initAudioNodes();

    // Step 1: Initialize core systems
    initAnimationSettings();
    startAnimations();
    
    // Step 2: Create UI components
    createKeyboard();
    
    // Step 3: Initialize audio systems
    initializeDrumSounds();
    setupDrumPads();
    
    // Step 4: Initialize presets
    initializePresets();
    
    // Step 5: Initialize visualizations 
    updateADSRVisualizer();
    updateFilterResponse();
    updateEqResponse();
    initLfoScope();
    
    // Using basic LFO visualizer only
    
    // Step 6: Set up the sequencer
    if (typeof setupSequencer === 'function') {
        setupSequencer();
    }
    
    // Step 7: Initialize UI modules
    setupCollapsibleModules();
    setupChordOctaveSwitcher();
    setupChordPads();
    
    // Step 7.5: Initialize the arpeggiator
    initArpeggiator(knobUpdaters, synth, activeNotes);

    
    // Step 8: Update LFO destination options to include EQ parameters
    const lfoDestinationSelect = document.getElementById('lfoDestination');
    if (lfoDestinationSelect) {
        // Check if EQ options are already present
        if (!lfoDestinationSelect.querySelector('option[value="eqLow"]')) {
            const eqGroup = document.createElement('optgroup');
            eqGroup.label = 'EQ';
            
            // Add all EQ-related parameters
            const eqOptions = [
                { value: 'eqLow', text: 'EQ Low' },
                { value: 'eqMid', text: 'EQ Mid' },
                { value: 'eqHigh', text: 'EQ High' },
                { value: 'eqMidFreq', text: 'EQ Mid Freq' },
                { value: 'eqQ', text: 'EQ Q' }
            ];
            
            eqOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                eqGroup.appendChild(option);
            });
            
            lfoDestinationSelect.appendChild(eqGroup);
            console.log('Added EQ options to LFO destinations');
        }
    }
    
    // Step 9: Final adjustments
    adjustFMSineLabelsForMobile();
    
    // Initialize LFO destination options based on current waveform
    const currentWaveform = document.getElementById('waveform').value;
    updateLfoDestinationOptions(currentWaveform);
    
    // Step 10: Trigger initial setup events
    document.getElementById('lfoDestination').dispatchEvent(new Event('change'));
    
    // Add MIDI button for desktop (not mobile)
    addMidiButtonIfDesktop();
    
    // Add Help button
    addHelpButtonIfDesktop();

    console.log('SynthXR: Initialization complete');
});

// Function to add MIDI button if on desktop
function addMidiButtonIfDesktop() {
    // Check if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (!isMobile) {
        // Create MIDI button - position at top right corner
        const midiButton = document.createElement('button');
        midiButton.id = 'loadMidiButton';
        midiButton.className = 'midi-button';
        midiButton.innerHTML = '<i class="fas fa-keyboard"></i> MIDI';
        midiButton.title = 'Load MIDI Controller Support';
        
        // Add click handler to load MIDI module
        midiButton.addEventListener('click', loadMidiModule);
        
        // Append to body for fixed positioning
        document.body.appendChild(midiButton);
        console.log('MIDI button added for desktop');
    } else {
        console.log('Mobile detected, skipping MIDI button');
    }
}

// Flag to track if MIDI is loaded
let midiLoaded = false;

// Function to dynamically load MIDI module
function loadMidiModule() {
    // Get the MIDI module element
    const midiModule = document.querySelector('.midi-module');
    
    // Skip if already loaded
    if (midiLoaded) {
        // Toggle visibility if already loaded
        if (midiModule) {
            midiModule.classList.toggle('active');
            const isActive = midiModule.classList.contains('active');
            
            // Update button text based on module visibility
            const midiButton = document.getElementById('loadMidiButton');
            if (midiButton) {
                if (isActive) {
                    midiButton.innerHTML = '<i class="fas fa-keyboard"></i> Hide MIDI';
                } else {
                    midiButton.innerHTML = '<i class="fas fa-keyboard"></i> Show MIDI';
                }
            }
        }
        return;
    }
    
    console.log('Loading MIDI module...');
    const loadingIndicator = document.createElement('span');
    loadingIndicator.textContent = ' Loading...';
    loadingIndicator.className = 'midi-loading';
    
    const midiButton = document.getElementById('loadMidiButton');
    if (midiButton) {
        midiButton.disabled = true;
        midiButton.appendChild(loadingIndicator);
    }
    
    // Dynamically import MIDI module
    import('./midi.js')
        .then(midiModule => {
            // Store module exports in global scope for later use
            window.midiModule = midiModule;
            
            // Initialize MIDI
            return midiModule.initMIDI();
        })
        .then(() => {
            // Setup UI for MIDI controls
            setupMIDIControls();
            
            // Show the MIDI module
            const midiModuleElement = document.querySelector('.midi-module');
            if (midiModuleElement) {
                midiModuleElement.classList.add('active');
            }
            
            // Update button to show "Hide MIDI"
            if (midiButton) {
                midiButton.innerHTML = '<i class="fas fa-keyboard"></i> Hide MIDI';
                midiButton.classList.add('midi-loaded');
                midiButton.disabled = false;
            }
            
            midiLoaded = true;
            console.log('MIDI module loaded successfully');
        })
        .catch(error => {
            console.warn('Failed to load MIDI module:', error);
            
            // Update button to show error
            if (midiButton) {
                midiButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> MIDI Failed';
                midiButton.classList.add('midi-error');
                midiButton.title = 'Error loading MIDI. Click to try again.';
                midiButton.disabled = false;
            }
        });
}

// Update the setupMIDIControls function to use the dynamic imports
function setupMIDIControls() {
    // Skip if MIDI module is not loaded
    if (!window.midiModule) {
        console.warn('Cannot setup MIDI controls - module not loaded');
        return;
    }
    
    const { toggleLearnMode, setActiveDevice, clearAllMappings, exportMappings } = window.midiModule;
    
    // MIDI Learn toggle
    const midiLearnToggle = document.getElementById('midiLearnToggle');
    if (midiLearnToggle) {
        midiLearnToggle.addEventListener('click', (e) => {
            toggleLearnMode();
            e.preventDefault();
            e.stopPropagation();
        });
    }
    
    // Clear all mappings button
    const clearMappingsBtn = document.getElementById('clearMappingsBtn');
    if (clearMappingsBtn) {
        clearMappingsBtn.addEventListener('click', (e) => {
            clearAllMappings();
            e.preventDefault();
            e.stopPropagation();
        });
    }
    
    // Device selector
    const deviceSelector = document.getElementById('midiDeviceSelector');
    if (deviceSelector) {
        deviceSelector.addEventListener('change', () => {
            setActiveDevice(deviceSelector.value);
        });
    }
    
    // Export and import buttons
    const exportMappingsBtn = document.getElementById('exportMappingsBtn');
    if (exportMappingsBtn) {
        exportMappingsBtn.addEventListener('click', () => {
            exportMappings();
        });
    }
    
    // Show MIDI controls container if it exists
    const midiControlsContainer = document.getElementById('midiControlsContainer') || 
                                 document.querySelector('.midi-controls-container');
    if (midiControlsContainer) {
        midiControlsContainer.style.display = 'block';
    }
}

// Function to adjust FM Sine knob labels for mobile devices
function adjustFMSineLabelsForMobile() {
    // Check if the device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (isMobile) {
        // Get the label elements
        const harmonicityLabel = document.querySelector('label[for="harmonicity"], #harmonicityContainer .knob-label');
        const modulationIndexLabel = document.querySelector('label[for="modulationIndex"], #modulationIndexContainer .knob-label');
        
        // Change the labels if they exist
        if (harmonicityLabel) {
            harmonicityLabel.textContent = 'HARM';
        }
        
        if (modulationIndexLabel) {
            modulationIndexLabel.textContent = 'MOD';
        }
    }
}

// Function to update LFO destination options based on current waveform
function updateLfoDestinationOptions(currentWaveform) {
    // Get the LFO destination select element
    const lfoDestination = document.getElementById('lfoDestination');
    if (!lfoDestination) return;
    
    // Get all waveform-specific options
    const pulseWidthOption = Array.from(lfoDestination.options).find(opt => opt.value === 'pulseWidth');
    const harmonicityOption = Array.from(lfoDestination.options).find(opt => opt.value === 'harmonicity');
    const modulationIndexOption = Array.from(lfoDestination.options).find(opt => opt.value === 'modulationIndex');
    
    // First, disable all waveform-specific options
    if (pulseWidthOption) pulseWidthOption.disabled = true;
    if (harmonicityOption) harmonicityOption.disabled = true;
    if (modulationIndexOption) modulationIndexOption.disabled = true;
    
    // Then enable options based on current waveform
    if (currentWaveform === 'pulse' && pulseWidthOption) {
        pulseWidthOption.disabled = false;
    } else if (currentWaveform === 'fmsine') {
        if (harmonicityOption) harmonicityOption.disabled = false;
        if (modulationIndexOption) modulationIndexOption.disabled = false;
    }
    
    // If the currently selected option is now disabled, reset to 'off'
    if (lfoDestination.options[lfoDestination.selectedIndex].disabled) {
        lfoDestination.value = 'off';
        lfoDestination.dispatchEvent(new Event('change'));
    }
}


// Function to add Help button next to MIDI button
function addHelpButtonIfDesktop() {
    // Create Help button
    const helpButton = document.createElement('button');
    helpButton.id = 'helpButton';
    helpButton.className = 'help-button';
    helpButton.innerHTML = '<i class="fas fa-question-circle"></i> Help';
    helpButton.title = 'View Help and Instructions';
    
    // Add click handler to open help modal
    helpButton.addEventListener('click', openHelpModal);
    
    // Append to body for fixed positioning
    document.body.appendChild(helpButton);
    
    // Set up event listener for closing help modal
    document.getElementById('closeHelpBtn').addEventListener('click', () => {
        document.getElementById('helpModal').classList.remove('active');
    });
}

// Function to open help modal
function openHelpModal() {
    const helpModal = document.getElementById('helpModal');
    helpModal.classList.add('active');
}
