import * as THREE from 'three';
import { PieceSymbol, Color } from 'chess.js';

export interface PieceMaterials {
  whiteBody: THREE.MeshStandardMaterial;
  whiteTrim: THREE.MeshStandardMaterial;
  blackBody: THREE.MeshStandardMaterial;
  blackTrim: THREE.MeshStandardMaterial;
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
  lCtx.fillStyle = '#e8dfd1';
  lCtx.fillRect(0, 0, 128, 128);

  lCtx.strokeStyle = 'rgba(180, 165, 145, 0.28)';
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
  dCtx.fillStyle = '#1b202b';
  dCtx.fillRect(0, 0, 128, 128);

  dCtx.strokeStyle = 'rgba(212, 168, 83, 0.14)';
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
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 64, 64);
  const shadowMap = new THREE.CanvasTexture(shadowCanvas);

  return { lightSquareMap, darkSquareMap, frameMap, bumpMap, shadowMap };
}

/**
 * Creates a crisp coordinate label texture ('A'-'H', '1'-'8') for board edges.
 */
export function createCoordLabelTexture(text: string, maxAnisotropy: number): THREE.CanvasTexture {
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
 * Creates shared PBR materials for White (Warm Pearl Ivory + Brushed Gold)
 * and Black (Polished Obsidian + Brushed Rose-Gold/Bronze) pieces.
 * Enforces >= 0.25 roughness delta between body, metallic trim, and velvet base pad.
 */
export function createPieceMaterials(
  bumpMap: THREE.CanvasTexture,
  shadowMap: THREE.CanvasTexture,
  hasEnvMap = true
): PieceMaterials {
  const whiteBody = new THREE.MeshStandardMaterial({
    color: 0xf5efe6,
    roughness: 0.22,
    metalness: 0.12,
    bumpMap,
    bumpScale: 0.004,
  });

  const whiteTrim = new THREE.MeshStandardMaterial({
    color: 0xe5b84b,
    roughness: 0.18,
    metalness: hasEnvMap ? 0.88 : 0.25,
  });

  const blackBody = new THREE.MeshStandardMaterial({
    color: 0x222938,
    roughness: 0.28,
    metalness: hasEnvMap ? 0.42 : 0.20,
    bumpMap,
    bumpScale: 0.005,
  });

  const blackTrim = new THREE.MeshStandardMaterial({
    color: 0xd49442,
    roughness: 0.18,
    metalness: hasEnvMap ? 0.85 : 0.25,
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
    opacity: 0.55,
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

function createLatheProfile(points: Array<[number, number]>, segments = 20): THREE.LatheGeometry {
  const vec2s = points.map(([r, y]) => new THREE.Vector2(r, y));
  const geom = new THREE.LatheGeometry(vec2s, segments);
  geom.computeVertexNormals();
  return geom;
}

// Singleton Geometry Cache so all 32 pieces share pre-computed BufferGeometries (zero runtime GC)
interface CachedPieceGeometries {
  shadowCircle: THREE.CircleGeometry;
  feltBase: Record<PieceSymbol, THREE.CylinderGeometry>;
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
  knightEye: THREE.SphereGeometry;
  bishopBody: THREE.LatheGeometry;
  bishopCollar: THREE.TorusGeometry;
  bishopSash: THREE.TorusGeometry;
  bishopOrb: THREE.SphereGeometry;
  queenBody: THREE.LatheGeometry;
  queenCollar: THREE.TorusGeometry;
  queenCrownRim: THREE.TorusGeometry;
  queenPearl: THREE.SphereGeometry;
  queenOrb: THREE.SphereGeometry;
  kingBody: THREE.LatheGeometry;
  kingMidCollar: THREE.TorusGeometry;
  kingCrownCollar: THREE.TorusGeometry;
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
    k: 0.36,
  };

  const feltBase = {} as Record<PieceSymbol, THREE.CylinderGeometry>;
  const lowerRing = {} as Record<PieceSymbol, THREE.TorusGeometry>;
  (['p', 'r', 'n', 'b', 'q', 'k'] as PieceSymbol[]).forEach((t) => {
    const r = radii[t];
    feltBase[t] = new THREE.CylinderGeometry(r, r * 1.02, 0.04, 18);
    lowerRing[t] = new THREE.TorusGeometry(r * 0.92, 0.022, 10, 20);
  });

  // Sculpted Staunton horse profile via ExtrudeGeometry with bevels
  const horseShape = new THREE.Shape();
  horseShape.moveTo(-0.14, 0.34);
  horseShape.lineTo(0.14, 0.34);
  horseShape.quadraticCurveTo(0.18, 0.52, 0.12, 0.72);
  horseShape.lineTo(0.23, 0.68);
  horseShape.quadraticCurveTo(0.27, 0.74, 0.24, 0.80);
  horseShape.lineTo(0.08, 0.98);
  horseShape.lineTo(0.04, 1.12);
  horseShape.lineTo(-0.03, 1.02);
  horseShape.bezierCurveTo(-0.18, 0.96, -0.22, 0.66, -0.14, 0.34);

  const horseGeom = new THREE.ExtrudeGeometry(horseShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  });
  horseGeom.translate(0, 0, -0.07);
  horseGeom.computeVertexNormals();

  cachedGeoms = {
    shadowCircle: new THREE.CircleGeometry(0.44, 18),
    feltBase,
    lowerRing,
    pawnBody: createLatheProfile([
      [0.01, 0.04],
      [0.29, 0.04],
      [0.28, 0.10],
      [0.22, 0.16],
      [0.18, 0.24],
      [0.12, 0.45],
      [0.10, 0.62],
      [0.16, 0.66],
      [0.09, 0.70],
      [0.01, 0.70],
    ]),
    pawnCollar: new THREE.TorusGeometry(0.125, 0.016, 8, 18),
    pawnHead: new THREE.SphereGeometry(0.175, 18, 14),
    rookBody: createLatheProfile([
      [0.01, 0.04],
      [0.33, 0.04],
      [0.31, 0.11],
      [0.25, 0.18],
      [0.21, 0.30],
      [0.18, 0.70],
      [0.23, 0.80],
      [0.25, 0.94],
      [0.16, 0.94],
      [0.16, 0.86],
      [0.01, 0.86],
    ]),
    rookNeckRing: new THREE.TorusGeometry(0.21, 0.02, 10, 18),
    rookMerlon: new THREE.BoxGeometry(0.085, 0.13, 0.085),
    knightPedestal: createLatheProfile([
      [0.01, 0.04],
      [0.33, 0.04],
      [0.31, 0.11],
      [0.25, 0.18],
      [0.21, 0.32],
      [0.19, 0.36],
      [0.01, 0.36],
    ]),
    knightRing: new THREE.TorusGeometry(0.20, 0.02, 10, 18),
    knightHead: horseGeom,
    knightEye: new THREE.SphereGeometry(0.028, 10, 10),
    bishopBody: createLatheProfile([
      [0.01, 0.04],
      [0.33, 0.04],
      [0.31, 0.11],
      [0.24, 0.19],
      [0.17, 0.36],
      [0.12, 0.68],
      [0.18, 0.74],
      [0.13, 0.79],
      [0.19, 0.92],
      [0.15, 1.08],
      [0.06, 1.18],
      [0.01, 1.20],
    ]),
    bishopCollar: new THREE.TorusGeometry(0.16, 0.02, 10, 18),
    bishopSash: new THREE.TorusGeometry(0.14, 0.014, 8, 18),
    bishopOrb: new THREE.SphereGeometry(0.052, 12, 12),
    queenBody: createLatheProfile([
      [0.01, 0.04],
      [0.36, 0.04],
      [0.34, 0.12],
      [0.26, 0.22],
      [0.19, 0.42],
      [0.14, 0.78],
      [0.21, 0.86],
      [0.15, 0.93],
      [0.23, 1.16],
      [0.16, 1.26],
      [0.01, 1.28],
    ]),
    queenCollar: new THREE.TorusGeometry(0.195, 0.022, 10, 20),
    queenCrownRim: new THREE.TorusGeometry(0.21, 0.018, 10, 20),
    queenPearl: new THREE.SphereGeometry(0.036, 10, 10),
    queenOrb: new THREE.SphereGeometry(0.055, 12, 12),
    kingBody: createLatheProfile([
      [0.01, 0.04],
      [0.37, 0.04],
      [0.35, 0.13],
      [0.27, 0.23],
      [0.20, 0.46],
      [0.15, 0.86],
      [0.23, 0.95],
      [0.17, 1.03],
      [0.25, 1.28],
      [0.19, 1.38],
      [0.01, 1.40],
    ]),
    kingMidCollar: new THREE.TorusGeometry(0.215, 0.024, 10, 20),
    kingCrownCollar: new THREE.TorusGeometry(0.235, 0.022, 10, 20),
    kingOrb: new THREE.SphereGeometry(0.06, 12, 12),
    kingCrossVert: new THREE.BoxGeometry(0.048, 0.22, 0.048),
    kingCrossHoriz: new THREE.BoxGeometry(0.16, 0.048, 0.048),
  };

  return cachedGeoms;
}

/**
 * Builds a composite multi-part 3D Staunton chess piece (`THREE.Group` with 5 to 11 distinct parts)
 * using shared cached geometries and pivoted at bottom-center (`y = 0`).
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

  // Part 3: Lower metallic trim ring
  const lowerRing = new THREE.Mesh(g.lowerRing[type], trimMat);
  lowerRing.rotation.x = Math.PI / 2;
  lowerRing.position.y = 0.13;
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
    headSphere.position.y = 0.84;
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
    neckRing.position.y = 0.78;
    group.add(neckRing);

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const merlon = new THREE.Mesh(g.rookMerlon, bodyMat);
      merlon.position.set(
        Math.cos(angle) * 0.195,
        0.99,
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

    const horseMesh = new THREE.Mesh(g.knightHead, bodyMat);
    horseMesh.rotation.y = color === 'w' ? Math.PI / 2 : -Math.PI / 2;
    horseMesh.castShadow = castShadow;
    horseMesh.receiveShadow = true;
    group.add(horseMesh);

    const eyeStud = new THREE.Mesh(g.knightEye, trimMat);
    eyeStud.position.set(0, 0.88, color === 'w' ? -0.09 : 0.09);
    group.add(eyeStud);
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

    const finialOrb = new THREE.Mesh(g.bishopOrb, trimMat);
    finialOrb.position.y = 1.24;
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
    crownRim.position.y = 1.20;
    group.add(crownRim);

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const pearl = new THREE.Mesh(g.queenPearl, trimMat);
      pearl.position.set(
        Math.cos(angle) * 0.20,
        1.27,
        Math.sin(angle) * 0.20
      );
      group.add(pearl);
    }

    const topOrb = new THREE.Mesh(g.queenOrb, trimMat);
    topOrb.position.y = 1.32;
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
    crownCollar.position.y = 1.30;
    group.add(crownCollar);

    const crossOrb = new THREE.Mesh(g.kingOrb, trimMat);
    crossOrb.position.y = 1.43;
    group.add(crossOrb);

    const crossVert = new THREE.Mesh(g.kingCrossVert, trimMat);
    crossVert.position.y = 1.56;
    crossVert.castShadow = castShadow;
    group.add(crossVert);

    const crossHoriz = new THREE.Mesh(g.kingCrossHoriz, trimMat);
    crossHoriz.position.y = 1.58;
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
