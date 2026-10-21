import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Chess, type Color, type Move, type PieceSymbol } from 'chess.js';
import {
  buildProceduralPieceGroup,
  createCoordLabelTexture,
  createPieceMaterials,
  createProceduralBoardTextures,
  squareToWorldCoords,
} from './chessGeometry.ts';

export interface ChessScene3DProps {
  fen: string;
  selectedSquare: string | null;
  legalMoves: Move[];
  lastMove: { from: string; to: string } | null;
  inCheckKingSquare: string | null;
  cameraFlipped: boolean;
  cameraResetTrigger: number;
  isTitleScreen: boolean;
  onSquareClick: (square: string) => void;
}

interface PieceAnimState {
  group: THREE.Group;
  type: PieceSymbol;
  color: Color;
  square: string;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  progress: number; // 0..1 (1 = settled on square)
  isArc: boolean;
  currentLiftY: number;
  targetLiftY: number;
}

function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

export function computeAdaptiveCameraParams(
  width: number,
  height: number,
  flipped: boolean
): { fov: number; posX: number; posY: number; posZ: number } {
  const aspect = Math.max(0.35, width / Math.max(1, height));
  const zSign = flipped ? -1 : 1;

  if (aspect < 0.65) {
    const scale = 0.65 / aspect;
    return {
      fov: Math.min(54, 46 * Math.pow(scale, 0.35)),
      posX: 0,
      posY: 13.6 * scale,
      posZ: 10.4 * scale * zSign,
    };
  } else if (aspect < 1.0) {
    const scale = 1.0 / aspect;
    return {
      fov: 44,
      posX: 0,
      posY: 11.4 * Math.pow(scale, 0.55),
      posZ: 9.6 * Math.pow(scale, 0.55) * zSign,
    };
  } else {
    return {
      fov: 38,
      posX: 0,
      posY: 9.5,
      posZ: 9.1 * zSign,
    };
  }
}

export const ChessScene3D: React.FC<ChessScene3DProps> = ({
  fen,
  selectedSquare,
  legalMoves,
  lastMove,
  inCheckKingSquare,
  cameraFlipped,
  cameraResetTrigger,
  isTitleScreen,
  onSquareClick,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const onSquareClickRef = useRef(onSquareClick);
  onSquareClickRef.current = onSquareClick;

  const isTitleScreenRef = useRef(isTitleScreen);
  isTitleScreenRef.current = isTitleScreen;

  const cameraFlippedRef = useRef(cameraFlipped);
  cameraFlippedRef.current = cameraFlipped;

  const selectedSquareRef = useRef(selectedSquare);
  selectedSquareRef.current = selectedSquare;

  // Tracks the exact move key that has already been animated so clicking pieces NEVER re-triggers it
  const lastAnimatedMoveKeyRef = useRef<string>('');

  const sceneStateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    piecesRoot: THREE.Group;
    highlightsRoot: THREE.Group;
    pieceAnims: Map<string, PieceAnimState>;
    materials: ReturnType<typeof createPieceMaterials>;
    isHeadless: boolean;
    desiredCamPos: THREE.Vector3;
    desiredTarget: THREE.Vector3;
    isTransitioningCamera: boolean;
    needsRender: boolean;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090b10);
    scene.fog = new THREE.FogExp2(0x090b10, 0.022);

    const camParams = computeAdaptiveCameraParams(width, height, cameraFlippedRef.current);
    const camera = new THREE.PerspectiveCamera(camParams.fov, width / height, 0.1, 120);
    camera.position.set(camParams.posX, camParams.posY, camParams.posZ);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('data-testid', 'chess-3d-canvas');
    container.appendChild(canvas);

    if (!isHeadless) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    }

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(
      0xdbeafe,
      0x1e1b18,
      isHeadless ? 1.45 : 0.9
    );
    hemiLight.position.set(0, 18, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3db, isHeadless ? 2.6 : 2.2);
    keyLight.position.set(6.5, 13.5, 7.5);
    keyLight.castShadow = !isHeadless;
    if (!isHeadless) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 30;
      const d = 6.2;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xf59e0b, 1.5, 24);
    rimLight.position.set(-7, 6.5, -7.5);
    scene.add(rimLight);

    const coolFillPoint = new THREE.PointLight(0x60a5fa, 1.0, 22);
    coolFillPoint.position.set(7.5, 5.0, -6.5);
    scene.add(coolFillPoint);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isHeadless;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 5.2;
    controls.maxDistance = 22.0;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI / 2 - 0.08;
    controls.target.set(0, 0, 0);
    controls.update();

    controls.addEventListener('change', () => {
      if (sceneStateRef.current) {
        sceneStateRef.current.needsRender = true;
      }
    });

    const maxAnisotropy = isHeadless ? 1 : renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralBoardTextures(maxAnisotropy);
    const pieceMaterials = createPieceMaterials(
      textures.bumpMap,
      textures.shadowMap,
      !isHeadless
    );

    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    const outerPedestal = new THREE.Mesh(
      new THREE.BoxGeometry(9.4, 0.44, 9.4),
      new THREE.MeshStandardMaterial({
        map: textures.frameMap,
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.2,
        bumpMap: textures.bumpMap,
        bumpScale: 0.008,
      })
    );
    outerPedestal.position.y = -0.24;
    outerPedestal.receiveShadow = !isHeadless;
    boardGroup.add(outerPedestal);

    const goldInlayRim = new THREE.Mesh(
      new THREE.BoxGeometry(8.26, 0.46, 8.26),
      pieceMaterials.whiteTrim
    );
    goldInlayRim.position.y = -0.235;
    boardGroup.add(goldInlayRim);

    const floorDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(13.5, 14.5, 0.16, 36),
      new THREE.MeshStandardMaterial({
        color: 0x0b0e15,
        roughness: 0.78,
        metalness: 0.15,
      })
    );
    floorDisc.position.y = -0.54;
    floorDisc.receiveShadow = !isHeadless;
    boardGroup.add(floorDisc);

    // Coordinate algebraic labels ('A'..'H' and '1'..'8')
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const coordPlaneGeom = new THREE.PlaneGeometry(0.36, 0.36);

    files.forEach((f, idx) => {
      const tex = createCoordLabelTexture(f.toUpperCase(), maxAnisotropy);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      });
      const x = idx - 3.5;
      const labelFront = new THREE.Mesh(coordPlaneGeom, mat);
      labelFront.rotation.x = -Math.PI / 2;
      labelFront.position.set(x, -0.005, 4.38);
      boardGroup.add(labelFront);

      const labelBack = new THREE.Mesh(coordPlaneGeom, mat);
      labelBack.rotation.x = -Math.PI / 2;
      labelBack.rotation.z = Math.PI;
      labelBack.position.set(x, -0.005, -4.38);
      boardGroup.add(labelBack);
    });

    ranks.forEach((rk, idx) => {
      const tex = createCoordLabelTexture(rk, maxAnisotropy);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      });
      const z = idx - 3.5;
      const labelLeft = new THREE.Mesh(coordPlaneGeom, mat);
      labelLeft.rotation.x = -Math.PI / 2;
      labelLeft.position.set(-4.38, -0.005, z);
      boardGroup.add(labelLeft);

      const labelRight = new THREE.Mesh(coordPlaneGeom, mat);
      labelRight.rotation.x = -Math.PI / 2;
      labelRight.position.set(4.38, -0.005, z);
      boardGroup.add(labelRight);
    });

    const lightSquareMat = new THREE.MeshStandardMaterial({
      map: textures.lightSquareMap,
      color: 0xffffff,
      roughness: 0.24,
      metalness: 0.08,
      bumpMap: textures.bumpMap,
      bumpScale: 0.005,
    });
    const darkSquareMat = new THREE.MeshStandardMaterial({
      map: textures.darkSquareMap,
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.18,
      bumpMap: textures.bumpMap,
      bumpScale: 0.006,
    });

    const squareGeom = new THREE.BoxGeometry(0.992, 0.08, 0.992);
    const interactableSquares: THREE.Object3D[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        const squareName = `${files[c]}${ranks[r]}`;
        const tileMesh = new THREE.Mesh(
          squareGeom,
          isLight ? lightSquareMat : darkSquareMat
        );
        tileMesh.position.set(c - 3.5, -0.04, r - 3.5);
        tileMesh.receiveShadow = !isHeadless;
        tileMesh.userData.square = squareName;
        boardGroup.add(tileMesh);
        interactableSquares.push(tileMesh);
      }
    }

    const highlightsRoot = new THREE.Group();
    scene.add(highlightsRoot);

    const piecesRoot = new THREE.Group();
    scene.add(piecesRoot);

    const desiredCamPos = new THREE.Vector3(camParams.posX, camParams.posY, camParams.posZ);
    const desiredTarget = new THREE.Vector3(0, 0, 0);

    sceneStateRef.current = {
      scene,
      camera,
      renderer,
      controls,
      piecesRoot,
      highlightsRoot,
      pieceAnims: new Map(),
      materials: pieceMaterials,
      isHeadless,
      desiredCamPos,
      desiredTarget,
      isTransitioningCamera: false,
      needsRender: true,
    };

    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let downTime = 0;
    let activePointers = 0;

    const handlePointerDown = (e: PointerEvent) => {
      activePointers++;
      if (activePointers === 1) {
        downX = e.clientX;
        downY = e.clientY;
        downTime = performance.now();
      }
      if (sceneStateRef.current) {
        sceneStateRef.current.isTransitioningCamera = false;
        sceneStateRef.current.needsRender = true;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const wasSinglePointer = activePointers <= 1;
      activePointers = Math.max(0, activePointers - 1);

      if (!wasSinglePointer || isTitleScreenRef.current) return;

      const state = sceneStateRef.current;
      if (state) {
        // Prevent clicking while a move transition animation is actively in flight
        for (const anim of state.pieceAnims.values()) {
          if (anim.progress < 1) {
            return;
          }
        }
      }

      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      const dist = Math.hypot(dx, dy);
      const elapsed = performance.now() - downTime;

      if (dist <= 12 && elapsed <= 600) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointerNDC, camera);
        const targets = [
          ...interactableSquares,
          ...piecesRoot.children,
          ...highlightsRoot.children,
        ];
        const hits = raycaster.intersectObjects(targets, true);

        for (const hit of hits) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj) {
            if (obj.userData && typeof obj.userData.square === 'string') {
              onSquareClickRef.current(obj.userData.square);
              return;
            }
            obj = obj.parent;
          }
        }
      }
    };

    const handlePointerCancel = () => {
      activePointers = 0;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;

      const adaptive = computeAdaptiveCameraParams(w, h, cameraFlippedRef.current);
      camera.fov = adaptive.fov;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      if (sceneStateRef.current) {
        sceneStateRef.current.desiredCamPos.set(adaptive.posX, adaptive.posY, adaptive.posZ);
        if (isHeadless) {
          camera.position.copy(sceneStateRef.current.desiredCamPos);
          controls.target.set(0, 0, 0);
          controls.update();
          renderer.render(scene, camera);
        } else {
          sceneStateRef.current.isTransitioningCamera = true;
        }
        sceneStateRef.current.needsRender = true;
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    let animFrameId = 0;
    let lastTime = performance.now();
    let titleOrbitAngle = 0.45;

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);

      const rawDt = (now - lastTime) * 0.001;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      const state = sceneStateRef.current;
      if (!state) return;

      if (isHeadless) {
        if (state.needsRender) {
          state.needsRender = false;
          for (const anim of state.pieceAnims.values()) {
            anim.progress = 1;
            anim.isArc = false;
            anim.startX = anim.targetX;
            anim.startZ = anim.targetZ;
            anim.currentLiftY = anim.targetLiftY;
            anim.group.position.set(anim.targetX, anim.currentLiftY, anim.targetZ);
          }
          controls.update();
          renderer.render(scene, camera);
        }
        return;
      }

      if (isTitleScreenRef.current) {
        titleOrbitAngle += dt * 0.28;
        const radius = 10.5;
        camera.position.x = Math.sin(titleOrbitAngle) * radius;
        camera.position.z = Math.cos(titleOrbitAngle) * radius;
        camera.position.y = 7.4 + Math.sin(titleOrbitAngle * 0.7) * 0.6;
        controls.target.set(0, 0.3, 0);
        controls.update();
      } else if (state.isTransitioningCamera) {
        const dampFactor = easeOutCubic(Math.min(1, dt * 8.5));
        camera.position.lerp(state.desiredCamPos, dampFactor);
        controls.target.lerp(state.desiredTarget, dampFactor);
        controls.update();
        if (
          camera.position.distanceToSquared(state.desiredCamPos) < 0.002 &&
          controls.target.distanceToSquared(state.desiredTarget) < 0.002
        ) {
          camera.position.copy(state.desiredCamPos);
          controls.target.copy(state.desiredTarget);
          state.isTransitioningCamera = false;
        }
      } else {
        controls.update();
      }

      // Smooth cubic-bezier interpolation for move trajectories and selection lift
      for (const anim of state.pieceAnims.values()) {
        // 1. Selection vertical lift (decoupled from horizontal move animation)
        const liftDiff = anim.targetLiftY - anim.currentLiftY;
        if (Math.abs(liftDiff) > 0.001) {
          anim.currentLiftY += liftDiff * easeOutCubic(Math.min(1, dt * 14));
        } else {
          anim.currentLiftY = anim.targetLiftY;
        }

        // 2. Horizontal move slide + parabolic arc (clears immediately once progress === 1)
        if (anim.progress < 1) {
          anim.progress = Math.min(1, anim.progress + dt * 4.6);
          const eased = easeOutCubic(anim.progress);
          const x = THREE.MathUtils.lerp(anim.startX, anim.targetX, eased);
          const z = THREE.MathUtils.lerp(anim.startZ, anim.targetZ, eased);
          const arcY = anim.isArc ? Math.sin(anim.progress * Math.PI) * 0.68 : 0;
          anim.group.position.set(x, arcY + anim.currentLiftY, z);

          if (anim.progress >= 1) {
            anim.progress = 1;
            anim.isArc = false;
            anim.startX = anim.targetX;
            anim.startZ = anim.targetZ;
            anim.group.position.set(anim.targetX, anim.currentLiftY, anim.targetZ);
          }
        } else {
          anim.group.position.set(anim.targetX, anim.currentLiftY, anim.targetZ);
        }
      }

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      controls.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  // Synchronize Camera Flip / Reset View / Title transition
  useEffect(() => {
    const state = sceneStateRef.current;
    const container = mountRef.current;
    if (!state || !container) return;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const adaptive = computeAdaptiveCameraParams(w, h, cameraFlipped);
    state.camera.fov = adaptive.fov;
    state.camera.updateProjectionMatrix();
    state.desiredCamPos.set(adaptive.posX, adaptive.posY, adaptive.posZ);
    state.desiredTarget.set(0, 0, 0);

    if (state.isHeadless) {
      state.camera.position.copy(state.desiredCamPos);
      state.controls.target.copy(state.desiredTarget);
      state.controls.update();
      state.needsRender = true;
    } else {
      state.isTransitioningCamera = true;
    }
  }, [cameraFlipped, cameraResetTrigger, isTitleScreen]);

  // Synchronize 3D Chess Pieces strictly on FEN changes (DECOUPLED from selectedSquare!)
  useEffect(() => {
    const state = sceneStateRef.current;
    if (!state) return;

    const chess = new Chess(fen);
    const board = chess.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    while (state.piecesRoot.children.length > 0) {
      state.piecesRoot.remove(state.piecesRoot.children[0]);
    }
    state.pieceAnims.clear();

    const moveKey = lastMove ? `${fen}:${lastMove.from}->${lastMove.to}` : '';
    const shouldAnimateLastMove =
      !state.isHeadless &&
      Boolean(lastMove) &&
      moveKey !== '' &&
      moveKey !== lastAnimatedMoveKeyRef.current;

    if (shouldAnimateLastMove) {
      lastAnimatedMoveKeyRef.current = moveKey;
    }

    const currentSelected = selectedSquareRef.current;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        const sq = `${files[c]}${ranks[r]}`;

        const group = buildProceduralPieceGroup(
          piece.type,
          piece.color,
          state.materials,
          !state.isHeadless
        );
        group.userData.square = sq;
        group.traverse((child) => {
          child.userData.square = sq;
        });

        const targetCoords = squareToWorldCoords(sq);
        let startX = targetCoords.x;
        let startZ = targetCoords.z;
        let progress = 1;
        let isArc = false;

        if (shouldAnimateLastMove && lastMove && lastMove.to === sq) {
          const fromCoords = squareToWorldCoords(lastMove.from);
          startX = fromCoords.x;
          startZ = fromCoords.z;
          progress = 0;
          isArc = true;
        }

        const isSelected = currentSelected === sq;
        const initialLiftY = isSelected ? 0.18 : 0;
        group.position.set(startX, initialLiftY, startZ);

        state.piecesRoot.add(group);
        state.pieceAnims.set(sq, {
          group,
          type: piece.type,
          color: piece.color,
          square: sq,
          startX,
          startZ,
          targetX: targetCoords.x,
          targetZ: targetCoords.z,
          progress,
          isArc,
          currentLiftY: initialLiftY,
          targetLiftY: initialLiftY,
        });
      }
    }

    state.needsRender = true;
  }, [fen, lastMove]);

  // Decoupled Selection Lift Effect: updates ONLY targetLiftY without touching move animations!
  useEffect(() => {
    const state = sceneStateRef.current;
    if (!state) return;

    for (const [sq, anim] of state.pieceAnims.entries()) {
      anim.targetLiftY = selectedSquare === sq ? 0.18 : 0;
      if (state.isHeadless) {
        anim.currentLiftY = anim.targetLiftY;
        anim.group.position.y = anim.currentLiftY;
      }
    }
    state.needsRender = true;
  }, [selectedSquare]);

  // Synchronize Visual Aids (Selected Gold Ring, Emerald Legal Targets, Crimson Captures, Check Halo)
  useEffect(() => {
    const state = sceneStateRef.current;
    if (!state) return;

    while (state.highlightsRoot.children.length > 0) {
      state.highlightsRoot.remove(state.highlightsRoot.children[0]);
    }

    if (lastMove) {
      const amberMat = new THREE.MeshBasicMaterial({
        color: 0xd97706,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      });
      for (const sq of [lastMove.from, lastMove.to]) {
        const { x, z } = squareToWorldCoords(sq);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.94), amberMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.set(x, 0.004, z);
        plane.userData.square = sq;
        state.highlightsRoot.add(plane);
      }
    }

    if (selectedSquare) {
      const { x, z } = squareToWorldCoords(selectedSquare);
      const goldPad = new THREE.Mesh(
        new THREE.PlaneGeometry(0.94, 0.94),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        })
      );
      goldPad.rotation.x = -Math.PI / 2;
      goldPad.position.set(x, 0.006, z);
      goldPad.userData.square = selectedSquare;
      state.highlightsRoot.add(goldPad);

      const goldRing = new THREE.Mesh(
        new THREE.RingGeometry(0.36, 0.45, 28),
        new THREE.MeshBasicMaterial({
          color: 0xfde047,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      goldRing.rotation.x = -Math.PI / 2;
      goldRing.position.set(x, 0.012, z);
      goldRing.userData.square = selectedSquare;
      state.highlightsRoot.add(goldRing);
    }

    const uniqueTargets = new Map<string, Move>();
    for (const m of legalMoves) {
      if (!uniqueTargets.has(m.to)) {
        uniqueTargets.set(m.to, m);
      }
    }

    for (const [targetSq, move] of uniqueTargets.entries()) {
      const { x, z } = squareToWorldCoords(targetSq);
      const isCapture = Boolean(move.captured || move.flags.includes('e'));

      const hitboxPad = new THREE.Mesh(
        new THREE.PlaneGeometry(0.96, 0.96),
        new THREE.MeshBasicMaterial({
          color: isCapture ? 0xef4444 : 0x10b981,
          transparent: true,
          opacity: isCapture ? 0.36 : 0.24,
          depthWrite: false,
        })
      );
      hitboxPad.rotation.x = -Math.PI / 2;
      hitboxPad.position.set(x, 0.009, z);
      hitboxPad.userData.square = targetSq;
      state.highlightsRoot.add(hitboxPad);

      if (isCapture) {
        const captureRing = new THREE.Mesh(
          new THREE.RingGeometry(0.35, 0.46, 28),
          new THREE.MeshBasicMaterial({
            color: 0xf87171,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        captureRing.rotation.x = -Math.PI / 2;
        captureRing.position.set(x, 0.015, z);
        captureRing.userData.square = targetSq;
        state.highlightsRoot.add(captureRing);
      } else {
        const emeraldDisc = new THREE.Mesh(
          new THREE.CircleGeometry(0.18, 24),
          new THREE.MeshBasicMaterial({
            color: 0x34d399,
            depthWrite: false,
          })
        );
        emeraldDisc.rotation.x = -Math.PI / 2;
        emeraldDisc.position.set(x, 0.015, z);
        emeraldDisc.userData.square = targetSq;
        state.highlightsRoot.add(emeraldDisc);

        const emeraldRing = new THREE.Mesh(
          new THREE.RingGeometry(0.24, 0.3, 24),
          new THREE.MeshBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        emeraldRing.rotation.x = -Math.PI / 2;
        emeraldRing.position.set(x, 0.014, z);
        emeraldRing.userData.square = targetSq;
        state.highlightsRoot.add(emeraldRing);
      }
    }

    if (inCheckKingSquare) {
      const { x, z } = squareToWorldCoords(inCheckKingSquare);
      const checkPad = new THREE.Mesh(
        new THREE.CircleGeometry(0.47, 28),
        new THREE.MeshBasicMaterial({
          color: 0xdc2626,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        })
      );
      checkPad.rotation.x = -Math.PI / 2;
      checkPad.position.set(x, 0.011, z);
      checkPad.userData.square = inCheckKingSquare;
      state.highlightsRoot.add(checkPad);
    }

    state.needsRender = true;
  }, [selectedSquare, legalMoves, lastMove, inCheckKingSquare]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full overflow-hidden select-none"
      style={{ height: '100dvh' }}
      aria-label="3D Chessboard Viewport"
    />
  );
};
