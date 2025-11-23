// scenes/VideoScene.js
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { InteractiveGroup } from "three/addons/interactive/InteractiveGroup.js";

export class VideoScene {
  constructor(renderer, camera, videoElement, applyStereoUV, stereoMode, is180) {
    this.renderer = renderer;
    this.camera = camera;
    this.video = videoElement;
    this.applyStereoUV = applyStereoUV;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101010);

    this._createVideoTexture();
    this._createSpheres(stereoMode, is180);
    this._setupControllers();
    this._setupInteractionGroup();
    this._createLights();
  }

  _createVideoTexture() {
    this.video.play();
    this.texture = new THREE.VideoTexture(this.video);
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  _createLights() {
    const light = new THREE.AmbientLight(0x404040);
    this.scene.add(light);
  }

  _createSpheres(stereoMode, is180) {
    this.leftGeo = new THREE.SphereGeometry(500, 60, 40);
    this.leftGeo.scale(-1, 1, 1);
    this.leftGeo.userData.originalUV =
      this.leftGeo.attributes.uv.array.slice();

    this.applyStereoUV(this.leftGeo, stereoMode, "LEFT", is180);

    this.leftSphere = new THREE.Mesh(
      this.leftGeo,
      new THREE.MeshBasicMaterial({ map: this.texture })
    );
    this.leftSphere.rotation.y = -Math.PI / 2;
    this.leftSphere.layers.set(1);

    this.rightGeo = new THREE.SphereGeometry(500, 60, 40);
    this.rightGeo.scale(-1, 1, 1);
    this.rightGeo.userData.originalUV =
      this.rightGeo.attributes.uv.array.slice();

    this.applyStereoUV(this.rightGeo, stereoMode, "RIGHT", is180);

    this.rightSphere = new THREE.Mesh(
      this.rightGeo,
      new THREE.MeshBasicMaterial({ map: this.texture })
    );
    this.rightSphere.rotation.y = -Math.PI / 2;
    this.rightSphere.layers.set(2);

    this.scene.add(this.leftSphere);
    this.scene.add(this.rightSphere);
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

    // Grips
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

    this.interactionGroup.add(this.leftSphere);
    this.interactionGroup.add(this.rightSphere);

    this.scene.add(this.interactionGroup);
  }
}
