/*
 * DUNE — Desert Codex
 * Interactive Systems for Nazmul Hasan's Portfolio
 * GPU-Accelerated Spice Vortex + Mentat Decryption + Scroll Systems
 */

// ═══════════════════ 1. MENTAT DECRYPTION TEXT ═══════════════════
const scrambleElement = document.getElementById('scramble-text');
const originalText = scrambleElement.innerText;
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆĐŴŊΨΣΩΞΦΔᚠᚢᚦᚨᚱᚲ0123456789";
let iterations = 0;

const interval = setInterval(() => {
    scrambleElement.innerText = originalText
        .split("")
        .map((letter, index) => {
            if (index < iterations) return originalText[index];
            if (letter === " ") return " ";
            return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("");

    if (iterations >= originalText.length) clearInterval(interval);
    iterations += 1 / 3;
}, 30);

// ═══════════════════ 2. SCROLL REVEAL ═══════════════════
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// ═══════════════════ 3. NAVBAR SCROLL ═══════════════════
const nav = document.getElementById('nav');

window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
}, { passive: true });

// ═══════════════════ 4. SMOOTH NAV SCROLL ═══════════════════
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// ═══════════════════ 5. THREE.JS — GPU SPICE VORTEX ═══════════════════
// All particle animation computed on GPU via custom shaders.
// Zero per-particle CPU work in the render loop = extremely low overhead.

(function initSpiceField() {
    const canvas = document.querySelector('#bg-canvas');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap DPR for perf

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(0, 0, 80);

    // --- Particle Data (kept lean: 800 particles) ---
    const COUNT = 800;
    const positions = new Float32Array(COUNT * 3);
    const randoms = new Float32Array(COUNT * 3); // per-particle random seeds
    const sizes = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        // Distribute in a soft cylinder — looks like a spice column
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 40 + 5;
        const height = (Math.random() - 0.5) * 120;

        positions[i3    ] = Math.cos(angle) * radius;
        positions[i3 + 1] = height;
        positions[i3 + 2] = Math.sin(angle) * radius;

        randoms[i3    ] = Math.random();
        randoms[i3 + 1] = Math.random();
        randoms[i3 + 2] = Math.random();

        sizes[i] = Math.random() * 3.0 + 1.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    // --- GPU Shaders — All animation on the graphics card ---
    const vertexShader = `
        uniform float uTime;
        uniform float uScroll;
        uniform vec2 uMouse;
        attribute vec3 aRandom;
        attribute float aSize;
        varying float vAlpha;
        varying float vDistance;

        void main() {
            vec3 pos = position;
            float seed1 = aRandom.x;
            float seed2 = aRandom.y;
            float seed3 = aRandom.z;

            // --- Spiral drift: each particle orbits at its own speed ---
            float orbitSpeed = 0.08 + seed1 * 0.12;
            float angle = atan(pos.z, pos.x) + uTime * orbitSpeed;
            float radius = length(pos.xz);

            // Radius breathes in and out slowly
            radius += sin(uTime * 0.3 + seed2 * 6.28) * 3.0;

            pos.x = cos(angle) * radius;
            pos.z = sin(angle) * radius;

            // --- Vertical drift: gentle rise and fall ---
            pos.y += sin(uTime * 0.2 + seed3 * 6.28) * 8.0;
            // Scroll pushes particles upward (spice blow effect)
            pos.y += uScroll * 0.15;

            // --- Mouse repulsion: particles gently pushed away ---
            vec2 toMouse = pos.xz - uMouse * 30.0;
            float mouseDist = length(toMouse);
            if (mouseDist < 20.0) {
                vec2 push = normalize(toMouse) * (20.0 - mouseDist) * 0.3;
                pos.x += push.x;
                pos.z += push.y;
            }

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

            // Distance-based size attenuation
            gl_PointSize = aSize * (80.0 / -mvPosition.z);
            gl_PointSize = max(gl_PointSize, 0.5);

            gl_Position = projectionMatrix * mvPosition;

            // Pass data to fragment shader
            vDistance = length(mvPosition.xyz);
            vAlpha = smoothstep(200.0, 40.0, vDistance) * (0.4 + seed1 * 0.5);
        }
    `;

    const fragmentShader = `
        uniform float uTime;
        varying float vAlpha;
        varying float vDistance;

        void main() {
            // Soft circular particle (computed, no texture needed)
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;

            float softEdge = 1.0 - smoothstep(0.2, 0.5, dist);

            // Color oscillates between spice orange and gold
            float colorMix = sin(uTime * 0.4 + vDistance * 0.05) * 0.5 + 0.5;
            vec3 spice = vec3(0.88, 0.45, 0.13);   // #e07422
            vec3 gold  = vec3(0.83, 0.68, 0.22);    // #d4af37
            vec3 color = mix(spice, gold, colorMix);

            // Subtle inner glow
            float glow = exp(-dist * 4.0) * 0.3;
            color += vec3(1.0, 0.8, 0.4) * glow;

            gl_FragColor = vec4(color, softEdge * vAlpha);
        }
    `;

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uScroll: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // --- State (no allocations in loop) ---
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;
    let scrollNorm = 0;
    let animFrame = 0;
    let lastTime = 0;

    // Throttled mouse tracking
    document.addEventListener('mousemove', (e) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    // Throttled scroll
    window.addEventListener('scroll', () => {
        scrollNorm = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    }, { passive: true });

    // --- Render Loop (minimal CPU work) ---
    function render(time) {
        animFrame = requestAnimationFrame(render);

        // Limit to ~30fps when tab is in background (saves battery)
        const delta = time - lastTime;
        if (delta < 16) { // ~60fps cap
            return;
        }
        lastTime = time;

        const t = time * 0.001; // seconds

        // Smooth mouse interpolation (no allocation)
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        // Update only 3 uniform values — no CPU particle loop
        material.uniforms.uTime.value = t;
        material.uniforms.uScroll.value = scrollNorm * 60;
        material.uniforms.uMouse.value.set(mouseX, mouseY);

        // Gentle camera sway
        camera.position.x = mouseX * 5;
        camera.position.y = -mouseY * 3 + 2;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    requestAnimationFrame(render);

    // --- Resize (debounced) ---
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }, 150);
    });

    // --- Pause when tab is hidden (saves resources) ---
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animFrame);
        } else {
            lastTime = performance.now();
            animFrame = requestAnimationFrame(render);
        }
    });
})();