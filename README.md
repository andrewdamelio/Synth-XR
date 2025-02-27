# Synth XR

Synth XR is an advanced web-based synthesizer built with modern web technologies. It provides a feature-rich environment for music creation and sound design directly in your browser.

## [Try Synth XR Live Demo](https://andrewdamelio.github.io/Synth-XR/synthXR.html)

![Synth XR Screenshot](https://github.com/user-attachments/assets/5ece25e9-0405-45fb-adf9-cba4a7a213ee)

## Features

### Synthesis Engine
- Multiple voice modes (Polyphonic, Monophonic)
- Classic waveforms (Sine, Square, Sawtooth, Triangle)
- Octave and semitone controls
- ADSR envelope (Attack, Decay, Sustain, Release)

### Sound Processing
- Filter module with resonance control and precise cutoff adjustment
- Three-band equalizer (Low, Mid, High)
- Effects chain:
  - Chorus
  - Distortion
  - Flanger
  - Phaser
  - Reverb
  - Delay

### Modulation
- LFO (Low Frequency Oscillator) with multiple waveforms
- Adjustable rate and amount
- Multiple routing destinations

### Performance Tools
- Built-in sequencer with 16 steps
- Drum machine with kick, snare, hi-hat, and clap
- Quick chord generator with various chord types
- Drone generator with different sound options
- Full keyboard interface

### Visual Feedback
- Oscilloscope display
- Frequency analysis
- EQ response visualization
- LFO waveform display
- VU meter for level monitoring

### Utility Features
- Preset system for saving and loading sounds
- MIDI device support
- Panic button for audio emergencies

## Getting Started

1. Open `synthXR.html` in a modern web browser (Chrome, Firefox, Edge, or Safari recommended)
2. Allow audio permissions when prompted
3. Click the "Start Audio" button to initialize the audio engine
4. Play using your computer keyboard or connect a MIDI controller

## Keyboard Controls

- Musical keyboard: Use the row of keys from A to ; (with W, E, T, Y, U, O, P as black keys)
- Z/X: Change octave down/up
- Space: Trigger panic (stops all sounds)

## Browser Requirements

Synth XR works best on modern browsers with Web Audio API support. For optimal performance:
- Use Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari
- Ensure your browser is up to date
- For mobile devices, use landscape orientation

## Development

Synth XR is built using:
- HTML5 and CSS3 for the UI
- JavaScript for application logic
- [Tone.js](https://tonejs.github.io/) for audio synthesis
- [Three.js](https://threejs.org/) for advanced visualizations
- [GSAP](https://greensock.com/gsap/) for animations

## License

MIT License 