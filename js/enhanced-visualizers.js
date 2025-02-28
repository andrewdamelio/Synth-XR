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
        
        // Use the global analyzers
        this.waveform = window.waveform;
        this.fft = window.fft;
        
        // Create backup analyzers only if global ones don't exist
        if (!this.waveform) {
            console.warn('Global waveform analyzer not found, creating a new one');
            this.waveform = new Tone.Waveform(2048);
            
            // Try to connect to master output
            if (Tone.getDestination) {
                Tone.getDestination().connect(this.waveform);
            }
        }
        
        if (!this.fft) {
            console.warn('Global FFT analyzer not found, creating a new one');
            this.fft = new Tone.FFT(2048);
            
            // Try to connect to master output
            if (Tone.getDestination) {
                Tone.getDestination().connect(this.fft);
            }
        }
        
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
        
        console.log('Enhanced visualizers created with analyzers:', 
                   !!this.waveform ? 'Waveform connected' : 'Waveform missing',
                   !!this.fft ? 'FFT connected' : 'FFT missing');
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
            // { id: 'waterfall', label: 'Frequency Waterfall' },
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
        let originalStyles = {};

        fullscreenButton.addEventListener('click', () => {
            if (isFullscreen) {
                // Exit fullscreen
                Object.keys(originalStyles).forEach(prop => {
                    this.container.style[prop] = originalStyles[prop];
                });
                
                fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
                
                // Use standard fullscreen exit method
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) { // Safari
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) { // IE/Edge
                    document.msExitFullscreen();
                }
                
                // Force resize to update canvas dimensions
                this.handleResize();
            } else {
                // Store original styles before going fullscreen
                originalStyles = {
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

                fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>';
                
                // Force resize to update canvas dimensions
                this.handleResize();
            }
            
            isFullscreen = !isFullscreen;
        });

        // Handle fullscreen change events to ensure consistent state
        document.addEventListener('fullscreenchange', () => {
            isFullscreen = !!document.fullscreenElement;
            if (!document.fullscreenElement) {
                // Restore original styles if fullscreen was exited by browser chrome
                Object.keys(originalStyles).forEach(prop => {
                    this.container.style[prop] = originalStyles[prop];
                });
                fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
                this.handleResize();
            }
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
        
        // Get current container dimensions
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        
        // Update canvas dimensions for all visualizers
        Object.keys(this.canvases).forEach(id => {
            const canvas = this.canvases[id];
            canvas.width = containerWidth;
            canvas.height = containerHeight;
        });
        
        // Reset visualizer-specific properties
        const visualizersToReset = [
            'circular', 
            'waveform3d', 
            'terrain', 
            'vortex', 
            'bloom', 
            'holographic'
        ];
        
        visualizersToReset.forEach(id => {
            if (this.visualizers[id]) {
                const options = this.visualizers[id].options;
                const canvas = this.canvases[id];
                
                // Reset center and radius for circular-like visualizers
                if (options.centerX !== undefined) {
                    options.centerX = canvas.width / 2;
                    options.centerY = canvas.height / 2;
                }
                
                // Reset radius for circular visualizer
                if (options.radius !== undefined) {
                    options.radius = Math.min(canvas.width, canvas.height) * 0.40;
                }
                
                // Reset perspective for 3D-like visualizers
                if (options.perspective !== undefined) {
                    options.perspective = 800; // Reset to standard perspective
                }
                
                // Reset rotation angles
                if (options.angleX !== undefined) {
                    options.angleX = Math.PI / 4;
                }
                if (options.angleY !== undefined) {
                    options.angleY = Math.PI / 16;
                }
                
                // Reset scale for terrain-like visualizers
                if (options.scale !== undefined) {
                    options.scale = 8;
                }
            }
        });
        
        // Reinitialize particles and other dynamic visualizers
        const dynamicVisualizers = [
            'particles', 
            'neural', 
            'terrain', 
            'vortex', 
            'bloom', 
            'caustics'
        ];
        
        dynamicVisualizers.forEach(id => {
            if (this.visualizers[id] && 
                this.visualizers[id].options.init && 
                typeof this.visualizers[id].options.init === 'function') {
                this.visualizers[id].options.init();
            }
        });
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
    if (!window.enhancedVisualizers.isInitialized) {
        window.enhancedVisualizers.init();
        
        // Ensure visualizers are hidden by default
        const container = document.getElementById('enhanced-visualizers-container');
        if (container) {
            container.style.maxHeight = '0';
            container.style.overflow = 'hidden';
            container.style.marginTop = '10px';
            container.style.marginBottom = '10px';
        }
    }
    
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
                const isExpanded = visualizerToggle.classList.toggle('active');
                const container = document.getElementById('enhanced-visualizers-container');
                
                if (isExpanded && container) {
                    container.style.maxHeight = '500px';
                    container.style.marginTop = '20px';
                    container.style.marginBottom = '20px';
                    visualizerToggle.querySelector('span').textContent = 'Hide Advanced Visualizations';
                } else if (container) {
                    container.style.maxHeight = '0';
                    container.style.marginTop = '10px';
                    container.style.marginBottom = '10px';
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

// Extend EnhancedVisualizers class with more advanced visualizations
// Add these functions to the existing EnhancedVisualizers class

// First, let's extend the initialization code to add our new visualizers
const originalInitVisualizers = EnhancedVisualizers.prototype.initVisualizers;
EnhancedVisualizers.prototype.initVisualizers = function() {
    // Call the original init function first
    originalInitVisualizers.call(this);
    
    // Add our new fancy visualizers
    
    // Neural Network visualizer
    this.visualizers.neural = {
        render: this.renderNeuralNetwork.bind(this),
        animationFrame: null,
        options: {
            nodes: [],
            connections: [],
            nodeCount: 60,
            initialConnectionCount: 100,
            maxConnections: 200,
            nodeSize: 4,
            pulseSpeed: 0.05,
            init: () => {
                const options = this.visualizers.neural.options;
                options.nodes = [];
                options.connections = [];
                
                const width = this.canvases.neural.width;
                const height = this.canvases.neural.height;
                
                // Create nodes with random positions
                for (let i = 0; i < options.nodeCount; i++) {
                    options.nodes.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        size: options.nodeSize * (0.5 + Math.random()),
                        color: Math.random() > 0.5 ? this.colorScheme.secondary : this.colorScheme.primary,
                        pulsePhase: Math.random() * Math.PI * 2,
                        energy: 0,
                        isActive: false
                    });
                }
                
                // Create initial connections
                for (let i = 0; i < options.initialConnectionCount; i++) {
                    const nodeA = Math.floor(Math.random() * options.nodes.length);
                    let nodeB = Math.floor(Math.random() * options.nodes.length);
                    
                    // Avoid self-connections
                    while (nodeB === nodeA) {
                        nodeB = Math.floor(Math.random() * options.nodes.length);
                    }
                    
                    options.connections.push({
                        from: nodeA,
                        to: nodeB,
                        strength: Math.random(),
                        active: false,
                        pulsePosition: 0,
                        direction: Math.random() > 0.5 ? 1 : -1,
                        speed: 0.01 + Math.random() * 0.05
                    });
                }
            }
        }
    };
    
    // Audio Terrain (3D landscape) visualizer
    this.visualizers.terrain = {
        render: this.renderAudioTerrain.bind(this),
        animationFrame: null,
        options: {
            gridSize: 60,
            heightMap: [],
            heightHistory: [],
            maxHistory: 10,
            angleX: Math.PI / 4,
            angleY: Math.PI / 16,
            scale: 8,
            color1: this.colorScheme.primary,
            color2: this.colorScheme.secondary,
            terrainHeight: 120,
            waterLevel: 20,
            lastMouseX: 0,
            lastMouseY: 0,
            isMouseDown: false,
            init: () => {
                const options = this.visualizers.terrain.options;
                
                // Initialize height map with zeros
                options.heightMap = new Array(options.gridSize).fill(0)
                    .map(() => new Array(options.gridSize).fill(0));
                
                // Initialize height history
                options.heightHistory = [];
                
                // Add mouse controls for rotation
                const canvas = this.canvases.terrain;
                
                if (canvas) {
                    canvas.addEventListener('mousedown', (e) => {
                        options.isMouseDown = true;
                        options.lastMouseX = e.clientX;
                        options.lastMouseY = e.clientY;
                    });
                    
                    canvas.addEventListener('mouseup', () => {
                        options.isMouseDown = false;
                    });
                    
                    canvas.addEventListener('mousemove', (e) => {
                        if (options.isMouseDown) {
                            const deltaX = e.clientX - options.lastMouseX;
                            const deltaY = e.clientY - options.lastMouseY;
                            
                            options.angleY += deltaX * 0.01;
                            options.angleX = Math.max(0, Math.min(Math.PI / 2, options.angleX + deltaY * 0.01));
                            
                            options.lastMouseX = e.clientX;
                            options.lastMouseY = e.clientY;
                        }
                    });
                    
                    canvas.addEventListener('mouseleave', () => {
                        options.isMouseDown = false;
                    });
                }
            }
        }
    };
    
    // Vortex visualizer
    this.visualizers.vortex = {
        render: this.renderVortex.bind(this),
        animationFrame: null,
        options: {
            rings: 5,
            pointsPerRing: 180,
            rotationSpeed: 0.005,
            waveAmplitude: 20,
            waveFrequency: 6,
            waveSpeed: 0.02,
            depthScale: 600,
            ringScale: 0.85,
            time: 0,
            points: [],
            init: () => {
                const options = this.visualizers.vortex.options;
                options.points = [];
                
                // Reset time
                options.time = 0;
                
                // Pre-calculate all points
                for (let ring = 0; ring < options.rings; ring++) {
                    const ringPoints = [];
                    const radius = 100 * Math.pow(options.ringScale, ring);
                    
                    for (let p = 0; p < options.pointsPerRing; p++) {
                        const angle = (p / options.pointsPerRing) * Math.PI * 2;
                        ringPoints.push({
                            angle: angle,
                            radius: radius,
                            z: 0, // Will be calculated during rendering
                            projection: {x: 0, y: 0, scale: 0} // For 3D projection
                        });
                    }
                    
                    options.points.push(ringPoints);
                }
            }
        }
    };
    
    // Fractal Aurora visualizer
    this.visualizers.fractal = {
        render: this.renderFractalAurora.bind(this),
        animationFrame: null,
        options: {
            iterations: 5,
            baseSize: 150,
            rotationSpeed: 0.001,
            rotation: 0,
            noiseScale: 0.01,
            noiseOffset: 0,
            fractalOffset: {x: 0, y: 0},
            julia: {real: -0.8, imag: 0.156},
            colorOffset: 0,
            maxIterations: 100,
            audioMultiplier: 2,
            lastBassEnergy: 0,
            lastMidEnergy: 0
        }
    };
    
    // Spectral Bloom visualizer
    this.visualizers.bloom = {
        render: this.renderSpectralBloom.bind(this),
        animationFrame: null,
        options: {
            petals: 8,
            maxLayers: 6,
            layerScale: 0.85,
            rotation: 0,
            rotationSpeed: 0.002,
            bloomCenter: {x: 0, y: 0},
            baseRadius: 150,
            petalWidth: 0.5, // 0-1, where 1 is a full circle
            bloomLayers: [],
            init: () => {
                const options = this.visualizers.bloom.options;
                options.bloomLayers = [];
                
                const canvas = this.canvases.bloom;
                if (canvas) {
                    options.bloomCenter = {
                        x: canvas.width / 2,
                        y: canvas.height / 2
                    };
                }
                
                // Create the bloom layers
                for (let layer = 0; layer < options.maxLayers; layer++) {
                    const layerPetals = [];
                    
                    for (let p = 0; p < options.petals; p++) {
                        layerPetals.push({
                            angle: (p / options.petals) * Math.PI * 2,
                            scale: 1,
                            energy: 0
                        });
                    }
                    
                    options.bloomLayers.push({
                        rotation: layer * (Math.PI / options.maxLayers),
                        petals: layerPetals,
                        radius: options.baseRadius * Math.pow(options.layerScale, layer),
                        hueOffset: layer * 30
                    });
                }
            }
        }
    };
    
    // Holographic Spectrum (inspired by sci-fi holographic displays)
    this.visualizers.holographic = {
        render: this.renderHolographicSpectrum.bind(this),
        animationFrame: null,
        options: {
            bars: 128,
            maxHeight: 120,
            barWidth: 3,
            spacing: 1,
            hologramLines: 20,
            lineSpacing: 4,
            rotationY: 0,
            rotationSpeed: 0.01,
            perspective: 800,
            glitchIntensity: 0.05,
            lastGlitch: 0,
            glitchInterval: 1000,
            scanlineOffset: 0,
            scanlineSpeed: 0.5
        }
    };
    
    // Caustic Water ripple effect
    this.visualizers.caustics = {
        render: this.renderCaustics.bind(this),
        animationFrame: null,
        options: {
            width: 128,
            height: 128,
            ripples: [],
            buffer1: null,
            buffer2: null,
            damping: 0.98,
            maxRipples: 10,
            rippleRadius: 3,
            rippleStrength: 5,
            causticIntensity: 1.2,
            time: 0,
            init: () => {
                const options = this.visualizers.caustics.options;
                const size = options.width * options.height;
                
                // Create water simulation buffers
                options.buffer1 = new Float32Array(size);
                options.buffer2 = new Float32Array(size);
                
                // Reset everything
                options.ripples = [];
                options.buffer1.fill(0);
                options.buffer2.fill(0);
                options.time = 0;
            }
        }
    };
    
    // Initialize the new visualizers if needed
    this.visualizers.neural.options.init();
    this.visualizers.terrain.options.init();
    this.visualizers.vortex.options.init();
    this.visualizers.bloom.options.init();
    this.visualizers.caustics.options.init();
};

// Update the createToolbar method to include our new visualizers
const originalCreateToolbar = EnhancedVisualizers.prototype.createToolbar;
EnhancedVisualizers.prototype.createToolbar = function() {
    // Call the original method first
    originalCreateToolbar.call(this);
    
    // Now update the selector with our new options
    const visualizerSelector = this.container.querySelector('.visualizer-selector');
    
    if (visualizerSelector) {
        // Add our new visualizer options
        const newOptions = [
            { id: 'neural', label: 'Neural Network' },
            // { id: 'terrain', label: 'Audio Terrain' },
            { id: 'vortex', label: 'Vortex Tunnel' },
            // { id: 'fractal', label: 'Fractal Aurora' },
            { id: 'bloom', label: 'Spectral Bloom' },
            { id: 'holographic', label: 'Holographic UI' },
            { id: 'caustics', label: 'Caustic Waters' }
        ];
        
        newOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = option.label;
            visualizerSelector.appendChild(optionElement);
        });
    }
};

// Update the initCanvases method to create canvases for the new visualizers
const originalInitCanvases = EnhancedVisualizers.prototype.initCanvases;
EnhancedVisualizers.prototype.initCanvases = function() {
    // Call the original method first
    originalInitCanvases.call(this);
    
    // Add canvases for our new visualizers
    const newVisualizerIds = ['neural', 'terrain', 'vortex', 'fractal', 'bloom', 'holographic', 'caustics'];
    
    newVisualizerIds.forEach(id => {
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
};

// 1. Neural Network Visualization
EnhancedVisualizers.prototype.renderNeuralNetwork = function() {
    const canvas = this.canvases.neural;
    const ctx = this.contexts.neural;
    const options = this.visualizers.neural.options;
    
    // Get audio data
    const fftData = this.fft.getValue();
    
    // Calculate energy in different frequency bands
    const bassEnergy = this.getFrequencyBandEnergy(fftData, 0, 10);
    const midEnergy = this.getFrequencyBandEnergy(fftData, 20, 60);
    const trebleEnergy = this.getFrequencyBandEnergy(fftData, 80, 120);
    const overallEnergy = (bassEnergy * 3 + midEnergy + trebleEnergy) / 5;
    
    // Clear canvas with fade effect
    ctx.fillStyle = `rgba(${parseInt(this.colorScheme.background.slice(1, 3), 16)}, 
                          ${parseInt(this.colorScheme.background.slice(3, 5), 16)}, 
                          ${parseInt(this.colorScheme.background.slice(5, 7), 16)}, 0.1)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update node pulses
    options.nodes.forEach((node, i) => {
        node.pulsePhase += options.pulseSpeed * (1 + overallEnergy);
        
        // Get specific frequency data for this node
        const fftIndex = Math.floor((i / options.nodes.length) * (fftData.length / 4));
        const value = this.normalizeFFTValue(fftData[fftIndex]);
        
        // Update node energy
        node.energy = node.energy * 0.9 + value * 0.1;
        
        // Detect audio peaks to activate nodes
        if (value > 0.7 && Math.random() < value * 0.2) {
            node.isActive = true;
            
            // Activate random connections from this node
            const nodeConnections = options.connections.filter(c => c.from === i || c.to === i);
            if (nodeConnections.length > 0) {
                const connection = nodeConnections[Math.floor(Math.random() * nodeConnections.length)];
                connection.active = true;
                connection.pulsePosition = 0;
            }
        } else {
            node.isActive = node.isActive && Math.random() > 0.05;
        }
    });
    
    // Update connections and draw them first (so they're behind the nodes)
    options.connections.forEach(connection => {
        const nodeA = options.nodes[connection.from];
        const nodeB = options.nodes[connection.to];
        
        // Calculate distance
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update pulse position
        if (connection.active) {
            connection.pulsePosition += connection.speed * (1 + overallEnergy);
            if (connection.pulsePosition >= 1) {
                connection.pulsePosition = 0;
                connection.active = Math.random() < 0.3; // 30% chance to keep active
            }
        }
        
        // Draw connection
        ctx.beginPath();
        
        // Create gradient based on nodes
        const gradient = ctx.createLinearGradient(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
        gradient.addColorStop(0, this.hexToRgba(nodeA.color, 0.1 + nodeA.energy * 0.3));
        gradient.addColorStop(1, this.hexToRgba(nodeB.color, 0.1 + nodeB.energy * 0.3));
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1 + connection.strength * 2 * overallEnergy;
        
        ctx.moveTo(nodeA.x, nodeA.y);
        ctx.lineTo(nodeB.x, nodeB.y);
        ctx.stroke();
        
        // Draw pulse on active connections
        if (connection.active) {
            const pulsePos = connection.direction > 0 ? 
                             connection.pulsePosition : 
                             1 - connection.pulsePosition;
            
            const pulseX = nodeA.x + dx * pulsePos;
            const pulseY = nodeA.y + dy * pulsePos;
            
            // Create pulse gradient
            const pulseSize = 2 + 4 * overallEnergy;
            const pulseGradient = ctx.createRadialGradient(
                pulseX, pulseY, 0,
                pulseX, pulseY, pulseSize * 2
            );
            
            const pulseColor = connection.direction > 0 ? nodeA.color : nodeB.color;
            pulseGradient.addColorStop(0, this.hexToRgba(pulseColor, 0.8));
            pulseGradient.addColorStop(1, this.hexToRgba(pulseColor, 0));
            
            ctx.fillStyle = pulseGradient;
            ctx.beginPath();
            ctx.arc(pulseX, pulseY, pulseSize * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw nodes
    options.nodes.forEach(node => {
        // Calculate pulsing effect
        const pulse = Math.sin(node.pulsePhase) * 0.5 + 0.5;
        const size = node.size * (1 + pulse * 0.5 + node.energy * 2);
        
        // Create node gradient
        const gradient = ctx.createRadialGradient(
            node.x, node.y, 0,
            node.x, node.y, size * 2
        );
        
        const alpha = 0.2 + node.energy * 0.8 + (node.isActive ? 0.5 : 0);
        
        gradient.addColorStop(0, this.hexToRgba(node.color, alpha));
        gradient.addColorStop(0.5, this.hexToRgba(node.color, alpha * 0.5));
        gradient.addColorStop(1, this.hexToRgba(node.color, 0));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw node core
        ctx.fillStyle = this.hexToRgba(node.color, 0.8 + node.energy * 0.2);
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight
        if (node.isActive) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(node.x - size * 0.3, node.y - size * 0.3, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Create new random connections occasionally based on audio energy
    if (Math.random() < 0.01 + bassEnergy * 0.1 && options.connections.length < options.maxConnections) {
        const nodeA = Math.floor(Math.random() * options.nodes.length);
        let nodeB = Math.floor(Math.random() * options.nodes.length);
        
        // Avoid self-connections
        while (nodeB === nodeA) {
            nodeB = Math.floor(Math.random() * options.nodes.length);
        }
        
        // Check if this connection already exists
        const connectionExists = options.connections.some(c => 
            (c.from === nodeA && c.to === nodeB) || 
            (c.from === nodeB && c.to === nodeA)
        );
        
        if (!connectionExists) {
            options.connections.push({
                from: nodeA,
                to: nodeB,
                strength: 0.3 + Math.random() * 0.7,
                active: true,
                pulsePosition: 0,
                direction: Math.random() > 0.5 ? 1 : -1,
                speed: 0.01 + Math.random() * 0.05
            });
        }
    }
    
    // Remove random connections occasionally
    if (options.connections.length > options.initialConnectionCount && Math.random() < 0.005) {
        const randomIndex = Math.floor(Math.random() * options.connections.length);
        options.connections.splice(randomIndex, 1);
    }
    
    // Draw FPS counter
    this.drawFPS(ctx, canvas.width, canvas.height);
};

// 2. Audio Terrain (3D landscape) Visualization
EnhancedVisualizers.prototype.renderAudioTerrain = function() {
    const canvas = this.canvases.terrain;
    const ctx = this.contexts.terrain;
    const options = this.visualizers.terrain.options;
    
    // Get audio data
    const fftData = this.fft.getValue();
    
    // Clear canvas
    ctx.fillStyle = this.colorScheme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update the height map based on audio
    const newHeightMap = new Array(options.gridSize).fill(0)
        .map(() => new Array(options.gridSize).fill(0));
    
    for (let x = 0; x < options.gridSize; x++) {
        // Get frequency data for this column
        const fftIndex = Math.floor((x / options.gridSize) * (fftData.length / 4));
        const value = this.normalizeFFTValue(fftData[fftIndex]);
        
        // Set height value based on audio
        const height = value * options.terrainHeight;
        
        for (let z = 0; z < options.gridSize; z++) {
            // Add noise to create more variation
            const noise = Math.sin(x * 0.1 + z * 0.1) * 10 + 
                         Math.cos(x * 0.05 - z * 0.05) * 5;
                         
            newHeightMap[x][z] = height + noise;
        }
    }
    
    // Add to height history
    options.heightHistory.unshift(newHeightMap);
    
    // Limit history length
    if (options.heightHistory.length > options.maxHistory) {
        options.heightHistory.pop();
    }
    
    // Average height maps for smoother transitions
    const smoothedHeightMap = new Array(options.gridSize).fill(0)
        .map(() => new Array(options.gridSize).fill(0));
    
    for (let x = 0; x < options.gridSize; x++) {
        for (let z = 0; z < options.gridSize; z++) {
            let totalHeight = 0;
            let weightSum = 0;
            
            for (let h = 0; h < options.heightHistory.length; h++) {
                const weight = options.heightHistory.length - h;
                totalHeight += options.heightHistory[h][x][z] * weight;
                weightSum += weight;
            }
            
            smoothedHeightMap[x][z] = totalHeight / weightSum;
        }
    }
    
    // Update current height map
    options.heightMap = smoothedHeightMap;
    
    // Calculate center of the grid
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Calculate bass energy for water animation
    const bassEnergy = this.getFrequencyBandEnergy(fftData, 0, 10);
    const waterLevel = options.waterLevel + bassEnergy * 20;
    
    // Function to project 3D point to 2D screen
    const project = (x, y, z) => {
        // Apply rotation
        const rotX = x - options.gridSize / 2;
        const rotZ = z - options.gridSize / 2;
        
        const sinY = Math.sin(options.angleY);
        const cosY = Math.cos(options.angleY);
        
        const x1 = rotX * cosY - rotZ * sinY;
        const z1 = rotX * sinY + rotZ * cosY;
        
        const sinX = Math.sin(options.angleX);
        const cosX = Math.cos(options.angleX);
        
        const y1 = y;
        const z2 = z1 * cosX - y1 * sinX;
        const y2 = z1 * sinX + y1 * cosX;
        
        // Scale and position
        const scale = options.scale;
        const screenX = centerX + x1 * scale;
        const screenY = centerY + y2 * scale - z2 * 0.3; // Add depth perspective
        
        return { x: screenX, y: screenY, depth: z2 };
    };
    
    // Prepare cells for sorting and rendering
    const cells = [];
    
    for (let x = 0; x < options.gridSize - 1; x++) {
        for (let z = 0; z < options.gridSize - 1; z++) {
            const height00 = options.heightMap[x][z];
            const height10 = options.heightMap[x + 1][z];
            const height01 = options.heightMap[x][z + 1];
            const height11 = options.heightMap[x + 1][z + 1];
            
            const point00 = project(x, height00, z);
            const point10 = project(x + 1, height10, z);
            const point01 = project(x, height01, z + 1);
            const point11 = project(x + 1, height11, z + 1);
            
            // Calculate average height for color
            const avgHeight = (height00 + height10 + height01 + height11) / 4;
            
            // Determine color based on height
            let color;
            if (avgHeight < waterLevel) {
                // Water color
                const alpha = 0.6 + bassEnergy * 0.4;
                color = this.hexToRgba(this.colorScheme.secondary, alpha);
            } else {
                // Terrain color
                const normalizedHeight = (avgHeight - waterLevel) / (options.terrainHeight - waterLevel);
                color = this.lerpColor(this.colorScheme.primary, this.colorScheme.accent1, normalizedHeight);
            }
            
            // Calculate depth for sorting
            const avgDepth = (point00.depth + point10.depth + point01.depth + point11.depth) / 4;
            
            cells.push({
                points: [point00, point10, point11, point01],
                color: color,
                height: avgHeight,
                depth: avgDepth,
                isWater: avgHeight < waterLevel
            });
        }
    }
    
    // Sort cells by depth (painter's algorithm)
    cells.sort((a, b) => b.depth - a.depth);
    
    // Draw cells
    cells.forEach(cell => {
        const points = cell.points;
        
        ctx.fillStyle = cell.color;
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        
        // For water cells, add shimmer effect
        if (cell.isWater) {
            ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.001 + cell.depth * 0.1) * 0.2 + bassEnergy * 0.3;
        } else {
            ctx.globalAlpha = 1;
        }
        
        ctx.fill();
        
        // Add grid lines
        if (!cell.isWater) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;
    });
    
    // Draw FPS counter
    this.drawFPS(ctx, canvas.width, canvas.height);
};

// 3. Vortex Tunnel Visualization
EnhancedVisualizers.prototype.renderVortex = function() {
    const canvas = this.canvases.vortex;
    const ctx = this.contexts.vortex;
    const options = this.visualizers.vortex.options;
    
    // Get audio data
    const fftData = this.fft.getValue();
    const waveData = this.waveform.getValue();
    
    // Calculate energy in different frequency bands
    const bassEnergy = this.getFrequencyBandEnergy(fftData, 0, 10);
    const midEnergy = this.getFrequencyBandEnergy(fftData, 20, 60);
    const trebleEnergy = this.getFrequencyBandEnergy(fftData, 80, 120);
    
    // Clear canvas
    ctx.fillStyle = this.colorScheme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update time based on audio
    options.time += options.rotationSpeed * (1 + bassEnergy * 2);
    
    // Calculate center of the tunnel
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Calculate amplitude modification from audio
    const amplitude = options.waveAmplitude * (1 + bassEnergy * 3);
    const waveFreq = options.waveFrequency * (1 + midEnergy);
    const depthMod = 1 + trebleEnergy * 2;
    
    // Update all points
    options.points.forEach((ring, ringIndex) => {
        ring.forEach((point, pointIndex) => {
            // Calculate Z position based on time and frequency
            const phaseOffset = point.angle * waveFreq + options.time;
            const waveValue = Math.sin(phaseOffset) * amplitude;
            
            const depthOffset = ringIndex / options.rings;
            point.z = (Math.sin(options.time * options.waveSpeed + depthOffset * Math.PI * 2) + 1) * 0.5 * options.depthScale * depthMod;
            
            // Calculate 3D projection
            const scale = options.depthScale / (options.depthScale + point.z);
            const projectedX = centerX + (Math.cos(point.angle + options.time) * (point.radius + waveValue)) * scale;
            const projectedY = centerY + (Math.sin(point.angle + options.time) * (point.radius + waveValue)) * scale;
            
            // Store projection
            point.projection = {
                x: projectedX,
                y: projectedY,
                scale: scale
            };
        });
    });
    
    // Draw from back to front
    for (let ringIndex = options.rings - 1; ringIndex >= 0; ringIndex--) {
        const ring = options.points[ringIndex];
        
        // Get audio modulation for this ring
        const ringAudioIndex = Math.floor((ringIndex / options.rings) * (fftData.length / 4));
        const ringAudio = this.normalizeFFTValue(fftData[ringAudioIndex]);
        
        // Get color based on audio and ring
        const hue = (270 + ringIndex * 20 + trebleEnergy * 60) % 360;
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
    if (bassEnergy > 0.4) {
        for (let pointIndex = 0; pointIndex < options.pointsPerRing; pointIndex += 6) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${bassEnergy * 0.4})`;
            ctx.lineWidth = 1;
            
            for (let ringIndex = 0; ringIndex < options.rings; ringIndex++) {
                const point = options.points[ringIndex][pointIndex];
                
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
        centerX, centerY, 30 + bassEnergy * 50
    );
    
    centerGlow.addColorStop(0, `rgba(255, 255, 255, ${0.4 + bassEnergy * 0.6})`);
    centerGlow.addColorStop(0.5, `rgba(${parseInt(this.colorScheme.secondary.slice(1, 3), 16)}, 
                                     ${parseInt(this.colorScheme.secondary.slice(3, 5), 16)}, 
                                     ${parseInt(this.colorScheme.secondary.slice(5, 7), 16)}, 0.3)`);
    centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = centerGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw FPS counter
    this.drawFPS(ctx, canvas.width, canvas.height);
};

// 4. Fractal Aurora Visualization
EnhancedVisualizers.prototype.renderFractalAurora = function() {
    const canvas = this.canvases.fractal;
    const ctx = this.contexts.fractal;
    const options = this.visualizers.fractal.options;
    
    // Get audio data
    const fftData = this.fft.getValue();
    
    // Calculate energy in different frequency bands
    const bassEnergy = this.getFrequencyBandEnergy(fftData, 0, 10);
    const midEnergy = this.getFrequencyBandEnergy(fftData, 20, 60);
    const trebleEnergy = this.getFrequencyBandEnergy(fftData, 80, 120);
    
    // Smooth transition for Julia set parameters
    options.lastBassEnergy = options.lastBassEnergy * 0.8 + bassEnergy * 0.2;
    options.lastMidEnergy = options.lastMidEnergy * 0.8 + midEnergy * 0.2;
    
    // Update Julia set parameters based on audio
    options.julia.real = -0.8 + Math.sin(performance.now() * 0.0001) * 0.2 + options.lastBassEnergy * 0.4;
    options.julia.imag = 0.156 + Math.cos(performance.now() * 0.0002) * 0.1 + options.lastMidEnergy * 0.3;
    
    // Update noise offset based on treble
    options.noiseOffset += 0.01 + trebleEnergy * 0.05;
    
    // Update rotation
    options.rotation += options.rotationSpeed * (1 + bassEnergy * 2);
    
    // Update color cycling
    options.colorOffset = (options.colorOffset + 0.01 + bassEnergy * 0.1) % 360;
    
    // Clear canvas with fade effect
    ctx.fillStyle = `rgba(${parseInt(this.colorScheme.background.slice(1, 3), 16)}, 
                          ${parseInt(this.colorScheme.background.slice(3, 5), 16)}, 
                          ${parseInt(this.colorScheme.background.slice(5, 7), 16)}, 0.1)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate the center of the canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Create ImageData for direct pixel manipulation
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    
    // Render fractal
    const size = options.baseSize * (1 + bassEnergy * options.audioMultiplier);
    const zoom = 4 / size;
    
    // Offset from center
    options.fractalOffset.x = Math.sin(performance.now() * 0.0005) * 50 * midEnergy;
    options.fractalOffset.y = Math.cos(performance.now() * 0.0003) * 50 * bassEnergy;
    
    for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
            // Calculate coordinates relative to center with rotation
            const dx = x - centerX - options.fractalOffset.x;
            const dy = y - centerY - options.fractalOffset.y;
            
            // Apply rotation
            const cos = Math.cos(options.rotation);
            const sin = Math.sin(options.rotation);
            const rotatedX = dx * cos - dy * sin;
            const rotatedY = dx * sin + dy * cos;
            
            // Scale to fractal space
            const zx = rotatedX * zoom;
            const zy = rotatedY * zoom;
            
            // Julia set calculation
            let cx = options.julia.real;
            let cy = options.julia.imag;
            
            let iteration = 0;
            let zx2 = zx * zx;
            let zy2 = zy * zy;
            
            // Apply noise modulation
            const noiseVal = Math.sin(zx * options.noiseScale + options.noiseOffset) * 
                            Math.cos(zy * options.noiseScale + options.noiseOffset) * 0.1 * trebleEnergy;
            
            cx += noiseVal;
            cy += noiseVal;
            
            // Iterate until escape or max iterations
            while (iteration < options.maxIterations && zx2 + zy2 < 4) {
                zy = 2 * zx * zy + cy;
                zx = zx2 - zy2 + cx;
                zx2 = zx * zx;
                zy2 = zy * zy;
                iteration++;
            }
            
            // Color calculation
            if (iteration < options.maxIterations) {
                // Smooth coloring
                const smoothColor = iteration + 1 - Math.log2(Math.log(zx2 + zy2));
                
                // Hue based on iteration count and audio energy
                const hue = (smoothColor * 10 + options.colorOffset) % 360;
                
                // Saturation and lightness modulated by audio
                const sat = 70 + midEnergy * 30;
                const light = 30 + 40 * Math.pow(smoothColor / options.maxIterations, 0.5);
                
                // Convert HSL to RGB
                const color = this.hslToRgb(hue / 360, sat / 100, light / 100);
                
                // Set the 2x2 pixel block (optimization)
                for (let sy = 0; sy < 2 && y + sy < canvas.height; sy++) {
                    for (let sx = 0; sx < 2 && x + sx < canvas.width; sx++) {
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
    
    glow.addColorStop(0, `rgba(${parseInt(this.colorScheme.secondary.slice(1, 3), 16)}, 
                           ${parseInt(this.colorScheme.secondary.slice(3, 5), 16)}, 
                           ${parseInt(this.colorScheme.secondary.slice(5, 7), 16)}, ${0.1 + bassEnergy * 0.2})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    
    // Draw FPS counter
    this.drawFPS(ctx, canvas.width, canvas.height);
};

// 5. Spectral Bloom Visualization
EnhancedVisualizers.prototype.renderSpectralBloom = function() {
    const canvas = this.canvases.bloom;
    const ctx = this.contexts.bloom;
    const options = this.visualizers.bloom.options;
    
    // Get audio data
    const fftData = this.fft.getValue();
    
    // Calculate energy in different frequency bands
    const bassEnergy = this.getFrequencyBandEnergy(fftData, 0, 10);
    const midEnergy = this.getFrequencyBandEnergy(fftData, 20, 60);
    const trebleEnergy = this.getFrequencyBandEnergy(fftData, 80, 120);
    
    // Clear canvas
    ctx.fillStyle = this.colorScheme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update bloom center position
    options.bloomCenter = {
        x: canvas.width / 2 + Math.sin(performance.now() * 0.001) * 50 * midEnergy,
        y: canvas.height / 2 + Math.cos(performance.now() * 0.001) * 50 * bassEnergy
    };
    
    // Update rotation
    options.rotation += options.rotationSpeed * (1 + bassEnergy);
    
    // Draw bloom layers from back to front
    for (let layerIndex = options.maxLayers - 1; layerIndex >= 0; layerIndex--) {
        const layer = options.bloomLayers[layerIndex];
        
        // Calculate layer-specific audio response
        const fftIndex = Math.floor((layerIndex / options.maxLayers) * (fftData.length / 4));
        const layerEnergy = this.normalizeFFTValue(fftData[fftIndex]);
        
        // Update layer rotation
        layer.rotation += options.rotationSpeed * (layerIndex + 1) * (1 + layerEnergy);
        
        // Get layer-specific color
        const hue = (270 + layer.hueOffset + performance.now() * 0.01) % 360;
        const saturation = 70 + layerEnergy * 30;
        const lightness = 40 + layerEnergy * 30;
        
        // Draw each petal
        layer.petals.forEach((petal, petalIndex) => {
            // Update petal energy
            petal.energy = petal.energy * 0.9 + layerEnergy * 0.1;
            
            // Calculate audio-modulated petal properties
            const petalFftIndex = Math.floor((petalIndex / options.petals) * (fftData.length / 2));
            const petalAudio = this.normalizeFFTValue(fftData[petalFftIndex]);
            
            // Calculate petal scale
            petal.scale = 0.8 + petal.energy * 0.5 + Math.sin(performance.now() * 0.001 + petalIndex) * 0.2 * petalAudio;
            
            // Calculate petal angle including layer rotation
            const angle = petal.angle + layer.rotation;
            
            // Calculate start and end angles for the petal arc
            const arcWidth = options.petalWidth * Math.PI * (0.5 + petalAudio * 0.5);
            const startAngle = angle - arcWidth / 2;
            const endAngle = angle + arcWidth / 2;
            
            // Calculate petal radius
            const radius = layer.radius * petal.scale * (1 + bassEnergy * 0.2);
            
            // Create gradient for petal
            const innerX = options.bloomCenter.x + Math.cos(angle) * radius * 0.5;
            const innerY = options.bloomCenter.y + Math.sin(angle) * radius * 0.5;
            const outerX = options.bloomCenter.x + Math.cos(angle) * radius;
            const outerY = options.bloomCenter.y + Math.sin(angle) * radius;
            
            const gradient = ctx.createRadialGradient(
                innerX, innerY, radius * 0.1,
                outerX, outerY, radius * 0.9
            );
            
            // Custom petal color based on audio and layer
            const petalHue = (hue + petalIndex * 10 * petalAudio) % 360;
            gradient.addColorStop(0, `hsla(${petalHue}, ${saturation}%, ${lightness}%, ${0.3 + petal.energy * 0.7})`);
            gradient.addColorStop(1, `hsla(${petalHue}, ${saturation}%, ${lightness + 20}%, 0)`);
            
            ctx.fillStyle = gradient;
            
            // Draw petal
            ctx.beginPath();
            ctx.moveTo(options.bloomCenter.x, options.bloomCenter.y);
            ctx.arc(options.bloomCenter.x, options.bloomCenter.y, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            
            // Add glow for petals with high energy
            if (petal.energy > 0.7) {
                ctx.save();
                ctx.shadowColor = `hsl(${petalHue}, ${saturation}%, ${lightness + 20}%)`;
                ctx.shadowBlur = 20 * petal.energy;
                ctx.fill();
                ctx.restore();
            }
            
            // Add highlights
            if (petalAudio > 0.8) {
                ctx.strokeStyle = `hsla(${petalHue}, 20%, 90%, ${petalAudio * 0.5})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }
    
    // Draw center of the bloom
    const centerGlow = ctx.createRadialGradient(
        options.bloomCenter.x, options.bloomCenter.y, 0,
        options.bloomCenter.x, options.bloomCenter.y, 30 + bassEnergy * 40
    );
    
    centerGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 + bassEnergy * 0.5})`);
    centerGlow.addColorStop(0.3, `rgba(${parseInt(this.colorScheme.secondary.slice(1, 3), 16)}, 
                                  ${parseInt(this.colorScheme.secondary.slice(3, 5), 16)}, 
                                  ${parseInt(this.colorScheme.secondary.slice(5, 7), 16)}, 0.7)`);
    centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = centerGlow;
    ctx.beginPath();
    ctx.arc(options.bloomCenter.x, options.bloomCenter.y, 30 + bassEnergy * 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw FPS counter
    this.drawFPS(ctx, canvas.width, canvas.height);
};

// 6. Holographic Spectrum Visualization
EnhancedVisualizers.prototype.renderHolographicSpectrum = function() {
    const canvas = this.canvases.holographic;
    const ctx = this.contexts.holographic;
    const options = this.visualizers.holographic.options;
    
    // Get audio data
    const fftData = this.fft.getValue();
    
    // Calculate energy in different frequency bands
    const bassEnergy = this.getFrequencyBandEnergy(fftData, 0, 10);
    const midEnergy = this.getFrequencyBandEnergy(fftData, 20, 60);
    const trebleEnergy = this.getFrequencyBandEnergy(fftData, 80, 120);
    
    // Update rotation
    options.rotationY += options.rotationSpeed * (1 + bassEnergy);
    
    // Update scanline position
    options.scanlineOffset = (options.scanlineOffset + options.scanlineSpeed * (1 + midEnergy * 2)) % canvas.height;
    
    // Clear canvas
    ctx.fillStyle = this.colorScheme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate the center of the canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Calculate total width of the spectrum
    const totalWidth = options.bars * (options.barWidth + options.spacing);
    
    // Calculate when to create a glitch effect
    const now = performance.now();
    let isGlitching = false;
    
    if (now - options.lastGlitch > options.glitchInterval) {
        // Random chance to glitch based on treble energy
        if (Math.random() < options.glitchIntensity + trebleEnergy * 0.1) {
            isGlitching = true;
            options.lastGlitch = now;
        }
    }
    
    // Draw 3D grid (floor)
    this.drawHolographicGrid(ctx, canvas.width, canvas.height, options.rotationY, bassEnergy);
    
    // Prepare bars
    const barData = [];
    
    for (let i = 0; i < options.bars; i++) {
        // Get frequency data for this bar
        const fftIndex = Math.floor((i / options.bars) * (fftData.length / 4));
        const value = this.normalizeFFTValue(fftData[fftIndex]);
        
        // Apply smoothing
        const smoothedValue = value; // You could implement a smoothing algorithm here
        
        barData.push({
            index: i,
            value: smoothedValue,
            height: smoothedValue * options.maxHeight,
            // Add glitch effect
            glitchOffset: isGlitching && Math.random() < 0.1 ? 
                         (Math.random() - 0.5) * 20 * trebleEnergy : 0
        });
    }
    
    // Function to project 3D point to 2D
    const project = (x, y, z) => {
        // Apply Y rotation
        const cosY = Math.cos(options.rotationY);
        const sinY = Math.sin(options.rotationY);
        
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        
        // Apply perspective
        const scale = options.perspective / (options.perspective + z1);
        
        return {
            x: centerX + x1 * scale,
            y: centerY + y * scale,
            scale: scale
        };
    };
    
    // Draw holographic bars
    barData.forEach(bar => {
        // Calculate 3D coordinates
        const barX = (bar.index - options.bars / 2) * (options.barWidth + options.spacing);
        const barHeight = bar.height;
        const barZ = 0;
        
        // Project the corners
        const bottomLeft = project(barX, 0, barZ);
        const bottomRight = project(barX + options.barWidth, 0, barZ);
        const topLeft = project(barX, -barHeight, barZ);
        const topRight = project(barX + options.barWidth, -barHeight, barZ);
        
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
    this.drawHolographicScanlines(ctx, canvas.width, canvas.height, options.scanlineOffset, options.hologramLines, options.lineSpacing);
    
    // Draw holographic UI elements (circles, lines, etc.)
    this.drawHolographicUI(ctx, canvas.width, canvas.height, bassEnergy, midEnergy, trebleEnergy);
    
    // Add glitch effect
    if (isGlitching) {
        this.applyGlitchEffect(ctx, canvas.width, canvas.height, trebleEnergy);
    }
    
    // Draw FPS counter
    this.drawFPS(ctx, canvas.width, canvas.height);
};

// Helper for drawing holographic grid
EnhancedVisualizers.prototype.drawHolographicGrid = function(ctx, width, height, rotationY, bassEnergy) {
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
};

// Helper for drawing holographic scanlines
EnhancedVisualizers.prototype.drawHolographicScanlines = function(ctx, width, height, offset, lineCount, lineSpacing) {
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
};

// Helper for drawing holographic UI elements
EnhancedVisualizers.prototype.drawHolographicUI = function(ctx, width, height, bassEnergy, midEnergy, trebleEnergy) {
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
};

// Helper for applying glitch effect
EnhancedVisualizers.prototype.applyGlitchEffect = function(ctx, width, height, intensity) {
    const glitchIntensity = intensity * 0.3; // Scale down for subtlety
    
    // Create several horizontal glitch slices
    const sliceCount = Math.floor(3 + Math.random() * 5);
    
    for (let i = 0; i < sliceCount; i++) {
        // Random y position and height
        const y = Math.random() * height;
        const sliceHeight = 5 + Math.random() * 20;
        
        // Random x offset
        const xOffset = (Math.random() - 0.5) * width * 0.1 * glitchIntensity;
        
        // Copy and shift a slice of the canvas
        const imageData = ctx.getImageData(0, y, width, sliceHeight);
        ctx.putImageData(imageData, xOffset, y);
        
        // Add color shift occasionally
        if (Math.random() < 0.3) {
            ctx.fillStyle = `rgba(255, 0, 128, ${Math.random() * 0.1 * glitchIntensity})`;
            ctx.fillRect(0, y, width, sliceHeight);
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
};

// 7. Caustic Waters Visualization
EnhancedVisualizers.prototype.renderCaustics = function() {
    const canvas = this.canvases.caustics;
    const ctx = this.contexts.caustics;
    const options = this.visualizers.caustics.options;
    
    // Get audio data
    const fftData = this.fft.getValue();
    const waveData = this.waveform.getValue();
    
    // Calculate energy in different frequency bands
    const bassEnergy = this.getFrequencyBandEnergy(fftData, 0, 10);
    const midEnergy = this.getFrequencyBandEnergy(fftData, 20, 60);
    const trebleEnergy = this.getFrequencyBandEnergy(fftData, 80, 120);
    
    // Initialize buffers if needed
    if (!options.buffer1 || !options.buffer2) {
        options.init();
    }
    
    // Update time
    options.time += 0.01 + bassEnergy * 0.05;
    
    // Clear canvas
    ctx.fillStyle = this.colorScheme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add ripples based on audio
    if (bassEnergy > 0.1 && options.ripples.length < options.maxRipples) {
        // Add a ripple at a random position
        const x = Math.floor(Math.random() * options.width);
        const y = Math.floor(Math.random() * options.height);
        const strength = options.rippleStrength * (0.5 + bassEnergy * 2);
        
        options.ripples.push({
            x: x,
            y: y,
            radius: options.rippleRadius,
            strength: strength,
            age: 0,
            maxAge: 20 + Math.random() * 30
        });
    }
    
    // Apply ripples to the water simulation
    options.ripples.forEach(ripple => {
        ripple.age++;
        
        // Fade out ripple strength with age
        const currentStrength = ripple.strength * (1 - ripple.age / ripple.maxAge);
        
        // Apply ripple to the buffer
        this.applyRipple(options.buffer1, options.width, options.height, 
                        ripple.x, ripple.y, ripple.radius, currentStrength);
    });
    
    // Remove old ripples
    options.ripples = options.ripples.filter(ripple => ripple.age < ripple.maxAge);
    
    // Update water simulation
    this.updateWaterSimulation(options.buffer1, options.buffer2, options.width, options.height, options.damping);
    
    // Swap buffers
    [options.buffer1, options.buffer2] = [options.buffer2, options.buffer1];
    
    // Render water to canvas with caustics effect
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate scaling from simulation to canvas
    const scaleX = canvas.width / options.width;
    const scaleY = canvas.height / options.height;
    
    // Generate caustics
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            // Map canvas coordinates to simulation coordinates
            const simX = Math.floor(x / scaleX);
            const simY = Math.floor(y / scaleY);
            
            // Get height and calculate derivatives (normals)
            const idx = simY * options.width + simX;
            const height = options.buffer1[idx] || 0;
            
            // Calculate caustics intensity
            const causticFactor = height * options.causticIntensity;
            
            // Get caustic color
            let r, g, b;
            
            // Create color shifts based on height
            if (causticFactor > 0) {
                // Bright caustics with color variation
                const hue = (180 + causticFactor * 20 + options.time * 10) % 360;
                const saturation = 60 + midEnergy * 40;
                const brightness = 50 + causticFactor * 50;
                
                const rgb = this.hslToRgb(hue / 360, saturation / 100, brightness / 100);
                r = rgb.r;
                g = rgb.g;
                b = rgb.b;
            } else {
                // Darker water with different color
                const depth = bassEnergy * 0.5;
                
                // Deep water color
                r = 0;
                g = 10 + 40 * depth;
                b = 30 + 100 * depth;
            }
            
            // Add subtle movement to the water
            const time = options.time;
            const movement = Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 + time * 0.7) * 10 * midEnergy;
            
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
    ctx.fillStyle = `rgba(0, 10, 40, ${0.2 + bassEnergy * 0.2})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add light rays
    this.drawWaterLightRays(ctx, canvas.width, canvas.height, bassEnergy, midEnergy);
    
    // Draw particles floating in the water
    this.drawWaterParticles(ctx, canvas.width, canvas.height, options.time, bassEnergy, trebleEnergy);
    
    // Draw FPS counter
    this.drawFPS(ctx, canvas.width, canvas.height);
};

// Helper for applying ripple to water simulation
EnhancedVisualizers.prototype.applyRipple = function(buffer, width, height, centerX, centerY, radius, strength) {
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
};

// Helper for updating water simulation
EnhancedVisualizers.prototype.updateWaterSimulation = function(buffer1, buffer2, width, height, damping) {
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
};

// Helper for drawing light rays in water
EnhancedVisualizers.prototype.drawWaterLightRays = function(ctx, width, height, bassEnergy, midEnergy) {
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
};

// Helper for drawing floating particles in water
EnhancedVisualizers.prototype.drawWaterParticles = function(ctx, width, height, time, bassEnergy, trebleEnergy) {
    ctx.save();
    
    // Use screen blending for bright particles
    ctx.globalCompositeOperation = 'screen';
    
    // Number of particles
    const particleCount = 100 + Math.floor(bassEnergy * 100);
    
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
};

// Utility function: Convert hex color to rgba string
EnhancedVisualizers.prototype.hexToRgba = function(hexColor, alpha) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Utility function: Linear interpolation between two hex colors
EnhancedVisualizers.prototype.lerpColor = function(color1, color2, factor) {
    // Extract RGB components
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    // Interpolate each component
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Utility function: Convert HSL to RGB
EnhancedVisualizers.prototype.hslToRgb = function(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
};
// Export the function for manual initialization
window.initEnhancedVisualizers = initEnhancedVisualizers;