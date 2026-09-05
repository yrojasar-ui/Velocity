import {
  ADDRESS_CLAMP_TO_EDGE,
  AppBase,
  Color,
  StandardMaterial,
  Texture,
  Vec2,
} from "playcanvas";

export interface MovementLabMaterials {
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
  readonly getLabel: (text: string) => StandardMaterial;
}

export function createMovementLabMaterials(
  application: AppBase,
  floorWidthMeters: number,
  floorDepthMeters: number,
): MovementLabMaterials {
  const labels = new Map<string, StandardMaterial>();

  return {
    floor: createGridMaterial(application, floorWidthMeters, floorDepthMeters),
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
    getLabel(text: string): StandardMaterial {
      let material = labels.get(text);
      if (material === undefined) {
        material = createLabelMaterial(application, text);
        labels.set(text, material);
      }

      return material;
    },
  };
}

function createGridMaterial(
  application: AppBase,
  floorWidthMeters: number,
  floorDepthMeters: number,
): StandardMaterial {
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
  material.diffuseMapTiling = new Vec2(floorWidthMeters, floorDepthMeters);
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
