import * as THREE from 'three';
import { type PieceSymbol, type Color } from 'chess.js';

export interface PieceMaterials {
  whiteBody: THREE.MeshPhysicalMaterial;
  whiteTrim: THREE.MeshPhysicalMaterial;
  blackBody: THREE.MeshPhysicalMaterial;
  blackTrim: THREE.MeshPhysicalMaterial;
  feltPad: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
}

/**
 * Generates procedural Carrara Marble / Obsidian Wood-Vein CanvasTextures
 * and a soft radial contact shadow texture with zero external network assets.
 */
export function createProceduralBoardTextures(maxAnisotropy: number): {
  lightSquareMap: THREE.CanvasTexture;
  darkSquareMap: THREE.CanvasTexture;
  frameMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  shadowMap: THREE.CanvasTexture;
} {
  // 1. Light Square Texture (Warm Ivory / Carrara Marble)
  const lightCanvas = document.createElement('canvas');
  lightCanvas.width = 128;
  lightCanvas.height = 128;
  const lCtx = lightCanvas.getContext('2d')!;
  lCtx.fillStyle = '#ece3d5';
  lCtx.fillRect(0, 0, 128, 128);

  lCtx.strokeStyle = 'rgba(175, 158, 136, 0.28)';
  lCtx.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) {
    lCtx.beginPath();
    let x = (i * 23) % 128;
    let y = 0;
    lCtx.moveTo(x, y);
    while (y < 128) {
      y += 24;
      x += Math.sin(y * 0.08 + i) * 10;
      lCtx.lineTo(x, y);
    }
    lCtx.stroke();
  }
  const lightSquareMap = new THREE.CanvasTexture(lightCanvas);
  lightSquareMap.colorSpace = THREE.SRGBColorSpace;
  lightSquareMap.anisotropy = maxAnisotropy;

  // 2. Dark Square Texture (Deep Obsidian & Bronze-Veined Ebony)
  const darkCanvas = document.createElement('canvas');
  darkCanvas.width = 128;
  darkCanvas.height = 128;
  const dCtx = darkCanvas.getContext('2d')!;
  dCtx.fillStyle = '#181d27';
  dCtx.fillRect(0, 0, 128, 128);

  dCtx.strokeStyle = 'rgba(212, 168, 83, 0.16)';
  dCtx.lineWidth = 1.2;
  for (let i = 0; i < 10; i++) {
    dCtx.beginPath();
    let x = (i * 29) % 128;
    let y = 0;
    dCtx.moveTo(x, y);
    while (y < 128) {
      y += 24;
      x += Math.cos(y * 0.07 + i) * 9;
      dCtx.lineTo(x, y);
    }
    dCtx.stroke();
  }
  const darkSquareMap = new THREE.CanvasTexture(darkCanvas);
  darkSquareMap.colorSpace = THREE.SRGBColorSpace;
  darkSquareMap.anisotropy = maxAnisotropy;

  // 3. Border Frame Texture (Dark Walnut / Rosewood grain)
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = 128;
  frameCanvas.height = 128;
  const fCtx = frameCanvas.getContext('2d')!;
  fCtx.fillStyle = '#141115';
  fCtx.fillRect(0, 0, 128, 128);
  fCtx.fillStyle = 'rgba(45, 32, 24, 0.35)';
  for (let i = 0; i < 32; i++) {
    fCtx.fillRect(0, i * 4, 128, 1.5);
  }
  const frameMap = new THREE.CanvasTexture(frameCanvas);
  frameMap.colorSpace = THREE.SRGBColorSpace;
  frameMap.anisotropy = maxAnisotropy;

  // 4. Micro-relief Bump Map (Linear grayscale)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 64;
  bumpCanvas.height = 64;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 2) {
    for (let x = 0; x < 64; x += 2) {
      const v = 120 + ((x * 13 + y * 29) % 16);
      bCtx.fillStyle = `rgb(${v},${v},${v})`;
      bCtx.fillRect(x, y, 2, 2);
    }
  }
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  // 5. Soft Radial Contact Shadow Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 64, 64);
  const shadowMap = new THREE.CanvasTexture(shadowCanvas);

  return { lightSquareMap, darkSquareMap, frameMap, bumpMap, shadowMap };
}

/**
 * Creates a crisp coordinate label texture ('A'-'H', '1'-'8') for board edges.
 */
export function createCoordLabelTexture(
  text: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.font = '600 36px "Cinzel", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d4a853';
  ctx.fillText(text, 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Creates shared MeshPhysicalMaterial PBR shaders with clearcoat=1.0 and clearcoatRoughness=0.1
 * for White (Warm Pearl Ivory + Imperial Gold) and Black (Polished Obsidian + Rose-Gold Bronze).
 */
export function createPieceMaterials(
  bumpMap: THREE.CanvasTexture,
  shadowMap: THREE.CanvasTexture,
  hasEnvMap = true
): PieceMaterials {
  const whiteBody = new THREE.MeshPhysicalMaterial({
    color: 0xf7f1e6,
    roughness: 0.18,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9,
    bumpMap,
    bumpScale: 0.003,
  });

  const whiteTrim = new THREE.MeshPhysicalMaterial({
    color: 0xeab949,
    roughness: 0.15,
    metalness: hasEnvMap ? 0.9 : 0.3,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const blackBody = new THREE.MeshPhysicalMaterial({
    color: 0x202736,
    roughness: 0.22,
    metalness: hasEnvMap ? 0.45 : 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 0.92,
    bumpMap,
    bumpScale: 0.004,
  });

  const blackTrim = new THREE.MeshPhysicalMaterial({
    color: 0xd99642,
    roughness: 0.16,
    metalness: hasEnvMap ? 0.88 : 0.3,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const feltPad = new THREE.MeshStandardMaterial({
    color: 0x2b161b,
    roughness: 0.88,
    metalness: 0.02,
  });

  const contactShadow = new THREE.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.6,
  });

  return {
    whiteBody,
    whiteTrim,
    blackBody,
    blackTrim,
    feltPad,
    contactShadow,
  };
}

/**
 * Uses THREE.SplineCurve sampled at high density to construct museum-grade
 * continuous Staunton LatheGeometry profiles without faceted kinks.
 */
function createSplineLatheProfile(
  controlPoints: Array<[number, number]>,
  curveSamples = 32,
  radialSegments = 28
): THREE.LatheGeometry {
  const rawVecs = controlPoints.map(([r, y]) => new THREE.Vector2(r, y));
  // Keep sharp base pedestal steps for the first 3 points, then smooth spline through the stem & neck
  const baseSteps = rawVecs.slice(0, 3);
  const splineControl = rawVecs.slice(2);
  const spline = new THREE.SplineCurve(splineControl);
  const sampledSpline = spline.getPoints(curveSamples).map(
    (pt) => new THREE.Vector2(Math.max(0.008, pt.x), pt.y)
  );
  const combined = [...baseSteps, ...sampledSpline];
  const geom = new THREE.LatheGeometry(combined, radialSegments);
  geom.computeVertexNormals();
  return geom;
}

interface CachedPieceGeometries {
  shadowCircle: THREE.CircleGeometry;
  feltBase: Record<PieceSymbol, THREE.CylinderGeometry>;
  basePlinthRing: Record<PieceSymbol, THREE.TorusGeometry>;
  lowerRing: Record<PieceSymbol, THREE.TorusGeometry>;
  pawnBody: THREE.LatheGeometry;
  pawnCollar: THREE.TorusGeometry;
  pawnHead: THREE.SphereGeometry;
  rookBody: THREE.LatheGeometry;
  rookNeckRing: THREE.TorusGeometry;
  rookMerlon: THREE.BoxGeometry;
  knightPedestal: THREE.LatheGeometry;
  knightRing: THREE.TorusGeometry;
  knightHead: THREE.ExtrudeGeometry;
  knightManeCrest: THREE.ExtrudeGeometry;
  knightEye: THREE.SphereGeometry;
  bishopBody: THREE.LatheGeometry;
  bishopCollar: THREE.TorusGeometry;
  bishopSash: THREE.TorusGeometry;
  bishopMitreCut: THREE.BoxGeometry;
  bishopOrb: THREE.SphereGeometry;
  queenBody: THREE.LatheGeometry;
  queenCollar: THREE.TorusGeometry;
  queenCrownRim: THREE.TorusGeometry;
  queenCoronetSpike: THREE.ConeGeometry;
  queenPearl: THREE.SphereGeometry;
  queenOrb: THREE.SphereGeometry;
  kingBody: THREE.LatheGeometry;
  kingMidCollar: THREE.TorusGeometry;
  kingCrownCollar: THREE.TorusGeometry;
  kingCrownArch: THREE.TorusGeometry;
  kingOrb: THREE.SphereGeometry;
  kingCrossVert: THREE.BoxGeometry;
  kingCrossHoriz: THREE.BoxGeometry;
}

let cachedGeoms: CachedPieceGeometries | null = null;

function getPieceGeometries(): CachedPieceGeometries {
  if (cachedGeoms) return cachedGeoms;

  const radii: Record<PieceSymbol, number> = {
    p: 0.29,
    r: 0.33,
    n: 0.33,
    b: 0.33,
    q: 0.36,
    k: 0.37,
  };

  const feltBase = {} as Record<PieceSymbol, THREE.CylinderGeometry>;
  const basePlinthRing = {} as Record<PieceSymbol, THREE.TorusGeometry>;
  const lowerRing = {} as Record<PieceSymbol, THREE.TorusGeometry>;
  (['p', 'r', 'n', 'b', 'q', 'k'] as PieceSymbol[]).forEach((t) => {
    const r = radii[t];
    feltBase[t] = new THREE.CylinderGeometry(r, r * 1.03, 0.04, 24);
    basePlinthRing[t] = new THREE.TorusGeometry(r * 0.98, 0.016, 10, 24);
    lowerRing[t] = new THREE.TorusGeometry(r * 0.89, 0.022, 12, 24);
  });

  // Sculpted Staunton Warhorse Knight profile via smooth Bezier curves
  const horseShape = new THREE.Shape();
  horseShape.moveTo(-0.15, 0.34);
  horseShape.lineTo(0.15, 0.34);
  // Muscular chest & throat curve
  horseShape.bezierCurveTo(0.21, 0.48, 0.18, 0.64, 0.11, 0.74);
  // Downward-angled muzzle & jaw
  horseShape.lineTo(0.25, 0.67);
  horseShape.quadraticCurveTo(0.29, 0.73, 0.25, 0.81);
  // Bridge of nose up to forehead & pointed ears
  horseShape.bezierCurveTo(0.18, 0.89, 0.12, 0.96, 0.07, 1.02);
  horseShape.lineTo(0.04, 1.15);
  horseShape.lineTo(-0.02, 1.04);
  // Arching neck & mane back down to pedestal
  horseShape.bezierCurveTo(-0.19, 0.98, -0.24, 0.66, -0.15, 0.34);

  const horseGeom = new THREE.ExtrudeGeometry(horseShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.042,
    bevelThickness: 0.042,
  });
  horseGeom.translate(0, 0, -0.07);
  horseGeom.computeVertexNormals();

  // Sculpted Metallic Mane Ridge along the back of the Knight's neck
  const maneShape = new THREE.Shape();
  maneShape.moveTo(-0.13, 0.38);
  maneShape.bezierCurveTo(-0.22, 0.64, -0.18, 0.95, -0.02, 1.03);
  maneShape.lineTo(-0.06, 0.98);
  maneShape.bezierCurveTo(-0.15, 0.86, -0.17, 0.62, -0.1, 0.38);

  const maneGeom = new THREE.ExtrudeGeometry(maneShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015,
  });
  maneGeom.translate(0, 0, -0.025);
  maneGeom.computeVertexNormals();

  cachedGeoms = {
    shadowCircle: new THREE.CircleGeometry(0.45, 24),
    feltBase,
    basePlinthRing,
    lowerRing,
    pawnBody: createSplineLatheProfile([
      [0.01, 0.04],
      [0.29, 0.04],
      [0.28, 0.11],
      [0.22, 0.17],
      [0.17, 0.27],
      [0.12, 0.46],
      [0.095, 0.62],
      [0.15, 0.67],
      [0.08, 0.71],
      [0.01, 0.71],
    ]),
    pawnCollar: new THREE.TorusGeometry(0.13, 0.018, 10, 24),
    pawnHead: new THREE.SphereGeometry(0.18, 24, 18),
    rookBody: createSplineLatheProfile([
      [0.01, 0.04],
      [0.33, 0.04],
      [0.31, 0.12],
      [0.25, 0.19],
      [0.21, 0.32],
      [0.185, 0.56],
      [0.175, 0.72],
      [0.23, 0.81],
      [0.25, 0.95],
      [0.16, 0.95],
      [0.15, 0.86],
      [0.01, 0.86],
    ]),
    rookNeckRing: new THREE.TorusGeometry(0.215, 0.022, 10, 24),
    rookMerlon: new THREE.BoxGeometry(0.088, 0.14, 0.088),
    knightPedestal: createSplineLatheProfile([
      [0.01, 0.04],
      [0.33, 0.04],
      [0.31, 0.11],
      [0.25, 0.19],
      [0.21, 0.31],
      [0.19, 0.36],
      [0.01, 0.36],
    ]),
    knightRing: new THREE.TorusGeometry(0.205, 0.022, 10, 24),
    knightHead: horseGeom,
    knightManeCrest: maneGeom,
    knightEye: new THREE.SphereGeometry(0.028, 12, 12),
    bishopBody: createSplineLatheProfile([
      [0.01, 0.04],
      [0.33, 0.04],
      [0.31, 0.12],
      [0.24, 0.2],
      [0.17, 0.38],
      [0.12, 0.68],
      [0.18, 0.75],
      [0.13, 0.8],
      [0.195, 0.94],
      [0.16, 1.09],
      [0.06, 1.19],
      [0.01, 1.21],
    ]),
    bishopCollar: new THREE.TorusGeometry(0.165, 0.022, 10, 24),
    bishopSash: new THREE.TorusGeometry(0.145, 0.016, 10, 24),
    bishopMitreCut: new THREE.BoxGeometry(0.16, 0.028, 0.12),
    bishopOrb: new THREE.SphereGeometry(0.055, 16, 16),
    queenBody: createSplineLatheProfile([
      [0.01, 0.04],
      [0.36, 0.04],
      [0.34, 0.12],
      [0.26, 0.23],
      [0.19, 0.44],
      [0.135, 0.78],
      [0.21, 0.86],
      [0.15, 0.94],
      [0.235, 1.17],
      [0.17, 1.27],
      [0.01, 1.29],
    ]),
    queenCollar: new THREE.TorusGeometry(0.195, 0.024, 12, 24),
    queenCrownRim: new THREE.TorusGeometry(0.215, 0.02, 12, 24),
    queenCoronetSpike: new THREE.ConeGeometry(0.036, 0.11, 10),
    queenPearl: new THREE.SphereGeometry(0.034, 12, 12),
    queenOrb: new THREE.SphereGeometry(0.06, 16, 16),
    kingBody: createSplineLatheProfile([
      [0.01, 0.04],
      [0.37, 0.04],
      [0.35, 0.13],
      [0.27, 0.24],
      [0.2, 0.48],
      [0.145, 0.86],
      [0.23, 0.95],
      [0.17, 1.04],
      [0.255, 1.29],
      [0.19, 1.39],
      [0.01, 1.41],
    ]),
    kingMidCollar: new THREE.TorusGeometry(0.215, 0.025, 12, 24),
    kingCrownCollar: new THREE.TorusGeometry(0.24, 0.022, 12, 24),
    kingCrownArch: new THREE.TorusGeometry(0.12, 0.016, 10, 20, Math.PI),
    kingOrb: new THREE.SphereGeometry(0.062, 16, 16),
    kingCrossVert: new THREE.BoxGeometry(0.05, 0.23, 0.05),
    kingCrossHoriz: new THREE.BoxGeometry(0.17, 0.05, 0.05),
  };

  return cachedGeoms;
}

/**
 * Builds a museum-grade composite 3D Staunton chess piece (`THREE.Group`)
 * using spline-lathed geometries, clearcoat physical materials, and metallic collars.
 */
export function buildProceduralPieceGroup(
  type: PieceSymbol,
  color: Color,
  materials: PieceMaterials,
  castShadow: boolean
): THREE.Group {
  const g = getPieceGeometries();
  const group = new THREE.Group();
  const bodyMat = color === 'w' ? materials.whiteBody : materials.blackBody;
  const trimMat = color === 'w' ? materials.whiteTrim : materials.blackTrim;

  // Part 1: Soft radial contact shadow disc at y = 0.008
  const shadowMesh = new THREE.Mesh(g.shadowCircle, materials.contactShadow);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.008;
  group.add(shadowMesh);

  // Part 2: Velvet felt base pad at y = 0.02
  const feltMesh = new THREE.Mesh(g.feltBase[type], materials.feltPad);
  feltMesh.position.y = 0.02;
  group.add(feltMesh);

  // Part 3: Base metallic plinth rim at y = 0.048
  const plinthRing = new THREE.Mesh(g.basePlinthRing[type], trimMat);
  plinthRing.rotation.x = Math.PI / 2;
  plinthRing.position.y = 0.048;
  group.add(plinthRing);

  // Part 4: Lower metallic torus collar at y = 0.135
  const lowerRing = new THREE.Mesh(g.lowerRing[type], trimMat);
  lowerRing.rotation.x = Math.PI / 2;
  lowerRing.position.y = 0.135;
  lowerRing.castShadow = castShadow;
  group.add(lowerRing);

  if (type === 'p') {
    const bodyMesh = new THREE.Mesh(g.pawnBody, bodyMat);
    bodyMesh.castShadow = castShadow;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    const upperCollar = new THREE.Mesh(g.pawnCollar, trimMat);
    upperCollar.rotation.x = Math.PI / 2;
    upperCollar.position.y = 0.67;
    group.add(upperCollar);

    const headSphere = new THREE.Mesh(g.pawnHead, bodyMat);
    headSphere.position.y = 0.85;
    headSphere.castShadow = castShadow;
    headSphere.receiveShadow = true;
    group.add(headSphere);
  } else if (type === 'r') {
    const bodyMesh = new THREE.Mesh(g.rookBody, bodyMat);
    bodyMesh.castShadow = castShadow;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    const neckRing = new THREE.Mesh(g.rookNeckRing, trimMat);
    neckRing.rotation.x = Math.PI / 2;
    neckRing.position.y = 0.79;
    group.add(neckRing);

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const merlon = new THREE.Mesh(g.rookMerlon, bodyMat);
      merlon.position.set(
        Math.cos(angle) * 0.195,
        0.995,
        Math.sin(angle) * 0.195
      );
      merlon.rotation.y = -angle;
      merlon.castShadow = castShadow;
      group.add(merlon);
    }
  } else if (type === 'n') {
    const pedestal = new THREE.Mesh(g.knightPedestal, bodyMat);
    pedestal.castShadow = castShadow;
    pedestal.receiveShadow = true;
    group.add(pedestal);

    const pedestalRing = new THREE.Mesh(g.knightRing, trimMat);
    pedestalRing.rotation.x = Math.PI / 2;
    pedestalRing.position.y = 0.35;
    group.add(pedestalRing);

    const facingYaw = color === 'w' ? Math.PI / 2 : -Math.PI / 2;

    const horseMesh = new THREE.Mesh(g.knightHead, bodyMat);
    horseMesh.rotation.y = facingYaw;
    horseMesh.castShadow = castShadow;
    horseMesh.receiveShadow = true;
    group.add(horseMesh);

    const maneMesh = new THREE.Mesh(g.knightManeCrest, trimMat);
    maneMesh.rotation.y = facingYaw;
    group.add(maneMesh);

    const zEye = color === 'w' ? -0.1 : 0.1;
    const eyeLeft = new THREE.Mesh(g.knightEye, trimMat);
    eyeLeft.position.set(-0.075, 0.89, zEye);
    group.add(eyeLeft);

    const eyeRight = new THREE.Mesh(g.knightEye, trimMat);
    eyeRight.position.set(0.075, 0.89, zEye);
    group.add(eyeRight);
  } else if (type === 'b') {
    const bodyMesh = new THREE.Mesh(g.bishopBody, bodyMat);
    bodyMesh.castShadow = castShadow;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    const neckCollar = new THREE.Mesh(g.bishopCollar, trimMat);
    neckCollar.rotation.x = Math.PI / 2;
    neckCollar.position.y = 0.75;
    group.add(neckCollar);

    const mitreSash = new THREE.Mesh(g.bishopSash, trimMat);
    mitreSash.rotation.x = Math.PI / 3;
    mitreSash.position.y = 0.98;
    group.add(mitreSash);

    const mitreCutAccent = new THREE.Mesh(g.bishopMitreCut, trimMat);
    mitreCutAccent.position.set(0, 1.06, color === 'w' ? -0.08 : 0.08);
    mitreCutAccent.rotation.x = color === 'w' ? Math.PI / 4 : -Math.PI / 4;
    group.add(mitreCutAccent);

    const finialOrb = new THREE.Mesh(g.bishopOrb, trimMat);
    finialOrb.position.y = 1.25;
    finialOrb.castShadow = castShadow;
    group.add(finialOrb);
  } else if (type === 'q') {
    const bodyMesh = new THREE.Mesh(g.queenBody, bodyMat);
    bodyMesh.castShadow = castShadow;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    const collarRing = new THREE.Mesh(g.queenCollar, trimMat);
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.y = 0.86;
    group.add(collarRing);

    const crownRim = new THREE.Mesh(g.queenCrownRim, trimMat);
    crownRim.rotation.x = Math.PI / 2;
    crownRim.position.y = 1.2;
    group.add(crownRim);

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const rx = Math.cos(angle) * 0.195;
      const rz = Math.sin(angle) * 0.195;

      const spike = new THREE.Mesh(g.queenCoronetSpike, trimMat);
      spike.position.set(rx, 1.26, rz);
      group.add(spike);

      const pearl = new THREE.Mesh(g.queenPearl, bodyMat);
      pearl.position.set(rx, 1.32, rz);
      group.add(pearl);
    }

    const topOrb = new THREE.Mesh(g.queenOrb, trimMat);
    topOrb.position.y = 1.34;
    group.add(topOrb);
  } else if (type === 'k') {
    const bodyMesh = new THREE.Mesh(g.kingBody, bodyMat);
    bodyMesh.castShadow = castShadow;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    const midCollar = new THREE.Mesh(g.kingMidCollar, trimMat);
    midCollar.rotation.x = Math.PI / 2;
    midCollar.position.y = 0.95;
    group.add(midCollar);

    const crownCollar = new THREE.Mesh(g.kingCrownCollar, trimMat);
    crownCollar.rotation.x = Math.PI / 2;
    crownCollar.position.y = 1.3;
    group.add(crownCollar);

    const arch1 = new THREE.Mesh(g.kingCrownArch, trimMat);
    arch1.position.y = 1.34;
    group.add(arch1);

    const arch2 = new THREE.Mesh(g.kingCrownArch, trimMat);
    arch2.rotation.y = Math.PI / 2;
    arch2.position.y = 1.34;
    group.add(arch2);

    const crossOrb = new THREE.Mesh(g.kingOrb, trimMat);
    crossOrb.position.y = 1.46;
    group.add(crossOrb);

    const crossVert = new THREE.Mesh(g.kingCrossVert, trimMat);
    crossVert.position.y = 1.59;
    crossVert.castShadow = castShadow;
    group.add(crossVert);

    const crossHoriz = new THREE.Mesh(g.kingCrossHoriz, trimMat);
    crossHoriz.position.y = 1.61;
    crossHoriz.castShadow = castShadow;
    group.add(crossHoriz);
  }

  return group;
}

export function squareToWorldCoords(square: string): { x: number; z: number } {
  const fileCode = square.charCodeAt(0) - 97;
  const rankIndex = 8 - parseInt(square[1], 10);
  return {
    x: fileCode - 3.5,
    z: rankIndex - 3.5,
  };
}
