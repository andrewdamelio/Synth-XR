// Enhanced Visualizers for Synth XR v1.0
// This file contains improved visualization systems for the Synth XR web application

class EnhancedVisualizers {
    constructor() {
        // Main properties
        this.isInitialized = false;
        this.isVisible = false;
        this.activeVisualizer = 'spectrum'; // Default visualizer
        this.visualizers = {};
        this.canvases = {};
        this.contexts = {};
        this.container = null;
        
        // Audio analyzers (use the ones already defined in the main app)
        this.waveform = window.waveform || new Tone.Waveform(2048);
        this.fft = window.fft || new Tone.FFT(2048);
        
        // Animation properties
        this.animationFrames = {};
        
        // Color schemes
        this.colorSchemes = {
            default: {
                background: '#121212',
                primary: '#6200ea',
                secondary: '#00e5ff',
                accent1: '#ff1744',
                accent2: '#00c853',
                accent3: '#ffab00'
            },
            sunset: {
                background: '#0F0F12',
                primary: '#ff9800',
                secondary: '#ff5722',
                accent1: '#f44336',
                accent2: '#651fff',
                accent3: '#3d5afe'
            },
            neon: {
                background: '#0a0a0f',
                primary: '#00fff0',
                secondary: '#ff00ff',
                accent1: '#00ff00',
                accent2: '#ffff00',
                accent3: '#ff0000'
            },
            monochrome: {
                background: '#000000',
                primary: '#ffffff',
                secondary: '#aaaaaa',
                accent1: '#888888',
                accent2: '#666666',
                accent3: '#444444'
            }
        };
        
        // Current color scheme
        this.colorScheme = this.colorSchemes.default;
        
        // Performance monitoring
        this.fpsCounter = { lastTime: 0, frames: 0, currentFps: 0 };
        this.stats = { renderTime: 0, dataTime: 0 };
    }
    
    // Initialize the visualizer system
    init() {
        if (this.isInitialized) return;
        
        // Create the container element if it doesn't exist
        const existingContainer = document.getElementById('enhanced-visualizers-container');
        
        if (existingContainer) {
            this.container = existingContainer;
        } else {
            this.container = document.createElement('div');
            this.container.id = 'enhanced-visualizers-container';
            
            // Apply styles to the container
            Object.assign(this.container.style, {
                position: 'relative',
                width: '100%',
                height: '300px', // Larger height
                background: this.colorScheme.background,
                borderRadius: '16px',
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
        
        // Create toolbar for controls
        this.createToolbar();
        
        // Initialize all visualization canvases
        this.initCanvases();
        
        // Initialize all visualizers
        this.initVisualizers();
        
        // Add window resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        this.isInitialized = true;
        
        // Start with one visualizer active
        this.showVisualizer(this.activeVisualizer);
        
        console.log('Enhanced visualizers initialized');
    }
    
    // Create toolbar with controls
    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'visualizer-toolbar';
        
        // Style the toolbar
        Object.assign(toolbar.style, {
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
        toolbar.addEventListener('mouseenter', () => {
            toolbar.style.opacity = '1';
        });
        
        toolbar.addEventListener('mouseleave', () => {
            toolbar.style.opacity = '0.3';
        });
        
        // Add visualizer selector dropdown
        const visualizerSelector = document.createElement('select');
        visualizerSelector.className = 'visualizer-selector';
        
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
        const visualizerOptions = [
            { id: 'spectrum', label: 'Spectrum Analyzer' },
            { id: 'waveform3d', label: '3D Waveform' },
            { id: 'particles', label: 'Particle System' },
            { id: 'waterfall', label: 'Frequency Waterfall' },
            { id: 'circular', label: 'Circular Visualizer' }
        ];
        
        visualizerOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = option.label;
            visualizerSelector.appendChild(optionElement);
        });
        
        // Handle visualizer change
        visualizerSelector.addEventListener('change', () => {
            this.showVisualizer(visualizerSelector.value);
        });
        
        // Add color scheme selector
        const colorSchemeSelector = document.createElement('select');
        colorSchemeSelector.className = 'color-scheme-selector';
        
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
            const optionElement = document.createElement('option');
            optionElement.value = scheme;
            optionElement.textContent = scheme.charAt(0).toUpperCase() + scheme.slice(1);
            colorSchemeSelector.appendChild(optionElement);
        });
        
        // Handle color scheme change
        colorSchemeSelector.addEventListener('change', () => {
            this.setColorScheme(colorSchemeSelector.value);
        });
        
        // Add fullscreen toggle
        const fullscreenButton = document.createElement('button');
        fullscreenButton.className = 'fullscreen-button';
        fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
        
        // Style the fullscreen button
        Object.assign(fullscreenButton.style, {
            background: 'rgba(30, 30, 30, 0.7)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '14px',
            marginLeft: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        
        // Handle fullscreen toggle
        let isFullscreen = false;
        fullscreenButton.addEventListener('click', () => {
            if (isFullscreen) {
                // Exit fullscreen
                this.container.style.position = 'relative';
                this.container.style.height = '300px';
                this.container.style.zIndex = 'auto';
                fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
                
                // Force resize to update canvas dimensions
                this.handleResize();
            } else {
                // Enter fullscreen
                this.container.style.position = 'fixed';
                this.container.style.top = '0';
                this.container.style.left = '0';
                this.container.style.width = '100vw';
                this.container.style.height = '100vh';
                this.container.style.zIndex = '9999';
                this.container.style.borderRadius = '0';
                fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>';
                
                // Force resize to update canvas dimensions
                this.handleResize();
            }
            
            isFullscreen = !isFullscreen;
        });
        
        // Create left controls group
        const leftControls = document.createElement('div');
        leftControls.className = 'visualizer-left-controls';
        leftControls.appendChild(visualizerSelector);
        leftControls.appendChild(colorSchemeSelector);
        
        // Create right controls group
        const rightControls = document.createElement('div');
        rightControls.className = 'visualizer-right-controls';
        rightControls.appendChild(fullscreenButton);
        
        // Add controls to toolbar
        toolbar.appendChild(leftControls);
        toolbar.appendChild(rightControls);
        
        // Add toolbar to container
        this.container.appendChild(toolbar);
    }
    
    // Initialize all canvas elements
    initCanvases() {
        const visualizerIds = ['spectrum', 'waveform3d', 'particles', 'waterfall', 'circular'];
        
        visualizerIds.forEach(id => {
            const canvas = document.createElement('canvas');
            canvas.id = `visualizer-${id}`;
            canvas.className = 'visualizer-canvas';
            
            // Style the canvas
            Object.assign(canvas.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                display: 'none'
            });
            
            // Set initial canvas dimensions
            canvas.width = this.container.clientWidth;
            canvas.height = this.container.clientHeight;
            
            // Store canvas and context
            this.canvases[id] = canvas;
            this.contexts[id] = canvas.getContext('2d');
            
            // Add canvas to container
            this.container.appendChild(canvas);
        });
    }
    
    // Initialize all visualizers
    initVisualizers() {
        // Spectrum Analyzer
        this.visualizers.spectrum = {
            render: this.renderSpectrum.bind(this),
            animationFrame: null,
            options: {
                barWidth: 4,
                barSpacing: 1,
                smoothingFactor: 0.5,
                frequencyScale: 'logarithmic',
                peakDecay: 0.01,
                peakHold: 30,
                peaks: []
            }
        };
        
        // 3D Waveform
        this.visualizers.waveform3d = {
            render: this.renderWaveform3D.bind(this),
            animationFrame: null,
            options: {
                waveHistory: [],
                maxHistory: 50,
                lineWidth: 2,
                depth: 120,
                perspective: 900
            }
        };
        
        // Particle System
        this.visualizers.particles = {
            render: this.renderParticles.bind(this),
            animationFrame: null,
            options: {
                particles: [],
                particleCount: 250,
                baseSizeMultiplier: 3,
                speedMultiplier: 1.2,
                trailLength: 8,
                connectParticles: true,
                maxConnections: 5,
                maxConnectionDistance: 120,
                // Initialize particles
                init: () => {
                    const options = this.visualizers.particles.options;
                    options.particles = [];
                    const width = this.canvases.particles.width;
                    const height = this.canvases.particles.height;
                    
                    for (let i = 0; i < options.particleCount; i++) {
                        options.particles.push({
                            x: Math.random() * width,
                            y: Math.random() * height,
                            size: Math.random() * 2 + 1,
                            speedX: (Math.random() - 0.5) * options.speedMultiplier,
                            speedY: (Math.random() - 0.5) * options.speedMultiplier,
                            trail: [],
                            hue: Math.random() * 60 + 180, // Blue to purple range
                            opacity: Math.random() * 0.5 + 0.5,
                            energy: 0
                        });
                    }
                }
            }
        };
        
        // Frequency Waterfall
        this.visualizers.waterfall = {
            render: this.renderWaterfall.bind(this),
            animationFrame: null,
            options: {
                history: [],
                historyLength: 200,
                frequencyBins: 512,
                colorScale: 'viridis',
                scrollSpeed: 1,
                lastUpdate: 0
            }
        };
        
        // Circular Visualizer
        this.visualizers.circular = {
            render: this.renderCircular.bind(this),
            animationFrame: null,
            options: {
                rings: 3,
                segments: 128,
                rotation: 0,
                rotationSpeed: 0.002,
                bassImpact: 5,
                midImpact: 3,
                trebleImpact: 2,
                radius: 0,
                innerRadius: 20,
                centerX: 0,
                centerY: 0
            }
        };
        
        // Initialize particles
        this.visualizers.particles.options.init();
    }
    
    // Show a specific visualizer
    showVisualizer(id) {
        if (!this.isInitialized) this.init();
        
        // Stop all animation frames
        Object.keys(this.visualizers).forEach(vizId => {
            if (this.visualizers[vizId].animationFrame) {
                cancelAnimationFrame(this.visualizers[vizId].animationFrame);
                this.visualizers[vizId].animationFrame = null;
            }
            
            // Hide all canvases
            if (this.canvases[vizId]) {
                this.canvases[vizId].style.display = 'none';
            }
        });
        
        // Show the selected canvas
        if (this.canvases[id]) {
            this.canvases[id].style.display = 'block';
        }
        
        // Start the selected visualizer
        this.activeVisualizer = id;
        this.startVisualizer(id);
        
        // Update the selector if it exists
        const selector = this.container.querySelector('.visualizer-selector');
        if (selector && selector.value !== id) {
            selector.value = id;
        }
    }
    
    // Start a visualizer animation
    startVisualizer(id) {
        if (!this.visualizers[id]) return;
        
        const visualizer = this.visualizers[id];
        
        // Special initialization for some visualizers
        if (id === 'waterfall') {
            // Clear history on start
            visualizer.options.history = [];
            visualizer.options.lastUpdate = 0;
        } else if (id === 'waveform3d') {
            // Clear wave history
            visualizer.options.waveHistory = [];
        } else if (id === 'circular') {
            // Set dynamic properties
            const canvas = this.canvases[id];
            visualizer.options.centerX = canvas.width / 2;
            visualizer.options.centerY = canvas.height / 2;
            visualizer.options.radius = Math.min(canvas.width, canvas.height) * 0.40;
        }
        
        // Animation loop function
        const animate = () => {
            // Track FPS
            this.updateFPS();
            
            // Render the visualizer
            visualizer.render();
            
            // Request next frame
            visualizer.animationFrame = requestAnimationFrame(animate);
        };
        
        // Start animation
        visualizer.animationFrame = requestAnimationFrame(animate);
    }
    
    // Handle window resize
    handleResize() {
        // Only resize if initialized
        if (!this.isInitialized) return;
        
        // Update canvas dimensions for all visualizers
        Object.keys(this.canvases).forEach(id => {
            const canvas = this.canvases[id];
            canvas.width = this.container.clientWidth;
            canvas.height = this.container.clientHeight;
        });
        
        // Update circular visualizer center and radius
        if (this.visualizers.circular) {
            const options = this.visualizers.circular.options;
            const canvas = this.canvases.circular;
            
            options.centerX = canvas.width / 2;
            options.centerY = canvas.height / 2;
            options.radius = Math.min(canvas.width, canvas.height) * 0.40;
        }
        
        // Reinitialize particles
        if (this.visualizers.particles && this.visualizers.particles.options.init) {
            this.visualizers.particles.options.init();
        }
    }
    
    // Update FPS counter
    updateFPS() {
        const now = performance.now();
        const elapsed = now - this.fpsCounter.lastTime;
        
        // Update FPS every second
        if (elapsed > 1000) {
            this.fpsCounter.currentFps = this.fpsCounter.frames;
            this.fpsCounter.frames = 0;
            this.fpsCounter.lastTime = now;
        } else {
            this.fpsCounter.frames++;
        }
    }
    
    // Set color scheme
    setColorScheme(schemeName) {
        if (this.colorSchemes[schemeName]) {
            this.colorScheme = this.colorSchemes[schemeName];
            
            // Update background color of container
            if (this.container) {
                this.container.style.background = this.colorScheme.background;
            }
        }
    }
    
    // VISUALIZER RENDERING FUNCTIONS
    
    // Render spectrum analyzer
    renderSpectrum() {
        const canvas = this.canvases.spectrum;
        const ctx = this.contexts.spectrum;
        const options = this.visualizers.spectrum.options;
        
        // Get FFT data
        const fftData = this.fft.getValue();
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fill background
        ctx.fillStyle = this.colorScheme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw frequency grid
        this.drawFrequencyGrid(ctx, canvas.width, canvas.height);
        
        // Calculate bar width based on canvas width
        const totalBars = Math.min(fftData.length / 4, Math.floor(canvas.width / (options.barWidth + options.barSpacing)));
        options.barWidth = Math.max(2, Math.floor(canvas.width / totalBars) - options.barSpacing);
        
        // Initialize peaks array if needed
        if (!options.peaks || options.peaks.length !== totalBars) {
            options.peaks = new Array(totalBars).fill(0);
        }
        
        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, this.colorScheme.primary);
        gradient.addColorStop(0.5, this.colorScheme.secondary);
        gradient.addColorStop(1, this.colorScheme.accent1);
        
        // Draw frequency bars
        ctx.fillStyle = gradient;
        
        // Logarithmic or linear frequency scale
        const scale = options.frequencyScale === 'logarithmic' ? 'log' : 'linear';
        
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
            
            // Get value and convert to dB
            const value = fftData[barIndex];
            
            // Calculate magnitude (0-1)
            const magnitude = this.normalizeFFTValue(value);
            
            // Apply smoothing from previous frame
            if (options.smoothedMagnitudes) {
                const smoothed = options.smoothedMagnitudes[i] || 0;
                options.smoothedMagnitudes[i] = smoothed * options.smoothingFactor + magnitude * (1 - options.smoothingFactor);
            } else {
                options.smoothedMagnitudes = new Array(totalBars).fill(0);
                options.smoothedMagnitudes[i] = magnitude;
            }
            
            const smoothedMagnitude = options.smoothedMagnitudes[i];
            
            // Calculate bar height
            const barHeight = smoothedMagnitude * canvas.height;
            
            // Update peak
            if (barHeight > options.peaks[i]) {
                options.peaks[i] = barHeight;
            } else {
                // Decay peak
                options.peaks[i] -= canvas.height * options.peakDecay;
            }
            
            // Ensure peak doesn't go below the bar
            options.peaks[i] = Math.max(barHeight, options.peaks[i]);
            
            // Draw bar
            const barX = i * (options.barWidth + options.barSpacing);
            const barY = canvas.height - barHeight;
            
            ctx.fillRect(barX, barY, options.barWidth, barHeight);
            
            // Draw peak with a different color
            ctx.fillStyle = this.colorScheme.accent3;
            ctx.fillRect(barX, canvas.height - options.peaks[i] - 2, options.barWidth, 2);
            ctx.fillStyle = gradient;
        }
        
        // Draw FPS counter
        this.drawFPS(ctx, canvas.width, canvas.height);
    }
    
    // Render 3D Waveform
    renderWaveform3D() {
        const canvas = this.canvases.waveform3d;
        const ctx = this.contexts.waveform3d;
        const options = this.visualizers.waveform3d.options;
        
        // Get waveform data
        const waveData = this.waveform.getValue();
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fill background
        ctx.fillStyle = this.colorScheme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add current waveform to history
        options.waveHistory.unshift(waveData.slice(0));
        
        // Limit history length
        if (options.waveHistory.length > options.maxHistory) {
            options.waveHistory.pop();
        }
        
        // Calculate wave gap based on available height
        const waveGap = canvas.height / (options.maxHistory + 1);
        
        // Draw from back to front (oldest to newest)
        for (let z = options.waveHistory.length - 1; z >= 0; z--) {
            const wave = options.waveHistory[z];
            const depth = z / options.waveHistory.length; // 1 = back, 0 = front
            
            // Calculate y position with perspective
            const y = canvas.height - waveGap * (options.waveHistory.length - z);
            
            // Draw the waveform
            ctx.beginPath();
            
            // Set line style with perspective
            ctx.lineWidth = options.lineWidth * (1 - depth * 0.7);
            
            // Create gradient for line color
            const colorDepth = 1 - depth;
            const r = parseInt(this.lerp(50, parseInt(this.colorScheme.secondary.slice(1, 3), 16), colorDepth));
            const g = parseInt(this.lerp(50, parseInt(this.colorScheme.secondary.slice(3, 5), 16), colorDepth));
            const b = parseInt(this.lerp(150, parseInt(this.colorScheme.secondary.slice(5, 7), 16), colorDepth));
            
            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            
            // Apply shadow for older lines
            if (z < options.waveHistory.length - 10) {
                ctx.shadowColor = this.colorScheme.secondary;
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
        
        // Draw perspective grid
        this.draw3DGrid(ctx, canvas.width, canvas.height, options.maxHistory);
        
        // Draw FPS counter
        this.drawFPS(ctx, canvas.width, canvas.height);
    }
    
    // Render particle system
    renderParticles() {
        const canvas = this.canvases.particles;
        const ctx = this.contexts.particles;
        const options = this.visualizers.particles.options;
        const particles = options.particles;
        
        // Get audio data
        const waveformData = this.waveform.getValue();
        const fftData = this.fft.getValue();
        
        // Calculate audio energy in different frequency bands
        const bassEnergy = this.getFrequencyBandEnergy(fftData, 0, 10) * 2;
        const midEnergy = this.getFrequencyBandEnergy(fftData, 20, 60);
        const trebleEnergy = this.getFrequencyBandEnergy(fftData, 80, 120);
        
        // Overall energy affects particles
        const overallEnergy = (bassEnergy * 3 + midEnergy + trebleEnergy) / 5;
        
        // Clear canvas with semi-transparent fade effect
        ctx.fillStyle = `rgba(${parseInt(this.colorScheme.background.slice(1, 3), 16)}, 
                              ${parseInt(this.colorScheme.background.slice(3, 5), 16)}, 
                              ${parseInt(this.colorScheme.background.slice(5, 7), 16)}, 0.15)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw particles
        const connections = [];
        
        particles.forEach((p, i) => {
            // Store previous position for trail
            if (p.trail.length >= options.trailLength) {
                p.trail.pop();
            }
            p.trail.unshift({x: p.x, y: p.y});
            
            // Apply audio reactivity
            p.energy = p.energy * 0.7 + overallEnergy * 0.3;
            
            // Update size based on energy
            const energyImpact = p.energy * 2;
            const currentSize = p.size * (1 + energyImpact * options.baseSizeMultiplier);
            
            // Update position
            p.x += p.speedX * (1 + bassEnergy * 2);
            p.y += p.speedY * (1 + midEnergy * 2);
            
            // Influence direction based on treble
            p.speedX += (Math.random() - 0.5) * trebleEnergy * 0.3;
            p.speedY += (Math.random() - 0.5) * trebleEnergy * 0.3;
            
            // Apply damping
            p.speedX *= 0.98;
            p.speedY *= 0.98;
            
            // Wrap around edges
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
            
            // Find connections to nearby particles
            if (options.connectParticles && overallEnergy > 0.15) {
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < options.maxConnectionDistance * (1 + overallEnergy)) {
                        connections.push({
                            p1: p,
                            p2: p2,
                            distance: distance,
                            opacity: (1 - distance / (options.maxConnectionDistance * (1 + overallEnergy))) * p.opacity * p2.opacity
                        });
                    }
                }
            }
            
            // Draw particle trail using gradient
            if (p.trail.length > 1) {
                ctx.beginPath();
                
                // Create gradient for trail
                const trailGradient = ctx.createLinearGradient(
                    p.trail[0].x, p.trail[0].y,
                    p.trail[p.trail.length - 1].x, p.trail[p.trail.length - 1].y
                );
                
                const hue = p.hue + (trebleEnergy * 50);
                trailGradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${p.opacity})`);
                trailGradient.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
                
                ctx.strokeStyle = trailGradient;
                ctx.lineWidth = currentSize / 2;
                
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let t = 1; t < p.trail.length; t++) {
                    ctx.lineTo(p.trail[t].x, p.trail[t].y);
                }
                
                ctx.stroke();
            }
            
            // Draw particle
            ctx.globalAlpha = p.opacity;
            
            // Create radial gradient for particle
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize);
            gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${p.opacity})`);
            gradient.addColorStop(1, `hsla(${p.hue}, 100%, 40%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw connections
        ctx.globalAlpha = 1;
        
        // Sort connections by distance (furthest first for better layering)
        connections.sort((a, b) => b.distance - a.distance);
        
        // Limit the number of connections for performance
        const maxConnections = Math.min(connections.length, Math.ceil(options.maxConnections * (1 + overallEnergy * 10)));
        
        for (let i = 0; i < maxConnections; i++) {
            const c = connections[i];
            
            // Create gradient for connection
            const gradient = ctx.createLinearGradient(c.p1.x, c.p1.y, c.p2.x, c.p2.y);
            const hue1 = c.p1.hue;
            const hue2 = c.p2.hue;
            
            gradient.addColorStop(0, `hsla(${hue1}, 100%, 60%, ${c.opacity})`);
            gradient.addColorStop(1, `hsla(${hue2}, 100%, 60%, ${c.opacity})`);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = Math.max(0.5, Math.min(c.p1.size, c.p2.size) / 2 * c.opacity);
            
            ctx.beginPath();
            ctx.moveTo(c.p1.x, c.p1.y);
            ctx.lineTo(c.p2.x, c.p2.y);
            ctx.stroke();
        }
        
        // Draw pulsing background circle on bass hit
        if (bassEnergy > 0.6) {
            const pulseRadius = Math.min(canvas.width, canvas.height) * 0.3 * bassEnergy;
            
            const pulseGradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, pulseRadius
            );
            
            pulseGradient.addColorStop(0, `rgba(${parseInt(this.colorScheme.primary.slice(1, 3), 16)}, 
                                            ${parseInt(this.colorScheme.primary.slice(3, 5), 16)}, 
                                            ${parseInt(this.colorScheme.primary.slice(5, 7), 16)}, ${bassEnergy * 0.3})`);
            pulseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = pulseGradient;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, pulseRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Reset global alpha
        ctx.globalAlpha = 1;
        
        // Draw FPS counter
        this.drawFPS(ctx, canvas.width, canvas.height);
    }
    
    // Render frequency waterfall
    renderWaterfall() {
        const canvas = this.canvases.waterfall;
        const ctx = this.contexts.waterfall;
        const options = this.visualizers.waterfall.options;
        
        // Get FFT data
        const fftData = this.fft.getValue();
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fill background
        ctx.fillStyle = this.colorScheme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Current time
        const now = performance.now();
        
        // Add new line at appropriate rate
        if (now - options.lastUpdate > 16 * options.scrollSpeed) {
            // Resample FFT data to match our bin count
            const newLine = new Array(options.frequencyBins).fill(0);
            
            for (let i = 0; i < options.frequencyBins; i++) {
                // Logarithmic frequency scaling
                const fftIndex = Math.floor(Math.pow(i / options.frequencyBins, 2) * (fftData.length / 4));
                newLine[i] = this.normalizeFFTValue(fftData[fftIndex]);
            }
            
            // Add to history
            options.history.unshift(newLine);
            
            // Trim history if too long
            if (options.history.length > options.historyLength) {
                options.history.pop();
            }
            
            options.lastUpdate = now;
        }
        
        // Calculate line height
        const lineHeight = canvas.height / options.historyLength;
        
        // Draw each line of history
        for (let y = 0; y < options.history.length; y++) {
            const line = options.history[y];
            
            // Create image data for the line
            const imageData = ctx.createImageData(canvas.width, lineHeight);
            const data = imageData.data;
            
            for (let x = 0; x < canvas.width; x++) {
                // Map canvas x to frequency bin
                const binIndex = Math.floor((x / canvas.width) * options.frequencyBins);
                
                // Get intensity from history line
                const intensity = line[binIndex];
                
                // Calculate color
                const color = this.getViridisColor(intensity);
                
                // Set pixels
                const pixelIndex = (x * 4);
                data[pixelIndex] = color.r;
                data[pixelIndex + 1] = color.g;
                data[pixelIndex + 2] = color.b;
                data[pixelIndex + 3] = 255; // Alpha
                
                // Repeat the pixel for the line height
                for (let h = 1; h < lineHeight; h++) {
                    const offset = h * canvas.width * 4;
                    data[pixelIndex + offset] = color.r;
                    data[pixelIndex + offset + 1] = color.g;
                    data[pixelIndex + offset + 2] = color.b;
                    data[pixelIndex + offset + 3] = 255;
                }
            }
            
            // Draw the line
            ctx.putImageData(imageData, 0, y * lineHeight);
        }
        
        // Draw frequency labels
        this.drawFrequencyLabels(ctx, canvas.width, canvas.height);
        
        // Draw FPS counter
        this.drawFPS(ctx, canvas.width, canvas.height);
    }
    
    // Render circular visualizer
    renderCircular() {
        const canvas = this.canvases.circular;
        const ctx = this.contexts.circular;
        const options = this.visualizers.circular.options;
        
        // Get audio data
        const fftData = this.fft.getValue();
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fill background
        ctx.fillStyle = this.colorScheme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate audio energy in different frequency bands
        const bassEnergy = this.getFrequencyBandEnergy(fftData, 0, 10);
        const midEnergy = this.getFrequencyBandEnergy(fftData, 20, 60);
        const trebleEnergy = this.getFrequencyBandEnergy(fftData, 80, 120);
        
        // Update rotation based on audio energy
        options.rotation += options.rotationSpeed * (1 + bassEnergy * 2);
        
        // Draw center glow
        const centerGlow = ctx.createRadialGradient(
            options.centerX, options.centerY, 0,
            options.centerX, options.centerY, options.radius * 0.5
        );
        
        centerGlow.addColorStop(0, `rgba(${parseInt(this.colorScheme.secondary.slice(1, 3), 16)}, 
                                        ${parseInt(this.colorScheme.secondary.slice(3, 5), 16)}, 
                                        ${parseInt(this.colorScheme.secondary.slice(5, 7), 16)}, ${0.1 + bassEnergy * 0.3})`);
        centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = centerGlow;
        ctx.beginPath();
        ctx.arc(options.centerX, options.centerY, options.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw rings
        for (let ring = 0; ring < options.rings; ring++) {
            const ringRadius = options.innerRadius + (options.radius - options.innerRadius) * (ring / options.rings);
            const nextRingRadius = options.innerRadius + (options.radius - options.innerRadius) * ((ring + 1) / options.rings);
            
            // Select color based on ring
            let ringColor;
            if (ring === 0) {
                ringColor = this.colorScheme.primary;
            } else if (ring === 1) {
                ringColor = this.colorScheme.secondary;
            } else {
                ringColor = this.colorScheme.accent1;
            }
            
            // Draw segments
            for (let i = 0; i < options.segments; i++) {
                const angle = (i / options.segments) * Math.PI * 2 + options.rotation;
                const nextAngle = ((i + 1) / options.segments) * Math.PI * 2 + options.rotation;
                
                // Get frequency data for this segment
                const fftIndex = Math.floor((i / options.segments) * (fftData.length / 4));
                const value = this.normalizeFFTValue(fftData[fftIndex]);
                
                // Calculate segment radius offset based on frequency and ring
                let radiusOffset = 0;
                
                if (ring === 0) {
                    // Bass impacts inner ring more
                    radiusOffset = bassEnergy * options.bassImpact * value * 50;
                } else if (ring === 1) {
                    // Mids impact middle ring
                    radiusOffset = midEnergy * options.midImpact * value * 50;
                } else {
                    // Treble impacts outer ring
                    radiusOffset = trebleEnergy * options.trebleImpact * value * 50;
                }
                
                // Calculate start and end points
                const innerRadius = ringRadius + radiusOffset * 0.3;
                const outerRadius = nextRingRadius + radiusOffset;
                
                const startX = options.centerX + Math.cos(angle) * innerRadius;
                const startY = options.centerY + Math.sin(angle) * innerRadius;
                
                const outerStartX = options.centerX + Math.cos(angle) * outerRadius;
                const outerStartY = options.centerY + Math.sin(angle) * outerRadius;
                
                const endX = options.centerX + Math.cos(nextAngle) * innerRadius;
                const endY = options.centerY + Math.sin(nextAngle) * innerRadius;
                
                const outerEndX = options.centerX + Math.cos(nextAngle) * outerRadius;
                const outerEndY = options.centerY + Math.sin(nextAngle) * outerRadius;
                
                // Create gradient
                const gradient = ctx.createLinearGradient(
                    options.centerX, options.centerY,
                    outerStartX, outerStartY
                );
                
                const alpha = 0.2 + value * 0.8;
                
                gradient.addColorStop(0, `rgba(${parseInt(ringColor.slice(1, 3), 16)}, 
                                            ${parseInt(ringColor.slice(3, 5), 16)}, 
                                            ${parseInt(ringColor.slice(5, 7), 16)}, ${alpha * 0.1})`);
                gradient.addColorStop(1, `rgba(${parseInt(ringColor.slice(1, 3), 16)}, 
                                            ${parseInt(ringColor.slice(3, 5), 16)}, 
                                            ${parseInt(ringColor.slice(5, 7), 16)}, ${alpha})`);
                
                // Draw segment
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(outerStartX, outerStartY);
                ctx.lineTo(outerEndX, outerEndY);
                ctx.lineTo(endX, endY);
                ctx.closePath();
                ctx.fill();
                
                // Draw outline
                ctx.strokeStyle = `rgba(${parseInt(ringColor.slice(1, 3), 16)}, 
                                        ${parseInt(ringColor.slice(3, 5), 16)}, 
                                        ${parseInt(ringColor.slice(5, 7), 16)}, ${alpha * 0.5})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
        
        // Draw center circle
        ctx.fillStyle = this.colorScheme.secondary;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(options.centerX, options.centerY, options.innerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Draw rotating particles around the circle based on audio energy
        const particleCount = Math.floor(20 + bassEnergy * 40);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + options.rotation * 2;
            const distance = options.radius * (0.8 + Math.sin(angle * 3) * 0.2);
            
            const x = options.centerX + Math.cos(angle) * distance;
            const y = options.centerY + Math.sin(angle) * distance;
            
            const particleSize = 1 + bassEnergy * 5;
            
            ctx.fillStyle = this.colorScheme.accent3;
            ctx.beginPath();
            ctx.arc(x, y, particleSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw FPS counter
        this.drawFPS(ctx, canvas.width, canvas.height);
    }
    
    // HELPER FUNCTIONS
    
    // Draw frequency grid
    drawFrequencyGrid(ctx, width, height) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical grid lines at key frequencies
        const frequencies = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 15000];
        
        frequencies.forEach(freq => {
            const x = this.logScale(freq, 20, 20000, 0, width);
            
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
            const y = this.dbToY(db, height);
            
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
    
    // Draw 3D perspective grid
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
    
    // Draw frequency labels
    drawFrequencyLabels(ctx, width, height) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        const frequencies = [100, 500, 1000, 5000, 10000];
        
        frequencies.forEach(freq => {
            const x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
            const label = freq >= 1000 ? `${freq/1000}k` : freq;
            
            ctx.fillText(label, x, 12);
        });
    }
    
    // Draw FPS counter
    drawFPS(ctx, width, height) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`FPS: ${this.fpsCounter.currentFps}`, width - 10, 15);
    }
    
    // Viridis colormap function
    getViridisColor(t) {
        // Constants for the Viridis colormap
        const viridis = [
            [0.267004, 0.004874, 0.329415],
            [0.282623, 0.140926, 0.457517],
            [0.253935, 0.265254, 0.529983],
            [0.206756, 0.371758, 0.553117],
            [0.163625, 0.471133, 0.558148],
            [0.127568, 0.566949, 0.550556],
            [0.134692, 0.658636, 0.517649],
            [0.266941, 0.748751, 0.428681],
            [0.477504, 0.821444, 0.318195],
            [0.741388, 0.873449, 0.149561],
            [0.993248, 0.906157, 0.143936]
        ];
        
        // Clamp t to the range [0, 1]
        t = Math.max(0, Math.min(1, t));
        
        // Map t to the proper segment
        const idx = Math.min(Math.floor(t * (viridis.length - 1)), viridis.length - 2);
        const fractional = (t * (viridis.length - 1)) - idx;
        
        // Linear interpolation between colors
        const r1 = viridis[idx][0];
        const g1 = viridis[idx][1];
        const b1 = viridis[idx][2];
        
        const r2 = viridis[idx + 1][0];
        const g2 = viridis[idx + 1][1];
        const b2 = viridis[idx + 1][2];
        
        return {
            r: Math.round(this.lerp(r1, r2, fractional) * 255),
            g: Math.round(this.lerp(g1, g2, fractional) * 255),
            b: Math.round(this.lerp(b1, b2, fractional) * 255)
        };
    }
    
    // Linear interpolation
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    // Logarithmic scale
    logScale(value, minInput, maxInput, minOutput, maxOutput) {
        const minLog = Math.log10(minInput);
        const maxLog = Math.log10(maxInput);
        const valueLog = Math.log10(value);
        
        const scale = (valueLog - minLog) / (maxLog - minLog);
        return minOutput + scale * (maxOutput - minOutput);
    }
    
    // Convert dB to Y coordinate
    dbToY(db, height) {
        // Map -60dB..0dB to height..0
        return height - ((db + 60) / 60) * height;
    }
    
    // Normalize FFT value (input: -100 to 0, output: 0 to 1)
    normalizeFFTValue(value) {
        // Convert linear magnitude to dB
        let dbValue = 20 * Math.log10(Math.abs(value) + 1e-10);
        
        // Clamp to range
        dbValue = Math.max(-100, Math.min(0, dbValue));
        
        // Normalize -100dB..0dB to 0..1
        return (dbValue + 100) / 100;
    }
    
    // Get energy in a frequency band
    getFrequencyBandEnergy(fftData, startBin, endBin) {
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
    }
}

// Create global instance
window.enhancedVisualizers = new EnhancedVisualizers();

// Initialize visualizers when document is loaded or when called
document.addEventListener('DOMContentLoaded', () => {
    const advancedVisualizersDiv = document.getElementById('advancedVisualizers');
    const visualizerToggle = document.getElementById('visualizerToggle');
    
    if (visualizerToggle) {
        // Replace the old click handler
        const oldClickHandler = visualizerToggle.onclick;
        
        visualizerToggle.onclick = function() {
            // Initialize enhanced visualizers if needed
            if (!window.enhancedVisualizers.isInitialized) {
                window.enhancedVisualizers.init();
            }
            
            // Toggle as before, but also show our new visualizers
            if (oldClickHandler) {
                oldClickHandler.call(visualizerToggle);
            } else {
                // Fallback if old handler not found
                const isExpanded = visualizerToggle.classList.toggle('active');
                
                if (isExpanded) {
                    advancedVisualizersDiv.style.maxHeight = '500px';
                    visualizerToggle.querySelector('span').textContent = 'Hide Advanced Visualizations';
                } else {
                    advancedVisualizersDiv.style.maxHeight = '0';
                    visualizerToggle.querySelector('span').textContent = 'Show Advanced Visualizations';
                }
            }
        };
    }
});

// Add CSS to the document
const visualizerStyles = document.createElement('style');
visualizerStyles.textContent = `
/* Enhanced visualizer styles */
#enhanced-visualizers-container {
    position: relative;
    width: 100%;
    height: 300px;
    background: #121212;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    transition: all 0.3s ease;
    margin-top: 20px;
    margin-bottom: 20px;
}

.visualizer-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: none;
}

.visualizer-toolbar {
    position: absolute;
    top: 10px;
    left: 10px;
    right: 10px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    z-index: 100;
    transition: opacity 0.3s ease;
    opacity: 0.3;
}

.visualizer-toolbar:hover {
    opacity: 1;
}

.visualizer-selector,
.color-scheme-selector {
    background: rgba(30, 30, 30, 0.7);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 14px;
    outline: none;
    cursor: pointer;
}

.fullscreen-button {
    background: rgba(30, 30, 30, 0.7);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.visualizer-left-controls,
.visualizer-right-controls {
    display: flex;
    align-items: center;
    gap: 10px;
}
`;

document.head.appendChild(visualizerStyles);

// Function to initialize the visualizers manually
function initEnhancedVisualizers() {
    if (window.enhancedVisualizers && !window.enhancedVisualizers.isInitialized) {
        window.enhancedVisualizers.init();
    }
}

// Export the function for manual initialization
window.initEnhancedVisualizers = initEnhancedVisualizers;