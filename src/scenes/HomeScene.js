// scenes/HomeScene.js
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { InteractiveGroup } from "three/addons/interactive/InteractiveGroup.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { HTMLMesh } from "three/addons/interactive/HTMLMesh.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

export class HomeScene {
  // accept an optional onSelectHome callback that's called when the home box is selected
  constructor(renderer, camera, onSelectHome) {
    this.renderer = renderer;
    this.camera = camera;
    this.onSelectHome = onSelectHome;

    this.scene = new THREE.Scene();
    new HDRLoader()
      .setPath("/hdri")
      .load("/farmland_overcast_1k.hdr", (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;

        this.scene.background = texture;
        this.scene.environment = texture;
      });

    this.raycaster = new THREE.Raycaster();

    this.interactiveGroup = new THREE.Group();
    this.intersected = [];
    this.tempMatrix = new THREE.Matrix4();

    this._createLights();
    this._createObjects();
    this._setupControllers();
    this._setupInteractionGroup();
    this._getIntersections = this._getIntersections.bind(this);
    this._onSelectStart = this._onSelectStart.bind(this);
  }

  _createLights() {
    const light = new THREE.AmbientLight(0x404040);
    light.intensity = 8;
    this.scene.add(light);
  }

  _onChange() {
    console.log("Changed");
  }

  _createObjects() {
    this.box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: "white" })
    );
    this.box.position.y = 1;
    this.box.position.z = -3;
    this.box.name = "homeBox";
    this.box.userData.interactive = true;

    this.interactiveGroup.add(this.box);

    this.scene.add(this.interactiveGroup);

    const parameters = {
      radius: 0.6,
      tube: 0.2,
      tubularSegments: 150,
      radialSegments: 20,
      p: 2,
      q: 3,
      thickness: 0.5,
    };

    this.gui = new GUI({ width: 300 });
    this.gui.add(parameters, "radius", 0.0, 1.0).onChange(this._onChange);
    this.gui.add(parameters, "tube", 0.0, 1.0).onChange(this._onChange);
    this.gui
      .add(parameters, "tubularSegments", 10, 150, 1)
      .onChange(this._onChange);
    this.gui
      .add(parameters, "radialSegments", 2, 20, 1)
      .onChange(this._onChange);
    this.gui.add(parameters, "p", 1, 10, 1).onChange(this._onChange);
    this.gui.add(parameters, "q", 0, 10, 1).onChange(this._onChange);
    this.gui.domElement.style.visibility = "hidden";

    //

    this.UImesh = new HTMLMesh(this.gui.domElement);
    this.UImesh.position.x = -0.75;
    this.UImesh.position.y = 1.5;
    this.UImesh.position.z = -0.5;
    this.UImesh.rotation.y = Math.PI / 4;
    this.UImesh.scale.setScalar(2);

    // UI from blender

    const loader = new GLTFLoader();
    loader.load("/models/home_ui.glb", (gltf) => {
      const uiPanel = gltf.scene;

      uiPanel.traverse((child) => {});

      uiPanel.position.set(0, 1.5, -2);
      this.scene.add(uiPanel);
    });
  }

  _setupControllers() {
    const rayGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5),
    ]);

    this.controller1 = this.renderer.xr.getController(0);
    this.controller2 = this.renderer.xr.getController(1);

    this.controller1.add(new THREE.Line(rayGeom));
    this.controller2.add(new THREE.Line(rayGeom));

    this.scene.add(this.controller1);
    this.scene.add(this.controller2);

    this._onSelectStart = function (e) {
      //  const controller = e.target || e.currentTarget || this;
      //  const hovered = controller?.userData?.currentHovered;
      //   console.log(controller);
      //  if (!hovered) return;
      //  if (hovered.name === "homeBox" && typeof this.onSelectHome === "function") {
      //    this.onSelectHome();
      //  }

      const controller = e.target;

      const intersections = this._getIntersections(controller);

      console.log("HomeScene select start", intersections);

      if (intersections.length > 0) {
        const intersection = intersections[0];

        const object = intersection.object;
        if (
          object.name === "homeBox" &&
          typeof this.onSelectHome === "function"
        ) {
          this.onSelectHome();
        }

        controller.userData.selected = object;
      }

      controller.userData.targetRayMode = e.data.targetRayMode;
    };
    // Grips (controller models)
    const factory = new XRControllerModelFactory();

    this.grip1 = this.renderer.xr.getControllerGrip(0);
    this.grip1.add(factory.createControllerModel(this.grip1));

    this.grip2 = this.renderer.xr.getControllerGrip(1);
    this.grip2.add(factory.createControllerModel(this.grip2));

    this.scene.add(this.grip1);
    this.scene.add(this.grip2);
  }

  _getIntersections(controller) {
    controller.updateMatrixWorld();

    this.tempMatrix.identity().extractRotation(controller.matrixWorld);

    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

    console.log(this.interactiveGroup);

    return this.raycaster.intersectObjects(
      this.interactiveGroup.children,
      false
    );
  }

  enableControllerEvents() {
    if (this.controller1 && this._onSelectStart) {
      this.controller1.addEventListener("selectstart", this._onSelectStart);
      this.controller2.addEventListener("selectstart", this._onSelectStart);
    }
  }

  disableControllerEvents() {
    if (this.controller1 && this._onSelectStart) {
      this.controller1.removeEventListener("selectstart", this._onSelectStart);
      this.controller2.removeEventListener("selectstart", this._onSelectStart);
    }
  }

  _setupInteractionGroup() {
    this.interactionGroup = new InteractiveGroup();
    this.interactionGroup.listenToPointerEvents(this.renderer, this.camera);
    this.interactionGroup.listenToXRControllerEvents(this.controller1);
    this.interactionGroup.listenToXRControllerEvents(this.controller2);

    // this.interactionGroup.add(this.box);
    this.scene.add(this.interactionGroup);
    this.interactionGroup.add(this.UImesh);
  }
}
