import { useEffect, useRef } from "react";
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import ThreeMeshUI from "three-mesh-ui";

export default function VR_UI() {
  const mountRef = useRef();

  useEffect(() => {
    // ------------------------------
    // BASIC SETUP
    // ------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.xr.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // ------------------------------
    // LIGHT
    // ------------------------------
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

    // ------------------------------
    // UI PANEL
    // ------------------------------
    const container = new ThreeMeshUI.Block({
      width: 1.2,
      height: 0.6,
      padding: 0.05,
      fontSize: 0.07,
      backgroundColor: new THREE.Color(0x111111),
      borderRadius: 0.06,
    });

    container.position.set(0, 1.5, -2);
    scene.add(container);

    // ---------- BUTTON ----------
    const button = new ThreeMeshUI.Block({
      width: 0.4,
      height: 0.13,
      backgroundColor: new THREE.Color("royalblue"),
      hover: { backgroundColor: new THREE.Color("skyblue") },
      active: { backgroundColor: new THREE.Color("white") },
      borderRadius: 0.05,
      justifyContent: "center",
    });

    const buttonText = new ThreeMeshUI.Text({ content: "Click me" });
    button.add(buttonText);

    // ---------- SLIDER ----------
    const sliderTrack = new ThreeMeshUI.Block({
      width: 0.7,
      height: 0.06,
      backgroundColor: new THREE.Color(0x333333),
      borderRadius: 0.03,
    });

    const sliderThumb = new ThreeMeshUI.Block({
      width: 0.07,
      height: 0.07,
      backgroundColor: new THREE.Color("white"),
      borderRadius: 0.035,
    });

    sliderTrack.add(sliderThumb);

    container.add(
      new ThreeMeshUI.Text({ content: "VR Panel" }),
      button,
      sliderTrack
    );

    let sliderValue = 0.0;
    sliderThumb.position.x = sliderValue * 0.7 - 0.35;

    // ------------------------------
    // VR CONTROLLERS + LASER
    // ------------------------------
    const controllerModelFactory = new XRControllerModelFactory();

    const controllers = [];
    const lasers = [];

    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      scene.add(controller);

      const controllerGrip = renderer.xr.getControllerGrip(i);
      controllerGrip.add(
        controllerModelFactory.createControllerModel(controllerGrip)
      );
      scene.add(controllerGrip);

      // Laser beam
      const laserGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1),
      ]);
      const laser = new THREE.Line(
        laserGeometry,
        new THREE.LineBasicMaterial({ color: 0xffffff })
      );
      laser.scale.z = 5;
      controller.add(laser);

      controllers.push(controller);
      lasers.push(laser);
    }

    // ------------------------------
    // RAYCAST SETUP
    // ------------------------------
    const raycaster = new THREE.Raycaster();
    const workingMatrix = new THREE.Matrix4();

    const uiObjects = [button, sliderTrack, sliderThumb];

    let draggingSlider = false;

    // ------------------------------
    // CONTROLLER EVENTS
    // ------------------------------
    controllers.forEach((controller) => {
      controller.addEventListener("selectstart", (e) => {
        
        const hit = getControllerHit(e.target);

        if (!hit) return;

        const object = hit.object;

        // BUTTON CLICK
        if (object === button) {
          console.log("BUTTON PRESS");
        }

        // SLIDER DRAG START
        if (object === sliderTrack || object === sliderThumb) {
          draggingSlider = true;
        }
      });

      controller.addEventListener("selectend", () => {
        draggingSlider = false;
      });
    });

    // ------------------------------
    // HIT TEST FUNCTION
    // ------------------------------
    function getControllerHit(controller) {
      workingMatrix.identity().extractRotation(controller.matrixWorld);

      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(workingMatrix);

      const hits = raycaster.intersectObjects(uiObjects, true);
      return hits[0];
    }

    // ------------------------------
    // ANIMATION LOOP
    // ------------------------------
    renderer.setAnimationLoop(() => {
      ThreeMeshUI.update();

      // Update controllers + lasers
      controllers.forEach((controller, i) => {
        const laser = lasers[i];
        const hit = getControllerHit(controller);

        // Adjust laser length based on hit
        if (hit) {
          laser.scale.z = hit.distance;

          // Hover effect
          if (hit.object === button) {
            button.setState("hover");
          } else {
            button.setState("idle");
          }

          // Dragging slider
          if (draggingSlider && hit.object.parent === sliderTrack) {
            const localPoint = sliderTrack.worldToLocal(hit.point);
            sliderValue =
              THREE.MathUtils.clamp((localPoint.x + 0.35) / 0.7, 0, 1);
            sliderThumb.position.x = sliderValue * 0.7 - 0.35;
          }
        } else {
          laser.scale.z = 5;
        //   button.setState("idle");
        }
      });

      renderer.render(scene, camera);
    });

    // ------------------------------
    // CLEANUP
    // ------------------------------
    return () => {
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100vh" }} />;
}
