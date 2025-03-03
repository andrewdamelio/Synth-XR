/**
 * midi.js - MIDI Controller integration for Synth XR
 * Implements Web MIDI API connectivity and "MIDI Learn" functionality
 */


// Main state object for MIDI system
const MIDISystem = {
    // Core state
    initialized: false,
    available: false,
    activeDevice: null,
    midiAccess: null,
    inputs: new Map(),
    outputs: new Map(),
    
    // Learn mode state
    learnMode: false,
    currentTargetElement: null,
    
    // Mappings storage
    mappings: new Map(), // Maps MIDI CC numbers to DOM elements
    reverseMapping: new Map(), // Maps DOM element IDs to MIDI CC numbers
    
    // Scaling functions for different parameter types
    scalingFunctions: {
        // Linear scaling (default)
        linear: (value, min, max) => {
            return min + (value / 127) * (max - min);
        },
        
        // Logarithmic scaling (for frequencies, etc.)
        logarithmic: (value, min, max) => {
            const minLog = Math.log(min);
            const maxLog = Math.log(max);
            const scale = (maxLog - minLog) / 127;
            return Math.exp(minLog + value * scale);
        },
        
        // Exponential scaling
        exponential: (value, min, max, exponent = 2) => {
            const normalized = value / 127;
            return min + (max - min) * Math.pow(normalized, exponent);
        }
    },
    
    // Parameter type definitions for automatic scaling
    parameterTypes: {
        // Filter parameters
        filterCutoff: { scaling: 'logarithmic', min: 20, max: 20000 },
        filterRes: { scaling: 'linear', min: 0, max: 20 },
        
        // ADSR parameters
        attack: { scaling: 'exponential', min: 0.001, max: 2, exponent: 2 },
        decay: { scaling: 'exponential', min: 0.001, max: 2, exponent: 2 },
        sustain: { scaling: 'linear', min: 0, max: 1 },
        release: { scaling: 'exponential', min: 0.001, max: 5, exponent: 2 },
        
        // Effects parameters
        reverbMix: { scaling: 'linear', min: 0, max: 1 },
        reverbDecay: { scaling: 'linear', min: 0.1, max: 10 },
        delayTime: { scaling: 'linear', min: 0, max: 1 },
        delayFeedback: { scaling: 'linear', min: 0, max: 1 },
        chorusMix: { scaling: 'linear', min: 0, max: 1 },
        distortionMix: { scaling: 'linear', min: 0, max: 1 },
        
        // Master parameters
        masterVolume: { scaling: 'linear', min: 0, max: 2 },
        masterPan: { scaling: 'linear', min: -1, max: 1 },
        
        // Default for unspecified parameters
        default: { scaling: 'linear', min: 0, max: 1 }
    },
    
    // Default known mappings for popular controllers
    defaultMappings: {
        // Example mapping for Arturia MiniLab MKII
        "Arturia MiniLab mkII": {
            // CC number: parameter ID
            1: 'masterVolume',
            74: 'filterCutoff',
            71: 'filterRes',
            73: 'attack',
            72: 'release',
            // ... add more mappings as needed
        },
        // Example for Novation Launchkey
        "Novation Launchkey": {
            // Different mappings for different devices
            21: 'masterVolume',
            22: 'filterCutoff',
            23: 'filterRes',
            // ... add more mappings as needed
        }
    }
};

// Store active MIDI message handlers
const activeMessageHandlers = new Map();

// Tooltip elements
let tooltipElement = null;
let tooltipTimeout = null;

/**
 * Initialize the MIDI system
 * @returns {Promise} A promise that resolves when MIDI is initialized
 */
export async function initMIDI() {
    if (MIDISystem.initialized) return;
    
    try {
        // Check if Web MIDI API is available
        if (!navigator.requestMIDIAccess) {
            console.warn("Web MIDI API is not available in this browser");
            MIDISystem.available = false;
            updateMIDIStatusUI();
            return;
        }
        
        // Request MIDI access
        MIDISystem.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        MIDISystem.available = true;
        
        // Set up event listeners
        MIDISystem.midiAccess.addEventListener('statechange', handleMIDIStateChange);
        
        // Initialize inputs and outputs
        updateMIDIPorts();
        
        // Try to load saved mappings
        loadMIDIMappings();
        
        MIDISystem.initialized = true;
        console.log("MIDI system initialized");
        updateMIDIStatusUI();
    } catch (error) {
        console.error("Failed to initialize MIDI:", error);
        MIDISystem.available = false;
        updateMIDIStatusUI();
    }
}

/**
 * Update MIDI ports (inputs and outputs)
 */
function updateMIDIPorts() {
    MIDISystem.inputs.clear();
    MIDISystem.outputs.clear();
    
    // Get all inputs
    MIDISystem.midiAccess.inputs.forEach(input => {
        console.log(`MIDI Input: ${input.name}`);
        MIDISystem.inputs.set(input.id, input);
        
        // Add message handler to this input
        input.addEventListener('midimessage', handleMIDIMessage);
    });
    
    // Get all outputs
    MIDISystem.midiAccess.outputs.forEach(output => {
        console.log(`MIDI Output: ${output.name}`);
        MIDISystem.outputs.set(output.id, output);
    });
    
    // Update the UI with available devices
    updateMIDIDeviceList();
}

/**
 * Handle MIDI state changes (device connect/disconnect)
 * @param {Event} event - The statechange event
 */
function handleMIDIStateChange(event) {
    console.log(`MIDI State Change: ${event.port.name} - ${event.port.state}`);
    
    // Update our ports
    updateMIDIPorts();
    
    // If it's a connection...
    if (event.port.state === 'connected' && event.port.type === 'input') {
        // If we don't have an active device yet, use this one
        if (!MIDISystem.activeDevice) {
            setActiveDevice(event.port.id);
        }
    }
    
    // If it's a disconnection and it was our active device...
    if (event.port.state === 'disconnected' && 
        event.port.id === MIDISystem.activeDevice) {
        // Find another device if possible
        MIDISystem.activeDevice = null;
        if (MIDISystem.inputs.size > 0) {
            setActiveDevice(MIDISystem.inputs.keys().next().value);
        }
    }
    
    updateMIDIStatusUI();
}

/**
 * Handle incoming MIDI messages
 * @param {MIDIMessageEvent} message - The MIDI message
 */
function handleMIDIMessage(message) {
    const data = message.data;
    const type = data[0] & 0xf0; // Mask off the channel
    
    // Different handlers based on message type
    switch (type) {
        case 0xB0: // Control Change (CC)
            handleControlChange(data[1], data[2]);
            break;
        
        case 0x90: // Note On
            if (data[2] > 0) { // Velocity > 0
                handleNoteOn(data[1], data[2]);
            } else {
                // Some devices send Note On with velocity 0 for Note Off
                handleNoteOff(data[1]);
            }
            break;
            
        case 0x80: // Note Off
            handleNoteOff(data[1]);
            break;
            
        // Add more message types as needed (Pitch Bend, Aftertouch, etc.)
        
        default:
            // Uncomment for debugging all MIDI messages
            // console.log(`Unhandled MIDI message: ${type.toString(16)}`, data);
            break;
    }
}

/**
 * Handle Control Change messages
 * @param {number} cc - The CC number (0-127)
 * @param {number} value - The value (0-127)
 */
function handleControlChange(cc, value) {
    // Check if we're in learn mode and have a selected element
    if (MIDISystem.learnMode && MIDISystem.currentTargetElement) {
        const elementId = MIDISystem.currentTargetElement.id;
        const paramName = getParameterName(elementId);
        
        // Create the mapping
        createMapping(cc, elementId);
        
        // Show success message
        showMappingTooltip(`Successfully mapped CC ${cc} to ${paramName}`, "success");
        
        // Clear the current target and its highlight after a short delay
        MIDISystem.currentTargetElement.classList.remove('midi-learn-highlight');
        MIDISystem.currentTargetElement = null;
        
        // Update the UI
        updateMappingsUI();
        
        // Don't process the value yet to avoid sudden parameter jumps
        return;
    }
    
    // Normal CC handling (when not in learn mode)
    if (MIDISystem.mappings.has(cc)) {
        const elementId = MIDISystem.mappings.get(cc);
        const element = document.getElementById(elementId);
        
        if (element && element.type === 'range') {
            // Update the element's value based on MIDI input
            updateElementFromMIDI(element, value);
            
            // Show visual feedback
            addMIDIActiveClass(element);
        }
    }
}

/**
 * Add a visual indicator when a parameter is being controlled via MIDI
 * @param {HTMLElement} element - The element being controlled
 */
function addMIDIActiveClass(element) {
    // Add the MIDI active class to both the input and associated knob
    element.classList.add('midi-active');
    
    // Find the associated knob
    const container = element.closest('.knob-container') || element.closest('.small-knob-container');
    if (container) {
        const knob = container.querySelector('.knob') || container.querySelector('.small-knob');
        if (knob) {
            knob.classList.add('midi-active');
        }
    }
    
    // Clear the active class after a short delay
    clearTimeout(element.midiActiveTimeout);
    element.midiActiveTimeout = setTimeout(() => {
        element.classList.remove('midi-active');
        if (container) {
            const knob = container.querySelector('.knob') || container.querySelector('.small-knob');
            if (knob) {
                knob.classList.remove('midi-active');
            }
        }
    }, 200);
}

/**
 * Handle Note On messages
 * @param {number} note - The note number (0-127)
 * @param {number} velocity - The velocity (0-127)
 */
function handleNoteOn(note, velocity) {
    console.log(`Note On: ${note}, Velocity: ${velocity}`);
    
    // For note mappings, we use a special code above 1000
    const noteCode = 1000 + note;
    
    // Check if we're in learn mode
    if (MIDISystem.learnMode && MIDISystem.currentTargetElement) {
        createMapping(noteCode, MIDISystem.currentTargetElement.id);
        MIDISystem.currentTargetElement = null;
        return;
    }
    
    // Check if this note is mapped to a parameter
    if (MIDISystem.mappings.has(noteCode)) {
        const elementId = MIDISystem.mappings.get(noteCode);
        const element = document.getElementById(elementId);
        
        if (element) {
            if (element.type === 'button' || element.tagName === 'BUTTON') {
                // Trigger button click
                element.click();
            } else if (element.type === 'range') {
                // Use note velocity to control parameter
                updateElementFromMIDI(element, velocity);
            } else if (element.type === 'checkbox' || element.classList.contains('toggle-switch')) {
                // Toggle switch or checkbox
                element.checked = !element.checked;
                element.dispatchEvent(new Event('change'));
                
                // If it's our custom toggle, update the UI
                if (element.classList.contains('toggle-switch')) {
                    element.classList.toggle('active');
                }
            }
        }
    }
    
    // Handle keyboard input (always active regardless of mappings)
    handleKeyboardNoteInput(note);
}

/**
 * Handle Note Off messages
 * @param {number} note - The note number (0-127)
 */
function handleNoteOff(note) {
    console.log(`Note Off: ${note}`);
    
    // Handle keyboard note release
    handleKeyboardNoteRelease(note);
}

/**
 * Update a DOM element based on MIDI input with appropriate scaling
 * @param {HTMLElement} element - The element to update
 * @param {number} midiValue - The MIDI value (0-127)
 */
function updateElementFromMIDI(element, midiValue) {
    if (!element || element.disabled) return;
    
    // Get the parameter type for this element
    let paramType = 'default';
    
    // Try to determine parameter type from element ID
    for (const [type, config] of Object.entries(MIDISystem.parameterTypes)) {
        if (element.id.toLowerCase().includes(type.toLowerCase())) {
            paramType = type;
            break;
        }
    }
    
    // Get scaling configuration
    const config = MIDISystem.parameterTypes[paramType] || MIDISystem.parameterTypes.default;
    
    // Override min/max from the element if available
    const min = element.min !== undefined ? parseFloat(element.min) : config.min;
    const max = element.max !== undefined ? parseFloat(element.max) : config.max;
    
    // Apply the appropriate scaling function
    const scalingFunc = MIDISystem.scalingFunctions[config.scaling] || MIDISystem.scalingFunctions.linear;
    let newValue;
    
    if (config.scaling === 'exponential' && config.exponent) {
        newValue = scalingFunc(midiValue, min, max, config.exponent);
    } else {
        newValue = scalingFunc(midiValue, min, max);
    }
    
    // Apply the value to the element
    element.value = newValue;
    
    // Dispatch events to ensure the change is detected
    element.dispatchEvent(new Event('input'));
    element.dispatchEvent(new Event('change'));
    
    // Show visual feedback
    showParameterActivity(element.id);
}

/**
 * Handle keyboard note input for synth keyboard
 * @param {number} note - MIDI note number
 */
function handleKeyboardNoteInput(note) {
    // Get the synth keyboard if it exists
    const keyboard = document.getElementById('keyboard');
    if (!keyboard) return;
    
    // Convert MIDI note to note name (C4, etc.)
    const noteName = getMIDINoteToNoteName(note);
    
    // Find the key in the keyboard
    const key = keyboard.querySelector(`[data-note="${noteName}"]`);
    if (key) {
        // Highlight the key
        key.classList.add('active');
        
        // Check if we have access to the synth (global variable from main.js)
        if (window.synth && !window.synth.disposed) {
            // Add note to active notes set
            if (window.activeNotes) {
                window.activeNotes.add(noteName);
            }
            
            // Actually trigger the note on the synth
            window.synth.triggerAttack(noteName);
            
            // Visual feedback using VU meter
            if (typeof window.updateVUMeter === 'function') {
                window.updateVUMeter(0.8);
            }
            
            console.log("Playing MIDI note:", noteName);
        } else {
            console.warn("Synth not available for MIDI note:", noteName);
        }
    }
}

/**
 * Handle keyboard note release
 * @param {number} note - MIDI note number
 */
function handleKeyboardNoteRelease(note) {
    // Get the synth keyboard if it exists
    const keyboard = document.getElementById('keyboard');
    if (!keyboard) return;
    
    // Convert MIDI note to note name (C4, etc.)
    const noteName = getMIDINoteToNoteName(note);
    
    // Find the key in the keyboard
    const key = keyboard.querySelector(`[data-note="${noteName}"]`);
    if (key) {
        // Remove highlight
        key.classList.remove('active');
        
        // Check if we have access to the synth (global variable from main.js)
        if (window.synth && !window.synth.disposed) {
            // Remove from active notes set
            if (window.activeNotes) {
                window.activeNotes.delete(noteName);
            }
            
            // Actually release the note on the synth
            window.synth.triggerRelease(noteName);
        }
    }
}

/**
 * Convert MIDI note number to note name
 * @param {number} midiNote - MIDI note number (0-127)
 * @returns {string} Note name (e.g., "C4")
 */
function getMIDINoteToNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const note = noteNames[midiNote % 12];
    return `${note}${octave}`;
}

/**
 * Set the active MIDI device
 * @param {string} deviceId - The MIDI device ID
 */
export function setActiveDevice(deviceId) {
    if (!deviceId || !MIDISystem.inputs.has(deviceId)) {
        MIDISystem.activeDevice = null;
        console.log('No active MIDI device');
    } else {
        MIDISystem.activeDevice = deviceId;
        const device = MIDISystem.inputs.get(deviceId);
        console.log(`Active MIDI device: ${device.name}`);
        
        // Check if we have default mappings for this device
        const deviceName = device.name;
        if (MIDISystem.defaultMappings[deviceName]) {
            // Ask if user wants to load default mappings
            if (confirm(`Load default mappings for ${deviceName}?`)) {
                loadDefaultMappings(deviceName);
            }
        }
    }
    
    updateMIDIStatusUI();
}

/**
 * Toggle MIDI Learn mode
 */
export function toggleLearnMode() {
    if (MIDISystem.learnMode) {
        exitLearnMode();
    } else {
        enterLearnMode();
    }
}

/**
 * Set up or remove event listeners for MIDI learn mode
 * @param {boolean} attach - True to add listeners, false to remove them
 */
function setupLearnModeListeners(attach) {
    // Handle knobs and inputs
    const eventMethod = attach ? 'addEventListener' : 'removeEventListener';
    const eventHandler = attach ? handleLearnModeElementClick : null;
    
    // First handle all the range inputs
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
        if (input.id) {
            input.classList.toggle('midi-learnable', attach);
            if (attach) {
                input[eventMethod]('click', eventHandler);
            } else {
                input.removeEventListener('click', handleLearnModeElementClick);
            }
        }
    });
    
    // Then handle all knob elements
    const knobs = document.querySelectorAll('.knob, .small-knob');
    knobs.forEach(knob => {
        knob.classList.toggle('midi-learnable', attach);
        if (attach) {
            knob[eventMethod]('mousedown', eventHandler);
            knob[eventMethod]('touchstart', eventHandler);
        } else {
            knob.removeEventListener('mousedown', handleLearnModeElementClick);
            knob.removeEventListener('touchstart', handleLearnModeElementClick);
        }
    });
    
    // Handle other controls (buttons, toggles, etc.)
    const buttons = document.querySelectorAll('button, .toggle-switch');
    buttons.forEach(button => {
        if (button.id && button.id !== 'midiLearnToggle') {
            button.classList.toggle('midi-learnable', attach);
            if (attach) {
                button[eventMethod]('click', eventHandler);
            } else {
                button.removeEventListener('click', handleLearnModeElementClick);
            }
        }
    });
}

/**
 * Handle click on a knob or slider during MIDI learn mode
 * @param {Event} e - Click event
 */
function handleLearnModeElementClick(e) {
    e.stopPropagation(); // Prevent event from bubbling up
    
    // First, remove highlighting from previously selected element
    if (MIDISystem.currentTargetElement) {
        MIDISystem.currentTargetElement.classList.remove('midi-learn-highlight');
        
        // Also remove highlight from associated knob
        const knobId = MIDISystem.currentTargetElement.id + 'Knob';
        const knob = document.getElementById(knobId);
        if (knob) {
            knob.classList.remove('midi-learn-highlight');
        }
    }
    
    // Determine what was clicked and find the associated input element
    let inputElement = null;
    
    if (e.currentTarget.classList.contains('knob') || e.currentTarget.classList.contains('small-knob')) {
        // If a knob was clicked, find its associated input
        // Knob IDs typically end with "Knob" (e.g., filterCutoffKnob)
        const knobId = e.currentTarget.id;
        const inputId = knobId.replace('Knob', '');
        inputElement = document.getElementById(inputId);
        
        console.log('Knob clicked:', knobId, 'Looking for input:', inputId);
    } else if (e.currentTarget.type === 'range') {
        // If the range input itself was clicked
        inputElement = e.currentTarget;
    } else if (e.currentTarget.type === 'button' || e.currentTarget.tagName === 'BUTTON' || 
              e.currentTarget.classList.contains('toggle-switch')) {
        // For buttons and toggles
        inputElement = e.currentTarget;
    }
    
    // If we found an element to map
    if (inputElement) {
        console.log('Setting current target element:', inputElement.id);
        
        // Set as current target
        MIDISystem.currentTargetElement = inputElement;
        
        // Add highlighting to both the input and its knob (if it has one)
        inputElement.classList.add('midi-learn-highlight');
        
        // If it's a range input, also highlight the associated knob
        if (inputElement.type === 'range') {
            const knobId = inputElement.id + 'Knob';
            const knob = document.getElementById(knobId);
            if (knob) {
                knob.classList.add('midi-learn-highlight');
            }
        }
        
        // Display mapping information
        const paramName = getParameterName(inputElement.id);
        showMappingTooltip(`Move a control on your MIDI device to map to ${paramName}`, "info");
    } else {
        console.warn('No mappable element found for', e.currentTarget);
    }
}

/**
 * Enter MIDI learn mode and set up event listeners for all controllable elements
 */
function enterLearnMode() {
    console.log('Entering MIDI learn mode');
    MIDISystem.learnMode = true;
    
    // Add click listeners to all knobs and sliders
    setupLearnModeListeners(true);
    
    // Show a tooltip or notification
    showMappingTooltip("Click on a control to assign it to a MIDI controller", "info");
    
    // Update UI to reflect learn mode
    document.body.classList.add('midi-learn-mode');
    const midiLearnStatus = document.querySelector('.midi-learn-status');
    if (midiLearnStatus) {
        midiLearnStatus.textContent = 'On';
        midiLearnStatus.classList.add('active');
    }
    
    // Update the toggle switch visual
    const midiLearnToggle = document.getElementById('midiLearnToggle');
    if (midiLearnToggle) {
        midiLearnToggle.classList.add('active');
    }
}

/**
 * Exit MIDI learn mode and remove event listeners
 */
function exitLearnMode() {
    console.log('Exiting MIDI learn mode');
    MIDISystem.learnMode = false;
    
    // Remove any highlighting from the currently selected element
    if (MIDISystem.currentTargetElement) {
        MIDISystem.currentTargetElement.classList.remove('midi-learn-highlight');
        
        // Also remove highlight from associated knob if applicable
        if (MIDISystem.currentTargetElement.type === 'range') {
            const knobId = MIDISystem.currentTargetElement.id + 'Knob';
            const knob = document.getElementById(knobId);
            if (knob) {
                knob.classList.remove('midi-learn-highlight');
            }
        }
        
        MIDISystem.currentTargetElement = null;
    }
    
    // Remove click listeners from all knobs and sliders
    setupLearnModeListeners(false);
    
    // Update UI to reflect learn mode is off
    document.body.classList.remove('midi-learn-mode');
    const midiLearnStatus = document.querySelector('.midi-learn-status');
    if (midiLearnStatus) {
        midiLearnStatus.textContent = 'Off';
        midiLearnStatus.classList.remove('active');
    }
    
    // Update the toggle switch visual
    const midiLearnToggle = document.getElementById('midiLearnToggle');
    if (midiLearnToggle) {
        midiLearnToggle.classList.remove('active');
    }
    
    // Hide any active tooltips
    hideMappingTooltip();
}

/**
 * Create a new MIDI mapping
 * @param {number} cc - The CC number or note code (0-127 or 1000+)
 * @param {string} elementId - The element ID to map to
 */
function createMapping(cc, elementId) {
    // Remove any existing mapping for this CC
    if (MIDISystem.mappings.has(cc)) {
        const oldElementId = MIDISystem.mappings.get(cc);
        if (MIDISystem.reverseMapping.has(oldElementId)) {
            MIDISystem.reverseMapping.delete(oldElementId);
        }
    }
    
    // Remove any existing mapping for this element
    if (MIDISystem.reverseMapping.has(elementId)) {
        const oldCC = MIDISystem.reverseMapping.get(elementId);
        if (MIDISystem.mappings.has(oldCC)) {
            MIDISystem.mappings.delete(oldCC);
        }
    }
    
    // Create the new mapping
    MIDISystem.mappings.set(cc, elementId);
    MIDISystem.reverseMapping.set(elementId, cc);
    
    // Get human-readable names
    const element = document.getElementById(elementId);
    let paramName = elementId;
    
    // Try to find a better name
    if (element) {
        const container = element.closest('.knob-container, .small-knob-container');
        if (container) {
            const label = container.querySelector('.knob-label');
            if (label) {
                paramName = label.textContent;
            }
        }
    }
    
    let ccName = cc >= 1000 ? `Note ${cc - 1000}` : `CC ${cc}`;
    
    // Save the mappings to localStorage
    saveMIDIMappings();
    
    // Update the UI
    updateMappingsUI();
    
    // Show success message
    if (element) {
        showMappingInfoTooltip(element, 
            `Mapped ${paramName} to ${ccName}`, 'success');
    }
    
    console.log(`Created MIDI mapping: ${ccName} -> ${paramName}`);
}

/**
 * Remove a MIDI mapping
 * @param {string} elementId - The element ID to unmap
 */
function removeMapping(elementId) {
    if (!MIDISystem.reverseMapping.has(elementId)) return;
    
    const cc = MIDISystem.reverseMapping.get(elementId);
    
    // Remove the mapping
    MIDISystem.mappings.delete(cc);
    MIDISystem.reverseMapping.delete(elementId);
    
    // Save the mappings to localStorage
    saveMIDIMappings();
    
    // Update the UI
    updateMappingsUI();
    
    console.log(`Removed MIDI mapping for ${elementId}`);
}

/**
 * Clear all MIDI mappings
 */
export function clearAllMappings() {
    console.log('Clearing all MIDI mappings');
    
    // Ask for confirmation first
    if (confirm('Are you sure you want to clear all MIDI mappings?')) {
        // Clear the mappings
        MIDISystem.mappings.clear();
        MIDISystem.reverseMapping.clear();
        
        // Save the empty mappings
        saveMIDIMappings();
        
        // Update the UI
        updateMappingsUI();
        
        // Show confirmation
        showMappingTooltip('All MIDI mappings cleared', 'info');
    }
}

/**
 * Save MIDI mappings to localStorage
 */
function saveMIDIMappings() {
    // Convert mappings to array for storage
    const mappingsArray = Array.from(MIDISystem.mappings.entries());
    
    try {
        localStorage.setItem('midiMappings', JSON.stringify(mappingsArray));
        console.log('MIDI mappings saved to localStorage');
    } catch (error) {
        console.error('Failed to save MIDI mappings:', error);
    }
}

/**
 * Load MIDI mappings from localStorage
 */
function loadMIDIMappings() {
    try {
        const mappingsString = localStorage.getItem('midiMappings');
        if (mappingsString) {
            const mappingsArray = JSON.parse(mappingsString);
            
            // Clear existing mappings
            MIDISystem.mappings.clear();
            MIDISystem.reverseMapping.clear();
            
            // Load the mappings
            mappingsArray.forEach(([cc, elementId]) => {
                // Verify the element still exists
                if (document.getElementById(elementId)) {
                    MIDISystem.mappings.set(parseInt(cc), elementId);
                    MIDISystem.reverseMapping.set(elementId, parseInt(cc));
                }
            });
            
            console.log('MIDI mappings loaded from localStorage');
            updateMappingsUI();
        }
    } catch (error) {
        console.error('Failed to load MIDI mappings:', error);
    }
}

/**
 * Load default mappings for a specific device
 * @param {string} deviceName - The device name to load mappings for
 */
function loadDefaultMappings(deviceName) {
    if (!MIDISystem.defaultMappings[deviceName]) return;
    
    // Clear existing mappings
    MIDISystem.mappings.clear();
    MIDISystem.reverseMapping.clear();
    
    // Load the default mappings
    const defaultMappings = MIDISystem.defaultMappings[deviceName];
    
    for (const [cc, paramId] of Object.entries(defaultMappings)) {
        const element = document.getElementById(paramId);
        if (element) {
            MIDISystem.mappings.set(parseInt(cc), paramId);
            MIDISystem.reverseMapping.set(paramId, parseInt(cc));
        }
    }
    
    // Save the mappings to localStorage
    saveMIDIMappings();
    
    // Update the UI
    updateMappingsUI();
    
    console.log(`Loaded default mappings for ${deviceName}`);
}

/**
 * Export MIDI mappings to a JSON file
 */
export function exportMappings() {
    // Convert mappings to array for storage
    const mappingsArray = Array.from(MIDISystem.mappings.entries());
    
    // Create a nice mapping object with useful metadata
    const exportData = {
        name: "Synth XR MIDI Mappings",
        version: "1.0",
        date: new Date().toISOString(),
        device: MIDISystem.activeDevice ? 
            MIDISystem.inputs.get(MIDISystem.activeDevice)?.name || "Unknown" : "None",
        mappings: mappingsArray
    };
    
    try {
        // Convert to JSON
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // Create a blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create a download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'synthxr-midi-mappings.json';
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        console.log('MIDI mappings exported');
    } catch (error) {
        console.error('Failed to export MIDI mappings:', error);
    }
}

/**
 * Import MIDI mappings from a JSON file
 * @param {File} file - The JSON file to import
 */
export function importMappings(file) {
    try {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Validate the data structure
                if (!data.mappings || !Array.isArray(data.mappings)) {
                    throw new Error('Invalid mapping file format');
                }
                
                // Clear existing mappings
                MIDISystem.mappings.clear();
                MIDISystem.reverseMapping.clear();
                
                // Load the mappings
                data.mappings.forEach(([cc, elementId]) => {
                    // Verify the element still exists
                    if (document.getElementById(elementId)) {
                        MIDISystem.mappings.set(parseInt(cc), elementId);
                        MIDISystem.reverseMapping.set(elementId, parseInt(cc));
                    }
                });
                
                // Save the mappings to localStorage
                saveMIDIMappings();
                
                // Update the UI
                updateMappingsUI();
                
                console.log('MIDI mappings imported successfully');
                alert('MIDI mappings imported successfully');
            } catch (error) {
                console.error('Failed to parse MIDI mappings:', error);
                alert('Failed to import MIDI mappings: Invalid file format');
            }
        };
        
        reader.readAsText(file);
    } catch (error) {
        console.error('Error importing MIDI mappings:', error);
    }
}

/**
 * Show visual feedback when a parameter is updated via MIDI
 * @param {string} elementId - The element ID that was updated
 */
function showParameterActivity(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Add a class to show activity
    element.classList.add('midi-active');
    
    // If it's a knob, also highlight the knob
    if (element.type === 'range') {
        const containerId = elementId + 'Knob';
        const knobElement = document.getElementById(containerId);
        if (knobElement) {
            knobElement.classList.add('midi-active');
        }
    }
    
    // Remove the class after a short delay
    setTimeout(() => {
        element.classList.remove('midi-active');
        
        // Also remove from knob if applicable
        if (element.type === 'range') {
            const containerId = elementId + 'Knob';
            const knobElement = document.getElementById(containerId);
            if (knobElement) {
                knobElement.classList.remove('midi-active');
            }
        }
    }, 200);
}

/**
 * Show a mapping tooltip with message and type (success, error, info)
 * @param {string} message - Message to display in the tooltip
 * @param {string} type - Type of tooltip (success, error, info)
 * @param {number} [duration=3000] - How long to show the tooltip in ms
 */
function showMappingTooltip(message, type = 'info', duration = 3000) {
    // Clear any existing timeout
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
    
    // Create tooltip if it doesn't exist
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'midi-mapping-tooltip';
        document.body.appendChild(tooltipElement);
    }
    
    // Set tooltip content and type
    tooltipElement.textContent = message;
    tooltipElement.className = `midi-mapping-tooltip ${type}`;
    
    // Show the tooltip
    tooltipElement.style.display = 'block';
    
    // Set a timeout to hide the tooltip
    if (duration > 0) {
        tooltipTimeout = setTimeout(() => {
            hideMappingTooltip();
        }, duration);
    }
}

/**
 * Hide the mapping tooltip
 */
function hideMappingTooltip() {
    if (tooltipElement) {
        tooltipElement.style.display = 'none';
    }
    
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
}

/**
 * Show mapping info tooltip on a specific element
 * @param {HTMLElement} element - The element to show the tooltip on
 * @param {string} message - The message to display
 * @param {string} [type='info'] - The type of tooltip (info, success, error)
 */
function showMappingInfoTooltip(element, message, type = 'info') {
    // Create tooltip if it doesn't exist
    let tooltip = document.getElementById('midiMappingTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'midiMappingTooltip';
        tooltip.className = 'midi-mapping-tooltip';
        document.body.appendChild(tooltip);
    }
    
    // Set tooltip content and position
    tooltip.innerText = message;
    tooltip.className = `midi-mapping-tooltip ${type}`;
    
    // Position the tooltip near the element
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + 5}px`;
    tooltip.style.left = `${rect.left + (rect.width / 2) - 100}px`;
    
    // Show the tooltip
    tooltip.style.display = 'block';
    
    // Hide after a delay
    setTimeout(() => {
        tooltip.style.display = 'none';
    }, 2000);
}

/**
 * Update MIDI device list in the UI
 */
function updateMIDIDeviceList() {
    const deviceSelector = document.getElementById('midiDeviceSelector');
    if (!deviceSelector) return;
    
    // Clear existing options
    deviceSelector.innerHTML = '';
    
    // Add a default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select MIDI Device --';
    deviceSelector.appendChild(defaultOption);
    
    // Add options for each input device
    MIDISystem.inputs.forEach((input, id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = input.name || `MIDI Input ${id}`;
        
        // Select the active device
        if (id === MIDISystem.activeDevice) {
            option.selected = true;
        }
        
        deviceSelector.appendChild(option);
    });
}

/**
 * Update MIDI status indicators in the UI
 */
function updateMIDIStatusUI() {
    // Update the status indicator
    const statusIndicator = document.getElementById('midiStatusIndicator');
    if (statusIndicator) {
        if (!MIDISystem.available) {
            statusIndicator.className = 'midi-status-indicator error';
            statusIndicator.title = 'MIDI not supported in this browser';
        } else if (MIDISystem.inputs.size === 0) {
            statusIndicator.className = 'midi-status-indicator warning';
            statusIndicator.title = 'No MIDI devices connected';
        } else if (MIDISystem.activeDevice) {
            statusIndicator.className = 'midi-status-indicator success';
            statusIndicator.title = 'MIDI connected: ' + 
                (MIDISystem.inputs.get(MIDISystem.activeDevice)?.name || 'Unknown device');
        } else {
            statusIndicator.className = 'midi-status-indicator warning';
            statusIndicator.title = 'MIDI devices available but none selected';
        }
    }
    
    // Update device count
    const deviceCount = document.getElementById('midiDeviceCount');
    if (deviceCount) {
        deviceCount.textContent = MIDISystem.inputs.size.toString();
    }
    
    // Update device selector
    updateMIDIDeviceList();
}

/**
 * Update the mappings display in the UI
 */
function updateMappingsUI() {
    const mappingsList = document.getElementById('midiMappingsList');
    if (!mappingsList) return;
    
    // Clear existing list
    mappingsList.innerHTML = '';
    
    // Create a list item for each mapping
    MIDISystem.mappings.forEach((elementId, cc) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Get a human-readable name for this parameter
        let paramName = elementId;
        
        // Try to find a better name from a label or closest container
        const container = element.closest('.knob-container, .small-knob-container');
        if (container) {
            const label = container.querySelector('.knob-label');
            if (label) {
                paramName = label.textContent;
            }
        }
        
        // Create the list item
        const listItem = document.createElement('div');
        listItem.className = 'midi-mapping-item';
        
        // Format CC number for display (handle notes differently)
        let ccDisplay;
        if (cc >= 1000) {
            ccDisplay = `Note ${cc - 1000}`;
        } else {
            ccDisplay = `CC ${cc}`;
        }
        
        listItem.innerHTML = `
            <span class="mapping-param">${paramName}</span>
            <span class="mapping-cc">${ccDisplay}</span>
            <button class="mapping-remove-btn" data-element-id="${elementId}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add event listener to remove button
        const removeBtn = listItem.querySelector('.mapping-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                removeMapping(elementId);
            });
        }
        
        mappingsList.appendChild(listItem);
    });
    
    // Show or hide the "no mappings" message
    const noMappingsMsg = document.getElementById('noMappingsMsg');
    if (noMappingsMsg) {
        noMappingsMsg.style.display = MIDISystem.mappings.size === 0 ? 'block' : 'none';
    }
}

/**
 * Get readable parameter name from element ID
 * @param {string} id - Element ID
 * @returns {string} Human-readable parameter name
 */
function getParameterName(id) {
    // Convert camelCase to spaces and capitalize first letter
    return id
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
}

// Export the MIDI system for use in main.js
export default MIDISystem; 