# Synth XR

Synth XR is an advanced web-based synthesizer built with modern web technologies. It provides a feature-rich environment for music creation and sound design directly in your browser.

## [Try Synth XR Live Demo](https://andrewdamelio.github.io/Synth-XR/synthXR.html)

![Synth XR Screenshot](https://github.com/user-attachments/assets/5ece25e9-0405-45fb-adf9-cba4a7a213ee)

## Features

### Synthesis Engine
- Polyphonic voice mode
- Adjustable voice count (1-8 voices)
- Detune control for rich, wide sounds
- Classic waveforms (Sine, Square, Sawtooth, Triangle)
- Pulse width modulation for square wave
- FM synthesis with harmonicity and modulation index controls
- Octave and semitone controls
- ADSR envelope (Attack, Decay, Sustain, Release) with visual representation

### Sound Processing
- Filter module with resonance control and precise cutoff adjustment
- Multiple filter types
- Advanced three-band equalizer with:
  - Low, Mid, High gain controls
  - Adjustable mid frequency
  - Q factor control
  - Visual EQ response curve
- Compression with adjustable amount
- Stereo width control
- Master volume and pan controls
- Effects chain:
  - Chorus
  - Distortion
  - Flanger
  - Phaser
  - Reverb with adjustable decay
  - Delay with time and feedback controls

### Modulation
- LFO (Low Frequency Oscillator) with multiple waveforms (Sine, Square, Triangle, Sawtooth)
- Real-time LFO waveform visualization with frequency display
- Adjustable rate and amount
- Multiple routing destinations

### Performance Tools
- Built-in sequencer with 16 programmable steps
- Drum machine with kick, snare, hi-hat, and clap with individual volume controls
- Quick chord generator with various chord types
- Drone generator with octave control and volume adjustment
- Full keyboard interface

### Visual Feedback
- Oscilloscope display
- Frequency analysis
- EQ response visualization with frequency grid and labels
- LFO waveform display with playhead position
- ADSR envelope graph
- VU meter for level monitoring

### Preset System
- Comprehensive preset management
- Categorized presets (Pads, Leads, Keys, Plucks, Bass, FX, Drums, Sequences, Ambient, Arpeggios)
- Save, load, and share custom presets
- Optimized preset browsing with category headers

### Utility Features
- MIDI device support
- Panic button for audio emergencies
- Optimized performance for modern browsers

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