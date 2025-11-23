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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.xr.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    // Create both scenes
    homeSceneRef.current = new HomeScene(renderer, camera);
    videoSceneRef.current = new VideoScene(
      renderer,
      camera,
      videoRef.current,
      applyStereoUV,
      stereoMode,
      is180
    );

    // Helper to move the real XR controllers/grips into the provided scene
    function moveControllersToScene(targetScene) {
      const objs = [
        renderer.xr.getController(0),
        renderer.xr.getController(1),
        renderer.xr.getControllerGrip(0),
        renderer.xr.getControllerGrip(1),
      ];
      objs.forEach((o) => {
        if (!o) return;
        if (o.parent) o.parent.remove(o);
        targetScene.add(o);
      });
    }

    // Ensure controllers start in the home scene
    moveControllersToScene(homeSceneRef.current.scene);

    // Add controller click handler (scene switch)
    function onSelectStart() {
      const hovered = this.userData?.currentHovered;
      if (!hovered) return;

      if (hovered.name === "homeBox") {
        activeScene.current = "video";
        // Move the real XR controllers into the video scene so rays/grips are visible there
        moveControllersToScene(videoSceneRef.current.scene);
      }
    }

    homeSceneRef.current.controller1.addEventListener(
      "selectstart",
      onSelectStart
    );
    homeSceneRef.current.controller2.addEventListener(
      "selectstart",
      onSelectStart
    );

    // Render loop
    renderer.setAnimationLoop(() => {
      const scene =
        activeScene.current === "home"
          ? homeSceneRef.current.scene
          : videoSceneRef.current.scene;

      renderer.render(scene, camera);
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
        console.log("asd");
        activeScene.current =
          activeScene.current == "home" ? "video" : "home";
        // also move the controllers to match the active scene
        const target =
          activeScene.current == "home"
            ? homeSceneRef.current?.scene
            : videoSceneRef.current?.scene;
        const renderer = rendererRef.current;
        if (renderer && target) {
          const objs = [
            renderer.xr.getController(0),
            renderer.xr.getController(1),
            renderer.xr.getControllerGrip(0),
            renderer.xr.getControllerGrip(1),
          ];
          objs.forEach((o) => {
            if (!o) return;
            if (o.parent) o.parent.remove(o);
            target.add(o);
          });
        }
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
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
      <video ref={videoRef} loop muted playsInline style={{ display: "none" }}>
        <source src="/videos/MaryOculus.webm" />
        <source src="/videos/MaryOculus.mp4" />
      </video>
    </>
  );
}
