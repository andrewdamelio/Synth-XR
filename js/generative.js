// generative.js - Generative Music Mode for Synth XR

// Define scale patterns (semitone intervals from root)
const scalePatterns = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    blues: [0, 3, 5, 6, 7, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10]
};

// Note name to MIDI number mapping (for one octave)
const noteToMidiMap = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

// Mood presets mapping to musical parameters
const moodPresets = {
    calm: {
        tempo: { min: 60, max: 80 },
        noteLength: { min: 0.5, max: 2 },
        velocityRange: { min: 0.4, max: 0.6 },
        octaveRange: { min: 3, max: 5 },
        chordProbability: 0.1,
        restProbability: 0.3,
        filterSweepRate: 0.05
    },
    melancholic: {
        tempo: { min: 70, max: 90 },
        noteLength: { min: 0.3, max: 1.5 },
        velocityRange: { min: 0.4, max: 0.7 },
        octaveRange: { min: 2, max: 4 },
        chordProbability: 0.2,
        restProbability: 0.2, 
        filterSweepRate: 0.1
    },
    intense: {
        tempo: { min: 110, max: 140 },
        noteLength: { min: 0.1, max: 0.5 },
        velocityRange: { min: 0.6, max: 0.9 },
        octaveRange: { min: 3, max: 6 },
        chordProbability: 0.3,
        restProbability: 0.1,
        filterSweepRate: 0.2
    },
    playful: {
        tempo: { min: 90, max: 120 },
        noteLength: { min: 0.1, max: 0.8 },
        velocityRange: { min: 0.5, max: 0.8 },
        octaveRange: { min: 4, max: 6 },
        chordProbability: 0.15,
        restProbability: 0.2,
        filterSweepRate: 0.15
    },
    mysterious: {
        tempo: { min: 70, max: 100 },
        noteLength: { min: 0.3, max: 1.2 },
        velocityRange: { min: 0.3, max: 0.6 },
        octaveRange: { min: 2, max: 5 },
        chordProbability: 0.25,
        restProbability: 0.35,
        filterSweepRate: 0.07
    }
};

// Transition probability matrices for different moods (simplified Markov chains)
const transitionMatrices = {
    calm: [
        [0.2, 0.4, 0.2, 0.1, 0.05, 0.05, 0], // From scale degree 1
        [0.3, 0.1, 0.3, 0.2, 0.05, 0.05, 0], // From scale degree 2
        [0.1, 0.2, 0.1, 0.4, 0.1, 0.1, 0],   // From scale degree 3
        [0.3, 0.1, 0.2, 0.1, 0.2, 0.05, 0.05], // From scale degree 4
        [0.4, 0.05, 0.05, 0.2, 0.1, 0.2, 0],  // From scale degree 5
        [0.2, 0.1, 0.1, 0.1, 0.3, 0.1, 0.1],  // From scale degree 6
        [0.5, 0, 0.1, 0.1, 0.2, 0.1, 0]       // From scale degree 7
    ],
    melancholic: [
        [0.1, 0.1, 0.3, 0.2, 0.1, 0.1, 0.1],  // More focus on minor 3rd, 6th, 7th
        [0.2, 0.1, 0.3, 0.1, 0.1, 0.1, 0.1],
        [0.1, 0.2, 0.1, 0.2, 0.1, 0.2, 0.1],
        [0.2, 0.1, 0.2, 0.1, 0.2, 0.1, 0.1],
        [0.3, 0.1, 0.1, 0.2, 0.1, 0.1, 0.1],
        [0.1, 0.1, 0.2, 0.1, 0.1, 0.2, 0.2],
        [0.4, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
    ],
    intense: [
        [0.1, 0.2, 0.1, 0.1, 0.3, 0.1, 0.1],  // More jumps and dissonance
        [0.1, 0.1, 0.1, 0.2, 0.1, 0.2, 0.2],
        [0.2, 0.1, 0.1, 0.1, 0.2, 0.1, 0.2],
        [0.1, 0.2, 0.1, 0.1, 0.2, 0.2, 0.1],
        [0.3, 0.1, 0.2, 0.1, 0.1, 0.1, 0.1],
        [0.1, 0.2, 0.1, 0.2, 0.1, 0.1, 0.2],
        [0.3, 0.1, 0.2, 0.1, 0.2, 0.1, 0]
    ],
    playful: [
        [0.1, 0.3, 0.1, 0.2, 0.1, 0.1, 0.1],  // More skips and jumps
        [0.2, 0.1, 0.3, 0.1, 0.2, 0.1, 0],
        [0.1, 0.2, 0, 0.4, 0.1, 0.1, 0.1],
        [0.1, 0.1, 0.2, 0, 0.3, 0.2, 0.1],
        [0.2, 0.1, 0.1, 0.3, 0.1, 0.1, 0.1],
        [0.1, 0.2, 0.1, 0.1, 0.3, 0.1, 0.1],
        [0.4, 0.1, 0.1, 0.1, 0.2, 0.1, 0]
    ],
    mysterious: [
        [0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2],  // More dissonant intervals
        [0.2, 0.1, 0.1, 0, 0.3, 0.1, 0.2],
        [0.1, 0.1, 0.1, 0.2, 0.1, 0.3, 0.1],
        [0.1, 0, 0.2, 0.1, 0.1, 0.2, 0.3],
        [0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.2],
        [0.1, 0.1, 0.3, 0.1, 0.1, 0.1, 0.2],
        [0.3, 0.1, 0.1, 0.2, 0.2, 0.1, 0]
    ]
};

// Rhythm patterns for different moods
const rhythmPatterns = {
    calm: [
        [1, 0, 0, 0, 1, 0, 0, 0],  // Quarter notes
        [1, 0, 1, 0, 1, 0, 1, 0],  // Eighth notes
        [1, 0, 0, 0, 0, 0, 0, 0]   // Whole note
    ],
    melancholic: [
        [1, 0, 0, 1, 0, 0, 1, 0],  // Dotted eighth rhythm
        [1, 0, 0, 0, 1, 0, 0, 0],  // Quarter notes
        [1, 0, 0, 1, 0, 0, 0, 0]   // Syncopated
    ],
    intense: [
        [1, 0, 1, 0, 1, 0, 1, 0],  // Eighth notes
        [1, 1, 0, 1, 1, 0, 1, 1],  // Sixteenth note patterns
        [1, 0, 1, 1, 0, 1, 1, 0]   // Syncopated sixteenths
    ],
    playful: [
        [1, 0, 1, 0, 0, 1, 0, 1],  // Syncopated
        [1, 1, 0, 1, 0, 1, 1, 0],  // Bouncy rhythm
        [1, 0, 0, 1, 1, 0, 1, 0]   // Mixed
    ],
    mysterious: [
        [1, 0, 0, 0, 0, 1, 0, 0],  // Sparse
        [1, 0, 0, 1, 0, 0, 0, 0],  // Irregular
        [1, 0, 0, 0, 1, 0, 0, 1]   // Unsettling pattern
    ]
};

// Core Generative Engine Class
class GenerativeEngine {
    constructor(options = {}) {
        // Main configuration
        this.config = {
            scale: options.scale || 'major',
            root: options.root || 'C',
            mood: options.mood || 'calm',
            density: options.density !== undefined ? options.density : 50,
            variation: options.variation !== undefined ? options.variation : 40,
            evolution: options.evolution !== undefined ? options.evolution : 30,
            melodyEnabled: options.melodyEnabled !== undefined ? options.melodyEnabled : true,
            droneEnabled: options.droneEnabled !== undefined ? options.droneEnabled : true,
            rhythmEnabled: options.rhythmEnabled !== undefined ? options.rhythmEnabled : false
        };
        
        // Internal state
        this.isPlaying = false;
        this.currentBeat = 0;
        this.currentBar = 0;
        this.currentNotes = [];
        this.currentScale = [];
        this.droneNotes = [];
        this.lastNotePosition = 0;
        this.evolutionCounter = 0;
        this.variationThreshold = 0;
        this.currentNoteDegree = 0;
        this.synthRef = null;  // Will hold reference to synth
        this.droneSynth = null;
        this.droneSynthLayer = null;
        this.rhythmSynth = null;
        this.phraseCounter = 0;
        this.droneEvents = [];
        
        // Audio nodes/effects references
        this.moodSettings = {...moodPresets[this.config.mood]};
        this.transitionMatrix = [...transitionMatrices[this.config.mood]];
        this.tempo = this.getRandomInRange(this.moodSettings.tempo.min, this.moodSettings.tempo.max);
        
        // Tone.js part objects
        this.melodyPart = null;
        this.dronePart = null;
        this.rhythmPart = null;
        
        // Generate initial scale notes
        this.generateScaleNotes();
        this.updateInternalSettings();
    }
    
    // Calculate actual scale notes based on root and scale type
    generateScaleNotes() {
        // Get root MIDI value (in one octave)
        const rootValue = noteToMidiMap[this.config.root];
        if (rootValue === undefined) {
            console.error("Invalid root note:", this.config.root);
            return;
        }
        
        // Get pattern for selected scale
        const pattern = scalePatterns[this.config.scale];
        if (!pattern) {
            console.error("Invalid scale type:", this.config.scale);
            return;
        }
        
        // Generate scale notes across 3 octaves for melody
        this.currentScale = [];
        const octaveRange = this.moodSettings.octaveRange;
        
        for (let octave = octaveRange.min; octave <= octaveRange.max; octave++) {
            pattern.forEach(interval => {
                // Calculate MIDI note number and convert to note name with octave
                const midiNote = (octave * 12) + rootValue + interval;
                this.currentScale.push(midiNote);
            });
        }
        
        // Generate drone notes - root and fifth across 2 octaves
        this.droneNotes = [];
        // Root notes in lower octaves
        this.droneNotes.push((octaveRange.min - 1) * 12 + rootValue);
        this.droneNotes.push((octaveRange.min - 2) * 12 + rootValue);
        
        // Fifth (perfect fifth = 7 semitones above root)
        const fifthInterval = 7;
        this.droneNotes.push((octaveRange.min - 1) * 12 + rootValue + fifthInterval);

        // Ensure drone notes are valid
        if (this.droneNotes.length < 3) {
            console.warn("Generated invalid drone notes, using fallback values");
            // Set fallback values if drone notes generation failed
            this.droneNotes = [
                36, // C2 (low C)
                24, // C1 (very low C)
                43  // G2 (perfect fifth above C2)
            ];
        }
        console.log("Generated scale notes:", this.currentScale.length, "notes");
        console.log("Generated drone notes:", this.droneNotes);
    }
    
    // Update internal settings based on UI controls
    updateInternalSettings() {
        // Calculate variation threshold - higher value means less frequent variations
        this.variationThreshold = Math.max(1, Math.round(16 * (100 - this.config.variation) / 100));
        
        // Calculate evolution rate - how quickly parameters change
        this.evolutionRate = Math.max(1, Math.round(32 * (100 - this.config.evolution) / 100));
        
        // Apply density to note probability and pattern complexity
        const densityFactor = this.config.density / 100;
        this.noteProbability = 0.2 + (densityFactor * 0.6); // 0.2 to 0.8 based on density
        
        // Update pattern selection probability based on density
        if (densityFactor < 0.33) {
            this.patternWeights = [0.7, 0.2, 0.1]; // Favor simpler patterns at low density
        } else if (densityFactor < 0.66) {
            this.patternWeights = [0.3, 0.5, 0.2]; // Balanced at medium density
        } else {
            this.patternWeights = [0.1, 0.3, 0.6]; // Favor complex patterns at high density
        }
    }
    
    // Start the generative engine
    start(synthRef, filterRef) {
        if (this.isPlaying) return;

        console.log("Starting GenerativeEngine...");

        this.synthRef = synthRef;
        this.filterRef = filterRef;
        
        // Make sure Transport is started
        if (Tone.Transport.state !== "started") {
            console.log("Starting Tone.js Transport");
            Tone.Transport.start();
        }
        
        // Set the tempo
        Tone.Transport.bpm.value = this.tempo;
        console.log("Transport BPM set to:", this.tempo);
        
        // Create synths for different layers if needed
        if (this.config.droneEnabled && !this.droneSynth) {
            this.createDroneSynth();
        }
        
        if (this.config.rhythmEnabled && !this.rhythmSynth) {
            this.createRhythmSynth();
        }
        
        // Start the appropriate parts
        if (this.config.melodyEnabled) {
            this.startMelodyGenerator();
        }
        
        if (this.config.droneEnabled) {
            this.startDroneGenerator();
        }
        
        if (this.config.rhythmEnabled) {
            this.startRhythmGenerator();
        }
        
        // Start automatic parameter evolution
        this.startParameterEvolution();
        
        this.isPlaying = true;
    }
    
    // Stop the generative engine
    stop() {
        if (!this.isPlaying) return;
        
        // Dispose of all active parts
        if (this.melodyPart) {
            this.melodyPart.dispose();
            this.melodyPart = null;
        }
        
        if (this.dronePart) {
            this.dronePart.dispose();
            this.dronePart = null;
        }
        
        if (this.rhythmPart) {
            this.rhythmPart.dispose();
            this.rhythmPart = null;
        }
        
        // Clean up drone resources
        this.cleanupDrone();
        
        // Stop and dispose of rhythm synth
        if (this.rhythmSynth) {
            this.rhythmSynth.dispose();
            this.rhythmSynth = null;
        }
        
        // Clear evolution interval
        if (this.evolutionInterval) {
            clearInterval(this.evolutionInterval);
            this.evolutionInterval = null;
        }
        
        this.isPlaying = false;
    }
    
    // Start melody generation with more coherent phrases using Markov chains
    startMelodyGenerator() {
        console.log("Starting melody generator with scale:", this.currentScale.length, "notes");
        
        // Define phrase structure parameters
        const phraseLength = 8; // 8 beats per phrase
        this.phraseCounter = 0;
        let currentPhrase = [];
        
        // Create a melody loop that plays with better phrase structure
        this.melodyPart = new Tone.Loop((time) => {
            // Only proceed if melody is enabled
            if (!this.config.melodyEnabled || !this.synthRef || this.synthRef.disposed) return;
            
            // Use markov chain for better note sequencing
            const shouldPlay = Math.random() < (this.noteProbability - this.moodSettings.restProbability);
            
            if (shouldPlay) {
                // Important: Use the provided time parameter correctly
                // Add a small offset to ensure we're never scheduling in the past or at the same time
                const safeTime = time + 0.01;
                
                // Decide whether to play a chord based on chordProbability
                const playChord = Math.random() < this.moodSettings.chordProbability;
                
                if (playChord) {
                    // Generate and play a chord
                    const rootIndex = this.getNextNote();
                    const chordNotes = this.generateChord(rootIndex);
                    
                    // Convert MIDI note indices to actual notes
                    const chordNoteNames = chordNotes.map(index => {
                        const midiNote = this.currentScale[Math.min(index, this.currentScale.length - 1)];
                        return this.midiToNoteName(midiNote);
                    });
                    
                    // Get random velocity within mood's range
                    const velocity = this.getRandomInRange(
                        this.moodSettings.velocityRange.min,
                        this.moodSettings.velocityRange.max
                    );
                    
                    // Random note length for varied rhythm
                    // Important: Use simple note lengths like "4n", "8n" instead of computed values
                    const noteLengthOptions = ["4n", "8n", "2n", "8n.", "4n."];
                    const noteLength = noteLengthOptions[Math.floor(Math.random() * noteLengthOptions.length)];
                    
                    try {
                        // Play the chord with the safe time
                        this.synthRef.triggerAttackRelease(chordNoteNames, noteLength, safeTime, velocity);
                        
                        // Visualize the chord
                        chordNoteNames.forEach(note => this.highlightKey(note, Tone.Time(noteLength).toSeconds()));
                        
                        // Add to current phrase
                        currentPhrase = [...currentPhrase, ...chordNoteNames];
                    } catch (err) {
                        console.warn("Error playing chord:", err);
                    }
                } 
                else {
                    // Play a single note using Markov chain
                    const noteIndex = this.getNextNote();
                    if (noteIndex >= 0 && noteIndex < this.currentScale.length) {
                        const midiNote = this.currentScale[noteIndex];
                        const noteName = this.midiToNoteName(midiNote);
                        
                        // Get random velocity
                        const velocity = this.getRandomInRange(
                            this.moodSettings.velocityRange.min,
                            this.moodSettings.velocityRange.max
                        );
                        
                        // Use standard note lengths instead of computed values
                        const noteLengthOptions = ["8n", "4n", "2n", "16n", "8n."];
                        const noteLength = noteLengthOptions[Math.floor(Math.random() * noteLengthOptions.length)];
                        
                        try {
                            // Play the note with the safe time
                            this.synthRef.triggerAttackRelease(noteName, noteLength, safeTime, velocity);
                            
                            // Highlight key
                            this.highlightKey(noteName, Tone.Time(noteLength).toSeconds());
                            
                            // Add to current phrase
                            currentPhrase.push(noteName);
                        } catch (err) {
                            console.warn("Error playing note:", err);
                        }
                    }
                }
            }
            
            // Increment phrase counter
            this.phraseCounter = (this.phraseCounter + 1) % phraseLength;
            
            // When phrase completes, decide if we want a variation
            if (this.phraseCounter === 0) {
                if (Math.random() < (this.config.variation / 100)) {
                    // Create a variation in the music
                    setTimeout(() => this.createVariation(), 10); // Use setTimeout to avoid timing conflicts
                    
                    // Reset phrase
                    currentPhrase = [];
                }
            }
        }, "8n").start(0); // Play every eighth note
        
        console.log("Melody generator started with improved phrasing");
    }
    
    // Create advanced drone synth with better sound
    createDroneSynth() {
        console.log("Creating advanced drone synth...");
        
        // First dispose of any existing drone synth to prevent audio leaks
        if (this.droneSynth) {
            this.droneSynth.releaseAll();
            this.droneSynth.dispose();
            this.droneSynth = null;
        }
        
        if (this.droneEffects) {
            Object.values(this.droneEffects).forEach(effect => {
                if (effect && typeof effect.dispose === 'function') {
                    effect.dispose();
                }
            });
        }
        
        // Create effects chain specifically for the drone
        this.droneEffects = {
            // Add a filter that will shape the drone sound
            filter: new Tone.Filter({
                type: "lowpass",
                frequency: 800,
                Q: 1.5
            }),
            // Add chorus for width and movement
            chorus: new Tone.Chorus({
                frequency: 0.5,
                delayTime: 3.5,
                depth: 0.7,
                wet: 0.5,
                type: "sine"
            }).start(),
            // Add reverb for space
            reverb: new Tone.Reverb({
                decay: 4,
                wet: 0.3
            }),
            // Add compression to control dynamics
            compressor: new Tone.Compressor({
                threshold: -20,
                ratio: 4,
                attack: 0.005,
                release: 0.1
            }),
            // Ensure consistent volume
            limiter: new Tone.Limiter(-3)
        };
        
        // Connect the effects chain
        this.droneEffects.filter
            .connect(this.droneEffects.chorus)
            .connect(this.droneEffects.reverb)
            .connect(this.droneEffects.compressor)
            .connect(this.droneEffects.limiter);
        
        // Connect to the main output chain
        if (this.filterRef) {
            this.droneEffects.limiter.connect(this.filterRef);
        } else {
            // Connect directly to destination if filterRef isn't available
            this.droneEffects.limiter.connect(Tone.getDestination());
        }
        
        // Create the multi-oscillator drone synth for a richer sound
        this.droneSynth = new Tone.PolySynth({
            maxPolyphony: 6,  // Allow for multiple notes and layers
            voice: Tone.FMSynth, // Use FM synthesis for richer tones
            options: {
                harmonicity: 1.5,  // Harmonic relationship between carrier and modulator
                modulationIndex: 3.5, // Amount of modulation (higher = more complex sound)
                oscillator: {
                    type: "sine4",  // Sine with harmonics for richness 
                    phase: 0
                },
                modulation: {
                    type: "triangle"  // Triangle modulator for smoother sound
                },
                modulationEnvelope: {
                    attack: 0.9,
                    decay: 0.2,
                    sustain: 0.3,
                    release: 1.2
                },
                envelope: {
                    attack: 1.2,  // Slow attack for gentle fade in
                    decay: 0.3,
                    sustain: 0.9,  // High sustain for continuous sound
                    release: 3.0   // Long release for smooth transitions
                },
                volume: 0  // Start at unity gain - we'll control volume in the effects chain
            }
        });
        
        // Create a secondary layer for a richer drone
        this.droneSynthLayer = new Tone.PolySynth({
            maxPolyphony: 3,
            voice: Tone.AMSynth, // Use AM synthesis for the second layer
            options: {
                harmonicity: 2,
                oscillator: {
                    type: "sine", 
                },
                modulation: {
                    type: "square"  // Square modulator for a different character
                },
                envelope: {
                    attack: 2,    // Even slower attack for this layer
                    decay: 0.2,
                    sustain: 0.8,
                    release: 4.0   // Very long release
                },
                volume: -9  // Quieter than the main layer
            }
        });
        
        // Connect synths to effects chain
        this.droneSynth.connect(this.droneEffects.filter);
        this.droneSynthLayer.connect(this.droneEffects.filter);
        
        // Set up modulation for the filter to add movement to the drone
        this.droneModulation = new Tone.LFO({
            frequency: 0.05,  // Very slow modulation
            min: 600,         // Filter frequency range
            max: 1200,
            type: "sine"
        }).connect(this.droneEffects.filter.frequency).start();
        
        console.log("Advanced drone synth created successfully");
        return this.droneSynth;
    }
    
    // Start drone generator with improved sound and scheduling
    startDroneGenerator() {
        console.log("Starting drone generator, enabled:", this.config.droneEnabled);
        
        if (!this.config.droneEnabled) {
            console.log("Drone is disabled, not starting");
            return;
        }
        
        // Make sure we have a drone synth
        if (!this.droneSynth) {
            console.log("No drone synth, creating one");
            this.createDroneSynth();
            
            // If we still don't have a synth after trying to create one, exit
            if (!this.droneSynth) {
                console.error("Failed to create drone synth");
                return;
            }
        }
        
        // Stop any existing drone part
        if (this.dronePart) {
            console.log("Disposing existing drone part");
            this.dronePart.dispose();
            this.dronePart = null;
        }
        
        // Release any currently held notes
        if (this.droneSynth) {
            this.droneSynth.releaseAll();
        }
        
        if (this.droneSynthLayer) {
            this.droneSynthLayer.releaseAll();
        }
        
        // Safety check for droneNotes
        if (!this.droneNotes || this.droneNotes.length < 3) {
            console.warn("Drone notes not properly initialized, regenerating");
            this.generateScaleNotes(); // Regenerate scale notes to ensure drone notes are populated
        }
        
        // Get drone notes with octave variety
        const rootMidiNote = this.droneNotes[0]; // Base root
        const deepRootMidiNote = Math.max(0, rootMidiNote - 12); // One octave lower
        const fifthMidiNote = this.droneNotes[2]; // Fifth
        
        // Add more variety with additional notes from the scale
        const pattern = scalePatterns[this.config.scale];
        const rootValue = noteToMidiMap[this.config.root];
        if (!pattern || rootValue === undefined) {
            console.error("Invalid scale or root for drone notes");
            return;
        }
        
        // Add third if it exists in the scale (major or minor depending on scale)
        const thirdInterval = (this.config.scale === 'minor') ? 3 : 4;
        const thirdMidiNote = rootMidiNote + thirdInterval;
        
        // Convert to note names
        const rootNote = this.midiToNoteName(rootMidiNote);
        const deepRootNote = this.midiToNoteName(deepRootMidiNote);
        const fifthNote = this.midiToNoteName(fifthMidiNote);
        const thirdNote = this.midiToNoteName(thirdMidiNote);
        
        console.log("Drone notes:", rootNote, deepRootNote, thirdNote, fifthNote);

        // Clear any existing scheduled events
        if (this.droneEvents) {
            this.droneEvents.forEach(eventId => Tone.Transport.clear(eventId));
        }
        this.droneEvents = [];
        
        // Set up drone notes with proper scheduling
        this.scheduleDroneNotes(rootNote, deepRootNote, thirdNote, fifthNote);
        
        // Immediately trigger drone notes for instant feedback
        this.playDroneChord([rootNote, fifthNote]);
        
        console.log("Drone generator started successfully");
    }
    
    // Schedule drone notes using Tone.js timing for stability
    scheduleDroneNotes(rootNote, deepRootNote, thirdNote, fifthNote) {
        // Define different patterns to create interest over time
        const patterns = [
            // Pattern 1: Root + Fifth (stable)
            (time) => {
                // Add small offset to prevent scheduling conflicts
                const safeTime = time + 0.02;
                this.playDroneChord([rootNote, fifthNote], safeTime);
                
                // Add the deep root with the secondary layer for richness
                if (this.droneSynthLayer) {
                    // Use a different offset for the layer synth
                    this.droneSynthLayer.triggerAttack(deepRootNote, safeTime + 0.5, 0.4);
                }
            },
            // Pattern 2: Root + Third + Fifth (fuller harmony)
            (time) => {
                // Add small offset to prevent scheduling conflicts
                const safeTime = time + 0.02;
                this.playDroneChord([rootNote, thirdNote, fifthNote], safeTime);
            },
            // Pattern 3: Root octaves (powerful)
            (time) => {
                // Add small offset to prevent scheduling conflicts
                const safeTime = time + 0.02;
                this.playDroneChord([deepRootNote, rootNote], safeTime);
                
                // Add fifth on the secondary layer
                if (this.droneSynthLayer) {
                    // Use a different offset for the layer synth
                    this.droneSynthLayer.triggerAttack(fifthNote, safeTime + 0.7, 0.3);
                }
            },
            // Pattern 4: Subtle shift (movement)
            (time) => {
                // Add small offset to prevent scheduling conflicts
                const safeTime = time + 0.02;
                
                // Release previous notes gently
                if (this.droneSynth) {
                    this.droneSynth.triggerRelease([rootNote, fifthNote], safeTime + 0.5);
                }
                
                // Schedule note changes using Tone.Transport for accurate timing
                // Use increasing offsets to ensure proper ordering
                const eventId1 = Tone.Transport.scheduleOnce((t) => {
                    if (this.droneSynth && this.config.droneEnabled) {
                        this.playDroneChord([rootNote, thirdNote], t + 0.01);
                    }
                }, `+${1.5}`);
                
                const eventId2 = Tone.Transport.scheduleOnce((t) => {
                    if (this.droneSynth && this.config.droneEnabled) {
                        this.droneSynth.triggerAttack(fifthNote, t + 0.01, 0.4);
                    }
                }, `+${3}`);
                
                // Store event IDs for cleanup
                this.droneEvents.push(eventId1, eventId2);
            }
        ];
        
        // Create a part that cycles through patterns
        let patternIndex = 0;
        
        // Use Tone.Loop with a long interval to avoid timing conflicts
        this.dronePart = new Tone.Loop((time) => {
            // Skip if drone is disabled
            if (!this.config.droneEnabled || !this.droneSynth) return;
            
            // Get current pattern and increment for next time
            const currentPattern = patterns[patternIndex];
            patternIndex = (patternIndex + 1) % patterns.length;
            
            // Execute the pattern with the current time
            try {
                currentPattern(time);
            } catch (err) {
                console.warn("Error executing drone pattern:", err);
            }
            
        }, "16m").start("+0.1"); // Start with small offset and change every 16 measures
    }
    
    // Helper method to play a chord on the drone synth
    playDroneChord(notes, time) {
        if (!this.droneSynth || !this.config.droneEnabled) return;
        
        console.log("Playing drone chord:", notes.join(', '), time ? `at ${time}` : 'now');
        
        try {
            // Use provided time or current time, ensuring it's never in the past
            const playTime = time || (Tone.now() + 0.05); // Small offset to avoid "in the past" errors
            
            // Trigger the chord with a quieter velocity for a more subtle drone
            this.droneSynth.triggerAttack(notes, playTime, 0.6);
            
            // Visualize notes on keyboard
            notes.forEach(note => this.highlightKey(note, 2.0));
            
        } catch (err) {
            console.error("Error playing drone chord:", err);
        }
    }
    
    // Enhanced rhythm generation with polyrhythm support
    startRhythmGenerator() {
        if (!this.config.rhythmEnabled || !this.rhythmSynth) return;
        
        // Get rhythm pattern for current mood
        const patterns = rhythmPatterns[this.config.mood];
        const patternIndex = this.getWeightedRandomIndex(this.patternWeights);
        const pattern = patterns[patternIndex];
        
        // Choose between regular or polyrhythm timing
        const usePolyrhythm = Math.random() > 0.5;
        const loopLength = usePolyrhythm ? "0:3:0" : "1:0:0"; // 3/4 or 4/4 time
        
        // Create events array based on the pattern
        const events = [];
        
        pattern.forEach((hit, i) => {
            if (hit === 1) {
                // Calculate time position based on pattern index
                const bar = Math.floor(i / 4);
                const beat = i % 4;
                const subdivision = 0; // No subdivision within beat
                
                events.push({
                    time: `0:${beat}:${subdivision}`,
                    note: 'C2',
                    velocity: 0.7 + (Math.random() * 0.2) // Add slight velocity variation
                });
            }
        });
        
        // Create the rhythm part with enhanced capabilities
        this.rhythmPart = new Tone.Part((time, event) => {
            if (!this.config.rhythmEnabled || !this.rhythmSynth) return;
            
            // Add slight timing variation for human feel
            const humanizedTime = time + (Math.random() * 0.02 - 0.01);
            
            // Play rhythm sound
            this.rhythmSynth.triggerAttackRelease(
                event.note,
                '16n',
                humanizedTime,
                event.velocity
            );
            
            // Occasionally add accent notes for interest
            if (Math.random() < 0.1) {
                // Add a ghost note or accent
                const accentNote = Math.random() > 0.5 ? 'G2' : 'E2';
                const accentTime = time + (Math.random() * 0.1);
                const accentVelocity = 0.3 + (Math.random() * 0.2);
                
                this.rhythmSynth.triggerAttackRelease(
                    accentNote,
                    '32n',
                    accentTime,
                    accentVelocity
                );
            }
            
        }, events).start(0);
        
        // Set loop parameters
        this.rhythmPart.loop = true;
        this.rhythmPart.loopEnd = loopLength;
        
        console.log(`Rhythm generator started in ${usePolyrhythm ? '3/4' : '4/4'} time`);
    }
    
    // Start parameter evolution
    startParameterEvolution() {
        // Clear any existing interval
        if (this.evolutionInterval) {
            clearInterval(this.evolutionInterval);
        }
        
        // Set up interval for evolving parameters
        const evolutionIntervalTime = 2000 + (this.evolutionRate * 500); // 2-18 seconds depending on rate
        
        this.evolutionInterval = setInterval(() => {
            // Skip evolution if not playing
            if (!this.isPlaying) return;
            
            this.evolutionCounter++;
            
            // Evolve different parameters at different rates
            
            // Most frequent: filter cutoff modulation
            if (this.filterRef && this.evolutionCounter % 2 === 0) {
                this.evolveFilterCutoff();
            }
            
            // Every 4 cycles: tempo variations
            if (this.evolutionCounter % 4 === 0) {
                this.evolveTempo();
            }
            
            // Every 8 cycles: mood parameter adjustments
            if (this.evolutionCounter % 8 === 0) {
                this.evolveMoodParameters();
            }
            
        }, evolutionIntervalTime);
    }
    
    // Get next note using Markov chain transition
    getNextNote() {
        // If we're at the start or after a rest, favor the root note
        if (this.currentNoteDegree === -1 || Math.random() < 0.2) {
            this.currentNoteDegree = 0; // Root note
            return this.getScaleNoteIndex(0);
        }
        
        // Get the row from transition matrix for current degree
        const transitions = this.transitionMatrix[this.currentNoteDegree];
        
        // Use transitions to pick next scale degree
        let random = Math.random();
        let cumulativeProbability = 0;
        
        for (let i = 0; i < transitions.length; i++) {
            cumulativeProbability += transitions[i];
            if (random < cumulativeProbability) {
                this.currentNoteDegree = i;
                return this.getScaleNoteIndex(i);
            }
        }
        
        // Fallback to root note
        this.currentNoteDegree = 0;
        return this.getScaleNoteIndex(0);
    }
    
    // Get weighted index from array of probabilities
    getWeightedRandomIndex(weights) {
        const sum = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * sum;
        let cumulativeWeight = 0;
        
        for (let i = 0; i < weights.length; i++) {
            cumulativeWeight += weights[i];
            if (random < cumulativeWeight) {
                return i;
            }
        }
        
        // Fallback
        return 0;
    }
    
    // Get a scale note index with octave variation
    getScaleNoteIndex(degree) {
        // Choose octave based on mood settings and some randomness
        const octaveSpread = this.moodSettings.octaveRange.max - this.moodSettings.octaveRange.min;
        const centerPosition = (octaveSpread / 2) + this.moodSettings.octaveRange.min;
        
        // This gives weighting toward the central octave
        const octaveVariation = Math.round((Math.random() - 0.5) * octaveSpread);
        const targetOctave = Math.min(
            this.moodSettings.octaveRange.max, 
            Math.max(this.moodSettings.octaveRange.min, Math.round(centerPosition + octaveVariation))
        );
        
        // Calculate offset based on octave from min octave
        const octaveOffset = targetOctave - this.moodSettings.octaveRange.min;
        const scaleLength = scalePatterns[this.config.scale].length;
        
        // Calculate index in the currentScale array
        return (octaveOffset * scaleLength) + degree;
    }
    
    // Generate a chord based on current scale and position
    generateChord(rootIndex) {
        // Determine chord type based on scale degree
        const pattern = scalePatterns[this.config.scale];
        const degreeInScale = rootIndex % pattern.length;
        let chordType = 'major'; // Default
        
        // In a major scale:
        // Degrees 1, 4, 5 are major
        // Degrees 2, 3, 6 are minor
        // Degree 7 is diminished
        if (this.config.scale === 'major') {
            if ([1, 2, 5].includes(degreeInScale)) {
                chordType = 'minor';
            } else if (degreeInScale === 6) {
                chordType = 'diminished';
            }
        }
        // In a minor scale:
        // Degrees 1, 4, 5 are minor
        // Degrees 3, 6, 7 are major
        // Degree 2 is diminished
        else if (this.config.scale === 'minor') {
            if ([0, 3, 4].includes(degreeInScale)) {
                chordType = 'minor';
            } else if (degreeInScale === 1) {
                chordType = 'diminished';
            }
        }
        
        // Create the chord based on type
        let chord = [rootIndex]; // Root note
        
        const scaleLength = pattern.length;
        const octaveOffset = Math.floor(rootIndex / scaleLength) * scaleLength;
        
        // Add third and fifth
        if (chordType === 'major') {
            // Major third (2 scale steps up)
            const thirdPos = (degreeInScale + 2) % scaleLength;
            // Perfect fifth (4 scale steps up)
            const fifthPos = (degreeInScale + 4) % scaleLength;
            
            chord.push(octaveOffset + thirdPos);
            chord.push(octaveOffset + fifthPos);
        }
        else if (chordType === 'minor') {
            // Minor third (1 scale step up)
            const thirdPos = (degreeInScale + 1) % scaleLength;
            // Perfect fifth (4 scale steps up)
            const fifthPos = (degreeInScale + 4) % scaleLength;
            
            chord.push(octaveOffset + thirdPos);
            chord.push(octaveOffset + fifthPos);
        }
        else if (chordType === 'diminished') {
            // Minor third (1 scale step up)
            const thirdPos = (degreeInScale + 1) % scaleLength;
            // Diminished fifth (3 scale steps up)
            const fifthPos = (degreeInScale + 3) % scaleLength;
            
            chord.push(octaveOffset + thirdPos);
            chord.push(octaveOffset + fifthPos);
        }
        
        return chord;
    }
    
    // Create a variation in the sequence
    createVariation() {
        // Options for variations
        const variationType = Math.floor(Math.random() * 4);
        
        switch (variationType) {
            case 0: // Transpose sequence
                this.transposeMelody();
                break;
            case 1: // Change rhythm pattern
                this.changeRhythmPattern();
                break;
            case 2: // Vary note density
                this.varyNoteDensity();
                break;
            case 3: // Filter sweep
                this.performFilterSweep();
                break;
        }
    }
    
    // Transpose melody by changing root note temporarily
    transposeMelody() {
        // Only transpose occasionally
        if (Math.random() > 0.3) return;
        
        // Get the notes of the current scale
        const scaleNotes = Object.keys(noteToMidiMap);
        const currentRootIndex = scaleNotes.indexOf(this.config.root);
        
        // Choose a new root note that's close to the original
        let newRootOffset = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
        if (newRootOffset === 0) newRootOffset = Math.random() > 0.5 ? 1 : -1;
        
        const newRootIndex = (currentRootIndex + newRootOffset + scaleNotes.length) % scaleNotes.length;
        const newRoot = scaleNotes[newRootIndex];
        
        // Temporary transpose - regenerate scale with new root
        const origRoot = this.config.root;
        this.config.root = newRoot;
        this.generateScaleNotes();
        
        // Schedule to revert back after a bit
        setTimeout(() => {
            this.config.root = origRoot;
            this.generateScaleNotes();
        }, 8000); // Revert after 8 seconds
    }
    
    // Change the rhythm pattern
    changeRhythmPattern() {
        if (!this.config.rhythmEnabled || !this.rhythmSynth) return;
        
        // Stop existing rhythm part
        if (this.rhythmPart) {
            this.rhythmPart.dispose();
        }
        
        // Start a new rhythm with different pattern
        this.startRhythmGenerator();
    }
    
    // Vary the note density
    varyNoteDensity() {
        // Temporarily change the note probability
        const originalProbability = this.noteProbability;
        
        // Increase or decrease by 20-40%
        const changeDirection = Math.random() > 0.5 ? 1 : -1;
        const changeAmount = 0.2 + (Math.random() * 0.2); // 0.2 to 0.4
        
        this.noteProbability = Math.max(0.1, Math.min(0.9, 
            originalProbability + (changeDirection * changeAmount)
        ));
        
        // Revert after some time
        setTimeout(() => {
            this.noteProbability = originalProbability;
        }, 5000 + (Math.random() * 5000)); // 5-10 seconds
    }
    
    // Perform filter sweep
    performFilterSweep() {
        if (!this.filterRef) return;
        
        // Get current filter frequency
        const currentFreq = this.filterRef.frequency.value;
        
        // Choose target frequency
        const direction = Math.random() > 0.5 ? 'up' : 'down';
        let targetFreq;
        
        if (direction === 'up') {
            targetFreq = Math.min(18000, currentFreq * (1.5 + Math.random()));
        } else {
            targetFreq = Math.max(100, currentFreq / (1.5 + Math.random()));
        }
        
        // Sweep duration based on mood's filter sweep rate
        const sweepTime = 1 / this.moodSettings.filterSweepRate;
        
        // Using Tone's ramp methods for smooth transition
        this.filterRef.frequency.exponentialRampToValueAtTime(
            targetFreq,
            Tone.now() + sweepTime
        );
    }
    
    // Evolve the filter cutoff over time
    evolveFilterCutoff() {
        if (!this.filterRef) return;
        
        // Subtle variations to filter cutoff
        const currentCutoff = this.filterRef.frequency.value;
        
        // Create an LFO-like effect with gentle modulation
        const modulationAmount = 0.3; // 30% variation
        const newCutoff = currentCutoff * (1 + (Math.random() * modulationAmount - modulationAmount/2));
        
        // Keep within reasonable bounds
        const boundedCutoff = Math.max(80, Math.min(18000, newCutoff));
        
        // Smooth transition
        this.filterRef.frequency.exponentialRampToValueAtTime(
            boundedCutoff,
            Tone.now() + 2
        );
    }
    
    // Evolve tempo over time
    evolveTempo() {
        const currentTempo = Tone.Transport.bpm.value;
        
        // Small variations: ±5%
        const variation = 0.05;
        const newTempo = currentTempo * (1 + (Math.random() * variation * 2 - variation));
        
        // Keep within mood's tempo range
        const boundedTempo = Math.max(
            this.moodSettings.tempo.min,
            Math.min(this.moodSettings.tempo.max, newTempo)
        );
        
        // Apply new tempo with smooth transition
        Tone.Transport.bpm.rampTo(boundedTempo, 4);
    }
    
    // Evolve mood parameters over time
    evolveMoodParameters() {
        // Small variations to various mood parameters
        
        // Evolve note length
        this.moodSettings.noteLength.min *= (1 + (Math.random() * 0.2 - 0.1)); // ±10%
        this.moodSettings.noteLength.max *= (1 + (Math.random() * 0.2 - 0.1)); // ±10%
        
        // Keep within reasonable limits
        this.moodSettings.noteLength.min = Math.max(0.1, Math.min(2, this.moodSettings.noteLength.min));
        this.moodSettings.noteLength.max = Math.max(this.moodSettings.noteLength.min + 0.1, 
                                                   Math.min(4, this.moodSettings.noteLength.max));
        
        // Evolve velocity ranges
        this.moodSettings.velocityRange.min *= (1 + (Math.random() * 0.1 - 0.05)); // ±5%
        this.moodSettings.velocityRange.max *= (1 + (Math.random() * 0.1 - 0.05)); // ±5%
        
        // Keep within 0-1 range and ensure min < max
        this.moodSettings.velocityRange.min = Math.max(0.2, Math.min(0.6, this.moodSettings.velocityRange.min));
        this.moodSettings.velocityRange.max = Math.max(this.moodSettings.velocityRange.min + 0.1, 
                                                     Math.min(1, this.moodSettings.velocityRange.max));
    }
    
    // Create rhythm synth
    createRhythmSynth() {
        this.rhythmSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: {
                type: 'sine'
            },
            envelope: {
                attack: 0.001,
                decay: 0.4,
                sustain: 0.01,
                release: 1.4,
                attackCurve: 'exponential'
            },
            volume: -8
        }).connect(this.filterRef);
    }
    
    // Helper method to convert MIDI note number to note name
    midiToNoteName(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return `${noteName}${octave}`;
    }
    
    // Helper to get random value in range
    getRandomInRange(min, max) {
        return min + (Math.random() * (max - min));
    }
    
    // Highlight keyboard key for note visualization
    highlightKey(note, duration) {
        try {
            // Find the key element
            const keyElement = document.querySelector(`.key[data-note="${note}"], .black-key[data-note="${note}"]`);
            if (!keyElement) return;
            
            // Add active class
            keyElement.classList.add('active');
            
            // Remove after duration
            const removeTime = Math.min(1500, duration * 400); // Cap at 1.5 seconds
            setTimeout(() => {
                keyElement.classList.remove('active');
            }, removeTime);
        } catch (e) {
            // Ignore errors in visualization
            console.debug('Error highlighting key:', e);
        }
    }
    
    // Set drone volume
    setDroneVolume(db) {
        console.log(`Setting drone volume to ${db}dB`);
        
        if (!this.droneEffects || !this.droneEffects.limiter) {
            console.warn("Drone effects not initialized");
            return false;
        }
        
        // Limit to reasonable range (-60 to +6 dB)
        const volume = Math.max(-60, Math.min(6, db));
        
        try {
            // Set the output level of the limiter
            this.droneEffects.limiter.threshold.value = volume;
            
            // Adjust the main synth volume for better balance
            if (this.droneSynth) {
                // Keep main synth slightly louder than the secondary layer
                this.droneSynth.volume.value = volume + 3;
            }
            
            // Adjust the secondary layer volume
            if (this.droneSynthLayer) {
                this.droneSynthLayer.volume.value = volume;
            }
            
            return true;
        } catch (err) {
            console.error("Error setting drone volume:", err);
            return false;
        }
    }
    
    // Test drone with better feedback
    testDrone() {
        console.log("Testing drone...");
        
        // Make sure we have a drone synth
        if (!this.droneSynth) {
            console.log("Creating drone synth for test");
            this.createDroneSynth();
        }
        
        // Root and fifth
        const rootMidiNote = this.droneNotes && this.droneNotes.length > 0 
            ? this.droneNotes[0] 
            : 36; // C2 as fallback
        
        const fifthMidiNote = this.droneNotes && this.droneNotes.length > 2
            ? this.droneNotes[2]
            : rootMidiNote + 7; // Perfect fifth
        
        const rootNote = this.midiToNoteName(rootMidiNote);
        const fifthNote = this.midiToNoteName(fifthMidiNote);
        
        console.log("Testing drone with notes:", rootNote, fifthNote);
        
        // Play chord with both synths for a full sound
        this.playDroneChord([rootNote, fifthNote]);
        
        // Layer with secondary synth for richness
        if (this.droneSynthLayer) {
            setTimeout(() => {
                this.droneSynthLayer.triggerAttack(this.midiToNoteName(rootMidiNote - 12), undefined, 0.4);
            }, 800);
        }
        
        return "Drone test initiated with notes: " + rootNote + ", " + fifthNote;
    }
    
    // Add cleanup function to properly dispose of all drone resources
    cleanupDrone() {
        console.log("Cleaning up drone resources");
        
        // Clear any scheduled events
        if (this.droneEvents) {
            this.droneEvents.forEach(eventId => {
                try {
                    Tone.Transport.clear(eventId);
                } catch (e) {
                    // Ignore errors during cleanup
                }
            });
            this.droneEvents = [];
        }
        
        // Release and dispose synths
        if (this.droneSynth) {
            try {
                this.droneSynth.releaseAll();
                this.droneSynth.dispose();
                this.droneSynth = null;
            } catch (e) {
                console.warn("Error disposing drone synth:", e);
            }
        }
        
        if (this.droneSynthLayer) {
            try {
                this.droneSynthLayer.releaseAll();
                this.droneSynthLayer.dispose();
                this.droneSynthLayer = null;
            } catch (e) {
                console.warn("Error disposing drone synth layer:", e);
            }
        }
        
        // Dispose modulation
        if (this.droneModulation) {
            try {
                this.droneModulation.stop();
                this.droneModulation.dispose();
                this.droneModulation = null;
            } catch (e) {
                console.warn("Error disposing drone modulation:", e);
            }
        }
        
        // Dispose effects chain
        if (this.droneEffects) {
            Object.values(this.droneEffects).forEach(effect => {
                try {
                    if (effect && typeof effect.dispose === 'function') {
                        effect.dispose();
                    }
                } catch (e) {
                    console.warn("Error disposing drone effect:", e);
                }
            });
            this.droneEffects = null;
        }
    }
    
    // Update configuration with new settings
    updateConfig(newConfig) {
        // Store old settings for comparison
        const oldConfig = {...this.config};
        
        // Update with new settings
        Object.assign(this.config, newConfig);
        
        // Check which fundamental settings have changed
        const needsScaleUpdate = 
            this.config.scale !== oldConfig.scale || 
            this.config.root !== oldConfig.root;
            
        const needsMoodUpdate = this.config.mood !== oldConfig.mood;
        
        // Apply updates as needed
        if (needsScaleUpdate) {
            this.generateScaleNotes();
        }
        
        if (needsMoodUpdate) {
            this.moodSettings = {...moodPresets[this.config.mood]};
            this.transitionMatrix = [...transitionMatrices[this.config.mood]];
            
            // Update tempo from new mood
            this.tempo = this.getRandomInRange(
                this.moodSettings.tempo.min, 
                this.moodSettings.tempo.max
            );
            
            // Update transport tempo
            if (this.isPlaying) {
                Tone.Transport.bpm.value = this.tempo;
            }
        }
        
        // Update internal parameters
        this.updateInternalSettings();
        
        // Restart components if specific parameters changed
        if (this.isPlaying) {
            const densityChanged = this.config.density !== oldConfig.density;
            const variationChanged = this.config.variation !== oldConfig.variation;
            const evolutionChanged = this.config.evolution !== oldConfig.evolution;
            
            // If density or variation changed, restart melody and rhythm
            if (densityChanged || variationChanged) {
                console.log('Density or variation changed, updating generators');
                // Restart melody generation
                if (this.config.melodyEnabled && this.melodyPart) {
                    this.melodyPart.dispose();
                    this.melodyPart = null;
                    this.startMelodyGenerator();
                }
                
                // Restart rhythm generation
                if (this.config.rhythmEnabled && this.rhythmPart) {
                    this.rhythmPart.dispose();
                    this.rhythmPart = null;
                    this.startRhythmGenerator();
                }
            }
            
            // If evolution rate changed, restart parameter evolution
            if (evolutionChanged && this.evolutionInterval) {
                console.log('Evolution rate changed, restarting evolution cycle');
                clearInterval(this.evolutionInterval);
                this.startParameterEvolution();
            }
        }

        // Handle toggling of different generator parts
        if (this.isPlaying) {
            // Melody toggle
            if (this.config.melodyEnabled !== oldConfig.melodyEnabled) {
                if (this.config.melodyEnabled && !this.melodyPart) {
                    this.startMelodyGenerator();
                } else if (!this.config.melodyEnabled && this.melodyPart) {
                    this.melodyPart.dispose();
                    this.melodyPart = null;
                }
            }
            
            // Drone toggle
            if (this.config.droneEnabled !== oldConfig.droneEnabled) {
                console.log("Drone state changed to:", this.config.droneEnabled);
                
                if (this.config.droneEnabled) {
                    console.log("Enabling drone");
                    this.startDroneGenerator();
                } else {
                    console.log("Disabling drone");
                    
                    // Clear any scheduled events
                    if (this.droneEvents) {
                        this.droneEvents.forEach(eventId => {
                            try {
                                Tone.Transport.clear(eventId);
                            } catch (e) {
                                // Ignore errors during cleanup
                            }
                        });
                        this.droneEvents = [];
                    }
                    
                    // Release notes on synths
                    if (this.droneSynth) {
                        this.droneSynth.releaseAll();
                    }
                    
                    if (this.droneSynthLayer) {
                        this.droneSynthLayer.releaseAll();
                    }
                    
                    // Dispose drone part
                    if (this.dronePart) {
                        this.dronePart.dispose();
                        this.dronePart = null;
                    }
                }
            }
            
            // Rhythm toggle
            if (this.config.rhythmEnabled !== oldConfig.rhythmEnabled) {
                if (this.config.rhythmEnabled) {
                    if (!this.rhythmSynth) this.createRhythmSynth();
                    if (!this.rhythmPart) this.startRhythmGenerator();
                } else if (this.rhythmPart) {
                    this.rhythmPart.dispose();
                    this.rhythmPart = null;
                    
                    if (this.rhythmSynth) {
                        this.rhythmSynth.dispose();
                        this.rhythmSynth = null;
                    }
                }
            }
        }
    }
}

// Export the GenerativeEngine class
export { GenerativeEngine, scalePatterns, moodPresets };