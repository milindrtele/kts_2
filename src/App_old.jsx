import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { InteractiveGroup } from "three/addons/interactive/InteractiveGroup.js";

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

  // VR controllers
  const controller1HomeRef = useRef(null);
  const controller1VideoRef = useRef(null);
  const controller2HomeRef = useRef(null);
  const controller2VideoRef = useRef(null);

  const controllerGrip1HomeRef = useRef(null);
  const controllerGrip2HomeRef = useRef(null);
  const controllerGrip1VideoRef = useRef(null);
  const controllerGrip2VideoRef = useRef(null);

  // const interactionGroupRef = useRef(null);
  const interactionGroupHomeRef = useRef(null);
  const interactionGroupVideoRef = useRef(null);

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

    // make box interactive
    box.userData.interactive = true;
    box.name = "homeBox";

    // ambient light
    const light = new THREE.AmbientLight(0x404040); // soft white light
    homeScene.add(light);

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

    // ambient light
    const light2 = new THREE.AmbientLight(0x404040); // soft white light
    videoScene.add(light2);

    // ---------------------------------------------------
    // XR CONTROLLERS (RAYCAST + MODELS + INTERACTION)
    // ---------------------------------------------------
    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);

    controller1HomeRef.current = controller1;
    controller2HomeRef.current = controller2;
    controller1VideoRef.current = controller1.clone();
    controller2VideoRef.current = controller2.clone();

    const rayGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5),
    ]);

    // controller1.add(new THREE.Line(rayGeom));
    // controller2.add(new THREE.Line(rayGeom));

    controller1HomeRef.current.add(new THREE.Line(rayGeom));
    controller2HomeRef.current.add(new THREE.Line(rayGeom));
    controller1VideoRef.current.add(new THREE.Line(rayGeom));
    controller2VideoRef.current.add(new THREE.Line(rayGeom));

    homeScene.add(controller1HomeRef.current);
    homeScene.add(controller1HomeRef.current);
    videoScene.add(controller1VideoRef.current);
    videoScene.add(controller2VideoRef.current);

    // Controller grips (visible VR controller models)
    const controllerModelFactory = new XRControllerModelFactory();

    const grip1Home = renderer.xr.getControllerGrip(0);
    grip1Home.add(controllerModelFactory.createControllerModel(grip1Home));
    const grip1Video = renderer.xr.getControllerGrip(0);
    grip1Video.add(controllerModelFactory.createControllerModel(grip1Video));
    homeScene.add(grip1Home);
    videoScene.add(grip1Video);
    controllerGrip1HomeRef.current = grip1Home;
    controllerGrip1VideoRef.current = grip1Video;

    const grip2Home = renderer.xr.getControllerGrip(1);
    grip2Home.add(controllerModelFactory.createControllerModel(grip2Home));
    const grip2Video = renderer.xr.getControllerGrip(1);
    grip2Video.add(controllerModelFactory.createControllerModel(grip2Video));
    homeScene.add(grip2Home);
    videoScene.add(grip2Video);
    controllerGrip2HomeRef.current = grip2Home;
    controllerGrip2VideoRef.current = grip2Video;

    // ---------------------------------------------------
    // INTERACTION GROUP (handles clicks)
    // ---------------------------------------------------
    interactionGroupHomeRef.current = new InteractiveGroup(renderer, camera);
    interactionGroupVideoRef.current = new InteractiveGroup(renderer, camera);

    homeScene.add(interactionGroupHomeRef.current);
    videoScene.add(interactionGroupVideoRef.current);

    // Add interactive objects to the group
    interactionGroupHomeRef.current.add(box);
    interactionGroupVideoRef.current.add(mesh1);
    interactionGroupVideoRef.current.add(mesh2);

    function onSelectStart() {
      const target = this.userData?.currentHovered;
      if (!target) return;

      console.log("Clicked:", target.name);

      // Example: switch scene when box is clicked
      if (target.name === "homeBox") {
        activeSceneRef.current = "video";
      }
    }
    controller1.addEventListener("selectstart", onSelectStart);
    controller2.addEventListener("selectstart", onSelectStart);

    // --------------------------------
    // XR RENDER LOOP (does NOT rerun setup)
    // --------------------------------
    rendererRef.current.setAnimationLoop(() => {
      const scene = activeSceneRef.current === "home" ? homeScene : videoScene;

      if (scene === "home") {
        updateControllerIntersections(controller1HomeRef.current, scene);
        updateControllerIntersections(controller2HomeRef.current, scene);
      }
      if (scene !== "home") {
        updateControllerIntersections(controller2VideoRef.current, scene);
        updateControllerIntersections(controller2VideoRef.current, scene);
      }

      // rendererRef.current.render(scene, camera);

      if (activeSceneRef.current === "home") {
        rendererRef.current.render(homeScene, camera);
      } else {
        rendererRef.current.render(videoScene, camera);
      }
    });
  };

  function updateControllerIntersections(controller, scene) {
    if (!controller) return;

    const tempMatrix = new THREE.Matrix4();
    const raycaster = new THREE.Raycaster();

    tempMatrix.identity().extractRotation(controller.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      controller.userData.currentHovered = obj;
    } else {
      controller.userData.currentHovered = null;
    }
  }

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
