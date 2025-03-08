// generative.js - Generative Music Mode for Synth XR
// An immersive, evolving soundscape generator

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

// Note name to MIDI number mapping
const noteToMidiMap = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

// Enhanced mood presets with richer parameters
const moodPresets = {
    calm: {
        tempo: { min: 60, max: 80 },
        noteLength: { min: 0.5, max: 2.5 },
        velocityRange: { min: 0.3, max: 0.6 },
        octaveRange: { min: 3, max: 5 },
        chordProbability: 0.15,
        restProbability: 0.35,
        filterSweepRate: 0.03,
        reverbWet: 0.4,
        dissonanceFactor: 0.1
    },
    melancholic: {
        tempo: { min: 70, max: 90 },
        noteLength: { min: 0.4, max: 2 },
        velocityRange: { min: 0.4, max: 0.7 },
        octaveRange: { min: 2, max: 4 },
        chordProbability: 0.25,
        restProbability: 0.25,
        filterSweepRate: 0.08,
        reverbWet: 0.6,
        dissonanceFactor: 0.3
    },
    intense: {
        tempo: { min: 110, max: 150 },
        noteLength: { min: 0.1, max: 0.6 },
        velocityRange: { min: 0.6, max: 1.0 },
        octaveRange: { min: 3, max: 6 },
        chordProbability: 0.4,
        restProbability: 0.05,
        filterSweepRate: 0.25,
        reverbWet: 0.2,
        dissonanceFactor: 0.5
    },
    playful: {
        tempo: { min: 90, max: 130 },
        noteLength: { min: 0.2, max: 1 },
        velocityRange: { min: 0.5, max: 0.9 },
        octaveRange: { min: 4, max: 6 },
        chordProbability: 0.2,
        restProbability: 0.15,
        filterSweepRate: 0.15,
        reverbWet: 0.3,
        dissonanceFactor: 0.2
    },
    mysterious: {
        tempo: { min: 60, max: 100 },
        noteLength: { min: 0.5, max: 1.5 },
        velocityRange: { min: 0.2, max: 0.6 },
        octaveRange: { min: 2, max: 5 },
        chordProbability: 0.3,
        restProbability: 0.4,
        filterSweepRate: 0.05,
        reverbWet: 0.7,
        dissonanceFactor: 0.4
    }
};

// Expanded transition matrices for melodic flow
const transitionMatrices = {
    calm: [
        [0.25, 0.35, 0.15, 0.1, 0.1, 0.05, 0],
        [0.3, 0.15, 0.25, 0.15, 0.1, 0.05, 0],
        [0.15, 0.25, 0.15, 0.3, 0.1, 0.05, 0],
        [0.2, 0.15, 0.2, 0.15, 0.25, 0.05, 0],
        [0.35, 0.1, 0.1, 0.15, 0.15, 0.15, 0],
        [0.2, 0.15, 0.1, 0.15, 0.25, 0.1, 0.05],
        [0.4, 0.05, 0.15, 0.15, 0.15, 0.1, 0]
    ],
    melancholic: [
        [0.15, 0.1, 0.3, 0.15, 0.1, 0.15, 0.05],
        [0.2, 0.1, 0.25, 0.15, 0.1, 0.15, 0.05],
        [0.1, 0.2, 0.15, 0.2, 0.15, 0.15, 0.05],
        [0.15, 0.15, 0.2, 0.1, 0.2, 0.15, 0.05],
        [0.25, 0.1, 0.15, 0.2, 0.15, 0.1, 0.05],
        [0.1, 0.15, 0.2, 0.15, 0.15, 0.15, 0.1],
        [0.3, 0.1, 0.15, 0.15, 0.15, 0.1, 0.05]
    ],
    intense: [
        [0.1, 0.2, 0.15, 0.15, 0.25, 0.1, 0.05],
        [0.15, 0.1, 0.15, 0.2, 0.15, 0.15, 0.1],
        [0.2, 0.15, 0.1, 0.15, 0.2, 0.1, 0.1],
        [0.15, 0.2, 0.15, 0.1, 0.2, 0.15, 0.05],
        [0.25, 0.15, 0.15, 0.15, 0.1, 0.1, 0.1],
        [0.15, 0.2, 0.15, 0.15, 0.1, 0.1, 0.15],
        [0.3, 0.15, 0.15, 0.1, 0.15, 0.1, 0.05]
    ],
    playful: [
        [0.15, 0.3, 0.15, 0.15, 0.15, 0.1, 0],
        [0.2, 0.15, 0.25, 0.15, 0.15, 0.1, 0],
        [0.15, 0.2, 0.1, 0.3, 0.15, 0.1, 0],
        [0.15, 0.15, 0.2, 0.1, 0.25, 0.15, 0],
        [0.2, 0.15, 0.15, 0.2, 0.15, 0.15, 0],
        [0.15, 0.2, 0.15, 0.15, 0.25, 0.1, 0],
        [0.35, 0.15, 0.15, 0.15, 0.15, 0.05, 0]
    ],
    mysterious: [
        [0.15, 0.1, 0.15, 0.15, 0.2, 0.15, 0.1],
        [0.2, 0.1, 0.15, 0.1, 0.25, 0.15, 0.05],
        [0.15, 0.15, 0.1, 0.2, 0.15, 0.2, 0.05],
        [0.15, 0.1, 0.2, 0.15, 0.15, 0.2, 0.05],
        [0.2, 0.15, 0.15, 0.15, 0.1, 0.15, 0.1],
        [0.15, 0.15, 0.2, 0.15, 0.15, 0.1, 0.1],
        [0.25, 0.15, 0.15, 0.2, 0.15, 0.1, 0]
    ]
};

// Rhythm patterns with more complexity
const rhythmPatterns = {
    calm: [
        [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // Subtle pulse
        [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0], // Gentle sway
        [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]  // Sparse
    ],
    melancholic: [
        [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0], // Wistful
        [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // Slow heartbeat
        [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0]  // Lagging
    ],
    intense: [
        [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1], // Driving
        [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1], // Relentless
        [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1]  // Chaotic
    ],
    playful: [
        [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0], // Bouncy
        [1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0], // Skipping
        [1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1]  // Whimsical
    ],
    mysterious: [
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], // Eerie
        [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0], // Unpredictable
        [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0]  // Haunting
    ]
};

// Core Generative Engine Class
class GenerativeEngine {
    constructor(options = {}) {
        this.config = {
            scale: options.scale || 'major',
            root: options.root || 'C',
            mood: options.mood || 'calm',
            density: options.density !== undefined ? options.density : 60,
            variation: options.variation !== undefined ? options.variation : 50,
            evolution: options.evolution !== undefined ? options.evolution : 40,
            melodyEnabled: options.melodyEnabled !== undefined ? options.melodyEnabled : true,
            droneEnabled: options.droneEnabled !== undefined ? options.droneEnabled : true,
            rhythmEnabled: options.rhythmEnabled !== undefined ? options.rhythmEnabled : true,
            ambienceEnabled: options.ambienceEnabled !== undefined ? options.ambienceEnabled : true
        };

        // Internal state
        this.isPlaying = false;
        this.currentBeat = 0;
        this.currentBar = 0;
        this.currentScale = [];
        this.droneNotes = [];
        this.harmonyState = { currentChord: null, nextChordTime: 0 };
        this.synthRef = null;
        this.droneSynth = null;
        this.ambienceSynth = null;
        this.rhythmSynth = null;
        this.melodyPart = null;
        this.dronePart = null;
        this.rhythmPart = null;
        this.ambiencePart = null;
        this.evolutionInterval = null;
        this.moodSettings = { ...moodPresets[this.config.mood] };
        this.transitionMatrix = [...transitionMatrices[this.config.mood]];
        this.tempo = this.getRandomInRange(this.moodSettings.tempo.min, this.moodSettings.tempo.max);

        this.generateScaleNotes();
        this.updateInternalSettings();
    }

    generateScaleNotes() {
        const rootValue = noteToMidiMap[this.config.root];
        if (rootValue === undefined) throw new Error("Invalid root note");
        const pattern = scalePatterns[this.config.scale];
        if (!pattern) throw new Error("Invalid scale type");

        this.currentScale = [];
        for (let octave = this.moodSettings.octaveRange.min; octave <= this.moodSettings.octaveRange.max; octave++) {
            pattern.forEach(interval => this.currentScale.push((octave * 12) + rootValue + interval));
        }

        this.droneNotes = [
            (this.moodSettings.octaveRange.min - 1) * 12 + rootValue,
            (this.moodSettings.octaveRange.min - 2) * 12 + rootValue,
            (this.moodSettings.octaveRange.min - 1) * 12 + rootValue + 7
        ];
        console.log("Scale notes:", this.currentScale);
        console.log("Drone notes:", this.droneNotes);
    }

    updateInternalSettings() {
        this.variationThreshold = Math.max(1, Math.round(16 * (100 - this.config.variation) / 100));
        this.evolutionRate = Math.max(1, Math.round(32 * (100 - this.config.evolution) / 100));
        const densityFactor = this.config.density / 100;
        this.noteProbability = 0.3 + (densityFactor * 0.6);
        this.patternWeights = densityFactor < 0.5 ? [0.6, 0.3, 0.1] : [0.2, 0.4, 0.4];
    }

    start(synthRef, filterRef) {
        if (this.isPlaying) return;
        console.log("Starting GenerativeEngine...");
        this.synthRef = synthRef;
        this.filterRef = filterRef;

        Tone.Transport.bpm.value = this.tempo;
        Tone.Transport.start();

        if (this.config.droneEnabled) this.createDroneSynth();
        if (this.config.rhythmEnabled) this.createRhythmSynth();
        if (this.config.ambienceEnabled) this.createAmbienceSynth();

        if (this.config.melodyEnabled) this.startMelodyGenerator();
        if (this.config.droneEnabled) this.startDroneGenerator();
        if (this.config.rhythmEnabled) this.startRhythmGenerator();
        if (this.config.ambienceEnabled) this.startAmbienceGenerator();

        this.startParameterEvolution();
        this.isPlaying = true;
    }

    stop() {
        if (!this.isPlaying) return;
        console.log("Stopping GenerativeEngine...");

        [this.melodyPart, this.dronePart, this.rhythmPart, this.ambiencePart].forEach(part => {
            if (part) part.dispose();
        });
        this.cleanupDrone();
        if (this.rhythmSynth) this.rhythmSynth.dispose();
        if (this.ambienceSynth) this.ambienceSynth.dispose();
        if (this.evolutionInterval) clearInterval(this.evolutionInterval);

        this.melodyPart = this.dronePart = this.rhythmPart = this.ambiencePart = null;
        this.rhythmSynth = this.ambienceSynth = null;
        this.isPlaying = false;
    }

    // Enhanced Melody Generator with adaptive harmony
    startMelodyGenerator() {
        console.log("Starting melody generator...");
        const phraseLength = 16;
        this.currentNoteDegree = 0;
        let currentPhrase = [];

        this.melodyPart = new Tone.Loop((time) => {
            if (!this.config.melodyEnabled || !this.synthRef) return;
            const safeTime = time + 0.01;

            const shouldPlay = Math.random() < this.noteProbability;
            const shouldRest = Math.random() < this.moodSettings.restProbability;
            const shouldChord = Math.random() < this.moodSettings.chordProbability;

            if (shouldPlay && !shouldRest) {
                let notesToPlay = [];
                if (shouldChord || (this.harmonyState.currentChord && Math.random() < 0.5)) {
                    notesToPlay = this.getHarmonicChord();
                } else {
                    const noteIndex = this.getNextNote();
                    notesToPlay = [this.midiToNoteName(this.currentScale[noteIndex])];
                }

                const noteLength = this.getRandomInRange(this.moodSettings.noteLength.min, this.moodSettings.noteLength.max);
                const velocity = this.getRandomInRange(this.moodSettings.velocityRange.min, this.moodSettings.velocityRange.max);

                this.synthRef.triggerAttackRelease(notesToPlay, `${noteLength}n`, safeTime, velocity);
                notesToPlay.forEach(note => this.highlightKey(note, noteLength));
                this.visualizeNotes(notesToPlay, safeTime);
                currentPhrase.push(...notesToPlay);
            }

            this.currentBeat = (this.currentBeat + 1) % phraseLength;
            if (this.currentBeat === 0) {
                if (Math.random() < this.config.variation / 100) this.createVariation();
                this.updateHarmony();
                currentPhrase = [];
            }
        }, "8n").start(0);
    }

    // Rich Drone Generator with layered textures
    createDroneSynth() {
        this.cleanupDrone();
        this.droneEffects = {
            filter: new Tone.Filter({ type: "lowpass", frequency: 1000, Q: 2 }),
            chorus: new Tone.Chorus({ frequency: 0.3, delayTime: 4, depth: 0.8, wet: 0.6 }).start(),
            reverb: new Tone.Reverb({ decay: 5, wet: this.moodSettings.reverbWet }),
            pingPong: new Tone.PingPongDelay({ delayTime: "8n", feedback: 0.3, wet: 0.2 }),
            limiter: new Tone.Limiter(-2)
        };

        this.droneEffects.filter
            .connect(this.droneEffects.chorus)
            .connect(this.droneEffects.reverb)
            .connect(this.droneEffects.pingPong)
            .connect(this.droneEffects.limiter)
            .connect(this.filterRef || Tone.getDestination());

        this.droneSynth = new Tone.PolySynth(Tone.FMSynth, {
            maxPolyphony: 6,
            options: {
                harmonicity: 1.2,
                modulationIndex: 4,
                oscillator: { type: "sine6" },
                modulation: { type: "triangle" },
                envelope: { attack: 2, decay: 0.5, sustain: 1, release: 3 },
                volume: -6
            }
        }).connect(this.droneEffects.filter);
    }

    startDroneGenerator() {
        if (!this.config.droneEnabled) return;
        this.createDroneSynth();

        const rootNote = this.midiToNoteName(this.droneNotes[0]);
        const deepNote = this.midiToNoteName(this.droneNotes[1]);
        const fifthNote = this.midiToNoteName(this.droneNotes[2]);

        this.dronePart = new Tone.Loop((time) => {
            const safeTime = time + 0.02;
            const pattern = Math.floor(Math.random() * 4);
            switch (pattern) {
                case 0: this.playDroneChord([rootNote, fifthNote], safeTime); break;
                case 1: this.playDroneChord([deepNote, rootNote], safeTime); break;
                case 2: this.playDroneChord([rootNote, fifthNote, this.midiToNoteName(this.droneNotes[0] + 4)], safeTime); break;
                case 3: this.droneSynth.triggerRelease([rootNote, fifthNote], safeTime); break;
            }
            if (Math.random() < 0.15) this.droneSynth.detune.rampTo((Math.random() - 0.5) * 100, 6);
        }, "8m").start("+0.1");
    }

    playDroneChord(notes, time) {
        if (!this.droneSynth) return;
        const playTime = time || Tone.now() + 0.05;
        this.droneSynth.releaseAll(playTime - 0.01);
        this.droneSynth.triggerAttack(notes.slice(0, 3), playTime, 0.5);
        notes.forEach(note => this.highlightKey(note, 4));
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
        return 0; // Fallback
    }
    
    // Dynamic Rhythm Generator
    startRhythmGenerator() {
        if (!this.config.rhythmEnabled || !this.rhythmSynth) return;
        const patterns = rhythmPatterns[this.config.mood];
        let currentPattern = patterns[this.getWeightedRandomIndex(this.patternWeights)];

        this.rhythmPart = new Tone.Part((time, event) => {
            const humanizedTime = time + (Math.random() * 0.03 - 0.015);
            this.rhythmSynth.triggerAttackRelease(event.note, "16n", humanizedTime, event.velocity);
            if (Math.random() < 0.2) {
                const accentNote = Math.random() > 0.5 ? "G2" : "D2";
                this.rhythmSynth.triggerAttackRelease(accentNote, "32n", humanizedTime + 0.05, 0.4);
            }
        }, this.generateRhythmEvents(currentPattern)).start(0);

        this.rhythmPart.loop = true;
        this.rhythmPart.loopEnd = "4m";

        Tone.Transport.scheduleRepeat(() => {
            if (Math.random() < 0.2) {
                currentPattern = this.evolveRhythmPattern(currentPattern);
                this.rhythmPart.events = this.generateRhythmEvents(currentPattern);
            }
        }, "16m");
    }

    generateRhythmEvents(pattern) {
        const events = [];
        pattern.forEach((hit, i) => {
            if (hit) {
                events.push({
                    time: `0:${Math.floor(i / 4)}:${(i % 4) * 4}`,
                    note: "C2",
                    velocity: 0.6 + Math.random() * 0.4
                });
            }
        });
        return events;
    }

    evolveRhythmPattern(pattern) {
        return pattern.map(hit => (Math.random() < 0.15 ? (hit ? 0 : 1) : hit));
    }

    // Ambient Layer for Immersion
    createAmbienceSynth() {
        this.ambienceSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 3, decay: 1, sustain: 0.7, release: 5 },
            volume: -12
        }).connect(this.droneEffects?.filter || Tone.getDestination());
    }

    startAmbienceGenerator() {
        if (!this.config.ambienceEnabled || !this.ambienceSynth) return;
        this.ambiencePart = new Tone.Loop((time) => {
            if (Math.random() < 0.1) {
                const note = this.midiToNoteName(this.currentScale[Math.floor(Math.random() * this.currentScale.length)]);
                this.ambienceSynth.triggerAttackRelease(note, "4n", time + 0.05, 0.3);
                this.visualizeNotes([note], time);
            }
        }, "2m").start("+0.2");
    }

    // Adaptive Harmony System
    updateHarmony() {
        if (Tone.now() > this.harmonyState.nextChordTime) {
            this.harmonyState.currentChord = this.generateChord(Math.floor(Math.random() * this.currentScale.length));
            this.harmonyState.nextChordTime = Tone.now() + this.getRandomInRange(8, 16);
        }
    }

    getHarmonicChord() {
        return this.harmonyState.currentChord || this.generateChord(0);
    }

    // Evolution and Variation
    startParameterEvolution() {
        this.evolutionInterval = setInterval(() => {
            if (!this.isPlaying) return;
            this.evolveParameters();
        }, 3000 + this.evolutionRate * 500);
    }

    evolveParameters() {
        if (this.filterRef && Math.random() < 0.5) this.evolveFilterCutoff();
        if (Math.random() < 0.3) this.evolveTempo();
        if (Math.random() < 0.2) this.evolveMoodParameters();
    }

    // Utility Methods (unchanged where possible)
    getNextNote() {
        if (this.currentNoteDegree === undefined || Math.random() < 0.25) {
            this.currentNoteDegree = 0;
            return this.getScaleNoteIndex(0);
        }
        const transitions = this.transitionMatrix[this.currentNoteDegree];
        let random = Math.random();
        let cumulative = 0;
        for (let i = 0; i < transitions.length; i++) {
            cumulative += transitions[i];
            if (random < cumulative) {
                this.currentNoteDegree = i;
                return this.getScaleNoteIndex(i);
            }
        }
        this.currentNoteDegree = 0;
        return this.getScaleNoteIndex(0);
    }

    getScaleNoteIndex(degree) {
        const octaveSpread = this.moodSettings.octaveRange.max - this.moodSettings.octaveRange.min;
        const octave = Math.floor(Math.random() * (octaveSpread + 1)) + this.moodSettings.octaveRange.min;
        const scaleLength = scalePatterns[this.config.scale].length;
        return (octave - this.moodSettings.octaveRange.min) * scaleLength + degree;
    }

    generateChord(rootIndex) {
        const pattern = scalePatterns[this.config.scale];
        const degree = rootIndex % pattern.length;
        const chord = [rootIndex];
        const scaleLength = pattern.length;
        const octaveOffset = Math.floor(rootIndex / scaleLength) * scaleLength;

        const third = (this.config.scale === "minor" && [0, 3, 4].includes(degree)) ? 1 : 2;
        const fifth = (degree === 6 && this.config.scale === "major") || (degree === 1 && this.config.scale === "minor") ? 3 : 4;

        chord.push(octaveOffset + (degree + third) % scaleLength);
        chord.push(octaveOffset + (degree + fifth) % scaleLength);
        if (Math.random() < this.moodSettings.dissonanceFactor) {
            chord.push(octaveOffset + (degree + Math.floor(Math.random() * scaleLength)) % scaleLength);
        }
        return chord.map(index => this.midiToNoteName(this.currentScale[index]));
    }

    createVariation() {
        const type = Math.floor(Math.random() * 5);
        switch (type) {
            case 0: this.transposeMelody(); break;
            case 1: this.changeRhythmPattern(); break;
            case 2: this.varyNoteDensity(); break;
            case 3: this.performFilterSweep(); break;
            case 4: this.addDissonantShift(); break;
        }
    }

    transposeMelody() {
        const scaleNotes = Object.keys(noteToMidiMap);
        const newRoot = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
        this.config.root = newRoot;
        this.generateScaleNotes();
        setTimeout(() => this.generateScaleNotes(), 12000);
    }

    changeRhythmPattern() {
        if (this.rhythmPart) this.startRhythmGenerator();
    }

    varyNoteDensity() {
        const original = this.noteProbability;
        this.noteProbability = Math.max(0.1, Math.min(0.9, original + (Math.random() * 0.4 - 0.2)));
        setTimeout(() => this.noteProbability = original, 8000);
    }

    performFilterSweep() {
        if (!this.filterRef) return;
        const currentFreq = this.filterRef.frequency.value;
        const targetFreq = Math.random() > 0.5 ? Math.min(20000, currentFreq * 2) : Math.max(80, currentFreq / 2);
        this.filterRef.frequency.exponentialRampToValueAtTime(targetFreq, Tone.now() + 1 / this.moodSettings.filterSweepRate);
    }

    addDissonantShift() {
        this.moodSettings.dissonanceFactor = Math.min(0.7, this.moodSettings.dissonanceFactor + 0.2);
        setTimeout(() => this.moodSettings.dissonanceFactor -= 0.2, 10000);
    }

    evolveFilterCutoff() {
        if (!this.filterRef) return;
        const current = this.filterRef.frequency.value;
        const newCutoff = current * (1 + (Math.random() * 0.4 - 0.2));
        this.filterRef.frequency.exponentialRampToValueAtTime(Math.max(80, Math.min(20000, newCutoff)), Tone.now() + 3);
    }

    evolveTempo() {
        const current = Tone.Transport.bpm.value;
        const newTempo = current * (1 + (Math.random() * 0.1 - 0.05));
        Tone.Transport.bpm.rampTo(Math.max(this.moodSettings.tempo.min, Math.min(this.moodSettings.tempo.max, newTempo)), 5);
    }

    evolveMoodParameters() {
        this.moodSettings.noteLength.min = Math.max(0.1, this.moodSettings.noteLength.min * (1 + (Math.random() * 0.2 - 0.1)));
        this.moodSettings.noteLength.max = Math.max(this.moodSettings.noteLength.min + 0.1, this.moodSettings.noteLength.max * (1 + (Math.random() * 0.2 - 0.1)));
        this.moodSettings.velocityRange.min = Math.max(0.2, this.moodSettings.velocityRange.min * (1 + (Math.random() * 0.1 - 0.05)));
        this.moodSettings.velocityRange.max = Math.max(this.moodSettings.velocityRange.min + 0.1, this.moodSettings.velocityRange.max * (1 + (Math.random() * 0.1 - 0.05)));
    }

    createRhythmSynth() {
        this.rhythmSynth = new Tone.MembraneSynth({
            pitchDecay: 0.03,
            octaves: 5,
            oscillator: { type: "square" },
            envelope: { attack: 0.001, decay: 0.3, sustain: 0.02, release: 1.2 },
            volume: -10
        }).connect(this.filterRef || Tone.getDestination());
    }

    midiToNoteName(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        return `${noteNames[midiNote % 12]}${octave}`;
    }

    getRandomInRange(min, max) {
        return min + Math.random() * (max - min);
    }

    visualizeNotes(notes, time) {
        const container = document.querySelector('.generative-visualizer');
        if (!container) return;

        notes.forEach(note => {
            const noteVisual = document.createElement('div');
            noteVisual.className = 'generative-note';
            const [noteName, octave] = note.match(/([A-G]#?)(\d+)/).slice(1);
            const noteIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(noteName);
            const height = 1 - ((parseInt(octave) + noteIndex / 12) / 9);

            noteVisual.style.top = `${10 + height * 80}%`;
            noteVisual.style.left = `${10 + Math.random() * 80}%`;
            noteVisual.style.width = noteVisual.style.height = `${8 + Math.random() * 8}px`;
            noteVisual.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 50%)`;

            container.appendChild(noteVisual);
            setTimeout(() => {
                noteVisual.style.opacity = '0.9';
                noteVisual.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    noteVisual.style.opacity = '0';
                    noteVisual.style.transform = 'scale(0.8)';
                    setTimeout(() => container.removeChild(noteVisual), 500);
                }, 1000);
            }, 20);
        });
    }

    highlightKey(note, duration) {
        const key = document.querySelector(`.key[data-note="${note}"], .black-key[data-note="${note}"]`);
        if (key) {
            key.classList.add('active');
            setTimeout(() => key.classList.remove('active'), Math.min(2000, duration * 500));
        }
    }

    cleanupDrone() {
        if (this.dronePart) this.dronePart.dispose();
        if (this.droneSynth) {
            this.droneSynth.releaseAll();
            this.droneSynth.dispose();
        }
        if (this.droneEffects) {
            Object.values(this.droneEffects).forEach(effect => effect.dispose());
        }
        this.dronePart = this.droneSynth = this.droneEffects = null;
    }

    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        Object.assign(this.config, newConfig);

        if (this.config.scale !== oldConfig.scale || this.config.root !== oldConfig.root) {
            this.generateScaleNotes();
        }

        if (this.config.mood !== oldConfig.mood) {
            this.moodSettings = { ...moodPresets[this.config.mood] };
            this.transitionMatrix = [...transitionMatrices[this.config.mood]];
            this.tempo = this.getRandomInRange(this.moodSettings.tempo.min, this.moodSettings.tempo.max);
            if (this.isPlaying) Tone.Transport.bpm.value = this.tempo;
        }

        this.updateInternalSettings();

        if (this.isPlaying) {
            if (this.config.melodyEnabled !== oldConfig.melodyEnabled) {
                if (this.config.melodyEnabled) this.startMelodyGenerator();
                else if (this.melodyPart) this.melodyPart.dispose();
            }
            if (this.config.droneEnabled !== oldConfig.droneEnabled) {
                if (this.config.droneEnabled) this.startDroneGenerator();
                else this.cleanupDrone();
            }
            if (this.config.rhythmEnabled !== oldConfig.rhythmEnabled) {
                if (this.config.rhythmEnabled) {
                    this.createRhythmSynth();
                    this.startRhythmGenerator();
                } else if (this.rhythmPart) {
                    this.rhythmPart.dispose();
                    this.rhythmSynth.dispose();
                }
            }
            if (this.config.ambienceEnabled !== oldConfig.ambienceEnabled) {
                if (this.config.ambienceEnabled) {
                    this.createAmbienceSynth();
                    this.startAmbienceGenerator();
                } else if (this.ambiencePart) {
                    this.ambiencePart.dispose();
                    this.ambienceSynth.dispose();
                }
            }
        }
    }
}

export { GenerativeEngine, scalePatterns, moodPresets };