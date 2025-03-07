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
    'C': 0,
    'C#': 1,
    'Db': 1,
    'D': 2,
    'D#': 3,
    'Eb': 3,
    'E': 4,
    'F': 5,
    'F#': 6,
    'Gb': 6,
    'G': 7,
    'G#': 8,
    'Ab': 8,
    'A': 9,
    'A#': 10,
    'Bb': 10,
    'B': 11
};

// Enhanced mood presets with richer parameters
const moodPresets = {
    calm: {
        tempo: {
            min: 60,
            max: 80
        },
        noteLength: {
            min: 0.5,
            max: 2.5
        },
        velocityRange: {
            min: 0.3,
            max: 0.6
        },
        octaveRange: {
            min: 3,
            max: 5
        },
        chordProbability: 0.15,
        restProbability: 0.35,
        filterSweepRate: 0.03,
        reverbWet: 0.4,
        dissonanceFactor: 0.1,
        hue: 200 // Blue-ish
    },
    melancholic: {
        tempo: {
            min: 70,
            max: 90
        },
        noteLength: {
            min: 0.4,
            max: 2
        },
        velocityRange: {
            min: 0.4,
            max: 0.7
        },
        octaveRange: {
            min: 2,
            max: 4
        },
        chordProbability: 0.25,
        restProbability: 0.25,
        filterSweepRate: 0.08,
        reverbWet: 0.6,
        dissonanceFactor: 0.3,
        hue: 260 // Purple-ish
    },
    intense: {
        tempo: {
            min: 110,
            max: 150
        },
        noteLength: {
            min: 0.1,
            max: 0.6
        },
        velocityRange: {
            min: 0.6,
            max: 1.0
        },
        octaveRange: {
            min: 3,
            max: 6
        },
        chordProbability: 0.4,
        restProbability: 0.05,
        filterSweepRate: 0.25,
        reverbWet: 0.2,
        dissonanceFactor: 0.5,
        hue: 0 // Red
    },
    playful: {
        tempo: {
            min: 90,
            max: 130
        },
        noteLength: {
            min: 0.2,
            max: 1
        },
        velocityRange: {
            min: 0.5,
            max: 0.9
        },
        octaveRange: {
            min: 4,
            max: 6
        },
        chordProbability: 0.2,
        restProbability: 0.15,
        filterSweepRate: 0.15,
        reverbWet: 0.3,
        dissonanceFactor: 0.2,
        hue: 120 // Green
    },
    mysterious: {
        tempo: {
            min: 60,
            max: 100
        },
        noteLength: {
            min: 0.5,
            max: 1.5
        },
        velocityRange: {
            min: 0.2,
            max: 0.6
        },
        octaveRange: {
            min: 2,
            max: 5
        },
        chordProbability: 0.3,
        restProbability: 0.4,
        filterSweepRate: 0.05,
        reverbWet: 0.7,
        dissonanceFactor: 0.4,
        hue: 300 // Pink/Magenta
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
        [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] // Sparse
    ],
    melancholic: [
        [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0], // Wistful
        [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // Slow heartbeat
        [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0] // Lagging
    ],
    intense: [
        [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1], // Driving
        [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1], // Relentless
        [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1] // Chaotic
    ],
    playful: [
        [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0], // Bouncy
        [1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0], // Skipping
        [1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1] // Whimsical
    ],
    mysterious: [
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], // Eerie
        [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0], // Unpredictable
        [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0] // Haunting
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
        this.harmonyState = {
            currentChord: null,
            nextChordTime: 0
        };
        this.synthRef = null;
        this.droneSynth = null;
        this.ambienceSynth = null;
        this.rhythmSynth = null;
        this.melodyPart = null;
        this.dronePart = null;
        this.rhythmPart = null;
        this.ambiencePart = null;
        this.evolutionInterval = null;
        this.moodSettings = {
            ...moodPresets[this.config.mood]
        };
        this.transitionMatrix = [...transitionMatrices[this.config.mood]];
        this.tempo = this.getRandomInRange(this.moodSettings.tempo.min, this.moodSettings.tempo.max);
        this.lastMoodChange = 0;
        this.moodChangeInProgress = false;
        this.rhythmEvolutionEvent = null;
        this.ambienceSecondaryPart = null;


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

        try {
            Tone.Transport.bpm.value = this.tempo;
            Tone.Transport.start();

            // Create components with timeout gap between them to avoid overload
            const startSequence = async () => {
                if (this.config.droneEnabled) {
                    this.createDroneSynth();
                    await new Promise(r => setTimeout(r, 50));
                }

                if (this.config.rhythmEnabled) {
                    this.createRhythmSynth();
                    await new Promise(r => setTimeout(r, 50));
                }

                if (this.config.ambienceEnabled) {
                    this.createAmbienceSynth();
                    await new Promise(r => setTimeout(r, 50));
                }

                // Start generators with timeouts between them
                if (this.config.droneEnabled) {
                    this.startDroneGenerator();
                    await new Promise(r => setTimeout(r, 100));
                }

                if (this.config.rhythmEnabled) {
                    this.startRhythmGenerator();
                    await new Promise(r => setTimeout(r, 100));
                }

                if (this.config.melodyEnabled) {
                    this.startMelodyGenerator();
                    await new Promise(r => setTimeout(r, 100));
                }

                if (this.config.ambienceEnabled) {
                    this.startAmbienceGenerator();
                    await new Promise(r => setTimeout(r, 100));
                }

                this.startParameterEvolution();
            };

            startSequence();
            this.isPlaying = true;
        } catch (error) {
            console.error("Error starting GenerativeEngine:", error);
            this.stop(); // Clean up partial start
        }
    }

    stop() {
        if (!this.isPlaying) return;
        console.log("Stopping GenerativeEngine...");

        // Set playing state to false immediately to prevent new events
        this.isPlaying = false;

        // Cancel all scheduled events first
        if (this.rhythmEvolutionEvent) {
            Tone.Transport.clear(this.rhythmEvolutionEvent);
            this.rhythmEvolutionEvent = null;
        }

        // Then clean up all parts
        try {
            if (this.melodyPart) {
                this.melodyPart.stop();
                this.melodyPart.dispose();
                this.melodyPart = null;
            }
        } catch (e) {
            console.error("Error disposing melody part:", e);
        }

        // Use dedicated cleanup methods
        this.cleanupDrone();
        this.cleanupRhythm();
        this.cleanupAmbience();

        // Clear any ongoing evolution
        if (this.evolutionInterval) {
            clearInterval(this.evolutionInterval);
            this.evolutionInterval = null;
        }
    }

    cleanupRhythm() {
        console.log("Cleaning up rhythm");

        try {
            // Cancel the rhythm evolution event first
            if (this.rhythmEvolutionEvent) {
                console.log("Cancelling rhythm evolution schedule:", this.rhythmEvolutionEvent);
                Tone.Transport.clear(this.rhythmEvolutionEvent);
                this.rhythmEvolutionEvent = null;
            }

            if (this.rhythmPart) {
                this.rhythmPart.stop();
                this.rhythmPart.dispose();
                this.rhythmPart = null;
            }

            if (this.rhythmSynth) {
                // MembraneSynth is monophonic, so just use triggerRelease()
                if (typeof this.rhythmSynth.triggerRelease === 'function') {
                    this.rhythmSynth.triggerRelease();
                }

                this.rhythmSynth.dispose();
                this.rhythmSynth = null;
            }
        } catch (error) {
            console.error("Error in cleanupRhythm:", error);
        }
    }

    // Enhanced Melody Generator with adaptive harmony
    startMelodyGenerator() {
        console.log("Starting melody generator...");
        const phraseLength = 16;
        this.currentNoteDegree = 0;
        let currentPhrase = [];
        let lastNoteTime = Tone.now(); // Add this variable declaration!

        this.melodyPart = new Tone.Loop((time) => {
            if (!this.config.melodyEnabled || !this.synthRef) return;
            const nowTime = Tone.now();
            const safeTime = Math.max(nowTime + 0.05, lastNoteTime + 0.01);
            lastNoteTime = safeTime; // Update the last note time

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
        console.log("Creating drone synth");

        // Clean up any existing drone first
        this.cleanupDrone();

        try {
            this.droneEffects = {
                filter: new Tone.Filter({
                    type: "lowpass",
                    frequency: 1000,
                    Q: 2
                }),
                chorus: new Tone.Chorus({
                    frequency: 0.3,
                    delayTime: 4,
                    depth: 0.8,
                    wet: 0.6
                }).start(),
                reverb: new Tone.Reverb({
                    decay: 5,
                    wet: this.moodSettings.reverbWet
                }),
                pingPong: new Tone.PingPongDelay({
                    delayTime: "8n",
                    feedback: 0.3,
                    wet: 0.2
                }),
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
                    oscillator: {
                        type: "sine6"
                    },
                    modulation: {
                        type: "triangle"
                    },
                    envelope: {
                        attack: 2,
                        decay: 0.5,
                        sustain: 1,
                        release: 3
                    },
                    volume: -6
                }
            }).connect(this.droneEffects.filter);

            console.log("Drone synth created successfully");
            return true;
        } catch (error) {
            console.error("Failed to create drone synth:", error);
            this.droneSynth = null;
            this.droneEffects = null;
            return false;
        }
    }

    startDroneGenerator() {
        console.log("Starting drone generator, enabled:", this.config.droneEnabled);

        if (!this.config.droneEnabled) return false;

        // Make sure we have a drone synth
        if (!this.droneSynth) {
            const created = this.createDroneSynth();
            if (!created) {
                console.error("Could not start drone generator - synth creation failed");
                return false;
            }
        }

        const rootNote = this.midiToNoteName(this.droneNotes[0]);
        const deepNote = this.midiToNoteName(this.droneNotes[1]);
        const fifthNote = this.midiToNoteName(this.droneNotes[2]);
        let lastDroneTime = Tone.now();

        // Clean up any existing drone part
        if (this.dronePart) {
            try {
                this.dronePart.dispose();
            } catch (e) {
                console.error("Error disposing previous drone part:", e);
            }
            this.dronePart = null;
        }

        try {
            // Play an initial drone to ensure sound is working
            this.playDroneChord([rootNote, fifthNote], Tone.now() + 0.2);

            // Set up the recurring drone loop
            this.dronePart = new Tone.Loop((time) => {
                if (!this.droneSynth || !this.config.droneEnabled) {
                    console.log("Drone synth missing or disabled during loop, skipping");
                    return;
                }

                const nowTime = Tone.now();
                const safeTime = Math.max(nowTime + 0.1, lastDroneTime + 0.02);
                lastDroneTime = safeTime;

                const pattern = Math.floor(Math.random() * 4);
                try {
                    switch (pattern) {
                        case 0:
                            this.playDroneChord([rootNote, fifthNote], safeTime);
                            break;
                        case 1:
                            this.playDroneChord([deepNote, rootNote], safeTime);
                            break;
                        case 2:
                            this.playDroneChord([rootNote, fifthNote, this.midiToNoteName(this.droneNotes[0] + 4)], safeTime);
                            break;
                        case 3:
                            if (this.droneSynth) {
                                console.log("Drone release at", safeTime);
                                this.droneSynth.triggerRelease([rootNote, fifthNote], safeTime);
                            }
                            break;
                    }

                    // Add a safety check before accessing detune
                    if (this.droneSynth && this.droneSynth.detune &&
                        typeof this.droneSynth.detune.rampTo === 'function' &&
                        Math.random() < 0.15) {
                        this.droneSynth.detune.rampTo((Math.random() - 0.5) * 100, 6);
                    }
                } catch (error) {
                    console.error("Error in drone loop:", error);
                }
            }, "8m").start("+0.1");

            console.log("Drone part started successfully");
            return true;
        } catch (error) {
            console.error("Failed to start drone generator:", error);
            this.cleanupDrone();
            return false;
        }
    }


    playDroneChord(notes, time) {
        if (!this.droneSynth) {
            console.error("No drone synth available to play chord");
            return false;
        }

        try {
            const nowTime = Tone.now();
            const playTime = time || (nowTime + 0.05);

            console.log("Playing drone chord", notes, "at time", playTime);

            // Release previous notes slightly before playing new ones
            this.droneSynth.releaseAll(playTime - 0.01);

            // Trigger the new notes
            this.droneSynth.triggerAttack(notes.slice(0, 3), playTime, 0.5);
            notes.forEach(note => this.highlightKey(note, 4));
            return true;
        } catch (error) {
            console.error("Error playing drone chord:", error);
            return false;
        }
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

    getScheduleTime(baseTime, minOffset = 0.05) {
        // Get current time
        const now = Tone.now();
        // Return the greater of:
        // 1. Current time plus minimum offset
        // 2. Provided base time
        return Math.max(now + minOffset, baseTime);
    }

    // Dynamic Rhythm Generator
    startRhythmGenerator() {
        if (!this.config.rhythmEnabled || !this.rhythmSynth) return;

        // First clear any existing evolution schedule
        if (this.rhythmEvolutionEvent) {
            Tone.Transport.clear(this.rhythmEvolutionEvent);
            this.rhythmEvolutionEvent = null;
        }

        const patterns = rhythmPatterns[this.config.mood];
        let currentPattern = patterns[this.getWeightedRandomIndex(this.patternWeights)];

        // Generate rhythm events with stable timing
        const events = this.generateRhythmEvents(currentPattern);

        // Helper function to sort events chronologically
        const sortEvents = (events) => {
            return events.sort((a, b) => {
                // Extract time components (bar:beat:sixteenth)
                const aComponents = a.time.split(':').map(Number);
                const bComponents = b.time.split(':').map(Number);

                // Compare components in order
                for (let i = 0; i < aComponents.length; i++) {
                    if (aComponents[i] !== bComponents[i]) {
                        return aComponents[i] - bComponents[i];
                    }
                }
                return 0;
            });
        };

        // Sort the initial events
        const sortedEvents = sortEvents(events);

        // Dispose of any existing rhythm part first
        if (this.rhythmPart) {
            this.rhythmPart.dispose();
            this.rhythmPart = null;
        }

        try {
            this.rhythmPart = new Tone.Part((time, event) => {
                // Verify the synth is still available
                if (!this.rhythmSynth || !this.config.rhythmEnabled) return;

                const humanizedTime = time + (Math.random() * 0.02);
                this.rhythmSynth.triggerAttackRelease(event.note, "16n", humanizedTime, event.velocity);

                if (Math.random() < 0.2) {
                    const accentNote = Math.random() > 0.5 ? "G2" : "D2";
                    this.rhythmSynth.triggerAttackRelease(accentNote, "32n", humanizedTime + 0.05, 0.4);
                }
            }, sortedEvents).start(0);

            this.rhythmPart.loop = true;
            this.rhythmPart.loopEnd = "4m";

            // Store the event ID for cancelling later
            this.rhythmEvolutionEvent = Tone.Transport.scheduleRepeat((time) => {
                // This is the critical part - check if rhythmPart still exists
                if (!this.rhythmPart || !this.config.rhythmEnabled) {
                    // If the part is gone, cancel this repeating event
                    if (this.rhythmEvolutionEvent) {
                        Tone.Transport.clear(this.rhythmEvolutionEvent);
                        this.rhythmEvolutionEvent = null;
                    }
                    return;
                }

                if (Math.random() < 0.2) {
                    try {
                        currentPattern = this.evolveRhythmPattern(currentPattern);
                        // Make sure to sort the new events too
                        const newEvents = this.generateRhythmEvents(currentPattern);
                        const sortedNewEvents = sortEvents(newEvents);

                        // Safety check before updating events
                        if (this.rhythmPart) {
                            this.rhythmPart.events = sortedNewEvents;
                        }
                    } catch (error) {
                        console.error("Error evolving rhythm pattern:", error);
                    }
                }
            }, "16m");

            console.log("Rhythm generator started with evolution event ID:", this.rhythmEvolutionEvent);
        } catch (error) {
            console.error("Error starting rhythm generator:", error);
        }
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
        // Dispose of any existing ambience synth first
        if (this.ambienceSynth) {
            try {
                this.ambienceSynth.dispose();
            } catch (e) {
                console.error("Error disposing previous ambience synth:", e);
            }
            this.ambienceSynth = null;
        }

        // Create a more audible and distinctive ambience synth
        this.ambienceSynth = new Tone.PolySynth(Tone.FMSynth, {
            maxPolyphony: 8,
            options: {
                harmonicity: 2.5,
                modulationIndex: 3.5,
                oscillator: {
                    type: "triangle"
                },
                envelope: {
                    attack: 0.5,
                    decay: 0.5,
                    sustain: 0.8,
                    release: 3
                },
                modulation: {
                    type: "sine"
                },
                modulationEnvelope: {
                    attack: 1,
                    decay: 0.5,
                    sustain: 0.5,
                    release: 3
                },
                volume: -2
            }
        });

        this.ambienceGain = new Tone.Gain(0.8).toDestination();

        // Create ambience-specific effects for more audible presence
        this.ambienceEffects = {
            delay: new Tone.FeedbackDelay({
                delayTime: "8n",
                feedback: 0.3,
                wet: 0.4
            }),
            reverb: new Tone.Reverb({
                decay: 4,
                wet: 0.6
            }),
            filter: new Tone.Filter({
                type: "lowpass",
                frequency: 5000,
                Q: 1
            })
        };

        this.ambienceEffects.reverb.wet.value = this.moodSettings.reverbWet; // Use mood preset

        // Connect the effects chain
        this.ambienceSynth.chain(
            this.ambienceEffects.filter,
            this.ambienceEffects.delay,
            this.ambienceEffects.reverb,
            this.ambienceGain,
            this.filterRef || Tone.getDestination()
        );

        console.log("Ambience synth created");
    }

    startAmbienceGenerator() {
        if (!this.config.ambienceEnabled || !this.ambienceSynth) {
            console.log("Ambience not enabled or synth not created");
            return;
        }
    
        // Dispose of existing parts
        if (this.ambiencePart) {
            try {
                this.ambiencePart.dispose();
            } catch (e) {
                console.error("Error disposing previous ambience part:", e);
            }
            this.ambiencePart = null;
        }
        if (this.ambienceSecondaryPart) {
            try {
                this.ambienceSecondaryPart.dispose();
            } catch (e) {
                console.error("Error disposing previous secondary ambience part:", e);
            }
            this.ambienceSecondaryPart = null;
        }
    
        let lastAmbienceTime = Tone.now();
    
        // Primary ambience loop - more frequent and denser chords
        this.ambiencePart = new Tone.Loop((time) => {
            if (Math.random() < 0.6) { // Increased from 0.4 to 0.6 for more activity
                const nowTime = Tone.now();
                const safeTime = Math.max(nowTime + 0.1, lastAmbienceTime + 0.05);
                lastAmbienceTime = safeTime;
    
                const numNotes = Math.floor(Math.random() * 3) + 2;
                const notes = [];
                for (let i = 0; i < numNotes; i++) {
                    const noteIndex = Math.floor(Math.random() * this.currentScale.length);
                    notes.push(this.midiToNoteName(this.currentScale[noteIndex]));
                }
    
                const noteDuration = ["1n", "2n", "2n."][Math.floor(Math.random() * 3)];
                const velocity = 0.4 + (Math.random() * 0.2); // Slightly higher base velocity

                console.log("Playing ambience chord:", notes, "at time", safeTime);

                this.ambienceSynth.triggerAttackRelease(notes, noteDuration, safeTime, velocity);
                this.visualizeNotes(notes, safeTime);
            }
        }, "2n").start("+0.2"); // Changed from "1m" to "2n" for faster triggers
    
        // Secondary ambience - continuous pad-like layer
        this.ambienceSecondaryPart = new Tone.Loop((time) => {
            const nowTime = Tone.now();
            const safeTime = Math.max(nowTime + 0.1, lastAmbienceTime + 0.1);
            lastAmbienceTime = safeTime;
    
            // Sustained root-fifth pad
            const rootNote = this.midiToNoteName(this.currentScale[0]);
            const fifthNote = this.midiToNoteName(this.currentScale[4 % this.currentScale.length]);
            this.ambienceSynth.triggerAttack([rootNote, fifthNote], safeTime, 0.3);
    
            // Release after a longer duration
            setTimeout(() => {
                if (this.ambienceSynth) {
                    this.ambienceSynth.triggerRelease([rootNote, fifthNote], Tone.now());
                }
            }, 4000); // 4-second sustain
        }, "8m").start("+0.5"); // Slow cycle for background texture
    
        console.log("Ambience generator started with enriched texture");
    }

    cleanupAmbience() {
        console.log("Cleaning up ambience");
        try {
            if (this.ambiencePart) {
                this.ambiencePart.dispose();
                this.ambiencePart = null;
            }
            if (this.ambienceSecondaryPart) {
                this.ambienceSecondaryPart.dispose();
                this.ambienceSecondaryPart = null;
            }
            if (this.ambienceSynth) {
                this.ambienceSynth.releaseAll();
                this.ambienceSynth.dispose();
                this.ambienceSynth = null;
            }
            if (this.ambienceEffects) {
                Object.values(this.ambienceEffects).forEach(effect => {
                    if (effect && typeof effect.dispose === 'function') {
                        effect.dispose();
                    }
                });
                this.ambienceEffects = null;
            }
            if (this.ambienceGain) {
                this.ambienceGain.dispose();
                this.ambienceGain = null;
            }
        } catch (e) {
            console.error("Error in cleanupAmbience:", e);
        }
    }

    // Adaptive Harmony System
    updateHarmony() {
        if (Tone.now() > this.harmonyState.nextChordTime) {
            this.harmonyState.currentChord = this.generateChord(Math.floor(Math.random() * this.currentScale.length));
            this.harmonyState.nextChordTime = Tone.now() + this.getRandomInRange(8, 16);
        }
    }

    getHarmonicChord() {
        try {
            return this.harmonyState.currentChord || this.generateChord(0);
        } catch (error) {
            console.error("Error generating harmonic chord:", error);
            // Return a safe fallback chord
            return ["C4", "E4", "G4"];
        }
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
            case 0:
                this.transposeMelody();
                break;
            case 1:
                this.changeRhythmPattern();
                break;
            case 2:
                this.varyNoteDensity();
                break;
            case 3:
                this.performFilterSweep();
                break;
            case 4:
                this.addDissonantShift();
                break;
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
            oscillator: {
                type: "square"
            },
            envelope: {
                attack: 0.001,
                decay: 0.3,
                sustain: 0.02,
                release: 1.2
            },
            volume: -10
        }).connect(this.filterRef || Tone.getDestination());
    }

    midiToNoteName(midiNote) {
        // Add validation to prevent NaN issues
        if (midiNote === undefined || midiNote === null || isNaN(midiNote)) {
            console.warn("Invalid MIDI note value:", midiNote);
            return "C4"; // Return a safe default instead of an error
        }

        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        return `${noteNames[midiNote % 12]}${octave}`;
    }

    getRandomInRange(min, max) {
        return min + Math.random() * (max - min);
    }

    visualizeNotes(notes, time) {
        const container = document.querySelector('.generative-visualizer');
        if (!container || !notes || !Array.isArray(notes)) return;

        notes.forEach(note => {
            if (!note) return; // Skip null/undefined notes

            try {
                const noteVisual = document.createElement('div');
                noteVisual.className = 'generative-note';

                // Safe regex matching with fallback values
                const matches = String(note).match(/([A-G]#?)(\d+)/);
                if (!matches || matches.length < 3) return;

                const [_, noteName, octave] = matches;
                const noteIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(noteName);
                if (noteIndex === -1) return;

                const height = 1 - ((parseInt(octave) + noteIndex / 12) / 9);

                noteVisual.style.top = `${10 + height * 80}%`;
                noteVisual.style.left = `${10 + Math.random() * 80}%`;
                noteVisual.style.width = noteVisual.style.height = `${8 + Math.random() * 8}px`;
                noteVisual.style.backgroundColor = `hsl(${this.moodSettings.hue}, 70%, 50%)`;


                container.appendChild(noteVisual);
                setTimeout(() => {
                    noteVisual.style.opacity = '0.9';
                    noteVisual.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        noteVisual.style.opacity = '0';
                        noteVisual.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            if (container.contains(noteVisual)) {
                                container.removeChild(noteVisual);
                            }
                        }, 500);
                    }, 1000);
                }, 20);
            } catch (error) {
                console.error("Error visualizing note:", error);
            }
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
        console.log("Cleaning up drone");

        try {
            if (this.dronePart) {
                console.log("Disposing drone part");
                this.dronePart.stop();
                this.dronePart.dispose();
                this.dronePart = null;
            }

            if (this.droneSynth) {
                console.log("Disposing drone synth");
                try {
                    this.droneSynth.releaseAll(Tone.now());
                } catch (e) {
                    console.log("Error releasing drone synth:", e);
                }

                // Add a small delay before disposing to let release finish
                setTimeout(() => {
                    try {
                        if (this.droneSynth) {
                            this.droneSynth.dispose();
                            this.droneSynth = null;
                        }
                    } catch (e) {
                        console.log("Error disposing drone synth:", e);
                    }
                }, 100);
            }

            if (this.droneEffects) {
                console.log("Disposing drone effects");
                Object.entries(this.droneEffects).forEach(([name, effect]) => {
                    try {
                        if (effect && typeof effect.dispose === 'function') {
                            effect.dispose();
                        }
                    } catch (e) {
                        console.log(`Error disposing ${name} effect:`, e);
                    }
                });
                this.droneEffects = null;
            }

            return true;
        } catch (error) {
            console.error("Error in cleanupDrone:", error);
            return false;
        }
    }

    updateConfig(newConfig) {
        const oldConfig = {
            ...this.config
        };
        Object.assign(this.config, newConfig);

        if (this.config.mood !== oldConfig.mood) {
            // Debounce mood changes - prevent changes more frequently than every 1 second
            const now = Date.now();
            if (now - this.lastMoodChange < 1000) {
                console.log("Mood change too frequent, ignoring");
                this.config.mood = oldConfig.mood; // Revert the mood change
                return;
            }

            // Prevent overlapping mood changes
            if (this.moodChangeInProgress) {
                console.log("Mood change already in progress, ignoring");
                this.config.mood = oldConfig.mood; // Revert the mood change
                return;
            }

            this.moodChangeInProgress = true;
            this.lastMoodChange = now;

            console.log(`Changing mood from ${oldConfig.mood} to ${this.config.mood}`);

            // Perform a complete teardown and rebuild for mood changes
            const wasPlaying = this.isPlaying;

            if (wasPlaying) {
                // Stop everything safely
                this.stop();

                // Update settings
                this.moodSettings = {
                    ...moodPresets[this.config.mood]
                };
                this.transitionMatrix = [...transitionMatrices[this.config.mood]];
                this.tempo = this.getRandomInRange(this.moodSettings.tempo.min, this.moodSettings.tempo.max);

                // Generate new scale notes
                this.generateScaleNotes();
                this.updateInternalSettings();

                // Restart after a short pause to ensure clean state
                setTimeout(() => {
                    if (this.synthRef) {
                        this.start(this.synthRef, this.filterRef);
                        console.log("Restarted engine with new mood:", this.config.mood);
                    }
                    this.moodChangeInProgress = false;
                }, 300);
            } else {
                // Just update settings if not currently playing
                this.moodSettings = {
                    ...moodPresets[this.config.mood]
                };
                this.transitionMatrix = [...transitionMatrices[this.config.mood]];
                this.tempo = this.getRandomInRange(this.moodSettings.tempo.min, this.moodSettings.tempo.max);
                this.generateScaleNotes();
                this.updateInternalSettings();
                this.moodChangeInProgress = false;
            }

            return; // Skip the rest of the config updates as we're handling everything here
        }

        if (this.config.scale !== oldConfig.scale || this.config.root !== oldConfig.root) {
            this.generateScaleNotes();
        }

        this.updateInternalSettings();

        if (this.isPlaying) {
            if (this.config.melodyEnabled !== oldConfig.melodyEnabled) {
                if (this.config.melodyEnabled) this.startMelodyGenerator();
                else if (this.melodyPart) this.melodyPart.dispose();
            }
            if (this.config.droneEnabled !== oldConfig.droneEnabled) {
                console.log("Drone toggled:", this.config.droneEnabled);

                if (this.config.droneEnabled) {
                    // Ensure any old drone is fully cleaned up first
                    this.cleanupDrone();

                    // Wait a moment for cleanup to complete
                    setTimeout(() => {
                        // Start the drone with a fresh state
                        this.startDroneGenerator();
                    }, 500);
                } else {
                    // Turn off drone
                    this.cleanupDrone();
                }
            }
            if (this.config.rhythmEnabled !== oldConfig.rhythmEnabled) {
                if (this.config.rhythmEnabled) {
                    this.createRhythmSynth();
                    this.startRhythmGenerator();
                } else {
                    this.cleanupRhythm(); // Use the dedicated cleanup method
                }
            }
            if (this.config.ambienceEnabled !== oldConfig.ambienceEnabled) {
                console.log("Ambience toggled:", this.config.ambienceEnabled);
                if (this.config.ambienceEnabled) {
                    // Turn on ambience
                    this.createAmbienceSynth();
                    this.startAmbienceGenerator();
                } else {
                    // Turn off ambience
                    this.cleanupAmbience();
                }
            }
        }
    }
}

export {
    GenerativeEngine,
    scalePatterns,
    moodPresets
};