// Enhanced Arpeggiator Module
import { setupKnob, updateVUMeter } from './utils.js';

// Constants to replace magic numbers
const CONSTANTS = {
  LOOKAHEAD_TIME: 25.0, // ms - how far ahead to schedule audio
  SCHEDULER_INTERVAL: 25.0, // ms - how often to call scheduling function
  MAX_RETRY_ATTEMPTS: 3, // Maximum number of retry attempts for scheduler errors
  BEHIND_THRESHOLD: 50.0, // ms - threshold to determine if scheduler is falling behind
  VU_METER_DECAY: 0.95, // VU meter decay rate
  VU_METER_ATTACK: 0.9, // VU meter attack rate
  MIN_OCTAVE: -2, // Minimum octave transposition
  MAX_OCTAVE: 2, // Maximum octave transposition
  DEFAULT_NOTE_DURATION: 0.8, // Default note duration as percentage of step time
};

// Module state - direct variables matching original implementation
let isArpeggiatorEnabled = false;
let arpeggiatorNotes = [];
let currentStep = 0;
let nextNoteTime = 0;
let timerID = null;
let schedulerFailCount = 0;
let noteIdCounter = 0; // For generating unique note IDs
let activeArpNotes = new Map(); // Map to track active arpeggiator notes with IDs
let timingCache = {}; // Cache for timing calculations
let lastArpNote = null; // Keep this for backward compatibility

// Arpeggiator settings - used by main.js
const arpeggiatorSettings = {
  rate: 120, // BPM
  direction: 'up',
  gate: 50, // percentage
  octave: 1,
  variation: 'normal',
  swing: 0
};

// Initialize the arpeggiator
function initArpeggiator(knobUpdaters, synth, activeNotes) {
  try {
    // Set up the knobs using the existing setupKnob function
    knobUpdaters.arpRate = setupKnob('arpRateKnob', 'arpRate');
    knobUpdaters.arpGate = setupKnob('arpGateKnob', 'arpGate');
    knobUpdaters.arpSwing = setupKnob('arpSwingKnob', 'arpSwing');
    
    // Add event listeners for controls
    const arpToggle = document.getElementById('arpEnabled');
    if (!arpToggle) {
      console.error("Arpeggiator toggle element not found! Should have ID 'arpEnabled'");
      return;
    }
    
    arpToggle.addEventListener('change', function(e) {
      try {
        isArpeggiatorEnabled = e.target.checked;
        console.log(`Arpeggiator ${isArpeggiatorEnabled ? 'enabled' : 'disabled'}`);
        
        // Update UI to show state
        const stateElement = document.getElementById('arpEnabledState');
        if (stateElement) {
          stateElement.textContent = isArpeggiatorEnabled ? 'ON' : 'OFF';
        }
        
        if (isArpeggiatorEnabled) {
          startArpeggiator(activeNotes);
        } else {
          stopArpeggiator();
          
          // Release ALL active notes to ensure no hanging notes
          if (synth && !synth.disposed) {
            synth.releaseAll();
            
            // Only retrigger notes that are being held with the computer keyboard
            // This will prevent quick chord notes from continuing to play
            setTimeout(() => {
              if (synth && !synth.disposed && window.activeComputerKeys) {
                // Create a set of notes that are actually being pressed on computer keyboard
                const keyboardNotes = new Set();
                
                // Add notes from computer keyboard
                window.activeComputerKeys.forEach(key => {
                  // If there's a keyboardNoteMap that maps keys to notes
                  if (window.keyboardNoteMap && window.keyboardNoteMap[key]) {
                    const baseNote = window.keyboardNoteMap[key];
                    // Convert key to actual note with octave
                    const note = baseNote.includes('+1') 
                      ? `${baseNote.replace('+1', '')}${window.currentOctave + 1}` 
                      : `${baseNote}${window.currentOctave}`;
                          
                    keyboardNotes.add(note);
                  }
                });
                
                // Trigger only the notes from keyboard
                keyboardNotes.forEach(note => {
                  synth.triggerAttack(note);
                });
                
                // Reset activeNotes to only contain notes that are actually being held
                activeNotes.clear();
                keyboardNotes.forEach(note => activeNotes.add(note));
              }
            }, 50);
          }
        }
      } catch (error) {
        console.error("Error in arpeggiator toggle handler:", error);
      }
    });
    
    const rateElement = document.getElementById('arpRate');
    if (rateElement) {
      rateElement.addEventListener('input', function(e) {
        try {
          arpeggiatorSettings.rate = parseInt(e.target.value);
          document.getElementById('arpRateValue').textContent = arpeggiatorSettings.rate + ' BPM';
          updateArpeggiatorTiming();
        } catch (error) {
          console.error("Error in arpRate handler:", error);
        }
      });
    }
    
    const directionElement = document.getElementById('arpDirection');
    if (directionElement) {
      directionElement.addEventListener('change', function(e) {
        try {
          arpeggiatorSettings.direction = e.target.value;
        } catch (error) {
          console.error("Error in arpDirection handler:", error);
        }
      });
    }
    
    const gateElement = document.getElementById('arpGate');
    if (gateElement) {
      gateElement.addEventListener('input', function(e) {
        try {
          arpeggiatorSettings.gate = parseInt(e.target.value);
          document.getElementById('arpGateValue').textContent = `${arpeggiatorSettings.gate}%`;
        } catch (error) {
          console.error("Error in arpGate handler:", error);
        }
      });
    }
    
    const swingElement = document.getElementById('arpSwing');
    if (swingElement) {
      swingElement.addEventListener('input', function(e) {
        try {
          arpeggiatorSettings.swing = parseInt(e.target.value);
          document.getElementById('arpSwingValue').textContent = `${arpeggiatorSettings.swing}%`;
          updateArpeggiatorTiming();
          resetTimingCache();
        } catch (error) {
          console.error("Error in arpSwing handler:", error);
        }
      });
    }

    // Initialize default values
    if (document.getElementById('arpRate')) {
      document.getElementById('arpRate').value = arpeggiatorSettings.rate;
      document.getElementById('arpRateValue').textContent = arpeggiatorSettings.rate + ' BPM';
    }
    
    if (document.getElementById('arpGate')) {
      document.getElementById('arpGate').value = arpeggiatorSettings.gate;
      document.getElementById('arpGateValue').textContent = `${arpeggiatorSettings.gate}%`;
    }
    
    if (document.getElementById('arpSwing')) {
      document.getElementById('arpSwing').value = arpeggiatorSettings.swing;
      document.getElementById('arpSwingValue').textContent = `${arpeggiatorSettings.swing}%`;
    }
    
    console.log("Arpeggiator initialized successfully");
  } catch (error) {
    console.error("Error initializing arpeggiator:", error);
  }
}

// Reset the timing cache
function resetTimingCache() {
  timingCache = {};
}

// Calculate timing for a specific step, with non-linear swing
function calculateStepTiming(step, bpm) {
  try {
    // Check if timing is already cached
    const cacheKey = `${step}-${bpm}-${arpeggiatorSettings.swing}`;
    if (timingCache[cacheKey]) {
      return timingCache[cacheKey];
    }
    
    // Calculate base step time in seconds
    const baseStepTime = 60.0 / bpm;
    
    // If no swing, return the base step time
    if (arpeggiatorSettings.swing <= 0) {
      timingCache[cacheKey] = baseStepTime;
      return baseStepTime;
    }
    
    // Non-linear scaling of swing amount (sqrt makes the curve gentler)
    const swingFactor = Math.sqrt(arpeggiatorSettings.swing / 100);
    
    // Apply swing - even steps are shortened, odd steps are lengthened
    let adjustedStepTime;
    
    if (step % 2 === 0) {
      // Even steps: shortened
      adjustedStepTime = baseStepTime * (1 - swingFactor * 0.5);
    } else {
      // Odd steps: lengthened
      adjustedStepTime = baseStepTime * (1 + swingFactor * 0.5);
    }
    
    // Cache the calculated timing
    timingCache[cacheKey] = adjustedStepTime;
    
    return adjustedStepTime;
  } catch (error) {
    console.error("Error calculating step timing:", error);
    // Fall back to a safe default
    return 60.0 / bpm;
  }
}

// Start the arpeggiator
function startArpeggiator(activeNotes) {
  try {
    console.log("Starting arpeggiator...");
    
    if (timerID) {
      clearInterval(timerID);
    }
    
    currentStep = 0;
    updateArpeggiatorTiming();
    
    // If we already have notes in activeNotes, add them to the arpeggiator
    if (activeNotes && activeNotes.size > 0 && arpeggiatorNotes.length === 0) {
      console.log(`Adding ${activeNotes.size} active notes to arpeggiator`);
      activeNotes.forEach(note => {
        addNoteToArpeggiator(note);
      });
    }
  } catch (error) {
    console.error("Error starting arpeggiator:", error);
  }
}

// Stop the arpeggiator
function stopArpeggiator() {
  try {
    if (timerID) {
      clearInterval(timerID);
      timerID = null;
    }
    
    // Release any currently playing arp note
    if (lastArpNote && window.synth) {
      try {
        window.synth.triggerRelease(lastArpNote);
        lastArpNote = null;
      } catch (e) {
        console.warn("Error releasing arp note:", e);
      }
    }

    // Clean up any active notes tracked in the Map
    activeArpNotes.forEach((noteInfo, id) => {
      if (noteInfo.timeoutId) {
        clearTimeout(noteInfo.timeoutId);
      }
    });
    activeArpNotes.clear();

    arpeggiatorNotes = [];
  } catch (error) {
    console.error("Error stopping arpeggiator:", error);
  }
}

// Update arpeggiator timing based on rate and swing
function updateArpeggiatorTiming() {
  try {
    if (timerID) {
      clearInterval(timerID);
      timerID = null;
    }
    
    if (!isArpeggiatorEnabled) return;
    
    // Calculate base interval
    const interval = 60000 / arpeggiatorSettings.rate;
    
    // Set up interval for playing arpeggiated notes
    timerID = setInterval(() => playArpeggiatorStep(window.synth), interval);
  } catch (error) {
    console.error("Error updating arpeggiator timing:", error);
  }
}

// Play the current step of the arpeggiator
function playArpeggiatorStep(synth) {
  try {
    if (!isArpeggiatorEnabled || !synth || synth.disposed) return;
    
    // Only play if we have notes
    if (arpeggiatorNotes.length > 0) {
      // Release previous note if any
      if (lastArpNote) {
        try {
          synth.triggerRelease(lastArpNote);
        } catch (e) {
          console.warn("Error releasing previous arp note:", e);
        }
      }
      
      // Determine which note to play based on direction and step
      let noteIndex;
      
      switch (arpeggiatorSettings.direction) {
        case 'up':
          noteIndex = currentStep % arpeggiatorNotes.length;
          break;
        case 'down':
          noteIndex = (arpeggiatorNotes.length - 1) - (currentStep % arpeggiatorNotes.length);
          break;
        case 'upDown':
        case 'updown':
          const cycleLength = (arpeggiatorNotes.length * 2) - 2;
          if (cycleLength <= 0) { // Handle single note case
            noteIndex = 0;
          } else {
            const position = currentStep % cycleLength;
            noteIndex = position < arpeggiatorNotes.length ? position : cycleLength - position;
          }
          break;
        case 'downUp':
        case 'downup':
          const cycleLength2 = (arpeggiatorNotes.length * 2) - 2;
          if (cycleLength2 <= 0) { // Handle single note case
            noteIndex = 0;
          } else {
            const position2 = currentStep % cycleLength2;
            noteIndex = position2 < arpeggiatorNotes.length ? 
              (arpeggiatorNotes.length - 1) - position2 : 
              position2 - (arpeggiatorNotes.length - 1);
          }
          break;
        case 'random':
          noteIndex = Math.floor(Math.random() * arpeggiatorNotes.length);
          break;
        default:
          noteIndex = currentStep % arpeggiatorNotes.length;
      }
      
      // Apply octave variation if needed
      let baseNote = arpeggiatorNotes[noteIndex];
      let notesToPlay = [baseNote];
      
      // Apply octave and variation processing
      if (arpeggiatorSettings.octave > 1) {
        // Handle different variations
        switch (arpeggiatorSettings.variation) {
          case 'octave':
            // Play the note at different octave positions based on step
            const octaveStep = Math.floor(currentStep / arpeggiatorNotes.length) % arpeggiatorSettings.octave;
            if (octaveStep > 0) {
              const noteParts = parseNote(baseNote);
              if (noteParts) {
                baseNote = noteParts.note + (noteParts.octave + octaveStep);
              }
            }
            notesToPlay = [baseNote];
            break;
            
          case 'chord':
            // Add octave-spaced notes to create chord-like effect
            notesToPlay = [baseNote];
            const baseParts = parseNote(baseNote);
            if (baseParts) {
              for (let i = 1; i < arpeggiatorSettings.octave; i++) {
                notesToPlay.push(baseParts.note + (baseParts.octave + i));
              }
            }
            break;
            
          default:
            notesToPlay = [baseNote];
        }
      }
      
      // Calculate note duration based on gate percentage
      const interval = 60000 / arpeggiatorSettings.rate;
      const noteDuration = (interval * arpeggiatorSettings.gate) / 100;
      
      // Apply swing if needed (adjust timing of even-numbered steps)
      let swingDelay = 0;
      if (arpeggiatorSettings.swing > 0 && currentStep % 2 === 1) {
        // Calculate swing using the enhanced non-linear approach
        const swingFactor = Math.sqrt(arpeggiatorSettings.swing / 100);
        swingDelay = (interval * swingFactor) / 2;
      }
      
      // Play the note(s) with slight delay to account for swing
      setTimeout(() => {
        try {
          // For chord variations, play all notes at once
          if (notesToPlay.length > 1) {
            synth.triggerAttackRelease(notesToPlay, noteDuration / 1000);
            lastArpNote = null; // We can't store multiple notes for release
            
            // Add each note to the tracking map
            notesToPlay.forEach(note => {
              const noteId = `arp-${noteIdCounter++}`;
              activeArpNotes.set(noteId, {
                note: note,
                timeoutId: setTimeout(() => {
                  activeArpNotes.delete(noteId);
                }, noteDuration)
              });
            });
          } else {
            synth.triggerAttack(notesToPlay[0]);
            lastArpNote = notesToPlay[0];
            
            // Add note to tracking map
            const noteId = `arp-${noteIdCounter++}`;
            activeArpNotes.set(noteId, {
              note: notesToPlay[0],
              timeoutId: setTimeout(() => {
                if (lastArpNote === notesToPlay[0]) {
                  try {
                    synth.triggerRelease(notesToPlay[0]);
                    lastArpNote = null;
                  } catch (e) {
                    // Ignore errors on release
                  }
                }
                activeArpNotes.delete(noteId);
              }, noteDuration)
            });
          }
          
          // Highlight the key on the keyboard UI
          notesToPlay.forEach(note => {
            highlightKeyFromArpeggiator(note, noteDuration / 1000);
          });
          
          // Update VU meter
          updateVUMeter(0.7);
        } catch (err) {
          console.warn("Error playing arpeggiator note:", err);
        }
      }, swingDelay);
      
      // Increment step
      currentStep++;
    }
  } catch (error) {
    console.error("Error in playArpeggiatorStep:", error);
  }
}

// Clear all current arpeggiator notes and release any that are playing
function clearArpeggiatorNotes() {
  try {
    // Release any currently playing arp note
    if (lastArpNote && window.synth && !window.synth.disposed) {
      try {
        window.synth.triggerRelease(lastArpNote);
        lastArpNote = null;
      } catch (e) {
        console.warn("Error releasing last arp note:", e);
      }
    }
    
    // Clean up any active notes tracked in the Map
    activeArpNotes.forEach((noteInfo, id) => {
      if (noteInfo.timeoutId) {
        clearTimeout(noteInfo.timeoutId);
      }
      
      // Also ensure the note itself is released
      if (noteInfo.note && window.synth && !window.synth.disposed) {
        try {
          window.synth.triggerRelease(noteInfo.note);
        } catch (e) {
          // Ignore errors on release
        }
      }
    });
    activeArpNotes.clear();
    
    // Clear the arpeggiator notes array
    arpeggiatorNotes = [];
    
    console.log("Cleared all arpeggiator notes");
  } catch (error) {
    console.error("Error clearing arpeggiator notes:", error);
  }
}

// Modify addNoteToArpeggiator to not clear on every note
function addNoteToArpeggiator(note) {
    try {
        // Check if this is a computer-keyboard generated note that needs octave adjustment
        // Notes from keyboard follow pattern like 'C4', 'D#5', etc.
        const match = note.match(/([A-G][#b]?)(\d+)/);
        if (match) {
            const noteName = match[1];
            const noteOctave = parseInt(match[2]);
            
            // If global currentOctave exists and differs from the note's octave,
            // adjust the note to use the current global octave
            if (window.currentOctave !== undefined && noteOctave !== window.currentOctave) {
                note = noteName + window.currentOctave;
            }
        }
        
        // Continue with regular note handling
        if (!arpeggiatorNotes.includes(note)) {
            arpeggiatorNotes.push(note);
            
            // Sort notes by pitch
            arpeggiatorNotes.sort((a, b) => {
                const aPitch = noteToPitch(a);
                const bPitch = noteToPitch(b);
                return aPitch - bPitch;
            });
            
            // If this is the first note and arpeggiator is enabled, start playing
            if (arpeggiatorNotes.length === 1 && isArpeggiatorEnabled && !timerID) {
                startArpeggiator(window.activeNotes);
            }
        }
    } catch (error) {
        console.error("Error adding note to arpeggiator:", error);
    }
}

// Remove a note from the arpeggiator
function removeNoteFromArpeggiator(note) {
  try {
    const index = arpeggiatorNotes.indexOf(note);
    if (index !== -1) {
      arpeggiatorNotes.splice(index, 1);
      
      // If no more notes and arpeggiator is running, stop it
      if (arpeggiatorNotes.length === 0 && timerID) {
        stopArpeggiator();
      }
    }
  } catch (error) {
    console.error("Error removing note from arpeggiator:", error);
  }
}

// Convert a note name to a pitch value for sorting
function noteToPitch(noteName) {
  // Extract note name and octave
  const parsedNote = parseNote(noteName);
  if (!parsedNote) return 0;
  
  // Define the mapping of note names to semitones
  const semitones = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
  };
  
  // Calculate MIDI note number
  return (parsedNote.octave + 1) * 12 + (semitones[parsedNote.note] || 0);
}

// Parse note string into note name and octave
function parseNote(noteString) {
  const match = noteString.match(/([A-G][#b]?)(\d+)/);
  if (!match) return null;
  
  return {
    note: match[1],
    octave: parseInt(match[2])
  };
}

// Helper function to highlight a key when a note plays in the arpeggiator
function highlightKeyFromArpeggiator(note, duration) {
  // Find the key element
  const keyElement = document.querySelector(`.key[data-note="${note}"]`) ||
                     document.querySelector(`.black-key[data-note="${note}"]`);
  
  if (keyElement) {
    // Add active class
    keyElement.classList.add('active');
    
    // Remove after duration
    setTimeout(() => {
      keyElement.classList.remove('active');
    }, duration * 1000);
  }
}

function updateArpeggiatorOctave(oldOctave, newOctave) {
  try {
    if (!isArpeggiatorEnabled || arpeggiatorNotes.length === 0) return;
    
    // Calculate the octave difference
    const octaveDiff = newOctave - oldOctave;
    if (octaveDiff === 0) return; // No change needed
    
    // Create a new array to store the transposed notes
    const newNotes = [];
    
    // Transpose each note in the arpeggiator
    arpeggiatorNotes.forEach(note => {
      const match = note.match(/([A-G][#b]?)(\d+)/);
      if (match) {
        const noteName = match[1];
        const noteOctave = parseInt(match[2]);
        
        // Calculate new octave with bounds checking
        let newNoteOctave = noteOctave + octaveDiff;
        // Keep octaves in a reasonable range (0-8)
        newNoteOctave = Math.max(0, Math.min(8, newNoteOctave));
        
        // Add the transposed note
        newNotes.push(noteName + newNoteOctave);
      } else {
        // If not a valid note format, keep as is
        newNotes.push(note);
      }
    });
    
    // Replace the current arpeggiator notes
    arpeggiatorNotes = newNotes;
    
    // Sort notes by pitch
    arpeggiatorNotes.sort((a, b) => {
      const aPitch = noteToPitch(a);
      const bPitch = noteToPitch(b);
      return aPitch - bPitch;
    });
    
    console.log(`Arpeggiator notes transposed by ${octaveDiff} octaves:`, arpeggiatorNotes);
  } catch (error) {
    console.error("Error updating arpeggiator octave:", error);
  }
}

// Export the necessary functions and variables
export {
    isArpeggiatorEnabled,
    arpeggiatorNotes,
    initArpeggiator,
    startArpeggiator,
    stopArpeggiator,
    addNoteToArpeggiator,
    removeNoteFromArpeggiator,
    updateArpeggiatorOctave,
    clearArpeggiatorNotes
};