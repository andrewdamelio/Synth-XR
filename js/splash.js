// Main variables
let scene, camera, renderer, raycaster, mouse;
let modules = [];
let selectedKnob = null;
let knobs = [];
let buttons = [];
let lights = [];
let visualizers = [];
let clock = new THREE.Clock();
let isInitialized = false;
let previousTouch = null;
let initialPinchDistance = null;

// Configuration
const CONFIG = {
    MOBILE_FOV: 90,
    DESKTOP_FOV: 75,
    MIN_ZOOM: 30,
    MAX_ZOOM: 150,
    CAMERA_SPEED: 0.05,
    MOBILE_THRESHOLD: 768,
    ZOOM_SPEED: 0.1
};

// Modal interaction
const synthIcon = document.getElementById('synth-icon');
const modalOverlay = document.getElementById('modal-overlay');
const closeButton = document.getElementById('close-button');
const modalContent = document.getElementById('modal-content');

// Add event listeners for modal
synthIcon.addEventListener('click', openModal);
closeButton.addEventListener('click', closeModal);

function openModal() {
    modalOverlay.classList.add('modal-active');
    
    if (!isInitialized) {
        init();
        isInitialized = true;
    } else {
        clock.start();
        animate();
    }
}

function closeModal() {
    modalOverlay.classList.remove('modal-active');
    clock.stop();
}

// Initialize the scene
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    const isMobile = window.innerWidth < CONFIG.MOBILE_THRESHOLD;
    camera = new THREE.PerspectiveCamera(
        isMobile ? CONFIG.MOBILE_FOV : CONFIG.DESKTOP_FOV, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
    );
    camera.position.set(0, isMobile ? 40 : 30, isMobile ? 120 : 70);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    modalContent.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(10, 30, 20);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    addColoredLights();
    
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    createSynthModules();
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', () => { selectedKnob = null; });
    renderer.domElement.addEventListener('wheel', onWheel);
    // Touch events
    renderer.domElement.addEventListener('touchstart', onTouchStart);
    renderer.domElement.addEventListener('touchmove', onTouchMove);
    renderer.domElement.addEventListener('touchend', onTouchEnd);
    
    animate();
}

// Create all synth modules
function createSynthModules() {
    const basePlate = new THREE.Mesh(
        new THREE.BoxGeometry(100, 2, 60),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 })
    );
    basePlate.position.y = -1;
    basePlate.receiveShadow = true;
    scene.add(basePlate);
    
    createOscillatorModule(-35, 0, -15);
    createFilterModule(-35, 0, 15);
    createLFOModule(-10, 0, -15);
    createMixerModule(-10, 0, 15);
    createSequencerModule(15, 0, -15);
    createEffectsModule(15, 0, 15);
    createMasterModule(40, 0, 0);
    createCables();
}

// Module creation functions
function createOscillatorModule(x, y, z) {
    const module = createModuleBase(x, y, z, 20, 5, 25, 0x8800ff);
    modules.push(module);
    addModuleLabel(module, "OSCILLATOR");
    
    const knob1 = createKnob(x - 7, y + 3, z - 7, 0xff00ff, "FREQ");
    const knob2 = createKnob(x + 7, y + 3, z - 7, 0xff00ff, "SHAPE");
    const knob3 = createKnob(x - 7, y + 3, z + 7, 0xff00ff, "PHASE");
    
    const button1 = createButton(x + 5, y + 3, z + 5, 0xff0000, "SINE");
    const button2 = createButton(x + 8, y + 3, z + 5, 0x00ff00, "SAW");
    const button3 = createButton(x + 5, y + 3, z + 8, 0x0000ff, "SQUARE");
    const button4 = createButton(x + 8, y + 3, z + 8, 0xffff00, "TRI");
    
    const viz = createVisualizer(x, y + 3, z, 12, 4, 0xff00ff);
    visualizers.push(viz);
}

function createFilterModule(x, y, z) {
    const module = createModuleBase(x, y, z, 20, 5, 25, 0x00ff88);
    modules.push(module);
    addModuleLabel(module, "FILTER");
    
    const knob1 = createKnob(x - 7, y + 3, z - 7, 0x00ffaa, "CUTOFF");
    const knob2 = createKnob(x + 7, y + 3, z - 7, 0x00ffaa, "RESO");
    const knob3 = createKnob(x - 7, y + 3, z + 7, 0x00ffaa, "ENV");
    
    const button1 = createButton(x + 5, y + 3, z + 5, 0xff0000, "LP");
    const button2 = createButton(x + 8, y + 3, z + 5, 0x00ff00, "BP");
    const button3 = createButton(x + 5, y + 3, z + 8, 0x0000ff, "HP");
    
    const viz = createVisualizer(x, y + 3, z, 12, 4, 0x00ffaa);
    visualizers.push(viz);
}

function createLFOModule(x, y, z) {
    const module = createModuleBase(x, y, z, 20, 5, 25, 0xff8800);
    modules.push(module);
    addModuleLabel(module, "LFO");
    
    const knob1 = createKnob(x - 7, y + 3, z - 7, 0xffaa00, "RATE");
    const knob2 = createKnob(x + 7, y + 3, z - 7, 0xffaa00, "DEPTH");
    const knob3 = createKnob(x, y + 3, z + 7, 0xffaa00, "PHASE");
    
    const viz = createVisualizer(x, y + 3, z, 12, 4, 0xffaa00);
    visualizers.push(viz);
}

function createMixerModule(x, y, z) {
    const module = createModuleBase(x, y, z, 20, 5, 25, 0x0088ff);
    modules.push(module);
    addModuleLabel(module, "MIXER");
    
    const knob1 = createKnob(x - 7, y + 3, z - 7, 0x00aaff, "CH 1");
    const knob2 = createKnob(x, y + 3, z - 7, 0x00aaff, "CH 2");
    const knob3 = createKnob(x + 7, y + 3, z - 7, 0x00aaff, "CH 3");
    const knob4 = createKnob(x - 7, y + 3, z + 7, 0x00aaff, "CH 4");
    const knob5 = createKnob(x, y + 3, z + 7, 0x00aaff, "MAIN");
    
    const button1 = createButton(x + 7, y + 3, z + 7, 0xff0000, "MUTE");
}

function createSequencerModule(x, y, z) {
    const module = createModuleBase(x, y, z, 20, 5, 25, 0xff0088);
    modules.push(module);
    addModuleLabel(module, "SEQUENCER");
    
    const spacing = 2.5;
    let buttonIdx = 0;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const buttonColor = (buttonIdx % 2 === 0) ? 0xff88aa : 0xff0088;
            createButton(x - 6 + i * spacing, y + 3, z - 6 + j * spacing, buttonColor, `${buttonIdx+1}`);
            buttonIdx++;
        }
    }
    
    const knob1 = createKnob(x, y + 3, z + 7, 0xff88aa, "TEMPO");
}

function createEffectsModule(x, y, z) {
    const module = createModuleBase(x, y, z, 20, 5, 25, 0x88ff00);
    modules.push(module);
    addModuleLabel(module, "EFFECTS");
    
    const knob1 = createKnob(x - 7, y + 3, z - 7, 0xaaff00, "DELAY");
    const knob2 = createKnob(x, y + 3, z - 7, 0xaaff00, "REVERB");
    const knob3 = createKnob(x + 7, y + 3, z - 7, 0xaaff00, "DIST");
    const knob4 = createKnob(x - 7, y + 3, z + 7, 0xaaff00, "FLANGE");
    const knob5 = createKnob(x + 7, y + 3, z + 7, 0xaaff00, "CHORUS");
    
    const button1 = createButton(x, y + 3, z + 7, 0xff0000, "ON/OFF");
}

function createMasterModule(x, y, z) {
    const module = createModuleBase(x, y, z, 20, 5, 25, 0xffcc00);
    modules.push(module);
    addModuleLabel(module, "MASTER");
    
    const knob1 = createKnob(x, y + 3, z - 7, 0xffdd00, "VOLUME");
    createVUMeter(x - 5, y + 3, z + 5, 10);
    
    const viz = createVisualizer(x, y + 3, z, 12, 4, 0xffdd00);
    visualizers.push(viz);
}

function createCables() {
    createCable(-25, 0, -15, -20, 0, -15, 0xff00ff);
    createCable(-25, 0, 15, -20, 0, 15, 0x00ffaa);
    createCable(0, 0, -15, 5, 0, -15, 0xffaa00);
    createCable(0, 0, 15, 5, 0, 15, 0x00aaff);
    createCable(25, 0, -15, 30, 0, 0, 0xff88aa);
    createCable(25, 0, 15, 30, 0, 0, 0xaaff00);
    createCable(-25, 0, -15, -25, 0, 15, 0xff00ff);
}

// Component creation functions
function createModuleBase(x, y, z, width, height, depth, color) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.2 })
    );
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    
    const faceplate = new THREE.Mesh(
        new THREE.PlaneGeometry(width - 0.5, depth - 0.5),
        new THREE.MeshStandardMaterial({ 
            color: color, 
            metalness: 0.8, 
            roughness: 0.2,
            emissive: color,
            emissiveIntensity: 0.2
        })
    );
    faceplate.position.set(0, height/2 + 0.01, 0);
    faceplate.rotation.x = -Math.PI/2;
    group.add(faceplate);
    
    scene.add(group);
    return group;
}

function createKnob(x, y, z, color, label) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.5, 0.4, 32),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 })
    );
    group.add(base);
    
    const knobBody = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 0.8, 32),
        new THREE.MeshStandardMaterial({ 
            color: color, 
            metalness: 0.6, 
            roughness: 0.3,
            emissive: color,
            emissiveIntensity: 0.3
        })
    );
    knobBody.position.y = 0.6;
    group.add(knobBody);
    
    const indicator = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.6, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    indicator.position.set(0, 0.8, 0.8);
    group.add(indicator);
    
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 64, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 1),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.9 })
    );
    labelMesh.position.set(0, -0.6, 0);
    labelMesh.rotation.x = -Math.PI/2;
    group.add(labelMesh);
    
    knobBody.userData = { defaultRotation: knobBody.rotation.y, value: 0.5 };
    scene.add(group);
    knobs.push({ group, body: knobBody, indicator, value: 0.5, label });
    return group;
}

function createButton(x, y, z, color, label) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.9, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.3 })
    );
    group.add(base);
    
    const buttonTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 0.3, 32),
        new THREE.MeshStandardMaterial({ 
            color: color, 
            metalness: 0.6, 
            roughness: 0.3,
            emissive: color,
            emissiveIntensity: 0.3
        })
    );
    buttonTop.position.y = 0.25;
    group.add(buttonTop);
    
    if (label) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMesh = new THREE.Mesh(
            new THREE.CircleGeometry(0.6, 32),
            new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.9 })
        );
        labelMesh.position.set(0, 0.41, 0);
        labelMesh.rotation.x = -Math.PI/2;
        group.add(labelMesh);
    }
    
    buttonTop.userData = { pressed: false, defaultY: buttonTop.position.y };
    scene.add(group);
    buttons.push({ group, top: buttonTop, color, isOn: false, label });
    return group;
}

function createVisualizer(x, y, z, width, height, color) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    
    const border = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.4, 0.2, height + 0.4),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 })
    );
    group.add(border);
    
    const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ color: 0x111111, emissive: 0x111111, emissiveIntensity: 0.1 })
    );
    screen.position.set(0, 0.2, 0);
    screen.rotation.x = -Math.PI/2;
    group.add(screen);
    
    const lineGeo = new THREE.BufferGeometry();
    const linePoints = [];
    for (let i = 0; i <= width; i += 0.1) {
        linePoints.push(i - width/2, 0, 0);
    }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3));
    
    const lineMat = new THREE.LineBasicMaterial({ color: color });
    const line = new THREE.Line(lineGeo, lineMat);
    line.position.set(0, 0.3, 0);
    group.add(line);
    
    screen.userData = { line, color, amplitude: Math.random() * 0.5 + 0.5, freq: Math.random() * 0.1 + 0.05 };
    scene.add(group);
    return { group, screen, line };
}

function createVUMeter(x, y, z, numLeds) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    
    const spacing = 0.4;
    const ledColors = [0x00ff00, 0x00ff00, 0x00ff00, 0x00ff00, 0xffff00, 0xffff00, 0xffff00, 0xff0000, 0xff0000, 0xff0000];
    
    for (let i = 0; i < numLeds; i++) {
        const led = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.2, 0.8),
            new THREE.MeshBasicMaterial({ 
                color: ledColors[i % ledColors.length],
                opacity: 0.2,
                transparent: true,
                emissive: ledColors[i % ledColors.length],
                emissiveIntensity: 0.1
            })
        );
        led.position.set(0, 0, i * spacing);
        group.add(led);
        led.userData = { defaultOpacity: 0.2, color: ledColors[i % ledColors.length], index: i };
        lights.push(led);
    }
    
    scene.add(group);
    return group;
}

function createCable(x1, y1, z1, x2, y2, z2, color) {
    const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(x1, y1 + 3, z1),
        new THREE.Vector3(x1, y1 + 8, z1),
        new THREE.Vector3(x2, y2 + 8, z2),
        new THREE.Vector3(x2, y2 + 3, z2)
    );
    
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
    const cable = new THREE.Line(geometry, material);
    scene.add(cable);
    return cable;
}

function addModuleLabel(module, text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 4),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.9 })
    );
    labelMesh.position.set(0, 2.6, -10);
    labelMesh.rotation.x = -Math.PI/2;
    module.add(labelMesh);
}

function addColoredLights() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    const positions = [
        [-30, 20, -20], [30, 20, -20], [-30, 20, 20],
        [30, 20, 20], [0, 20, -30], [0, 20, 30]
    ];
    
    positions.forEach((pos, i) => {
        const light = new THREE.PointLight(colors[i % colors.length], 0.4);
        light.position.set(pos[0], pos[1], pos[2]);
        scene.add(light);
        
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
        );
        sphere.position.copy(light.position);
        scene.add(sphere);
    });
}

// Event handlers
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    if (selectedKnob) {
        const deltaX = mouse.x - selectedKnob.lastX;
        selectedKnob.value = Math.max(0, Math.min(1, selectedKnob.value + deltaX * 2));
        selectedKnob.body.rotation.y = selectedKnob.value * Math.PI * 1.5;
        selectedKnob.lastX = mouse.x;
    }
}

function onMouseDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    checkInteractions();
}

// Touch handlers
function onTouchStart(event) {
    event.preventDefault();
    const touches = event.touches;
    
    if (touches.length === 1) {
        const touch = touches[0];
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        previousTouch = { x: touch.clientX, y: touch.clientY };
        checkInteractions();
    } else if (touches.length === 2) {
        initialPinchDistance = getPinchDistance(touches[0], touches[1]);
    }
}

function onTouchMove(event) {
    event.preventDefault();
    const touches = event.touches;
    
    if (touches.length === 1) {
        const touch = touches[0];
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

        if (selectedKnob) {
            const deltaX = (touch.clientX - previousTouch.x) / window.innerWidth * 2;
            selectedKnob.value = Math.max(0, Math.min(1, selectedKnob.value + deltaX));
            selectedKnob.body.rotation.y = selectedKnob.value * Math.PI * 1.5;
        } else {
            const deltaX = (touch.clientX - previousTouch.x) * 0.1;
            const deltaY = (touch.clientY - previousTouch.y) * 0.1;
            orbitCamera(deltaX, deltaY);
        }
        previousTouch = { x: touch.clientX, y: touch.clientY };
    } else if (touches.length === 2) {
        const currentDistance = getPinchDistance(touches[0], touches[1]);
        if (initialPinchDistance !== null) {
            const zoomFactor = (initialPinchDistance - currentDistance) * CONFIG.ZOOM_SPEED;
            zoomCamera(zoomFactor);
        }
        initialPinchDistance = currentDistance;
    }
}

function onTouchEnd() {
    selectedKnob = null;
    previousTouch = null;
    initialPinchDistance = null;
}

function getPinchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function zoomCamera(delta) {
    const cameraVector = camera.position.clone().normalize();
    camera.position.addScaledVector(cameraVector, delta * camera.position.length());
    
    const currentDistance = camera.position.length();
    if (currentDistance < CONFIG.MIN_ZOOM) {
        camera.position.normalize().multiplyScalar(CONFIG.MIN_ZOOM);
    } else if (currentDistance > CONFIG.MAX_ZOOM) {
        camera.position.normalize().multiplyScalar(CONFIG.MAX_ZOOM);
    }
}

function orbitCamera(deltaX, deltaY) {
    const radius = camera.position.length();
    let theta = Math.atan2(camera.position.x, camera.position.z);
    let phi = Math.acos(camera.position.y / radius);

    theta -= deltaX * 0.01;
    phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + deltaY * 0.01));

    camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
    camera.position.y = radius * Math.cos(phi);
    camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(0, 10, 0);
}

function onWheel(event) {
    const delta = Math.sign(event.deltaY);
    zoomCamera(delta * CONFIG.ZOOM_SPEED);
}

function checkInteractions() {
    raycaster.setFromCamera(mouse, camera);
    
    const knobIntersections = [];
    knobs.forEach(knob => {
        const intersects = raycaster.intersectObject(knob.body, true);
        if (intersects.length > 0) {
            knobIntersections.push({ knob, distance: intersects[0].distance });
        }
    });
    
    if (knobIntersections.length > 0) {
        knobIntersections.sort((a, b) => a.distance - b.distance);
        selectedKnob = knobIntersections[0].knob;
        selectedKnob.lastX = mouse.x;
        return;
    }
    
    buttons.forEach(button => {
        const intersects = raycaster.intersectObject(button.top, true);
        if (intersects.length > 0) {
            button.isOn = !button.isOn;
            button.top.position.y = button.isOn ? 
                button.top.userData.defaultY - 0.15 : 
                button.top.userData.defaultY;
            button.top.material.emissiveIntensity = button.isOn ? 0.8 : 0.3;
        }
    });
}

// Animation loop
function animate() {
    const animationId = requestAnimationFrame(animate);
    
    if (!modalOverlay.classList.contains('modal-active')) {
        cancelAnimationFrame(animationId);
        return;
    }
    
    const time = clock.getElapsedTime();
    
    const cameraRadius = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
    camera.position.x = Math.sin(time * CONFIG.CAMERA_SPEED) * cameraRadius;
    camera.position.z = Math.cos(time * CONFIG.CAMERA_SPEED) * cameraRadius;
    camera.lookAt(0, 10, 0);
    
    visualizers.forEach((viz, i) => {
        const screen = viz.screen;
        const line = screen.userData.line;
        const linePositions = line.geometry.attributes.position.array;
        const freq = screen.userData.freq;
        const amp = screen.userData.amplitude;
        
        for (let j = 0; j < linePositions.length / 3; j++) {
            const x = linePositions[j * 3];
            const waveValue = Math.sin((time * 5 + x) * freq) * amp;
            linePositions[j * 3 + 1] = waveValue;
        }
        line.geometry.attributes.position.needsUpdate = true;
    });
    
    lights.forEach((led, i) => {
        const pulseValue = (Math.sin(time * 5 + i) + 1) / 2;
        if (i < pulseValue * 10) {
            led.material.opacity = 0.8;
            led.material.emissiveIntensity = 0.8;
        } else {
            led.material.opacity = 0.2;
            led.material.emissiveIntensity = 0.1;
        }
    });
    
    renderer.render(scene, camera);
}