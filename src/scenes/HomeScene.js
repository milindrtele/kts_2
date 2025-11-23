// scenes/HomeScene.js
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { InteractiveGroup } from "three/addons/interactive/InteractiveGroup.js";

export class HomeScene {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    this._createLights();
    this._createObjects();
    this._setupControllers();
    this._setupInteractionGroup();
  }

  _createLights() {
    const light = new THREE.AmbientLight(0x404040);
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

    this.scene.add(this.box);
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

    // Grips (controller models)
    const factory =
      new XRControllerModelFactory();

    this.grip1 = this.renderer.xr.getControllerGrip(0);
    this.grip1.add(factory.createControllerModel(this.grip1));

    this.grip2 = this.renderer.xr.getControllerGrip(1);
    this.grip2.add(factory.createControllerModel(this.grip2));

    this.scene.add(this.grip1);
    this.scene.add(this.grip2);
  }

  _setupInteractionGroup() {
    this.interactionGroup = new InteractiveGroup(
      this.renderer,
      this.camera
    );

    this.interactionGroup.add(this.box);
    this.scene.add(this.interactionGroup);
  }
}
