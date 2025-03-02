/**
 * utils.js - Optimized utility functions for Synth XR
 */

// Cache for frequently used DOM elements
const elementCache = new Map();

/**
 * Get DOM element with caching for better performance
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} The DOM element or null if not found
 */
export function getElement(id) {
    if (!elementCache.has(id)) {
        const element = document.getElementById(id);
        if (element) {
            elementCache.set(id, element);
        } else {
            return null;
        }
    }
    return elementCache.get(id);
}

/**
 * Clears the element cache - useful when DOM structure changes
 */
export function clearElementCache() {
    elementCache.clear();
}

/**
 * Updates the VU meter with an animated effect
 * @param {number} value - Value from 0 to 1 representing volume level
 */
export function updateVUMeter(value) {
    const vuMeter = getElement('vuMeter');
    if (!vuMeter) return;
    
    gsap.to(vuMeter, {
        width: `${value * 100}%`,
        duration: 0.1,
        onComplete: () => {
            gsap.to(vuMeter, {
                width: '0%',
                duration: 0.3,
                ease: "power2.out"
            });
        }
    });
}

// Constant arrays for notes to avoid recreating them
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_CACHE = {};

/**
 * Converts a gain value to decibels with optional caching
 * @param {number} value - Gain value (0-1)
 * @returns {number} Value in decibels
 */
export function gainToDb(value) {
    // Use Tone.js utility if available, otherwise calculate manually
    if (window.Tone && window.Tone.gainToDb) {
        return Tone.gainToDb(value);
    }
    // Fallback calculation
    return 20 * Math.log10(value);
}

/**
 * Generate notes array from C1 to B6 (cached version)
 * @returns {string[]} Array of note names with octave (e.g. "C4")
 */
export function generateNotes() {
    // Return cached result if available
    if (NOTE_CACHE.allNotes) {
        return NOTE_CACHE.allNotes;
    }
    
    const notes = [];
    for (let octave = 1; octave <= 6; octave++) {
        for (let i = 0; i < NOTE_NAMES.length; i++) {
            notes.push(`${NOTE_NAMES[i]}${octave}`);
        }
    }
    
    // Cache the result
    NOTE_CACHE.allNotes = notes;
    return notes;
}

/**
 * Helper function to get note index (C = 0, C# = 1, etc.)
 * @param {string} note - Note name (e.g. "C#")
 * @returns {number} Index of the note (0-11)
 */
export function getNoteIndex(note) {
    return NOTE_NAMES.indexOf(note);
}

/**
 * Helper function to get note from index
 * @param {number} index - Index of the note (0-11)
 * @returns {string} Note name (e.g. "C#")
 */
export function getNoteFromIndex(index) {
    return NOTE_NAMES[index % 12]; // Ensure index wraps around
}

/**
 * Sets up a knob control with mouse/touch interaction
 * @param {string} knobId - ID of the knob element
 * @param {string} inputId - ID of the associated input element
 * @returns {Function} Function to update knob rotation
 */
export function setupKnob(knobId, inputId) {
    const knob = getElement(knobId);
    const input = getElement(inputId);
    if (!knob || !input) return () => {};
    
    let isDragging = false;
    let startY;
    let startValue;
    
    // Pre-calculate some values for better performance
    const inputMin = parseFloat(input.min);
    const inputMax = parseFloat(input.max);
    const range = inputMax - inputMin;

    const updateKnobRotation = (value) => {
        const normalized = (value - inputMin) / range;
        const rotation = normalized * 270 - 135;
        
        gsap.to(knob, {
            rotation: rotation,
            duration: 0.1
        });
    };
    
    // Shared handler for mouse/touch movement
    const handleMove = (clientY) => {
        if (!isDragging) return;
        
        const deltaY = startY - clientY;
        const valueChange = (deltaY / 100) * range;
        
        let newValue = startValue + valueChange;
        newValue = Math.max(inputMin, Math.min(inputMax, newValue));
        
        if (input.value !== newValue.toString()) {
            input.value = newValue;
            updateKnobRotation(newValue);
            input.dispatchEvent(new Event('input'));
        }
    };

    // Mouse event handlers with performance optimizations
    const handleMouseMove = (e) => handleMove(e.clientY);
    
    const handleMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    knob.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startValue = parseFloat(input.value);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault(); // Prevent text selection
    });

    // Touch event handlers with performance optimizations
    const handleTouchMove = (e) => {
        handleMove(e.touches[0].clientY);
        e.preventDefault(); // Prevent scrolling
    };
    
    const handleTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    };

    knob.addEventListener('touchstart', (e) => {
        isDragging = true;
        startY = e.touches[0].clientY;
        startValue = parseFloat(input.value);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
        e.preventDefault(); // Prevent scrolling
    });

    // Initialize knob rotation
    updateKnobRotation(parseFloat(input.value));

    // Add input event listener to update knob when value changes
    input.addEventListener('input', () => {
        updateKnobRotation(parseFloat(input.value));
    });

    return updateKnobRotation;
}

/**
 * Creates an element and sets attributes with optimized property assignment
 * @param {string} tag - HTML tag name
 * @param {object} attributes - Attributes to set
 * @param {string|Node} [content] - Content to add (string or another element)
 * @returns {HTMLElement} The created element
 */
export function createElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);
    
    // Set attributes
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.slice(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else {
            element.setAttribute(key, value);
        }
    }
    
    // Add content
    if (content) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof Node) {
            element.appendChild(content);
        }
    }
    
    return element;
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Gets parameter value with proper formatting based on type
 * @param {string} id - Element ID
 * @param {string} [suffix=''] - Optional suffix to add (e.g., "Hz")
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} Formatted value
 */
export function getFormattedParameterValue(id, suffix = '', decimals = 2) {
    const element = getElement(id);
    if (!element) return '';
    
    const value = parseFloat(element.value);
    
    // Format based on whether it's an integer or float
    if (Number.isInteger(value)) {
        return `${value}${suffix}`;
    } else {
        return `${value.toFixed(decimals)}${suffix}`;
    }
}

/**
 * Calculate rotation value for a knob from a normalized value
 * @param {number} normalizedValue - Value from 0 to 1
 * @returns {number} Rotation in degrees
 */
export function calculateKnobRotation(normalizedValue) {
    return normalizedValue * 270 - 135;
}

/**
 * Throttle function to limit how often a function is called
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 16) { // Default to roughly 60fps
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

/**
 * Optimized linear interpolation function
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}