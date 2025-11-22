import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

export default function StereoVideoVR() {
  const containerRef = useRef(null);

  // Persistent refs for Three.js objects
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const homeSceneRef = useRef(null);
  const videoSceneRef = useRef(null);
  const videoSphereRef = useRef(null);
  const videoTextureRef = useRef(null);
  const videoRef = useRef(null);
  const activeSceneRef = useRef("home");
  // store geometry refs
  const leftGeoRef = useRef(null);
  const rightGeoRef = useRef(null);

  // State
  const [stereoMode, setStereoMode] = useState("mono"); // mono | side-by-side | over-under
  const [is180, setIs180] = useState(false); // 180° video flag

  // -----------------------------
  // DYNAMIC UV MAPPING FUNCTION
  // -----------------------------
  function applyStereoUV(geometry, mode, eye, is180 = false) {
    const uv = geometry.attributes.uv;
    const uvs = uv.array;
    const original = geometry.userData.originalUV; // <– use the stored clean UVs

    for (let i = 0; i < uvs.length; i += 2) {
      let u = original[i];
      let v = original[i + 1];

      // 180° field-of-view reduction
      if (is180) {
        u *= 2.0;
        if (u > 1) u = 1;
      }

      // Stereo modes
      if (mode === "SBS") {
        u *= 0.5;
        if (eye === "RIGHT") u += 0.5;
      } else if (mode === "TB") {
        v *= 0.5;
        if (eye === "RIGHT") v += 0.5;
      }

      uvs[i] = u;
      uvs[i + 1] = v;
    }

    uv.needsUpdate = true;
  }

  // ============================================================
  // 2️⃣ SETUP SCENES — RUNS ONLY ONCE
  // ============================================================
  const setupScene = () => {
    const container = containerRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));
    rendererRef.current = renderer;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    // ------------------------
    // HOME SCENE
    // ------------------------
    const homeScene = new THREE.Scene();
    homeScene.background = new THREE.Color(0x222222);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: "white" })
    );
    box.position.z = -3;
    homeScene.add(box);

    homeSceneRef.current = homeScene;

    // ------------------------
    // VIDEO SCENE
    // ------------------------

    // VIDEO TEXTURE
    videoRef.current.play();
    const texture = new THREE.VideoTexture(videoRef.current);
    texture.colorSpace = THREE.SRGBColorSpace;

    // SCENE
    const videoScene = new THREE.Scene();
    videoScene.background = new THREE.Color(0x101010);

    // LEFT SPHERE
    leftGeoRef.current = new THREE.SphereGeometry(500, 60, 40);
    leftGeoRef.current.scale(-1, 1, 1);
    // Store original unclamped UVs
    leftGeoRef.current.userData.originalUV =
      leftGeoRef.current.attributes.uv.array.slice();

    applyStereoUV(leftGeoRef.current, stereoMode, "LEFT", is180);

    const mesh1 = new THREE.Mesh(
      leftGeoRef.current,
      new THREE.MeshBasicMaterial({ map: texture })
    );
    mesh1.rotation.y = -Math.PI / 2;
    mesh1.layers.set(1);
    videoScene.add(mesh1);

    // RIGHT SPHERE
    rightGeoRef.current = new THREE.SphereGeometry(500, 60, 40);
    rightGeoRef.current.scale(-1, 1, 1);
    // Store original unclamped UVs
    rightGeoRef.current.userData.originalUV =
      rightGeoRef.current.attributes.uv.array.slice();

    applyStereoUV(rightGeoRef.current, stereoMode, "RIGHT", is180);

    const mesh2 = new THREE.Mesh(
      rightGeoRef.current,
      new THREE.MeshBasicMaterial({ map: texture })
    );
    mesh2.rotation.y = -Math.PI / 2;
    mesh2.layers.set(2);
    videoScene.add(mesh2);

    // --------------------------------
    // XR RENDER LOOP (does NOT rerun setup)
    // --------------------------------
    rendererRef.current.setAnimationLoop(() => {
      if (activeSceneRef.current === "home") {
        rendererRef.current.render(homeScene, camera);
      } else {
        rendererRef.current.render(videoScene, camera);
      }
    });
  };

  // ============================================================
  // 3️⃣ RUN SETUP ONCE
  // ============================================================
  useEffect(() => {
    setupScene();
  }, []);

  // ============================================================
  // 4️⃣ APPLY STEREO EFFECT WHEN SETTINGS CHANGE
  // ============================================================
  useEffect(() => {
    applyStereoUV(leftGeoRef.current, stereoMode, "LEFT", is180);
    applyStereoUV(rightGeoRef.current, stereoMode, "RIGHT", is180);
  }, [stereoMode, is180]);

  // ============================================================
  // 5️⃣ KEYBOARD HANDLER FOR SCENE SWITCHING
  // ============================================================
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        console.log("asd");
        activeSceneRef.current =
          activeSceneRef.current == "home" ? "video" : "home";
      }
      if (e.code === "Numpad1") setStereoMode("mono");
      if (e.code === "Numpad2") setStereoMode("SBS");
      if (e.code === "Numpad3") setStereoMode("TB");
      if (e.code === "KeyF") setIs180((v) => !v);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
      />
      <video
        ref={videoRef}
        loop
        muted
        crossOrigin="anonymous"
        playsInline
        style={{ display: "none" }}
      >
        <source src="/videos/MaryOculus.webm" />
        <source src="/videos/MaryOculus.mp4" />
      </video>
    </>
  );
}
