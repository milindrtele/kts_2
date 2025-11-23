import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { HomeScene } from "./scenes/HomeScene";
import { VideoScene } from "./scenes/VideoScene";

export default function applyStereoUV() {
  const containerRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();

  const activeScene = useRef("home");

  const homeSceneRef = useRef();
  const videoSceneRef = useRef();

  const [stereoMode, setStereoMode] = useState("mono");
  const [is180, setIs180] = useState(false);

  const videoRef = useRef(null);

  // Stereo UV method from your code
  function applyStereoUV(geometry, mode, eye, is180) {
    const uv = geometry.attributes.uv;
    const arr = uv.array;
    const original = geometry.userData.originalUV;

    for (let i = 0; i < arr.length; i += 2) {
      let u = original[i];
      let v = original[i + 1];

      if (is180) {
        u *= 2;
        if (u > 1) u = 1;
      }

      if (mode === "SBS") {
        u *= 0.5;
        if (eye === "RIGHT") u += 0.5;
      }
      if (mode === "TB") {
        v *= 0.5;
        if (eye === "RIGHT") v += 0.5;
      }

      arr[i] = u;
      arr[i + 1] = v;
    }

    uv.needsUpdate = true;
  }

  // -------------------------------
  // SETUP — RUNS ONCE
  // -------------------------------
  useEffect(() => {
    const container = containerRef.current;

    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.xr.enabled = true;
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(rendererRef.current.domElement);
    document.body.appendChild(VRButton.createButton(rendererRef.current));

    // rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    // Create both scenes (HomeScene constructed below with callback)
    videoSceneRef.current = new VideoScene(
      rendererRef.current,
      camera,
      videoRef.current,
      applyStereoUV,
      stereoMode,
      is180
    );

    // Create HomeScene with callback and ensure controllers start in the home scene
    homeSceneRef.current = new HomeScene(rendererRef.current, camera, () => {
      activeScene.current = "video";
      moveControllersToScene(videoSceneRef.current.scene);
    });

    moveControllersToScene(homeSceneRef.current.scene);

    // Render loop
    rendererRef.current.setAnimationLoop(() => {
      const scene =
        activeScene.current === "home"
          ? homeSceneRef.current.scene
          : videoSceneRef.current.scene;

      rendererRef.current.render(scene, camera);
    });
  }, []);

  // -------------------------------
  // UPDATE STEREO UV WHEN CHANGED
  // -------------------------------
  useEffect(() => {
    if (!videoSceneRef.current) return;

    applyStereoUV(videoSceneRef.current.leftGeo, stereoMode, "LEFT", is180);
    applyStereoUV(videoSceneRef.current.rightGeo, stereoMode, "RIGHT", is180);
  }, [stereoMode, is180]);

  // -------------------------------
  // KEYBOARD INPUT
  // -------------------------------

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        activeScene.current = activeScene.current == "home" ? "video" : "home";
        // also move the controllers to match the active scene
        const target =
          activeScene.current == "home"
            ? homeSceneRef.current?.scene
            : videoSceneRef.current?.scene;
        if (target) moveControllersToScene(target);
      }
      if (e.code === "Numpad1") setStereoMode("mono");
      if (e.code === "Numpad2") setStereoMode("SBS");
      if (e.code === "Numpad3") setStereoMode("TB");
      if (e.code === "KeyF") setIs180((v) => !v);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Helper to move the real XR controllers/grips into the provided scene
  function moveControllersToScene(targetScene) {
    const objs = [
      rendererRef.current.xr.getController(0),
      rendererRef.current.xr.getController(1),
      rendererRef.current.xr.getControllerGrip(0),
      rendererRef.current.xr.getControllerGrip(1),
    ];
    objs.forEach((o) => {
      if (!o) return;
      if (o.parent) o.parent.remove(o);
      targetScene.add(o);
    });

    // Disable event handlers on all scenes, then enable on the target scene
    [homeSceneRef.current, videoSceneRef.current].forEach((s) => {
      if (s && typeof s.disableControllerEvents === "function") {
        s.disableControllerEvents();
      }
    });

    if (
      homeSceneRef.current &&
      homeSceneRef.current.scene === targetScene &&
      typeof homeSceneRef.current.enableControllerEvents === "function"
    ) {
      homeSceneRef.current.enableControllerEvents();
    }

    if (
      videoSceneRef.current &&
      videoSceneRef.current.scene === targetScene &&
      typeof videoSceneRef.current.enableControllerEvents === "function"
    ) {
      videoSceneRef.current.enableControllerEvents();
    }
  }

  const changeScene = (sceneName) => {
    activeScene.current = activeScene.current == "home" ? "video" : "home";
    // also move the controllers to match the active scene
    const target =
      activeScene.current == "home"
        ? homeSceneRef.current?.scene
        : videoSceneRef.current?.scene;
    if (target) moveControllersToScene(target);
  };

  return (
    <>
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
      <video ref={videoRef} loop muted playsInline style={{ display: "none" }}>
        <source src="/videos/MaryOculus.webm" />
        <source src="/videos/MaryOculus.mp4" />
      </video>
    </>
  );
}
