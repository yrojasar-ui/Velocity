import {
  ADDRESS_CLAMP_TO_EDGE,
  AppBase,
  Color,
  Entity,
  StandardMaterial,
  Texture,
  Vec2,
  Vec3,
} from "playcanvas";

const FLOOR_WIDTH_METERS = 48;
const FLOOR_DEPTH_METERS = 40;
const MARKER_HEIGHT_METERS = 0.025;
const MOVEMENT_LAB_SPAWN = new Vec3(0, 2, 16);

const DISTANCE_LANE_X = -16;
const DISTANCE_LANE_START_Z = 15;
const DISTANCE_LANE_LENGTH_METERS = 20;
const DISTANCE_LANE_MARKERS_METERS = [1, 2, 3, 5, 10, 15, 20] as const;

const VERTICAL_TEST_HEIGHTS_METERS = [0.5, 0.75, 1, 1.25, 1.5] as const;
const HORIZONTAL_TEST_MARKERS_METERS = [1, 2, 3, 4, 5] as const;

type Position = readonly [x: number, y: number, z: number];
type Scale = readonly [x: number, y: number, z: number];

interface MovementLabMaterials {
  readonly floor: StandardMaterial;
  readonly wall: StandardMaterial;
  readonly distanceLane: StandardMaterial;
  readonly distanceMarker: StandardMaterial;
  readonly verticalReferences: readonly StandardMaterial[];
  readonly unreachableReference: StandardMaterial;
  readonly horizontalLane: StandardMaterial;
  readonly horizontalMarker: StandardMaterial;
  readonly parkour: StandardMaterial;
  readonly spawn: StandardMaterial;
  readonly labels: Map<string, StandardMaterial>;
}

export interface MovementLab {
  readonly root: Entity;
  readonly spawnPosition: Readonly<Vec3>;
}

export function createMovementLab(application: AppBase): MovementLab {
  const lab = new Entity("Movement Lab");
  const materials = createMaterials(application);
  application.root.addChild(lab);

  createStaticBox(
    lab,
    "Floor — 1 m Grid",
    [0, -0.5, 0],
    [FLOOR_WIDTH_METERS, 1, FLOOR_DEPTH_METERS],
    materials.floor,
  );
  createBoundaryWalls(lab, materials.wall);
  createSpawnReference(application, lab, materials);
  createDistanceLane(application, lab, materials);
  createVerticalJumpTest(application, lab, materials);
  createHorizontalJumpTest(application, lab, materials);
  createParkourLine(application, lab, materials);

  return { root: lab, spawnPosition: MOVEMENT_LAB_SPAWN };
}

function createBoundaryWalls(lab: Entity, material: StandardMaterial): void {
  const halfWidth = FLOOR_WIDTH_METERS / 2;
  const halfDepth = FLOOR_DEPTH_METERS / 2;

  createStaticBox(
    lab,
    "North Wall",
    [0, 2, -halfDepth],
    [FLOOR_WIDTH_METERS, 4, 1],
    material,
  );
  createStaticBox(
    lab,
    "South Wall",
    [0, 2, halfDepth],
    [FLOOR_WIDTH_METERS, 4, 1],
    material,
  );
  createStaticBox(
    lab,
    "East Wall",
    [halfWidth, 2, 0],
    [1, 4, FLOOR_DEPTH_METERS],
    material,
  );
  createStaticBox(
    lab,
    "West Wall",
    [-halfWidth, 2, 0],
    [1, 4, FLOOR_DEPTH_METERS],
    material,
  );
}

function createSpawnReference(
  application: AppBase,
  lab: Entity,
  materials: MovementLabMaterials,
): void {
  createVisualBox(
    lab,
    "QA Spawn Marker",
    [MOVEMENT_LAB_SPAWN.x, MARKER_HEIGHT_METERS / 2, MOVEMENT_LAB_SPAWN.z],
    [2, MARKER_HEIGHT_METERS, 2],
    materials.spawn,
  );
  createGroundLabel(
    application,
    lab,
    materials.labels,
    "SPAWN",
    [MOVEMENT_LAB_SPAWN.x, 0.04, MOVEMENT_LAB_SPAWN.z + 1.4],
    [2.2, 1, 0.65],
  );
}

function createDistanceLane(
  application: AppBase,
  lab: Entity,
  materials: MovementLabMaterials,
): void {
  const laneCenterZ = DISTANCE_LANE_START_Z - DISTANCE_LANE_LENGTH_METERS / 2;

  for (const sideOffset of [-1.5, 1.5]) {
    createVisualBox(
      lab,
      `Distance Lane Border ${sideOffset < 0 ? "West" : "East"}`,
      [DISTANCE_LANE_X + sideOffset, MARKER_HEIGHT_METERS / 2, laneCenterZ],
      [0.1, MARKER_HEIGHT_METERS, DISTANCE_LANE_LENGTH_METERS],
      materials.distanceLane,
    );
  }

  createGroundLabel(
    application,
    lab,
    materials.labels,
    "20 M LANE",
    [DISTANCE_LANE_X, 0.04, DISTANCE_LANE_START_Z + 1.2],
    [3, 1, 0.7],
  );

  for (const distance of DISTANCE_LANE_MARKERS_METERS) {
    const markerZ = DISTANCE_LANE_START_Z - distance;
    createVisualBox(
      lab,
      `Distance Lane ${distance} m Marker`,
      [DISTANCE_LANE_X, MARKER_HEIGHT_METERS / 2, markerZ],
      [3, MARKER_HEIGHT_METERS, 0.1],
      distance === DISTANCE_LANE_LENGTH_METERS
        ? materials.distanceLane
        : materials.distanceMarker,
    );
    createGroundLabel(
      application,
      lab,
      materials.labels,
      `${distance} m`,
      [DISTANCE_LANE_X - 2.25, 0.04, markerZ],
      [1.2, 1, 0.55],
    );
  }
}

function createVerticalJumpTest(
  application: AppBase,
  lab: Entity,
  materials: MovementLabMaterials,
): void {
  const startX = -10;
  const spacingX = 1.9;
  const obstacleZ = -11;

  createGroundLabel(
    application,
    lab,
    materials.labels,
    "VERTICAL JUMP",
    [-5.25, 0.04, -8.9],
    [4, 1, 0.7],
  );

  VERTICAL_TEST_HEIGHTS_METERS.forEach((height, index) => {
    const x = startX + index * spacingX;
    const material = materials.verticalReferences[index];
    if (material === undefined) {
      throw new Error("Movement Lab vertical reference material is missing.");
    }

    createStaticBox(
      lab,
      `Vertical Reference ${height.toFixed(2)} m`,
      [x, height / 2, obstacleZ],
      [1.35, height, 1.35],
      material,
    );
    createGroundLabel(
      application,
      lab,
      materials.labels,
      `${height.toFixed(2)} m`,
      [x, 0.04, obstacleZ + 1.25],
      [1.45, 1, 0.55],
    );
  });

  const unreachableHeight = 2;
  const unreachableX = startX + VERTICAL_TEST_HEIGHTS_METERS.length * spacingX;
  createStaticBox(
    lab,
    "Vertical Reference 2.00 m — Unreachable",
    [unreachableX, unreachableHeight / 2, obstacleZ],
    [1.35, unreachableHeight, 1.35],
    materials.unreachableReference,
  );
  createGroundLabel(
    application,
    lab,
    materials.labels,
    "2.00 m X",
    [unreachableX, 0.04, obstacleZ + 1.25],
    [1.45, 1, 0.55],
  );
}

function createHorizontalJumpTest(
  application: AppBase,
  lab: Entity,
  materials: MovementLabMaterials,
): void {
  const laneX = 6;
  const startZ = 14;
  const length = 6;
  const centerZ = startZ - length / 2;

  for (const sideOffset of [-1.5, 1.5]) {
    createVisualBox(
      lab,
      `Horizontal Jump Border ${sideOffset < 0 ? "West" : "East"}`,
      [laneX + sideOffset, MARKER_HEIGHT_METERS / 2, centerZ],
      [0.1, MARKER_HEIGHT_METERS, length],
      materials.horizontalLane,
    );
  }

  createVisualBox(
    lab,
    "Horizontal Jump Takeoff",
    [laneX, MARKER_HEIGHT_METERS / 2, startZ],
    [3, MARKER_HEIGHT_METERS, 0.16],
    materials.horizontalLane,
  );
  createGroundLabel(
    application,
    lab,
    materials.labels,
    "JUMP RANGE",
    [laneX, 0.04, startZ + 1.2],
    [3, 1, 0.7],
  );

  for (const distance of HORIZONTAL_TEST_MARKERS_METERS) {
    const markerZ = startZ - distance;
    createVisualBox(
      lab,
      `Horizontal Jump ${distance} m Marker`,
      [laneX, MARKER_HEIGHT_METERS / 2, markerZ],
      [3, MARKER_HEIGHT_METERS, 0.1],
      materials.horizontalMarker,
    );
    createGroundLabel(
      application,
      lab,
      materials.labels,
      `${distance} m`,
      [laneX + 2.25, 0.04, markerZ],
      [1.2, 1, 0.55],
    );
  }
}

function createParkourLine(
  application: AppBase,
  lab: Entity,
  materials: MovementLabMaterials,
): void {
  const parkourX = 16;

  createGroundLabel(
    application,
    lab,
    materials.labels,
    "M0 PARKOUR",
    [parkourX, 0.04, 16.2],
    [3, 1, 0.7],
  );
  createVisualBox(
    lab,
    "Parkour Start",
    [parkourX, MARKER_HEIGHT_METERS / 2, 14],
    [3, MARKER_HEIGHT_METERS, 0.16],
    materials.parkour,
  );

  createStaticBox(
    lab,
    "Parkour Timing Hurdle",
    [parkourX, 0.25, 11.5],
    [3, 0.5, 0.4],
    materials.parkour,
  );
  createStaticBox(
    lab,
    "Parkour Landing 0.50 m",
    [parkourX, 0.25, 8.5],
    [3, 0.5, 2],
    materials.parkour,
  );
  createStaticBox(
    lab,
    "Parkour Landing 0.75 m",
    [parkourX, 0.375, 5.5],
    [3, 0.75, 2],
    materials.parkour,
  );
  createStaticBox(
    lab,
    "Parkour Landing 1.00 m",
    [parkourX, 0.5, 2],
    [3, 1, 2],
    materials.parkour,
  );
  createStaticBox(
    lab,
    "Parkour Landing Drop",
    [parkourX, 0.25, -1.5],
    [3, 0.5, 2],
    materials.parkour,
  );
}

function createMaterials(application: AppBase): MovementLabMaterials {
  return {
    floor: createGridMaterial(application),
    wall: createSolidMaterial("Walls", new Color(0.34, 0.38, 0.44)),
    distanceLane: createSolidMaterial(
      "Distance Lane",
      new Color(0.12, 0.45, 0.72),
    ),
    distanceMarker: createSolidMaterial(
      "Distance Markers",
      new Color(0.46, 0.7, 0.88),
    ),
    verticalReferences: [
      new Color(0.88, 0.64, 0.18),
      new Color(0.9, 0.53, 0.14),
      new Color(0.9, 0.43, 0.12),
      new Color(0.82, 0.34, 0.12),
      new Color(0.72, 0.27, 0.12),
    ].map((color, index) =>
      createSolidMaterial(`Vertical Reference ${index + 1}`, color),
    ),
    unreachableReference: createSolidMaterial(
      "Unreachable Reference",
      new Color(0.68, 0.16, 0.18),
    ),
    horizontalLane: createSolidMaterial(
      "Horizontal Lane",
      new Color(0.08, 0.55, 0.52),
    ),
    horizontalMarker: createSolidMaterial(
      "Horizontal Markers",
      new Color(0.38, 0.82, 0.75),
    ),
    parkour: createSolidMaterial("M0 Parkour", new Color(0.52, 0.3, 0.68)),
    spawn: createSolidMaterial("QA Spawn", new Color(0.3, 0.65, 0.34)),
    labels: new Map<string, StandardMaterial>(),
  };
}

function createGridMaterial(application: AppBase): StandardMaterial {
  const textureSize = 64;
  const source = document.createElement("canvas");
  source.width = textureSize;
  source.height = textureSize;
  const context = source.getContext("2d");

  if (context === null) {
    throw new Error("Movement Lab could not create its procedural grid.");
  }

  context.fillStyle = "#68727c";
  context.fillRect(0, 0, textureSize, textureSize);
  context.fillStyle = "#424b55";
  context.fillRect(0, 0, 2, textureSize);
  context.fillRect(0, 0, textureSize, 2);

  const texture = new Texture(application.graphicsDevice, {
    name: "Movement Lab 1 m Grid",
    width: textureSize,
    height: textureSize,
    mipmaps: true,
  });
  texture.setSource(source);

  const material = new StandardMaterial();
  material.name = "Movement Lab Floor Grid";
  material.diffuse = new Color(1, 1, 1);
  material.diffuseMap = texture;
  material.diffuseMapTiling = new Vec2(FLOOR_WIDTH_METERS, FLOOR_DEPTH_METERS);
  material.specular = new Color(0, 0, 0);
  material.gloss = 0;
  material.update();
  return material;
}

function createSolidMaterial(name: string, color: Color): StandardMaterial {
  const material = new StandardMaterial();
  material.name = name;
  material.diffuse = color;
  material.emissive = new Color(color.r * 0.08, color.g * 0.08, color.b * 0.08);
  material.specular = new Color(0.05, 0.05, 0.05);
  material.gloss = 0.15;
  material.update();
  return material;
}

function createGroundLabel(
  application: AppBase,
  parent: Entity,
  materials: Map<string, StandardMaterial>,
  text: string,
  position: Position,
  scale: Scale,
): Entity {
  let material = materials.get(text);
  if (material === undefined) {
    material = createLabelMaterial(application, text);
    materials.set(text, material);
  }

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

function createLabelMaterial(
  application: AppBase,
  text: string,
): StandardMaterial {
  const width = 256;
  const height = 128;
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const context = source.getContext("2d");

  if (context === null) {
    throw new Error("Movement Lab could not create a marker label.");
  }

  context.fillStyle = "#17212b";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#aab8c5";
  context.lineWidth = 6;
  context.strokeRect(3, 3, width - 6, height - 6);
  context.fillStyle = "#f2f6fa";
  context.font = "700 42px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, width / 2, height / 2, width - 20);

  const texture = new Texture(application.graphicsDevice, {
    name: `${text} Label`,
    width,
    height,
    addressU: ADDRESS_CLAMP_TO_EDGE,
    addressV: ADDRESS_CLAMP_TO_EDGE,
    mipmaps: true,
  });
  texture.setSource(source);

  const material = new StandardMaterial();
  material.name = `${text} Label`;
  material.diffuse = new Color(1, 1, 1);
  material.diffuseMap = texture;
  material.emissive = new Color(0.3, 0.3, 0.3);
  material.emissiveMap = texture;
  material.specular = new Color(0, 0, 0);
  material.useLighting = false;
  material.update();
  return material;
}

function createStaticBox(
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

function createVisualBox(
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
