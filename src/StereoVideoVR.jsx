import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

export default function StereoVideoVR() {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // UI states
  const [stereoMode, setStereoMode] = useState("SBS"); // SBS | TB | MONO
  const [is180, setIs180] = useState(false);

  // store geometry refs
  const leftGeo = useRef(null);
  const rightGeo = useRef(null);

  // -----------------------------
  // DYNAMIC UV MAPPING FUNCTION
  // -----------------------------
  function applyStereoUV(geometry, mode, eye, is180 = false) {
    const uv = geometry.attributes.uv;
    const uvs = uv.array;

    for (let i = 0; i < uvs.length; i += 2) {
      let u = uvs[i];
      let v = uvs[i + 1];

      // 180° mode reduces FoV horizontally
      if (is180) {
        u *= 2.0;
        if (u > 1) u = 1;
      }

      // Stereo formats
      if (mode === "SBS") {
        u *= 0.5;
        if (eye === "RIGHT") u += 0.5;
      } else if (mode === "TB") {
        v *= 0.5;
        if (eye === "RIGHT") v += 0.5;
      }

      // Mono = no UV slicing

      uvs[i] = u;
      uvs[i + 1] = v;
    }

    uv.needsUpdate = true;
  }

  // Update UV mapping when mode changes
  useEffect(() => {
    if (leftGeo.current && rightGeo.current) {
      applyStereoUV(leftGeo.current, stereoMode, "LEFT", is180);
      applyStereoUV(rightGeo.current, stereoMode, "RIGHT", is180);
    }
  }, [stereoMode, is180]);

  useEffect(() => {
    let camera, scene, renderer;

    const container = containerRef.current;
    const video = videoRef.current;

    if (!container || !video) return;

    function init() {
      container.addEventListener("click", () => video.play());

      // CAMERA
      camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        1,
        2000
      );
      camera.layers.enable(1);

      // VIDEO TEXTURE
      video.play();
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;

      // SCENE
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x101010);

      // LEFT SPHERE
      const geoLeft = new THREE.SphereGeometry(500, 60, 40);
      geoLeft.scale(-1, 1, 1);
      leftGeo.current = geoLeft; // save ref

      applyStereoUV(geoLeft, stereoMode, "LEFT", is180);

      const mesh1 = new THREE.Mesh(
        geoLeft,
        new THREE.MeshBasicMaterial({ map: texture })
      );
      mesh1.rotation.y = -Math.PI / 2;
      mesh1.layers.set(1);
      scene.add(mesh1);

      // RIGHT SPHERE
      const geoRight = new THREE.SphereGeometry(500, 60, 40);
      geoRight.scale(-1, 1, 1);
      rightGeo.current = geoRight;

      applyStereoUV(geoRight, stereoMode, "RIGHT", is180);

      const mesh2 = new THREE.Mesh(
        geoRight,
        new THREE.MeshBasicMaterial({ map: texture })
      );
      mesh2.rotation.y = -Math.PI / 2;
      mesh2.layers.set(2);
      scene.add(mesh2);

      // RENDERER
      renderer = new THREE.WebGLRenderer();
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setAnimationLoop(animate);
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType("local");

      container.appendChild(renderer.domElement);
      document.body.appendChild(VRButton.createButton(renderer));

      window.addEventListener("resize", onWindowResize);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      renderer.render(scene, camera);
    }

    init();

    return () => {
      window.removeEventListener("resize", onWindowResize);
      renderer?.dispose();
    };
  }, []);

  return (
    <>
      <div style={{ position: "absolute", zIndex: 10, padding: 10 }}>
        <button onClick={() => setStereoMode("SBS")}>Side-by-Side</button>
        <button onClick={() => setStereoMode("TB")}>Top-Bottom</button>
        <button onClick={() => setStereoMode("MONO")}>Mono</button>
        <button onClick={() => setIs180((v) => !v)}>
          Toggle {is180 ? "360°" : "180°"}
        </button>
      </div>

      <div
        ref={containerRef}
        style={{ width: "100%", height: "100vh" }}
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
