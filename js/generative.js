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
        const rootValue = noteToMidiMap[this.config.root];
        if (rootValue === undefined) {
            console.error("Invalid root note:", this.config.root);
            return;
        }
        
        const pattern = scalePatterns[this.config.scale];
        if (!pattern) {
            console.error("Invalid scale type:", this.config.scale);
            return;
        }
        
        this.currentScale = [];
        const octaveRange = this.moodSettings.octaveRange;
        
        for (let octave = octaveRange.min; octave <= octaveRange.max; octave++) {
            pattern.forEach(interval => {
                const midiNote = (octave * 12) + rootValue + interval;
                this.currentScale.push(midiNote);
            });
        }
        
        this.droneNotes = [];
        this.droneNotes.push((octaveRange.min - 1) * 12 + rootValue);
        this.droneNotes.push((octaveRange.min - 2) * 12 + rootValue);
        const fifthInterval = 7;
        this.droneNotes.push((octaveRange.min - 1) * 12 + rootValue + fifthInterval);

        if (this.droneNotes.length < 3) {
            console.warn("Generated invalid drone notes, using fallback values");
            this.droneNotes = [36, 24, 43];
        }
        console.log("Generated scale notes:", this.currentScale.length, "notes");
        console.log("Generated drone notes:", this.droneNotes);
    }
    
    updateInternalSettings() {
        this.variationThreshold = Math.max(1, Math.round(16 * (100 - this.config.variation) / 100));
        this.evolutionRate = Math.max(1, Math.round(32 * (100 - this.config.evolution) / 100));
        const densityFactor = this.config.density / 100;
        this.noteProbability = 0.2 + (densityFactor * 0.6);
        
        if (densityFactor < 0.33) {
            this.patternWeights = [0.7, 0.2, 0.1];
        } else if (densityFactor < 0.66) {
            this.patternWeights = [0.3, 0.5, 0.2];
        } else {
            this.patternWeights = [0.1, 0.3, 0.6];
        }
    }
    
    start(synthRef, filterRef) {
        if (this.isPlaying) return;
        console.log("Starting GenerativeEngine...");
        this.synthRef = synthRef;
        this.filterRef = filterRef;
        
        if (Tone.Transport.state !== "started") {
            console.log("Starting Tone.js Transport");
            Tone.Transport.start();
        }
        
        Tone.Transport.bpm.value = this.tempo;
        console.log("Transport BPM set to:", this.tempo);
        
        if (this.config.droneEnabled && !this.droneSynth) {
            this.createDroneSynth();
        }
        
        if (this.config.rhythmEnabled && !this.rhythmSynth) {
            this.createRhythmSynth();
        }
        
        if (this.config.melodyEnabled) {
            this.startMelodyGenerator();
        }
        
        if (this.config.droneEnabled) {
            this.startDroneGenerator();
        }
        
        if (this.config.rhythmEnabled) {
            this.startRhythmGenerator();
        }
        
        this.startParameterEvolution();
        this.isPlaying = true;
    }
    
    stop() {
        if (!this.isPlaying) return;
        console.log("Stopping generative engine...");
        
        if (this.melodyPart) {
            this.melodyPart.dispose();
            this.melodyPart = null;
        }
        
        this.cleanupDrone();
        
        if (this.rhythmSynth) {
            this.rhythmSynth.dispose();
            this.rhythmSynth = null;
        }
        
        if (this.rhythmPart) {
            this.rhythmPart.dispose();
            this.rhythmPart = null;
        }
        
        if (this.evolutionInterval) {
            clearInterval(this.evolutionInterval);
            this.evolutionInterval = null;
        }
        
        this.isPlaying = false;
        console.log("Generative engine stopped");
    }
    
    // Enhanced Melody Generator with Markov-driven rests and visualization
    startMelodyGenerator() {
        console.log("Starting enhanced melody generator with scale:", this.currentScale.length, "notes");
        
        const phraseLength = 8; // 8 beats per phrase
        this.phraseCounter = 0;
        let currentPhrase = [];
        
        this.melodyPart = new Tone.Loop((time) => {
            if (!this.config.melodyEnabled || !this.synthRef || this.synthRef.disposed) return;
            
            const shouldPlay = Math.random() < this.noteProbability;
            const shouldRest = Math.random() < this.moodSettings.restProbability;
            const shouldChord = Math.random() < this.moodSettings.chordProbability;
            const safeTime = time + 0.01;
            
            if (shouldPlay && !shouldRest) {
                if (shouldChord) {
                    const rootIndex = this.getNextNote();
                    const chordIndices = this.generateChord(rootIndex);
                    const chordNotes = chordIndices.map(index => 
                        this.midiToNoteName(this.currentScale[Math.min(index, this.currentScale.length - 1)])
                    );
                    const noteLength = this.getRandomInRange(
                        this.moodSettings.noteLength.min,
                        this.moodSettings.noteLength.max
                    );
                    const velocity = this.getRandomInRange(
                        this.moodSettings.velocityRange.min,
                        this.moodSettings.velocityRange.max
                    );
                    try {
                        this.synthRef.triggerAttackRelease(chordNotes, `${noteLength}n`, safeTime, velocity);
                        chordNotes.forEach(note => this.highlightKey(note, noteLength));
                        this.visualizeNotes(chordNotes, safeTime);
                        currentPhrase = [...currentPhrase, ...chordNotes];
                    } catch (err) {
                        console.warn("Error playing chord:", err);
                    }
                } else {
                    const noteIndex = this.getNextNote();
                    if (noteIndex >= 0 && noteIndex < this.currentScale.length) {
                        const midiNote = this.currentScale[noteIndex];
                        const noteName = this.midiToNoteName(midiNote);
                        const noteLength = this.getRandomInRange(
                            this.moodSettings.noteLength.min,
                            this.moodSettings.noteLength.max
                        );
                        const velocity = this.getRandomInRange(
                            this.moodSettings.velocityRange.min,
                            this.moodSettings.velocityRange.max
                        );
                        try {
                            this.synthRef.triggerAttackRelease(noteName, `${noteLength}n`, safeTime, velocity);
                            this.highlightKey(noteName, noteLength);
                            this.visualizeNotes([noteName], safeTime);
                            currentPhrase.push(noteName);
                        } catch (err) {
                            console.warn("Error playing note:", err);
                        }
                    }
                }
            }
            
            this.phraseCounter = (this.phraseCounter + 1) % phraseLength;
            if (this.phraseCounter === 0 && Math.random() < (this.config.variation / 100)) {
                Tone.Transport.scheduleOnce(() => this.createVariation(), "+0.01");
                currentPhrase = [];
            }
        }, "8n").start(0);
        
        console.log("Enhanced melody generator started with dynamic evolution and visualization");
    }
    
    createDroneSynth() {
        console.log("Creating advanced drone synth...");
        this.cleanupDrone();
        
        this.droneEffects = {
            filter: new Tone.Filter({ type: "lowpass", frequency: 800, Q: 1.5 }),
            chorus: new Tone.Chorus({ frequency: 0.5, delayTime: 3.5, depth: 0.7, wet: 0.5, type: "sine" }).start(),
            reverb: new Tone.Reverb({ decay: 4, wet: 0.3 }),
            compressor: new Tone.Compressor({ threshold: -20, ratio: 4, attack: 0.005, release: 0.1 }),
            limiter: new Tone.Limiter(-3)
        };
        
        this.droneEffects.filter
            .connect(this.droneEffects.chorus)
            .connect(this.droneEffects.reverb)
            .connect(this.droneEffects.compressor)
            .connect(this.droneEffects.limiter);
        
        if (this.filterRef) {
            this.droneEffects.limiter.connect(this.filterRef);
        } else {
            this.droneEffects.limiter.connect(Tone.getDestination());
        }
        
        this.droneSynth = new Tone.PolySynth({
            maxPolyphony: 4,
            voice: Tone.FMSynth,
            options: {
                harmonicity: 1.5,
                modulationIndex: 3.5,
                oscillator: { type: "sine4", phase: 0 },
                modulation: { type: "triangle" },
                modulationEnvelope: { attack: 0.9, decay: 0.2, sustain: 0.3, release: 1.2 },
                envelope: { attack: 1.2, decay: 0.3, sustain: 0.9, release: 1.5 },
                volume: 0
            }
        });
        
        this.droneSynthLayer = new Tone.PolySynth({
            maxPolyphony: 2,
            voice: Tone.AMSynth,
            options: {
                harmonicity: 2,
                oscillator: { type: "sine" },
                modulation: { type: "square" },
                envelope: { attack: 2, decay: 0.2, sustain: 0.8, release: 2.0 },
                volume: -9
            }
        });
        
        this.droneSynth.connect(this.droneEffects.filter);
        this.droneSynthLayer.connect(this.droneEffects.filter);
        
        this.droneModulation = new Tone.LFO({
            frequency: 0.05,
            min: 600,
            max: 1200,
            type: "sine"
        }).connect(this.droneEffects.filter.frequency).start();
        
        console.log("Advanced drone synth created successfully");
        return this.droneSynth;
    }
    
    // Enhanced Drone Generator with detuning and complex scheduling
    startDroneGenerator() {
        console.log("Starting enhanced drone generator, enabled:", this.config.droneEnabled);
        
        if (!this.config.droneEnabled) {
            console.log("Drone is disabled, not starting");
            return;
        }
        
        setTimeout(() => {
            this.cleanupDrone();
            this.createDroneSynth();
            
            if (!this.droneSynth) {
                console.error("Failed to create drone synth");
                return;
            }
            
            if (!this.droneNotes || this.droneNotes.length < 3) {
                console.warn("Drone notes not properly initialized, regenerating");
                this.generateScaleNotes();
            }
            
            const rootMidiNote = this.droneNotes[0];
            const deepRootMidiNote = Math.max(0, rootMidiNote - 12);
            const fifthMidiNote = this.droneNotes[2];
            const thirdInterval = (this.config.scale === 'minor') ? 3 : 4;
            const thirdMidiNote = rootMidiNote + thirdInterval;
            
            const rootNote = this.midiToNoteName(rootMidiNote);
            const deepRootNote = this.midiToNoteName(deepRootMidiNote);
            const fifthNote = this.midiToNoteName(fifthMidiNote);
            const thirdNote = this.midiToNoteName(thirdMidiNote);
            
            console.log("Drone notes:", rootNote, deepRootNote, thirdNote, fifthNote);
            
            if (this.droneEvents && this.droneEvents.length > 0) {
                this.droneEvents.forEach(eventId => Tone.Transport.clear(eventId));
                this.droneEvents = [];
            }
            
            this.scheduleDroneNotes(rootNote, deepRootNote, thirdNote, fifthNote);
            this.playDroneChord([rootNote, fifthNote]);
            
            console.log("Enhanced drone generator started with detuning and scheduling");
        }, 150);
    }
    
    scheduleDroneNotes(rootNote, deepRootNote, thirdNote, fifthNote) {
        const patterns = [
            (time) => {
                const safeTime = time + 0.02;
                this.playDroneChord([rootNote, fifthNote], safeTime);
                if (this.droneSynthLayer) {
                    this.droneSynthLayer.triggerAttack(deepRootNote, safeTime + 0.5, 0.4);
                }
            },
            (time) => {
                const safeTime = time + 0.02;
                this.playDroneChord([rootNote, thirdNote, fifthNote], safeTime);
            },
            (time) => {
                const safeTime = time + 0.02;
                this.playDroneChord([deepRootNote, rootNote], safeTime);
                if (this.droneSynthLayer) {
                    this.droneSynthLayer.triggerAttack(fifthNote, safeTime + 0.7, 0.3);
                }
            },
            (time) => {
                const safeTime = time + 0.02;
                if (this.droneSynth) {
                    this.droneSynth.triggerRelease([rootNote, fifthNote], safeTime + 0.5);
                }
                const eventId1 = Tone.Transport.scheduleOnce((t) => {
                    if (this.droneSynth && this.config.droneEnabled) {
                        this.playDroneChord([rootNote, thirdNote], t + 0.01);
                    }
                }, "+1.5");
                const eventId2 = Tone.Transport.scheduleOnce((t) => {
                    if (this.droneSynth && this.config.droneEnabled) {
                        this.droneSynth.triggerAttack(fifthNote, t + 0.01, 0.4);
                    }
                }, "+3");
                this.droneEvents.push(eventId1, eventId2);
            }
        ];
        
        let patternIndex = 0;
        this.dronePart = new Tone.Loop((time) => {
            if (!this.config.droneEnabled || !this.droneSynth) return;
            const currentPattern = patterns[patternIndex];
            patternIndex = (patternIndex + 1) % patterns.length;
            try {
                currentPattern(time);
                // Dynamic detuning for organic evolution
                if (Math.random() < 0.2) {
                    this.droneSynth.detune.rampTo((Math.random() - 0.5) * 50, 4);
                }
            } catch (err) {
                console.warn("Error executing drone pattern:", err);
            }
        }, "16m").start("+0.1");
    }
    
    playDroneChord(notes, time) {
        if (!this.droneSynth || !this.config.droneEnabled) return;
        
        console.log("Playing drone chord:", notes.join(', '), time ? `at ${time}` : 'now');
        
        try {
            const playTime = time || (Tone.now() + 0.05);
            this.droneSynth.releaseAll(playTime - 0.01);
            const limitedNotes = notes.slice(0, 3);
            this.droneSynth.triggerAttack(limitedNotes, playTime, 0.6);
            limitedNotes.forEach(note => this.highlightKey(note, 2.0));
        } catch (err) {
            console.error("Error playing drone chord:", err);
        }
    }
    
    // Enhanced Rhythm Generator with evolving patterns
    startRhythmGenerator() {
        console.log("Starting enhanced rhythm generator");
        
        if (!this.config.rhythmEnabled || !this.rhythmSynth) return;
        
        const patterns = rhythmPatterns[this.config.mood];
        let currentPattern = patterns[this.getWeightedRandomIndex(this.patternWeights)];
        const usePolyrhythm = Math.random() > 0.5;
        const loopLength = usePolyrhythm ? "0:3:0" : "1:0:0";
        
        const events = [];
        currentPattern.forEach((hit, i) => {
            if (hit === 1) {
                const bar = Math.floor(i / 4);
                const beat = i % 4;
                const subdivision = 0;
                events.push({
                    time: `0:${beat}:${subdivision}`,
                    note: 'C2',
                    velocity: 0.7 + (Math.random() * 0.2)
                });
            }
        });
        
        this.rhythmPart = new Tone.Part((time, event) => {
            if (!this.config.rhythmEnabled || !this.rhythmSynth) return;
            const humanizedTime = time + (Math.random() * 0.02 - 0.01);
            this.rhythmSynth.triggerAttackRelease(event.note, "16n", humanizedTime, event.velocity);
            
            if (Math.random() < 0.1) {
                const accentNote = Math.random() > 0.5 ? 'G2' : 'E2';
                const accentTime = time + (Math.random() * 0.1);
                const accentVelocity = 0.3 + (Math.random() * 0.2);
                this.rhythmSynth.triggerAttackRelease(accentNote, "32n", accentTime, accentVelocity);
            }
        }, events).start(0);
        
        this.rhythmPart.loop = true;
        this.rhythmPart.loopEnd = loopLength;
        
        // Add pattern evolution every 8 measures
        Tone.Transport.scheduleRepeat(() => {
            if (Math.random() < 0.15) {
                console.log("Evolving rhythm pattern");
                currentPattern = currentPattern.map(hit => 
                    Math.random() < 0.1 ? (hit === 1 ? 0 : 1) : hit
                );
                this.rhythmPart.clear();
                currentPattern.forEach((hit, i) => {
                    if (hit) {
                        this.rhythmPart.at(`0:${i % 4}:0`, { 
                            note: 'C2', 
                            velocity: 0.7 + Math.random() * 0.2 
                        });
                    }
                });
            }
        }, "8m");
        
        console.log(`Enhanced rhythm generator started in ${usePolyrhythm ? '3/4' : '4/4'} time with evolution`);
    }
    
    startParameterEvolution() {
        if (this.evolutionInterval) {
            clearInterval(this.evolutionInterval);
        }
        
        const evolutionIntervalTime = 2000 + (this.evolutionRate * 500);
        this.evolutionInterval = setInterval(() => {
            if (!this.isPlaying) return;
            this.evolutionCounter++;
            
            if (this.filterRef && this.evolutionCounter % 2 === 0) {
                this.evolveFilterCutoff();
            }
            
            if (this.evolutionCounter % 4 === 0) {
                this.evolveTempo();
            }
            
            if (this.evolutionCounter % 8 === 0) {
                this.evolveMoodParameters();
            }
        }, evolutionIntervalTime);
    }
    
    getNextNote() {
        if (this.currentNoteDegree === -1 || Math.random() < 0.2) {
            this.currentNoteDegree = 0;
            return this.getScaleNoteIndex(0);
        }
        
        const transitions = this.transitionMatrix[this.currentNoteDegree];
        let random = Math.random();
        let cumulativeProbability = 0;
        
        for (let i = 0; i < transitions.length; i++) {
            cumulativeProbability += transitions[i];
            if (random < cumulativeProbability) {
                this.currentNoteDegree = i;
                return this.getScaleNoteIndex(i);
            }
        }
        
        this.currentNoteDegree = 0;
        return this.getScaleNoteIndex(0);
    }
    
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
        return 0;
    }
    
    getScaleNoteIndex(degree) {
        const octaveSpread = this.moodSettings.octaveRange.max - this.moodSettings.octaveRange.min;
        const centerPosition = (octaveSpread / 2) + this.moodSettings.octaveRange.min;
        const octaveVariation = Math.round((Math.random() - 0.5) * octaveSpread);
        const targetOctave = Math.min(
            this.moodSettings.octaveRange.max, 
            Math.max(this.moodSettings.octaveRange.min, Math.round(centerPosition + octaveVariation))
        );
        const octaveOffset = targetOctave - this.moodSettings.octaveRange.min;
        const scaleLength = scalePatterns[this.config.scale].length;
        return (octaveOffset * scaleLength) + degree;
    }
    
    generateChord(rootIndex) {
        const pattern = scalePatterns[this.config.scale];
        const degreeInScale = rootIndex % pattern.length;
        let chordType = 'major';
        
        if (this.config.scale === 'major') {
            if ([1, 2, 5].includes(degreeInScale)) {
                chordType = 'minor';
            } else if (degreeInScale === 6) {
                chordType = 'diminished';
            }
        } else if (this.config.scale === 'minor') {
            if ([0, 3, 4].includes(degreeInScale)) {
                chordType = 'minor';
            } else if (degreeInScale === 1) {
                chordType = 'diminished';
            }
        }
        
        let chord = [rootIndex];
        const scaleLength = pattern.length;
        const octaveOffset = Math.floor(rootIndex / scaleLength) * scaleLength;
        
        if (chordType === 'major') {
            const thirdPos = (degreeInScale + 2) % scaleLength;
            const fifthPos = (degreeInScale + 4) % scaleLength;
            chord.push(octaveOffset + thirdPos);
            chord.push(octaveOffset + fifthPos);
        } else if (chordType === 'minor') {
            const thirdPos = (degreeInScale + 1) % scaleLength;
            const fifthPos = (degreeInScale + 4) % scaleLength;
            chord.push(octaveOffset + thirdPos);
            chord.push(octaveOffset + fifthPos);
        } else if (chordType === 'diminished') {
            const thirdPos = (degreeInScale + 1) % scaleLength;
            const fifthPos = (degreeInScale + 3) % scaleLength;
            chord.push(octaveOffset + thirdPos);
            chord.push(octaveOffset + fifthPos);
        }
        return chord;
    }
    
    createVariation() {
        const variationType = Math.floor(Math.random() * 4);
        switch (variationType) {
            case 0: this.transposeMelody(); break;
            case 1: this.changeRhythmPattern(); break;
            case 2: this.varyNoteDensity(); break;
            case 3: this.performFilterSweep(); break;
        }
    }
    
    transposeMelody() {
        if (Math.random() > 0.3) return;
        const scaleNotes = Object.keys(noteToMidiMap);
        const currentRootIndex = scaleNotes.indexOf(this.config.root);
        let newRootOffset = Math.floor(Math.random() * 3) - 1;
        if (newRootOffset === 0) newRootOffset = Math.random() > 0.5 ? 1 : -1;
        const newRootIndex = (currentRootIndex + newRootOffset + scaleNotes.length) % scaleNotes.length;
        const newRoot = scaleNotes[newRootIndex];
        const origRoot = this.config.root;
        this.config.root = newRoot;
        this.generateScaleNotes();
        setTimeout(() => {
            this.config.root = origRoot;
            this.generateScaleNotes();
        }, 8000);
    }
    
    changeRhythmPattern() {
        if (!this.config.rhythmEnabled || !this.rhythmSynth) return;
        if (this.rhythmPart) {
            this.rhythmPart.dispose();
        }
        this.startRhythmGenerator();
    }
    
    varyNoteDensity() {
        const originalProbability = this.noteProbability;
        const changeDirection = Math.random() > 0.5 ? 1 : -1;
        const changeAmount = 0.2 + (Math.random() * 0.2);
        this.noteProbability = Math.max(0.1, Math.min(0.9, 
            originalProbability + (changeDirection * changeAmount)
        ));
        setTimeout(() => {
            this.noteProbability = originalProbability;
        }, 5000 + (Math.random() * 5000));
    }
    
    performFilterSweep() {
        if (!this.filterRef) return;
        const currentFreq = this.filterRef.frequency.value;
        const direction = Math.random() > 0.5 ? 'up' : 'down';
        let targetFreq;
        if (direction === 'up') {
            targetFreq = Math.min(18000, currentFreq * (1.5 + Math.random()));
        } else {
            targetFreq = Math.max(100, currentFreq / (1.5 + Math.random()));
        }
        const sweepTime = 1 / this.moodSettings.filterSweepRate;
        this.filterRef.frequency.exponentialRampToValueAtTime(targetFreq, Tone.now() + sweepTime);
    }
    
    evolveFilterCutoff() {
        if (!this.filterRef) return;
        const currentCutoff = this.filterRef.frequency.value;
        const modulationAmount = 0.3;
        const newCutoff = currentCutoff * (1 + (Math.random() * modulationAmount - modulationAmount/2));
        const boundedCutoff = Math.max(80, Math.min(18000, newCutoff));
        this.filterRef.frequency.exponentialRampToValueAtTime(boundedCutoff, Tone.now() + 2);
    }
    
    evolveTempo() {
        const currentTempo = Tone.Transport.bpm.value;
        const variation = 0.05;
        const newTempo = currentTempo * (1 + (Math.random() * variation * 2 - variation));
        const boundedTempo = Math.max(this.moodSettings.tempo.min, Math.min(this.moodSettings.tempo.max, newTempo));
        Tone.Transport.bpm.rampTo(boundedTempo, 4);
    }
    
    evolveMoodParameters() {
        this.moodSettings.noteLength.min *= (1 + (Math.random() * 0.2 - 0.1));
        this.moodSettings.noteLength.max *= (1 + (Math.random() * 0.2 - 0.1));
        this.moodSettings.noteLength.min = Math.max(0.1, Math.min(2, this.moodSettings.noteLength.min));
        this.moodSettings.noteLength.max = Math.max(this.moodSettings.noteLength.min + 0.1, Math.min(4, this.moodSettings.noteLength.max));
        
        this.moodSettings.velocityRange.min *= (1 + (Math.random() * 0.1 - 0.05));
        this.moodSettings.velocityRange.max *= (1 + (Math.random() * 0.1 - 0.05));
        this.moodSettings.velocityRange.min = Math.max(0.2, Math.min(0.6, this.moodSettings.velocityRange.min));
        this.moodSettings.velocityRange.max = Math.max(this.moodSettings.velocityRange.min + 0.1, Math.min(1, this.moodSettings.velocityRange.max));
    }
    
    createRhythmSynth() {
        this.rhythmSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: 'exponential' },
            volume: -8
        }).connect(this.filterRef);
    }
    
    midiToNoteName(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return `${noteName}${octave}`;
    }
    
    getRandomInRange(min, max) {
        return min + (Math.random() * (max - min));
    }
    
    // Visualization method for notes in a generative-visualizer container
    visualizeNotes(notes, time) {
        const container = document.querySelector('.generative-visualizer');
        if (!container) return;
        
        notes.forEach(note => {
            const noteVisual = document.createElement('div');
            noteVisual.className = 'generative-note';
            
            const noteParts = note.match(/([A-G]#?)(\d+)/);
            if (!noteParts) return;
            
            const noteName = noteParts[1];
            const octave = parseInt(noteParts[2]);
            const noteIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(noteName);
            const normalizedHeight = 1 - ((octave + noteIndex / 12) / 9);
            
            const horizontalPos = 10 + Math.random() * 80;
            const verticalPos = 10 + (normalizedHeight * 80);
            
            noteVisual.style.top = `${verticalPos}%`;
            noteVisual.style.left = `${horizontalPos}%`;
            
            const randomSize = 6 + Math.floor(Math.random() * 6);
            noteVisual.style.width = `${randomSize}px`;
            noteVisual.style.height = `${randomSize}px`;
            
            container.appendChild(noteVisual);
            
            setTimeout(() => {
                noteVisual.style.opacity = '0.8';
                setTimeout(() => {
                    noteVisual.style.opacity = '0';
                    setTimeout(() => {
                        if (noteVisual.parentNode === container) {
                            container.removeChild(noteVisual);
                        }
                    }, 300);
                }, 800);
            }, 10);
        });
    }
    
    highlightKey(note, duration) {
        try {
            const keyElement = document.querySelector(`.key[data-note="${note}"], .black-key[data-note="${note}"]`);
            if (!keyElement) return;
            keyElement.classList.add('active');
            const removeTime = Math.min(1500, duration * 400);
            setTimeout(() => {
                keyElement.classList.remove('active');
            }, removeTime);
        } catch (e) {
            console.debug('Error highlighting key:', e);
        }
    }
    
    setDroneVolume(db) {
        console.log(`Setting drone volume to ${db}dB`);
        if (!this.droneEffects || !this.droneEffects.limiter) {
            console.warn("Drone effects not initialized");
            return false;
        }
        const volume = Math.max(-60, Math.min(6, db));
        try {
            this.droneEffects.limiter.threshold.value = volume;
            if (this.droneSynth) {
                this.droneSynth.volume.value = volume + 3;
            }
            if (this.droneSynthLayer) {
                this.droneSynthLayer.volume.value = volume;
            }
            return true;
        } catch (err) {
            console.error("Error setting drone volume:", err);
            return false;
        }
    }
    
    testDrone() {
        console.log("Testing drone...");
        if (!this.droneSynth) {
            console.log("Creating drone synth for test");
            this.createDroneSynth();
        }
        const rootMidiNote = this.droneNotes && this.droneNotes.length > 0 ? this.droneNotes[0] : 36;
        const fifthMidiNote = this.droneNotes && this.droneNotes.length > 2 ? this.droneNotes[2] : rootMidiNote + 7;
        const rootNote = this.midiToNoteName(rootMidiNote);
        const fifthNote = this.midiToNoteName(fifthMidiNote);
        console.log("Testing drone with notes:", rootNote, fifthNote);
        this.playDroneChord([rootNote, fifthNote]);
        if (this.droneSynthLayer) {
            setTimeout(() => {
                this.droneSynthLayer.triggerAttack(this.midiToNoteName(rootMidiNote - 12), undefined, 0.4);
            }, 800);
        }
        return "Drone test initiated with notes: " + rootNote + ", " + fifthNote;
    }
    
    cleanupDrone() {
        console.log("Performing thorough drone cleanup");
        if (this.droneEvents && this.droneEvents.length > 0) {
            console.log(`Clearing ${this.droneEvents.length} scheduled drone events`);
            this.droneEvents.forEach(eventId => {
                try {
                    Tone.Transport.clear(eventId);
                } catch (e) {}
            });
            this.droneEvents = [];
        }
        
        if (this.dronePart) {
            console.log("Stopping drone part");
            try {
                this.dronePart.stop();
                this.dronePart.dispose();
            } catch (e) {
                console.warn("Error disposing drone part:", e);
            }
            this.dronePart = null;
        }
        
        if (this.droneSynth) {
            console.log("Releasing all drone synth notes");
            const synthToDispose = this.droneSynth;
            this.droneSynth = null;
            try {
                synthToDispose.releaseAll("+0.05");
                setTimeout(() => {
                    try {
                        console.log("Disconnecting and disposing main drone synth");
                        if (synthToDispose) {
                            synthToDispose.disconnect();
                            synthToDispose.dispose();
                        }
                    } catch (e) {
                        console.warn("Error during drone synth disposal:", e);
                    }
                }, 100);
            } catch (e) {
                console.warn("Error releasing drone synth notes:", e);
                try {
                    if (synthToDispose) {
                        synthToDispose.disconnect();
                        synthToDispose.dispose();
                    }
                } catch (innerE) {
                    console.warn("Error during forced drone synth disposal:", innerE);
                }
            }
        }
        
        if (this.droneSynthLayer) {
            console.log("Releasing all drone layer notes");
            const layerToDispose = this.droneSynthLayer;
            this.droneSynthLayer = null;
            try {
                layerToDispose.releaseAll("+0.05");
                setTimeout(() => {
                    try {
                        console.log("Disconnecting and disposing drone layer synth");
                        if (layerToDispose) {
                            layerToDispose.disconnect();
                            layerToDispose.dispose();
                        }
                    } catch (e) {
                        console.warn("Error during drone layer synth disposal:", e);
                    }
                }, 100);
            } catch (e) {
                console.warn("Error releasing drone layer notes:", e);
                try {
                    if (layerToDispose) {
                        layerToDispose.disconnect();
                        layerToDispose.dispose();
                    }
                } catch (innerE) {
                    console.warn("Error during forced drone layer disposal:", innerE);
                }
            }
        }
        
        if (this.droneModulation) {
            console.log("Stopping drone modulation");
            const modulationToDispose = this.droneModulation;
            this.droneModulation = null;
            try {
                modulationToDispose.stop();
                modulationToDispose.disconnect();
                modulationToDispose.dispose();
            } catch (e) {
                console.warn("Error disposing drone modulation:", e);
            }
        }
        
        if (this.droneEffects) {
            console.log("Cleaning up drone effects chain");
            const effectsToDispose = this.droneEffects;
            this.droneEffects = null;
            const effectsOrder = ['limiter', 'compressor', 'reverb', 'chorus', 'filter'];
            effectsOrder.forEach(effectName => {
                const effect = effectsToDispose[effectName];
                if (effect) {
                    try {
                        console.log(`Disconnecting and disposing ${effectName}`);
                        effect.disconnect();
                        effect.dispose();
                    } catch (e) {
                        console.warn(`Error disposing ${effectName}:`, e);
                    }
                }
            });
        }
        
        console.log("Drone cleanup completed");
    }

    updateConfig(newConfig) {
        const oldConfig = {...this.config};
        Object.assign(this.config, newConfig);
        
        const needsScaleUpdate = this.config.scale !== oldConfig.scale || this.config.root !== oldConfig.root;
        const needsMoodUpdate = this.config.mood !== oldConfig.mood;
        
        if (needsScaleUpdate) {
            this.generateScaleNotes();
        }
        
        if (needsMoodUpdate) {
            this.moodSettings = {...moodPresets[this.config.mood]};
            this.transitionMatrix = [...transitionMatrices[this.config.mood]];
            this.tempo = this.getRandomInRange(this.moodSettings.tempo.min, this.moodSettings.tempo.max);
            if (this.isPlaying) {
                Tone.Transport.bpm.value = this.tempo;
            }
        }
        
        this.updateInternalSettings();
        
        if (this.isPlaying) {
            const densityChanged = this.config.density !== oldConfig.density;
            const variationChanged = this.config.variation !== oldConfig.variation;
            const evolutionChanged = this.config.evolution !== oldConfig.evolution;
            
            if (densityChanged || variationChanged) {
                console.log('Density or variation changed, updating generators');
                if (this.config.melodyEnabled && this.melodyPart) {
                    this.melodyPart.dispose();
                    this.melodyPart = null;
                    this.startMelodyGenerator();
                }
                if (this.config.rhythmEnabled && this.rhythmPart) {
                    this.rhythmPart.dispose();
                    this.rhythmPart = null;
                    this.startRhythmGenerator();
                }
            }
            
            if (evolutionChanged && this.evolutionInterval) {
                console.log('Evolution rate changed, restarting evolution cycle');
                clearInterval(this.evolutionInterval);
                this.startParameterEvolution();
            }
        }

        if (this.isPlaying) {
            if (this.config.melodyEnabled !== oldConfig.melodyEnabled) {
                if (this.config.melodyEnabled && !this.melodyPart) {
                    this.startMelodyGenerator();
                } else if (!this.config.melodyEnabled && this.melodyPart) {
                    this.melodyPart.dispose();
                    this.melodyPart = null;
                }
            }
            
            if (this.config.droneEnabled !== oldConfig.droneEnabled) {
                console.log("Drone state changed to:", this.config.droneEnabled);
                if (this.config.droneEnabled) {
                    console.log("Enabling drone");
                    this.startDroneGenerator();
                } else {
                    console.log("Disabling drone");
                    this.cleanupDrone();
                }
            }
            
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

export { GenerativeEngine, scalePatterns, moodPresets };