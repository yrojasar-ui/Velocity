import { AppBase, Entity, Vec3 } from "playcanvas";

interface LabBoxDefinition {
  readonly name: string;
  readonly position: Readonly<Vec3>;
  readonly scale: Readonly<Vec3>;
}

const LAB_BOXES: readonly LabBoxDefinition[] = [
  { name: "Floor", position: new Vec3(0, -0.5, 0), scale: new Vec3(24, 1, 24) },
  {
    name: "North Wall",
    position: new Vec3(0, 2, -12),
    scale: new Vec3(24, 4, 1),
  },
  {
    name: "South Wall",
    position: new Vec3(0, 2, 12),
    scale: new Vec3(24, 4, 1),
  },
  {
    name: "East Wall",
    position: new Vec3(12, 2, 0),
    scale: new Vec3(1, 4, 24),
  },
  {
    name: "West Wall",
    position: new Vec3(-12, 2, 0),
    scale: new Vec3(1, 4, 24),
  },
  {
    name: "Low Platform",
    position: new Vec3(-4, 0.5, -3),
    scale: new Vec3(3, 1, 3),
  },
  {
    name: "Tall Platform",
    position: new Vec3(4, 1, -4),
    scale: new Vec3(3, 2, 3),
  },
  {
    name: "Collision Block",
    position: new Vec3(0, 1, -8),
    scale: new Vec3(4, 2, 1),
  },
];

export function createMovementLab(application: AppBase): Entity {
  const lab = new Entity("Movement Lab");
  application.root.addChild(lab);

  for (const definition of LAB_BOXES) {
    const box = new Entity(definition.name);
    box.setPosition(definition.position);
    box.setLocalScale(definition.scale);
    box.addComponent("render", { type: "box" });
    box.addComponent("collision", {
      type: "box",
      halfExtents: new Vec3(
        definition.scale.x / 2,
        definition.scale.y / 2,
        definition.scale.z / 2,
      ),
    });
    box.addComponent("rigidbody", {
      type: "static",
      friction: 0.8,
      restitution: 0,
    });
    lab.addChild(box);
  }

  return lab;
}
