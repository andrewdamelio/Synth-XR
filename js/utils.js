/**
 * utils.js - Utility functions for Synth XR
 */

/**
 * Updates the VU meter with an animated effect
 * @param {number} value - Value from 0 to 1 representing volume level
 */
export function updateVUMeter(value) {
    const vuMeter = document.getElementById('vuMeter');
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

/**
 * Converts a gain value to decibels
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
 * Generate notes array from C1 to B6
 * @returns {string[]} Array of note names with octave (e.g. "C4")
 */
export function generateNotes() {
    const notes = [];
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (let octave = 1; octave <= 6; octave++) {
        noteNames.forEach(note => {
            notes.push(`${note}${octave}`);
        });
    }
    return notes;
}

/**
 * Helper function to get note index (C = 0, C# = 1, etc.)
 * @param {string} note - Note name (e.g. "C#")
 * @returns {number} Index of the note (0-11)
 */
export function getNoteIndex(note) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return notes.indexOf(note);
}

/**
 * Helper function to get note from index
 * @param {number} index - Index of the note (0-11)
 * @returns {string} Note name (e.g. "C#")
 */
export function getNoteFromIndex(index) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return notes[index % 12]; // Ensure index wraps around
}

/**
 * Sets up a knob control with mouse/touch interaction
 * @param {string} knobId - ID of the knob element
 * @param {string} inputId - ID of the associated input element
 * @returns {Function} Function to update knob rotation
 */
export function setupKnob(knobId, inputId) {
    const knob = document.getElementById(knobId);
    const input = document.getElementById(inputId);
    if (!knob || !input) return () => {};
    
    let isDragging = false;
    let startY;
    let startValue;

    const updateKnobRotation = (value) => {
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const rotation = ((value - min) / (max - min)) * 270 - 135;
        gsap.to(knob, {
            rotation: rotation,
            duration: 0.1
        });
    };

    knob.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startValue = parseFloat(input.value);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault(); // Prevent text selection
    });

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const deltaY = startY - e.clientY;
        const range = parseFloat(input.max) - parseFloat(input.min);
        const valueChange = (deltaY / 100) * range;
        
        let newValue = startValue + valueChange;
        newValue = Math.max(parseFloat(input.min), Math.min(parseFloat(input.max), newValue));
        
        input.value = newValue;
        updateKnobRotation(newValue);
        input.dispatchEvent(new Event('input'));
    };

    const handleMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // Touch support
    knob.addEventListener('touchstart', (e) => {
        isDragging = true;
        startY = e.touches[0].clientY;
        startValue = parseFloat(input.value);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
        e.preventDefault(); // Prevent scrolling
    });

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        
        const deltaY = startY - e.touches[0].clientY;
        const range = parseFloat(input.max) - parseFloat(input.min);
        const valueChange = (deltaY / 100) * range;
        
        let newValue = startValue + valueChange;
        newValue = Math.max(parseFloat(input.min), Math.min(parseFloat(input.max), newValue));
        
        input.value = newValue;
        updateKnobRotation(newValue);
        input.dispatchEvent(new Event('input'));
        e.preventDefault(); // Prevent scrolling
    };

    const handleTouchEnd = () => {
        isDragging = false;
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    };

    // Initialize knob rotation
    updateKnobRotation(input.value);

    // Add input event listener to update knob when value changes
    input.addEventListener('input', () => {
        updateKnobRotation(input.value);
    });

    return updateKnobRotation;
}

/**
 * Creates an element and sets attributes
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
    const element = document.getElementById(id);
    if (!element) return '';
    
    const value = parseFloat(element.value);
    
    // Format based on whether it's an integer or float
    if (Number.isInteger(value)) {
        return `${value}${suffix}`;
    } else {
        return `${value.toFixed(decimals)}${suffix}`;
    }
}