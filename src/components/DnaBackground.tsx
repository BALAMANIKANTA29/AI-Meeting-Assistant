import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export default function DnaBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
    cam.position.set(0, 0, 32);

    const ren = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    ren.setSize(window.innerWidth, window.innerHeight);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Bloom — white on black ethereal glow
    const comp = new EffectComposer(ren);
    comp.addPass(new RenderPass(scene, cam));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.0,
      0.6,
      0.15
    );
    comp.addPass(bloom);

    // Background wireframe icosahedrons
    const bgIco1 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(16, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.015 })
    );
    scene.add(bgIco1);

    const bgIco2 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(12, 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.01 })
    );
    scene.add(bgIco2);

    // DNA Helix parameters
    const NPP = 14;
    const HELIX_R = 6;
    const HELIX_H = 24;
    const TWISTS = 2.5;
    const nodes: THREE.Mesh[] = [];
    const nodeGroup = new THREE.Group();

    function makeNode(brightness: number, size: number) {
      const r = Math.max(0.08, size);
      const geo = new THREE.IcosahedronGeometry(r, 0);
      const v = Math.floor(brightness * 255);
      const col = new THREE.Color(`rgb(${v},${v},${v})`);
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 });
      return new THREE.Mesh(geo, mat);
    }

    for (let i = 0; i < NPP; i++) {
      const t = i / (NPP - 1);
      const angle = t * Math.PI * 2 * TWISTS;
      const y = (t - 0.5) * HELIX_H;

      // Strand A — bright white
      const nA = makeNode(0.95, 0.22 + Math.random() * 0.12);
      nA.position.set(HELIX_R * Math.cos(angle), y, HELIX_R * Math.sin(angle));
      nA.userData = { strand: 0, idx: i, baseX: nA.position.x, baseZ: nA.position.z, baseY: y, angle, t };
      nodeGroup.add(nA);
      nodes.push(nA);

      // Strand B — medium gray, 180° offset
      const nB = makeNode(0.45, 0.18 + Math.random() * 0.1);
      const angleB = angle + Math.PI;
      nB.position.set(HELIX_R * Math.cos(angleB), y, HELIX_R * Math.sin(angleB));
      nB.userData = { strand: 1, idx: i, baseX: nB.position.x, baseZ: nB.position.z, baseY: y, angle: angleB, t };
      nodeGroup.add(nB);
      nodes.push(nB);
    }

    // Connection pairs
    const rungPairs: [number, number][] = [];
    for (let i = 0; i < NPP; i++) rungPairs.push([i * 2, i * 2 + 1]);

    const neighborPairs: [number, number][] = [];
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < NPP - 1; i++) {
        neighborPairs.push([s * NPP + i, s * NPP + i + 1]);
      }
    }

    const crossPairs: [number, number][] = [];
    for (let i = 0; i < 12; i++) {
      const a = Math.floor(Math.random() * nodes.length);
      let b = Math.floor(Math.random() * nodes.length);
      if (a === b) b = (b + 1) % nodes.length;
      crossPairs.push([a, b]);
    }

    function buildLines(pairs: [number, number][], brightness: number, opacity: number) {
      const pos: number[] = [];
      const col: number[] = [];
      const c = new THREE.Color(`rgb(${brightness},${brightness},${brightness})`);
      for (const [a, b] of pairs) {
        pos.push(nodes[a].position.x, nodes[a].position.y, nodes[a].position.z);
        pos.push(nodes[b].position.x, nodes[b].position.y, nodes[b].position.z);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity }));
    }

    const rungLines = buildLines(rungPairs, 200, 0.15);
    const neighborLines = buildLines(neighborPairs, 180, 0.1);
    const crossLines = buildLines(crossPairs, 120, 0.04);
    nodeGroup.add(rungLines, neighborLines, crossLines);

    // Ambient particles
    const partCount = 140;
    const partGeo = new THREE.BufferGeometry();
    const partPos = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount; i++) {
      partPos[i * 3] = (Math.random() - 0.5) * 55;
      partPos[i * 3 + 1] = (Math.random() - 0.5) * 45;
      partPos[i * 3 + 2] = (Math.random() - 0.5) * 35;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.35 });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    scene.add(nodeGroup);

    // Mouse parallax
    let m3x = 0, m3y = 0, m3tx = 0, m3ty = 0;
    const handleMouseMove = (e: MouseEvent) => {
      m3tx = (e.clientX / window.innerWidth - 0.5) * 2;
      m3ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    const clk = new THREE.Clock();

    function anim() {
      animationFrameId = requestAnimationFrame(anim);
      const t = clk.getElapsedTime();

      m3x += (m3tx - m3x) * 0.04;
      m3y += (m3ty - m3y) * 0.04;

      nodeGroup.rotation.y = t * 0.12 + m3x * 0.35;
      nodeGroup.rotation.x = Math.sin(t * 0.08) * 0.1 + m3y * 0.2;

      for (const n of nodes) {
        const u = n.userData;
        n.position.y = u.baseY + Math.sin(t * 0.6 + u.t * Math.PI * 4) * 0.4;
        const breathe = 1 + Math.sin(t * 0.8 + u.t * 6) * 0.1;
        n.scale.setScalar(breathe);
        n.rotation.x = t * 0.5;
        n.rotation.z = t * 0.3;
      }

      function updateLineGeo(seg: THREE.LineSegments, pairs: [number, number][]) {
        const arr = (seg.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        let idx = 0;
        for (const [a, b] of pairs) {
          arr[idx++] = nodes[a].position.x; arr[idx++] = nodes[a].position.y; arr[idx++] = nodes[a].position.z;
          arr[idx++] = nodes[b].position.x; arr[idx++] = nodes[b].position.y; arr[idx++] = nodes[b].position.z;
        }
        seg.geometry.attributes.position.needsUpdate = true;
      }
      updateLineGeo(rungLines, rungPairs);
      updateLineGeo(neighborLines, neighborPairs);
      updateLineGeo(crossLines, crossPairs);

      (rungLines.material as THREE.LineBasicMaterial).opacity = 0.12 + Math.sin(t * 1.5) * 0.06;

      bgIco1.rotation.y = t * 0.015;
      bgIco1.rotation.x = t * 0.008;
      bgIco2.rotation.y = -t * 0.012;
      bgIco2.rotation.z = t * 0.006;

      particles.rotation.y = t * 0.018;
      particles.rotation.x = Math.sin(t * 0.05) * 0.02;

      comp.render();
    }
    anim();

    const handleResize = () => {
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
      ren.setSize(window.innerWidth, window.innerHeight);
      comp.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      ren.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
