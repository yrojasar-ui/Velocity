import { AppBase, Entity, Vec3 } from "playcanvas";

import {
  createMovementLabLayout,
  FLOOR_DEPTH_METERS,
  FLOOR_WIDTH_METERS,
} from "./MovementLabLayout";
import { createMovementLabMaterials } from "./MovementLabMaterials";

const MOVEMENT_LAB_SPAWN = new Vec3(0, 2, 16);

export interface MovementLab {
  readonly root: Entity;
  readonly spawnPosition: Readonly<Vec3>;
}

export function createMovementLab(application: AppBase): MovementLab {
  const lab = new Entity("Movement Lab");
  const materials = createMovementLabMaterials(
    application,
    FLOOR_WIDTH_METERS,
    FLOOR_DEPTH_METERS,
  );
  application.root.addChild(lab);

  createMovementLabLayout(lab, materials, MOVEMENT_LAB_SPAWN);

  return { root: lab, spawnPosition: MOVEMENT_LAB_SPAWN };
}
