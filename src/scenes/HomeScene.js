// scenes/HomeScene.js
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { InteractiveGroup } from "three/addons/interactive/InteractiveGroup.js";

export class HomeScene {
  // accept an optional onSelectHome callback that's called when the home box is selected
  constructor(renderer, camera, onSelectHome) {
    this.renderer = renderer;
    this.camera = camera;
    this.onSelectHome = onSelectHome;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

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

  _createObjects() {
    this.box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: "white" })
    );
    this.box.position.z = -3;
    this.box.name = "homeBox";
    this.box.userData.interactive = true;

    this.interactiveGroup.add(this.box);

    this.scene.add(this.interactiveGroup);
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
       if (object.name === "homeBox" && typeof this.onSelectHome === "function") {
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

    return this.raycaster.intersectObjects(this.interactiveGroup.children, false);
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
  }
}
