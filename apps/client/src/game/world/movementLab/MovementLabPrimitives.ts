import { Entity, type StandardMaterial, Vec3 } from "playcanvas";

export type Position = readonly [x: number, y: number, z: number];
export type Scale = readonly [x: number, y: number, z: number];

export function createGroundLabel(
  parent: Entity,
  text: string,
  position: Position,
  scale: Scale,
  material: StandardMaterial,
): Entity {
  const label = new Entity(`${text} Label`);
  label.setLocalPosition(...position);
  label.setLocalScale(...scale);
  label.addComponent("render", { type: "plane" });
  label.render!.material = material;
  label.render!.castShadows = false;
  label.render!.receiveShadows = false;
  parent.addChild(label);
  return label;
}

export function createStaticBox(
  parent: Entity,
  name: string,
  position: Position,
  scale: Scale,
  material: StandardMaterial,
): Entity {
  const box = createVisualBox(parent, name, position, scale, material);
  box.addComponent("collision", {
    type: "box",
    halfExtents: new Vec3(scale[0] / 2, scale[1] / 2, scale[2] / 2),
  });
  box.addComponent("rigidbody", {
    type: "static",
    friction: 0.8,
    restitution: 0,
  });
  return box;
}

export function createVisualBox(
  parent: Entity,
  name: string,
  position: Position,
  scale: Scale,
  material: StandardMaterial,
): Entity {
  const box = new Entity(name);
  box.setLocalPosition(...position);
  box.setLocalScale(...scale);
  box.addComponent("render", { type: "box" });
  box.render!.material = material;
  parent.addChild(box);
  return box;
}
