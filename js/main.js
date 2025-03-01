import {
    setupKnob,
    updateVUMeter
} from './utils.js';


// Initialize audio processing components first
let filter = new Tone.Filter(2000, "lowpass");
let reverb = new Tone.Reverb(2);
let delay = new Tone.FeedbackDelay("8n", 0.5);

// Initialize new effects
let chorus = new Tone.Chorus(4, 2.5, 0.5).start();
let distortion = new Tone.Distortion(0.8);
let flanger = new Tone.FeedbackDelay("8n", 0.5);
let phaser = new Tone.Phaser({
    frequency: 0.5,
    octaves: 3,
    baseFrequency: 1000
});

// Initialize the EQ3 (three-band equalizer)
let eq = new Tone.EQ3({
    low: 0,
    mid: 0,
    high: 0,
    lowFrequency: 400,
    highFrequency: 2500
});

// Initialize compressor with default settings
let masterCompressor = new Tone.Compressor({
    threshold: 0, // dB, will be adjusted by knob
    ratio: 1, // will be adjusted by knob
    attack: 0.003, // seconds
    release: 0.25, // seconds
    knee: 30 // dB
});

// Initialize stereo widener
let stereoWidener = new Tone.StereoWidener({
    width: 0.5, // Default to normal stereo
    wet: 1 // Fully active
});

let widthCompensation = new Tone.Gain(1); // Default gain of 1 (no change)

let masterVolume = new Tone.Gain(0.8);
let masterPanner = new Tone.Panner(0);

masterPanner.connect(masterVolume);
masterVolume.toDestination();

let lfoActive = false;
let lfoDestination = 'off';
let lfoBaseValues = {};
lfoBaseValues.pan = 0; // Default to center
lfoBaseValues.masterVolume = parseFloat(document.getElementById('masterVolume').value) // Current master volume

let lfoAnimationFrame = null;

// Initialize wet values to 0 (effects off)
chorus.wet.value = 0;
distortion.wet.value = 0;
flanger.wet.value = 0;
phaser.wet.value = 0;

const waveform = new Tone.Waveform(1024);
const fft = new Tone.FFT(1024);

// Connect effects chain
filter.connect(chorus);
chorus.connect(distortion);
distortion.connect(flanger);
flanger.connect(phaser);
phaser.connect(reverb);
reverb.connect(delay);
delay.connect(eq); // Connect delay to EQ
eq.connect(masterCompressor);
masterCompressor.connect(stereoWidener);
stereoWidener.connect(widthCompensation);
widthCompensation.connect(masterPanner);


masterVolume.connect(waveform); // Connect compressor to waveform analyzer
stereoWidener.connect(fft);

// Initialize synth variables
let synth;
let currentMode = "poly";

const activeNotes = new Set();
const activeComputerKeys = new Set();

// Keep track of sequencer active keys
const sequencerActiveKeys = new Map();

// Create envelope settings to reuse
const synthSettings = {
    envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 0.5
    }
};

// Initialize LFO setup early
const lfo = new Tone.LFO({
    frequency: 1,
    amplitude: 0.5,
    type: "sine"
}).start();

// Initialize drone state
let isDroneActive = false;
let droneSynth = null;

// Initialize drum machine variables
let drumSequencerRunning = false;
let currentDrumStep = 0;
const drumSounds = {};

// Helper function to consistently handle mono note changes
function handleMonoNoteChange(newNote) {
    if (currentMode !== "mono") return;

    // Release any currently playing note
    if (activeNotes.size > 0) {
        const oldNote = Array.from(activeNotes)[0];

        // Update UI for the old note
        const oldKeyElement = document.querySelector(`.key[data-note="${oldNote}"]`) ||
            document.querySelector(`.black-key[data-note="${oldNote}"]`);
        if (oldKeyElement) {
            oldKeyElement.classList.remove('active');
        }

        // Important: Release the previous note sound
        synth.triggerRelease();
    }

    // Clear all active notes in mono mode
    activeNotes.clear();

    // Add and play the new note
    if (newNote) {
        activeNotes.add(newNote);
        synth.triggerAttack(newNote);
        updateVUMeter(0.8);
    }
}

// Function to update the detune value based on octave and semitone settings
function updateDetune() {
    const octave = parseInt(document.getElementById('oscillatorOctave').value);
    const semi = parseInt(document.getElementById('oscillatorSemi').value);
    const detune = octave * 1200 + semi * 100; // Convert octaves and semitones to cents

    if (currentMode === "poly") {
        synth.set({
            detune: detune
        });
    } else {
        synth.detune.value = detune;
    }
}

// Function to create the appropriate synth type
function createSynth(mode) {
    // Dispose of old synth if it exists
    if (synth) {
        // Release all notes to prevent hanging notes when switching modes
        if (currentMode === "poly") {
            synth.releaseAll();
        } else {
            // For mono synth, trigger release without arguments to release any active note
            synth.triggerRelease();
        }
        synth.disconnect();
        synth.dispose();
    }

    // Clear all active notes when switching synth types
    activeNotes.clear();
    activeComputerKeys.clear();

    // Remove active class from all keys
    document.querySelectorAll('.key.active, .black-key.active').forEach(key => {
        key.classList.remove('active');
    });

    // Create new synth based on mode
    if (mode === "poly") {
        synth = new Tone.PolySynth(Tone.Synth, synthSettings);
    } else {
        synth = new Tone.Synth(synthSettings);
    }

    // Connect to effects chain
    synth.connect(filter);

    // Apply current waveform
    const waveformType = document.getElementById('waveform').value;
    if (mode === "poly") {
        synth.set({
            oscillator: {
                type: waveformType
            }
        });
    } else {
        synth.oscillator.type = waveformType;
    }

    // Apply detune (octave and semitone)
    updateDetune();

    // Apply level
    const level = parseFloat(document.getElementById('oscillatorLevel').value);
    if (mode === "poly") {
        synth.set({
            volume: Tone.gainToDb(level)
        });
    } else {
        synth.volume.value = Tone.gainToDb(level);
    }

    return synth;
}

// Create initial synth (polyphonic by default)
synth = createSynth("poly");
// Setup oscilloscope
const canvas = document.getElementById('oscilloscope');
const ctx = canvas.getContext('2d');

// Define color schemes for oscilloscope
const colorSchemes = [{
        bg: 'rgba(18, 18, 18, 0.3)',
        wave: '#00e5ff',
        name: 'Cyan'
    },
    {
        bg: 'rgba(20, 20, 30, 0.3)',
        wave: '#9d46ff',
        name: 'Purple'
    },
    {
        bg: 'rgba(10, 30, 15, 0.3)',
        wave: '#00c853',
        name: 'Green'
    },
    {
        bg: 'rgba(30, 15, 10, 0.3)',
        wave: '#ff6d00',
        name: 'Orange'
    },
    {
        bg: 'rgba(30, 10, 15, 0.3)',
        wave: '#ff1744',
        name: 'Red'
    },
    {
        bg: 'rgba(25, 25, 10, 0.3)',
        wave: '#ffab00',
        name: 'Amber'
    },
    {
        bg: 'rgba(10, 25, 25, 0.3)',
        wave: '#18ffff',
        name: 'Teal'
    },
    {
        bg: 'rgba(30, 10, 30, 0.3)',
        wave: '#d500f9',
        name: 'Pink'
    }
];

let currentColorSchemeIndex = 0;

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function drawOscilloscope() {
    requestAnimationFrame(drawOscilloscope);

    const width = canvas.width;
    const height = canvas.height;
    const values = waveform.getValue();
    const currentScheme = colorSchemes[currentColorSchemeIndex];

    ctx.fillStyle = currentScheme.bg;
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.strokeStyle = currentScheme.wave;
    ctx.lineWidth = 2;

    for (let i = 0; i < values.length; i++) {
        const x = (i / values.length) * width;
        const y = ((values[i] + 1) / 2) * height;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();
}

// Add click event to change color scheme
document.querySelector('.oscilloscope').addEventListener('click', () => {
    currentColorSchemeIndex = (currentColorSchemeIndex + 1) % colorSchemes.length;

    // Create a notification element (this wasn't properly defined in the original code)
    const notification = document.createElement('div');
    notification.style.position = 'absolute';
    notification.style.top = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.background = 'rgba(0, 0, 0, 0.7)';
    notification.style.color = 'white';
    notification.style.padding = '5px 10px';
    notification.style.borderRadius = '4px';
    notification.style.fontSize = '12px';
    notification.textContent = `Color: ${colorSchemes[currentColorSchemeIndex].name}`;

    document.querySelector('.oscilloscope').appendChild(notification);

    // Remove notification after a short delay
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 1500);
});
drawOscilloscope();

// Helper function to highlight a key when a note plays in the sequencer
function highlightKeyFromSequencer(note, duration = 0.25) {
    // Only proceed if it's a valid note
    if (!note) return;

    // Try multiple selectors to find the key
    const keyElement = document.querySelector(`.key[data-note="${note}"]`) ||
        document.querySelector(`.black-key[data-note="${note}"]`);

    if (!keyElement) return;

    // Add the active class to highlight the key
    keyElement.classList.add('active');

    // Store the timeout ID so we can clear it if needed
    const timeoutId = setTimeout(() => {
        keyElement.classList.remove('active');
        sequencerActiveKeys.delete(note);
    }, duration * 1000);

    // Store the note and its timeout ID
    sequencerActiveKeys.set(note, timeoutId);
}

// Clear any active key highlights
function clearSequencerKeyHighlights() {
    sequencerActiveKeys.forEach((timeoutId, note) => {
        clearTimeout(timeoutId);
        const keyElement = document.querySelector(`.key[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.remove('active');
        }
    });
    sequencerActiveKeys.clear();
}

// Generate notes from C3 to B4
const generateNotes = () => {
    const notes = [];
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (let octave = 1; octave <= 6; octave++) {
        noteNames.forEach(note => {
            notes.push(`${note}${octave}`);
        });
    }
    return notes;
};

// Create sequencer with proper note names
const createSequencer = () => {
    const sequencerElement = document.getElementById('sequencer');
    const notes = generateNotes();

    // Clear existing steps
    sequencerElement.innerHTML = '';

    for (let i = 0; i < 16; i++) {
        const step = document.createElement('div');
        step.className = 'step';
        step.setAttribute('data-step', i + 1);

        const led = document.createElement('div');
        led.className = 'step-led';
        step.appendChild(led);

        const select = document.createElement('select');
        // Add a data attribute to help with identifying
        select.setAttribute('data-step-select', i);

        notes.forEach(note => {
            const option = document.createElement('option');
            option.value = note;
            option.textContent = note;
            select.appendChild(option);
        });

        // Set default notes in an interesting pattern
        const noteIndex = i % notes.length;
        select.value = notes[noteIndex];

        step.appendChild(select);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'step-toggle active';
        toggle.textContent = 'On';
        toggle.onclick = () => {
            toggle.classList.toggle('active');
            toggle.textContent = toggle.classList.contains('active') ? 'On' : 'Off';
        };
        step.appendChild(toggle);

        sequencerElement.appendChild(step);
    }
};

// Create keyboard with polyphonic support
const createKeyboard = () => {
    const keyboardElement = document.getElementById('keyboard');
    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    // Make octave range responsive based on screen size
    const isMobile = window.innerWidth <= 768;
    const startOctave = 3;
    const endOctave = isMobile ? 4 : 7;

    // Clear keyboard
    keyboardElement.innerHTML = '';

    // Create white keys for each octave
    for (let octave = startOctave; octave <= endOctave; octave++) {
        // Only create C for the last octave
        const octaveNotes = octave === endOctave ? ['C'] : notes;

        for (let i = 0; i < octaveNotes.length; i++) {
            const key = document.createElement('div');
            key.className = 'key';
            key.textContent = isMobile ? '' : `${octaveNotes[i]}${octave}`;
            key.setAttribute('data-note', `${octaveNotes[i]}${octave}`);
            keyboardElement.appendChild(key);

            // Add click event with support for both modes
            key.addEventListener('mousedown', () => {
                const note = `${octaveNotes[i]}${octave}`;
                key.classList.add('active');

                if (currentMode === "poly") {
                    // For polyphonic mode, only trigger if not already playing
                    if (!activeNotes.has(note)) {
                        activeNotes.add(note);
                        synth.triggerAttack(note);
                        updateVUMeter(0.8);
                    }
                } else {
                    // Use our helper function for mono mode
                    handleMonoNoteChange(note);
                }
            });

            key.addEventListener('mouseup', () => {
                const note = `${octaveNotes[i]}${octave}`;
                key.classList.remove('active');

                if (currentMode === "poly") {
                    if (activeNotes.has(note)) {
                        activeNotes.delete(note);
                        synth.triggerRelease(note);
                    }
                } else {
                    // For mono mode, clean up active note and release
                    if (activeNotes.has(note)) {
                        activeNotes.delete(note);
                        synth.triggerRelease(); // No parameter needed for mono synth
                    }
                }
            });

            key.addEventListener('mouseleave', () => {
                const note = `${octaveNotes[i]}${octave}`;
                if (key.classList.contains('active')) {
                    key.classList.remove('active');

                    if (currentMode === "poly") {
                        if (activeNotes.has(note)) {
                            activeNotes.delete(note);
                            synth.triggerRelease(note);
                        }
                    } else {
                        // For mono mode
                        if (activeNotes.has(note)) {
                            activeNotes.delete(note);
                            synth.triggerRelease(); // No parameter needed for mono synth
                        }
                    }
                }
            });
        }

        // Create black keys for this octave
        // Skip black keys after B
        if (octave < endOctave || (octave === endOctave && octaveNotes.length > 1)) {
            const blackKeyPositions = [{
                    after: 'C',
                    note: 'C#'
                },
                {
                    after: 'D',
                    note: 'D#'
                },
                {
                    after: 'F',
                    note: 'F#'
                },
                {
                    after: 'G',
                    note: 'G#'
                },
                {
                    after: 'A',
                    note: 'A#'
                }
            ];

            for (let i = 0; i < octaveNotes.length; i++) {
                const whiteNote = octaveNotes[i];
                const blackKeyInfo = blackKeyPositions.find(pos => pos.after === whiteNote);

                if (blackKeyInfo) {
                    const blackKey = document.createElement('div');
                    blackKey.className = 'black-key';
                    blackKey.textContent = '';
                    blackKey.setAttribute('data-note', `${blackKeyInfo.note}${octave}`);

                    // Position the black key
                    const whiteKeyWidth = document.querySelector('.key').offsetWidth;
                    const whiteKeyIndex = Array.from(keyboardElement.querySelectorAll('.key')).findIndex(
                        key => key.getAttribute('data-note') === `${whiteNote}${octave}`
                    );

                    if (whiteKeyIndex !== -1) {
                        const whiteKeyRect = keyboardElement.querySelectorAll('.key')[whiteKeyIndex].getBoundingClientRect();
                        const keyboardRect = keyboardElement.getBoundingClientRect();

                        blackKey.style.left = `${whiteKeyRect.right - keyboardRect.left - whiteKeyWidth/4}px`;
                        keyboardElement.appendChild(blackKey);

                        // Add click event with polyphony support
                        blackKey.addEventListener('mousedown', () => {
                            const note = `${blackKeyInfo.note}${octave}`;
                            blackKey.classList.add('active');

                            if (currentMode === "poly") {
                                if (!activeNotes.has(note)) {
                                    activeNotes.add(note);
                                    synth.triggerAttack(note);
                                    updateVUMeter(0.8);
                                }
                            } else {
                                // Use our helper function for mono mode
                                handleMonoNoteChange(note);
                            }
                        });

                        blackKey.addEventListener('mouseup', () => {
                            const note = `${blackKeyInfo.note}${octave}`;
                            blackKey.classList.remove('active');

                            if (currentMode === "poly") {
                                if (activeNotes.has(note)) {
                                    activeNotes.delete(note);
                                    synth.triggerRelease(note);
                                }
                            } else {
                                // For mono mode
                                if (activeNotes.has(note)) {
                                    activeNotes.delete(note);
                                    synth.triggerRelease(); // No parameter needed for mono synth
                                }
                            }
                        });

                        blackKey.addEventListener('mouseleave', () => {
                            const note = `${blackKeyInfo.note}${octave}`;
                            if (blackKey.classList.contains('active')) {
                                blackKey.classList.remove('active');

                                if (currentMode === "poly") {
                                    if (activeNotes.has(note)) {
                                        activeNotes.delete(note);
                                        synth.triggerRelease(note);
                                    }
                                } else {
                                    // For mono mode
                                    if (activeNotes.has(note)) {
                                        activeNotes.delete(note);
                                        synth.triggerRelease(); // No parameter needed for mono synth
                                    }
                                }
                            }
                        });
                    }
                }
            }
        }
    }
};

// Update sequencer visuals
const updateSequencer = (currentStep) => {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, i) => {
        step.classList.toggle('active', i === currentStep);
    });
};

// Setup all knobs and store their update functions
const knobUpdaters = {};
const knobs = [
    ['filterCutoffKnob', 'filterCutoff'],
    ['filterResKnob', 'filterRes'],
    ['attackKnob', 'attack'],
    ['decayKnob', 'decay'],
    ['sustainKnob', 'sustain'],
    ['releaseKnob', 'release'],
    ['reverbMixKnob', 'reverbMix'],
    ['reverbDecayKnob', 'reverbDecay'],
    ['delayTimeKnob', 'delayTime'],
    ['delayFeedbackKnob', 'delayFeedback'],
    ['tempoKnob', 'tempo'],
    ['oscillatorOctaveKnob', 'oscillatorOctave'],
    ['oscillatorSemiKnob', 'oscillatorSemi'],
    ['oscillatorLevelKnob', 'oscillatorLevel'],
    ['chorusMixKnob', 'chorusMix'],
    ['distortionMixKnob', 'distortionMix'],
    ['flangerMixKnob', 'flangerMix'],
    ['phaserMixKnob', 'phaserMix'],
    ['lfoRateKnob', 'lfoRate'],
    ['lfoAmountKnob', 'lfoAmount'],
    ['droneOctaveKnob', 'droneOctave'],
    ['droneVolumeKnob', 'droneVolume'],
    // Add the EQ knobs to the list
    ['eqLowKnob', 'eqLow'],
    ['eqMidKnob', 'eqMid'],
    ['eqHighKnob', 'eqHigh'],
    ['eqMidFreqKnob', 'eqMidFreq'],
    ['eqQKnob', 'eqQ'],
    // Add drum volume knobs
    ['kickVolumeKnob', 'kickVolume'],
    ['snareVolumeKnob', 'snareVolume'],
    ['hihatVolumeKnob', 'hihatVolume'],
    ['clapVolumeKnob', 'clapVolume'],
    ['compressorKnob', 'compressor'],
    ['stereoWidthKnob', 'stereoWidth'],
    ['masterVolumeKnob', 'masterVolume'],
    ['masterPanKnob', 'masterPan']
];

// Add detune and voices knobs to the knobs array
knobs.push(['detuneKnob', 'detune']);
knobs.push(['voicesKnob', 'voices']);

// Add to knobUpdaters for proper rotation handling
knobUpdaters.detune = (value) => {
    const min = -100;
    const max = 100;
    const normalizedValue = (value - min) / (max - min);
    const rotation = normalizedValue * 270 - 135;
    gsap.to(document.getElementById('detuneKnob'), {
        rotation: rotation,
        duration: 0.1
    });
};

knobUpdaters.voices = (value) => {
    const min = 1;
    const max = 8;
    const normalizedValue = (value - min) / (max - min);
    const rotation = normalizedValue * 270 - 135;
    gsap.to(document.getElementById('voicesKnob'), {
        rotation: rotation,
        duration: 0.1
    });
};

knobUpdaters.masterVolume = setupKnob('masterVolumeKnob', 'masterVolume');
knobUpdaters.masterPan = setupKnob('masterPanKnob', 'masterPan');

// Apply knob setup to all knobs at once
knobs.forEach(([knobId, inputId]) => {
    knobUpdaters[inputId] = setupKnob(knobId, inputId);
});

// ADSR Envelope Visualizer
function updateADSRVisualizer() {
    const svg = document.getElementById('adsrVisualizerSvg');
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    const attack = parseFloat(document.getElementById('attack').value);
    const decay = parseFloat(document.getElementById('decay').value);
    const sustain = parseFloat(document.getElementById('sustain').value);
    const release = parseFloat(document.getElementById('release').value);

    // Calculate widths for each segment
    const totalTime = attack + decay + 1 + release; // Add 1 for sustain display
    const attackWidth = (attack / totalTime) * width;
    const decayWidth = (decay / totalTime) * width;
    const sustainWidth = (1 / totalTime) * width;
    const releaseWidth = (release / totalTime) * width;

    // Calculate y positions (inverted, as 0,0 is top-left)
    const startY = height - 10; // Start near bottom
    const peakY = 10; // Attack peak near top
    const sustainY = height - 10 - (sustain * (height - 20)); // Sustain level

    // Create path
    const path = [
        `M0,${startY}`, // Start
        `L${attackWidth},${peakY}`, // Attack
        `L${attackWidth + decayWidth},${sustainY}`, // Decay
        `L${attackWidth + decayWidth + sustainWidth},${sustainY}`, // Sustain
        `L${attackWidth + decayWidth + sustainWidth + releaseWidth},${startY}` // Release
    ].join(' ');

    document.getElementById('adsrPath').setAttribute('d', path);
}

// Filter Response Curve
function updateFilterResponse() {
    const svg = document.getElementById('filterResponseSvg');
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    const filterType = document.getElementById('filterTypeToggle').checked ? "highpass" : "lowpass";
    const cutoff = parseFloat(document.getElementById('filterCutoff').value);
    const resonance = parseFloat(document.getElementById('filterRes').value);

    // Calculate log scale for x-axis (frequency)
    const frequencyToX = (freq) => {
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);
        const logPos = (Math.log10(freq) - minLog) / (maxLog - minLog);
        return logPos * width;
    };

    // Generate points for the filter curve
    const points = [];
    for (let freq = 20; freq <= 20000; freq = freq * 1.1) {
        const x = frequencyToX(freq);

        // Calculate filter response at this frequency
        let response = 0;
        if (filterType === "lowpass") {
            if (freq < cutoff) {
                response = 1;
            } else {
                // Simple rolloff model with resonance peak
                const ratio = cutoff / freq;
                response = ratio;
                if (Math.abs(freq - cutoff) < cutoff * 0.2) {
                    response += (resonance / 10) * (1 - Math.abs((freq - cutoff) / (cutoff * 0.2)));
                }
            }
        } else { // highpass
            if (freq > cutoff) {
                response = 1;
            } else {
                // Simple rolloff model with resonance peak
                const ratio = freq / cutoff;
                response = ratio;
                if (Math.abs(freq - cutoff) < cutoff * 0.2) {
                    response += (resonance / 10) * (1 - Math.abs((freq - cutoff) / (cutoff * 0.2)));
                }
            }
        }

        // Clamp response between 0 and 1.5 (for resonance peaks)
        response = Math.max(0, Math.min(1.5, response));

        // Convert to y coordinate (inverted, as 0,0 is top-left)
        const y = height - (response * (height * 0.8));
        points.push(`${x},${y}`);
    }

    // Create the filter curve path
    const path = `M0,${height} L${points.join(' L')} L${width},${height}`;
    document.getElementById('filterCurve').setAttribute('d', `M${points.join(' L')}`);

    // Create the filled area for the filter curve
    document.getElementById('filterArea').setAttribute('d', `M0,${height} L${points.join(' L')} L${width},${height} Z`);
}

// Improved EQ Response Curve Visualization
function updateEqResponse() {
    const svg = document.getElementById('eqResponseSvg');
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    // Get EQ parameters
    const lowGain = parseFloat(document.getElementById('eqLow').value);
    const midGain = parseFloat(document.getElementById('eqMid').value);
    const highGain = parseFloat(document.getElementById('eqHigh').value);
    const midFreq = parseFloat(document.getElementById('eqMidFreq').value);
    const q = parseFloat(document.getElementById('eqQ').value);

    // EQ crossover frequencies
    const lowMidCrossover = 400; // Fixed in Tone.EQ3
    const midHighCrossover = 2500; // Fixed in Tone.EQ3

    // Create a logarithmic scale for frequencies (20Hz - 20kHz)
    const freqToX = (freq) => {
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);
        const normalized = (Math.log10(freq) - minLog) / (maxLog - minLog);
        return normalized * width;
    };

    // Convert gain in dB to y-coordinate (0dB at center)
    const gainToY = (gain) => {
        // Scale to fit in the view (±12dB maps to 80% of height)
        const maxDb = 12;
        const scaledGain = Math.max(-maxDb, Math.min(maxDb, gain));
        // Map -12...12 to 80%...20% of height
        return height * (0.5 - (scaledGain / (maxDb * 2.5)));
    };

    // Generate the EQ curve points
    const points = [];

    // Generate points across the frequency spectrum
    for (let freq = 20; freq <= 20000; freq = freq * 1.05) { // Logarithmic steps
        const x = freqToX(freq);

        // Calculate the gain at this frequency
        let gain = 0;

        // Model the 3-band EQ with crossovers and Q factor
        if (freq < lowMidCrossover) {
            // Low band
            gain = lowGain;
            // Smooth transition to mid band
            if (freq > lowMidCrossover / 2) {
                const t = (freq - lowMidCrossover / 2) / (lowMidCrossover / 2);
                gain = lowGain * (1 - t) + midGain * t;
            }
        } else if (freq < midHighCrossover) {
            // Mid band with focus around midFreq
            gain = midGain;

            // Apply Q factor around the mid frequency center
            const octaveWidth = 1 / q;
            const freqRatio = freq / midFreq;
            const octaveDistance = Math.abs(Math.log2(freqRatio));

            // Smooth transition to low or high bands at crossover points
            if (freq < lowMidCrossover * 1.5) {
                const t = (freq - lowMidCrossover) / (lowMidCrossover * 0.5);
                gain = lowGain * (1 - t) + midGain * t;
            } else if (freq > midHighCrossover / 1.5) {
                const t = (freq - midHighCrossover / 1.5) / (midHighCrossover / 3);
                gain = midGain * (1 - t) + highGain * t;
            }

            // Apply the Q factor (which focuses the mid band around midFreq)
            if (octaveDistance < octaveWidth) {
                // If we're within the Q-affected region near midFreq
                const qIntensity = 1 - (octaveDistance / octaveWidth);
                // Emphasize the effect more for higher Q values
                const qEffect = midGain * qIntensity * (q / 3);
                gain = midGain + qEffect;
            }
        } else {
            // High band
            gain = highGain;
            // Smooth transition from mid band
            if (freq < midHighCrossover * 1.5) {
                const t = (freq - midHighCrossover) / (midHighCrossover * 0.5);
                gain = midGain * (1 - t) + highGain * t;
            }
        }

        const y = gainToY(gain);
        points.push(`${x},${y}`);
    }

    // Create the EQ curve path
    const pathStr = `M${points.join(' L')}`;
    document.getElementById('eqCurve').setAttribute('d', pathStr);

    // Create the filled area (from curve to the center line)
    const centerY = gainToY(0); // 0dB line
    document.getElementById('eqArea').setAttribute('d', `${pathStr} L${width},${centerY} L0,${centerY} Z`);

    // Update mid frequency marker position
    const midX = freqToX(midFreq);
    document.getElementById('eqMidMarker').setAttribute('x1', midX);
    document.getElementById('eqMidMarker').setAttribute('x2', midX);

    // Generate frequency grid and labels
    const freqGrid = document.getElementById('eqGrid');
    const labelsGroup = document.getElementById('eqLabels');

    // Clear existing grid lines and labels
    freqGrid.innerHTML = '';
    labelsGroup.innerHTML = '';

    // Major frequency points to show on the grid
    const freqPoints = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

    // Add frequency grid lines and labels
    freqPoints.forEach(freq => {
        const x = freqToX(freq);

        // Add vertical grid line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'eq-grid');
        line.setAttribute('x1', x);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', x);
        line.setAttribute('y2', height);
        freqGrid.appendChild(line);

        // Add frequency label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'eq-label');
        label.setAttribute('x', x);
        label.setAttribute('y', height - 5);

        // Format frequency for display
        let freqText = freq.toString();
        if (freq >= 1000) {
            freqText = (freq / 1000) + 'k';
        }

        label.textContent = freqText;
        labelsGroup.appendChild(label);
    });

    // Add gain labels on y-axis
    const gainPoints = [-12, -6, 0, 6, 12];
    gainPoints.forEach(gain => {
        const y = gainToY(gain);

        // Add horizontal grid line (except for 0dB which has its own line)
        if (gain !== 0) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'eq-grid');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', width);
            line.setAttribute('y2', y);
            freqGrid.appendChild(line);
        }

        // Add gain label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'eq-gain-label');
        label.setAttribute('x', 20);
        label.setAttribute('y', y + 3); // +3 to center text vertically
        label.textContent = gain + 'dB';
        labelsGroup.appendChild(label);
    });
}

// Initialize EQ visualization on page load
document.addEventListener('DOMContentLoaded', function() {
    updateEqResponse();

    // Also make sure to update EQ visualization on window resize
    window.addEventListener('resize', function() {
        updateEqResponse();
    });
});

// Add event listeners for the EQ controls
document.getElementById('eqLow').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('eqLowValue').textContent = `${value.toFixed(1)} dB`;

    // Update the EQ3 low gain value
    eq.low.value = value;

    // Update the EQ visualization
    updateEqResponse();
});

document.getElementById('eqMid').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('eqMidValue').textContent = `${value.toFixed(1)} dB`;

    // Update the EQ3 mid gain value
    eq.mid.value = value;

    // Update the EQ visualization
    updateEqResponse();
});

document.getElementById('eqHigh').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('eqHighValue').textContent = `${value.toFixed(1)} dB`;

    // Update the EQ3 high gain value
    eq.high.value = value;

    // Update the EQ visualization
    updateEqResponse();
});

document.getElementById('eqMidFreq').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('eqMidFreqValue').textContent = `${value.toFixed(0)} Hz`;

    // Update the EQ visualization (mid frequency isn't directly accessible in Tone.EQ3)
    updateEqResponse();
});

document.getElementById('eqQ').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('eqQValue').textContent = value.toFixed(1);

    // Update the EQ visualization (Q factor isn't directly accessible in Tone.EQ3)
    updateEqResponse();
});

// Spectrum Analyzer
function setupSpectrumAnalyzer() {
    const canvas = document.getElementById('spectrumAnalyzer');
    const ctx = canvas.getContext('2d');

    function resizeSpectrumCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    resizeSpectrumCanvas();
    window.addEventListener('resize', resizeSpectrumCanvas);

    function drawSpectrumAnalyzer() {
        requestAnimationFrame(drawSpectrumAnalyzer);

        if (!canvas.width || !fft) return; // Skip if canvas not visible or fft not available

        const width = canvas.width;
        const height = canvas.height;
        const spectrumValues = fft.getValue();

        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(18, 18, 18, 0.2)';
        ctx.fillRect(0, 0, width, height);

        // Draw frequency bins
        const binWidth = width / (spectrumValues.length / 2);

        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'rgba(98, 0, 234, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 229, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 23, 68, 0.8)');

        ctx.fillStyle = gradient;

        // Draw only the first half of FFT data (up to Nyquist frequency)
        for (let i = 0; i < spectrumValues.length / 2; i++) {
            // Convert dB value to height
            // FFT values are typically in dB scale (-100 to 0)
            const value = spectrumValues[i];
            const dbValue = 20 * Math.log10(Math.abs(value) + 0.00001); // Avoid log(0)
            const normalizedValue = (dbValue + 100) / 100; // Normalize -100dB..0dB to 0..1

            const barHeight = normalizedValue * height;

            // Draw bar
            ctx.fillRect(i * binWidth, height - barHeight, binWidth * 0.8, barHeight);
        }

        // Add frequency markers
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px sans-serif';

        const freqMarkers = [100, 1000, 10000];
        freqMarkers.forEach(freq => {
            // Convert frequency to bin index
            const binIndex = Math.floor((freq / (Tone.context.sampleRate / 2)) * (spectrumValues.length / 2));
            const x = binIndex * binWidth;

            // Draw marker line
            ctx.fillRect(x, 0, 1, height);

            // Draw label
            let label;
            if (freq >= 1000) {
                label = `${freq/1000}kHz`;
            } else {
                label = `${freq}Hz`;
            }
            ctx.fillText(label, x + 3, 12);
        });
    }

    drawSpectrumAnalyzer();
}

// Particle System
function setupParticleSystem() {
    const canvas = document.getElementById('particleSystem');
    const ctx = canvas.getContext('2d');

    function resizeParticleCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    resizeParticleCanvas();
    window.addEventListener('resize', resizeParticleCanvas);

    // Create particles
    const particles = [];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 4 + 1,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 2 - 1,
            hue: Math.random() * 60 + 200, // Blue to purple range
            opacity: Math.random() * 0.5 + 0.2
        });
    }

    function updateParticles() {
        requestAnimationFrame(updateParticles);

        if (!canvas.width) return; // Skip if canvas not visible

        // Get audio data for reactivity
        const waveformData = waveform.getValue();
        const fftData = fft.getValue();

        // Calculate overall amplitude
        let sum = 0;
        for (let i = 0; i < waveformData.length; i++) {
            sum += Math.abs(waveformData[i]);
        }
        const averageAmplitude = sum / waveformData.length;

        // Get bass and treble energy
        const bassEnergy = Math.abs(fftData[5]) + Math.abs(fftData[10]) + Math.abs(fftData[15]);
        const trebleEnergy = Math.abs(fftData[100]) + Math.abs(fftData[150]) + Math.abs(fftData[200]);

        // Clear canvas with fade effect
        ctx.fillStyle = 'rgba(18, 18, 18, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach(p => {
            // Apply audio reactivity
            p.size = p.size * 0.95 + (p.size * averageAmplitude * 5) * 0.05;
            p.speedX += (Math.random() * 2 - 1) * bassEnergy * 0.02;
            p.speedY += (Math.random() * 2 - 1) * trebleEnergy * 0.02;

            // Update position
            p.x += p.speedX;
            p.y += p.speedY;

            // Apply damping
            p.speedX *= 0.99;
            p.speedY *= 0.99;

            // Wrap around edges
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            // Draw particle
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.opacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Draw connections between nearby particles
            particles.forEach(p2 => {
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 50) {
                    ctx.globalAlpha = (1 - distance / 50) * 0.2;
                    ctx.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 100%, 60%, ${ctx.globalAlpha})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            });
        });

        ctx.globalAlpha = 1; // Reset alpha
    }

    updateParticles();
}

// Create Drum Loop Grid
function createDrumSteps() {
    const drumTypes = ['kick', 'snare', 'hihat', 'clap'];

    drumTypes.forEach(type => {
        const container = document.getElementById(`${type}Steps`);
        container.innerHTML = '';

        // Create 16 steps for each drum type
        for (let i = 0; i < 16; i++) {
            const step = document.createElement('div');
            step.className = 'drum-step';

            // Set default patterns
            if (type === 'kick' && (i % 4 === 0)) {
                step.classList.add('active');
            } else if (type === 'snare' && (i % 4 === 2)) {
                step.classList.add('active');
            } else if (type === 'hihat' && (i % 2 === 0)) {
                step.classList.add('active');
            } else if (type === 'clap' && (i % 8 === 4)) {
                step.classList.add('active');
            }

            // Add click handler to toggle active state
            step.addEventListener('click', () => {
                step.classList.toggle('active');
            });

            container.appendChild(step);
        }
    });
}

// Create and initialize drum sounds
function initializeDrumSounds() {
    // Create the drum sounds using Tone.js synthesizer components

    // Kick Drum
    drumSounds.kick = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 5,
        oscillator: {
            type: 'sine'
        },
        envelope: {
            attack: 0.001,
            decay: 0.4,
            sustain: 0.01,
            release: 1.4,
            attackCurve: 'exponential'
        }
    }).connect(eq);

    // Snare Drum
    drumSounds.snare = new Tone.NoiseSynth({
        noise: {
            type: 'white'
        },
        envelope: {
            attack: 0.001,
            decay: 0.2,
            sustain: 0.02,
            release: 0.4
        }
    }).connect(eq);

    // Hi-hat
    drumSounds.hihat = new Tone.MetalSynth({
        frequency: 200,
        envelope: {
            attack: 0.001,
            decay: 0.1,
            release: 0.1
        },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5
    }).connect(eq);

    // Adjust hi-hat settings for a more realistic sound
    drumSounds.hihat.volume.value = -20; // Quieter by default

    // Clap
    drumSounds.clap = new Tone.NoiseSynth({
        noise: {
            type: 'pink'
        },
        envelope: {
            attack: 0.001,
            decay: 0.3,
            sustain: 0,
            release: 0.1
        }
    }).connect(eq);

    // Add some effects to make the clap more realistic
    const clapFilter = new Tone.Filter(1000, "bandpass").connect(eq);
    drumSounds.clap.connect(clapFilter);
}

// Function to trigger a specific drum sound with volume adjustment
function triggerDrumSound(type) {
    const volume = parseFloat(document.getElementById(`${type}Volume`).value);

    switch (type) {
        case 'kick':
            drumSounds.kick.triggerAttackRelease('C1', '8n');
            drumSounds.kick.volume.value = Tone.gainToDb(volume);
            break;
        case 'snare':
            drumSounds.snare.triggerAttackRelease('8n');
            drumSounds.snare.volume.value = Tone.gainToDb(volume);
            break;
        case 'hihat':
            drumSounds.hihat.triggerAttackRelease('32n');
            drumSounds.hihat.volume.value = Tone.gainToDb(volume * 0.6); // Keep hi-hats a bit quieter
            break;
        case 'clap':
            drumSounds.clap.triggerAttackRelease('16n');
            drumSounds.clap.volume.value = Tone.gainToDb(volume);
            break;
    }

    // Provide visual feedback using VU meter
    updateVUMeter(volume * 0.7);
}

// Update the drum loop to highlight the current step and play sounds
function updateDrumLoop(currentStep) {
    const drumTypes = ['kick', 'snare', 'hihat', 'clap'];

    // Remove playing class from all steps
    document.querySelectorAll('.drum-step').forEach(step => {
        step.classList.remove('playing');
    });

    // Highlight current step for each drum type and trigger sound if active
    drumTypes.forEach(type => {
        const steps = document.querySelectorAll(`#${type}Steps .drum-step`);
        if (steps[currentStep] && steps[currentStep].classList.contains('active')) {
            steps[currentStep].classList.add('playing');
            triggerDrumSound(type);
        }

        // Add the 'playing' class to the current step in each row for visual cue
        if (steps[currentStep]) {
            steps[currentStep].classList.add('playing');
        }
    });
}

// Drum volume control listeners
function setupDrumVolumeControls() {
    const drumTypes = ['kick', 'snare', 'hihat', 'clap'];

    drumTypes.forEach(type => {
        const volumeControl = document.getElementById(`${type}Volume`);
        const volumeDisplay = document.getElementById(`${type}VolumeValue`);

        volumeControl.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            volumeDisplay.textContent = value.toFixed(2);

            // If we have the drum sound initialized, update its volume
            if (drumSounds[type]) {
                drumSounds[type].volume.value = Tone.gainToDb(value);
            }
        });
    });
}

createSequencer();

// Create keyboard after DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    createKeyboard();
    // Initialize presets
    initializePresets();

    // Initialize ADSR Visualizer
    updateADSRVisualizer();

    // Initialize Filter Response Curve
    updateFilterResponse();

    // Initialize EQ Response Visualization
    updateEqResponse();

    // Create the drum step sequencer
    createDrumSteps();

    // Initialize drum sounds
    initializeDrumSounds();

    // Set up drum volume controls
    setupDrumVolumeControls();

    // Initialize LFO scope
    initLfoScope();
});

// Recalculate keyboard positions on window resize
window.addEventListener('resize', () => {
    // Small delay to ensure DOM has updated
    setTimeout(createKeyboard, 100);
});

let isPlaying = false;
let currentStep = 0;

// Connect UI controls to synth parameters
document.getElementById('waveform').addEventListener('change', e => {
    if (currentMode === "poly") {
        synth.set({
            oscillator: {
                type: e.target.value
            }
        });
    } else {
        synth.oscillator.type = e.target.value;
    }
});

// Filter type toggle
document.getElementById('filterTypeToggle').addEventListener('change', e => {
    const filterType = e.target.checked ? "highpass" : "lowpass";
    filter.type = filterType;
    document.getElementById('filterTypeState').textContent = e.target.checked ? "HP" : "LP";
    updateFilterResponse();
});

document.getElementById('filterCutoff').addEventListener('input', e => {
    filter.frequency.value = e.target.value;
    document.getElementById('filterCutoffValue').textContent = `${Math.round(e.target.value)} Hz`;
    updateFilterResponse();
});

document.getElementById('filterRes').addEventListener('input', e => {
    filter.Q.value = e.target.value;
    document.getElementById('filterResValue').textContent = parseFloat(e.target.value).toFixed(1);
    updateFilterResponse();
});

document.getElementById('reverbMix').addEventListener('input', e => {
    reverb.wet.value = e.target.value;
    document.getElementById('reverbMixValue').textContent = parseFloat(e.target.value).toFixed(2);
});

// New reverb decay control
document.getElementById('reverbDecay').addEventListener('input', e => {
    const value = parseFloat(e.target.value);

    // Update the display immediately for better UX
    document.getElementById('reverbDecayValue').textContent = `${value.toFixed(1)}s`;

    // We'll use a debounce approach to avoid recreating the reverb on every tiny change
    // Clear any pending reverb update
    if (window.reverbUpdateTimeout) {
        clearTimeout(window.reverbUpdateTimeout);
    }

    // Set a new timeout to update the reverb after a short delay
    window.reverbUpdateTimeout = setTimeout(() => {
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
    }, 300); // 300ms debounce
});

document.getElementById('delayTime').addEventListener('input', e => {
    delay.delayTime.value = e.target.value;
    document.getElementById('delayTimeValue').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('delayFeedback').addEventListener('input', e => {
    delay.feedback.value = e.target.value;
    document.getElementById('delayFeedbackValue').textContent = parseFloat(e.target.value).toFixed(2);
});

// New effect controls
document.getElementById('chorusMix').addEventListener('input', e => {
    chorus.wet.value = e.target.value;
    document.getElementById('chorusMixValue').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('distortionMix').addEventListener('input', e => {
    distortion.wet.value = e.target.value;
    document.getElementById('distortionMixValue').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('flangerMix').addEventListener('input', e => {
    flanger.wet.value = e.target.value;
    document.getElementById('flangerMixValue').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('phaserMix').addEventListener('input', e => {
    phaser.wet.value = e.target.value;
    document.getElementById('phaserMixValue').textContent = parseFloat(e.target.value).toFixed(2);
});

// New oscillator control event listeners
document.getElementById('oscillatorOctave').addEventListener('input', e => {
    const value = parseInt(e.target.value);
    document.getElementById('oscillatorOctaveValue').textContent = value;
    updateDetune();
});

document.getElementById('oscillatorSemi').addEventListener('input', e => {
    const value = parseInt(e.target.value);
    document.getElementById('oscillatorSemiValue').textContent = value;
    updateDetune();
});

document.getElementById('oscillatorLevel').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('oscillatorLevelValue').textContent = value.toFixed(2);

    // Update oscillator level
    if (currentMode === "poly") {
        synth.set({
            volume: Tone.gainToDb(value)
        });
    } else {
        synth.volume.value = Tone.gainToDb(value);
    }
});

// Add detune control (fine tuning in cents)
document.getElementById('detune').addEventListener('input', e => {
    const value = parseInt(e.target.value);
    document.getElementById('detuneValue').textContent = value + " ¢";

    // Update knob rotation visually
    knobUpdaters.detune(value);

    // Apply fine detune (this is separate from octave/semitone detune)
    if (currentMode === "poly") {
        synth.set({
            oscillator: {
                detune: value // Fine detune in cents
            }
        });
    } else {
        synth.oscillator.detune.value = value; // Fine detune in cents
    }
});

// Add voices control
document.getElementById('voices').addEventListener('input', e => {
    const value = parseInt(e.target.value);
    document.getElementById('voicesValue').textContent = value;

    // Update knob rotation visually
    knobUpdaters.voices(value);

    // Only apply to poly synth mode
    if (currentMode === "poly") {
        // Store current oscillator settings
        const waveformType = document.getElementById('waveform').value;
        const level = parseFloat(document.getElementById('oscillatorLevel').value);
        const detune = parseInt(document.getElementById('detune').value);

        // Create a new PolySynth with the specified number of voices
        const oldSynth = synth;
        synth = new Tone.PolySynth({
            maxPolyphony: value,
            voice: Tone.Synth,
            options: {
                ...synthSettings,
                oscillator: {
                    type: waveformType,
                    detune: detune
                },
                volume: Tone.gainToDb(level)
            }
        });

        // Connect to the effects chain
        synth.connect(filter);

        // Apply octave/semitone detune
        updateDetune();

        // Dispose of the old synth (after releasing notes)
        oldSynth.releaseAll();
        setTimeout(() => oldSynth.dispose(), 100);
    }
});

// ADSR controls
document.getElementById('attack').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    if (currentMode === "poly") {
        synth.set({
            envelope: {
                attack: value
            }
        });
    } else {
        synth.envelope.attack = value;
    }
    // Update common settings for recreating synths
    synthSettings.envelope.attack = value;
    document.getElementById('attackValue').textContent = `${value.toFixed(2)}s`;
    updateADSRVisualizer();
});

document.getElementById('decay').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    if (currentMode === "poly") {
        synth.set({
            envelope: {
                decay: value
            }
        });
    } else {
        synth.envelope.decay = value;
    }
    // Update common settings for recreating synths
    synthSettings.envelope.decay = value;
    document.getElementById('decayValue').textContent = `${value.toFixed(2)}s`;
    updateADSRVisualizer();
});

document.getElementById('sustain').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    if (currentMode === "poly") {
        synth.set({
            envelope: {
                sustain: value
            }
        });
    } else {
        synth.envelope.sustain = value;
    }
    // Update common settings for recreating synths
    synthSettings.envelope.sustain = value;
    document.getElementById('sustainValue').textContent = value.toFixed(2);
    updateADSRVisualizer();
});

document.getElementById('release').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    if (currentMode === "poly") {
        synth.set({
            envelope: {
                release: value
            }
        });
    } else {
        synth.envelope.release = value;
    }
    // Update common settings for recreating synths
    synthSettings.envelope.release = value;
    document.getElementById('releaseValue').textContent = `${value.toFixed(2)}s`;
    updateADSRVisualizer();
});

document.getElementById('startSequencer').addEventListener('click', async function() {
    if (!isPlaying) {
        await Tone.start();
        // Start the transport if it's not already running
        if (Tone.Transport.state !== "started") {
            Tone.Transport.start();
        }
        isPlaying = true;
        this.innerHTML = '<i class="fas fa-stop"></i><span>Stop</span>';
        this.classList.add('playing');
    } else {
        // Only stop Transport if drum loop is not running
        if (!drumSequencerRunning) {
            Tone.Transport.stop();
        }
        isPlaying = false;
        this.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
        this.classList.remove('playing');
        // Clear any active key highlights when stopping
        clearSequencerKeyHighlights();
    }
});

// 3. Update the drum loop start/stop button handler
document.getElementById('startDrumLoop').addEventListener('click', async function() {
    if (!drumSequencerRunning) {
        // Initialize Tone.js context if not already done
        await Tone.start();

        // Start the transport if it's not already running
        if (Tone.Transport.state !== "started") {
            Tone.Transport.start();
        }

        // Change button appearance
        this.innerHTML = '<i class="fas fa-stop"></i><span>Stop</span>';
        this.classList.add('playing');

        // Set drum sequencer as running
        drumSequencerRunning = true;
    } else {
        // Only stop Transport if sequencer is not playing
        if (!isPlaying) {
            Tone.Transport.stop();
        }

        // Change button appearance
        this.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
        this.classList.remove('playing');

        // Remove any playing highlights
        document.querySelectorAll('.drum-step').forEach(step => {
            step.classList.remove('playing');
        });

        // Set drum sequencer as stopped
        drumSequencerRunning = false;
    }
});

document.getElementById('compressor').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('compressorValue').textContent = value.toFixed(2);

    // Map 0-1 to appropriate compression settings
    // When value is 0: no compression (threshold 0, ratio 1)
    // When value is 1: heavy compression (threshold -30, ratio 20)

    // Adjust threshold: 0 to -30 dB
    masterCompressor.threshold.value = value * -30;

    // Adjust ratio: 1 to 20
    masterCompressor.ratio.value = 1 + (value * 19);

    // For visual feedback, update VU meter slightly
    if (value > 0) {
        updateVUMeter(value * 0.5);
    }
});

// Add an event listener for the stereo width knob (add with other event listeners)
document.getElementById('stereoWidth').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('stereoWidthValue').textContent = value.toFixed(2);

    // Map the 0-2 range of the UI knob directly to the 0-1 range of the StereoWidener
    // 0 = mono (width of 0)
    // 1 = normal stereo (width of 0.5)
    // 2 = extra wide stereo (width of 1)
    stereoWidener.width.value = value / 2;

    // Simple compensation formula
    const compensation = 1 + (value * 0.3); // Adjust the 0.3 multiplier as needed
    widthCompensation.gain.value = compensation;

    // For visual feedback
    updateVUMeter(0.3);
});

document.getElementById('masterVolume').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('masterVolumeValue').textContent = value.toFixed(2);

    // Set the gain value directly (values from 0-1 work as-is with Tone.Gain)
    masterVolume.gain.value = value;

    // For visual feedback
    updateVUMeter(value * 0.5);
});

document.getElementById('masterPan').addEventListener('input', e => {
    const value = parseFloat(e.target.value);

    // Update the panner
    masterPanner.pan.value = value;

    // Create a more descriptive pan display
    let displayText = "C"; // Center by default

    if (value < -0.05) {
        // Left side
        const leftAmount = Math.abs(Math.round(value * 100));
        displayText = `L${leftAmount}`;
    } else if (value > 0.05) {
        // Right side
        const rightAmount = Math.round(value * 100);
        displayText = `R${rightAmount}`;
    }

    document.getElementById('masterPanValue').textContent = displayText;

    // Optional: Visual feedback
    updateVUMeter(0.3);
});

// The init patch with basic settings
const initPatch = {
    voiceMode: "poly",
    waveform: "sine",
    filterCutoff: "8000",
    filterRes: "1",
    filterType: false,
    reverbMix: "0.1",
    reverbDecay: "1.5",
    delayTime: "0.1",
    delayFeedback: "0.1",
    tempo: "120",
    attack: "0.01",
    decay: "0.1",
    sustain: "0.5",
    release: "0.5",
    oscillatorOctave: "0",
    oscillatorSemi: "0",
    oscillatorLevel: "0.8",
    detune: "0",
    chorusMix: "0",
    distortionMix: "0",
    flangerMix: "0",
    phaserMix: "0",
    lfoRate: "1",
    lfoAmount: "50",
    droneOctave: "-1",
    eqLow: "0",
    eqMid: "0",
    eqHigh: "0",
    eqMidFreq: "1000",
    eqQ: "1",
    compressor: "0",
    stereoWidth: "0.5",
    masterVolume: "0.8",
    masterPan: "0",
    sequencer: [{
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        },
        {
            "note": "C4",
            "active": true
        },
        {
            "note": "C4",
            "active": false
        }
    ]
};

// Init Patch button
document.getElementById('initPatchButton').addEventListener('click', function() {
    applyPreset(initPatch);

    // Visual feedback
    this.classList.add('success');
    setTimeout(() => {
        this.classList.remove('success');
    }, 1000);

    // If drone is active, reset it
    if (isDroneActive) {
        toggleDrone();
    }
});

// The currently active preset name
let activePresetName = null;

// Initialize presets
function initializePresets() {
    // Apply the default preset from builtInPresets
    applyPreset(builtInPresets[0].settings);
    activePresetName = builtInPresets[0].name;

    // Render the presets list
    renderPresetList();
}

// Render the preset list
function renderPresetList() {
    const presetList = document.getElementById('presetList');
    presetList.innerHTML = '';

    // Add built-in presets
    builtInPresets.forEach(preset => {
        const presetItem = document.createElement('div');
        presetItem.className = 'preset-item' + (activePresetName === preset.name ? ' active' : '');
        presetItem.innerHTML = `
            <i class="fas fa-music"></i>
            <span class="preset-name">${preset.name}</span>
            <span class="preset-tag ${preset.category}">${preset.category}</span>
        `;
        presetItem.addEventListener('click', () => {
            // Set as active
            document.querySelectorAll('.preset-item').forEach(item => {
                item.classList.remove('active');
            });
            presetItem.classList.add('active');
            activePresetName = preset.name;

            // Apply the preset
            applyPreset(preset.settings);

            // Turn off drone if it's active
            if (isDroneActive) {
                toggleDrone();
            }
        });
        presetList.appendChild(presetItem);
    });

    // Add custom presets
    const customPresets = JSON.parse(localStorage.getItem('customPresets') || '[]');
    customPresets.forEach(preset => {
        const presetItem = document.createElement('div');
        presetItem.className = 'preset-item' + (activePresetName === preset.name ? ' active' : '');
        presetItem.innerHTML = `
            <i class="fas fa-music"></i>
            <span class="preset-name">${preset.name}</span>
            <span class="preset-tag ${preset.category}">${preset.category}</span>
        `;
        presetItem.addEventListener('click', () => {
            // Set as active
            document.querySelectorAll('.preset-item').forEach(item => {
                item.classList.remove('active');
            });
            presetItem.classList.add('active');
            activePresetName = preset.name;

            // Apply the preset
            applyPreset(preset.settings);

            // Turn off drone if it's active
            if (isDroneActive) {
                toggleDrone();
            }
        });
        presetList.appendChild(presetItem);
    });
}

// Apply a preset to the synth
function applyPreset(settings) {
    // Update all parameters and trigger input events to update visuals
    Object.entries(settings).forEach(([key, value]) => {
        if (key !== 'sequencer' && key !== 'drumMachine') {
            if (key === 'filterType') {
                // Handle toggle separately
                document.getElementById('filterTypeToggle').checked = value;
                document.getElementById('filterTypeToggle').dispatchEvent(new Event('change'));
            } else {
                const input = document.getElementById(key);
                if (input) {
                    input.value = value;
                    input.dispatchEvent(new Event('input'));

                    // Special handling for voice mode
                    if (key === 'voiceMode' && value !== currentMode) {
                        currentMode = value;
                        createSynth(currentMode);
                    }
                }
            }
        }
    });

    // Update sequencer if available
    if (settings.sequencer) {
        const steps = document.querySelectorAll('.step');
        settings.sequencer.forEach((stepSetup, i) => {
            if (i < steps.length) {
                const step = steps[i];
                const select = step.querySelector('select');
                if (select && stepSetup.note) {
                    select.value = stepSetup.note;
                }

                const toggle = step.querySelector('.step-toggle');
                if (toggle) {
                    toggle.classList.toggle('active', stepSetup.active);
                    toggle.textContent = stepSetup.active ? 'On' : 'Off';
                }
            }
        });
    }

    // Update drum machine settings
    if (settings.drumMachine) {
        const drumTypes = ['kick', 'snare', 'hihat', 'clap'];

        drumTypes.forEach(type => {
            const volumeControl = document.getElementById(`${type}Volume`);
            const volumeDisplay = document.getElementById(`${type}VolumeValue`);
            const steps = document.querySelectorAll(`#${type}Steps .drum-step`);

            // Set volume if provided
            if (settings.drumMachine[type] && settings.drumMachine[type].volume !== undefined) {
                const volume = settings.drumMachine[type].volume;
                volumeControl.value = volume;
                volumeDisplay.textContent = volume.toFixed(2);

                // Update drum sound volume
                if (drumSounds && drumSounds[type]) {
                    drumSounds[type].volume.value = Tone.gainToDb(volume);
                }
            }

            // Set step states
            if (settings.drumMachine[type] && settings.drumMachine[type].steps) {
                steps.forEach((step, i) => {
                    if (i < settings.drumMachine[type].steps.length) {
                        step.classList.toggle('active', settings.drumMachine[type].steps[i]);
                    }
                });
            }
        });
    } else {
        // Reset drum machine to default if no settings provided
        const drumTypes = ['kick', 'snare', 'hihat', 'clap'];

        drumTypes.forEach(type => {
            const volumeControl = document.getElementById(`${type}Volume`);
            const volumeDisplay = document.getElementById(`${type}VolumeValue`);
            const steps = document.querySelectorAll(`#${type}Steps .drum-step`);

            // Reset volume to default
            const defaultVolume = type === 'kick' ? 0.8 :
                type === 'snare' ? 0.7 :
                type === 'hihat' ? 0.6 : 0.65;

            volumeControl.value = defaultVolume;
            volumeDisplay.textContent = defaultVolume.toFixed(2);

            // Update drum sound volume
            if (drumSounds && drumSounds[type]) {
                drumSounds[type].volume.value = Tone.gainToDb(defaultVolume);
            }

            // Reset step states (default pattern)
            steps.forEach((step, i) => {
                step.classList.remove('active');
                if (type === 'kick' && (i % 4 === 0)) {
                    step.classList.add('active');
                } else if (type === 'snare' && (i % 4 === 2)) {
                    step.classList.add('active');
                } else if (type === 'hihat' && (i % 2 === 0)) {
                    step.classList.add('active');
                } else if (type === 'clap' && (i % 8 === 4)) {
                    step.classList.add('active');
                }
            });

        });
    }

    // Add LFO settings loading near the end of the function
    if (settings.lfoDestination) {
        loadLfoPresetSettings(settings);
    }

    // Ensure synth settings is updated for recreating synths
    synthSettings.envelope.attack = parseFloat(document.getElementById('attack').value);
    synthSettings.envelope.decay = parseFloat(document.getElementById('decay').value);
    synthSettings.envelope.sustain = parseFloat(document.getElementById('sustain').value);
    synthSettings.envelope.release = parseFloat(document.getElementById('release').value);

    // Then recreate the synth to apply all settings consistently
    createSynth(currentMode);

    // Update ADSR Visualizer
    updateADSRVisualizer();

    // Update Filter Response Curve
    updateFilterResponse();

    // Update EQ Response Curve
    updateEqResponse();

    // Update VU meter to provide visual feedback that preset was loaded
    updateVUMeter(0.6);

}

// Enhanced LFO Preset Loading Function
function loadLfoPresetSettings(settings) {
    // Ensure LFO-related settings are properly handled
    const lfoDestinationSelect = document.getElementById('lfoDestination');
    const lfoRateInput = document.getElementById('lfoRate');
    const lfoAmountInput = document.getElementById('lfoAmount');
    const lfoWaveformSelect = document.getElementById('lfoWaveform');

    // Default to off if no LFO settings found
    const lfoDestination = settings.lfoDestination || 'off';
    const lfoRate = settings.lfoRate || 1;
    const lfoAmount = settings.lfoAmount || 50;
    const lfoWaveform = settings.lfoWaveform || 'sine';
    const lfoSync = settings.lfoSync !== undefined ? settings.lfoSync : false;

    // Set all LFO-related controls
    lfoDestinationSelect.value = lfoDestination;
    lfoRateInput.value = lfoRate;
    lfoAmountInput.value = lfoAmount;
    lfoWaveformSelect.value = lfoWaveform;

    // Trigger change events to ensure proper initialization
    lfoDestinationSelect.dispatchEvent(new Event('change'));
    lfoRateInput.dispatchEvent(new Event('input'));
    lfoAmountInput.dispatchEvent(new Event('input'));
    lfoWaveformSelect.dispatchEvent(new Event('change'));
}

// Get the current setup
function getCurrentSetup() {
    // Collect drum machine settings
    const drumTypes = ['kick', 'snare', 'hihat', 'clap'];
    const drumMachineSettings = {};

    drumTypes.forEach(type => {
        const steps = document.querySelectorAll(`#${type}Steps .drum-step`);
        const volume = parseFloat(document.getElementById(`${type}Volume`).value);

        drumMachineSettings[type] = {
            volume: volume,
            steps: Array.from(steps).map(step => step.classList.contains('active'))
        };
    });

    return {
        voiceMode: "poly", // Always return "poly" regardless of UI selection
        waveform: document.getElementById('waveform').value,
        filterCutoff: document.getElementById('filterCutoff').value,
        filterRes: document.getElementById('filterRes').value,
        filterType: document.getElementById('filterTypeToggle').checked,
        reverbMix: document.getElementById('reverbMix').value,
        reverbDecay: document.getElementById('reverbDecay').value,
        delayTime: document.getElementById('delayTime').value,
        delayFeedback: document.getElementById('delayFeedback').value,
        tempo: document.getElementById('tempo').value,
        attack: document.getElementById('attack').value,
        decay: document.getElementById('decay').value,
        sustain: document.getElementById('sustain').value,
        release: document.getElementById('release').value,
        oscillatorOctave: document.getElementById('oscillatorOctave').value,
        oscillatorSemi: document.getElementById('oscillatorSemi').value,
        oscillatorLevel: document.getElementById('oscillatorLevel').value,
        chorusMix: document.getElementById('chorusMix').value,
        distortionMix: document.getElementById('distortionMix').value,
        flangerMix: document.getElementById('flangerMix').value,
        phaserMix: document.getElementById('phaserMix').value,
        lfoDestination: document.getElementById('lfoDestination').value,
        lfoRate: document.getElementById('lfoRate').value,
        lfoAmount: document.getElementById('lfoAmount').value,
        lfoWaveform: document.getElementById('lfoWaveform').value,
        droneOctave: document.getElementById('droneOctave').value,
        eqLow: document.getElementById('eqLow').value,
        eqMid: document.getElementById('eqMid').value,
        eqHigh: document.getElementById('eqHigh').value,
        eqMidFreq: document.getElementById('eqMidFreq').value,
        eqQ: document.getElementById('eqQ').value,
        compressor: document.getElementById('compressor').value,
        stereoWidth: document.getElementById('stereoWidth').value,
        masterVolume: document.getElementById('masterVolume').value,
        masterPan: document.getElementById('masterPan').value,
        sequencer: Array.from(document.querySelectorAll('.step')).map(step => ({
            note: step.querySelector('select').value,
            active: step.querySelector('.step-toggle').classList.contains('active')
        })),
        drumMachine: drumMachineSettings
    };
}

// Modal handling for new preset
const presetModal = document.getElementById('presetModal');
const presetNameInput = document.getElementById('presetName');
const presetCategorySelect = document.getElementById('presetCategory');

document.getElementById('newPresetBtn').addEventListener('click', () => {
    presetModal.classList.add('active');
    presetNameInput.value = '';
    presetNameInput.focus();
});

document.getElementById('cancelPresetBtn').addEventListener('click', () => {
    presetModal.classList.remove('active');
});

document.getElementById('savePresetBtn').addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    if (!name) {
        alert('Please enter a name for your preset');
        return;
    }

    const category = presetCategorySelect.value;

    // Get current custom presets
    const customPresets = JSON.parse(localStorage.getItem('customPresets') || '[]');

    // Check if a preset with this name already exists
    const existingIndex = customPresets.findIndex(p => p.name === name);

    // Create the new preset
    const newPreset = {
        name,
        category,
        settings: getCurrentSetup()
    };

    // Update or add to the presets array
    if (existingIndex >= 0) {
        customPresets[existingIndex] = newPreset;
    } else {
        customPresets.push(newPreset);
    }

    // Save back to localStorage
    localStorage.setItem('customPresets', JSON.stringify(customPresets));

    // Close modal
    presetModal.classList.remove('active');

    // Set as active preset
    activePresetName = name;

    // Refresh the preset list
    renderPresetList();

    // Visual feedback
    const savePresetBtn = document.getElementById('newPresetBtn');
    savePresetBtn.classList.add('success');
    setTimeout(() => {
        savePresetBtn.classList.remove('success');
    }, 1000);
});

// Delete preset functionality
document.getElementById('deletePresetBtn').addEventListener('click', () => {
    // Check if a preset is selected and it's a custom preset (not built-in)
    const isBuiltIn = builtInPresets.some(p => p.name === activePresetName);
    if (!activePresetName || isBuiltIn) {
        alert('Please select a custom preset to delete');
        return;
    }

    if (confirm(`Are you sure you want to delete the preset "${activePresetName}"?`)) {
        // Get current custom presets
        const customPresets = JSON.parse(localStorage.getItem('customPresets') || '[]');

        // Remove the preset
        const filteredPresets = customPresets.filter(p => p.name !== activePresetName);

        // Save back to localStorage
        localStorage.setItem('customPresets', JSON.stringify(filteredPresets));

        // Reset active preset to first built-in preset
        activePresetName = builtInPresets[0].name;

        // Apply first built-in preset
        applyPreset(builtInPresets[0].settings);

        // Refresh the preset list
        renderPresetList();

        // Visual feedback
        const deletePresetBtn = document.getElementById('deletePresetBtn');
        deletePresetBtn.classList.add('success');
        setTimeout(() => {
            deletePresetBtn.classList.remove('success');
        }, 1000);
    }
});

// This function will randomize the drum pattern in a musically pleasing way
function randomizeDrumPattern() {
    const drumTypes = ['kick', 'snare', 'hihat', 'clap'];

    // Choose a random pattern style
    const patternStyles = ['basic', 'offbeat', 'breakbeat', 'techno', 'sparse', 'dense'];
    const randomStyle = patternStyles[Math.floor(Math.random() * patternStyles.length)];

    drumTypes.forEach(type => {
        const steps = document.querySelectorAll(`#${type}Steps .drum-step`);

        // Clear current pattern
        steps.forEach(step => step.classList.remove('active'));

        // Apply a musically interesting pattern based on the type and chosen style
        switch (type) {
            case 'kick':
                // Kick drum patterns
                switch (randomStyle) {
                    case 'basic':
                        // Standard 4/4 kick pattern (beats 1, 5, 9, 13)
                        [0, 4, 8, 12].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'offbeat':
                        // Offbeat kicks
                        [2, 6, 10, 14].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'breakbeat':
                        // Syncopated kick pattern
                        [0, 3, 8, 10].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'techno':
                        // Four-on-the-floor with ghost notes
                        [0, 4, 7, 8, 12, 14].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'sparse':
                        // Minimal kick
                        [0, 8].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'dense':
                        // Busy kick pattern
                        [0, 3, 4, 7, 8, 11, 12, 14].forEach(i => steps[i]?.classList.add('active'));
                        break;
                }
                break;

            case 'snare':
                // Snare drum patterns
                switch (randomStyle) {
                    case 'basic':
                        // Standard backbeat (beats 5, 13)
                        [4, 12].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'offbeat':
                        // Offbeat snares
                        [2, 6, 10, 14].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'breakbeat':
                        // Breakbeat snare
                        [4, 12, 14].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'techno':
                        // Techno snare pattern
                        [4, 12].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'sparse':
                        // Just the backbeat
                        [4, 12].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'dense':
                        // Ghost notes snare pattern
                        [1, 4, 7, 10, 12, 14].forEach(i => steps[i]?.classList.add('active'));
                        break;
                }
                break;

            case 'hihat':
                // Hi-hat patterns
                switch (randomStyle) {
                    case 'basic':
                        // Eighth notes
                        [0, 2, 4, 6, 8, 10, 12, 14].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'offbeat':
                        // Sixteenth notes on offbeats
                        [1, 3, 5, 7, 9, 11, 13, 15].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'breakbeat':
                        // Open/close pattern
                        [0, 2, 3, 4, 6, 8, 10, 11, 12, 14].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'techno':
                        // Classic techno hi-hat
                        Array.from({
                            length: 16
                        }).forEach((_, i) => {
                            if (i % 2 === 0 || i === 7 || i === 15) steps[i]?.classList.add('active');
                        });
                        break;
                    case 'sparse':
                        // Quarter notes
                        [0, 4, 8, 12].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'dense':
                        // Sixteenth notes with some gaps
                        Array.from({
                            length: 16
                        }).forEach((_, i) => {
                            if (Math.random() < 0.75) steps[i]?.classList.add('active');
                        });
                        break;
                }
                break;

            case 'clap':
                // Clap patterns
                switch (randomStyle) {
                    case 'basic':
                        // Just on beats 2 and 4
                        [4, 12].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'offbeat':
                        // Offbeat claps
                        [2, 10].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'breakbeat':
                        // Breakbeat style
                        [7, 15].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'techno':
                        // Techno clap pattern
                        [4, 12, 14].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'sparse':
                        // Just one clap per bar
                        [4].forEach(i => steps[i]?.classList.add('active'));
                        break;
                    case 'dense':
                        // Multiple claps
                        [4, 7, 12, 15].forEach(i => steps[i]?.classList.add('active'));
                        break;
                }
                break;
        }

        // Add some randomization to make it more interesting (10% chance per step to toggle)
        if (Math.random() > 0.5) { // 50% chance to add some randomness
            steps.forEach((step, i) => {
                // Skip the first beat for kick to preserve the downbeat in most cases
                if (type === 'kick' && i === 0) return;

                // 10% chance to toggle each step
                if (Math.random() < 0.1) {
                    step.classList.toggle('active');
                }
            });
        }
    });

    // Visual feedback
    const randomizeButton = document.getElementById('randomizeDrumPattern');
    if (randomizeButton) {
        gsap.to(randomizeButton, {
            scale: 1.1,
            duration: 0.1,
            yoyo: true,
            repeat: 1
        });
    }

    // Update VU meter for visual feedback
    updateVUMeter(0.6);
}

document.getElementById('chaosButton').addEventListener('click', () => {
    // Randomize waveform
    const waveforms = ['sine', 'square', 'sawtooth', 'triangle', 'pulse', 'fmsine', 'amsine', 'fatsawtooth', 'fatsquare'];
    const randomWaveform = waveforms[Math.floor(Math.random() * waveforms.length)];
    const waveformInput = document.getElementById('waveform');
    waveformInput.value = randomWaveform;
    waveformInput.dispatchEvent(new Event('change'));

    // Randomize filter type
    document.getElementById('filterTypeToggle').checked = Math.random() > 0.5;
    document.getElementById('filterTypeToggle').dispatchEvent(new Event('change'));

    // Randomize drone type
    const droneTypes = ['oscillator', 'white', 'pink'];
    const randomDroneType = droneTypes[Math.floor(Math.random() * droneTypes.length)];
    const droneTypeInput = document.getElementById('droneType');
    droneTypeInput.value = randomDroneType;
    droneTypeInput.dispatchEvent(new Event('change'));

    // Randomize LFO waveform
    const lfoWaveforms = ['sine', 'triangle', 'square', 'sawtooth', 'random'];
    const randomLfoWaveform = lfoWaveforms[Math.floor(Math.random() * lfoWaveforms.length)];
    const lfoWaveformInput = document.getElementById('lfoWaveform');
    lfoWaveformInput.value = randomLfoWaveform;
    lfoWaveformInput.dispatchEvent(new Event('change'));

    // Randomize LFO destination (including a chance to turn it off)
    const lfoDestinations = [
        'off', 'oscillatorLevel', 'detune', 'filterCutoff', 'filterRes',
        'attack', 'decay', 'sustain', 'release',
        'reverbMix', 'reverbDecay', 'delayTime', 'delayFeedback',
        'chorusMix', 'flangerMix', 'phaserMix', 'distortionMix',
        'masterVolume', 'pan', 'stereoWidth'
    ];
    // Give more weight to actual destinations vs 'off'
    const randomLfoDestination = Math.random() > 0.2 ?
        lfoDestinations[Math.floor(Math.random() * lfoDestinations.length)] :
        'off';
    const lfoDestinationInput = document.getElementById('lfoDestination');
    lfoDestinationInput.value = randomLfoDestination;
    lfoDestinationInput.dispatchEvent(new Event('change'));

    // Randomize all knob values
    knobs.forEach(([knobId, inputId]) => {
        const input = document.getElementById(inputId);
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const randomValue = Math.random() * (max - min) + min;
        input.value = randomValue;
        input.dispatchEvent(new Event('input'));
    });

    // Randomize sequencer notes
    const notes = generateNotes();
    document.querySelectorAll('.step select').forEach(select => {
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        select.value = randomNote;
    });

    // Randomize step toggles
    document.querySelectorAll('.step-toggle').forEach(toggle => {
        const shouldBeActive = Math.random() > 0.5;
        toggle.classList.toggle('active', shouldBeActive);
        toggle.textContent = shouldBeActive ? 'On' : 'Off';
    });

    // Use the dedicated drum pattern randomization function
    randomizeDrumPattern();

    // Visual feedback
    const chaosButton = document.getElementById('chaosButton');
    gsap.to(chaosButton, {
        scale: 1.1,
        duration: 0.1,
        yoyo: true,
        repeat: 1
    });

    // Handle drone state with randomization
    if (isDroneActive) {
        // If drone is active, turn it off
        toggleDrone();
    } else {
        // 30% chance to activate the drone when pressing Chaos
        if (Math.random() < 0.3) {
            toggleDrone(); // Randomly activate drone
        }
    }
});

// Add the randomize button to the drum module header
document.addEventListener('DOMContentLoaded', function() {
    // Find the drum module header
    const drumHeader = document.querySelector('.drum-loop-module .module-header');

    if (drumHeader) {
        // Create new randomize button
        const randomizeButton = document.createElement('button');
        randomizeButton.className = 'master-button';
        randomizeButton.id = 'randomizeDrumPattern';
        randomizeButton.innerHTML = '<i class="fas fa-random"></i><span></span>';

        // Add click event listener
        randomizeButton.addEventListener('click', randomizeDrumPattern);

        // Insert after the start button
        const startButton = drumHeader.querySelector('#startDrumLoop');
        if (startButton) {
            startButton.parentNode.insertBefore(randomizeButton, startButton.nextSibling);
        } else {
            // Fallback: just append to the header
            drumHeader.querySelector('.module-title').appendChild(randomizeButton);
        }
    }
});


// Nudge button functionality - Improved to include LFO, drone, ADSR, and drum patterns
document.getElementById('nudgeButton').addEventListener('click', () => {
    const notes = generateNotes();
    const parameters = [{
            type: 'filter',
            elements: ['filterCutoff', 'filterRes']
        },
        {
            type: 'reverb',
            elements: ['reverbMix', 'reverbDecay']
        },
        {
            type: 'delay',
            elements: ['delayTime', 'delayFeedback']
        },
        {
            type: 'oscillator',
            elements: ['oscillatorOctave', 'oscillatorSemi', 'oscillatorLevel']
        },
        {
            type: 'modulation',
            elements: ['chorusMix', 'flangerMix', 'phaserMix', 'distortionMix']
        },
        {
            type: 'eq',
            elements: ['eqLow', 'eqMid', 'eqHigh', 'eqMidFreq', 'eqQ']
        },
        {
            type: 'notes',
            elements: Array.from(document.querySelectorAll('.step select'))
        },
        {
            type: 'filter type',
            elements: ['filterTypeToggle']
        },
        // Added LFO parameters
        {
            type: 'lfo',
            elements: ['lfoRate', 'lfoAmount'],
            dropdowns: ['lfoWaveform', 'lfoDestination']
        },
        // Added ADSR parameters
        {
            type: 'adsr',
            elements: ['attack', 'decay', 'sustain', 'release']
        },
        // Added drone parameters
        {
            type: 'drone',
            elements: ['droneOctave', 'droneVolume'],
            dropdowns: ['droneType']
        },
        // Added drum patterns (implemented as a special type)
        {
            type: 'drums',
            drumTypes: ['kick', 'snare', 'hihat', 'clap']
        }
    ];

    // Randomly select 1-3 parameter groups to modify (slightly increased from original 1-2)
    const numChanges = Math.floor(Math.random() * 3) + 1;
    const selectedParams = parameters
        .sort(() => Math.random() - 0.5)
        .slice(0, numChanges);

    selectedParams.forEach(param => {
        if (param.type === 'notes') {
            // Modify 1-2 random step notes
            const numNoteChanges = Math.floor(Math.random() * 2) + 1;
            const stepSelects = param.elements
                .sort(() => Math.random() - 0.5)
                .slice(0, numNoteChanges);

            stepSelects.forEach(select => {
                const currentNote = select.value;
                const currentIndex = notes.indexOf(currentNote);
                const variation = Math.floor(Math.random() * 5) - 2; // -2 to +2 steps
                const newIndex = Math.max(0, Math.min(notes.length - 1, currentIndex + variation));
                select.value = notes[newIndex];

                // Visual feedback
                gsap.to(select, {
                    backgroundColor: 'rgba(98, 0, 234, 0.3)',
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1
                });
            });
        } else if (param.type === 'filter type') {
            // Handle toggle type controls
            const element = param.elements[Math.floor(Math.random() * param.elements.length)];
            const input = document.getElementById(element);
            input.checked = Math.random() > 0.5;
            input.dispatchEvent(new Event('change'));

            // Visual feedback for toggle
            const toggleContainer = input.closest('.toggle-container');
            gsap.to(toggleContainer, {
                opacity: 0.5,
                duration: 0.2,
                yoyo: true,
                repeat: 1
            });
        } else if (param.type === 'drums') {
            // Handling drum patterns with subtle changes
            // Instead of replacing patterns completely, we'll just toggle a few steps

            // Select one random drum type to modify
            const drumType = param.drumTypes[Math.floor(Math.random() * param.drumTypes.length)];
            const steps = document.querySelectorAll(`#${drumType}Steps .drum-step`);

            // Randomly toggle 1-3 steps (much more subtle than CHAOS button)
            const numToggles = Math.floor(Math.random() * 3) + 1;
            const stepsToToggle = Array.from({
                    length: steps.length
                }, (_, i) => i)
                .sort(() => Math.random() - 0.5)
                .slice(0, numToggles);

            stepsToToggle.forEach(index => {
                if (steps[index]) {
                    steps[index].classList.toggle('active');

                    // Visual feedback
                    gsap.to(steps[index], {
                        backgroundColor: 'rgba(0, 229, 255, 0.3)',
                        duration: 0.2,
                        yoyo: true,
                        repeat: 1
                    });
                }
            });

            // Sometimes also gently adjust a drum volume (25% chance)
            if (Math.random() < 0.25) {
                const volumeControl = document.getElementById(`${drumType}Volume`);
                if (volumeControl) {
                    const currentValue = parseFloat(volumeControl.value);
                    const range = parseFloat(volumeControl.max) - parseFloat(volumeControl.min);
                    // Smaller variation for volume (±5%)
                    const variation = (Math.random() * 0.1 - 0.05) * range;
                    const newValue = Math.max(
                        parseFloat(volumeControl.min),
                        Math.min(parseFloat(volumeControl.max), currentValue + variation)
                    );
                    volumeControl.value = newValue;
                    volumeControl.dispatchEvent(new Event('input'));

                    // Visual feedback
                    const knob = document.getElementById(`${drumType}VolumeKnob`);
                    if (knob) {
                        gsap.to(knob, {
                            boxShadow: '0 0 15px rgba(0, 229, 255, 0.8)',
                            duration: 0.3,
                            yoyo: true,
                            repeat: 1
                        });
                    }
                }
            }
        } else if (param.dropdowns && param.dropdowns.length > 0) {
            // Handle parameters with both sliders and dropdowns (LFO and drone)

            // 50% chance to adjust a slider vs 50% chance to change a dropdown
            if (Math.random() > 0.5 && param.elements.length > 0) {
                // Adjust a slider (similar to standard parameter handling)
                const element = param.elements[Math.floor(Math.random() * param.elements.length)];
                const input = document.getElementById(element);
                const currentValue = parseFloat(input.value);
                const range = parseFloat(input.max) - parseFloat(input.min);
                const variation = (Math.random() * 0.2 - 0.1) * range; // ±10% variation
                const newValue = Math.max(
                    parseFloat(input.min),
                    Math.min(parseFloat(input.max), currentValue + variation)
                );
                input.value = newValue;
                input.dispatchEvent(new Event('input'));

                // Visual feedback
                const knob = document.getElementById(`${element}Knob`);
                if (knob) {
                    gsap.to(knob, {
                        boxShadow: '0 0 15px rgba(0, 229, 255, 0.8)',
                        duration: 0.3,
                        yoyo: true,
                        repeat: 1
                    });
                }
            } else {
                // Change a dropdown - but only sometimes and only move to adjacent values
                const dropdown = param.dropdowns[Math.floor(Math.random() * param.dropdowns.length)];
                const select = document.getElementById(dropdown);

                if (select && select.options.length > 0) {
                    const currentIndex = select.selectedIndex;

                    // For most dropdowns, we'll shift by -1, 0, or 1 position
                    let shift = Math.floor(Math.random() * 3) - 1;

                    // Special case for LFO destination - don't shift too often,
                    // as changing the destination is a more dramatic change
                    if (dropdown === 'lfoDestination' && Math.random() < 0.7) {
                        shift = 0; // 70% chance to leave destination unchanged
                    }

                    if (shift !== 0) {
                        const newIndex = Math.max(0, Math.min(select.options.length - 1, currentIndex + shift));
                        select.selectedIndex = newIndex;
                        select.dispatchEvent(new Event('change'));

                        // Visual feedback
                        gsap.to(select, {
                            backgroundColor: 'rgba(0, 229, 255, 0.2)',
                            duration: 0.3,
                            yoyo: true,
                            repeat: 1
                        });
                    }
                }
            }
        } else {
            // Standard parameter handling (knobs/sliders)
            const element = param.elements[Math.floor(Math.random() * param.elements.length)];
            const input = document.getElementById(element);
            const currentValue = parseFloat(input.value);
            const range = parseFloat(input.max) - parseFloat(input.min);
            const variation = (Math.random() * 0.2 - 0.1) * range; // ±10% variation
            const newValue = Math.max(
                parseFloat(input.min),
                Math.min(parseFloat(input.max), currentValue + variation)
            );
            input.value = newValue;
            input.dispatchEvent(new Event('input'));

            // Visual feedback
            const knob = document.getElementById(`${element}Knob`);
            if (knob) {
                gsap.to(knob, {
                    boxShadow: '0 0 15px rgba(0, 229, 255, 0.8)',
                    duration: 0.3,
                    yoyo: true,
                    repeat: 1
                });
            }
        }
    });

    // Handle drone toggle with a small probability (less aggressive than CHAOS)
    // Only 10% chance to toggle drone state
    if (Math.random() < 0.1) {
        toggleDrone();
    }

    // Visual feedback for the button itself
    const nudgeButton = document.getElementById('nudgeButton');
    gsap.to(nudgeButton, {
        scale: 1.1,
        duration: 0.1,
        yoyo: true,
        repeat: 1
    });
});


// Set up sequencer loop
Tone.Transport.scheduleRepeat((time) => {
    // Increment the step counter (shared between sequencer and drums)
    currentStep = (currentStep + 1) % 16;

    // Only update and play the sequencer if isPlaying is true
    if (isPlaying) {
        const steps = document.querySelectorAll('.step');
        const step = steps[currentStep];
        const select = step.querySelector('select');
        const toggle = step.querySelector('.step-toggle');

        if (toggle.classList.contains('active')) {
            // Both mono and poly synths can use triggerAttackRelease in the same way for sequencer notes
            const note = select.value;
            synth.triggerAttackRelease(note, '8n', time);
            updateVUMeter(0.8);

            // Highlight the corresponding key on the keyboard
            highlightKeyFromSequencer(note, 0.25); // 250ms highlight duration

            // Visual feedback
            gsap.to(step, {
                scale: 1.03,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
        }

        updateSequencer(currentStep);
    }

    // Only update and play the drum loop if drumSequencerRunning is true
    if (drumSequencerRunning) {
        updateDrumLoop(currentStep);
    }
}, '8n');

// Update tempo
document.getElementById('tempo').addEventListener('input', (e) => {
    const tempo = parseInt(e.target.value);
    document.getElementById('tempoValue').textContent = `${tempo} BPM`;
    Tone.Transport.bpm.value = tempo;
});

// Set initial tempo
Tone.Transport.bpm.value = 120;

// Add octave control with polyphony support
let currentOctave = 4;

document.addEventListener('keydown', e => {
    // Toggle play/pause with spacebar
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling with spacebar
        document.getElementById('startSequencer').click(); // Simulate clicking the play button
        return;
    }

    if (e.repeat) return; // Prevent repeat triggers

    // Handle octave shifting
    if (e.key === 'z' && currentOctave > 2) {
        currentOctave--;
        return;
    }
    if (e.key === 'x' && currentOctave < 7) {
        currentOctave++;
        return;
    }

    const keyMap = {
        'a': `C${currentOctave}`,
        'w': `C#${currentOctave}`,
        's': `D${currentOctave}`,
        'e': `D#${currentOctave}`,
        'd': `E${currentOctave}`,
        'f': `F${currentOctave}`,
        't': `F#${currentOctave}`,
        'g': `G${currentOctave}`,
        'y': `G#${currentOctave}`,
        'h': `A${currentOctave}`,
        'u': `A#${currentOctave}`,
        'j': `B${currentOctave}`,
        'k': `C${currentOctave+1}`,
        'l': `D${currentOctave+1}`
    };

    if (keyMap[e.key]) {
        const note = keyMap[e.key];

        if (currentMode === "poly") {
            // Polyphonic mode - add new note if not already active
            if (!activeComputerKeys.has(e.key)) {
                activeComputerKeys.add(e.key);
                activeNotes.add(note);
                synth.triggerAttack(note);
                updateVUMeter(0.8);

                // Update visual keyboard
                const keyElement = document.querySelector(`.key[data-note="${note}"]`) ||
                    document.querySelector(`.black-key[data-note="${note}"]`);

                if (keyElement) {
                    keyElement.classList.add('active');
                }
            }
        } else {
            // Monophonic mode - use our consistent helper function
            if (!activeComputerKeys.has(e.key)) {
                // Clear all active computer keys in mono mode
                activeComputerKeys.clear();
                activeComputerKeys.add(e.key);

                // Use our helper function for consistent handling
                handleMonoNoteChange(note);

                // Update visual keyboard for new note
                const keyElement = document.querySelector(`.key[data-note="${note}"]`) ||
                    document.querySelector(`.black-key[data-note="${note}"]`);
                if (keyElement) {
                    keyElement.classList.add('active');
                }
            }
        }
    }
});

document.addEventListener('keyup', e => {
    const keyMap = {
        'a': `C${currentOctave}`,
        'w': `C#${currentOctave}`,
        's': `D${currentOctave}`,
        'e': `D#${currentOctave}`,
        'd': `E${currentOctave}`,
        'f': `F${currentOctave}`,
        't': `F#${currentOctave}`,
        'g': `G${currentOctave}`,
        'y': `G#${currentOctave}`,
        'h': `A${currentOctave}`,
        'u': `A#${currentOctave}`,
        'j': `B${currentOctave}`,
        'k': `C${currentOctave+1}`,
        'l': `D${currentOctave+1}`
    };

    if (keyMap[e.key]) {
        const note = keyMap[e.key];

        if (activeComputerKeys.has(e.key)) {
            activeComputerKeys.delete(e.key);

            if (currentMode === "poly") {
                activeNotes.delete(note);
                synth.triggerRelease(note);
            } else {
                // For mono mode
                activeNotes.delete(note);
                synth.triggerRelease(); // No parameter needed for mono synth
            }

            // Update visual keyboard
            const keyElement = document.querySelector(`.key[data-note="${note}"]`) ||
                document.querySelector(`.black-key[data-note="${note}"]`);

            if (keyElement) {
                keyElement.classList.remove('active');
            }
        }
    }
});

// Connect LFO controls
// Update these handlers to restart LFO when changed
document.getElementById('lfoRate').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    document.getElementById('lfoRateValue').textContent = value.toFixed(2) + ' Hz';

    // If LFO is running, restart it to apply new rate
    if (lfoActive) {
        restartLfo();
    }
});

document.getElementById('lfoAmount').addEventListener('input', function(e) {
    const amount = parseInt(e.target.value);
    document.getElementById('lfoAmountValue').textContent = `${amount}%`;

    // Only restart if LFO is active
    if (lfoDestination !== 'off') {
        restartLfo();
    }
});

document.getElementById('lfoWaveform').addEventListener('change', function(e) {
    // Only restart if LFO is active
    if (lfoDestination !== 'off') {
        restartLfo();
    }
});

// Function to stop LFO
function stopLfo() {
    if (lfoAnimationFrame) {
        cancelAnimationFrame(lfoAnimationFrame);
        lfoAnimationFrame = null;
    }
    lfoActive = false;
}

// Function to restart LFO (for when parameters change)
function restartLfo() {
    stopLfo();
    startLfo();
}

// Function to start LFO
function startLfo() {
    // Don't start if destination is off
    if (lfoDestination === 'off') return;

    lfoActive = true;

    // Get parameter info
    const input = document.getElementById(lfoDestination);
    if (!input) return;

    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const baseValue = lfoBaseValues[lfoDestination];

    // Start the animation loop
    let startTime = performance.now() / 1000; // seconds

    function animateLfo() {
        if (!lfoActive) return;

        // Get current LFO settings
        const waveform = document.getElementById('lfoWaveform').value;
        const rate = parseFloat(document.getElementById('lfoRate').value);
        const amountPercent = parseInt(document.getElementById('lfoAmount').value);
        const amount = amountPercent / 100; // Convert to 0-1

        // Calculate current time in seconds
        const currentTime = performance.now() / 1000;
        const elapsedTime = currentTime - startTime;

        // Calculate phase (0-1) based on rate
        const phase = (elapsedTime * rate) % 1;

        // Calculate LFO output (-1 to 1) based on waveform
        let lfoOutput;

        switch (waveform) {
            case 'sine':
                lfoOutput = Math.sin(phase * Math.PI * 2);
                break;
            case 'triangle':
                lfoOutput = 1 - Math.abs((phase * 4) % 4 - 2);
                break;
            case 'square':
                lfoOutput = phase < 0.5 ? 1 : -1;
                break;
            case 'sawtooth':
                lfoOutput = (phase * 2) - 1;
                break;
            case 'random':
                // Use a stable random value for each segment
                const segments = 8; // 8 segments per cycle
                const segmentIndex = Math.floor(phase * segments);
                // Generate a pseudorandom value based on segment
                lfoOutput = Math.sin(segmentIndex * 1000) * 2 - 1;
                break;
            default:
                lfoOutput = 0;
        }

        // Scale by amount
        lfoOutput *= amount;

        // Calculate modulation range (50% of parameter range)
        const range = max - min;
        const modRange = range * 0.5;

        // Calculate modulated value
        const modValue = baseValue + (lfoOutput * modRange);

        // Clamp value to parameter range
        const clampedValue = Math.max(min, Math.min(max, modValue));

        // Set the parameter value WITHOUT breaking its connection
        // We do this by:
        // 1. Updating the input value
        // 2. Setting the actual audio parameter directly
        // 3. Updating the display

        // Update input value
        input.value = clampedValue;

        // Update audio parameter directly based on destination
        updateAudioParameter(lfoDestination, clampedValue);

        // Update knob rotation using GSAP
        const knob = document.getElementById(`${lfoDestination}Knob`);
        if (knob) {
            const normalizedValue = (clampedValue - min) / range;
            const rotation = normalizedValue * 270 - 135;

            gsap.to(knob, {
                rotation: rotation,
                duration: 0.05,
                overwrite: true
            });
        }

        // Continue animation
        lfoAnimationFrame = requestAnimationFrame(animateLfo);
    }

    // Start animation
    lfoAnimationFrame = requestAnimationFrame(animateLfo);
}

// Function to update audio parameter directly
function updateAudioParameter(paramId, value) {
    switch (paramId) {
        case 'filterCutoff':
            filter.frequency.value = value;
            document.getElementById('filterCutoffValue').textContent = `${Math.round(value)} Hz`;
            break;
        case 'filterRes':
            filter.Q.value = value;
            document.getElementById('filterResValue').textContent = parseFloat(value).toFixed(1);
            break;
        case 'oscillatorLevel':
            if (currentMode === "poly") {
                synth.set({
                    volume: Tone.gainToDb(value)
                });
            } else {
                synth.volume.value = Tone.gainToDb(value);
            }
            document.getElementById('oscillatorLevelValue').textContent = value.toFixed(2);
            break;
        case 'reverbMix':
            reverb.wet.value = value;
            document.getElementById('reverbMixValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'reverbDecay':
            document.getElementById('reverbDecayValue').textContent = `${value.toFixed(1)}s`;
            // We don't change the actual reverb time continuously as it would create artifacts
            break;
        case 'delayTime':
            delay.delayTime.value = value;
            document.getElementById('delayTimeValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'delayFeedback':
            delay.feedback.value = value;
            document.getElementById('delayFeedbackValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'chorusMix':
            chorus.wet.value = value;
            document.getElementById('chorusMixValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'flangerMix':
            flanger.wet.value = value;
            document.getElementById('flangerMixValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'distortionMix':
            distortion.wet.value = value;
            document.getElementById('distortionMixValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'phaserMix':
            phaser.wet.value = value;
            document.getElementById('phaserMixValue').textContent = parseFloat(value).toFixed(2);
            break;
        case 'attack':
            if (currentMode === "poly") {
                synth.set({
                    envelope: {
                        attack: value
                    }
                });
            } else {
                synth.envelope.attack = value;
            }
            synthSettings.envelope.attack = value;
            document.getElementById('attackValue').textContent = `${value.toFixed(2)}s`;
            break;
        case 'decay':
            if (currentMode === "poly") {
                synth.set({
                    envelope: {
                        decay: value
                    }
                });
            } else {
                synth.envelope.decay = value;
            }
            synthSettings.envelope.decay = value;
            document.getElementById('decayValue').textContent = `${value.toFixed(2)}s`;
            break;
        case 'sustain':
            if (currentMode === "poly") {
                synth.set({
                    envelope: {
                        sustain: value
                    }
                });
            } else {
                synth.envelope.sustain = value;
            }
            synthSettings.envelope.sustain = value;
            document.getElementById('sustainValue').textContent = value.toFixed(2);
            break;
        case 'release':
            if (currentMode === "poly") {
                synth.set({
                    envelope: {
                        release: value
                    }
                });
            } else {
                synth.envelope.release = value;
            }
            synthSettings.envelope.release = value;
            document.getElementById('releaseValue').textContent = `${value.toFixed(2)}s`;
            break;
        case 'eqLow':
            eq.low.value = value;
            document.getElementById('eqLowValue').textContent = `${value.toFixed(1)} dB`;
            updateEqResponse();
            break;
        case 'eqMid':
            eq.mid.value = value;
            document.getElementById('eqMidValue').textContent = `${value.toFixed(1)} dB`;
            updateEqResponse();
            break;
        case 'eqHigh':
            eq.high.value = value;
            document.getElementById('eqHighValue').textContent = `${value.toFixed(1)} dB`;
            updateEqResponse();
            break;
        case 'eqMidFreq':
            document.getElementById('eqMidFreqValue').textContent = `${Math.round(value)} Hz`;
            updateEqResponse();
            break;
        case 'eqQ':
            document.getElementById('eqQValue').textContent = value.toFixed(1);
            updateEqResponse();
            break;
        case 'pan':
            masterPanner.pan.value = value;
            let displayText = "C"; // Center by default
            if (value < -0.05) {
                displayText = `L${Math.abs(Math.round(value * 100))}`;
            } else if (value > 0.05) {
                displayText = `R${Math.round(value * 100)}`;
            }
            document.getElementById('masterPanValue').textContent = displayText;
            break;
        case 'compressor':
            const compValue = value;
            masterCompressor.threshold.value = compValue * -30;
            masterCompressor.ratio.value = 1 + (compValue * 19);
            document.getElementById('compressorValue').textContent = compValue.toFixed(2);
            break;
        case 'stereoWidth':
            const widthValue = value;

            // Map 0-2 range to 0-1 width parameter
            if (widthValue <= 1) {
                // 0-1 range maps to mono-normal (0-0.5 width)
                stereoWidener.width.value = widthValue * 0.5;
            } else {
                // 1-2 range maps to normal-extra wide (0.5-1 width)
                stereoWidener.width.value = 0.5 + (widthValue - 1) * 0.5;
            }

            // Apply compensation gain
            if (widthValue > 1) {
                const compensation = 1 + (widthValue - 1) * 0.5;
                widthCompensation.gain.value = compensation;
            } else {
                widthCompensation.gain.value = 1;
            }

            document.getElementById('stereoWidthValue').textContent = widthValue.toFixed(2);
            break;
        case 'masterVolume':
            const volumeValue = value;
            masterVolume.gain.value = volumeValue;
            document.getElementById('masterVolumeValue').textContent = volumeValue.toFixed(2);
            break;
    }

    // Update visualizations if needed
    if (['filterCutoff', 'filterRes'].includes(paramId)) {
        updateFilterResponse();
    } else if (['attack', 'decay', 'sustain', 'release'].includes(paramId)) {
        updateADSRVisualizer();
    } else if (['eqLow', 'eqMid', 'eqHigh', 'eqMidFreq', 'eqQ'].includes(paramId)) {
        updateEqResponse();
    }
}


// Replace your LFO destination handler with this implementation
document.getElementById('lfoDestination').addEventListener('change', function(e) {
    // Stop any existing LFO animation
    stopLfo();

    // Get new destination
    const newDestination = e.target.value;

    // If turning off, we're done
    if (newDestination === 'off') {
        lfoDestination = 'off';
        return;
    }

    // Store the destination
    lfoDestination = newDestination;

    // Store the base value
    const input = document.getElementById(newDestination);
    if (input) {
        lfoBaseValues[newDestination] = parseFloat(input.value);
    }

    // Start the LFO
    startLfo();
});

// Completely revamped LFO Scope visualization
function initLfoScope() {
    const lfoScopeCanvas = document.getElementById('lfoScope');
    if (!lfoScopeCanvas) {
        console.error('LFO scope canvas not found');
        return;
    }

    const lfoScopeCtx = lfoScopeCanvas.getContext('2d');

    // Set canvas dimensions explicitly
    lfoScopeCanvas.width = lfoScopeCanvas.parentElement.clientWidth;
    lfoScopeCanvas.height = 80; // Fixed height

    function drawLfoScope() {
        // Get current LFO settings
        const waveform = document.getElementById('lfoWaveform').value;
        const rate = parseFloat(document.getElementById('lfoRate').value);
        const amount = parseInt(document.getElementById('lfoAmount').value) / 100;

        // Calculate dimensions
        const width = lfoScopeCanvas.width;
        const height = lfoScopeCanvas.height;
        const centerY = height / 2;

        // Clear the canvas
        lfoScopeCtx.clearRect(0, 0, width, height);

        // Draw background with gradient
        const bgGradient = lfoScopeCtx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, 'rgba(15, 15, 20, 0.8)');
        bgGradient.addColorStop(1, 'rgba(20, 20, 30, 0.8)');
        lfoScopeCtx.fillStyle = bgGradient;
        lfoScopeCtx.fillRect(0, 0, width, height);

        // Horizontal center line (slightly brighter)
        lfoScopeCtx.beginPath();
        lfoScopeCtx.moveTo(0, centerY);
        lfoScopeCtx.lineTo(width, centerY);
        lfoScopeCtx.strokeStyle = 'rgba(150, 150, 200, 0.3)';
        lfoScopeCtx.stroke();

        // Horizontal grid lines
        lfoScopeCtx.strokeStyle = 'rgba(100, 100, 150, 0.1)';
        for (let y = height / 4; y < height; y += height / 4) {
            if (Math.abs(y - centerY) < 2) continue; // Skip center line
            lfoScopeCtx.beginPath();
            lfoScopeCtx.moveTo(0, y);
            lfoScopeCtx.lineTo(width, y);
            lfoScopeCtx.stroke();
        }

        // Vertical grid lines
        for (let x = 0; x < width; x += width / 8) {
            lfoScopeCtx.beginPath();
            lfoScopeCtx.moveTo(x, 0);
            lfoScopeCtx.lineTo(x, height);
            lfoScopeCtx.stroke();
        }

        // Calculate how many cycles to show based on rate
        const cyclesShown = 2; // Show 2 complete cycles

        // Create colored gradient for the waveform
        const waveGradient = lfoScopeCtx.createLinearGradient(0, width, 0, 0);

        // Different color schemes for different waveforms
        switch (waveform) {
            case 'sine':
                waveGradient.addColorStop(0, '#00e5ff');
                waveGradient.addColorStop(0.5, '#18ffff');
                waveGradient.addColorStop(1, '#00e5ff');
                break;
            case 'square':
                waveGradient.addColorStop(0, '#ff1744');
                waveGradient.addColorStop(0.5, '#ff5252');
                waveGradient.addColorStop(1, '#ff1744');
                break;
            case 'triangle':
                waveGradient.addColorStop(0, '#00c853');
                waveGradient.addColorStop(0.5, '#69f0ae');
                waveGradient.addColorStop(1, '#00c853');
                break;
            case 'sawtooth':
                waveGradient.addColorStop(0, '#ffab00');
                waveGradient.addColorStop(0.5, '#ffd740');
                waveGradient.addColorStop(1, '#ffab00');
                break;
            case 'random':
                waveGradient.addColorStop(0, '#d500f9');
                waveGradient.addColorStop(0.5, '#ea80fc');
                waveGradient.addColorStop(1, '#d500f9');
                break;
            default:
                waveGradient.addColorStop(0, '#00e5ff');
                waveGradient.addColorStop(1, '#00e5ff');
        }

        // Draw the waveform
        lfoScopeCtx.beginPath();

        // Calculate amplitude (capped at 80% of half-height for visibility)
        const amplitude = (height / 2) * 0.8 * amount;

        // Time is based on current time for animation
        const now = Date.now() / 1000; // Current time in seconds

        // Starting position
        let startX = 0;
        let startY = 0;

        // Generate points for the waveform
        for (let x = 0; x <= width; x++) {
            // The x-position determines where in the cycle we are
            const t = (x / width) * (cyclesShown * Math.PI * 2) + (now * rate * Math.PI * 2);
            let y;

            switch (waveform) {
                case 'sine':
                    y = centerY - Math.sin(t) * amplitude;
                    break;
                case 'square':
                    y = centerY - (Math.sin(t) > 0 ? 1 : -1) * amplitude;
                    break;
                case 'triangle':
                    y = centerY - (Math.asin(Math.sin(t)) * (2 / Math.PI)) * amplitude;
                    break;
                case 'sawtooth':
                    y = centerY - ((t % (Math.PI * 2)) / Math.PI - 1) * amplitude;
                    break;
                case 'random':
                    // For random, create stable random values at fixed intervals
                    const segment = Math.floor(t / (Math.PI / 4)); // Change every 1/8th of cycle
                    // Use sine of a large number to get pseudorandom value between -1 and 1
                    const randValue = Math.sin(segment * 1000) * 2 - 1;
                    y = centerY - randValue * amplitude;
                    break;
                default:
                    y = centerY - Math.sin(t) * amplitude;
            }

            if (x === 0) {
                startX = 0;
                startY = y;
                lfoScopeCtx.moveTo(x, y);
            } else {
                lfoScopeCtx.lineTo(x, y);
            }
        }

        // Close the path for filling
        lfoScopeCtx.lineTo(width, centerY);
        lfoScopeCtx.lineTo(0, centerY);
        lfoScopeCtx.closePath();

        // Fill with semi-transparent gradient
        const fillGradient = lfoScopeCtx.createLinearGradient(0, 0, 0, height);

        switch (waveform) {
            case 'sine':
                fillGradient.addColorStop(0, 'rgba(0, 229, 255, 0.2)');
                fillGradient.addColorStop(1, 'rgba(0, 229, 255, 0.05)');
                break;
            case 'square':
                fillGradient.addColorStop(0, 'rgba(255, 23, 68, 0.2)');
                fillGradient.addColorStop(1, 'rgba(255, 23, 68, 0.05)');
                break;
            case 'triangle':
                fillGradient.addColorStop(0, 'rgba(0, 200, 83, 0.2)');
                fillGradient.addColorStop(1, 'rgba(0, 200, 83, 0.05)');
                break;
            case 'sawtooth':
                fillGradient.addColorStop(0, 'rgba(255, 171, 0, 0.2)');
                fillGradient.addColorStop(1, 'rgba(255, 171, 0, 0.05)');
                break;
            case 'random':
                fillGradient.addColorStop(0, 'rgba(213, 0, 249, 0.2)');
                fillGradient.addColorStop(1, 'rgba(213, 0, 249, 0.05)');
                break;
            default:
                fillGradient.addColorStop(0, 'rgba(0, 229, 255, 0.2)');
                fillGradient.addColorStop(1, 'rgba(0, 229, 255, 0.05)');
        }

        lfoScopeCtx.fillStyle = fillGradient;
        lfoScopeCtx.fill();

        // Redraw the path with line only for a sharp edge
        lfoScopeCtx.beginPath();
        lfoScopeCtx.moveTo(startX, startY);

        for (let x = 0; x <= width; x++) {
            const t = (x / width) * (cyclesShown * Math.PI * 2) + (now * rate * Math.PI * 2);
            let y;

            switch (waveform) {
                case 'sine':
                    y = centerY - Math.sin(t) * amplitude;
                    break;
                case 'square':
                    y = centerY - (Math.sin(t) > 0 ? 1 : -1) * amplitude;
                    break;
                case 'triangle':
                    y = centerY - (Math.asin(Math.sin(t)) * (2 / Math.PI)) * amplitude;
                    break;
                case 'sawtooth':
                    y = centerY - ((t % (Math.PI * 2)) / Math.PI - 1) * amplitude;
                    break;
                case 'random':
                    const segment = Math.floor(t / (Math.PI / 4));
                    const randValue = Math.sin(segment * 1000) * 2 - 1;
                    y = centerY - randValue * amplitude;
                    break;
                default:
                    y = centerY - Math.sin(t) * amplitude;
            }

            if (x === 0) {
                lfoScopeCtx.moveTo(x, y);
            } else {
                lfoScopeCtx.lineTo(x, y);
            }
        }

        // Set line style with glow effect
        lfoScopeCtx.strokeStyle = waveGradient;
        lfoScopeCtx.lineWidth = 2;
        lfoScopeCtx.shadowColor = waveform === 'sine' ? '#00e5ff' :
            waveform === 'square' ? '#ff1744' :
            waveform === 'triangle' ? '#00c853' :
            waveform === 'sawtooth' ? '#ffab00' : '#d500f9';
        lfoScopeCtx.shadowBlur = 5;
        lfoScopeCtx.shadowOffsetX = 0;
        lfoScopeCtx.shadowOffsetY = 0;
        lfoScopeCtx.stroke();

        // Draw current playhead position
        const cyclePosition = (now * rate) % 1;
        const playheadX = cyclePosition * (width / cyclesShown);

        lfoScopeCtx.beginPath();
        lfoScopeCtx.moveTo(playheadX, 0);
        lfoScopeCtx.lineTo(playheadX, height);
        lfoScopeCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        lfoScopeCtx.lineWidth = 1;
        lfoScopeCtx.shadowBlur = 0;
        lfoScopeCtx.stroke();

        // Annotate with frequency
        lfoScopeCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        lfoScopeCtx.font = '10px sans-serif';
        lfoScopeCtx.textAlign = 'right';
        lfoScopeCtx.fillText(`${rate.toFixed(1)} Hz`, width - 5, height - 5);

        // Continue animation
        requestAnimationFrame(drawLfoScope);
    }

    // Start the drawing loop
    drawLfoScope();

    window.addEventListener('resize', () => {
        lfoScopeCanvas.width = lfoScopeCanvas.parentElement.clientWidth;
        // Height stays fixed
    });
}

// Trigger initial LFO destination setup
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('lfoDestination').dispatchEvent(new Event('change'));
});

// Drone button event listener
document.getElementById('droneButton').addEventListener('click', toggleDrone);

// Drone octave control
document.getElementById('droneOctave').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('droneOctaveValue').textContent = value.toString();

    // If drone is active, update its pitch
    if (isDroneActive && droneSynth) {
        updateDronePitch();
    }
});

// Drone type select
document.getElementById('droneType').addEventListener('change', () => {
    // If drone is active, restart it with the new type
    if (isDroneActive) {
        stopDrone();
        startDrone();
    }
});

document.getElementById('droneVolume').addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    document.getElementById('droneVolumeValue').textContent = value.toFixed(2);

    // Update volume if drone is active
    if (isDroneActive && droneSynth) {
        droneSynth.volume.value = Tone.gainToDb(value);
    }
});

function toggleDrone() {
    const droneButton = document.getElementById('droneButton');
    const droneWave = document.getElementById('droneWave');

    if (isDroneActive) {
        stopDrone();
        droneButton.classList.remove('active');
        droneButton.innerHTML = '<i class="fas fa-power-off"></i><span>Start Drone</span>';
        droneWave.classList.remove('active');
    } else {
        startDrone();
        droneButton.classList.add('active');
        droneButton.innerHTML = '<i class="fas fa-power-off"></i><span>Stop Drone</span>';
        droneWave.classList.add('active');
    }

    isDroneActive = !isDroneActive;
}

function startDrone() {
    // Get current synth settings
    const droneType = document.getElementById('droneType').value;
    const droneVolume = parseFloat(document.getElementById('droneVolume').value);

    // Create appropriate drone based on type
    if (droneType === 'oscillator') {
        // Create a monophonic synth with current waveform
        const waveform = document.getElementById('waveform').value;

        droneSynth = new Tone.MonoSynth({
            oscillator: {
                type: waveform
            },
            envelope: {
                attack: 0.5,
                decay: 0.2,
                sustain: 1.0,
                release: 1.0
            },
            volume: Tone.gainToDb(droneVolume) // Set volume explicitly
        }).connect(filter); // Connect to the same effects chain

        // Start the drone with current note
        updateDronePitch();
        droneSynth.triggerAttack(getDroneNote());

    } else if (droneType === 'white' || droneType === 'pink') {
        // Create noise generator
        droneSynth = new Tone.Noise({
            type: droneType,
            volume: Tone.gainToDb(droneVolume) // Set volume explicitly
        }).connect(filter); // Connect to the same effects chain

        droneSynth.start();
    }

    // Visual feedback
    updateVUMeter(0.7);
}

function stopDrone() {
    if (droneSynth) {
        // For oscillator drone
        if (droneSynth instanceof Tone.MonoSynth) {
            droneSynth.triggerRelease();
            // Allow time for release to complete before disposal
            setTimeout(() => {
                droneSynth.dispose();
                droneSynth = null;
            }, 1000);
        }
        // For noise drone
        else {
            droneSynth.stop();
            droneSynth.dispose();
            droneSynth = null;
        }

        // Visual feedback
        updateVUMeter(0.3);
    }
}

function getDroneNote() {
    // Get base note from oscillator
    const oscillatorOctave = parseInt(document.getElementById('oscillatorOctave').value);
    const oscillatorSemi = parseInt(document.getElementById('oscillatorSemi').value);

    // Get drone octave offset
    const droneOctave = parseInt(document.getElementById('droneOctave').value);

    // Calculate the resulting octave (base octave + drone octave offset)
    // Default to octave 3 for the root note
    const resultOctave = 3 + oscillatorOctave + droneOctave;

    // Convert semitones to a note (C is the default)
    let rootNote = 'C';
    if (oscillatorSemi > 0) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        rootNote = notes[oscillatorSemi % 12];
    }

    // Return the complete note
    return `${rootNote}${resultOctave}`;
}

function updateDronePitch() {
    if (droneSynth && droneSynth instanceof Tone.MonoSynth) {
        // Update the pitch without re-triggering
        droneSynth.setNote(getDroneNote());
    }
}

// Add event listeners for the fine control cutoff slider
document.addEventListener('DOMContentLoaded', () => {
    const filterCutoff = document.getElementById('filterCutoff');
    const filterCutoffLow = document.getElementById('filterCutoffLow');
    const filterCutoffValue = document.getElementById('filterCutoffValue');

    // Update low slider when main slider changes
    filterCutoff.addEventListener('input', () => {
        const value = parseFloat(filterCutoff.value);
        // Only update low slider if main slider is within low range
        if (value <= 1000) {
            filterCutoffLow.value = value;
        }

        // Update filter and value display (existing functionality)
        if (filter) {
            filter.frequency.value = value;
        }
        filterCutoffValue.textContent = Math.round(value) + ' Hz';

        // Update filter response visualization (if it exists)
        if (typeof updateFilterResponse === 'function') {
            updateFilterResponse();
        }
    });

    // Update main slider when low slider changes
    filterCutoffLow.addEventListener('input', () => {
        const value = parseFloat(filterCutoffLow.value);
        filterCutoff.value = value;

        // Update filter and value display
        if (filter) {
            filter.frequency.value = value;
        }
        filterCutoffValue.textContent = Math.round(value) + ' Hz';

        // Update knob rotation
        if (knobUpdaters.filterCutoff) {
            knobUpdaters.filterCutoff(value);
        }

        // Update filter response visualization
        if (typeof updateFilterResponse === 'function') {
            updateFilterResponse();
        }
    });
});

// Add Quick Chord module octave switcher functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get octave control elements
    const decreaseOctaveBtn = document.getElementById('decreaseOctave');
    const increaseOctaveBtn = document.getElementById('increaseOctave');
    const currentOctaveDisplay = document.getElementById('currentOctave');

    // Keep track of current octave
    let currentOctave = 4; // Default starting octave

    // Function to update both displays and the actual synth octave
    function updateOctave(newOctave) {
        // Ensure octave stays within valid range
        newOctave = Math.max(1, Math.min(7, newOctave));

        // Update our local tracking variable
        currentOctave = newOctave;

        // Update the display
        currentOctaveDisplay.textContent = `C${currentOctave}`;

        // Update the synth's octave
        // This assumes there's a global octave variable that the keyboard uses
        if (typeof window.octave !== 'undefined') {
            window.octave = currentOctave;
        }

        // If there's a keyboard octave indicator, update it too
        const keyboardOctaveIndicator = document.querySelector('.octave-indicator');
        if (keyboardOctaveIndicator) {
            keyboardOctaveIndicator.textContent = currentOctave;
        }
    }

    // Decrease octave button
    decreaseOctaveBtn.addEventListener('click', function() {
        updateOctave(currentOctave - 1);
    });

    // Increase octave button
    increaseOctaveBtn.addEventListener('click', function() {
        updateOctave(currentOctave + 1);
    });

    // Hook into Z/X keys
    document.addEventListener('keydown', function(e) {
        if (e.key.toLowerCase() === 'z') {
            updateOctave(currentOctave - 1);
        } else if (e.key.toLowerCase() === 'x') {
            updateOctave(currentOctave + 1);
        }
    });

    // Initialize display
    updateOctave(currentOctave);
});

// Add Quick Chord functionality for playing chords
document.addEventListener('DOMContentLoaded', function() {
    // Chord type definitions (intervals from root)
    const chordTypes = {
        'maj': [0, 4, 7], // Major (root, major 3rd, perfect 5th)
        'min': [0, 3, 7], // Minor (root, minor 3rd, perfect 5th)
        'dim': [0, 3, 6], // Diminished (root, minor 3rd, diminished 5th)
        'aug': [0, 4, 8], // Augmented (root, major 3rd, augmented 5th)
        'maj7': [0, 4, 7, 11], // Major 7th (root, major 3rd, perfect 5th, major 7th)
        'min7': [0, 3, 7, 10], // Minor 7th (root, minor 3rd, perfect 5th, minor 7th)
        'dom7': [0, 4, 7, 10], // Dominant 7th (root, major 3rd, perfect 5th, minor 7th)
        'maj9': [0, 4, 7, 11, 14] // Major 9th (root, major 3rd, perfect 5th, major 7th, major 9th)
    };

    let selectedChordType = null;
    let selectedNote = null;
    let activeChordTimeout = null;

    // Get all chord buttons and note buttons
    const chordButtons = document.querySelectorAll('.chord-button');
    const noteButtons = document.querySelectorAll('.note-button');

    // Add click event to chord buttons
    chordButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all chord buttons
            chordButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Store selected chord type
            selectedChordType = this.getAttribute('data-chord-type');

            // If both chord type and note are selected, play the chord
            if (selectedChordType && selectedNote) {
                playChord(selectedNote, selectedChordType);
            }
        });
    });

    // Add click event to note buttons
    noteButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all note buttons
            noteButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Store selected note
            selectedNote = this.getAttribute('data-note');

            // If both chord type and note are selected, play the chord
            if (selectedChordType && selectedNote) {
                playChord(selectedNote, selectedChordType);
            }
        });
    });

    // Function to highlight keyboard keys for a chord
    function highlightChordOnKeyboard(notes) {
        // First remove any existing highlighted chord
        if (activeChordTimeout) {
            clearTimeout(activeChordTimeout);
            removeKeyboardHighlights();
        }

        // For each note in the chord, find and highlight the corresponding key
        notes.forEach(noteWithOctave => {
            // Extract note name and octave
            const noteName = noteWithOctave.replace(/\d+$/, '');
            const octave = parseInt(noteWithOctave.match(/\d+$/)[0]);

            // Find the key corresponding to this note
            // The selector will depend on how your keyboard keys are structured
            let keyElement;

            // Try different potential selectors based on common implementations
            keyElement = document.querySelector(`.piano-key[data-note="${noteName}${octave}"]`);
            if (!keyElement) keyElement = document.querySelector(`.piano-key[data-note="${noteName}"][data-octave="${octave}"]`);
            if (!keyElement) keyElement = document.querySelector(`[data-note="${noteWithOctave}"]`);
            if (!keyElement) keyElement = document.querySelector(`.key[data-note="${noteWithOctave}"]`);

            // If we found the key, highlight it
            if (keyElement) {
                keyElement.classList.add('active', 'chord-highlighted');
            }
        });

        // Set a timeout to remove highlights after a short duration
        activeChordTimeout = setTimeout(removeKeyboardHighlights, 500);
    }

    // Function to remove keyboard highlights
    function removeKeyboardHighlights() {
        document.querySelectorAll('.chord-highlighted').forEach(key => {
            key.classList.remove('active', 'chord-highlighted');
        });
    }

    // Function to play chord using Tone.js
    function playChord(note, chordType) {
        if (!chordTypes[chordType]) return;

        // Get current octave
        const octave = parseInt(document.getElementById('currentOctave').textContent.replace(/\D/g, ''));

        // Create array of notes for the chord
        const notes = chordTypes[chordType].map(interval => {
            // Convert interval to note name with octave
            const noteIndex = getNoteIndex(note);
            const newNoteIndex = noteIndex + interval;
            const newOctave = octave + Math.floor(newNoteIndex / 12);
            const newNote = getNoteFromIndex(newNoteIndex % 12);

            return `${newNote}${newOctave}`;
        });

        // Highlight the chord on the keyboard
        highlightChordOnKeyboard(notes);

        // Play the chord using the synth
        synth.triggerAttackRelease(notes, "8n");
        updateVUMeter(0.8);
    }

    // Helper function to get note index (C = 0, C# = 1, etc.)
    function getNoteIndex(note) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return notes.indexOf(note);
    }

    // Helper function to get note from index
    function getNoteFromIndex(index) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return notes[index];
    }
});