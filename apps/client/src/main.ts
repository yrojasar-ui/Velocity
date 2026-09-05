import {
  AppBase,
  AppOptions,
  CameraComponentSystem,
  Color,
  ContainerHandler,
  DEVICETYPE_WEBGL2,
  Entity,
  FILLMODE_FILL_WINDOW,
  GraphicsDevice,
  LightComponentSystem,
  RenderComponentSystem,
  RESOLUTION_AUTO,
  TextureHandler,
  createGraphicsDevice,
} from "playcanvas";

import "./styles.css";

async function startClient(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#application");

  if (canvas === null) {
    throw new Error("Velocity could not find its rendering canvas.");
  }

  const graphicsDevice: unknown = await createGraphicsDevice(canvas, {
    deviceTypes: [DEVICETYPE_WEBGL2],
  });

  // PlayCanvas currently types this factory result as `any`; verify its runtime contract before use.
  if (!(graphicsDevice instanceof GraphicsDevice)) {
    throw new Error("PlayCanvas did not create a valid graphics device.");
  }

  const options = new AppOptions();
  options.graphicsDevice = graphicsDevice;
  options.componentSystems = [
    RenderComponentSystem,
    CameraComponentSystem,
    LightComponentSystem,
  ];
  options.resourceHandlers = [TextureHandler, ContainerHandler];

  const application = new AppBase(canvas);
  application.init(options);
  application.setCanvasFillMode(FILLMODE_FILL_WINDOW);
  application.setCanvasResolution(RESOLUTION_AUTO);

  const camera = new Entity("Camera");
  camera.addComponent("camera", {
    clearColor: new Color(0.04, 0.07, 0.11),
  });
  camera.setPosition(3, 2, 5);
  camera.lookAt(0, 0, 0);
  application.root.addChild(camera);

  const light = new Entity("Key Light");
  light.addComponent("light", {
    intensity: 1.5,
    type: "directional",
  });
  light.setEulerAngles(45, 35, 0);
  application.root.addChild(light);

  const primitive = new Entity("Foundation Primitive");
  primitive.addComponent("render", {
    type: "box",
  });
  primitive.setEulerAngles(20, 35, 0);
  application.root.addChild(primitive);

  application.start();
  canvas.dataset.renderer = application.graphicsDevice.isWebGL2
    ? "webgl2"
    : "unsupported";

  window.addEventListener("beforeunload", () => application.destroy(), {
    once: true,
  });
}

void startClient();
