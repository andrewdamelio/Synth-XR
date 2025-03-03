// Synth XR Presets - Optimized Module
// This module has been refactored for better performance and memory usage

/**
 * Creates a preset with name, category, and settings
 * @param {string} name - The display name of the preset
 * @param {string} category - The category for grouping (pad, bass, etc.)
 * @param {object} settings - The synth settings object
 * @returns {object} A formatted preset object
 */
const createPreset = (name, category, settings) => {
    // Create a new object with only the necessary properties
    // This is more memory efficient than spreading the entire settings object
    const preset = {
        name,
        category,
        settings: {...settings} // Create a shallow copy to avoid reference issues
    };
    
    // Apply validation and default values for critical settings
    // This ensures presets will always load safely even if incomplete
    if (!preset.settings.voiceMode) {
        preset.settings.voiceMode = "poly";
    }
    
    if (!preset.settings.sequencer) {
        preset.settings.sequencer = [];
    }
    
    return preset;
};

const builtInPresets = [
    createPreset("Default", "pad", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "900",
        filterRes: "5",
        filterType: false,
        reverbMix: "0.6",
        reverbDecay: "3.5",
        delayTime: "0.33",
        delayFeedback: "0.55",
        tempo: "96",
        attack: "0.02",
        decay: "0.18",
        sustain: "0.35",
        release: "1.4",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.8",
        chorusMix: "0.1",
        distortionMix: "0",
        flangerMix: "0",
        phaserMix: "0",
        lfoRate: "1",
        lfoAmount: "50",
        lfoDestination: "off",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "2",
        eqMid: "0",
        eqHigh: "1",
        eqMidFreq: "1000",
        eqQ: "1",
        compressor: "0.3",
        sequencer: [
            {"note": "E3", "active": true},
            {"note": "B3", "active": true},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "A3", "active": true},
            {"note": "E4", "active": true},
            {"note": "B3", "active": true},
            {"note": "C4", "active": false},
            {"note": "G3", "active": true},
            {"note": "D4", "active": true},
            {"note": "B3", "active": true},
            {"note": "D4", "active": false},
            {"note": "F#3", "active": true},
            {"note": "A3", "active": true},
            {"note": "E3", "active": true},
            {"note": "B3", "active": true}
        ],
    }),

    // ==== PAD PRESETS ====
    createPreset("Ethereal Waves", "pad", {
        voiceMode: "poly",
        waveform: "sine",
        filterCutoff: "1200",
        filterRes: "2",
        filterType: false,
        reverbMix: "0.85",
        reverbDecay: "8.0",
        delayTime: "0.5",
        delayFeedback: "0.4",
        tempo: "80",
        attack: "1.5",
        decay: "2.0",
        sustain: "0.7",
        release: "4.0",
        oscillatorOctave: "0",
        oscillatorSemi: "7", // Perfect fifth
        oscillatorLevel: "0.7",
        chorusMix: "0.3",
        distortionMix: "0",
        flangerMix: "0.15",
        phaserMix: "0.1",
        lfoRate: "0.08",
        lfoAmount: "45",
        lfoDestination: "eqMidFreq",
        lfoWaveform: "triangle",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "3",
        eqMid: "-1",
        eqHigh: "2",
        eqMidFreq: "800",
        eqQ: "0.8",
        compressor: "0.3",
        sequencer: [
            {"note": "A3", "active": true},
            {"note": "C4", "active": false},
            {"note": "E4", "active": true},
            {"note": "A4", "active": false},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "D4", "active": true},
            {"note": "G4", "active": false},
            {"note": "F3", "active": true},
            {"note": "A3", "active": false},
            {"note": "C4", "active": true},
            {"note": "F4", "active": false},
            {"note": "E3", "active": true},
            {"note": "G3", "active": false},
            {"note": "B3", "active": true},
            {"note": "E4", "active": false}
        ],
    }),
    
    createPreset("Cosmic Atmosphere", "pad", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "800",
        filterRes: "4",
        filterType: false,
        reverbMix: "0.9",
        reverbDecay: "7.5",
        delayTime: "0.75",
        delayFeedback: "0.6",
        tempo: "72",
        attack: "2.0",
        decay: "1.5",
        sustain: "0.8",
        release: "5.0",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.75",
        chorusMix: "0.4",
        distortionMix: "0.05",
        flangerMix: "0.2",
        phaserMix: "0.15",
        lfoRate: "0.15",
        lfoAmount: "65",
        lfoDestination: "harmonicity",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "4",
        eqMid: "-2",
        eqHigh: "3",
        eqMidFreq: "700",
        eqQ: "0.7",
        compressor: "0.3",
        harmonicity: "3.5",
        modulationIndex: "15",
        sequencer: [
            {"note": "C3", "active": true},
            {"note": "G3", "active": false},
            {"note": "C4", "active": true},
            {"note": "E4", "active": false},
            {"note": "G4", "active": true},
            {"note": "C5", "active": false},
            {"note": "G4", "active": true},
            {"note": "E4", "active": false},
            {"note": "C4", "active": true},
            {"note": "G3", "active": false},
            {"note": "E3", "active": true},
            {"note": "G3", "active": false},
            {"note": "C4", "active": true},
            {"note": "E4", "active": false},
            {"note": "G4", "active": true},
            {"note": "C5", "active": false}
        ],
    }),
    
    createPreset("Floating Dreams", "pad", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "600",
        filterRes: "6",
        filterType: true,
        reverbMix: "0.8",
        reverbDecay: "6.0",
        delayTime: "0.4",
        delayFeedback: "0.5",
        tempo: "88",
        attack: "1.2",
        decay: "1.8",
        sustain: "0.6",
        release: "3.5",
        oscillatorOctave: "0",
        oscillatorSemi: "4", // Major third
        oscillatorLevel: "0.65",
        chorusMix: "0.35",
        distortionMix: "0.02",
        flangerMix: "0.1",
        phaserMix: "0.2",
        lfoRate: "0.05",
        lfoAmount: "60",
        lfoDestination: "filterCutoff",
        lfoWaveform: "triangle",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "2.5",
        eqMid: "0",
        eqHigh: "1.5",
        eqMidFreq: "900",
        eqQ: "0.9",
        compressor: "0.3",
        sequencer: [
            {"note": "F3", "active": true},
            {"note": "A3", "active": false},
            {"note": "C4", "active": true},
            {"note": "F4", "active": false},
            {"note": "D#3", "active": true}, // Changed from Eb3
            {"note": "G3", "active": false},
            {"note": "A#3", "active": true}, // Changed from Bb3
            {"note": "D#4", "active": false}, // Changed from Eb4
            {"note": "A#2", "active": true}, // Changed from Bb2
            {"note": "D3", "active": false},
            {"note": "F3", "active": true},
            {"note": "A#3", "active": false}, // Changed from Bb3
            {"note": "C3", "active": true},
            {"note": "E3", "active": false},
            {"note": "G3", "active": true},
            {"note": "C4", "active": false}
        ],
    }),

    // ==== KEYS PRESETS ====
    createPreset("Crystal Piano", "keys", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "3500",
        filterRes: "1",
        filterType: false,
        reverbMix: "0.45",
        reverbDecay: "2.5",
        delayTime: "0.2",
        delayFeedback: "0.15",
        tempo: "110",
        attack: "0.01",
        decay: "1.2",
        sustain: "0.4",
        release: "0.8",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.9",
        chorusMix: "0.1",
        distortionMix: "0",
        flangerMix: "0",
        phaserMix: "0",
        lfoRate: "3.5",
        lfoAmount: "20",
        lfoDestination: "oscillatorLevel",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "1",
        eqMid: "0.5",
        eqHigh: "2.5",
        eqMidFreq: "1200",
        eqQ: "1.2",
        compressor: "0.3",
        sequencer: [
            {"note": "C4", "active": true},
            {"note": "E4", "active": false},
            {"note": "G4", "active": true},
            {"note": "C5", "active": false},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "D4", "active": true},
            {"note": "G4", "active": false},
            {"note": "A3", "active": true},
            {"note": "C4", "active": false},
            {"note": "E4", "active": true},
            {"note": "A4", "active": false},
            {"note": "F3", "active": true},
            {"note": "A3", "active": false},
            {"note": "C4", "active": true},
            {"note": "F4", "active": false}
        ]
    }),
    
    createPreset("Vintage Electric", "keys", {
        voiceMode: "poly",
        waveform: "sine",
        filterCutoff: "2000",
        filterRes: "3",
        filterType: false,
        reverbMix: "0.3",
        reverbDecay: "1.5",
        delayTime: "0.15",
        delayFeedback: "0.2",
        tempo: "120",
        attack: "0.03",
        decay: "0.8",
        sustain: "0.5",
        release: "0.4",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.8",
        chorusMix: "0.2",
        distortionMix: "0.15",
        flangerMix: "0",
        phaserMix: "0.2",
        lfoRate: "0.05",
        lfoAmount: "50",
        lfoDestination: "attack",
        lfoWaveform: "triangle",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "1.5",
        eqMid: "-1",
        eqHigh: "3",
        eqMidFreq: "1000",
        eqQ: "1",
        compressor: "0.3",
        sequencer: [
            {"note": "E3", "active": true},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "D4", "active": true},
            {"note": "E3", "active": true},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "D4", "active": true},
            {"note": "A3", "active": true},
            {"note": "C4", "active": true},
            {"note": "E4", "active": false},
            {"note": "G4", "active": true},
            {"note": "A3", "active": true},
            {"note": "C4", "active": true},
            {"note": "E4", "active": false},
            {"note": "G4", "active": true}
        ]
    }),
    
    createPreset("Warm Rhodes", "keys", {
        voiceMode: "poly",
        waveform: "sine",
        filterCutoff: "1500",
        filterRes: "2",
        filterType: false,
        reverbMix: "0.35",
        reverbDecay: "2.0",
        delayTime: "0.25",
        delayFeedback: "0.1",
        tempo: "95",
        attack: "0.02",
        decay: "1.0",
        sustain: "0.45",
        release: "0.6",
        oscillatorOctave: "0",
        oscillatorSemi: "7", // Perfect fifth for richness
        oscillatorLevel: "0.85",
        chorusMix: "0.25",
        distortionMix: "0.08",
        flangerMix: "0",
        phaserMix: "0.15",
        lfoRate: "0.05",
        lfoAmount: "60",
        lfoDestination: "release",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "2",
        eqMid: "1",
        eqHigh: "-0.5",
        eqMidFreq: "800",
        eqQ: "1.1",
        compressor: "0.3",
        sequencer: [
            {"note": "D3", "active": true},
            {"note": "A3", "active": false},
            {"note": "D4", "active": true},
            {"note": "F#4", "active": false},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "D4", "active": true},
            {"note": "G4", "active": false},
            {"note": "A3", "active": true},
            {"note": "C#4", "active": false},
            {"note": "E4", "active": true},
            {"note": "A4", "active": false},
            {"note": "F#3", "active": true},
            {"note": "A3", "active": false},
            {"note": "C#4", "active": true},
            {"note": "F#4", "active": false}
        ]
    }),

    // ==== PLUCK PRESETS ====
    createPreset("Crisp Harp", "pluck", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "4000",
        filterRes: "2",
        filterType: false,
        reverbMix: "0.6",
        reverbDecay: "3.0",
        delayTime: "0.3",
        delayFeedback: "0.25",
        tempo: "100",
        attack: "0.001",
        decay: "1.5",
        sustain: "0.1",
        release: "0.8",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.85",
        chorusMix: "0.1",
        distortionMix: "0",
        flangerMix: "0",
        phaserMix: "0",
        lfoRate: "0.25",
        lfoAmount: "25",
        lfoDestination: "delayFeedback",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "0",
        eqMid: "0",
        eqHigh: "3",
        eqMidFreq: "1500",
        eqQ: "1",
        compressor: "0.3",
        sequencer: [
            {"note": "C4", "active": true},
            {"note": "D4", "active": true},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "A4", "active": true},
            {"note": "C5", "active": false},
            {"note": "A4", "active": true},
            {"note": "G4", "active": true},
            {"note": "E4", "active": true},
            {"note": "D4", "active": true},
            {"note": "C4", "active": true},
            {"note": "C4", "active": false},
            {"note": "G4", "active": true},
            {"note": "E4", "active": true},
            {"note": "D4", "active": true},
            {"note": "C4", "active": true}
        ]
    }),
    
    createPreset("Techno Plucky", "pluck", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "800",
        filterRes: "8",
        filterType: false,
        reverbMix: "0.2",
        reverbDecay: "1.0",
        delayTime: "0.16",
        delayFeedback: "0.4",
        tempo: "130",
        attack: "0.001",
        decay: "0.2",
        sustain: "0.05",
        release: "0.1",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.9",
        chorusMix: "0",
        distortionMix: "0.1",
        flangerMix: "0",
        phaserMix: "0",
        lfoRate: "6",
        lfoAmount: "60",
        lfoDestination: "oscillatorLevel",
        lfoWaveform: "square",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "1",
        eqMid: "-2",
        eqHigh: "2",
        eqMidFreq: "1000",
        eqQ: "1",
        compressor: "0.3",
        sequencer: [
            {"note": "A3", "active": true},
            {"note": "A3", "active": true},
            {"note": "E4", "active": true},
            {"note": "A3", "active": true},
            {"note": "A3", "active": true},
            {"note": "E4", "active": true},
            {"note": "A3", "active": true},
            {"note": "E4", "active": true},
            {"note": "A3", "active": true},
            {"note": "A3", "active": true},
            {"note": "E4", "active": true},
            {"note": "A3", "active": true},
            {"note": "A3", "active": true},
            {"note": "E4", "active": true},
            {"note": "A3", "active": true},
            {"note": "C4", "active": true}
        ]
    }),
    
    createPreset("Ethereal Guitar", "pluck", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "2500",
        filterRes: "3",
        filterType: false,
        reverbMix: "0.7",
        reverbDecay: "4.0",
        delayTime: "0.33",
        delayFeedback: "0.5",
        tempo: "90",
        attack: "0.001",
        decay: "0.5",
        sustain: "0.2",
        release: "1.0",
        oscillatorOctave: "0",
        oscillatorSemi: "7", // Perfect fifth for richness
        oscillatorLevel: "0.75",
        chorusMix: "0.3",
        distortionMix: "0.05",
        flangerMix: "0.1",
        phaserMix: "0.1",
        lfoRate: "0.15",
        lfoAmount: "35",
        lfoDestination: "chorusMix",
        lfoWaveform: "triangle",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "1",
        eqMid: "0",
        eqHigh: "2.5",
        eqMidFreq: "1200",
        eqQ: "1.2",
        compressor: "0.3",
        sequencer: [
            {"note": "E3", "active": true},
            {"note": "B3", "active": false},
            {"note": "E4", "active": true},
            {"note": "G4", "active": false},
            {"note": "A3", "active": true},
            {"note": "E4", "active": false},
            {"note": "A4", "active": true},
            {"note": "C5", "active": false},
            {"note": "G3", "active": true},
            {"note": "D4", "active": false},
            {"note": "G4", "active": true},
            {"note": "B4", "active": false},
            {"note": "D3", "active": true},
            {"note": "A3", "active": false},
            {"note": "D4", "active": true},
            {"note": "F#4", "active": false}
        ]
    }),
    
    createPreset("Crystalline Pluck", "pluck", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "3400",
        filterRes: "2.5",
        filterType: false,
        reverbMix: "0.68",
        reverbDecay: "3.2",
        delayTime: "0.375", // Dotted eighth note at 120 BPM
        delayFeedback: "0.54",
        tempo: "120",
        attack: "0.001",
        decay: "0.28",
        sustain: "0.12",
        release: "0.9",
        oscillatorOctave: "0",
        oscillatorSemi: "7", // Perfect fifth
        oscillatorLevel: "0.82",
        chorusMix: "0.24",
        distortionMix: "0.05",
        flangerMix: "0.15",
        phaserMix: "0",
        lfoRate: "0.35",
        lfoAmount: "42",
        lfoDestination: "eqMidFreq",
        lfoWaveform: "triangle",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "1",
        eqMid: "2",
        eqHigh: "3.5",
        eqMidFreq: "1800",
        eqQ: "1.6",
        compressor: "0.3",
        sequencer: [
            {"note": "E4", "active": true},
            {"note": "B4", "active": true},
            {"note": "E5", "active": true},
            {"note": "G5", "active": true},
            {"note": "F#5", "active": true},
            {"note": "E5", "active": true},
            {"note": "B4", "active": true},
            {"note": "A4", "active": false},
            {"note": "G4", "active": true},
            {"note": "D5", "active": true},
            {"note": "G5", "active": true},
            {"note": "B5", "active": true},
            {"note": "A5", "active": true},
            {"note": "G5", "active": true},
            {"note": "D5", "active": true},
            {"note": "B4", "active": false}
        ]
    }),
         
    createPreset("Future Pluck", "pluck", {
        voiceMode: "poly",
        waveform: "square",
        filterCutoff: "950",
        filterRes: "8.5",
        filterType: false,
        reverbMix: "0.42",
        reverbDecay: "2.2",
        delayTime: "0.25", // 8th note at 120 BPM
        delayFeedback: "0.56",
        tempo: "128",
        attack: "0.001",
        decay: "0.15",
        sustain: "0.08",
        release: "0.25",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.88",
        chorusMix: "0.15",
        distortionMix: "0.18",
        flangerMix: "0.08",
        phaserMix: "0",
        lfoRate: "3.85",
        lfoAmount: "8",
        lfoDestination: "filterCutoff",
        lfoWaveform: "sawtooth",
        lfoSync: true,
        droneOctave: "-1",
        eqLow: "3",
        eqMid: "-2",
        eqHigh: "4",
        eqMidFreq: "950",
        eqQ: "1.8",
        compressor: "0.6",
        sequencer: [
            {"note": "C4", "active": true},
            {"note": "C4", "active": true},
            {"note": "G4", "active": true},
            {"note": "C4", "active": true},
            {"note": "D#4", "active": true},
            {"note": "C4", "active": true},
            {"note": "G4", "active": true},
            {"note": "D#4", "active": false},
            {"note": "C4", "active": true},
            {"note": "C4", "active": true},
            {"note": "G4", "active": true},
            {"note": "C4", "active": true},
            {"note": "F4", "active": true},
            {"note": "C4", "active": true},
            {"note": "G4", "active": true},
            {"note": "F4", "active": false}
        ]
    }),

    createPreset("Quantum Particles", "pluck", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "4600", // Very bright
        filterRes: "1.2", // Low resonance for grain-like quality
        filterType: false,
        reverbMix: "0.77",
        reverbDecay: "5.2",
        delayTime: "0.041667", // 64th note at 90 BPM
        delayFeedback: "0.65",
        tempo: "90",
        attack: "0.001", // Instant attack
        decay: "0.08", // Very short
        sustain: "0.02", // Minimal sustain
        release: "0.15", // Short release
        oscillatorOctave: "1",
        oscillatorSemi: "4", // Major third
        oscillatorLevel: "0.92",
        chorusMix: "0.05",
        distortionMix: "0.12",
        flangerMix: "0.04",
        phaserMix: "0.02",
        lfoRate: "5", // Ultra-fast modulation
        lfoAmount: "35",
        lfoDestination: "oscillatorLevel", // Amplitude modulation
        lfoWaveform: "random", // Random variation
        lfoSync: true,
        droneOctave: "0",
        eqLow: "1.2",
        eqMid: "-2.4",
        eqHigh: "5.6", // Strong high end
        eqMidFreq: "3200", // Higher mid frequency
        eqQ: "1.5",
        compressor: "0.4",
        sequencer: [
            {"note": "C6", "active": true},
            {"note": "G5", "active": true},
            {"note": "E6", "active": true},
            {"note": "C6", "active": true},
            {"note": "D6", "active": true},
            {"note": "A5", "active": true},
            {"note": "F6", "active": true},
            {"note": "D6", "active": true},
            {"note": "E6", "active": true},
            {"note": "B5", "active": true},
            {"note": "G6", "active": true},
            {"note": "E6", "active": true},
            {"note": "C7", "active": true},
            {"note": "G6", "active": true},
            {"note": "E7", "active": true},
            {"note": "C7", "active": true}
        ]
    }),

    createPreset("Temporal Flux", "pluck", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "1650",
        filterRes: "9.4",
        filterType: false,
        reverbMix: "0.56",
        reverbDecay: "3.8",
        delayTime: "0.166667", // Triplet 8th note
        delayFeedback: "0.72", // High feedback for flowing echoes
        tempo: "98", // Prime number tempo
        attack: "0.001", 
        decay: "0.25",
        sustain: "0.15",
        release: "0.85",
        oscillatorOctave: "0",
        oscillatorSemi: "3", // Minor third
        oscillatorLevel: "0.86",
        chorusMix: "0.28",
        distortionMix: "0.14",
        flangerMix: "0.46", // Strong flanger for time-warping effect
        phaserMix: "0.32",
        lfoRate: "0.36",
        lfoAmount: "88",
        lfoDestination: "delayFeedback",
        lfoWaveform: "sawtooth", 
        lfoSync: true,
        droneOctave: "-1",
        eqLow: "2.2",
        eqMid: "0.8",
        eqHigh: "3.4",
        eqMidFreq: "1350",
        eqQ: "1.85",
        compressor: "0.48",
        sequencer: [
            {"note": "E4", "active": true},
            {"note": "E4", "active": false},
            {"note": "G4", "active": true},
            {"note": "A4", "active": false},
            {"note": "B4", "active": true},
            {"note": "B4", "active": false},
            {"note": "D5", "active": true},
            {"note": "E5", "active": false},
            {"note": "G4", "active": true},
            {"note": "G4", "active": false},
            {"note": "B4", "active": true},
            {"note": "C5", "active": false},
            {"note": "D5", "active": true},
            {"note": "D5", "active": false},
            {"note": "F5", "active": true},
            {"note": "G5", "active": false}
        ]
    }),

    createPreset("Molecular Pluck", "pluck", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "3200",
        filterRes: "4.8",
        filterType: false,
        reverbMix: "0.72",
        reverbDecay: "2.6",
        delayTime: "0.25", // 8th note
        delayFeedback: "0.68",
        tempo: "132",
        attack: "0.001", 
        decay: "0.08", // Ultra short decay
        sustain: "0.05", // Minimal sustain
        release: "0.2",
        oscillatorOctave: "0",
        oscillatorSemi: "7", // Perfect fifth
        oscillatorLevel: "0.88",
        chorusMix: "0.12",
        distortionMix: "0.06",
        flangerMix: "0.22",
        phaserMix: "0.04",
        lfoRate: "0.1", // Very slow
        lfoAmount: "35",
        lfoDestination: "eqHigh", // Evolving brightness
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "0",
        eqLow: "1.5",
        eqMid: "-1.2",
        eqHigh: "4.5", // Very bright top end
        eqMidFreq: "2500",
        eqQ: "1.4",
        compressor: "0.45",
        sequencer: [
            {"note": "C5", "active": true},
            {"note": "G4", "active": true},
            {"note": "E5", "active": true},
            {"note": "G4", "active": true},
            {"note": "C5", "active": true},
            {"note": "G4", "active": true},
            {"note": "E5", "active": true},
            {"note": "G4", "active": true},
            {"note": "B4", "active": true},
            {"note": "F#4", "active": true},
            {"note": "D5", "active": true},
            {"note": "F#4", "active": true},
            {"note": "B4", "active": true},
            {"note": "F#4", "active": true},
            {"note": "D5", "active": true},
            {"note": "F#4", "active": true}
        ]
    }),

    createPreset("Holographic Harp", "pluck", {
        voiceMode: "poly",
        waveform: "sine",
        filterCutoff: "4800",
        filterRes: "2.4",
        filterType: false,
        reverbMix: "0.85", // Very wet
        reverbDecay: "6.2", // Long decay
        delayTime: "0.375", // Dotted eighth note
        delayFeedback: "0.58",
        tempo: "110",
        attack: "0.001", // Instant attack
        decay: "1.4",
        sustain: "0.08", // Low sustain
        release: "1.8", // Long release for continuity
        oscillatorOctave: "1", // One octave up
        oscillatorSemi: "7", // Perfect fifth
        oscillatorLevel: "0.75",
        chorusMix: "0.35",
        distortionMix: "0.0", // No distortion
        flangerMix: "0.28",
        phaserMix: "0.18",
        lfoRate: "0.18",
        lfoAmount: "45",
        lfoDestination: "flangerMix", // Shifting flanger
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "0",
        eqLow: "1.2",
        eqMid: "-0.8",
        eqHigh: "4.2", // Very bright high end
        eqMidFreq: "1800",
        eqQ: "0.85",
        compressor: "0.25",
        sequencer: [
            {"note": "E5", "active": true},
            {"note": "B4", "active": true},
            {"note": "G5", "active": true},
            {"note": "E5", "active": true},
            {"note": "B5", "active": true},
            {"note": "G5", "active": true},
            {"note": "E6", "active": true},
            {"note": "B5", "active": true},
            {"note": "D5", "active": true},
            {"note": "A4", "active": true},
            {"note": "F#5", "active": true},
            {"note": "D5", "active": true},
            {"note": "A5", "active": true},
            {"note": "F#5", "active": true},
            {"note": "D6", "active": true},
            {"note": "A5", "active": true}
        ]
    }),

    createPreset("Quantum Pluck", "pluck", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "920", // Low filter
        filterRes: "15.0", // Extreme resonance
        filterType: false,
        reverbMix: "0.48",
        reverbDecay: "2.2",
        delayTime: "0.083333", // 32nd note
        delayFeedback: "0.72", // High feedback
        tempo: "144",
        attack: "0.001",
        decay: "0.12",
        sustain: "0.0", // No sustain
        release: "0.1",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.95",
        chorusMix: "0.0",
        distortionMix: "0.22",
        flangerMix: "0.0",
        phaserMix: "0.0",
        lfoRate: "5", // Ultra fast
        lfoAmount: "95", // Extreme amount
        lfoDestination: "chorusMix",
        lfoWaveform: "sawtooth",
        lfoSync: true,
        droneOctave: "-1",
        eqLow: "2.5",
        eqMid: "-3.0", // Cut mids
        eqHigh: "4.0",
        eqMidFreq: "750",
        eqQ: "2.8", // Sharp Q
        compressor: "0.65",
        sequencer: [
            {"note": "C4", "active": true},
            {"note": "C4", "active": false},
            {"note": "G4", "active": true},
            {"note": "G4", "active": false},
            {"note": "C5", "active": true},
            {"note": "C5", "active": false},
            {"note": "G4", "active": true},
            {"note": "G4", "active": false},
            {"note": "D4", "active": true},
            {"note": "D4", "active": false},
            {"note": "A4", "active": true},
            {"note": "A4", "active": false},
            {"note": "D5", "active": true},
            {"note": "D5", "active": false},
            {"note": "A4", "active": true},
            {"note": "A4", "active": false}
        ]
    }),


    // ==== BASS PRESETS ====
    createPreset("Deep Sub", "bass", {
        voiceMode: "poly",
        waveform: "sine",
        filterCutoff: "300",
        filterRes: "1",
        filterType: false,
        reverbMix: "0.1",
        reverbDecay: "1.0",
        delayTime: "0",
        delayFeedback: "0",
        tempo: "90",
        attack: "0.01",
        decay: "0.2",
        sustain: "0.8",
        release: "0.3",
        oscillatorOctave: "-1",
        oscillatorSemi: "0",
        oscillatorLevel: "1.0",
        chorusMix: "0",
        distortionMix: "0.1",
        flangerMix: "0",
        phaserMix: "0",
        lfoRate: "0.08",
        lfoAmount: "25",
        lfoDestination: "filterCutoff",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "5",
        eqMid: "-2",
        eqHigh: "-3",
        eqMidFreq: "800",
        eqQ: "1.5",
        compressor: "0.3",
        sequencer: [
            {"note": "C2", "active": true},
            {"note": "C2", "active": false},
            {"note": "G2", "active": true},
            {"note": "G2", "active": false},
            {"note": "A#2", "active": true},
            {"note": "A#2", "active": false},
            {"note": "G2", "active": true},
            {"note": "G2", "active": false},
            {"note": "C2", "active": true},
            {"note": "C2", "active": false},
            {"note": "G2", "active": true},
            {"note": "G2", "active": false},
            {"note": "F2", "active": true},
            {"note": "F2", "active": false},
            {"note": "G2", "active": true},
            {"note": "G2", "active": false}
        ]
    }),
    
    createPreset("Acid Wobble", "bass", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "400",
        filterRes: "12",
        filterType: false,
        reverbMix: "0.1",
        reverbDecay: "1.0",
        delayTime: "0.125", // 1/16th note
        delayFeedback: "0.2",
        tempo: "130",
        attack: "0.01",
        decay: "0.1",
        sustain: "0.6",
        release: "0.2",
        oscillatorOctave: "-1",
        oscillatorSemi: "0",
        oscillatorLevel: "0.9",
        chorusMix: "0",
        distortionMix: "0.4",
        flangerMix: "0",
        phaserMix: "0.1",
        lfoRate: "3.5",
        lfoAmount: "5",
        lfoDestination: "eqHigh",
        lfoWaveform: "square",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "4",
        eqMid: "0",
        eqHigh: "-2",
        eqMidFreq: "1000",
        eqQ: "1.5",
        compressor: "0.3",
        sequencer: [
            {"note": "C2", "active": true},
            {"note": "C2", "active": true},
            {"note": "C2", "active": true},
            {"note": "C2", "active": true},
            {"note": "C2", "active": true},
            {"note": "C2", "active": true},
            {"note": "C2", "active": true},
            {"note": "C2", "active": true},
            {"note": "G2", "active": true},
            {"note": "G2", "active": true},
            {"note": "G2", "active": true},
            {"note": "G2", "active": true},
            {"note": "G2", "active": true},
            {"note": "G2", "active": true},
            {"note": "G2", "active": true},
            {"note": "G2", "active": true}
        ]
    }),
    
    createPreset("Synth Funk", "bass", {
        voiceMode: "poly",
        waveform: "square",
        filterCutoff: "800",
        filterRes: "5",
        filterType: false,
        reverbMix: "0.2",
        reverbDecay: "1.5",
        delayTime: "0.15",
        delayFeedback: "0.1",
        tempo: "110",
        attack: "0.01",
        decay: "0.3",
        sustain: "0.4",
        release: "0.2",
        oscillatorOctave: "-1",
        oscillatorSemi: "0",
        oscillatorLevel: "0.85",
        chorusMix: "0.1",
        distortionMix: "0.2",
        flangerMix: "0",
        phaserMix: "0.15",
        lfoRate: "2",
        lfoAmount: "4",
        lfoDestination: "filterCutoff",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "3",
        eqMid: "1",
        eqHigh: "-1",
        eqMidFreq: "700",
        eqQ: "1.2",
        compressor: "0.3",
        sequencer: [
            {"note": "C2", "active": true},
            {"note": "C2", "active": false},
            {"note": "G2", "active": true},
            {"note": "C2", "active": false},
            {"note": "A#2", "active": true},
            {"note": "A#2", "active": false},
            {"note": "G2", "active": true},
            {"note": "G2", "active": false},
            {"note": "F2", "active": true},
            {"note": "F2", "active": false},
            {"note": "F2", "active": true},
            {"note": "F2", "active": false},
            {"note": "G2", "active": true},
            {"note": "G2", "active": false},
            {"note": "G2", "active": true},
            {"note": "G2", "active": false}
        ]
    }),

    // ==== LEAD PRESETS ====
    createPreset("Screaming Lead", "lead", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "2000",
        filterRes: "6",
        filterType: false,
        reverbMix: "0.3",
        reverbDecay: "1.5",
        delayTime: "0.2",
        delayFeedback: "0.3",
        tempo: "120",
        attack: "0.01",
        decay: "0.3",
        sustain: "0.7",
        release: "0.2",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.19",
        chorusMix: "0.1",
        distortionMix: "0.6",
        flangerMix: "0",
        phaserMix: "0.2",
        lfoRate: "6",
        lfoAmount: "20",  // Reduced from 35 to prevent negative filterRes values
        lfoDestination: "oscillatorLevel", // Changed from filterRes to prevent values going out of range
        lfoWaveform: "triangle",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "-1",
        eqMid: "3",
        eqHigh: "4",
        eqMidFreq: "1500",
        eqQ: "1.5",
        compressor: "0.3",
        sequencer: [
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "A4", "active": true},
            {"note": "B4", "active": true},
            {"note": "E5", "active": true},
            {"note": "D5", "active": true},
            {"note": "B4", "active": true},
            {"note": "A4", "active": true},
            {"note": "G4", "active": true},
            {"note": "A4", "active": true},
            {"note": "B4", "active": true},
            {"note": "D5", "active": true},
            {"note": "E5", "active": true},
            {"note": "G5", "active": true},
            {"note": "E5", "active": true},
            {"note": "B4", "active": true}
        ]
    }),
    
    createPreset("Smooth Solo", "lead", {
        voiceMode: "poly",
        waveform: "sine",
        filterCutoff: "1200",
        filterRes: "3",
        filterType: false,
        reverbMix: "0.4",
        reverbDecay: "2.0",
        delayTime: "0.3",
        delayFeedback: "0.4",
        tempo: "90",
        attack: "0.05",
        decay: "0.2",
        sustain: "0.8",
        release: "0.4",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.85",
        chorusMix: "0.2",
        distortionMix: "0.1",
        flangerMix: "0",
        phaserMix: "0.3",
        lfoRate: "0.2",
        lfoAmount: "35",
        lfoDestination: "eqMid",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "0",
        eqMid: "-2",
        eqHigh: "1",
        eqMidFreq: "1200",
        eqQ: "1.2",
        compressor: "0.3",
        sequencer: [
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "A4", "active": true},
            {"note": "C5", "active": true},
            {"note": "B4", "active": true},
            {"note": "G4", "active": true},
            {"note": "E4", "active": true},
            {"note": "D4", "active": true},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "A4", "active": true},
            {"note": "C5", "active": true},
            {"note": "B4", "active": true},
            {"note": "G4", "active": true},
            {"note": "A4", "active": true},
            {"note": "E4", "active": true}
        ]
    }),
    
    createPreset("Retro Arpeggios", "lead", {
        voiceMode: "poly",
        waveform: "pulse",
        filterCutoff: "1500",
        filterRes: "8",
        filterType: false,
        reverbMix: "0.25",
        reverbDecay: "1.5",
        delayTime: "0.125",
        delayFeedback: "0.16",
        tempo: "140",
        attack: "0.001",
        decay: "0.2",
        sustain: "0.5",
        release: "0.1",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.8",
        chorusMix: "0.1",
        distortionMix: "0.05",
        flangerMix: "0.2",
        phaserMix: "0.1",
        lfoRate: "4.5",
        lfoAmount: "55",
        lfoDestination: "pulseWidth",
        lfoWaveform: "triangle",
        lfoSync: true,
        droneOctave: "-1",
        eqLow: "0",
        eqMid: "1",
        eqHigh: "3",
        eqMidFreq: "1000",
        eqQ: "1.2",
        compressor: "0.3",
        pulseWidth: "0.5",
        sequencer: [
            {"note": "C4", "active": true},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "C5", "active": true},
            {"note": "G4", "active": true},
            {"note": "E4", "active": true},
            {"note": "C4", "active": true},
            {"note": "E4", "active": true},
            {"note": "A3", "active": true},
            {"note": "C4", "active": true},
            {"note": "E4", "active": true},
            {"note": "A4", "active": true},
            {"note": "E4", "active": true},
            {"note": "C4", "active": true},
            {"note": "A3", "active": true},
            {"note": "C4", "active": true},
            {"note": "E4", "active": true}
        ]
    }),
            
    createPreset("Solstice Lead", "lead", {
        voiceMode: "poly",
        waveform: "square",
        filterCutoff: "3200",
        filterRes: "5.4",
        filterType: false,
        reverbMix: "0.38",
        reverbDecay: "2.3",
        delayTime: "0.33",
        delayFeedback: "0.48",
        tempo: "118",
        attack: "0.01",
        decay: "0.15",
        sustain: "0.65",
        release: "0.4",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.85",
        chorusMix: "0.24",
        distortionMix: "0.28",
        flangerMix: "0",
        phaserMix: "0.15",
        lfoRate: "5.8",
        lfoAmount: "28",
        lfoDestination: "oscillatorLevel",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "1",
        eqMid: "3.5",
        eqHigh: "4",
        eqMidFreq: "1800",
        eqQ: "1.4",
        compressor: "0.87",
        sequencer: [
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "B4", "active": true},
            {"note": "D5", "active": true},
            {"note": "G5", "active": true},
            {"note": "D5", "active": true},
            {"note": "B4", "active": true},
            {"note": "G4", "active": true},
            {"note": "A4", "active": true},
            {"note": "C5", "active": true},
            {"note": "E5", "active": true},
            {"note": "G5", "active": true},
            {"note": "A5", "active": true},
            {"note": "G5", "active": true},
            {"note": "E5", "active": true},
            {"note": "C5", "active": true}
        ]
    }),

    createPreset("Hybrid Orchestra", "lead", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "3800",
        filterRes: "1.2",
        filterType: false,
        reverbMix: "0.78",
        reverbDecay: "4.6",
        delayTime: "0.375", // Dotted eighth note
        delayFeedback: "0.42",
        tempo: "100",
        attack: "0.05",
        decay: "0.8",
        sustain: "0.7",
        release: "1.5",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.86",
        chorusMix: "0.28",
        distortionMix: "0.1",
        flangerMix: "0.15",
        phaserMix: "0",
        lfoRate: "0.3",
        lfoAmount: "32",
        lfoDestination: "chorusMix",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "2",
        eqMid: "1.5",
        eqHigh: "3",
        eqMidFreq: "1500",
        eqQ: "1.2",
        compressor: "0.4",
        sequencer: [
            {"note": "G3", "active": true},
            {"note": "C4", "active": true},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "C5", "active": true},
            {"note": "G4", "active": true},
            {"note": "E4", "active": true},
            {"note": "C4", "active": false},
            {"note": "F3", "active": true},
            {"note": "A3", "active": true},
            {"note": "C4", "active": true},
            {"note": "F4", "active": true},
            {"note": "A4", "active": true},
            {"note": "F4", "active": true},
            {"note": "C4", "active": true},
            {"note": "A3", "active": false}
        ]
    }),
    
    createPreset("PWM Classic", "lead", {
        voiceMode: "poly",
        waveform: "pulse",
        filterCutoff: "2800",
        filterRes: "3.5",
        filterType: false,
        reverbMix: "0.22",
        reverbDecay: "1.2",
        delayTime: "0.25",
        delayFeedback: "0.45",
        tempo: "120",
        attack: "0.005",
        decay: "0.12",
        sustain: "0.7",
        release: "0.3",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.82",
        chorusMix: "0.18",
        distortionMix: "0.1",
        flangerMix: "0",
        phaserMix: "0.15",
        lfoRate: "3.8",
        lfoAmount: "65",
        lfoDestination: "pulseWidth",
        lfoWaveform: "triangle",
        lfoSync: true,
        droneOctave: "-1",
        eqLow: "1.5",
        eqMid: "2",
        eqHigh: "2.5",
        eqMidFreq: "1400",
        eqQ: "1.2",
        compressor: "0.74",
        pulseWidth: "0.45",
        sequencer: [
            {"note": "C4", "active": true},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "C5", "active": true},
            {"note": "D4", "active": true},
            {"note": "F4", "active": true},
            {"note": "A4", "active": true},
            {"note": "D5", "active": true},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "B4", "active": true},
            {"note": "E5", "active": true},
            {"note": "G3", "active": true},
            {"note": "B3", "active": true},
            {"note": "D4", "active": true},
            {"note": "G4", "active": true}
        ]
    }),

    createPreset("Cybernetic Organism", "lead", {
        voiceMode: "poly",
        waveform: "pulse",
        filterCutoff: "1840",
        filterRes: "7.8",
        filterType: false,
        reverbMix: "0.38",
        reverbDecay: "2.8",
        delayTime: "0.125", // 16th note
        delayFeedback: "0.52",
        tempo: "110",
        attack: "0.015", // Quick but not instant
        decay: "0.38",
        sustain: "0.65",
        release: "1.2",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.88",
        chorusMix: "0.32",
        distortionMix: "0.28",
        flangerMix: "0.15",
        phaserMix: "0.22",
        lfoRate: "3.75",
        lfoAmount: "75",
        lfoDestination: "pulseWidth", // PWM for movement
        lfoWaveform: "triangle",
        lfoSync: true,
        droneOctave: "-1",
        eqLow: "2.2",
        eqMid: "-1.4",
        eqHigh: "3.6",
        eqMidFreq: "1250",
        eqQ: "1.75",
        compressor: "0.85",
        pulseWidth: "0.15", // Narrow pulse width
        sequencer: [
            {"note": "C4", "active": true},
            {"note": "D4", "active": true},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "C5", "active": true},
            {"note": "B4", "active": true},
            {"note": "G4", "active": true},
            {"note": "E4", "active": true},
            {"note": "F4", "active": true},
            {"note": "G4", "active": true},
            {"note": "A4", "active": true},
            {"note": "C5", "active": true},
            {"note": "F5", "active": true},
            {"note": "E5", "active": true},
            {"note": "C5", "active": true},
            {"note": "A4", "active": true}
        ]
    }),

    createPreset("Supernova Lead", "lead", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "1650",
        filterRes: "12.5", // Extreme resonance
        filterType: false,
        reverbMix: "0.28",
        reverbDecay: "1.8",
        delayTime: "0.1667", // Triplet 8th
        delayFeedback: "0.54",
        tempo: "125",
        attack: "0.001", // Instant attack
        decay: "0.25",
        sustain: "0.65",
        release: "0.3",
        oscillatorOctave: "0",
        oscillatorSemi: "0.5", // Slight detuning for fatness
        oscillatorLevel: "0.92",
        chorusMix: "0.15",
        distortionMix: "0.78", // Extreme distortion
        flangerMix: "0.08",
        phaserMix: "0.22",
        lfoRate: "5",
        lfoAmount: "5",
        lfoDestination: "filterCutoff",
        lfoWaveform: "sawtooth", // Aggressive filter sweep
        lfoSync: true,
        droneOctave: "-1",
        eqLow: "1.2",
        eqMid: "4.5", // Strong midrange push
        eqHigh: "3.8",
        eqMidFreq: "1800", // Upper midrange focus
        eqQ: "2.2",
        compressor: "0.85", // Heavy compression
        sequencer: [
            {"note": "E4", "active": true},
            {"note": "E4", "active": true},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "B4", "active": true},
            {"note": "E5", "active": true},
            {"note": "D5", "active": true},
            {"note": "B4", "active": true},
            {"note": "G4", "active": true},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "A4", "active": true},
            {"note": "B4", "active": true},
            {"note": "A4", "active": true},
            {"note": "G4", "active": true},
            {"note": "E4", "active": true}
        ]
    }),

    createPreset("Photonic Lead", "lead", {
        voiceMode: "poly",
        waveform: "pulse",
        filterCutoff: "3800",
        filterRes: "3.6",
        filterType: false,
        reverbMix: "0.35",
        reverbDecay: "2.1",
        delayTime: "0.125", // 16th note
        delayFeedback: "0.62",
        tempo: "138",
        attack: "0.001",
        decay: "0.12",
        sustain: "0.78",
        release: "0.4",
        oscillatorOctave: "-2",
        oscillatorSemi: "12", // Octave up for brightness
        oscillatorLevel: "0.70",
        chorusMix: "0.18",
        distortionMix: "0.32",
        flangerMix: "0.0",
        phaserMix: "0.25",
        lfoRate: "5", // Fast modulation
        lfoAmount: "45",
        lfoDestination: "pulseWidth",
        lfoWaveform: "triangle",
        lfoSync: true,
        droneOctave: "0",
        eqLow: "0.8",
        eqMid: "2.8",
        eqHigh: "5.0", // Extreme high end boost
        eqMidFreq: "2200", // Upper mid focus
        eqQ: "1.65",
        compressor: "0.58",
        pulseWidth: "0.12", // Thin pulse width
        sequencer: [
            {"note": "C5", "active": true},
            {"note": "E5", "active": true},
            {"note": "G5", "active": true},
            {"note": "C6", "active": true},
            {"note": "B5", "active": true},
            {"note": "G5", "active": true},
            {"note": "E5", "active": true},
            {"note": "C5", "active": true},
            {"note": "D5", "active": true},
            {"note": "F5", "active": true},
            {"note": "A5", "active": true},
            {"note": "D6", "active": true},
            {"note": "C6", "active": true},
            {"note": "A5", "active": true},
            {"note": "F5", "active": true},
            {"note": "D5", "active": true}
        ]
    }),

    createPreset("Synthetic Brass", "lead", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "1850",
        filterRes: "2.2",
        filterType: false,
        reverbMix: "0.38",
        reverbDecay: "1.8",
        delayTime: "0.0", // No delay
        delayFeedback: "0.0",
        tempo: "100",
        attack: "0.05", // Moderate attack for brass-like
        decay: "0.25",
        sustain: "0.85", // High sustain
        release: "0.3",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.92",
        chorusMix: "0.15",
        distortionMix: "0.18",
        flangerMix: "0.0",
        phaserMix: "0.15",
        lfoRate: "5",
        lfoAmount: "5",
        lfoDestination: "filterCutoff", // Filter modulation
        lfoWaveform: "triangle",
        lfoSync: true,
        droneOctave: "-1",
        eqLow: "1.8",
        eqMid: "3.5", // Strong midrange
        eqHigh: "2.0",
        eqMidFreq: "1200", // Brass-like formant
        eqQ: "1.8",
        compressor: "0.65", // Significant compression
        sequencer: [
            {"note": "F4", "active": true},
            {"note": "A4", "active": true},
            {"note": "C5", "active": true},
            {"note": "F5", "active": false},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "C5", "active": true},
            {"note": "E5", "active": false},
            {"note": "D4", "active": true},
            {"note": "F4", "active": true},
            {"note": "A4", "active": true},
            {"note": "D5", "active": false},
            {"note": "G4", "active": true},
            {"note": "B4", "active": true},
            {"note": "D5", "active": true},
            {"note": "G5", "active": false}
        ]
    }),




    // ==== FX PRESETS ====
    createPreset("Alien Transmission", "fx", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "2000",
        filterRes: "15",
        filterType: true, // High pass
        reverbMix: "0.8",
        reverbDecay: "5.0",
        delayTime: "0.4",
        delayFeedback: "0.7",
        tempo: "100",
        attack: "0.05",
        decay: "0.5",
        sustain: "0.3",
        release: "2.0",
        oscillatorOctave: "1",
        oscillatorSemi: "4", // Major third
        oscillatorLevel: "0.7",
        chorusMix: "0.3",
        distortionMix: "0.2",
        flangerMix: "0.3",
        phaserMix: "0.4",
        lfoRate: "3.5",
        lfoAmount: "90",
        lfoDestination: "eqQ",
        lfoWaveform: "square",
        lfoSync: false,
        droneOctave: "0",
        eqLow: "-3",
        eqMid: "0",
        compressor: "0.85",
        eqHigh: "5",
        eqMidFreq: "2000",
        eqQ: "2",
        sequencer: [
            {"note": "C5", "active": true},
            {"note": "C#5", "active": true},
            {"note": "D5", "active": true},
            {"note": "D#5", "active": true},
            {"note": "E5", "active": true},
            {"note": "F5", "active": true},
            {"note": "F#5", "active": true},
            {"note": "G5", "active": true},
            {"note": "G#5", "active": true},
            {"note": "A5", "active": true},
            {"note": "A#5", "active": true},
            {"note": "B5", "active": true},
            {"note": "C6", "active": true},
            {"note": "B5", "active": true},
            {"note": "A#5", "active": true},
            {"note": "A5", "active": true}
        ]
    }),
    
    createPreset("Glitch Machine", "fx", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "1000",
        filterRes: "10",
        filterType: false,
        reverbMix: "0.3",
        reverbDecay: "2.0",
        delayTime: "0.0625", // 1/16th note
        delayFeedback: "0.8",
        tempo: "120",
        attack: "0.001",
        decay: "0.1",
        sustain: "0.1",
        release: "0.1",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.8",
        chorusMix: "0",
        distortionMix: "0.7",
        flangerMix: "0.4",
        phaserMix: "0.3",
        lfoRate: "12",
        lfoAmount: "100",
        lfoDestination: "eqQ",
        lfoWaveform: "random",
        lfoSync: false,
        droneOctave: "0",
        eqLow: "2",
        eqMid: "-4",
        eqHigh: "4",
        eqMidFreq: "1000",
        eqQ: "2.5",
        compressor: "0.85",
        sequencer: [
            {"note": "C4", "active": true},
            {"note": "C4", "active": false},
            {"note": "C4", "active": true},
            {"note": "C4", "active": false},
            {"note": "G3", "active": true},
            {"note": "G3", "active": false},
            {"note": "G3", "active": true},
            {"note": "G3", "active": false},
            {"note": "C4", "active": true},
            {"note": "G3", "active": true},
            {"note": "C4", "active": true},
            {"note": "G3", "active": true},
            {"note": "C4", "active": true},
            {"note": "C4", "active": true},
            {"note": "G3", "active": true},
            {"note": "G3", "active": false}
        ]
    }),
    
    createPreset("Haunted Voices", "fx", {
        voiceMode: "poly",
        waveform: "sine",
        filterCutoff: "500",
        filterRes: "4",
        filterType: true, // High pass
        reverbMix: "0.9",
        reverbDecay: "10.0",
        delayTime: "0.5",
        delayFeedback: "0.7",
        tempo: "60",
        attack: "0.5",
        decay: "1.0",
        sustain: "0.4",
        release: "3.0",
        oscillatorOctave: "-1",
        oscillatorSemi: "7", // Perfect fifth
        oscillatorLevel: "0.6",
        chorusMix: "0.4",
        distortionMix: "0.1",
        flangerMix: "0.3",
        phaserMix: "0.2",
        lfoRate: "0.3",
        lfoAmount: "60",
        lfoDestination: "eqLow",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "-2",
        eqMid: "0",
        eqHigh: "3",
        eqMidFreq: "1800",
        eqQ: "1.5",
        compressor: "0.85",
        sequencer: [
            {"note": "G3", "active": true},
            {"note": "C4", "active": false},
            {"note": "G3", "active": false},
            {"note": "A#3", "active": true},
            {"note": "G3", "active": false},
            {"note": "C4", "active": false},
            {"note": "A#3", "active": false},
            {"note": "G3", "active": true},
            {"note": "F3", "active": false},
            {"note": "G#3", "active": true},
            {"note": "F3", "active": false},
            {"note": "C4", "active": false},
            {"note": "G#3", "active": false},
            {"note": "F3", "active": true},
            {"note": "G3", "active": false},
            {"note": "A#3", "active": false}
        ]
    }),
];

// 10 Professional Synth XR Presets
// Create these high-quality presets that maximize the synth's capabilities

const professionalPresets = [
    // ==== EVOLVING PAD ====
    createPreset("Quantum Field", "pad", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "1200",
        filterRes: "3",
        filterType: false,
        reverbMix: "0.72",
        reverbDecay: "8.4",
        delayTime: "0.375",
        delayFeedback: "0.62",
        tempo: "78",
        attack: "1.8",
        decay: "1.2",
        sustain: "0.75",
        release: "4.2",
        oscillatorOctave: "0",
        oscillatorSemi: "7", // Perfect fifth
        oscillatorLevel: "0.82",
        chorusMix: "0.42",
        distortionMix: "0.08",
        flangerMix: "0.21",
        phaserMix: "0.18",
        lfoRate: "0.32",
        lfoAmount: "65",
        lfoDestination: "filterCutoff",
        lfoWaveform: "triangle",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "3.5",
        eqMid: "-1.5",
        eqHigh: "2.5",
        eqMidFreq: "680",
        eqQ: "0.9",
        compressor: "0.25",
        sequencer: [
            {"note": "F3", "active": true},
            {"note": "C4", "active": false},
            {"note": "D#4", "active": true}, // Changed from Eb4
            {"note": "F4", "active": false},
            {"note": "G#3", "active": true}, // Changed from Ab3
            {"note": "C4", "active": false},
            {"note": "D#4", "active": true}, // Changed from Eb4
            {"note": "F4", "active": false},
            {"note": "G3", "active": true},
            {"note": "A#3", "active": false}, // Changed from Bb3
            {"note": "D4", "active": true},
            {"note": "G4", "active": false},
            {"note": "D#3", "active": true}, // Changed from Eb3
            {"note": "G3", "active": false},
            {"note": "A#3", "active": true}, // Changed from Bb3
            {"note": "D#4", "active": false} // Changed from Eb4
        ]
    }),

    
    // ==== CINEMATIC KEYS ====
    createPreset("Holographic Piano", "keys", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "4200",
        filterRes: "1.8",
        filterType: false,
        reverbMix: "0.65",
        reverbDecay: "3.8",
        delayTime: "0.25",
        delayFeedback: "0.32",
        tempo: "90",
        attack: "0.01",
        decay: "1.5",
        sustain: "0.35",
        release: "1.2",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.88",
        chorusMix: "0.18",
        distortionMix: "0.05",
        flangerMix: "0.1",
        phaserMix: "0.08",
        lfoRate: "0.4",
        lfoAmount: "22",
        lfoDestination: "delayFeedback",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "1.5",
        eqMid: "0",
        eqHigh: "4",
        eqMidFreq: "1500",
        eqQ: "1.1",
        compressor: "0.35",
        sequencer: [
            {"note": "D4", "active": true},
            {"note": "A4", "active": false},
            {"note": "F#4", "active": true},
            {"note": "D5", "active": false},
            {"note": "A4", "active": true},
            {"note": "F#4", "active": false},
            {"note": "D4", "active": true},
            {"note": "A3", "active": false},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "D4", "active": true},
            {"note": "G4", "active": false},
            {"note": "B4", "active": true},
            {"note": "G4", "active": false},
            {"note": "D4", "active": true},
            {"note": "B3", "active": false}
        ]
    }),

    // ==== EXPERIMENTAL FX ====
    createPreset("Event Horizon", "fx", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "1200",
        filterRes: "12",
        filterType: true, // High pass
        reverbMix: "0.85",
        reverbDecay: "9.5",
        delayTime: "0.667", // Triplet delay
        delayFeedback: "0.78",
        tempo: "90",
        attack: "1.2",
        decay: "2.4",
        sustain: "0.4",
        release: "4.5",
        oscillatorOctave: "1",
        oscillatorSemi: "4", // Major third
        oscillatorLevel: "0.7",
        chorusMix: "0.48",
        distortionMix: "0.25",
        flangerMix: "0.35",
        phaserMix: "0.42",
        lfoRate: "0.15",
        lfoAmount: "85",
        lfoDestination: "filterCutoff",
        lfoWaveform: "random",
        lfoSync: false,
        droneOctave: "0",
        eqLow: "-4",
        eqMid: "0",
        eqHigh: "6",
        eqMidFreq: "2400",
        eqQ: "2.2",
        compressor: "0.85",
        sequencer: [
            {"note": "C5", "active": true},
            {"note": "D#5", "active": false},
            {"note": "G5", "active": true},
            {"note": "A#5", "active": false},
            {"note": "F5", "active": true},
            {"note": "G5", "active": false},
            {"note": "A#5", "active": true},
            {"note": "C6", "active": false},
            {"note": "G4", "active": true},
            {"note": "C5", "active": false},
            {"note": "D#5", "active": true},
            {"note": "G5", "active": false},
            {"note": "F4", "active": true},
            {"note": "A4", "active": false},
            {"note": "C5", "active": true},
            {"note": "F5", "active": false}
        ]
    }),
    
    // ==== 80s RETRO SYNTH ====
    createPreset("1985 Synthwave", "keys", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "1800",
        filterRes: "4.5",
        filterType: false,
        reverbMix: "0.4",
        reverbDecay: "2.8",
        delayTime: "0.167", // 16th note at 90 BPM
        delayFeedback: "0.65",
        tempo: "90",
        attack: "0.001",
        decay: "0.45",
        sustain: "0.6",
        release: "0.38",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.85",
        chorusMix: "0.35",
        distortionMix: "0.12",
        flangerMix: "0",
        phaserMix: "0.25",
        lfoRate: "1.16",
        lfoAmount: "28",
        lfoDestination: "chorusMix",
        lfoWaveform: "triangle",
        lfoSync: true,
        droneOctave: "-1",
        eqLow: "2.5",
        eqMid: "-1",
        eqHigh: "3",
        eqMidFreq: "1100",
        eqQ: "0.8",
        compressor: "0.45",
        sequencer: [
            {"note": "A3", "active": true},
            {"note": "C4", "active": true},
            {"note": "E4", "active": true},
            {"note": "A4", "active": true},
            {"note": "A3", "active": true},
            {"note": "C4", "active": true},
            {"note": "E4", "active": true},
            {"note": "A4", "active": true},
            {"note": "F3", "active": true},
            {"note": "A3", "active": true},
            {"note": "C4", "active": true},
            {"note": "F4", "active": true},
            {"note": "G3", "active": true},
            {"note": "B3", "active": true},
            {"note": "D4", "active": true},
            {"note": "G4", "active": true}
        ]
    }),

    
    // ==== CINEMATIC ATMOSPHERIC ====
    createPreset("Interstellar", "pad", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "680",
        filterRes: "2.8",
        filterType: false,
        reverbMix: "0.92",
        reverbDecay: "9.8",
        delayTime: "0.5",
        delayFeedback: "0.72",
        tempo: "70",
        attack: "2.5",
        decay: "3.0",
        sustain: "0.85",
        release: "6.0",
        oscillatorOctave: "0",
        oscillatorSemi: "5", // Perfect fourth
        oscillatorLevel: "0.8",
        chorusMix: "0.48",
        distortionMix: "0.05",
        flangerMix: "0.22",
        phaserMix: "0.15",
        lfoRate: "0.08",
        lfoAmount: "48",
        lfoDestination: "eqMidFreq",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "3.5",
        eqMid: "-1",
        eqHigh: "2.5",
        eqMidFreq: "620",
        eqQ: "0.7",
        compressor: "0.3",
        sequencer: [
            {"note": "D3", "active": true},
            {"note": "A3", "active": false},
            {"note": "D4", "active": true},
            {"note": "G4", "active": false},
            {"note": "A3", "active": true},
            {"note": "D4", "active": false},
            {"note": "F#4", "active": true},
            {"note": "A4", "active": false},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "D4", "active": true},
            {"note": "G4", "active": false},
            {"note": "A3", "active": true},
            {"note": "E4", "active": false},
            {"note": "A4", "active": true},
            {"note": "C#5", "active": false}
        ]
    }),
    
    // ==== TECHNO SEQUENCE ====
    createPreset("Berlin Techno", "bass", {
        voiceMode: "poly",
        waveform: "pulse",
        filterCutoff: "600",
        filterRes: "9.8",
        filterType: false,
        reverbMix: "0.15",
        reverbDecay: "1.5",
        delayTime: "0.125", // 16th note at 120 BPM
        delayFeedback: "0.35",
        tempo: "126",
        attack: "0.001",
        decay: "0.18",
        sustain: "0.3",
        release: "0.15",
        oscillatorOctave: "-1",
        oscillatorSemi: "0",
        oscillatorLevel: "0.92",
        chorusMix: "0",
        distortionMix: "0.25",
        flangerMix: "0",
        phaserMix: "0.1",
        lfoRate: "8",
        lfoAmount: "75",
        lfoDestination: "pulseWidth",
        lfoWaveform: "square",
        lfoSync: true,
        droneOctave: "-2",
        eqLow: "5",
        eqMid: "-1",
        eqHigh: "-2",
        eqMidFreq: "780",
        eqQ: "1.8",
        compressor: "0.68",
        pulseWidth: "0.25",
        sequencer: [
            {"note": "C2", "active": true},
            {"note": "C2", "active": false},
            {"note": "C2", "active": true},
            {"note": "C2", "active": false},
            {"note": "C2", "active": true},
            {"note": "C2", "active": false},
            {"note": "C2", "active": true},
            {"note": "C2", "active": false},
            {"note": "D#2", "active": true}, // Changed from Eb2
            {"note": "D#2", "active": false}, // Changed from Eb2
            {"note": "D#2", "active": true}, // Changed from Eb2
            {"note": "D#2", "active": false}, // Changed from Eb2
            {"note": "G2", "active": true},
            {"note": "G2", "active": false},
            {"note": "G2", "active": true},
            {"note": "F2", "active": true}
        ]
    }),
    
    // ==== PSYCHEDELIC DRONE ====
    createPreset("Psychedelic Voyage", "fx", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "900",
        filterRes: "6.5",
        filterType: true, // High pass
        reverbMix: "0.82",
        reverbDecay: "8.5",
        delayTime: "0.667", // Triplet
        delayFeedback: "0.75",
        tempo: "85",
        attack: "1.0",
        decay: "2.5",
        sustain: "0.6",
        release: "5.0",
        oscillatorOctave: "0",
        oscillatorSemi: "7", // Perfect fifth
        oscillatorLevel: "0.75",
        chorusMix: "0.65",
        distortionMix: "0.15",
        flangerMix: "0.45",
        phaserMix: "0.55",
        lfoRate: "0.32",
        lfoAmount: "90",
        lfoDestination: "modulationIndex",
        lfoWaveform: "random",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "1",
        eqMid: "3",
        eqHigh: "2",
        eqMidFreq: "1200",
        eqQ: "2.4",
        compressor: "0.85",
        harmonicity: "4.2",
        modulationIndex: "25",
        sequencer: [
            {"note": "C3", "active": true},
            {"note": "G3", "active": false},
            {"note": "C4", "active": true},
            {"note": "D#4", "active": false}, // Changed from Eb4
            {"note": "G4", "active": true},
            {"note": "A#4", "active": false}, // Changed from Bb4
            {"note": "C5", "active": true},
            {"note": "G4", "active": false},
            {"note": "D#4", "active": true}, // Changed from Eb4
            {"note": "C4", "active": false},
            {"note": "G3", "active": true},
            {"note": "C3", "active": false},
            {"note": "D#3", "active": true}, // Changed from Eb3
            {"note": "G3", "active": false},
            {"note": "A#3", "active": true}, // Changed from Bb3
            {"note": "C4", "active": false}
        ]
    })
];

// Add these presets to the built-in presets array
// Create a new atmospheric pad preset that showcases FM Sine parameters
const atmosphericPresets = [
    createPreset("Evolving Cosmos", "pad", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "1050",
        filterRes: "2.5",
        filterType: false,
        reverbMix: "0.85",
        reverbDecay: "8.2",
        delayTime: "0.6",
        delayFeedback: "0.5",
        tempo: "65",
        attack: "2.2",
        decay: "1.8",
        sustain: "0.75",
        release: "5.5",
        oscillatorOctave: "0",
        oscillatorSemi: "5", // Perfect fourth
        oscillatorLevel: "0.78",
        chorusMix: "0.42",
        distortionMix: "0.05",
        flangerMix: "0.18",
        phaserMix: "0.12",
        lfoRate: "0.12",
        lfoAmount: "85",
        lfoDestination: "modulationIndex",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "3",
        eqMid: "-1.5",
        eqHigh: "2.5",
        eqMidFreq: "750",
        eqQ: "0.9",
        compressor: "0.3",
        harmonicity: "2.5",
        modulationIndex: "18",
        sequencer: [
            {"note": "D3", "active": true},
            {"note": "A3", "active": false},
            {"note": "D4", "active": true},
            {"note": "F4", "active": false},
            {"note": "G3", "active": true},
            {"note": "D4", "active": false},
            {"note": "G4", "active": true},
            {"note": "B4", "active": false},
            {"note": "F3", "active": true},
            {"note": "C4", "active": false},
            {"note": "F4", "active": true},
            {"note": "A4", "active": false},
            {"note": "E3", "active": true},
            {"note": "B3", "active": false},
            {"note": "E4", "active": true},
            {"note": "G4", "active": false}
        ]
    })
];

// Elite Sound Design Presets
const elitePresets = [
    // ==== ATMOSPHERIC MASTERPIECE ====
    createPreset("Celestial Harmonics", "pad", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "950",
        filterRes: "3.8",
        filterType: false,
        reverbMix: "0.89",
        reverbDecay: "12.0", // Extended decay for vast spaces
        delayTime: "0.667", // Triplet timing
        delayFeedback: "0.74",
        tempo: "64", // Slower tempo for atmospheric evolution
        attack: "3.2", // Very gradual attack
        decay: "4.5",
        sustain: "0.82",
        release: "8.0", // Extended release
        oscillatorOctave: "0",
        oscillatorSemi: "7", // Perfect fifth
        oscillatorLevel: "0.78",
        chorusMix: "0.54",
        distortionMix: "0.06",
        flangerMix: "0.38",
        phaserMix: "0.25",
        lfoRate: "0.064", // Ultra-slow for subtle evolution
        lfoAmount: "85",
        lfoDestination: "harmonicity",
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "3.2",
        eqMid: "-1.8",
        eqHigh: "2.6",
        eqMidFreq: "520", // Lower mid frequency
        eqQ: "0.62", // Wider Q for smoother response
        compressor: "0.24",
        harmonicity: "5.7", // Higher harmonicity for rich timbre
        modulationIndex: "28", // Increased modulation for complexity
        sequencer: [
            {"note": "E2", "active": true},
            {"note": "B2", "active": false},
            {"note": "E3", "active": true},
            {"note": "G3", "active": false},
            {"note": "B3", "active": true},
            {"note": "E4", "active": false},
            {"note": "G4", "active": true},
            {"note": "B4", "active": false},
            {"note": "A2", "active": true},
            {"note": "E3", "active": false},
            {"note": "A3", "active": true},
            {"note": "C4", "active": false},
            {"note": "E4", "active": true},
            {"note": "A4", "active": false},
            {"note": "C5", "active": true},
            {"note": "E5", "active": false}
        ]
    }),

    // ==== CUTTING-EDGE EXPERIMENTAL TEXTURE ====
    createPreset("Neural Network", "fx", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "2600",
        filterRes: "18", // Extreme resonance for algorithmic feel
        filterType: true, // High pass for clarity
        reverbMix: "0.72",
        reverbDecay: "7.4",
        delayTime: "0.1875", // Dotted 32nd note
        delayFeedback: "0.88", // High feedback for glitchy repetition
        tempo: "92",
        attack: "0.001", // Instant attack
        decay: "0.28",
        sustain: "0.45",
        release: "3.6",
        oscillatorOctave: "1", // Higher octave
        oscillatorSemi: "6", // Tritone
        oscillatorLevel: "0.82",
        chorusMix: "0.37",
        distortionMix: "0.24",
        flangerMix: "0.42",
        phaserMix: "0.63", // Heavy phaser
        lfoRate: "5.25", // Fast modulation
        lfoAmount: "95", // Extreme modulation
        lfoDestination: "modulationIndex",
        lfoWaveform: "random", // Random fluctuations
        lfoSync: true,
        droneOctave: "0",
        eqLow: "-3.5", // Reduced lows
        eqMid: "4.2", // Boosted mids
        eqHigh: "4.8", // Enhanced highs
        eqMidFreq: "2800", // Higher frequency focus
        eqQ: "2.8", // Sharp Q
        compressor: "0.65",
        harmonicity: "7.2", // Complex ratio
        modulationIndex: "35", // Extreme modulation depth
        sequencer: [
            {"note": "C5", "active": true},
            {"note": "C5", "active": false},
            {"note": "G5", "active": true},
            {"note": "G5", "active": false},
            {"note": "C6", "active": true},
            {"note": "C6", "active": false},
            {"note": "D#6", "active": true},
            {"note": "D#6", "active": false},
            {"note": "D5", "active": true},
            {"note": "D5", "active": false},
            {"note": "A5", "active": true},
            {"note": "A5", "active": false},
            {"note": "D6", "active": true},
            {"note": "D6", "active": false},
            {"note": "F6", "active": true},
            {"note": "F6", "active": false}
        ]
    }),

    // ==== ETHEREAL STRING ENSEMBLE ====
    createPreset("Holographic Strings", "keys", {
        voiceMode: "poly",
        waveform: "sawtooth",
        filterCutoff: "3800",
        filterRes: "1.6",
        filterType: false,
        reverbMix: "0.84",
        reverbDecay: "6.8",
        delayTime: "0.33333", // Triplet
        delayFeedback: "0.48",
        tempo: "80",
        attack: "0.08", // Bow attack
        decay: "0.75",
        sustain: "0.72",
        release: "2.4",
        oscillatorOctave: "0",
        oscillatorSemi: "12", // Octave for richness
        oscillatorLevel: "0.78",
        chorusMix: "0.52", // Heavy chorus for ensemble effect
        distortionMix: "0.06", // Light distortion for warmth
        flangerMix: "0.18",
        phaserMix: "0.12",
        lfoRate: "0.32",
        lfoAmount: "42",
        lfoDestination: "chorusMix", // Evolving chorus
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "1.8",
        eqMid: "0.8",
        eqHigh: "3.2",
        eqMidFreq: "1600",
        eqQ: "0.95",
        compressor: "0.35",
        sequencer: [
            {"note": "G3", "active": true},
            {"note": "B3", "active": true},
            {"note": "D4", "active": true},
            {"note": "G4", "active": true},
            {"note": "E3", "active": true},
            {"note": "G3", "active": true},
            {"note": "B3", "active": true},
            {"note": "E4", "active": true},
            {"note": "F3", "active": true},
            {"note": "A3", "active": true},
            {"note": "C4", "active": true},
            {"note": "F4", "active": true},
            {"note": "D3", "active": true},
            {"note": "F3", "active": true},
            {"note": "A3", "active": true},
            {"note": "D4", "active": true}
        ]
    }),

    // ==== CINEMATIC CYBERPUNK ATMOSPHERE ====
    createPreset("Neo Tokyo", "pad", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "1350",
        filterRes: "4.2",
        filterType: false,
        reverbMix: "0.78",
        reverbDecay: "9.5",
        delayTime: "0.5", // Half note
        delayFeedback: "0.68",
        tempo: "85",
        attack: "1.2",
        decay: "2.4",
        sustain: "0.78",
        release: "4.8",
        oscillatorOctave: "-1",
        oscillatorSemi: "5", // Perfect fourth
        oscillatorLevel: "0.82",
        chorusMix: "0.36",
        distortionMix: "0.14",
        flangerMix: "0.28",
        phaserMix: "0.32",
        lfoRate: "0.16",
        lfoAmount: "58",
        lfoDestination: "filterCutoff",
        lfoWaveform: "triangle",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "4.5", // Heavy bass
        eqMid: "-2.2",
        eqHigh: "2.8",
        eqMidFreq: "950",
        eqQ: "1.25",
        compressor: "0.42",
        harmonicity: "3.8",
        modulationIndex: "22",
        sequencer: [
            {"note": "C3", "active": true},
            {"note": "G3", "active": false},
            {"note": "C4", "active": true},
            {"note": "D#4", "active": false},
            {"note": "G4", "active": true},
            {"note": "C5", "active": false},
            {"note": "D3", "active": true},
            {"note": "A3", "active": false},
            {"note": "D4", "active": true},
            {"note": "F4", "active": false},
            {"note": "A4", "active": true},
            {"note": "D5", "active": false},
            {"note": "G2", "active": true},
            {"note": "D3", "active": false},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false}
        ]
    }),


    // ==== EXTREME BASS DESIGN ====
    createPreset("Singularity Bass", "bass", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "280", // Very low cutoff
        filterRes: "11.5", // Strong resonance
        filterType: false,
        reverbMix: "0.22",
        reverbDecay: "2.2",
        delayTime: "0.0", // No delay
        delayFeedback: "0.0",
        tempo: "140",
        attack: "0.001", // Instant attack
        decay: "0.28",
        sustain: "0.45",
        release: "0.35",
        oscillatorOctave: "-2", // Ultra low
        oscillatorSemi: "0",
        oscillatorLevel: "0.96", // Nearly maximum level
        chorusMix: "0.12",
        distortionMix: "0.68", // Heavy distortion
        flangerMix: "0.0",
        phaserMix: "0.0",
        lfoRate: "4.25",
        lfoAmount: "48",
        lfoDestination: "modulationIndex",
        lfoWaveform: "sine",
        lfoSync: true,
        droneOctave: "-3", // Extremely low drone
        eqLow: "6.0", // Maximum low boost
        eqMid: "-4.0", // Cut mids
        eqHigh: "-6.0", // Cut highs
        eqMidFreq: "480", // Low mid frequency
        eqQ: "2.2", // Narrow Q
        compressor: "0.85", // Heavy compression
        harmonicity: "1.5", // Subharmonic content
        modulationIndex: "12",
        sequencer: [
            {"note": "C1", "active": true},
            {"note": "C1", "active": false},
            {"note": "C1", "active": true},
            {"note": "C1", "active": false},
            {"note": "G1", "active": true},
            {"note": "G1", "active": false},
            {"note": "G1", "active": true},
            {"note": "G1", "active": false},
            {"note": "A#1", "active": true},
            {"note": "A#1", "active": false},
            {"note": "A#1", "active": true},
            {"note": "G1", "active": false},
            {"note": "F1", "active": true},
            {"note": "F1", "active": false},
            {"note": "G1", "active": true},
            {"note": "G1", "active": false}
        ]
    }),

    // ==== DELICATE PRISMATIC TEXTURE ====
    createPreset("Crystalline Dreams", "keys", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "6000", // Very bright
        filterRes: "1.2",
        filterType: false,
        reverbMix: "0.92", // Very wet
        reverbDecay: "7.5",
        delayTime: "0.75", // Dotted quarter
        delayFeedback: "0.65",
        tempo: "75",
        attack: "0.01",
        decay: "2.6",
        sustain: "0.28",
        release: "3.2",
        oscillatorOctave: "1", // High octave
        oscillatorSemi: "7", // Perfect fifth
        oscillatorLevel: "0.72",
        chorusMix: "0.45",
        distortionMix: "0.0",
        flangerMix: "0.25",
        phaserMix: "0.18",
        lfoRate: "0.28",
        lfoAmount: "38",
        lfoDestination: "eqHigh", // Shifting brightness
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "0",
        eqLow: "0.5", // Light bass
        eqMid: "1.2",
        eqHigh: "4.8", // Very bright
        eqMidFreq: "2200",
        eqQ: "0.85",
        compressor: "0.25",
        sequencer: [
            {"note": "E5", "active": true},
            {"note": "B5", "active": false},
            {"note": "G5", "active": true},
            {"note": "D6", "active": false},
            {"note": "A5", "active": true},
            {"note": "E6", "active": false},
            {"note": "B5", "active": true},
            {"note": "G6", "active": false},
            {"note": "F#5", "active": true},
            {"note": "C#6", "active": false},
            {"note": "A5", "active": true},
            {"note": "E6", "active": false},
            {"note": "B5", "active": true},
            {"note": "F#6", "active": false},
            {"note": "C#6", "active": true},
            {"note": "A6", "active": false}
        ]
    }),
    
    // ==== COMPLEX EVOLUTIONARY PAD ====
    createPreset("Unified Field Theory", "pad", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "820",
        filterRes: "4.2",
        filterType: false,
        reverbMix: "0.88",
        reverbDecay: "11.5", // Extremely long reverb
        delayTime: "0.555", // Unusual timing
        delayFeedback: "0.72",
        tempo: "72",
        attack: "2.8",
        decay: "3.6",
        sustain: "0.82",
        release: "8.5", // Extended release
        oscillatorOctave: "-1",
        oscillatorSemi: "2", // Major second
        oscillatorLevel: "0.76",
        chorusMix: "0.62",
        distortionMix: "0.08",
        flangerMix: "0.35",
        phaserMix: "0.42",
        lfoRate: "0.085", // Very slow evolution
        lfoAmount: "78",
        lfoDestination: "harmonicity", // Evolving timbre
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "2.8",
        eqMid: "-1.6",
        eqHigh: "3.2",
        eqMidFreq: "580",
        eqQ: "0.75",
        compressor: "0.38",
        harmonicity: "6.5", // Complex harmonic structure
        modulationIndex: "32", // Deep modulation
        sequencer: [
            {"note": "F2", "active": true},
            {"note": "C3", "active": false},
            {"note": "F3", "active": true},
            {"note": "A3", "active": false},
            {"note": "C4", "active": true},
            {"note": "F4", "active": false},
            {"note": "G2", "active": true},
            {"note": "D3", "active": false},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "D4", "active": true},
            {"note": "G4", "active": false},
            {"note": "A2", "active": true},
            {"note": "E3", "active": false},
            {"note": "A3", "active": true},
            {"note": "C#4", "active": false}
        ]
    })
];

// Premium Lead, Pluck and Keys Presets
const advancedPresets = [

    // ==== CINEMATIC KEYS ====
    createPreset("Interstellar Keys", "keys", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "4200",
        filterRes: "1.4",
        filterType: false,
        reverbMix: "0.78",
        reverbDecay: "5.2",
        delayTime: "0.3333", // Triplet quarter
        delayFeedback: "0.42",
        tempo: "90",
        attack: "0.01", // Fast but not instant
        decay: "1.8",
        sustain: "0.35",
        release: "2.5",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.85",
        chorusMix: "0.28",
        distortionMix: "0.04",
        flangerMix: "0.15",
        phaserMix: "0.0",
        lfoRate: "0.275",
        lfoAmount: "38",
        lfoDestination: "eqMidFreq", // Shifting tonal center
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "2.0",
        eqMid: "0.8",
        eqHigh: "3.5",
        eqMidFreq: "1200",
        eqQ: "0.95",
        compressor: "0.32",
        harmonicity: "4.2", // Complex harmonics
        modulationIndex: "5.5", // Moderate modulation
        sequencer: [
            {"note": "D4", "active": true},
            {"note": "F#4", "active": false},
            {"note": "A4", "active": true},
            {"note": "D5", "active": false},
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "D4", "active": true},
            {"note": "G4", "active": false},
            {"note": "A3", "active": true},
            {"note": "C#4", "active": false},
            {"note": "E4", "active": true},
            {"note": "A4", "active": false},
            {"note": "E3", "active": true},
            {"note": "G#3", "active": false},
            {"note": "B3", "active": true},
            {"note": "E4", "active": false}
        ]
    }),

    // ==== HYPERREALISTIC PIANO ====
    createPreset("Quantum Piano", "keys", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "5000", // Very bright
        filterRes: "1.2",
        filterType: false,
        reverbMix: "0.62",
        reverbDecay: "2.8",
        delayTime: "0.0", // No delay
        delayFeedback: "0.0",
        tempo: "100",
        attack: "0.001", // Instant attack
        decay: "3.2", // Long decay
        sustain: "0.15", // Low sustain
        release: "0.8",
        oscillatorOctave: "0",
        oscillatorSemi: "-12", // Octave down for richness
        oscillatorLevel: "0.45", // Subtle blend
        chorusMix: "0.08", // Light chorus
        distortionMix: "0.025",
        flangerMix: "0.0",
        phaserMix: "0.0",
        lfoRate: "8.5", // Fast modulation
        lfoAmount: "15", // Subtle amount
        lfoDestination: "oscillatorLevel", // Dynamic timbre
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-2",
        eqLow: "2.5",
        eqMid: "0.0",
        eqHigh: "3.8",
        eqMidFreq: "1000",
        eqQ: "1.1",
        compressor: "0.35",
        sequencer: [
            {"note": "C4", "active": true},
            {"note": "E4", "active": true},
            {"note": "G4", "active": true},
            {"note": "C5", "active": true},
            {"note": "E5", "active": true},
            {"note": "G4", "active": true},
            {"note": "C5", "active": true},
            {"note": "E5", "active": true},
            {"note": "G3", "active": true},
            {"note": "B3", "active": true},
            {"note": "D4", "active": true},
            {"note": "G4", "active": true},
            {"note": "B4", "active": true},
            {"note": "D4", "active": true},
            {"note": "G4", "active": true},
            {"note": "B4", "active": true}
        ]
    }),

    // ==== HYBRID ELECTRIC PIANO ====
    createPreset("Neutron Rhodes", "keys", {
        voiceMode: "poly",
        waveform: "triangle",
        filterCutoff: "3200",
        filterRes: "2.5",
        filterType: false,
        reverbMix: "0.42",
        reverbDecay: "2.4",
        delayTime: "0.25", // 8th note
        delayFeedback: "0.28",
        tempo: "95",
        attack: "0.002", // Fast attack
        decay: "0.85",
        sustain: "0.45",
        release: "1.2",
        oscillatorOctave: "0",
        oscillatorSemi: "7", // Perfect fifth
        oscillatorLevel: "0.45", // Subtle
        chorusMix: "0.32",
        distortionMix: "0.14", // Light distortion
        flangerMix: "0.0",
        phaserMix: "0.28", // Rhodes-like phaser
        lfoRate: "0.85",
        lfoAmount: "35",
        lfoDestination: "phaserMix", // Evolving phase
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "-1",
        eqLow: "2.5",
        eqMid: "0.5",
        eqHigh: "2.0",
        eqMidFreq: "850", // Lower mid focus
        eqQ: "1.25",
        compressor: "0.42",
        sequencer: [
            {"note": "D3", "active": true},
            {"note": "A3", "active": true},
            {"note": "F4", "active": true},
            {"note": "A4", "active": true},
            {"note": "D4", "active": true},
            {"note": "A3", "active": true},
            {"note": "F3", "active": true},
            {"note": "A3", "active": true},
            {"note": "G3", "active": true},
            {"note": "D4", "active": true},
            {"note": "B4", "active": true},
            {"note": "D5", "active": true},
            {"note": "G4", "active": true},
            {"note": "D4", "active": true},
            {"note": "B3", "active": true},
            {"note": "D4", "active": true}
        ]
    }),

    // ==== EVOLVING LEAD ====
    createPreset("Gravitational Wave", "pad", {
        voiceMode: "poly",
        waveform: "fmsine",
        filterCutoff: "2200",
        filterRes: "6.8",
        filterType: false,
        reverbMix: "0.52",
        reverbDecay: "4.5",
        delayTime: "0.333333", // Triplet
        delayFeedback: "0.58",
        tempo: "95",
        attack: "0.35", // Slow attack
        decay: "0.5",
        sustain: "0.85",
        release: "1.8",
        oscillatorOctave: "0",
        oscillatorSemi: "0",
        oscillatorLevel: "0.88",
        chorusMix: "0.42",
        distortionMix: "0.15",
        flangerMix: "0.28",
        phaserMix: "0.35",
        lfoRate: "0.12", // Very slow
        lfoAmount: "85", // High amount
        lfoDestination: "harmonicity", // Evolving harmonics
        lfoWaveform: "sine",
        lfoSync: false,
        droneOctave: "0",
        eqLow: "1.5",
        eqMid: "2.0",
        eqHigh: "3.2",
        eqMidFreq: "1650",
        eqQ: "1.2",
        compressor: "0.45",
        harmonicity: "3.85", // Complex ratio
        modulationIndex: "18.5", // Deep modulation
        sequencer: [
            {"note": "G3", "active": true},
            {"note": "B3", "active": false},
            {"note": "D4", "active": true},
            {"note": "F#4", "active": false},
            {"note": "A4", "active": true},
            {"note": "D5", "active": false},
            {"note": "F#5", "active": true},
            {"note": "A5", "active": false},
            {"note": "F3", "active": true},
            {"note": "A3", "active": false},
            {"note": "C4", "active": true},
            {"note": "E4", "active": false},
            {"note": "G4", "active": true},
            {"note": "C5", "active": false},
            {"note": "E5", "active": true},
            {"note": "G5", "active": false}
        ]
    })
];



builtInPresets.push(...professionalPresets);
builtInPresets.push(...atmosphericPresets);
builtInPresets.push(...elitePresets);
builtInPresets.push(...advancedPresets);

// Create an optimized preset loading system with caching
const presetCache = new Map();

/**
 * Gets a preset by name with caching for better performance
 * @param {string} name - The name of the preset to retrieve
 * @returns {object|null} The preset object or null if not found
 */
function getPresetByName(name) {
    // Return from cache if available
    if (presetCache.has(name)) {
        return presetCache.get(name);
    }
    
    // Find the preset in built-in presets
    const preset = builtInPresets.find(p => p.name === name);
    
    // Cache the result (even if null) to avoid repeated searches
    presetCache.set(name, preset || null);
    
    return preset || null;
}

/**
 * Gets presets by category with performance optimization
 * @param {string} category - The category to filter by
 * @returns {object[]} Array of presets in the specified category
 */
function getPresetsByCategory(category) {
    // Create a cache key for this category
    const cacheKey = `category:${category}`;
    
    // Return from cache if available
    if (presetCache.has(cacheKey)) {
        return presetCache.get(cacheKey);
    }
    
    // Filter presets by category
    const presets = builtInPresets.filter(p => p.category === category);
    
    // Cache the results
    presetCache.set(cacheKey, presets);
    
    return presets;
}

/**
 * Clears the preset cache when needed
 * (e.g., after adding custom presets)
 */
function clearPresetCache() {
    presetCache.clear();
}

// Export the optimized preset system for use in other modules
export { 
    builtInPresets, 
    createPreset,
    getPresetByName,
    getPresetsByCategory,
    clearPresetCache
};