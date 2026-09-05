import { type Entity, type Vec3 } from "playcanvas";

import type { MovementLabMaterials } from "./MovementLabMaterials";
import {
  createGroundLabel,
  createStaticBox,
  createVisualBox,
} from "./MovementLabPrimitives";

export const FLOOR_WIDTH_METERS = 48;
export const FLOOR_DEPTH_METERS = 40;

const MARKER_HEIGHT_METERS = 0.025;

const DISTANCE_LANE_X = -16;
const DISTANCE_LANE_START_Z = 15;
const DISTANCE_LANE_LENGTH_METERS = 20;
const DISTANCE_LANE_MARKERS_METERS = [1, 2, 3, 5, 10, 15, 20] as const;

const VERTICAL_TEST_HEIGHTS_METERS = [0.5, 0.75, 1, 1.25, 1.5] as const;
const HORIZONTAL_TEST_MARKERS_METERS = [1, 2, 3, 4, 5] as const;

export function createMovementLabLayout(
  lab: Entity,
  materials: MovementLabMaterials,
  spawnPosition: Readonly<Vec3>,
): void {
  createStaticBox(
    lab,
    "Floor — 1 m Grid",
    [0, -0.5, 0],
    [FLOOR_WIDTH_METERS, 1, FLOOR_DEPTH_METERS],
    materials.floor,
  );
  createBoundaryWalls(lab, materials.wall);
  createSpawnReference(lab, materials, spawnPosition);
  createDistanceLane(lab, materials);
  createVerticalJumpTest(lab, materials);
  createHorizontalJumpTest(lab, materials);
  createParkourLine(lab, materials);
}

function createBoundaryWalls(
  lab: Entity,
  material: MovementLabMaterials["wall"],
): void {
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
  lab: Entity,
  materials: MovementLabMaterials,
  spawnPosition: Readonly<Vec3>,
): void {
  createVisualBox(
    lab,
    "QA Spawn Marker",
    [spawnPosition.x, MARKER_HEIGHT_METERS / 2, spawnPosition.z],
    [2, MARKER_HEIGHT_METERS, 2],
    materials.spawn,
  );
  createGroundLabel(
    lab,
    "SPAWN",
    [spawnPosition.x, 0.04, spawnPosition.z + 1.4],
    [2.2, 1, 0.65],
    materials.getLabel("SPAWN"),
  );
}

function createDistanceLane(
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
    lab,
    "20 M LANE",
    [DISTANCE_LANE_X, 0.04, DISTANCE_LANE_START_Z + 1.2],
    [3, 1, 0.7],
    materials.getLabel("20 M LANE"),
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
      lab,
      `${distance} m`,
      [DISTANCE_LANE_X - 2.25, 0.04, markerZ],
      [1.2, 1, 0.55],
      materials.getLabel(`${distance} m`),
    );
  }
}

function createVerticalJumpTest(
  lab: Entity,
  materials: MovementLabMaterials,
): void {
  const startX = -10;
  const spacingX = 1.9;
  const obstacleZ = -11;

  createGroundLabel(
    lab,
    "VERTICAL JUMP",
    [-5.25, 0.04, -8.9],
    [4, 1, 0.7],
    materials.getLabel("VERTICAL JUMP"),
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
      lab,
      `${height.toFixed(2)} m`,
      [x, 0.04, obstacleZ + 1.25],
      [1.45, 1, 0.55],
      materials.getLabel(`${height.toFixed(2)} m`),
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
    lab,
    "2.00 m X",
    [unreachableX, 0.04, obstacleZ + 1.25],
    [1.45, 1, 0.55],
    materials.getLabel("2.00 m X"),
  );
}

function createHorizontalJumpTest(
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
    lab,
    "JUMP RANGE",
    [laneX, 0.04, startZ + 1.2],
    [3, 1, 0.7],
    materials.getLabel("JUMP RANGE"),
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
      lab,
      `${distance} m`,
      [laneX + 2.25, 0.04, markerZ],
      [1.2, 1, 0.55],
      materials.getLabel(`${distance} m`),
    );
  }
}

function createParkourLine(lab: Entity, materials: MovementLabMaterials): void {
  const parkourX = 16;

  createGroundLabel(
    lab,
    "M0 PARKOUR",
    [parkourX, 0.04, 16.2],
    [3, 1, 0.7],
    materials.getLabel("M0 PARKOUR"),
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
