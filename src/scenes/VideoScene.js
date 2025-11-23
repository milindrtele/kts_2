// scenes/VideoScene.js
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { InteractiveGroup } from "three/addons/interactive/InteractiveGroup.js";

export class VideoScene {
  // optional onSelect callback: function(selectedObject) { ... }
  constructor(
    renderer,
    camera,
    videoElement,
    applyStereoUV,
    stereoMode,
    is180,
    onSelect
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.video = videoElement;
    this.applyStereoUV = applyStereoUV;
    this.onSelect = onSelect;

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
    light.intensity = 8;
    this.scene.add(light);
  }

  _createSpheres(stereoMode, is180) {
    this.leftGeo = new THREE.SphereGeometry(500, 60, 40);
    this.leftGeo.scale(-1, 1, 1);
    this.leftGeo.userData.originalUV = this.leftGeo.attributes.uv.array.slice();

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
    const factory = new XRControllerModelFactory();

    this.grip1 = this.renderer.xr.getControllerGrip(0);
    this.grip1.add(factory.createControllerModel(this.grip1));

    this.grip2 = this.renderer.xr.getControllerGrip(1);
    this.grip2.add(factory.createControllerModel(this.grip2));

    this.scene.add(this.grip1);
    this.scene.add(this.grip2);

    // Controller event handlers for in-scene interactions
    // Define handlers but don't attach yet. App will enable/disable handlers
    // when controllers are moved between scenes so only the active scene
    // receives input events.
    this._onSelectStart = function (e) {
      const controller = e.target || e.currentTarget || this;
      const hovered = controller?.userData?.currentHovered;
      console.log(controller);
      if (!hovered) return;
      if (typeof this.onSelect === "function") {
        this.onSelect(hovered);
        return;
      }
      if (hovered === this.leftSphere) {
        console.log("Selected LEFT sphere");
      } else if (hovered === this.rightSphere) {
        console.log("Selected RIGHT sphere");
      } else {
        console.log("Selected:", hovered.name || hovered);
      }
    };

    this._onSelectEnd = () => {
      // placeholder for selectend behaviour if needed later
    };
  }

  enableControllerEvents() {
    if (this.controller1 && this._onSelectStart) {
      this.controller1.addEventListener("selectstart", this._onSelectStart);
      this.controller2.addEventListener("selectstart", this._onSelectStart);
      this.controller1.addEventListener("selectend", this._onSelectEnd);
      this.controller2.addEventListener("selectend", this._onSelectEnd);
    }
  }

  disableControllerEvents() {
    if (this.controller1 && this._onSelectStart) {
      this.controller1.removeEventListener("selectstart", this._onSelectStart);
      this.controller2.removeEventListener("selectstart", this._onSelectStart);
      this.controller1.removeEventListener("selectend", this._onSelectEnd);
      this.controller2.removeEventListener("selectend", this._onSelectEnd);
    }
  }

  _setupInteractionGroup() {
    this.interactionGroup = new InteractiveGroup(this.renderer, this.camera);

    this.interactionGroup.add(this.leftSphere);
    this.interactionGroup.add(this.rightSphere);

    this.scene.add(this.interactionGroup);
  }
}
