import {
  AppBase,
  Color,
  Entity,
  Vec3,
  type RigidBodyComponent,
} from "playcanvas";

import type { MovementConfig } from "./movementConfig";

export interface PlayerRig {
  readonly root: Entity;
  readonly yawPivot: Entity;
  readonly pitchPivot: Entity;
  readonly camera: Entity;
  readonly rigidBody: RigidBodyComponent;
}

export function createPlayerRig(
  application: AppBase,
  config: Readonly<MovementConfig>,
  spawnPosition: Readonly<Vec3>,
): PlayerRig {
  const root = new Entity("Player Physics Root");
  root.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
  application.root.addChild(root);
  root.addComponent("collision", {
    type: "capsule",
    height: config.playerHeight,
    radius: config.playerRadius,
  });
  root.addComponent("rigidbody", {
    type: "dynamic",
    mass: config.playerMass,
    linearDamping: 0,
    angularDamping: 0,
    linearFactor: new Vec3(1, 1, 1),
    angularFactor: new Vec3(0, 0, 0),
    friction: config.playerFriction,
    restitution: config.playerRestitution,
  });

  const rigidBody = root.rigidbody;
  if (rigidBody === undefined) {
    throw new Error("Player rigid body component failed to initialize.");
  }

  const yawPivot = new Entity("Yaw Pivot");
  root.addChild(yawPivot);

  const pitchPivot = new Entity("Pitch Pivot");
  pitchPivot.setLocalPosition(0, config.cameraEyeHeight, 0);
  yawPivot.addChild(pitchPivot);

  const camera = new Entity("Player Camera");
  camera.addComponent("camera", {
    clearColor: new Color(0.05, 0.08, 0.12),
    fov: config.cameraFovDegrees,
    nearClip: 0.05,
    farClip: 100,
  });
  pitchPivot.addChild(camera);

  return {
    root,
    yawPivot,
    pitchPivot,
    camera,
    rigidBody,
  };
}
