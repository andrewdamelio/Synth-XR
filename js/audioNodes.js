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

// Connect audio processing chain
// Note: Connection order is critical for the signal flow
function connectAudioNodes() {
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
    masterCompressor.connect(masterPanner);
    masterPanner.connect(stereoWidener);
    stereoWidener.connect(widthCompensation);
    widthCompensation.connect(masterVolume);
    
    // Connect analysis nodes
    masterVolume.connect(waveform);
    stereoWidener.connect(fft);
    
    // Expose analysis nodes globally
    window.waveform = waveform;
    window.fft = fft;
}

// Add a helper function to ensure visualizers are properly connected
let visualizersConnected = false;
let visualizerConnectionCount = 0;

function updateReverb(value) {
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
}

function ensureVisualizersConnected() {
    // If visualizers are already connected, just return silently without logging
    if (visualizersConnected) return;
    
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
        
        // Set the flag to true to prevent future reconnections
        visualizersConnected = true;
        visualizerConnectionCount++;
        
        // Only log on first connection
        console.log("Visualizers connected");
    } catch (e) {
        console.warn("Error ensuring visualizer connections:", e);
    }
}

// Initialize the audio processing system
function initAudioNodes() {
    connectAudioNodes();
    ensureVisualizersConnected();
}

// Export all audio nodes and utilities
export {
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
    waveform,
    fft,
    initAudioNodes,
    ensureVisualizersConnected,
    updateReverb
};
