/**
 * Enhanced Visualizers for Synth XR - Optimized Version
 * A modular, performant visualization system with significant improvements
 */

// ============================================================================
// CONFIGURATION MODULE - Centralized settings
// ============================================================================

const Config = {
    // Global settings
    container: {
        defaultHeight: '300px',
        defaultWidth: '100%',
        borderRadius: '16px'
    },
    performance: {
        targetFrameRate: 60,
        frameRateThreshold: 40,
        maxSkipFrames: 3,
        renderOptimizationThreshold: 8 // ms
    },
    // Visualizer-specific configurations
    visualizers: {
        spectrum: {
            barWidth: 4,
            barSpacing: 1,
            smoothingFactor: 0.5,
            frequencyScale: 'logarithmic',
            peakDecay: 0.01,
            peakHold: 30
        },
        waveform3d: {
            maxHistory: 25,
            lineWidth: 2,
            depth: 120,
            perspective: 900
        },
        vortex: {
            rings: 5,
            pointsPerRing: 180,
            rotationSpeed: 0.005,
            waveAmplitude: 20,
            waveFrequency: 6,
            waveSpeed: 0.02,
            depthScale: 600,
            ringScale: 0.85
        },
        fractal: {
            iterations: 5,
            baseSize: 150,
            rotationSpeed: 0.001,
            noiseScale: 0.01,
            maxIterations: 100,
            audioMultiplier: 2
        },
        holographic: {
            bars: 128,
            maxHeight: 120,
            barWidth: 3,
            spacing: 1,
            hologramLines: 20,
            lineSpacing: 4,
            rotationSpeed: 0.01,
            perspective: 800,
            glitchIntensity: 0.05,
            glitchInterval: 1000,
            scanlineSpeed: 0.5
        },
        caustics: {
            width: 128,
            height: 128,
            damping: 0.98,
            maxRipples: 10,
            rippleRadius: 3,
            rippleStrength: 5,
            causticIntensity: 1.2
        },
        particles: {
            particleCount: 120,
            maxSpeed: 1.5,
            connectionDistance: 100,
            connectionThreshold: 0.5,
            baseRadius: 2,
            forceFactor: 0.04,
            damping: 0.95
        },
        nebula: {
            resolution: 128,
            iterations: 16,
            diff: 0.001,
            visc: 0.001,
            dt: 0.2,
            forceStrength: 500,
            particleLimit: 15
        }
    }
};

// ============================================================================
// UTILITY MODULE
// ============================================================================

const ColorSchemes = {
    DEFAULT: {
        background: '#121212',
        primary: '#6200ea',
        secondary: '#00e5ff',
        accent1: '#ff1744',
        accent2: '#00c853',
        accent3: '#ffab00'
    },
    SUNSET: {
        background: '#0F0F12',
        primary: '#ff9800',
        secondary: '#ff5722',
        accent1: '#f44336',
        accent2: '#651fff',
        accent3: '#3d5afe'
    },
    NEON: {
        background: '#0a0a0f',
        primary: '#00fff0',
        secondary: '#ff00ff',
        accent1: '#00ff00',
        accent2: '#ffff00',
        accent3: '#ff0000'
    },
    MONOCHROME: {
        background: '#000000',
        primary: '#ffffff',
        secondary: '#aaaaaa',
        accent1: '#888888',
        accent2: '#666666',
        accent3: '#444444'
    }
};

const Utils = {
    // Linear interpolation
    lerp: (a, b, t) => a + (b - a) * t,

    // Convert hex color to rgba string
    hexToRgba: (hexColor, alpha) => {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    // Linear interpolation between two hex colors
    lerpColor: (color1, color2, factor) => {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);

        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);

        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },

    // HSL to RGB conversion
    hslToRgb: (h, s, l) => {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    },

    // Logarithmic scale
    logScale: (value, minInput, maxInput, minOutput, maxOutput) => {
        const minLog = Math.log10(minInput);
        const maxLog = Math.log10(maxInput);
        const valueLog = Math.log10(value);

        const scale = (valueLog - minLog) / (maxLog - minLog);
        return minOutput + scale * (maxOutput - minOutput);
    },

    // Convert dB to Y coordinate
    dbToY: (db, height) => {
        // Map -60dB..0dB to height..0
        return height - ((db + 60) / 60) * height;
    },

    // Normalize FFT value (input: -100 to 0, output: 0 to 1)
    normalizeFFTValue: (value) => {
        // Convert linear magnitude to dB
        let dbValue = 20 * Math.log10(Math.abs(value) + 1e-10);

        // Clamp to range
        dbValue = Math.max(-100, Math.min(0, dbValue));

        // Normalize -100dB..0dB to 0..1
        return (dbValue + 100) / 100;
    },

    // Get energy in a frequency band
    getFrequencyBandEnergy: (fftData, startBin, endBin) => {
        let sum = 0;
        let count = 0;

        for (let i = startBin; i <= endBin && i < fftData.length; i++) {
            sum += Math.abs(fftData[i]);
            count++;
        }

        if (count === 0) return 0;

        // Normalize energy (0-1)
        const avg = sum / count;

        // Convert to dB scale
        let dbValue = 20 * Math.log10(avg + 1e-10);

        // Normalize -100dB..0dB to 0..1
        let normalizedValue = (dbValue + 100) / 100;

        return Math.max(0, Math.min(1, normalizedValue));
    },

    // Create DOM element with attributes
    createElement: (tag, attributes = {}) => {
        const element = document.createElement(tag);

        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'className') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        }

        return element;
    },

    // Debounce function to prevent excessive calls
    debounce: (func, wait) => {
        let timeout;
        return function(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Apply ripple to water simulation (for caustics visualizer)
    applyRipple: (buffer, width, height, centerX, centerY, radius, strength) => {
        const radiusSq = radius * radius;

        for (let y = Math.max(0, centerY - radius); y < Math.min(height, centerY + radius); y++) {
            for (let x = Math.max(0, centerX - radius); x < Math.min(width, centerX + radius); x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distSq = dx * dx + dy * dy;

                if (distSq < radiusSq) {
                    const idx = y * width + x;
                    buffer[idx] += strength;
                }
            }
        }
    },

    // Update water simulation (for caustics visualizer)
    updateWaterSimulation: (buffer1, buffer2, width, height, damping) => {
        // Simple wave equation simulation
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;

                // Apply wave equation
                const val = (
                    buffer1[idx - 1] + // left
                    buffer1[idx + 1] + // right
                    buffer1[idx - width] + // top
                    buffer1[idx + width] - // bottom
                    4 * buffer1[idx] // center
                ) * 0.5;

                // Apply damping
                buffer2[idx] = val * damping;
            }
        }
    },

    // Diffuse velocity field (for nebula visualizer)
    diffuseVelocity: (velocityField, tmpField, res, diff, dt, iterations) => {
        const a = dt * diff * (res - 2) * (res - 2);

        for (let k = 0; k < iterations; k++) {
            for (let y = 1; y < res - 1; y++) {
                for (let x = 1; x < res - 1; x++) {
                    const i = y * res + x;
                    const i2 = i * 2;

                    const left = (y * res + (x - 1)) * 2;
                    const right = (y * res + (x + 1)) * 2;
                    const top = ((y - 1) * res + x) * 2;
                    const bottom = ((y + 1) * res + x) * 2;

                    tmpField[i2] = (velocityField[i2] + a * (
                        velocityField[left] + velocityField[right] +
                        velocityField[top] + velocityField[bottom]
                    )) / (1 + 4 * a);

                    tmpField[i2 + 1] = (velocityField[i2 + 1] + a * (
                        velocityField[left + 1] + velocityField[right + 1] +
                        velocityField[top + 1] + velocityField[bottom + 1]
                    )) / (1 + 4 * a);
                }
            }
        }
    },

    // Diffuse density field (for nebula visualizer)
    diffuseDensity: (densityField, tmpField, res, diff, dt, iterations) => {
        const a = dt * diff * (res - 2) * (res - 2);

        for (let k = 0; k < iterations; k++) {
            for (let y = 1; y < res - 1; y++) {
                for (let x = 1; x < res - 1; x++) {
                    const i = y * res + x;
                    const i4 = i * 4;

                    const left = (y * res + (x - 1)) * 4;
                    const right = (y * res + (x + 1)) * 4;
                    const top = ((y - 1) * res + x) * 4;
                    const bottom = ((y + 1) * res + x) * 4;

                    // Diffuse each color channel
                    for (let c = 0; c < 4; c++) {
                        tmpField[i4 + c] = (densityField[i4 + c] + a * (
                            densityField[left + c] + densityField[right + c] +
                            densityField[top + c] + densityField[bottom + c]
                        )) / (1 + 4 * a);
                    }
                }
            }
        }
    },

    // Advect density with velocity field (for nebula visualizer)
    advectDensity: (densityField, tmpField, velocityField, res, dt) => {
        const dtx = dt * (res - 2);
        const dty = dt * (res - 2);

        for (let y = 1; y < res - 1; y++) {
            for (let x = 1; x < res - 1; x++) {
                const i = y * res + x;
                const i2 = i * 2;
                const i4 = i * 4;

                let srcX = x - dtx * velocityField[i2];
                let srcY = y - dty * velocityField[i2 + 1];

                // Clamp to boundaries
                srcX = Math.max(0.5, Math.min(res - 1.5, srcX));
                srcY = Math.max(0.5, Math.min(res - 1.5, srcY));

                // Bilinear interpolation
                const x0 = Math.floor(srcX);
                const y0 = Math.floor(srcY);
                const x1 = x0 + 1;
                const y1 = y0 + 1;

                const s1 = srcX - x0;
                const s0 = 1 - s1;
                const t1 = srcY - y0;
                const t0 = 1 - t1;

                // Interpolate each color channel
                for (let c = 0; c < 4; c++) {
                    tmpField[i4 + c] =
                        s0 * (t0 * densityField[(y0 * res + x0) * 4 + c] +
                            t1 * densityField[(y1 * res + x0) * 4 + c]) +
                        s1 * (t0 * densityField[(y0 * res + x1) * 4 + c] +
                            t1 * densityField[(y1 * res + x1) * 4 + c]);
                }
            }
        }
    },

    // Get Viridis colormap color
    getViridisColor: (value) => {
        // Viridis colormap implementation
        // value should be between 0 and 1
        const colors = [
            [68, 1, 84], // Dark purple
            [72, 40, 120], // Purple
            [62, 83, 160], // Blue
            [49, 127, 184], // Light blue
            [35, 169, 131], // Teal
            [116, 196, 67], // Green
            [211, 200, 0], // Yellow
            [253, 231, 37] // Bright yellow
        ];

        if (value <= 0) return `rgb(${colors[0].join(',')})`;
        if (value >= 1) return `rgb(${colors[colors.length - 1].join(',')})`;

        const index = value * (colors.length - 1);
        const i = Math.floor(index);
        const t = index - i;

        const r = Math.round(colors[i][0] * (1 - t) + colors[i + 1][0] * t);
        const g = Math.round(colors[i][1] * (1 - t) + colors[i + 1][1] * t);
        const b = Math.round(colors[i][2] * (1 - t) + colors[i + 1][2] * t);

        return `rgb(${r},${g},${b})`;
    },

    // Create an OffscreenCanvas for static content
    createOffscreenCanvas: (width, height) => {
        // Use OffscreenCanvas if available, otherwise use a regular canvas
        try {
            return new OffscreenCanvas(width, height);
        } catch (e) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            return canvas;
        }
    }
};

// ============================================================================
// PERFORMANCE MONITORING MODULE
// ============================================================================

class PerformanceMonitor {
    constructor(config = Config.performance) {
        this.config = config;
        this.frameCount = 0;
        this.startTime = 0;
        this.fps = 0;
        this.renderTimes = [];
        this.averageRenderTime = 0;
        this.lastFrameTime = 0;
        this.skipFrames = 0;
        this.targetFrameRate = this.config.targetFrameRate;
        this.frameRateThreshold = this.config.frameRateThreshold;
        this.maxSkipFrames = this.config.maxSkipFrames;
    }

    reset() {
        this.frameCount = 0;
        this.startTime = performance.now();
        this.renderTimes = [];
        this.lastFrameTime = performance.now();
        this.skipFrames = 0;
    }

    shouldSkipFrame() {
        const currentFrame = this.frameCount;
        return this.skipFrames > 0 && currentFrame % (this.skipFrames + 1) !== 0;
    }

    trackFrame(renderTime) {
        const now = performance.now();
        this.frameCount++;

        // Calculate FPS every second
        const elapsedTime = now - this.startTime;
        if (elapsedTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / elapsedTime);

            // Reset counters
            this.frameCount = 0;
            this.startTime = now;

            // Adaptive performance: if FPS drops too low, start skipping frames
            if (this.fps < this.frameRateThreshold) {
                this.skipFrames = Math.min(this.skipFrames + 1, this.maxSkipFrames);
            } else if (this.fps > this.targetFrameRate && this.skipFrames > 0) {
                this.skipFrames = Math.max(this.skipFrames - 1, 0);
            }
        }

        // Track render time
        this.renderTimes.push(renderTime);

        // Keep only the last 60 render times
        if (this.renderTimes.length > 60) {
            this.renderTimes.shift();
        }

        // Calculate average render time
        this.averageRenderTime = this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;

        // Update last frame time
        this.lastFrameTime = now;
    }

    drawInfo(ctx, width, height) {
        // Draw performance overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 180, 60);

        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';

        ctx.fillText(`FPS: ${this.fps}`, 20, 30);
        ctx.fillText(`Render: ${this.averageRenderTime.toFixed(2)}ms`, 20, 50);

        // Color code the performance feedback
        let statusColor;
        if (this.fps >= 55) {
            statusColor = 'lime';
        } else if (this.fps >= 30) {
            statusColor = 'yellow';
        } else {
            statusColor = 'red';
        }

        ctx.fillStyle = statusColor;
        ctx.fillRect(160, 25, 20, 10);
    }
}

// ============================================================================
// AUDIO ANALYSIS MODULE
// ============================================================================

class AudioAnalyzer {
    constructor(options = {}) {
        // Configuration
        this.useGlobalAnalyzers = options.useGlobalAnalyzers !== false;
        this.bufferSize = options.bufferSize || 1024;

        // Use the global analyzers with optimized buffer sizes
        if (this.useGlobalAnalyzers) {
            this.waveform = window.waveform;
            this.fft = window.fft;
        }

        // Create backup analyzers only if global ones don't exist
        if (!this.waveform) {
            console.warn('Global waveform analyzer not found, creating an optimized one');
            this.createWaveformAnalyzer();
        }

        if (!this.fft) {
            console.warn('Global FFT analyzer not found, creating an optimized one');
            this.createFFTAnalyzer();
        }

        console.log('Audio analyzers initialized:',
            !!this.waveform ? 'Waveform connected' : 'Waveform missing',
            !!this.fft ? 'FFT connected' : 'FFT missing');
    }

    createWaveformAnalyzer() {
        if (typeof Tone !== 'undefined' && Tone.Waveform) {
            // Use smaller buffer for better performance
            this.waveform = new Tone.Waveform(this.bufferSize);

            // Try to connect to master output
            if (Tone.getDestination) {
                Tone.getDestination().connect(this.waveform);
            }
        } else {
            // Fallback: create a dummy analyzer for testing or when Tone is not available
            this.waveform = {
                getValue: () => new Float32Array(this.bufferSize).map(() => Math.random() * 2 - 1)
            };
            console.warn('Using fallback waveform analyzer');
        }
    }

    createFFTAnalyzer() {
        if (typeof Tone !== 'undefined' && Tone.FFT) {
            // Use smaller buffer for better performance
            this.fft = new Tone.FFT(this.bufferSize);

            // Try to connect to master output
            if (Tone.getDestination) {
                Tone.getDestination().connect(this.fft);
            }
        } else {
            // Fallback: create a dummy analyzer for testing or when Tone is not available
            this.fft = {
                getValue: () => {
                    const data = new Float32Array(this.bufferSize);
                    // Create a fake spectrum with decreasing values
                    for (let i = 0; i < data.length; i++) {
                        data[i] = Math.random() * 0.5 * (1 - i / data.length);
                    }
                    return data;
                }
            };
            console.warn('Using fallback FFT analyzer');
        }
    }

    getFFTData() {
        return this.fft ? this.fft.getValue() : new Float32Array(this.bufferSize);
    }

    getWaveformData() {
        return this.waveform ? this.waveform.getValue() : new Float32Array(this.bufferSize);
    }

    getAudioEnergy() {
        const fftData = this.getFFTData();

        return {
            bass: Utils.getFrequencyBandEnergy(fftData, 0, 10),
            mid: Utils.getFrequencyBandEnergy(fftData, 20, 60),
            treble: Utils.getFrequencyBandEnergy(fftData, 80, 120)
        };
    }
}

// ============================================================================
// RENDER CACHE MODULE
// ============================================================================

class RenderCache {
    constructor() {
        this.caches = {
            waveform3d: {
                waveHistory: [],
                maxHistoryLength: Config.visualizers.waveform3d.maxHistory
            }
        };

        // Track static canvases
        this.staticCanvases = new Map();
    }

    getCache(visualizerId) {
        if (!this.caches[visualizerId]) {
            this.caches[visualizerId] = {};
        }
        return this.caches[visualizerId];
    }

    clearCache(visualizerId) {
        if (visualizerId === 'waveform3d') {
            this.caches.waveform3d.waveHistory = [];
        } else if (this.caches[visualizerId]) {
            this.caches[visualizerId] = {};
        }

        // Clear any static canvases for this visualizer
        if (this.staticCanvases.has(visualizerId)) {
            this.staticCanvases.delete(visualizerId);
        }
    }

    getStaticCanvas(visualizerId, width, height) {
        if (!this.staticCanvases.has(visualizerId)) {
            const canvas = Utils.createOffscreenCanvas(width, height);
            this.staticCanvases.set(visualizerId, canvas);
        }
        return this.staticCanvases.get(visualizerId);
    }

    clearAllCaches() {
        Object.keys(this.caches).forEach(id => this.clearCache(id));
        this.staticCanvases.clear();
    }
}

// ============================================================================
// UI MANAGEMENT MODULE
// ============================================================================

class UIManager {
    constructor(container, colorSchemes, callbacks) {
        this.container = container;
        this.colorSchemes = colorSchemes;
        this.callbacks = callbacks;
        this.toolbar = null;
        this.selectorElement = null;
        this.fullscreenButton = null;
        this.debugButton = null;
        this.isFullscreen = false;
        this.originalStyles = {};
    }

    createToolbar() {
        this.toolbar = Utils.createElement('div', {
            className: 'visualizer-toolbar'
        });

        // Style the toolbar
        Object.assign(this.toolbar.style, {
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px',
            borderRadius: '8px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            zIndex: '100',
            transition: 'opacity 0.3s ease',
            opacity: '0.3'
        });

        // Make toolbar more visible on hover
        this.toolbar.addEventListener('mouseenter', () => {
            this.toolbar.style.opacity = '1';
        });

        this.toolbar.addEventListener('mouseleave', () => {
            this.toolbar.style.opacity = '0.3';
        });

        // Create left controls group
        const leftControls = Utils.createElement('div', {
            className: 'visualizer-left-controls'
        });

        // Create right controls group
        const rightControls = Utils.createElement('div', {
            className: 'visualizer-right-controls'
        });

        // Add visualizer selector
        const visualizerSelector = this.createVisualizerSelector();
        leftControls.appendChild(visualizerSelector);

        // Add color scheme selector
        const colorSchemeSelector = this.createColorSchemeSelector();
        leftControls.appendChild(colorSchemeSelector);

        // Add debug toggle
        // this.createDebugToggle(leftControls);

        // Add controls to toolbar
        this.toolbar.appendChild(leftControls);
        this.toolbar.appendChild(rightControls);

        // Add toolbar to container
        this.container.appendChild(this.toolbar);
    }

    createVisualizerSelector() {
        const visualizerSelector = Utils.createElement('select', {
            className: 'visualizer-selector'
        });

        // Style the selector
        Object.assign(visualizerSelector.style, {
            background: 'rgba(30, 30, 30, 0.7)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
        });

        // Add visualizer options
        const visualizerOptions = [{
                id: 'spectrum',
                label: 'Spectrum Analyzer'
            },
            {
                id: 'waveform3d',
                label: '3D Waveform'
            },
            {
                id: 'vortex',
                label: 'Vortex Tunnel'
            },
            {
                id: 'particles',
                label: 'Particle Constellation'
            },
            {
                id: 'nebula',
                label: 'Audio Nebula'
            },
            {
                id: 'holographic',
                label: 'Holographic UI'
            },
            {
                id: 'caustics',
                label: 'Caustic Waters'
            },
            {
                id: 'fractal',
                label: 'Fractal Aurora'
            }
        ];

        visualizerOptions.forEach(option => {
            const optionElement = Utils.createElement('option', {
                value: option.id
            });
            optionElement.textContent = option.label;
            visualizerSelector.appendChild(optionElement);
        });

        // Handle visualizer change
        visualizerSelector.addEventListener('change', () => {
            if (this.callbacks.onVisualizerChange) {
                this.callbacks.onVisualizerChange(visualizerSelector.value);
            }
        });

        this.selectorElement = visualizerSelector;
        return visualizerSelector;
    }

    createColorSchemeSelector() {
        const colorSchemeSelector = Utils.createElement('select', {
            className: 'color-scheme-selector'
        });

        // Style the color scheme selector
        Object.assign(colorSchemeSelector.style, {
            background: 'rgba(30, 30, 30, 0.7)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '14px',
            marginLeft: '10px',
            outline: 'none',
            cursor: 'pointer'
        });

        // Add color scheme options
        Object.keys(this.colorSchemes).forEach(scheme => {
            const optionElement = Utils.createElement('option', {
                value: scheme
            });
            optionElement.textContent = scheme.charAt(0).toUpperCase() + scheme.slice(1).toLowerCase();
            colorSchemeSelector.appendChild(optionElement);
        });

        // Handle color scheme change
        colorSchemeSelector.addEventListener('change', () => {
            if (this.callbacks.onColorSchemeChange) {
                this.callbacks.onColorSchemeChange(colorSchemeSelector.value);
            }
        });

        return colorSchemeSelector;
    }

    createDebugToggle(parentElement) {
        // Create debug toggle button
        this.debugButton = Utils.createElement('button', {
            className: 'visualizer-debug-button',
            textContent: 'Debug: OFF'
        });

        // Style the debug button
        Object.assign(this.debugButton.style, {
            background: 'rgba(30, 30, 30, 0.7)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '14px',
            marginLeft: '10px',
            outline: 'none',
            cursor: 'pointer'
        });

        // Toggle debug mode
        this.debugButton.addEventListener('click', () => {
            window.DEBUG_VISUALIZERS = !window.DEBUG_VISUALIZERS;
            this.debugButton.textContent = `Debug: ${window.DEBUG_VISUALIZERS ? 'ON' : 'OFF'}`;

            if (this.callbacks.onDebugToggle) {
                this.callbacks.onDebugToggle(window.DEBUG_VISUALIZERS);
            }
        });

        parentElement.appendChild(this.debugButton);
    }

    addFullscreenButton() {
        // Check if device is mobile before adding fullscreen button
        const isMobile = window.innerWidth <= 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Create fullscreen button
        this.fullscreenButton = Utils.createElement('button', {
            className: 'visualizer-fullscreen-button'
        });
        this.fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';

        // Style the fullscreen button
        Object.assign(this.fullscreenButton.style, {
            position: 'absolute',
            bottom: '15px',
            right: '15px',
            background: 'rgba(30, 30, 30, 0.7)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '16px',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '100',
            transition: 'opacity 0.3s ease, background 0.2s ease',
            opacity: '0.5',
            display: !isMobile ? 'none' : 'flex'
        });

        // Make button more visible on hover
        this.fullscreenButton.addEventListener('mouseenter', () => {
            this.fullscreenButton.style.opacity = '1';
            this.fullscreenButton.style.background = 'rgba(60, 60, 60, 0.8)';
        });

        this.fullscreenButton.addEventListener('mouseleave', () => {
            this.fullscreenButton.style.opacity = '0.5';
            this.fullscreenButton.style.background = 'rgba(30, 30, 30, 0.7)';
        });

        // Handle fullscreen toggle
        this.fullscreenButton.addEventListener('click', (event) => {
            // Prevent event propagation to stop the container click handler
            event.stopPropagation();

            if (this.callbacks.onFullscreenToggle) {
                this.callbacks.onFullscreenToggle();
            }
        });

        // Add button to container
        this.container.appendChild(this.fullscreenButton);
    }

    updateVisualizerSelector(id) {
        if (this.selectorElement && this.selectorElement.value !== id) {
            this.selectorElement.value = id;
        }
    }

    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }

        this.isFullscreen = !this.isFullscreen;
    }

    enterFullscreen() {
        // Store original styles before going fullscreen
        this.originalStyles = {
            position: this.container.style.position,
            top: this.container.style.top,
            left: this.container.style.left,
            width: this.container.style.width,
            height: this.container.style.height,
            zIndex: this.container.style.zIndex,
            borderRadius: this.container.style.borderRadius
        };

        // Try browser-specific fullscreen methods
        const requestFullScreen =
            this.container.requestFullscreen ||
            this.container.mozRequestFullScreen || // Firefox
            this.container.webkitRequestFullscreen || // Chrome/Safari
            this.container.msRequestFullscreen; // IE/Edge

        if (requestFullScreen) {
            requestFullScreen.call(this.container);
        } else {
            // Fallback to manual fullscreen
            this.container.style.position = 'fixed';
            this.container.style.top = '0';
            this.container.style.left = '0';
            this.container.style.width = '100vw';
            this.container.style.height = '100vh';
            this.container.style.zIndex = '9999';
            this.container.style.borderRadius = '0';
        }

        this.fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>';
    }

    exitFullscreen() {
        // Restore original styles
        Object.keys(this.originalStyles).forEach(prop => {
            this.container.style[prop] = this.originalStyles[prop];
        });

        this.fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';

        // Use standard fullscreen exit method
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
    }

    setupToggle(toggleSelector = '#visualizerToggle') {
        const toggle = document.querySelector(toggleSelector);
        if (!toggle) return;

        // Store original container references
        let originalContainer = null;
        let originalParent = null;

        // Make sure toggle button text reflects hidden state initially
        if (toggle.querySelector('span')) {
            toggle.querySelector('span').textContent = 'Show Advanced Visualizations';
        }

        // Replace any existing handler
        const oldClickHandler = toggle.onclick;

        toggle.onclick = () => {
            // Call original handler if it exists
            if (oldClickHandler) {
                oldClickHandler.call(toggle);
            } else {
                // Fallback if old handler not found
                toggle.classList.toggle('active');
            }

            const isExpanded = toggle.classList.contains('active');
            let container = document.getElementById('enhanced-visualizers-container');

            if (isExpanded) {
                // Show visualizers
                if (originalContainer) {
                    // Restore the previously removed container
                    this.restoreContainer(originalContainer, originalParent);
                    container = originalContainer;
                    this.reinitializeVisualizers();
                } else {
                    // Initialize visualizers if not already done
                    const visualizers = initEnhancedVisualizers();
                    container = visualizers.container;
                }

                if (container) {
                    container.style.display = 'block';
                    container.style.maxHeight = '500px';
                    container.style.marginTop = '20px';
                    container.style.marginBottom = '20px';
                    container.style.opacity = '1';
                }

                if (toggle.querySelector('span')) {
                    toggle.querySelector('span').textContent = 'Hide Advanced Visualizations';
                }
            } else {
                // Hide visualizers
                if (window.enhancedVisualizers && window.enhancedVisualizers.isInitialized) {
                    // Stop all animation frames
                    window.enhancedVisualizers.visualizers.forEach((visualizer) => {
                        visualizer.stop();
                    });

                    if (container) {
                        // Store original container and its parent for future restoration
                        originalContainer = container;
                        originalParent = container.parentNode;

                        // Remove from DOM
                        container.parentNode.removeChild(container);
                    }
                }

                if (toggle.querySelector('span')) {
                    toggle.querySelector('span').textContent = 'Show Advanced Visualizations';
                }
            }
        };
    }

    restoreContainer(container, parent) {
        if (!container) return;

        if (parent) {
            parent.appendChild(container);
        } else {
            // Fallback - add to a common parent
            const advanceVisualizer = document.querySelector('.advance-visualizer');
            if (advanceVisualizer) {
                advanceVisualizer.appendChild(container);
            } else {
                const synthContainer = document.querySelector('.synth-container');
                if (synthContainer) {
                    synthContainer.appendChild(container);
                } else {
                    document.body.appendChild(container);
                }
            }
        }
    }

    reinitializeVisualizers() {
        if (!window.enhancedVisualizers) return;

        try {
            // Force reinitialization
            const activeId = window.enhancedVisualizers.activeVisualizerId;

            // Reset the canvases and contexts
            window.enhancedVisualizers.canvases = new Map();
            window.enhancedVisualizers.contexts = new Map();

            // Remove any existing canvas elements
            const container = window.enhancedVisualizers.container;
            while (container.querySelector('canvas')) {
                container.removeChild(container.querySelector('canvas'));
            }

            // Force all visualizers to reinitialize
            window.enhancedVisualizers.visualizers.forEach(visualizer => {
                visualizer.initialized = false;
                visualizer.cleanup && visualizer.cleanup();
            });

            // Completely recreate the problematic Nebula visualizer
            if (window.enhancedVisualizers.visualizers.has('nebula')) {
                // Delete old instance and create a fresh one
                window.enhancedVisualizers.visualizers.delete('nebula');
                window.enhancedVisualizers.visualizers.set('nebula', new NebulaVisualizer(window.enhancedVisualizers));
            }

            // Reset render cache
            window.enhancedVisualizers.renderCache.clearAllCaches();

            // Reset performance monitor
            window.enhancedVisualizers.performance.reset();

            // This will create new canvas elements
            window.enhancedVisualizers.showVisualizer(activeId);

            // Force a resize
            window.enhancedVisualizers._handleResize();
        } catch (error) {
            console.error("Error reinitializing visualizers:", error);

            // Fall back to complete recreation
            window.enhancedVisualizers = null;
            initEnhancedVisualizers();
        }
    }
}

// ============================================================================
// VISUALIZER BASE MODULE
// ============================================================================

class VisualizerBase {
    constructor(core, id) {
        this.core = core;
        this.id = id;
        this.animationFrame = null;
        this.options = {};
        this.initialized = false;
        this.lastRenderTime = 0;
        this.staticElements = new Map();
    }

    init() {
        // Override in subclasses to initialize visualizer-specific data
        this.initialized = true;
    }

    start() {
        if (!this.initialized) {
            this.init();
        }

        this.lastRenderTime = 0;
        this.renderLoop();
    }

    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    cleanup() {
        // Free resources and reset state
        this.staticElements.clear();
        this.initialized = false;
    }

    // Clear the canvas with the current background color
    clearCanvas(ctx, canvas) {
        ctx.fillStyle = this.core.colorScheme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Create a static canvas for elements that don't change every frame
    createStaticCanvas(name, drawCallback) {
        const canvas = this.core.canvases.get(this.id);
        if (!canvas) return null;

        const staticCanvas = Utils.createOffscreenCanvas(canvas.width, canvas.height);
        const staticCtx = staticCanvas.getContext('2d');

        // Draw the static content
        if (drawCallback && typeof drawCallback === 'function') {
            drawCallback(staticCtx, staticCanvas.width, staticCanvas.height);
        }

        // Store in the map
        this.staticElements.set(name, staticCanvas);

        return staticCanvas;
    }

    // Get a static canvas, creating it if needed
    getStaticCanvas(name, drawCallback) {
        if (this.staticElements.has(name)) {
            return this.staticElements.get(name);
        }

        return this.createStaticCanvas(name, drawCallback);
    }

    // Safe rendering with error handling
    safeRender(ctx, canvas) {
        try {
            this.render(ctx, canvas);
        } catch (error) {
            console.error(`Error rendering ${this.id} visualizer:`, error);
            // Draw a simple error state
            this.renderErrorState(ctx, canvas);
        }
    }

    // Draw an error state when rendering fails
    renderErrorState(ctx, canvas) {
        this.clearCanvas(ctx, canvas);

        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Visualizer Error: ${this.id}`, canvas.width / 2, canvas.height / 2);
        ctx.fillText('Try switching to another visualizer', canvas.width / 2, canvas.height / 2 + 30);
    }

    renderLoop(timestamp) {
        if (!this.lastRenderTime) this.lastRenderTime = timestamp;
        const elapsed = timestamp - this.lastRenderTime;

        // Skip frame if needed for performance
        if (!this.core.performance.shouldSkipFrame()) {
            // Get canvas and context
            const canvas = this.core.canvases.get(this.id);
            const ctx = this.core.contexts.get(this.id);

            if (canvas && ctx) {
                // Measure render time
                const renderStart = performance.now();

                // Render the visualizer safely
                this.safeRender(ctx, canvas);

                // Track render time
                const renderTime = performance.now() - renderStart;
                this.core.performance.trackFrame(renderTime);

                // Add performance info if in debug mode
                if (window.DEBUG_VISUALIZERS) {
                    this.core.performance.drawInfo(ctx, canvas.width, canvas.height);
                }

                // Update last render time if we actually rendered
                this.lastRenderTime = timestamp;
            }
        }

        // Schedule next frame with optimized timing
        this.animationFrame = requestAnimationFrame((ts) => this.renderLoop(ts));
    }

    render(ctx, canvas) {
        // Override in subclasses to implement specific rendering logic
        throw new Error(`Render method must be implemented in visualizer ${this.id}`);
    }

    drawFrequencyGrid(ctx, width, height) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Vertical grid lines at key frequencies
        const frequencies = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 15000];

        frequencies.forEach(freq => {
            const x = Utils.logScale(freq, 20, 20000, 0, width);

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            // Label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';

            const label = freq >= 1000 ? `${freq/1000}k` : freq;
            ctx.fillText(label, x, height - 5);
        });

        // Horizontal grid lines
        const dbLevels = [-60, -40, -20, 0];

        dbLevels.forEach(db => {
            const y = Utils.dbToY(db, height);

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${db} dB`, 5, y - 3);
        });
    }

    draw3DGrid(ctx, width, height, layers) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;

        // Calculate grid gap
        const waveGap = height / (layers + 1);

        // Draw horizontal lines
        for (let z = 1; z <= layers; z++) {
            const y = height - waveGap * z;

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw vertical grid lines
        const verticalLines = 12;

        for (let x = 0; x <= verticalLines; x++) {
            const xPos = (x / verticalLines) * width;

            ctx.beginPath();
            ctx.moveTo(xPos, height);
            ctx.lineTo(xPos, height - waveGap * layers);
            ctx.stroke();
        }
    }
}

// ============================================================================
// SPECTRUM ANALYZER VISUALIZER
// ============================================================================

class SpectrumVisualizer extends VisualizerBase {
    constructor(core) {
        super(core, 'spectrum');
        this.options = {
            ...Config.visualizers.spectrum
        };

        this.options.peaks = [];
        this.options.smoothedMagnitudes = null;
    }

    init() {
        // Create a static canvas for the frequency grid
        this.createStaticCanvas('grid', (ctx, width, height) => {
            this.drawFrequencyGrid(ctx, width, height);
        });

        this.initialized = true;
    }

    render(ctx, canvas) {
        // Get FFT data
        const fftData = this.core.audio.getFFTData();

        // Clear canvas
        this.clearCanvas(ctx, canvas);

        // Draw the static frequency grid
        const gridCanvas = this.getStaticCanvas('grid');
        if (gridCanvas) {
            ctx.drawImage(gridCanvas, 0, 0);
        }

        // Calculate bar width based on canvas width
        const totalBars = Math.min(fftData.length / 4, Math.floor(canvas.width / (this.options.barWidth + this.options.barSpacing)));
        this.options.barWidth = Math.max(2, Math.floor(canvas.width / totalBars) - this.options.barSpacing);

        // Initialize peaks array if needed
        if (!this.options.peaks || this.options.peaks.length !== totalBars) {
            this.options.peaks = new Array(totalBars).fill(0);
        }

        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, this.core.colorScheme.primary);
        gradient.addColorStop(0.5, this.core.colorScheme.secondary);
        gradient.addColorStop(1, this.core.colorScheme.accent1);

        // Initialize smoothed magnitudes if needed
        if (!this.options.smoothedMagnitudes || this.options.smoothedMagnitudes.length !== totalBars) {
            this.options.smoothedMagnitudes = new Array(totalBars).fill(0);
        }

        // Draw frequency bars
        ctx.fillStyle = gradient;

        // Logarithmic or linear frequency scale
        const scale = this.options.frequencyScale === 'logarithmic' ? 'log' : 'linear';

        for (let i = 0; i < totalBars; i++) {
            let barIndex;

            if (scale === 'log') {
                // Logarithmic scale gives more detail to lower frequencies
                const logIndex = Math.round(Math.pow(i / totalBars, 2) * (fftData.length / 4));
                barIndex = Math.max(0, Math.min(fftData.length - 1, logIndex));
            } else {
                // Linear scale
                barIndex = Math.round((i / totalBars) * (fftData.length / 4));
            }

            // Get value and normalize
            const value = fftData[barIndex];
            const magnitude = Utils.normalizeFFTValue(value);

            // Apply smoothing from previous frame
            const smoothed = this.options.smoothedMagnitudes[i];
            this.options.smoothedMagnitudes[i] = smoothed * this.options.smoothingFactor +
                magnitude * (1 - this.options.smoothingFactor);

            const smoothedMagnitude = this.options.smoothedMagnitudes[i];

            // Calculate bar height
            const barHeight = smoothedMagnitude * canvas.height;

            // Update peak
            if (barHeight > this.options.peaks[i]) {
                this.options.peaks[i] = barHeight;
            } else {
                // Decay peak
                this.options.peaks[i] -= canvas.height * this.options.peakDecay;
            }

            // Ensure peak doesn't go below the bar
            this.options.peaks[i] = Math.max(barHeight, this.options.peaks[i]);

            // Draw bar
            const barX = i * (this.options.barWidth + this.options.barSpacing);
            const barY = canvas.height - barHeight;

            ctx.fillRect(barX, barY, this.options.barWidth, barHeight);

            // Draw peak with a different color
            ctx.fillStyle = this.core.colorScheme.accent3;
            ctx.fillRect(barX, canvas.height - this.options.peaks[i] - 2, this.options.barWidth, 2);
            ctx.fillStyle = gradient;
        }
    }
}

// ============================================================================
// WAVEFORM 3D VISUALIZER
// ============================================================================

class Waveform3DVisualizer extends VisualizerBase {
    constructor(core) {
        super(core, 'waveform3d');
        this.options = {
            ...Config.visualizers.waveform3d
        };
        this.options.waveHistory = [];
    }

    init() {
        // Use cached history if available
        const cache = this.core.renderCache.getCache('waveform3d');
        if (cache.waveHistory) {
            this.options.waveHistory = cache.waveHistory;
        } else {
            this.options.waveHistory = [];
        }

        // Create a static canvas for the 3D grid
        this.createStaticCanvas('grid', (ctx, width, height) => {
            this.draw3DGrid(ctx, width, height, this.options.maxHistory);
        });

        this.initialized = true;
    }

    render(ctx, canvas) {
        // Get waveform data
        const waveData = this.core.audio.getWaveformData();

        // Clear canvas
        this.clearCanvas(ctx, canvas);

        // Add current waveform to history
        this.options.waveHistory.unshift(waveData.slice(0));

        // Limit history length
        if (this.options.waveHistory.length > this.options.maxHistory) {
            this.options.waveHistory.pop();
        }

        // Update cache
        const cache = this.core.renderCache.getCache('waveform3d');
        cache.waveHistory = this.options.waveHistory;

        // Draw the static 3D grid
        const gridCanvas = this.getStaticCanvas('grid');
        if (gridCanvas) {
            ctx.drawImage(gridCanvas, 0, 0);
        }

        // Calculate wave gap based on available height
        const waveGap = canvas.height / (this.options.maxHistory + 1);

        // Draw from back to front (oldest to newest)
        for (let z = this.options.waveHistory.length - 1; z >= 0; z--) {
            const wave = this.options.waveHistory[z];
            const depth = z / this.options.waveHistory.length; // 1 = back, 0 = front

            // Calculate y position with perspective
            const y = canvas.height - waveGap * (this.options.waveHistory.length - z);

            // Draw the waveform
            ctx.beginPath();

            // Set line style with perspective
            ctx.lineWidth = this.options.lineWidth * (1 - depth * 0.7);

            // Create gradient for line color
            const colorDepth = 1 - depth;
            const r = parseInt(Utils.lerp(50, parseInt(this.core.colorScheme.secondary.slice(1, 3), 16), colorDepth));
            const g = parseInt(Utils.lerp(50, parseInt(this.core.colorScheme.secondary.slice(3, 5), 16), colorDepth));
            const b = parseInt(Utils.lerp(150, parseInt(this.core.colorScheme.secondary.slice(5, 7), 16), colorDepth));

            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;

            // Apply shadow for older lines
            if (z < this.options.waveHistory.length - 10) {
                ctx.shadowColor = this.core.colorScheme.secondary;
                ctx.shadowBlur = 5 * (1 - depth);
            } else {
                ctx.shadowBlur = 0;
            }

            // Draw the line
            for (let i = 0; i < wave.length; i += 2) {
                const x = (i / wave.length) * canvas.width;
                const waveY = wave[i] * (canvas.height / 4) * (1 - depth * 0.5);

                if (i === 0) {
                    ctx.moveTo(x, y + waveY);
                } else {
                    ctx.lineTo(x, y + waveY);
                }
            }

            ctx.stroke();
        }
    }
}

// ============================================================================
// VORTEX TUNNEL VISUALIZER 
// ============================================================================

class VortexVisualizer extends VisualizerBase {
    constructor(core) {
        super(core, 'vortex');
        this.options = {
            ...Config.visualizers.vortex
        };
        this.options.time = 0;
        this.options.points = [];
    }

    init() {
        this.options.points = [];

        // Reset time
        this.options.time = 0;

        // Pre-calculate all points
        for (let ring = 0; ring < this.options.rings; ring++) {
            const ringPoints = [];
            const radius = 100 * Math.pow(this.options.ringScale, ring);

            for (let p = 0; p < this.options.pointsPerRing; p++) {
                const angle = (p / this.options.pointsPerRing) * Math.PI * 2;
                ringPoints.push({
                    angle: angle,
                    radius: radius,
                    z: 0, // Will be calculated during rendering
                    projection: {
                        x: 0,
                        y: 0,
                        scale: 0
                    } // For 3D projection
                });
            }

            this.options.points.push(ringPoints);
        }

        this.initialized = true;
    }

    render(ctx, canvas) {
        // Get audio data
        const energy = this.core.audio.getAudioEnergy();
        const fftData = this.core.audio.getFFTData();

        // Clear canvas
        this.clearCanvas(ctx, canvas);

        // Update time based on audio
        this.options.time += this.options.rotationSpeed * (1 + energy.bass * 2);

        // Calculate center of the tunnel
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Calculate amplitude modification from audio
        const amplitude = this.options.waveAmplitude * (1 + energy.bass * 3);
        const waveFreq = this.options.waveFrequency * (1 + energy.mid);
        const depthMod = 1 + energy.treble * 2;

        // Update all points
        this.options.points.forEach((ring, ringIndex) => {
            ring.forEach((point, pointIndex) => {
                // Calculate Z position based on time and frequency
                const phaseOffset = point.angle * waveFreq + this.options.time;
                const waveValue = Math.sin(phaseOffset) * amplitude;

                const depthOffset = ringIndex / this.options.rings;
                point.z = (Math.sin(this.options.time * this.options.waveSpeed + depthOffset * Math.PI * 2) + 1) * 0.5 * this.options.depthScale * depthMod;

                // Calculate 3D projection
                const scale = this.options.depthScale / (this.options.depthScale + point.z);
                const projectedX = centerX + (Math.cos(point.angle + this.options.time) * (point.radius + waveValue)) * scale;
                const projectedY = centerY + (Math.sin(point.angle + this.options.time) * (point.radius + waveValue)) * scale;

                // Store projection
                point.projection = {
                    x: projectedX,
                    y: projectedY,
                    scale: scale
                };
            });
        });

        // Draw from back to front
        for (let ringIndex = this.options.rings - 1; ringIndex >= 0; ringIndex--) {
            const ring = this.options.points[ringIndex];

            // Get audio modulation for this ring
            const ringAudioIndex = Math.floor((ringIndex / this.options.rings) * (fftData.length / 4));
            const ringAudio = Utils.normalizeFFTValue(fftData[ringAudioIndex]);

            // Get color based on audio and ring
            const hue = (270 + ringIndex * 20 + energy.treble * 60) % 360;
            const saturation = 80 + ringAudio * 20;
            const lightness = 30 + ringAudio * 30;
            const ringColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

            // Connect points to form the ring
            ctx.beginPath();
            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 1 + 3 * ring[0].projection.scale * (1 + ringAudio);

            // Create lines between points
            for (let i = 0; i < ring.length; i++) {
                const point = ring[i];

                if (i === 0) {
                    ctx.moveTo(point.projection.x, point.projection.y);
                } else {
                    ctx.lineTo(point.projection.x, point.projection.y);
                }
            }

            // Close the ring
            ctx.closePath();
            ctx.stroke();

            // Add glow effect based on audio
            if (ringAudio > 0.5) {
                ctx.shadowColor = ringColor;
                ctx.shadowBlur = 10 * ringAudio;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }

        // Draw connecting lines between rings
        if (energy.bass > 0.4) {
            for (let pointIndex = 0; pointIndex < this.options.pointsPerRing; pointIndex += 6) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 255, 255, ${energy.bass * 0.4})`;
                ctx.lineWidth = 1;

                for (let ringIndex = 0; ringIndex < this.options.rings; ringIndex++) {
                    const point = this.options.points[ringIndex][pointIndex];

                    if (ringIndex === 0) {
                        ctx.moveTo(point.projection.x, point.projection.y);
                    } else {
                        ctx.lineTo(point.projection.x, point.projection.y);
                    }
                }

                ctx.stroke();
            }
        }

        // Add center glow
        const centerGlow = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, 30 + energy.bass * 50
        );

        centerGlow.addColorStop(0, `rgba(255, 255, 255, ${0.4 + energy.bass * 0.6})`);
        centerGlow.addColorStop(0.5, `rgba(${parseInt(this.core.colorScheme.secondary.slice(1, 3), 16)}, 
                                     ${parseInt(this.core.colorScheme.secondary.slice(3, 5), 16)}, 
                                     ${parseInt(this.core.colorScheme.secondary.slice(5, 7), 16)}, 0.3)`);
        centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = centerGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================================================
// FRACTAL AURORA VISUALIZER
// ============================================================================

class FractalVisualizer extends VisualizerBase {
    constructor(core) {
        super(core, 'fractal');
        this.options = {
            ...Config.visualizers.fractal
        };
        this.options.rotation = 0;
        this.options.noiseOffset = 0;
        this.options.fractalOffset = {
            x: 0,
            y: 0
        };
        this.options.julia = {
            real: -0.8,
            imag: 0.156
        };
        this.options.colorOffset = 0;
        this.options.lastBassEnergy = 0;
        this.options.lastMidEnergy = 0;

        // Add downsampling option for performance
        this.options.downsample = 1;
    }

    init() {
        // Adjust downsampling based on canvas size and performance needs
        const canvas = this.core.canvases.get(this.id);
        if (canvas && canvas.width > 800) {
            this.options.downsample = 2; // Downsample for large displays
        } else {
            this.options.downsample = 1;
        }

        this.initialized = true;
    }

    render(ctx, canvas) {
        // Get audio energy
        const energy = this.core.audio.getAudioEnergy();

        // Adjust downsampling based on performance
        if (this.core.performance.fps < 30 && this.options.downsample < 2) {
            this.options.downsample = 2;
        } else if (this.core.performance.fps > 55 && this.options.downsample > 1) {
            this.options.downsample = 1;
        }

        // Smooth transition for Julia set parameters
        this.options.lastBassEnergy = this.options.lastBassEnergy * 0.8 + energy.bass * 0.2;
        this.options.lastMidEnergy = this.options.lastMidEnergy * 0.8 + energy.mid * 0.2;

        // Update Julia set parameters based on audio
        this.options.julia.real = -0.8 + Math.sin(performance.now() * 0.0001) * 0.2 + this.options.lastBassEnergy * 0.4;
        this.options.julia.imag = 0.156 + Math.cos(performance.now() * 0.0002) * 0.1 + this.options.lastMidEnergy * 0.3;

        // Update noise offset based on treble
        this.options.noiseOffset += 0.01 + energy.treble * 0.05;

        // Update rotation
        this.options.rotation += this.options.rotationSpeed * (1 + energy.bass * 2);

        // Update color cycling
        this.options.colorOffset = (this.options.colorOffset + 0.01 + energy.bass * 0.1) % 360;

        // Clear canvas with fade effect
        ctx.fillStyle = `rgba(${parseInt(this.core.colorScheme.background.slice(1, 3), 16)}, 
                    ${parseInt(this.core.colorScheme.background.slice(3, 5), 16)}, 
                    ${parseInt(this.core.colorScheme.background.slice(5, 7), 16)}, 0.1)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate the center of the canvas
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Create ImageData for direct pixel manipulation
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        // Render fractal
        const size = this.options.baseSize * (1 + energy.bass * this.options.audioMultiplier);
        const zoom = 4 / size;

        // Offset from center
        this.options.fractalOffset.x = Math.sin(performance.now() * 0.0005) * 50 * energy.mid;
        this.options.fractalOffset.y = Math.cos(performance.now() * 0.0003) * 50 * energy.bass;

        // Pre-calculate sin and cos of rotation
        const cosRotation = Math.cos(this.options.rotation);
        const sinRotation = Math.sin(this.options.rotation);

        // Optimization: process every other pixel and duplicate for performance
        const downsample = this.options.downsample;

        for (let y = 0; y < canvas.height; y += downsample) {
            for (let x = 0; x < canvas.width; x += downsample) {
                // Calculate coordinates relative to center with rotation
                const dx = x - centerX - this.options.fractalOffset.x;
                const dy = y - centerY - this.options.fractalOffset.y;

                // Apply rotation using pre-calculated sin/cos values
                const rotatedX = dx * cosRotation - dy * sinRotation;
                const rotatedY = dx * sinRotation + dy * cosRotation;

                // Scale to fractal space
                const zx = rotatedX * zoom;
                const zy = rotatedY * zoom;

                // Julia set calculation
                let cxVal = this.options.julia.real;
                let cyVal = this.options.julia.imag;

                let iteration = 0;
                let zxVal = zx;
                let zyVal = zy;
                let zx2 = zxVal * zxVal;
                let zy2 = zyVal * zyVal;

                // Apply noise modulation
                const noiseVal = Math.sin(zx * this.options.noiseScale + this.options.noiseOffset) *
                    Math.cos(zy * this.options.noiseScale + this.options.noiseOffset) * 0.1 * energy.treble;

                cxVal += noiseVal;
                cyVal += noiseVal;

                // Iterate until escape or max iterations
                while (iteration < this.options.maxIterations && zx2 + zy2 < 4) {
                    zyVal = 2 * zxVal * zyVal + cyVal;
                    zxVal = zx2 - zy2 + cxVal;
                    zx2 = zxVal * zxVal;
                    zy2 = zyVal * zyVal;
                    iteration++;
                }

                // Color calculation
                if (iteration < this.options.maxIterations) {
                    // Smooth coloring
                    const smoothColor = iteration + 1 - Math.log2(Math.log(zx2 + zy2));

                    // Hue based on iteration count and audio energy
                    const hue = (smoothColor * 10 + this.options.colorOffset) % 360;

                    // Saturation and lightness modulated by audio
                    const sat = 70 + energy.mid * 30;
                    const light = 30 + 40 * Math.pow(smoothColor / this.options.maxIterations, 0.5);

                    // Convert HSL to RGB
                    const color = Utils.hslToRgb(hue / 360, sat / 100, light / 100);

                    // Set the downsampled pixel block
                    for (let sy = 0; sy < downsample && y + sy < canvas.height; sy++) {
                        for (let sx = 0; sx < downsample && x + sx < canvas.width; sx++) {
                            const index = ((y + sy) * canvas.width + (x + sx)) * 4;
                            data[index] = color.r;
                            data[index + 1] = color.g;
                            data[index + 2] = color.b;
                            data[index + 3] = 255; // Alpha
                        }
                    }
                }
            }
        }

        // Draw the image data
        ctx.putImageData(imageData, 0, 0);

        // Add glow effect with compositing
        ctx.globalCompositeOperation = 'screen';

        // Create circular gradient for glow
        const glowRadius = Math.min(canvas.width, canvas.height) * 0.7;
        const glow = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, glowRadius
        );

        glow.addColorStop(0, `rgba(${parseInt(this.core.colorScheme.secondary.slice(1, 3), 16)}, 
                    ${parseInt(this.core.colorScheme.secondary.slice(3, 5), 16)}, 
                    ${parseInt(this.core.colorScheme.secondary.slice(5, 7), 16)}, ${0.1 + energy.bass * 0.2})`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    }
}

// ============================================================================
// HOLOGRAPHIC UI VISUALIZER
// ============================================================================

class HolographicVisualizer extends VisualizerBase {
    constructor(core) {
        super(core, 'holographic');
        this.options = {
            ...Config.visualizers.holographic
        };
        this.options.rotationY = 0;
        this.options.lastGlitch = 0;
        this.options.scanlineOffset = 0;
    }

    init() {
        // Create a static canvas for the grid
        this.createStaticCanvas('grid', (ctx, width, height) => {
            this.drawHolographicGrid(ctx, width, height, 0, 0.5);
        });

        this.initialized = true;
    }

    render(ctx, canvas) {
        // Get audio energy
        const energy = this.core.audio.getAudioEnergy();
        const fftData = this.core.audio.getFFTData();

        // Update rotation
        this.options.rotationY += this.options.rotationSpeed * (1 + energy.bass);

        // Update scanline position
        this.options.scanlineOffset = (this.options.scanlineOffset + this.options.scanlineSpeed * (1 + energy.mid * 2)) % canvas.height;

        // Clear canvas
        this.clearCanvas(ctx, canvas);

        // Calculate the center of the canvas
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Calculate when to create a glitch effect
        const now = performance.now();
        let isGlitching = false;

        if (now - this.options.lastGlitch > this.options.glitchInterval) {
            // Random chance to glitch based on treble energy
            if (Math.random() < this.options.glitchIntensity + energy.treble * 0.1) {
                isGlitching = true;
                this.options.lastGlitch = now;
            }
        }

        // Draw 3D grid (floor)
        // If bass energy is high, redraw the grid with current rotation
        if (energy.bass > 0.5) {
            this.createStaticCanvas('grid', (ctx, width, height) => {
                this.drawHolographicGrid(ctx, width, height, this.options.rotationY, energy.bass);
            });
        }

        // Draw the static grid
        const gridCanvas = this.getStaticCanvas('grid');
        if (gridCanvas) {
            ctx.drawImage(gridCanvas, 0, 0);
        }

        // Prepare bars
        const barData = [];

        for (let i = 0; i < this.options.bars; i++) {
            // Get frequency data for this bar
            const fftIndex = Math.floor((i / this.options.bars) * (fftData.length / 4));
            const value = Utils.normalizeFFTValue(fftData[fftIndex]);

            // Apply smoothing
            const smoothedValue = value; // Could implement a smoothing algorithm here

            barData.push({
                index: i,
                value: smoothedValue,
                height: smoothedValue * this.options.maxHeight,
                // Add glitch effect
                glitchOffset: isGlitching && Math.random() < 0.1 ?
                    (Math.random() - 0.5) * 20 * energy.treble : 0
            });
        }

        // Function to project 3D point to 2D
        const project = (x, y, z) => {
            // Apply Y rotation
            const cosY = Math.cos(this.options.rotationY);
            const sinY = Math.sin(this.options.rotationY);

            const x1 = x * cosY - z * sinY;
            const z1 = x * sinY + z * cosY;

            // Apply perspective
            const scale = this.options.perspective / (this.options.perspective + z1);

            return {
                x: centerX + x1 * scale,
                y: centerY + y * scale,
                scale: scale
            };
        };

        // Draw holographic bars
        barData.forEach(bar => {
            // Calculate 3D coordinates
            const barX = (bar.index - this.options.bars / 2) * (this.options.barWidth + this.options.spacing);
            const barHeight = bar.height;
            const barZ = 0;

            // Project the corners
            const bottomLeft = project(barX, 0, barZ);
            const bottomRight = project(barX + this.options.barWidth, 0, barZ);
            const topLeft = project(barX, -barHeight, barZ);
            const topRight = project(barX + this.options.barWidth, -barHeight, barZ);

            // Get bar-specific color
            const hue = 180 + bar.index % 60;
            const saturation = 80 + bar.value * 20;
            const lightness = 40 + bar.value * 40;

            // Apply glitch offset
            const glitchY = bar.glitchOffset;

            // Draw bar
            ctx.beginPath();
            ctx.moveTo(bottomLeft.x, bottomLeft.y + glitchY);
            ctx.lineTo(bottomRight.x, bottomRight.y + glitchY);
            ctx.lineTo(topRight.x, topRight.y + glitchY);
            ctx.lineTo(topLeft.x, topLeft.y + glitchY);
            ctx.closePath();

            // Calculate alpha based on audio
            const alpha = 0.4 + bar.value * 0.6;

            // Fill with gradient
            const gradient = ctx.createLinearGradient(
                0, bottomLeft.y,
                0, topLeft.y
            );

            gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.7})`);
            gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness + 20}%, ${alpha})`);

            ctx.fillStyle = gradient;
            ctx.fill();

            // Add holographic scan line effect
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = `hsla(${hue}, 50%, 80%, 0.4)`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Add highlight at the top
            ctx.strokeStyle = `hsla(${hue}, 80%, 90%, 0.8)`;
            ctx.beginPath();
            ctx.moveTo(topLeft.x, topLeft.y + glitchY);
            ctx.lineTo(topRight.x, topRight.y + glitchY);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        });

        // Draw scanlines
        this.drawHolographicScanlines(ctx, canvas.width, canvas.height, this.options.scanlineOffset, this.options.hologramLines, this.options.lineSpacing);

        // Draw holographic UI elements (circles, lines, etc.)
        this.drawHolographicUI(ctx, canvas.width, canvas.height, energy.bass, energy.mid, energy.treble);

        // Add glitch effect
        if (isGlitching) {
            this.applyGlitchEffect(ctx, canvas.width, canvas.height, energy.treble);
        }
    }

    drawHolographicGrid(ctx, width, height, rotationY, bassEnergy) {
        const centerX = width / 2;
        const centerY = height / 2;
        const gridSize = 1000; // Large grid
        const cellSize = 50;
        const gridOpacity = 0.15 + bassEnergy * 0.1;

        // Function to project a point with the current rotation
        const project = (x, y, z) => {
            // Apply Y rotation
            const cosY = Math.cos(rotationY);
            const sinY = Math.sin(rotationY);

            const x1 = x * cosY - z * sinY;
            const z1 = x * sinY + z * cosY;

            // Apply perspective
            const perspective = 800; // Larger value for more subtle perspective
            const scale = perspective / (perspective + z1);

            return {
                x: centerX + x1 * scale,
                y: centerY + y * scale,
                scale: scale
            };
        };

        // Draw grid lines
        ctx.strokeStyle = `rgba(0, 180, 255, ${gridOpacity})`;
        ctx.lineWidth = 1;

        // Draw horizontal grid lines
        for (let z = -gridSize / 2; z <= gridSize / 2; z += cellSize) {
            ctx.beginPath();

            for (let x = -gridSize / 2; x <= gridSize / 2; x += 10) {
                const point = project(x, 0, z);

                if (x === -gridSize / 2) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            }

            ctx.stroke();
        }

        // Draw vertical grid lines
        for (let x = -gridSize / 2; x <= gridSize / 2; x += cellSize) {
            ctx.beginPath();

            for (let z = -gridSize / 2; z <= gridSize / 2; z += 10) {
                const point = project(x, 0, z);

                if (z === -gridSize / 2) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            }

            ctx.stroke();
        }

        // Add subtle glow
        ctx.shadowColor = 'rgba(0, 180, 255, 0.5)';
        ctx.shadowBlur = 10 * bassEnergy;

        // Draw center horizontal and vertical lines with stronger color
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.4 + bassEnergy * 0.3})`;
        ctx.lineWidth = 2;

        // Center horizontal line
        ctx.beginPath();
        for (let x = -gridSize / 2; x <= gridSize / 2; x += 10) {
            const point = project(x, 0, 0);

            if (x === -gridSize / 2) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();

        // Center vertical line
        ctx.beginPath();
        for (let z = -gridSize / 2; z <= gridSize / 2; z += 10) {
            const point = project(0, 0, z);

            if (z === -gridSize / 2) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    drawHolographicScanlines(ctx, width, height, offset, lineCount, lineSpacing) {
        ctx.globalCompositeOperation = 'screen';

        // Draw horizontal scan lines
        for (let i = 0; i < lineCount; i++) {
            const y = (offset + i * lineSpacing) % height;
            const opacity = 0.3 - Math.abs(y - height / 2) / height * 0.3; // Fade out from center

            ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    }

    drawHolographicUI(ctx, width, height, bassEnergy, midEnergy, trebleEnergy) {
        const centerX = width / 2;
        const centerY = height / 2;
        const time = performance.now() * 0.001;

        // Draw circular meter
        const radius = 100 + bassEnergy * 30;
        const segments = 32;
        const segmentAngle = (Math.PI * 2) / segments;

        ctx.strokeStyle = `rgba(0, 210, 255, ${0.4 + midEnergy * 0.4})`;
        ctx.lineWidth = 2;

        for (let i = 0; i < segments; i++) {
            const startAngle = i * segmentAngle;
            const endAngle = (i + 0.9) * segmentAngle; // 0.9 to create gaps

            // Modulate segment length with audio
            const segmentRadius = radius * (0.9 + Math.sin(time * 2 + i * 0.3) * 0.1 * trebleEnergy);

            ctx.beginPath();
            ctx.arc(centerX, centerY, segmentRadius, startAngle, endAngle);
            ctx.stroke();
        }

        // Add light glow
        ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
        ctx.shadowBlur = 15 * midEnergy;

        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5 + bassEnergy * 10, 0, Math.PI * 2);
        ctx.stroke();

        // Draw pulsing circle
        ctx.strokeStyle = `rgba(0, 255, 200, ${0.2 + bassEnergy * 0.5})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20 + Math.sin(time * 3) * 10, 0, Math.PI * 2);
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw floating text and symbols
        ctx.font = '14px monospace';
        ctx.fillStyle = `rgba(0, 230, 255, ${0.7 + trebleEnergy * 0.3})`;
        ctx.textAlign = 'center';

        // Level indicator
        ctx.fillText(`LEVEL: ${Math.floor(bassEnergy * 100)}%`, centerX, centerY - radius - 20);

        // Time code (fake)
        const minutes = Math.floor(time / 60).toString().padStart(2, '0');
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        const deciseconds = Math.floor((time % 1) * 10).toString();
        ctx.fillText(`T:${minutes}:${seconds}.${deciseconds}`, centerX, centerY + radius + 25);

        // Draw arcs with dynamic angles
        const arcRadius = radius * 1.2;
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.3 + midEnergy * 0.3})`;
        ctx.lineWidth = 3;

        // Top arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, arcRadius, Math.PI * 1.2 - midEnergy * 0.5, Math.PI * 1.8 + midEnergy * 0.5);
        ctx.stroke();

        // Bottom arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, arcRadius, Math.PI * 0.2 - trebleEnergy * 0.5, Math.PI * 0.8 + trebleEnergy * 0.5);
        ctx.stroke();
    }

    applyGlitchEffect(ctx, width, height, intensity) {
        const glitchIntensity = intensity * 0.3; // Scale down for subtlety

        // Create several horizontal glitch slices
        const sliceCount = Math.floor(3 + Math.random() * 5);

        for (let i = 0; i < sliceCount; i++) {
            // Random y position and height
            const y = Math.random() * height;
            const sliceHeight = 5 + Math.random() * 20;

            // Random x offset
            const xOffset = (Math.random() - 0.5) * width * 0.1 * glitchIntensity;

            try {
                // Copy and shift a slice of the canvas
                const imageData = ctx.getImageData(0, y, width, sliceHeight);
                ctx.putImageData(imageData, xOffset, y);

                // Add color shift occasionally
                if (Math.random() < 0.3) {
                    ctx.fillStyle = `rgba(255, 0, 128, ${Math.random() * 0.1 * glitchIntensity})`;
                    ctx.fillRect(0, y, width, sliceHeight);
                }
            } catch (e) {
                // Handle any errors with getImageData (e.g., out of bounds)
                console.warn('Glitch effect error:', e);
            }
        }

        // Add random noise pixels
        const noiseCount = Math.floor(100 * glitchIntensity);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        for (let i = 0; i < noiseCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = 1 + Math.random() * 3;

            ctx.fillRect(x, y, size, size);
        }
    }
}

// ============================================================================
// CAUSTIC WATERS VISUALIZER
// ============================================================================

class CausticsVisualizer extends VisualizerBase {
    constructor(core) {
        super(core, 'caustics');
        this.options = {
            ...Config.visualizers.caustics
        };
        this.options.ripples = [];
        this.options.buffer1 = null;
        this.options.buffer2 = null;
        this.options.time = 0;
    }

    init() {
        const size = this.options.width * this.options.height;

        // Create water simulation buffers
        this.options.buffer1 = new Float32Array(size);
        this.options.buffer2 = new Float32Array(size);

        // Reset everything
        this.options.ripples = [];
        this.options.buffer1.fill(0);
        this.options.buffer2.fill(0);
        this.options.time = 0;

        this.initialized = true;
    }

    cleanup() {
        // Clean up buffers
        this.options.buffer1 = null;
        this.options.buffer2 = null;
        this.options.ripples = [];

        super.cleanup();
    }

    render(ctx, canvas) {
        // Get audio energy
        const energy = this.core.audio.getAudioEnergy();

        // Update time
        this.options.time += 0.01 + energy.bass * 0.05;

        // Clear canvas
        this.clearCanvas(ctx, canvas);

        // Add ripples based on audio
        if (energy.bass > 0.1 && this.options.ripples.length < this.options.maxRipples) {
            // Add a ripple at a random position
            const x = Math.floor(Math.random() * this.options.width);
            const y = Math.floor(Math.random() * this.options.height);
            const strength = this.options.rippleStrength * (0.5 + energy.bass * 2);

            this.options.ripples.push({
                x: x,
                y: y,
                radius: this.options.rippleRadius,
                strength: strength,
                age: 0,
                maxAge: 20 + Math.random() * 30
            });
        }

        // Apply ripples to the water simulation
        this.options.ripples.forEach(ripple => {
            ripple.age++;

            // Fade out ripple strength with age
            const currentStrength = ripple.strength * (1 - ripple.age / ripple.maxAge);

            // Apply ripple to the buffer
            Utils.applyRipple(
                this.options.buffer1,
                this.options.width,
                this.options.height,
                ripple.x,
                ripple.y,
                ripple.radius,
                currentStrength
            );
        });

        // Remove old ripples
        this.options.ripples = this.options.ripples.filter(ripple => ripple.age < ripple.maxAge);

        // Update water simulation
        Utils.updateWaterSimulation(
            this.options.buffer1,
            this.options.buffer2,
            this.options.width,
            this.options.height,
            this.options.damping
        );

        // Swap buffers
        [this.options.buffer1, this.options.buffer2] = [this.options.buffer2, this.options.buffer1];

        // Render water to canvas with caustics effect
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        // Calculate scaling from simulation to canvas
        const scaleX = canvas.width / this.options.width;
        const scaleY = canvas.height / this.options.height;

        // Generate caustics
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                // Map canvas coordinates to simulation coordinates
                const simX = Math.floor(x / scaleX);
                const simY = Math.floor(y / scaleY);

                // Get height and calculate derivatives (normals)
                const idx = simY * this.options.width + simX;
                const height = this.options.buffer1[idx] || 0;

                // Calculate caustics intensity
                const causticFactor = height * this.options.causticIntensity;

                // Get caustic color
                let r, g, b;

                // Create color shifts based on height
                if (causticFactor > 0) {
                    // Bright caustics with color variation
                    const hue = (180 + causticFactor * 20 + this.options.time * 10) % 360;
                    const saturation = 60 + energy.mid * 40;
                    const brightness = 50 + causticFactor * 50;

                    const rgb = Utils.hslToRgb(hue / 360, saturation / 100, brightness / 100);
                    r = rgb.r;
                    g = rgb.g;
                    b = rgb.b;
                } else {
                    // Darker water with different color
                    const depth = energy.bass * 0.5;

                    // Deep water color
                    r = 0;
                    g = 10 + 40 * depth;
                    b = 30 + 100 * depth;
                }

                // Add subtle movement to the water
                const time = this.options.time;
                const movement = Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 + time * 0.7) * 10 * energy.mid;

                // Apply movement to colors
                r = Math.max(0, Math.min(255, r + movement));
                g = Math.max(0, Math.min(255, g + movement));
                b = Math.max(0, Math.min(255, b + movement));

                // Set pixel color
                const pixelIndex = (y * canvas.width + x) * 4;
                data[pixelIndex] = r;
                data[pixelIndex + 1] = g;
                data[pixelIndex + 2] = b;
                data[pixelIndex + 3] = 255; // Alpha
            }
        }

        // Draw the image data
        ctx.putImageData(imageData, 0, 0);

        // Add depth and underwater effect
        ctx.fillStyle = `rgba(0, 10, 40, ${0.2 + energy.bass * 0.2})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add light rays
        this.drawWaterLightRays(ctx, canvas.width, canvas.height, energy.bass, energy.mid);

        // Draw particles floating in the water
        this.drawWaterParticles(ctx, canvas.width, canvas.height, this.options.time, energy.bass, energy.treble);
    }

    drawWaterLightRays(ctx, width, height, bassEnergy, midEnergy) {
        ctx.save();

        // Use additive blending for light rays
        ctx.globalCompositeOperation = 'screen';

        // Number of rays based on audio
        const rayCount = 5 + Math.floor(bassEnergy * 10);

        for (let i = 0; i < rayCount; i++) {
            // Calculate ray properties
            const x = Math.random() * width;
            const rayWidth = 20 + Math.random() * 80 + bassEnergy * 100;
            const rayHeight = height * (0.5 + Math.random() * 0.5);
            const intensity = 0.05 + Math.random() * 0.1 + midEnergy * 0.2;

            // Create light ray gradient
            const gradient = ctx.createLinearGradient(x, 0, x, rayHeight);
            gradient.addColorStop(0, `rgba(180, 230, 255, ${intensity})`);
            gradient.addColorStop(1, 'rgba(180, 230, 255, 0)');

            // Draw ray
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(x - rayWidth / 2, 0);
            ctx.lineTo(x + rayWidth / 2, 0);
            ctx.lineTo(x + rayWidth / 4, rayHeight);
            ctx.lineTo(x - rayWidth / 4, rayHeight);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    drawWaterParticles(ctx, width, height, time, bassEnergy, trebleEnergy) {
        ctx.save();

        // Use screen blending for bright particles
        ctx.globalCompositeOperation = 'screen';

        // Number of particles - limit based on performance
        const BASE_PARTICLES = 100;
        const BASS_PARTICLES = 100;
        const particleCount = BASE_PARTICLES + Math.floor(bassEnergy * BASS_PARTICLES);

        for (let i = 0; i < particleCount; i++) {
            // Calculate particle positions using perlin-like noise
            const seed = i * 0.1;
            const x = (Math.sin(seed + time * 0.1) * 0.5 + 0.5) * width;
            const y = (Math.cos(seed * 1.3 + time * 0.07) * 0.5 + 0.5) * height;

            // Calculate size and opacity based on audio and position
            const size = 1 + Math.random() * 3 * trebleEnergy;
            const depth = y / height; // 0 at top, 1 at bottom
            const opacity = 0.1 + Math.random() * 0.2 + trebleEnergy * 0.3;

            // Get particle color
            const colorOffset = Math.random();
            let color;

            if (colorOffset < 0.5) {
                // Small bright particles
                color = `rgba(200, 240, 255, ${opacity})`;
            } else if (colorOffset < 0.8) {
                // Medium cyan particles
                color = `rgba(100, 200, 255, ${opacity * 0.7})`;
            } else {
                // Larger blue particles
                color = `rgba(50, 100, 200, ${opacity * 0.5})`;
            }

            // Draw particle
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// ============================================================================
// PARTICLE CONSTELLATION VISUALIZER 
// ============================================================================

class ParticlesVisualizer extends VisualizerBase {
    constructor(core) {
        super(core, 'particles');
        this.options = {
            ...Config.visualizers.particles
        };
        this.options.particles = [];
        this.options.colorCycle = 0;
        this.options.lastFrameTime = 0;
    }

    init() {
        const canvas = this.core.canvases.get(this.id);
        if (!canvas) return;

        // Reset particles array
        this.options.particles = [];
        this.options.colorCycle = 0;

        // Create particles
        for (let i = 0; i < this.options.particleCount; i++) {
            this.options.particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * this.options.maxSpeed,
                vy: (Math.random() - 0.5) * this.options.maxSpeed,
                radius: this.options.baseRadius * (0.5 + Math.random()),
                color: i % 3, // 0, 1, 2 for different colors
                age: Math.random() * 100
            });
        }

        this.initialized = true;
    }

    render(ctx, canvas) {
        // Get audio energy
        const energy = this.core.audio.getAudioEnergy();

        // Calculate time delta for smooth animation regardless of framerate
        const now = performance.now();
        const dt = Math.min((now - this.options.lastFrameTime) / 16.667, 2); // Cap at 2x normal speed
        this.options.lastFrameTime = now;

        // Clear canvas with fade effect for trails
        ctx.fillStyle = `rgba(${parseInt(this.core.colorScheme.background.slice(1, 3), 16)}, 
                      ${parseInt(this.core.colorScheme.background.slice(3, 5), 16)}, 
                      ${parseInt(this.core.colorScheme.background.slice(5, 7), 16)}, 0.15)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update color cycle
        this.options.colorCycle = (this.options.colorCycle + 0.5 * energy.bass) % 360;

        // Create colors based on color scheme
        const colors = [
            this.core.colorScheme.primary,
            this.core.colorScheme.secondary,
            this.core.colorScheme.accent1
        ];

        // Apply force based on audio
        const forceX = Math.sin(now * 0.001) * energy.bass * this.options.forceFactor * dt;
        const forceY = Math.cos(now * 0.001) * energy.mid * this.options.forceFactor * dt;

        // Update particle positions
        this.options.particles.forEach(particle => {
            // Apply force
            particle.vx += forceX;
            particle.vy += forceY;

            // Apply damping
            particle.vx *= this.options.damping;
            particle.vy *= this.options.damping;

            // Update position
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;

            // Wrap around edges with momentum preservation
            if (particle.x < 0) {
                particle.x = canvas.width;
            } else if (particle.x > canvas.width) {
                particle.x = 0;
            }

            if (particle.y < 0) {
                particle.y = canvas.height;
            } else if (particle.y > canvas.height) {
                particle.y = 0;
            }

            // Update age for animation effects
            particle.age += 0.1 * dt;
        });

        // Create spatial lookup grid for efficient connection checking
        const gridSize = Math.ceil(this.options.connectionDistance);
        const grid = {};

        this.options.particles.forEach((particle, index) => {
            const gridX = Math.floor(particle.x / gridSize);
            const gridY = Math.floor(particle.y / gridSize);
            const key = `${gridX},${gridY}`;

            if (!grid[key]) {
                grid[key] = [];
            }

            grid[key].push(index);
        });

        // Draw connections between nearby particles
        ctx.globalCompositeOperation = 'screen';

        // Only draw connections if not too dense (performance optimization)
        const connectionThreshold = this.options.connectionThreshold - energy.bass * 0.3;
        const MAX_CONNECTIONS = 500;
        const particleConnections = this.options.particleCount * 5;
        const maxConnections = Math.min(MAX_CONNECTIONS, particleConnections); // Cap for performance
        let connectionCount = 0;

        for (let i = 0; i < this.options.particles.length && connectionCount < maxConnections; i++) {
            const particle = this.options.particles[i];

            // Check only neighboring grid cells
            const gridX = Math.floor(particle.x / gridSize);
            const gridY = Math.floor(particle.y / gridSize);

            // Check 3x3 grid neighborhood
            for (let gx = gridX - 1; gx <= gridX + 1; gx++) {
                for (let gy = gridY - 1; gy <= gridY + 1; gy++) {
                    const key = `${gx},${gy}`;

                    if (!grid[key]) continue;

                    // Check particles in this grid cell
                    for (let j = 0; j < grid[key].length; j++) {
                        const otherIndex = grid[key][j];

                        // Skip self and already checked pairs
                        if (otherIndex <= i) continue;

                        const other = this.options.particles[otherIndex];

                        // Calculate distance
                        const dx = particle.x - other.x;
                        const dy = particle.y - other.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        // Draw connection if close enough
                        if (distance < this.options.connectionDistance) {
                            // Only draw some connections based on threshold
                            if (Math.random() > connectionThreshold) {
                                // Skip this connection
                                continue;
                            }

                            // Calculate strength based on distance
                            const strength = 1 - distance / this.options.connectionDistance;

                            // Use both particle colors for gradient
                            const colorStart = colors[particle.color];
                            const colorEnd = colors[other.color];

                            // Create gradient for connection
                            const gradient = ctx.createLinearGradient(
                                particle.x, particle.y, other.x, other.y
                            );

                            gradient.addColorStop(0, Utils.hexToRgba(colorStart, strength * 0.5));
                            gradient.addColorStop(1, Utils.hexToRgba(colorEnd, strength * 0.5));

                            // Draw connection
                            ctx.beginPath();
                            ctx.strokeStyle = gradient;
                            ctx.lineWidth = strength * 2 + energy.treble;
                            ctx.moveTo(particle.x, particle.y);
                            ctx.lineTo(other.x, other.y);
                            ctx.stroke();

                            connectionCount++;
                        }
                    }
                }
            }
        }

        // Draw particles
        ctx.globalCompositeOperation = 'screen';

        this.options.particles.forEach(particle => {
            // Determine particle radius with pulsing effect
            const pulseFactor = 1 + Math.sin(particle.age * 0.1) * 0.2;
            const radius = particle.radius * (1 + energy.bass * 0.5) * pulseFactor;

            // Get base color
            const baseColor = colors[particle.color];

            // Create radial gradient for particle
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, radius * 2
            );

            // Get color components
            const r = parseInt(baseColor.slice(1, 3), 16);
            const g = parseInt(baseColor.slice(3, 5), 16);
            const b = parseInt(baseColor.slice(5, 7), 16);

            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

            // Draw particle with glow
            ctx.beginPath();
            ctx.fillStyle = gradient;
            ctx.arc(particle.x, particle.y, radius * 2, 0, Math.PI * 2);
            ctx.fill();

            // Add bright center
            ctx.beginPath();
            ctx.fillStyle = `rgb(${r + 50}, ${g + 50}, ${b + 50})`;
            ctx.arc(particle.x, particle.y, radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    }
}

// ============================================================================
// NEBULA VISUALIZER
// ============================================================================

class NebulaVisualizer extends VisualizerBase {
    constructor(core) {
        super(core, 'nebula');
        this.options = {
            ...Config.visualizers.nebula
        };
        this.options.densityField = null;
        this.options.velocityField = null;
        this.options.tmpField1 = null;
        this.options.tmpField2 = null;
        this.options.colorOffset = 0;
        this.options.lastTime = 0;
        this.options.dirX = 0;
        this.options.dirY = 0;
    }

    init() {
        const res = this.options.resolution;

        // Initialize fields
        this.options.densityField = new Float32Array(res * res * 4); // RGBA
        this.options.velocityField = new Float32Array(res * res * 2); // X,Y velocity
        this.options.tmpField1 = new Float32Array(res * res * 4);
        this.options.tmpField2 = new Float32Array(res * res * 4);

        // Initialize to zero
        this.options.densityField.fill(0);
        this.options.velocityField.fill(0);
        this.options.tmpField1.fill(0);
        this.options.tmpField2.fill(0);

        this.options.colorOffset = 0;
        this.options.lastTime = performance.now();

        this.initialized = true;
    }

    cleanup() {
        // Free memory
        this.options.densityField = null;
        this.options.velocityField = null;
        this.options.tmpField1 = null;
        this.options.tmpField2 = null;

        super.cleanup();
    }

    render(ctx, canvas) {
        // Get audio data
        const energy = this.core.audio.getAudioEnergy();
        const fftData = this.core.audio.getFFTData();

        // Calculate time delta
        const now = performance.now();
        const dt = (now - this.options.lastTime) / 1000; // in seconds
        this.options.lastTime = now;

        // Limit dt to avoid simulation explosion on tab switch
        const limitedDt = Math.min(dt, 0.05);

        // Update color offset
        this.options.colorOffset = (this.options.colorOffset + limitedDt * 10 * (1 + energy.bass)) % 360;

        // Apply new forces based on audio
        this.addNebulaForces(fftData, energy, limitedDt);

        // Run fluid simulation steps
        this.simulateNebulaFluid(limitedDt);

        // Render the fluid simulation to canvas
        this.renderNebulaFluid(ctx, canvas, energy);

        // Add glow effect
        ctx.globalCompositeOperation = 'screen';

        // Create circular gradient for central glow
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.4;

        const glow = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );

        const glowStrength = 0.05 + energy.bass * 0.15;
        glow.addColorStop(0, `rgba(${parseInt(this.core.colorScheme.secondary.slice(1, 3), 16)}, 
                       ${parseInt(this.core.colorScheme.secondary.slice(3, 5), 16)}, 
                       ${parseInt(this.core.colorScheme.secondary.slice(5, 7), 16)}, ${glowStrength})`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw some stars in the background
        this.drawNebulaStars(ctx, canvas.width, canvas.height, now, energy.bass);

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    }

    addNebulaForces(fftData, energy, dt) {
        const res = this.options.resolution;
        const strength = this.options.forceStrength * (1 + energy.bass * 2);

        // Limit the number of injections per frame for performance
        const injections = Math.min(Math.floor(5 + energy.bass * 10), this.options.particleLimit);

        // Apply forces based on audio frequencies
        for (let i = 0; i < injections; i++) {
            // Get spectrum position
            const freqIndex = Math.floor(Math.random() * (fftData.length / 2));
            const value = Utils.normalizeFFTValue(fftData[freqIndex]);

            if (value < 0.1) continue; // Skip weak frequencies

            // Calculate position (use frequency distribution)
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 0.4 + 0.1; // Keep near center

            // Convert to grid coordinates
            const x = Math.floor(((Math.cos(angle) * distance) + 0.5) * res);
            const y = Math.floor(((Math.sin(angle) * distance) + 0.5) * res);

            if (x < 2 || y < 2 || x >= res - 2 || y >= res - 2) continue;

            // Inject density and velocity
            const cellIndex = y * res + x;
            const vIndex = cellIndex * 2;
            const dIndex = cellIndex * 4;

            // Add velocity
            this.options.velocityField[vIndex] += Math.cos(angle) * value * strength * dt;
            this.options.velocityField[vIndex + 1] += Math.sin(angle) * value * strength * dt;

            // Add color based on frequency (low = red, mid = green, high = blue)
            const freq = freqIndex / (fftData.length / 2);
            let r = 0,
                g = 0,
                b = 0;

            if (freq < 0.33) {
                // Bass - use primary color
                r = parseInt(this.core.colorScheme.primary.slice(1, 3), 16) * value;
                g = parseInt(this.core.colorScheme.primary.slice(3, 5), 16) * value;
                b = parseInt(this.core.colorScheme.primary.slice(5, 7), 16) * value;
            } else if (freq < 0.66) {
                // Mid - use secondary color
                r = parseInt(this.core.colorScheme.secondary.slice(1, 3), 16) * value;
                g = parseInt(this.core.colorScheme.secondary.slice(3, 5), 16) * value;
                b = parseInt(this.core.colorScheme.secondary.slice(5, 7), 16) * value;
            } else {
                // Treble - use accent color
                r = parseInt(this.core.colorScheme.accent1.slice(1, 3), 16) * value;
                g = parseInt(this.core.colorScheme.accent1.slice(3, 5), 16) * value;
                b = parseInt(this.core.colorScheme.accent1.slice(5, 7), 16) * value;
            }

            // Inject density with color
            this.options.densityField[dIndex] += r * 5;
            this.options.densityField[dIndex + 1] += g * 5;
            this.options.densityField[dIndex + 2] += b * 5;
            this.options.densityField[dIndex + 3] += value * 255; // Alpha
        }

        // Add global drift based on bass
        this.options.dirX = (Math.sin(performance.now() * 0.001) * 0.2 + this.options.dirX * 0.8) * energy.bass;
        this.options.dirY = (Math.cos(performance.now() * 0.0007) * 0.2 + this.options.dirY * 0.8) * energy.bass;

        // Apply global field drift
        const dirForce = 10 * dt;
        const res1 = res - 1;

        for (let y = 1; y < res1; y++) {
            for (let x = 1; x < res1; x++) {
                const i = y * res + x;
                const vi = i * 2;

                this.options.velocityField[vi] += this.options.dirX * dirForce;
                this.options.velocityField[vi + 1] += this.options.dirY * dirForce;
            }
        }
    }

    simulateNebulaFluid(dt) {
        const res = this.options.resolution;

        // 1. Diffuse velocity
        Utils.diffuseVelocity(
            this.options.velocityField,
            this.options.tmpField1,
            res,
            this.options.diff,
            dt,
            this.options.iterations
        );

        // Swap velocity field with temp field
        [this.options.velocityField, this.options.tmpField1] = [this.options.tmpField1, this.options.velocityField];

        // 2. Diffuse density 
        Utils.diffuseDensity(
            this.options.densityField,
            this.options.tmpField2,
            res,
            this.options.diff,
            dt,
            this.options.iterations
        );

        // Swap density field with temp field
        [this.options.densityField, this.options.tmpField2] = [this.options.tmpField2, this.options.densityField];

        // 3. Advect density with velocity
        Utils.advectDensity(
            this.options.densityField,
            this.options.tmpField2,
            this.options.velocityField,
            res,
            dt
        );

        // Swap density field with temp field
        [this.options.densityField, this.options.tmpField2] = [this.options.tmpField2, this.options.densityField];

        // Apply decay to density for fade effect
        const decay = 0.99;
        for (let i = 0; i < this.options.densityField.length; i++) {
            this.options.densityField[i] *= decay;
        }
    }

    renderNebulaFluid(ctx, canvas, energy) {
        const res = this.options.resolution;

        // Create an appropriately sized image data
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        // Clear data
        data.fill(0);

        // Draw fluid simulation
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                // Map canvas coordinates to simulation grid
                const gridX = Math.floor((x / canvas.width) * res);
                const gridY = Math.floor((y / canvas.height) * res);

                // Get density at this grid cell
                const cellIndex = (gridY * res + gridX) * 4;

                // Map density to canvas pixel
                const pixelIndex = (y * canvas.width + x) * 4;

                // Get density values
                let r = this.options.densityField[cellIndex];
                let g = this.options.densityField[cellIndex + 1];
                let b = this.options.densityField[cellIndex + 2];
                let a = this.options.densityField[cellIndex + 3];

                // Apply color adjustments based on audio
                const colorBoost = 1 + energy.bass * 0.5;

                r *= colorBoost;
                g *= colorBoost;
                b *= colorBoost;

                // Clamp values
                r = Math.min(255, r);
                g = Math.min(255, g);
                b = Math.min(255, b);
                a = Math.min(255, a * (0.5 + energy.treble * 0.5));

                // Set pixel values
                data[pixelIndex] = r;
                data[pixelIndex + 1] = g;
                data[pixelIndex + 2] = b;
                data[pixelIndex + 3] = a;
            }
        }

        // Draw the image data
        ctx.putImageData(imageData, 0, 0);
    }

    drawNebulaStars(ctx, width, height, time, bassEnergy) {
        ctx.save();

        // Use additive blending for stars
        ctx.globalCompositeOperation = 'screen';

        // Number of stars based on canvas size
        const starCount = Math.floor(width * height / 2000);

        // Draw stars
        for (let i = 0; i < starCount; i++) {
            // Use noise-like function for deterministic positions
            const noise1 = Math.sin(i * 0.1) * 0.5 + 0.5;
            const noise2 = Math.cos(i * 0.17) * 0.5 + 0.5;

            const x = noise1 * width;
            const y = noise2 * height;

            // Another noise for size
            const size = (Math.sin(i * 0.37) * 0.5 + 0.5) * 2 + 0.5;

            // Brightness based on time
            const brightness = 0.5 + 0.5 * Math.sin(time * 0.001 + i * 0.1);

            // Twinkle effect
            const twinkling = brightness * (1 + bassEnergy * 0.5);
            const starSize = size * (1 + bassEnergy * 0.3);

            // Create gradient for star
            const gradient = ctx.createRadialGradient(
                x, y, 0,
                x, y, starSize * 2
            );

            gradient.addColorStop(0, `rgba(255, 255, 255, ${twinkling})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            // Draw star
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, starSize * 2, 0, Math.PI * 2);
            ctx.fill();

            // Add a small solid center for bright stars
            if (brightness > 0.8) {
                ctx.fillStyle = `rgba(255, 255, 255, ${twinkling})`;
                ctx.beginPath();
                ctx.arc(x, y, starSize * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}

// ============================================================================
// MAIN VISUALIZER CORE MODULE
// ============================================================================

class VisualizerCore {
    constructor(options = {}) {
        // Apply defaults or provided options
        this.config = Object.assign({}, Config, options.config || {});

        // Main properties
        this.isInitialized = false;
        this.activeVisualizerId = options.defaultVisualizer || 'spectrum';
        this.visualizers = new Map();
        this.canvases = new Map();
        this.contexts = new Map();
        this.container = null;

        // Audio analyzer
        this.audio = new AudioAnalyzer(options.audio || {});

        // Performance monitoring
        this.performance = new PerformanceMonitor(this.config.performance);

        // Render cache
        this.renderCache = new RenderCache();

        // Color schemes and active scheme
        this.colorSchemes = ColorSchemes;
        this.colorScheme = this.colorSchemes[options.defaultColorScheme || 'DEFAULT'];

        // UI manager (initialized in init)
        this.ui = null;

        // Window resize handler with debounce
        this.handleResize = Utils.debounce(this._handleResize.bind(this), 200);

        // Set debug mode
        window.DEBUG_VISUALIZERS = options.debug || false;
    }

    // Initialize the visualizer system
    init() {
        if (this.isInitialized) return;

        // Create or find the container element
        this.setupContainer();

        // Initialize UI manager
        this.ui = new UIManager(this.container, this.colorSchemes, {
            onVisualizerChange: (id) => this.showVisualizer(id),
            onColorSchemeChange: (scheme) => this.setColorScheme(scheme),
            onFullscreenToggle: () => this.ui.toggleFullscreen(),
            onDebugToggle: (isDebug) => {
                window.DEBUG_VISUALIZERS = isDebug;
            }
        });

        // Create UI elements
        this.ui.createToolbar();
        this.ui.addFullscreenButton();

        // Register all visualizers
        this.registerVisualizers();

        // Add event listeners
        this.setupEventListeners();

        this.isInitialized = true;

        // Configure toggle interaction with existing UI
        this.ui.setupToggle('#visualizerToggle');

        // Start with default visualizer
        this.showVisualizer(this.activeVisualizerId);

        console.log('Enhanced visualizers initialized');
    }

    // Set up the container element
    setupContainer() {
        // Find existing container or create a new one
        const existingContainer = document.getElementById('enhanced-visualizers-container');

        if (existingContainer) {
            this.container = existingContainer;
        } else {
            this.container = Utils.createElement('div', {
                id: 'enhanced-visualizers-container'
            });

            // Apply styles to the container
            Object.assign(this.container.style, {
                position: 'relative',
                width: this.config.container.defaultWidth,
                height: this.config.container.defaultHeight,
                background: this.colorScheme.background,
                borderRadius: this.config.container.borderRadius,
                overflow: 'hidden',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.3s ease',
                marginTop: '20px',
                marginBottom: '20px'
            });

            // Find the right place to add the container
            const advanceVisualizer = document.querySelector('.advance-visualizer');
            if (advanceVisualizer) {
                advanceVisualizer.appendChild(this.container);
            } else {
                // Fallback - add to the end of the synth container
                const synthContainer = document.querySelector('.synth-container');
                if (synthContainer) {
                    synthContainer.appendChild(this.container);
                } else {
                    document.body.appendChild(this.container);
                }
            }
        }
    }

    // Register all available visualizers
    registerVisualizers() {
        // Register all visualizers
        this.visualizers.set('spectrum', new SpectrumVisualizer(this));
        this.visualizers.set('waveform3d', new Waveform3DVisualizer(this));
        this.visualizers.set('vortex', new VortexVisualizer(this));
        this.visualizers.set('fractal', new FractalVisualizer(this));
        this.visualizers.set('holographic', new HolographicVisualizer(this));
        this.visualizers.set('caustics', new CausticsVisualizer(this));
        this.visualizers.set('particles', new ParticlesVisualizer(this));
        this.visualizers.set('nebula', new NebulaVisualizer(this));
    }

    // Set up event listeners
    setupEventListeners() {
        // Add window resize handler
        window.addEventListener('resize', this.handleResize);

        // Handle clicks on the container to cycle visualizers
        this.container.addEventListener('click', (event) => {
            // Check if click is on the container but not on the toolbar or fullscreen button
            const toolbar = this.container.querySelector('.visualizer-toolbar');
            const fullscreenButton = this.container.querySelector('.visualizer-fullscreen-button');

            if (toolbar && !toolbar.contains(event.target) &&
                fullscreenButton && !fullscreenButton.contains(event.target)) {
                this.cycleToNextVisualizer();
            }
        });

        // Handle fullscreen change events
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.ui.isFullscreen) {
                this.ui.exitFullscreen();
                this.ui.isFullscreen = false;
                this.handleResize();
            }
        });
    }

    // Show a specific visualizer
    showVisualizer(id) {
        if (!this.isInitialized) this.init();
        if (!this.visualizers.has(id)) return;

        // Track previous visualizer for cleanup
        const previousVisualizerId = this.activeVisualizerId;

        // Stop previous visualizer
        if (previousVisualizerId && this.visualizers.has(previousVisualizerId)) {
            this.visualizers.get(previousVisualizerId).stop();
        }

        // Clean up any resources 
        if (previousVisualizerId) {
            this.renderCache.clearCache(previousVisualizerId);
        }

        // Ensure the canvas exists for this visualizer
        this.ensureCanvas(id);

        // Hide all canvases
        this.canvases.forEach((canvas, canvasId) => {
            canvas.style.display = 'none';
        });

        // Show the selected canvas
        const canvas = this.canvases.get(id);
        if (canvas) {
            canvas.style.display = 'block';
        }

        // Reset performance metrics when changing visualizers
        this.performance.reset();

        // Start the selected visualizer
        this.activeVisualizerId = id;
        this.visualizers.get(id).start();

        // Update the selector in UI
        if (this.ui) {
            this.ui.updateVisualizerSelector(id);
        }
    }

    // Cycle to the next visualizer
    cycleToNextVisualizer() {
        // Get all visualizer IDs
        const visualizerIds = Array.from(this.visualizers.keys());

        // Find the index of the current active visualizer
        const currentIndex = visualizerIds.indexOf(this.activeVisualizerId);

        // Calculate the next index (with wrap-around)
        const nextIndex = (currentIndex + 1) % visualizerIds.length;

        // Show the next visualizer
        this.showVisualizer(visualizerIds[nextIndex]);
    }

    // Ensure canvas exists for the given visualizer
    ensureCanvas(id) {
        if (this.canvases.has(id)) return;

        // Create new canvas
        const canvas = Utils.createElement('canvas', {
            id: `visualizer-${id}`,
            className: 'visualizer-canvas',
            style: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                display: 'none'
            }
        });

        // Set initial canvas dimensions
        canvas.width = this.container.clientWidth;
        canvas.height = this.container.clientHeight;

        // Store canvas and context
        this.canvases.set(id, canvas);
        this.contexts.set(id, canvas.getContext('2d', {
            willReadFrequently: true
        }));

        // Add canvas to container
        this.container.appendChild(canvas);
    }

    // Handle window resize
    _handleResize() {
        if (!this.isInitialized) return;

        // Get current container dimensions
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;

        // Update canvas dimensions
        this.canvases.forEach((canvas) => {
            canvas.width = containerWidth;
            canvas.height = containerHeight;
        });

        // Clear all static canvases in the render cache
        this.renderCache.clearAllCaches();

        // Reinitialize all visualizers
        this.visualizers.forEach(visualizer => {
            visualizer.initialized = false;
            visualizer.init();
        });

        console.log(`Visualizer resized to ${containerWidth}x${containerHeight}`);
    }

    // Set color scheme
    setColorScheme(schemeName) {
        const scheme = schemeName.toUpperCase();
        if (this.colorSchemes[scheme]) {
            this.colorScheme = this.colorSchemes[scheme];

            // Update background color of container
            if (this.container) {
                this.container.style.background = this.colorScheme.background;
            }
        }
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Create lazy-loaded instance
window.enhancedVisualizers = null;

function initEnhancedVisualizers(options = {}) {
    if (!window.enhancedVisualizers) {
        console.log('Creating enhanced visualizers instance');
        window.enhancedVisualizers = new VisualizerCore(options);
    }

    if (!window.enhancedVisualizers.isInitialized) {
        window.enhancedVisualizers.init();
    }

    return window.enhancedVisualizers;
}

// Modify the visualizer toggle handler
document.addEventListener('DOMContentLoaded', () => {
    const visualizerToggle = document.getElementById('visualizerToggle');

    if (visualizerToggle) {
        // Make sure toggle button text reflects hidden state initially
        if (visualizerToggle.querySelector('span')) {
            visualizerToggle.querySelector('span').textContent = 'Show Advanced Visualizations';
        }

        // Replace the old click handler
        const oldClickHandler = visualizerToggle.onclick;

        visualizerToggle.onclick = function() {
            // Toggle as before, but also show our new visualizers
            if (oldClickHandler) {
                oldClickHandler.call(visualizerToggle);
            } else {
                // Fallback if old handler not found
                visualizerToggle.classList.toggle('active');
            }

            const isExpanded = visualizerToggle.classList.contains('active');
            let container = document.getElementById('enhanced-visualizers-container');

            if (isExpanded) {
                // Initialize visualizers if not already done
                if (!container) {
                    const visualizers = initEnhancedVisualizers();
                    container = visualizers.container;
                }

                // Show container with CSS instead of removing/reattaching DOM elements
                if (container) {
                    container.style.display = 'block';
                    container.style.maxHeight = '500px';
                    container.style.opacity = '1';
                    container.style.marginTop = '20px';
                    container.style.marginBottom = '20px';

                    // Restart active visualizer if it was paused
                    if (window.enhancedVisualizers && window.enhancedVisualizers.isInitialized) {
                        const activeId = window.enhancedVisualizers.activeVisualizerId;
                        if (activeId && window.enhancedVisualizers.visualizers.has(activeId)) {
                            // Just restart without full reinitialization
                            window.enhancedVisualizers.visualizers.get(activeId).start();
                        }
                    }
                }

                visualizerToggle.querySelector('span').textContent = 'Hide Advanced Visualizations';
            } else {
                // Just hide with CSS instead of removing from DOM
                if (container) {
                    container.style.display = 'none';
                    container.style.maxHeight = '0';
                    container.style.opacity = '0';
                    container.style.marginTop = '0';
                    container.style.marginBottom = '0';

                    // Pause animations but don't destroy state
                    if (window.enhancedVisualizers && window.enhancedVisualizers.isInitialized) {
                        window.enhancedVisualizers.visualizers.forEach((visualizer) => {
                            visualizer.stop();
                        });
                    }
                }

                visualizerToggle.querySelector('span').textContent = 'Show Advanced Visualizations';
            }
        };
    }
});

// Export globally accessible function
window.initEnhancedVisualizers = initEnhancedVisualizers;