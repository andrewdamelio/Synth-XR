import {
    setupKnob,
    updateVUMeter
} from './utils.js';


// Create a centralized audio node factory
// This factory pattern improves efficiency and organization
// Using direct Tone.js objects for simplicity and compatibility
const AudioNodeFactory = {
    // Cache for storing created nodes and minimize duplications
    nodes: new Map(),
    
    // Method to create or retrieve nodes with optimization
    // Simplified to minimize potential errors
    getNode(type, config = {}) {
        try {
            const key = `${type}-${JSON.stringify(config)}`;
            
            // Return cached node if exists
            if (this.nodes.has(key)) {
                return this.nodes.get(key);
            }
            
            // Create new node based on type - using direct constructor approach for reliability
            let node;
            
            // Use simplified approach with try-catch for each type
            try {
                switch (type) {
                    case 'filter':
                        node = new Tone.Filter(
                            config.frequency || 2000, 
                            config.type || "lowpass"
                        );
                        break;
                    case 'reverb':
                        node = new Tone.Reverb();
                        if (config.decay) node.decay = config.decay;
                        if (config.wet !== undefined) node.wet.value = config.wet;
                        // No automatic generate to prevent startup delay
                        break;
                    case 'delay':
                        node = new Tone.FeedbackDelay();
                        if (config.delayTime) node.delayTime.value = config.delayTime;
                        if (config.feedback) node.feedback.value = config.feedback;
                        break;
                    case 'chorus':
                        node = new Tone.Chorus();
                        if (config.wet !== undefined) node.wet.value = config.wet;
                        node.start();
                        break;
                    case 'distortion':
                        node = new Tone.Distortion();
                        if (config.distortion) node.distortion = config.distortion;
                        if (config.wet !== undefined) node.wet.value = config.wet;
                        break;
                    case 'flanger':
                        // Use FeedbackDelay for flanger effect
                        node = new Tone.FeedbackDelay();
                        if (config.delayTime) node.delayTime.value = config.delayTime;
                        if (config.feedback) node.feedback.value = config.feedback;
                        if (config.wet !== undefined) node.wet.value = config.wet;
                        break;
                    case 'phaser':
                        node = new Tone.Phaser();
                        if (config.wet !== undefined) node.wet.value = config.wet;
                        break;
                    case 'eq':
                        node = new Tone.EQ3();
                        break;
                    case 'compressor':
                        node = new Tone.Compressor();
                        break;
                    case 'stereoWidener':
                        node = new Tone.StereoWidener();
                        if (config.width) node.width.value = config.width;
                        break;
                    case 'gain':
                        node = new Tone.Gain(config.gain || 1);
                        break;
                    case 'panner':
                        node = new Tone.Panner(config.pan || 0);
                        break;
                    case 'waveform':
                        node = new Tone.Waveform(config.size || 1024);
                        break;
                    case 'fft':
                        node = new Tone.FFT(config.size || 1024);
                        break;
                    default:
                        console.warn(`Unknown node type: ${type}, falling back to Gain node`);
                        node = new Tone.Gain(1);
                }
            } catch (nodeCreationError) {
                console.warn(`Error creating ${type} node:`, nodeCreationError);
                // Fallback to a simple gain node which is unlikely to cause issues
                node = new Tone.Gain(1);
            }
            
            // Cache and return the new node if we successfully created one
            if (node) {
                this.nodes.set(key, node);
                return node;
            } else {
                // Last resort fallback
                return new Tone.Gain(1);
            }
        } catch (err) {
            console.error("Critical error in getNode:", err);
            // Ultimate fallback - always return something that won't break the chain
            return new Tone.Gain(1);
        }
    },
    
    // Method to dispose nodes when no longer needed
    disposeNode(type, config = {}) {
        const key = `${type}-${JSON.stringify(config)}`;
        if (this.nodes.has(key)) {
            const node = this.nodes.get(key);
            node.dispose();
            this.nodes.delete(key);
            return true;
        }
        return false;
    },
    
    // Method to dispose all nodes (for cleanup)
    disposeAll() {
        this.nodes.forEach(node => {
            node.dispose();
        });
        this.nodes.clear();
    }
};

// Initialize audio processing components with the factory
let filter = AudioNodeFactory.getNode('filter', { frequency: 2000, type: "lowpass" });
let reverb = AudioNodeFactory.getNode('reverb', { decay: 2, wet: 0 });
let delay = AudioNodeFactory.getNode('delay', { delayTime: "8n", feedback: 0.5 });

// Initialize effects with better defaults and optimization
let chorus = AudioNodeFactory.getNode('chorus', { 
    frequency: 4, 
    delayTime: 2.5, 
    depth: 0.5,
    wet: 0
});

let distortion = AudioNodeFactory.getNode('distortion', { 
    distortion: 0.8, 
    wet: 0 
});

let flanger = AudioNodeFactory.getNode('flanger', { 
    delayTime: "8n", 
    feedback: 0.5,
    wet: 0
});

let phaser = AudioNodeFactory.getNode('phaser', {
    frequency: 0.5,
    octaves: 3,
    baseFrequency: 1000,
    wet: 0
});

// Initialize the EQ3 with improved defaults
let eq = AudioNodeFactory.getNode('eq', {
    low: 0,
    mid: 0,
    high: 0,
    lowFrequency: 400,
    highFrequency: 2500
});

// Initialize dynamics processing
let masterCompressor = AudioNodeFactory.getNode('compressor', {
    threshold: 0,
    ratio: 1,
    attack: 0.003,
    release: 0.25,
    knee: 30
});

// Initialize stereo processing
let stereoWidener = AudioNodeFactory.getNode('stereoWidener', {
    width: 0.5,
    wet: 1
});

let widthCompensation = AudioNodeFactory.getNode('gain', { gain: 1 });

// Initialize master section
let masterVolume = AudioNodeFactory.getNode('gain', { gain: 0.8 });
let masterPanner = AudioNodeFactory.getNode('panner', { pan: 0 });

// Create analysis nodes with optimized buffer sizes
const waveform = AudioNodeFactory.getNode('waveform', { size: 1024 });
const fft = AudioNodeFactory.getNode('fft', { size: 1024 });

// Initialize LFO tracking system
let lfoActive = false;
let lfoDestination = 'off';
let lfoBaseValues = {};
lfoBaseValues.pan = 0; // Default to center
lfoBaseValues.masterVolume = parseFloat(document.getElementById('masterVolume').value) // Current master volume

// Connect audio processing chain
// Note: Connection order is critical for the signal flow
masterPanner.connect(masterVolume);
masterVolume.toDestination();

// Build the main effects chain
filter.connect(chorus);
chorus.connect(distortion);
distortion.connect(flanger);
flanger.connect(phaser);
phaser.connect(reverb);
reverb.connect(delay);
delay.connect(eq);
eq.connect(masterCompressor);
masterCompressor.connect(stereoWidener);
stereoWidener.connect(widthCompensation);
widthCompensation.connect(masterPanner);

// Connect analysis nodes
masterVolume.connect(waveform);
stereoWidener.connect(fft);

// Add a helper function to ensure visualizers are properly connected
function ensureVisualizersConnected() {
    // Check if masterVolume and waveform are connected
    try {
        // First disconnect to prevent duplicate connections
        try {
            masterVolume.disconnect(waveform);
        } catch (e) {
            // Ignore error if they weren't connected
        }
        
        // Reconnect
        masterVolume.connect(waveform);
        
        // Check if stereoWidener and fft are connected
        try {
            stereoWidener.disconnect(fft);
        } catch (e) {
            // Ignore error if they weren't connected
        }
        
        // Reconnect
        stereoWidener.connect(fft);
        
        console.log("Visualizers reconnected");
    } catch (e) {
        console.warn("Error ensuring visualizer connections:", e);
    }
}

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

// Import throttle function from utils.js
import { throttle } from './utils.js';

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
    }
    
    // Performance monitoring in development mode
    if (window.DEBUG_PERFORMANCE && timestamp % 1000 < 16) {
        const fps = Math.round(1000 / elapsed);
        console.log(`FPS: ${fps}`);
    }
}

// Check if an element is visible in viewport and not collapsed
function isElementVisible(element) {
    if (!element) return false;
    
    // Check if parent module is collapsed
    const moduleParent = element.closest('.module');
    if (moduleParent && moduleParent.classList.contains('collapsed')) {
        return false;
    }
    
    // Check if element is in viewport
    const rect = element.getBoundingClientRect();
    return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        // Also check document visibility
        document.visibilityState === 'visible'
    );
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
    if (!element || !context || !waveform) return;
    
    const width = element.width;
    const height = element.height;
    const values = waveform.getValue();
    const currentScheme = colorSchemes[currentColorSchemeIndex];

    context.fillStyle = currentScheme.bg;
    context.fillRect(0, 0, width, height);

    context.beginPath();
    context.strokeStyle = currentScheme.wave;
    context.lineWidth = 2;

    for (let i = 0; i < values.length; i++) {
        const x = (i / values.length) * width;
        const y = ((values[i] + 1) / 2) * height;

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
    
    // Get current LFO settings
    const waveform = document.getElementById('lfoWaveform').value;
    const rate = parseFloat(document.getElementById('lfoRate').value);
    const amount = parseInt(document.getElementById('lfoAmount').value) / 100;
    
    const width = element.width;
    const height = element.height;
    const centerY = height / 2;
    
    // Clear the canvas
    context.clearRect(0, 0, width, height);
    
    // Draw background with gradient
    const bgGradient = context.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(15, 15, 20, 0.8)');
    bgGradient.addColorStop(1, 'rgba(20, 20, 30, 0.8)');
    context.fillStyle = bgGradient;
    context.fillRect(0, 0, width, height);

    // Horizontal center line (slightly brighter)
    context.beginPath();
    context.moveTo(0, centerY);
    context.lineTo(width, centerY);
    context.strokeStyle = 'rgba(150, 150, 200, 0.3)';
    context.stroke();

    // Horizontal grid lines
    context.strokeStyle = 'rgba(100, 100, 150, 0.1)';
    for (let y = height / 4; y < height; y += height / 4) {
        if (Math.abs(y - centerY) < 2) continue; // Skip center line
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    }

    // Vertical grid lines
    for (let x = 0; x < width; x += width / 8) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }

    // Calculate how many cycles to show based on rate
    const cyclesShown = 2; // Show 2 complete cycles

    // Create colored gradient for the waveform
    const waveGradient = context.createLinearGradient(0, width, 0, 0);

    // Different color schemes for different waveforms
    switch (waveform) {
        case 'sine':
            waveGradient.addColorStop(0, '#00e5ff');
            waveGradient.addColorStop(0.5, '#18ffff');
            waveGradient.addColorStop(1, '#00e5ff');
            break;
        case 'square':
            waveGradient.addColorStop(0, '#ff1744');
            waveGradient.addColorStop(0.5, '#ff5252');
            waveGradient.addColorStop(1, '#ff1744');
            break;
        case 'triangle':
            waveGradient.addColorStop(0, '#00c853');
            waveGradient.addColorStop(0.5, '#69f0ae');
            waveGradient.addColorStop(1, '#00c853');
            break;
        case 'sawtooth':
            waveGradient.addColorStop(0, '#ffab00');
            waveGradient.addColorStop(0.5, '#ffd740');
            waveGradient.addColorStop(1, '#ffab00');
            break;
        case 'random':
            waveGradient.addColorStop(0, '#d500f9');
            waveGradient.addColorStop(0.5, '#ea80fc');
            waveGradient.addColorStop(1, '#d500f9');
            break;
        default:
            waveGradient.addColorStop(0, '#00e5ff');
            waveGradient.addColorStop(1, '#00e5ff');
    }

    // Draw the waveform
    context.beginPath();

    // Calculate amplitude (capped at 80% of half-height for visibility)
    const amplitude = (height / 2) * 0.8 * amount;

    // Time is based on current time for animation
    const now = timestamp / 1000; // Current time in seconds

    // Starting position
    let startX = 0;
    let startY = 0;

    // Generate points for the waveform
    for (let x = 0; x <= width; x++) {
        // The x-position determines where in the cycle we are
        const t = (x / width) * (cyclesShown * Math.PI * 2) + (now * rate * Math.PI * 2);
        let y;

        switch (waveform) {
            case 'sine':
                y = centerY - Math.sin(t) * amplitude;
                break;
            case 'square':
                y = centerY - (Math.sin(t) > 0 ? 1 : -1) * amplitude;
                break;
            case 'triangle':
                y = centerY - (Math.asin(Math.sin(t)) * (2 / Math.PI)) * amplitude;
                break;
            case 'sawtooth':
                y = centerY - ((t % (Math.PI * 2)) / Math.PI - 1) * amplitude;
                break;
            case 'random':
                // For random, create stable random values at fixed intervals
                const segment = Math.floor(t / (Math.PI / 4)); // Change every 1/8th of cycle
                // Use sine of a large number to get pseudorandom value between -1 and 1
                const randValue = Math.sin(segment * 1000) * 2 - 1;
                y = centerY - randValue * amplitude;
                break;
            default:
                y = centerY - Math.sin(t) * amplitude;
        }

        if (x === 0) {
            startX = 0;
            startY = y;
            context.moveTo(x, y);
        } else {
            context.lineTo(x, y);
        }
    }

    // Close the path for filling
    context.lineTo(width, centerY);
    context.lineTo(0, centerY);
    context.closePath();

    // Fill with semi-transparent gradient
    const fillGradient = context.createLinearGradient(0, 0, 0, height);

    switch (waveform) {
        case 'sine':
            fillGradient.addColorStop(0, 'rgba(0, 229, 255, 0.2)');
            fillGradient.addColorStop(1, 'rgba(0, 229, 255, 0.05)');
            break;
        case 'square':
            fillGradient.addColorStop(0, 'rgba(255, 23, 68, 0.2)');
            fillGradient.addColorStop(1, 'rgba(255, 23, 68, 0.05)');
            break;
        case 'triangle':
            fillGradient.addColorStop(0, 'rgba(0, 200, 83, 0.2)');
            fillGradient.addColorStop(1, 'rgba(0, 200, 83, 0.05)');
            break;
        case 'sawtooth':
            fillGradient.addColorStop(0, 'rgba(255, 171, 0, 0.2)');
            fillGradient.addColorStop(1, 'rgba(255, 171, 0, 0.05)');
            break;
        case 'random':
            fillGradient.addColorStop(0, 'rgba(213, 0, 249, 0.2)');
            fillGradient.addColorStop(1, 'rgba(213, 0, 249, 0.05)');
            break;
        default:
            fillGradient.addColorStop(0, 'rgba(0, 229, 255, 0.2)');
            fillGradient.addColorStop(1, 'rgba(0, 229, 255, 0.05)');
    }

    context.fillStyle = fillGradient;
    context.fill();

    // Redraw the path with line only for a sharp edge
    context.beginPath();
    context.moveTo(startX, startY);

    for (let x = 0; x <= width; x++) {
        const t = (x / width) * (cyclesShown * Math.PI * 2) + (now * rate * Math.PI * 2);
        let y;

        switch (waveform) {
            case 'sine':
                y = centerY - Math.sin(t) * amplitude;
                break;
            case 'square':
                y = centerY - (Math.sin(t) > 0 ? 1 : -1) * amplitude;
                break;
            case 'triangle':
                y = centerY - (Math.asin(Math.sin(t)) * (2 / Math.PI)) * amplitude;
                break;
            case 'sawtooth':
                y = centerY - ((t % (Math.PI * 2)) / Math.PI - 1) * amplitude;
                break;
            case 'random':
                const segment = Math.floor(t / (Math.PI / 4));
                const randValue = Math.sin(segment * 1000) * 2 - 1;
                y = centerY - randValue * amplitude;
                break;
            default:
                y = centerY - Math.sin(t) * amplitude;
        }

        if (x === 0) {
            context.moveTo(x, y);
        } else {
            context.lineTo(x, y);
        }
    }

    // Set line style with glow effect
    context.strokeStyle = waveGradient;
    context.lineWidth = 2;
    context.shadowColor = waveform === 'sine' ? '#00e5ff' :
        waveform === 'square' ? '#ff1744' :
        waveform === 'triangle' ? '#00c853' :
        waveform === 'sawtooth' ? '#ffab00' : '#d500f9';
    context.shadowBlur = 5;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.stroke();

    // Draw current playhead position
    const cyclePosition = (now * rate) % 1;
    const playheadX = cyclePosition * (width / cyclesShown);

    context.beginPath();
    context.moveTo(playheadX, 0);
    context.lineTo(playheadX, height);
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = 1;
    context.shadowBlur = 0;
    context.stroke();

    // Annotate with frequency
    context.fillStyle = 'rgba(255, 255, 255, 0.7)';
    context.font = '10px sans-serif';
    context.textAlign = 'right';
    context.fillText(`${rate.toFixed(1)} Hz`, width - 5, height - 5);
    
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

// Optimized LFO modulation with reduced DOM access
function updateLfoModulation(timestamp) {
    if (!lfoActive || lfoDestination === 'off') return;
    
    // Lazy load and cache DOM elements
    if (!lfoWaveformElement) {
        lfoWaveformElement = document.getElementById('lfoWaveform');
        lfoRateElement = document.getElementById('lfoRate');
        lfoAmountElement = document.getElementById('lfoAmount');
    }
    
    // Get LFO settings with null checks
    if (!lfoWaveformElement || !lfoRateElement || !lfoAmountElement) return;
    
    const waveform = lfoWaveformElement.value;
    const rate = parseFloat(lfoRateElement.value);
    const amountPercent = parseInt(lfoAmountElement.value);
    const amount = amountPercent / 100;
    
    // Calculate current time and phase
    const currentTime = timestamp / 1000; // Convert to seconds
    const phase = (currentTime * rate) % 1;
    
    // Calculate LFO output value using optimized function map
    const waveformFunction = lfoWaveformFunctions[waveform] || lfoWaveformFunctions.sine;
    let lfoOutput = waveformFunction(phase);
    
    // Scale by amount
    lfoOutput *= amount;
    
    // Apply to target parameter
    applyLfoToParameter(lfoDestination, lfoOutput);
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
            
            // Set a flag on the old synth to indicate it's being disposed
            oldSynth.disposed = true;
            
            // Allow time for release phase to complete before disposing
            setTimeout(() => {
                try {
                    if (oldSynth && oldSynth.disconnect && !oldSynth._wasDisposed) {
                        oldSynth.disconnect();
                        oldSynth.dispose();
                        oldSynth._wasDisposed = true;
                    }
                } catch (disposeErr) {
                    console.warn("Error disposing old synth:", disposeErr);
                }
            }, 500);
        } catch (releaseErr) {
            console.warn("Error releasing notes on old synth:", releaseErr);
        }
    }
    
    // Log performance metrics
    const duration = performance.now() - startTime;
    if (window.DEBUG_PERFORMANCE) {
        console.log(`Synth creation took ${duration.toFixed(2)}ms`);
    }
    
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
        
        // Configure polyphonic synth with better performance settings and increased polyphony
        const increasedVoices = Math.max(16, maxVoices * 2); // Double the requested voices with a minimum of 16
        
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
    
    // Configuration options for voice management - increased limits to prevent polyphony warnings
    options: {
        maxTotalVoices: 128,        // Increased maximum total voices across all synths
        voiceTimeout: 30000,        // Maximum time in ms to keep an unused voice alive (increased from 5000ms)
        cleanupInterval: 60000,     // Interval in ms to run voice cleanup (increased from 10000ms)
        maxPolyphonyStandard: 16,   // Increased default max polyphony for standard devices
        maxPolyphonyHigh: 32,       // Increased max polyphony for high-performance devices
        maxPolyphonyLow: 8          // Increased max polyphony for low-performance devices
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
    for (let octave = 1; octave <= 6; octave++) {
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

// Create keyboard with polyphonic support - optimized for memory and performance
const createKeyboard = () => {
    const keyboardElement = document.getElementById('keyboard');
    if (!keyboardElement) return;
    
    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    // Make octave range responsive based on screen size
    const isMobile = window.innerWidth <= 768;
    const startOctave = 3;
    const endOctave = isMobile ? 4 : 7;

    // Clear keyboard and reset the key element cache
    keyboardElement.innerHTML = '';
    resetKeyboardCache();
    
    // Pre-define the event handlers to avoid creating new function closures for each key
    // This dramatically reduces memory usage and improves performance
    
    // Shared event handlers for all keys using event delegation
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
                    synth.triggerAttack(note);
                    updateVUMeter(0.8);
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
                    synth.triggerRelease(note);
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
    
    // Add event listeners to the keyboard container (event delegation)
    // This dramatically reduces the number of event listeners
    keyboardElement.addEventListener('mousedown', keyboardMouseHandlers.handleMouseDown);
    keyboardElement.addEventListener('mouseup', keyboardMouseHandlers.handleMouseUp);
    keyboardElement.addEventListener('mouseleave', keyboardMouseHandlers.handleMouseLeave);
    
    // Use a document fragment for batch DOM updates (massive performance improvement)
    const fragment = document.createDocumentFragment();

    // Define black key positions (reused for each octave)
    const blackKeyPositions = [
        { after: 'C', note: 'C#' },
        { after: 'D', note: 'D#' },
        { after: 'F', note: 'F#' },
        { after: 'G', note: 'G#' },
        { after: 'A', note: 'A#' }
    ];
    
    // First create all white keys
    for (let octave = startOctave; octave <= endOctave; octave++) {
        // Only create C for the last octave
        const octaveNotes = octave === endOctave ? ['C'] : notes;

        for (let i = 0; i < octaveNotes.length; i++) {
            const key = document.createElement('div');
            key.className = 'key';
            key.textContent = isMobile ? '' : `${octaveNotes[i]}${octave}`;
            key.setAttribute('data-note', `${octaveNotes[i]}${octave}`);
            fragment.appendChild(key);
        }
    }
    
    // Add all white keys to the DOM at once
    keyboardElement.appendChild(fragment);
    
    // Now create and position black keys
    const secondFragment = document.createDocumentFragment();
    const whiteKeys = keyboardElement.querySelectorAll('.key');
    const whiteKeyWidth = whiteKeys[0].offsetWidth;
    
    // Create black keys for each octave
    for (let octave = startOctave; octave <= endOctave; octave++) {
        // Skip black keys after B or for the last octave (where we only create C)
        if (octave === endOctave) continue;
        
        for (let i = 0; i < notes.length; i++) {
            const whiteNote = notes[i];
            const blackKeyInfo = blackKeyPositions.find(pos => pos.after === whiteNote);
            
            if (blackKeyInfo) {
                const blackKey = document.createElement('div');
                blackKey.className = 'black-key';
                blackKey.setAttribute('data-note', `${blackKeyInfo.note}${octave}`);
                
                // Find the corresponding white key
                const whiteKeyIndex = Array.from(whiteKeys).findIndex(
                    key => key.getAttribute('data-note') === `${whiteNote}${octave}`
                );
                
                // Position the black key relative to the white key
                if (whiteKeyIndex !== -1) {
                    const whiteKey = whiteKeys[whiteKeyIndex];
                    const rect = whiteKey.getBoundingClientRect();
                    const keyboardRect = keyboardElement.getBoundingClientRect();
                    
                    // Calculate position
                    blackKey.style.left = `${rect.right - keyboardRect.left - whiteKeyWidth/4}px`;
                    secondFragment.appendChild(blackKey);
                }
            }
        }
    }
    
    // Add all black keys to DOM at once
    keyboardElement.appendChild(secondFragment);
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
    ['masterPanKnob', 'masterPan']
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

// Initialize EQ visualization on page load
document.addEventListener('DOMContentLoaded', function() {
    updateEqResponse();

    // Also make sure to update EQ visualization on window resize
    window.addEventListener('resize', function() {
        updateEqResponse();
    });
});

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
initializeDrumSounds(); // Add this line to initialize drum sounds

// Create keyboard after DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    // Initialize animation settings
    initAnimationSettings();

    // Start animations
    startAnimations();

    createKeyboard();
    // Initialize presets
    initializePresets();

    // Initialize ADSR Visualizer
    updateADSRVisualizer();

    // Initialize Filter Response Curve
    updateFilterResponse();

    // Initialize EQ Response Visualization
    updateEqResponse();

    // Initialize drum sounds
    initializeDrumSounds();

    // Initialize LFO scope
    initLfoScope();
    
    // Update LFO destination options to include EQ parameters
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
    
    // Trigger initial LFO destination setup (keep existing code)
    document.getElementById('lfoDestination').dispatchEvent(new Event('change'));
});


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
    window.reverbUpdateTimeout = setTimeout(() => {
        // Store the current wet value
        const currentWet = reverb.wet.value;

        // Create a new reverb with the new decay value
        const newReverb = new Tone.Reverb({
            decay: value,
            preDelay: 0.01
        });

        // Generate the impulse response before swapping
        newReverb.generate().then(() => {
            // Set the wet value to match the previous reverb
            newReverb.wet.value = currentWet;

            // Temporarily disconnect reverb from the chain
            phaser.disconnect(reverb);
            reverb.disconnect(delay);

            // Connect the new reverb
            phaser.connect(newReverb);
            newReverb.connect(delay);

            // Dispose the old reverb
            reverb.dispose();

            // Replace the reverb reference
            reverb = newReverb;
        });
    }, 300); // 300ms debounce
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

document.getElementById('masterPan').addEventListener('input', e => {
    const value = parseFloat(e.target.value);

    // Update the panner
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
    masterVolume: "0.8",
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
    console.time('presetInitialization'); // Performance measurement
    
    // Apply the default preset 
    // Use the first preset or a specific default one if first is too complex
    const defaultPresetName = "Default";
    const defaultPreset = getPresetByName(defaultPresetName) || builtInPresets[0];
    
    applyPreset(defaultPreset.settings);
    activePresetName = defaultPreset.name;

    // Render the presets list with deferred loading for better startup performance
    setTimeout(() => {
        renderPresetList();
        console.timeEnd('presetInitialization');
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

            // Apply the preset (get from cache if possible)
            const presetToApply = isCustom ? preset : getPresetByName(preset.name);
            applyPreset(presetToApply.settings);

            // Turn off drone if it's active
            if (isDroneActive) {
                toggleDrone();
            }
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

// Apply a preset to the synth
function applyPreset(settings) {
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

    // Set all LFO-related controls
    lfoDestinationSelect.value = lfoDestination;
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
    let localStepCounter = 0;
    
    // Reset the global currentStep to ensure consistent starting point
    currentStep = 15; // Will increase to 0 when first step triggers
    
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
                        synth.triggerAttackRelease(note, '8n', time);
                        updateVUMeter(0.8);
                    } catch (e) {
                        console.warn("Error playing note from sequencer:", e);
                        // If error occurs, ensure visualizers are reconnected
                        ensureVisualizersConnected();
                    }
                    
                    // Highlight the corresponding key
                    highlightKeyFromSequencer(note, 0.25);
                    
                    // Visual feedback
                    gsap.to(step, {
                        scale: 1.03,
                        duration: 0.1,
                        yoyo: true,
                        repeat: 1
                    });
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

// Update octave indicator efficiently
function updateOctaveIndicator(octave) {
    // Cache the indicator element reference
    if (!updateOctaveIndicator.element) {
        updateOctaveIndicator.element = document.querySelector('.octave-indicator');
    }
    
    if (updateOctaveIndicator.element) {
        updateOctaveIndicator.element.textContent = octave;
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
    if (e.key === 'z' && currentOctave > 2) {
        currentOctave--;
        updateOctaveIndicator(currentOctave);
        
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
        currentOctave++;
        updateOctaveIndicator(currentOctave);
        
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
            synth.triggerAttack(note);
            updateVUMeter(0.8);
            
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
                synth.triggerRelease(note);
                
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

    // If LFO is running, restart it to apply new rate
    if (lfoActive) {
        restartLfo();
    }
});

document.getElementById('lfoAmount').addEventListener('input', function(e) {
    const amount = parseInt(e.target.value);
    document.getElementById('lfoAmountValue').textContent = `${amount}%`;

    // Only restart if LFO is active
    if (lfoDestination !== 'off') {
        restartLfo();
    }
});

document.getElementById('lfoWaveform').addEventListener('change', function(e) {
    // Only restart if LFO is active
    if (lfoDestination !== 'off') {
        restartLfo();
    }
});

// Function to stop LFO
function stopLfo() {
    lfoActive = false;
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

    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const baseValue = lfoBaseValues[lfoDestination];

    // Start the animation loop
    let startTime = performance.now() / 1000; // seconds

    function animateLfo() {
        if (!lfoActive) return;

        // Get current LFO settings
        const waveform = document.getElementById('lfoWaveform').value;
        const rate = parseFloat(document.getElementById('lfoRate').value);
        const amountPercent = parseInt(document.getElementById('lfoAmount').value);
        const amount = amountPercent / 100; // Convert to 0-1

        // Calculate current time in seconds
        const currentTime = performance.now() / 1000;
        const elapsedTime = currentTime - startTime;

        // Calculate phase (0-1) based on rate
        const phase = (elapsedTime * rate) % 1;

        // Calculate LFO output (-1 to 1) based on waveform
        let lfoOutput;

        switch (waveform) {
            case 'sine':
                lfoOutput = Math.sin(phase * Math.PI * 2);
                break;
            case 'triangle':
                lfoOutput = 1 - Math.abs((phase * 4) % 4 - 2);
                break;
            case 'square':
                lfoOutput = phase < 0.5 ? 1 : -1;
                break;
            case 'sawtooth':
                lfoOutput = (phase * 2) - 1;
                break;
            case 'random':
                // Use a stable random value for each segment
                const segments = 8; // 8 segments per cycle
                const segmentIndex = Math.floor(phase * segments);
                // Generate a pseudorandom value based on segment
                lfoOutput = Math.sin(segmentIndex * 1000) * 2 - 1;
                break;
            default:
                lfoOutput = 0;
        }

        // Scale by amount
        lfoOutput *= amount;

        // Calculate modulation range (50% of parameter range)
        const range = max - min;
        const modRange = range * 0.5;

        // Calculate modulated value
        const modValue = baseValue + (lfoOutput * modRange);

        // Clamp value to parameter range
        const clampedValue = Math.max(min, Math.min(max, modValue));

        // Set the parameter value WITHOUT breaking its connection
        // We do this by:
        // 1. Updating the input value
        // 2. Setting the actual audio parameter directly
        // 3. Updating the display

        // Update input value
        input.value = clampedValue;

        // Update audio parameter directly based on destination
        updateAudioParameter(lfoDestination, clampedValue);

        // Update knob rotation using GSAP
        const knob = document.getElementById(`${lfoDestination}Knob`);
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
        return;
    }

    // Store the destination
    lfoDestination = newDestination;

    // Store the base value
    const input = document.getElementById(newDestination);
    if (input) {
        lfoBaseValues[newDestination] = parseFloat(input.value);
    }

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
document.addEventListener('DOMContentLoaded', function() {
    // Get octave control elements
    const decreaseOctaveBtn = document.getElementById('decreaseOctave');
    const increaseOctaveBtn = document.getElementById('increaseOctave');
    const currentOctaveDisplay = document.getElementById('currentOctave');

    // Keep track of current octave
    let currentOctave = 4; // Default starting octave

    // Function to update both displays and the actual synth octave
    function updateOctave(newOctave) {
        // Ensure octave stays within valid range
        newOctave = Math.max(1, Math.min(7, newOctave));

        // Update our local tracking variable
        currentOctave = newOctave;

        // Update the display
        currentOctaveDisplay.textContent = `C${currentOctave}`;

        // Update the synth's octave
        // This assumes there's a global octave variable that the keyboard uses
        if (typeof window.octave !== 'undefined') {
            window.octave = currentOctave;
        }

        // If there's a keyboard octave indicator, update it too
        const keyboardOctaveIndicator = document.querySelector('.octave-indicator');
        if (keyboardOctaveIndicator) {
            keyboardOctaveIndicator.textContent = currentOctave;
        }
    }

    // Decrease octave button
    decreaseOctaveBtn.addEventListener('click', function() {
        updateOctave(currentOctave - 1);
    });

    // Increase octave button
    increaseOctaveBtn.addEventListener('click', function() {
        updateOctave(currentOctave + 1);
    });

    // Hook into Z/X keys
    document.addEventListener('keydown', function(e) {
        if (e.key.toLowerCase() === 'z') {
            updateOctave(currentOctave - 1);
        } else if (e.key.toLowerCase() === 'x') {
            updateOctave(currentOctave + 1);
        }
    });

    // Initialize display
    updateOctave(currentOctave);
});

// Add Quick Chord functionality for playing chords
document.addEventListener('DOMContentLoaded', function() {
    // Chord type definitions (intervals from root)
    const chordTypes = {
        'maj': [0, 4, 7], // Major (root, major 3rd, perfect 5th)
        'min': [0, 3, 7], // Minor (root, minor 3rd, perfect 5th)
        'dim': [0, 3, 6], // Diminished (root, minor 3rd, diminished 5th)
        'aug': [0, 4, 8], // Augmented (root, major 3rd, augmented 5th)
        'maj7': [0, 4, 7, 11], // Major 7th (root, major 3rd, perfect 5th, major 7th)
        'min7': [0, 3, 7, 10], // Minor 7th (root, minor 3rd, perfect 5th, minor 7th)
        'dom7': [0, 4, 7, 10], // Dominant 7th (root, major 3rd, perfect 5th, minor 7th)
        'maj9': [0, 4, 7, 11, 14] // Major 9th (root, major 3rd, perfect 5th, major 7th, major 9th)
    };

    let selectedChordType = null;
    let selectedNote = null;
    let activeChordTimeout = null;

    // Get all chord buttons and note buttons
    const chordButtons = document.querySelectorAll('.chord-button');
    const noteButtons = document.querySelectorAll('.note-button');

    // Add click event to chord buttons
    chordButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all chord buttons
            chordButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Store selected chord type
            selectedChordType = this.getAttribute('data-chord-type');

            // If both chord type and note are selected, play the chord
            if (selectedChordType && selectedNote) {
                playChord(selectedNote, selectedChordType);
            }
        });
    });

    // Add click event to note buttons
    noteButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all note buttons
            noteButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Store selected note
            selectedNote = this.getAttribute('data-note');

            // If both chord type and note are selected, play the chord
            if (selectedChordType && selectedNote) {
                playChord(selectedNote, selectedChordType);
            }
        });
    });

    // Function to highlight keyboard keys for a chord
    function highlightChordOnKeyboard(notes) {
        // First remove any existing highlighted chord
        if (activeChordTimeout) {
            clearTimeout(activeChordTimeout);
            removeKeyboardHighlights();
        }

        // For each note in the chord, find and highlight the corresponding key
        notes.forEach(noteWithOctave => {
            // Extract note name and octave
            const noteName = noteWithOctave.replace(/\d+$/, '');
            const octave = parseInt(noteWithOctave.match(/\d+$/)[0]);

            // Find the key corresponding to this note
            // The selector will depend on how your keyboard keys are structured
            let keyElement;

            // Try different potential selectors based on common implementations
            keyElement = document.querySelector(`.piano-key[data-note="${noteName}${octave}"]`);
            if (!keyElement) keyElement = document.querySelector(`.piano-key[data-note="${noteName}"][data-octave="${octave}"]`);
            if (!keyElement) keyElement = document.querySelector(`[data-note="${noteWithOctave}"]`);
            if (!keyElement) keyElement = document.querySelector(`.key[data-note="${noteWithOctave}"]`);

            // If we found the key, highlight it
            if (keyElement) {
                keyElement.classList.add('active', 'chord-highlighted');
            }
        });

        // Set a timeout to remove highlights after a short duration
        activeChordTimeout = setTimeout(removeKeyboardHighlights, 500);
    }

    // Function to remove keyboard highlights
    function removeKeyboardHighlights() {
        document.querySelectorAll('.chord-highlighted').forEach(key => {
            key.classList.remove('active', 'chord-highlighted');
        });
    }

    // Function to play chord using Tone.js
    function playChord(note, chordType) {
        if (!chordTypes[chordType]) return;

        // Validate synth exists and is not disposed
        if (!synth || synth.disposed) {
            console.warn("Synth unavailable or disposed - recreating");
            synth = createSynth();
            // Return early if recreation fails
            if (!synth || synth.disposed) {
                console.error("Failed to recreate synth for chord");
                return;
            }
        }

        try {
            // Get current octave
            const octave = parseInt(document.getElementById('currentOctave').textContent.replace(/\D/g, ''));

            // Create array of notes for the chord
            const notes = chordTypes[chordType].map(interval => {
                // Convert interval to note name with octave
                const noteIndex = getNoteIndex(note);
                const newNoteIndex = noteIndex + interval;
                const newOctave = octave + Math.floor(newNoteIndex / 12);
                const newNote = getNoteFromIndex(newNoteIndex % 12);

                return `${newNote}${newOctave}`;
            });

            // Highlight the chord on the keyboard
            highlightChordOnKeyboard(notes);

            // Check if we need to release any currently playing notes to prevent exceeding polyphony
            if (activeNotes.size > 0) {
                // Release any currently active notes before playing the chord
                synth.releaseAll();
                activeNotes.clear();
            }
            
            // Play the chord using the synth with error handling
            synth.triggerAttackRelease(notes, "8n");
            
            // Keep track of chord notes for proper release later
            notes.forEach(note => activeNotes.add(note));
            
            updateVUMeter(0.8);
        } catch (err) {
            console.warn("Error playing chord:", err);
            // Try to recover by creating a new synth
            try {
                synth = createSynth();
            } catch (createErr) {
                console.error("Failed to recover synth after chord error:", createErr);
            }
        }
    }

    // Helper function to get note index (C = 0, C# = 1, etc.)
    function getNoteIndex(note) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return notes.indexOf(note);
    }

    // Helper function to get note from index
    function getNoteFromIndex(index) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return notes[index];
    }
});

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

// Make sure we call this function after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Delay setup slightly to ensure other scripts have initialized
    setTimeout(setupCollapsibleModules, 100);
});

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
        
        if (animations.isRunning) {
            if (animations.oscilloscope.element) updateOscilloscope(performance.now());
            if (animations.lfoScope.element) updateLfoScope(performance.now());
        }
        
        console.log('Canvas dimensions updated after resize');
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

// On DOMContentLoaded, setup drum pads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize animation settings
    initAnimationSettings();

    // Start animations
    startAnimations();

    createKeyboard();
    
    // Initialize drum sounds
    initializeDrumSounds();
    
    // Setup drum pad click handlers
    setupDrumPads();
    
    // Initialize presets
    initializePresets();

    // Initialize ADSR Visualizer
    updateADSRVisualizer();

    // Initialize Filter Response Curve
    updateFilterResponse();

    // Initialize EQ Response Visualization
    updateEqResponse();

    // Initialize LFO scope
    initLfoScope();
    
    // Initialize the sequencer to ensure it's properly set up
    if (typeof setupSequencer === 'function') {
        setupSequencer();
    }
});