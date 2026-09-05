import {
  AmmoPhysicsWorld,
  AppBase,
  AppOptions,
  CameraComponentSystem,
  CollisionComponentSystem,
  ContainerHandler,
  DEVICETYPE_WEBGL2,
  Entity,
  FILLMODE_FILL_WINDOW,
  GraphicsDevice,
  Keyboard,
  LightComponentSystem,
  Mouse,
  RenderComponentSystem,
  RESOLUTION_AUTO,
  RigidBodyComponentSystem,
  TextureHandler,
  Vec3,
  createGraphicsDevice,
} from "playcanvas";

import { PointerLock } from "./core/input/PointerLock";
import { MovementLabControls } from "./debug/MovementLabControls";
import { MovementTelemetry } from "./debug/MovementTelemetry";
import { CharacterMotor } from "./game/player/CharacterMotor";
import { MovementStateController } from "./game/player/MovementStateController";
import { PlayerInput } from "./game/player/PlayerInput";
import { PlayerLook } from "./game/player/PlayerLook";
import { createPlayerRig } from "./game/player/createPlayerRig";
import { movementConfig } from "./game/player/movementConfig";
import { createMovementLab } from "./game/world/movementLab/MovementLab";
import { GroundProbe } from "./physics/GroundProbe";
import { initializePhysics } from "./physics/initializePhysics";
import "./styles.css";

interface ClientRuntime {
  destroy(): void;
}

async function startClient(): Promise<ClientRuntime> {
  const canvas = document.querySelector<HTMLCanvasElement>("#application");
  const controlPanel = document.querySelector<HTMLElement>("#control-panel");
  const activationButton =
    document.querySelector<HTMLButtonElement>("#enter-controls");
  const controlStatus = document.querySelector<HTMLElement>("#control-status");
  const telemetryElement = document.querySelector<HTMLElement>(
    "#movement-telemetry",
  );

  if (
    canvas === null ||
    controlPanel === null ||
    activationButton === null ||
    controlStatus === null ||
    telemetryElement === null
  ) {
    throw new Error("Velocity could not find required bootstrap elements.");
  }

  const [graphicsDeviceResult, physicsWorld] = await Promise.all([
    createGraphicsDevice(canvas, {
      deviceTypes: [DEVICETYPE_WEBGL2],
    }) as Promise<unknown>,
    initializePhysics(),
  ]);

  // PlayCanvas currently types this factory result as `any`; verify its runtime contract before use.
  if (!(graphicsDeviceResult instanceof GraphicsDevice)) {
    throw new Error("PlayCanvas did not create a valid graphics device.");
  }

  const options = new AppOptions();
  options.graphicsDevice = graphicsDeviceResult;
  options.physicsWorld = physicsWorld;
  options.keyboard = new Keyboard(window);
  options.mouse = new Mouse(canvas);
  options.componentSystems = [
    RenderComponentSystem,
    CameraComponentSystem,
    LightComponentSystem,
    CollisionComponentSystem,
    RigidBodyComponentSystem,
  ];
  options.resourceHandlers = [TextureHandler, ContainerHandler];

  const application = new AppBase(canvas);
  application.init(options);
  application.setCanvasFillMode(FILLMODE_FILL_WINDOW);
  application.setCanvasResolution(RESOLUTION_AUTO);

  const light = new Entity("Key Light");
  light.addComponent("light", {
    intensity: 1.6,
    type: "directional",
  });
  light.setEulerAngles(55, 35, 0);
  application.root.addChild(light);

  const movementLab = createMovementLab(application);
  const player = createPlayerRig(
    application,
    movementConfig,
    movementLab.spawnPosition,
  );
  const rigidBodySystem = application.systems.rigidbody;
  const keyboard = application.keyboard;
  const mouse = application.mouse;

  if (
    !(physicsWorld instanceof AmmoPhysicsWorld) ||
    rigidBodySystem === undefined ||
    keyboard === null ||
    mouse === null
  ) {
    application.destroy();
    throw new Error(
      "Velocity could not initialize required physics or input systems.",
    );
  }

  rigidBodySystem.gravity = new Vec3(0, movementConfig.gravity, 0);

  const playerInput = new PlayerInput(keyboard, mouse);
  const playerLook = new PlayerLook(
    player.yawPivot,
    player.pitchPivot,
    movementConfig,
  );
  const groundProbe = new GroundProbe(
    rigidBodySystem,
    player.root,
    movementConfig,
  );
  const movementState = new MovementStateController();
  const characterMotor = new CharacterMotor(
    player.rigidBody,
    groundProbe,
    movementState,
    movementConfig,
  );
  const pointerLock = new PointerLock(
    canvas,
    controlPanel,
    activationButton,
    controlStatus,
    (locked) => playerInput.setControlActive(locked),
  );
  const telemetry = new MovementTelemetry(
    telemetryElement,
    player.root,
    player.rigidBody,
    movementState,
    playerLook,
    pointerLock,
  );
  const movementLabControls = new MovementLabControls(
    telemetryElement,
    player.rigidBody,
    movementLab.spawnPosition,
  );

  const updateSubscription = application.on("update", (deltaTime: number) => {
    const input = playerInput.read();
    playerLook.applyMouseDelta(input.lookDeltaX, input.lookDeltaY);
    characterMotor.update(input, playerLook.yaw, deltaTime);
    telemetry.update(deltaTime);
  });
  const handleResize = (): void => {
    application.resizeCanvas();
  };

  window.addEventListener("resize", handleResize);
  application.start();
  canvas.dataset.renderer = application.graphicsDevice.isWebGL2
    ? "webgl2"
    : "unsupported";
  canvas.dataset.physics =
    rigidBodySystem.physicsWorld === physicsWorld ? "ammo" : "unavailable";

  let destroyed = false;

  return {
    destroy(): void {
      if (destroyed) {
        return;
      }

      destroyed = true;
      window.removeEventListener("resize", handleResize);
      updateSubscription.off();
      movementLabControls.destroy();
      pointerLock.destroy();
      playerInput.destroy();
      application.destroy();
    },
  };
}

function reportInitializationFailure(error: unknown): void {
  console.error("Velocity failed to initialize.", error);

  const errorElement = document.querySelector<HTMLElement>(
    "#initialization-error",
  );
  if (errorElement !== null) {
    errorElement.hidden = false;
    errorElement.textContent =
      "Velocity could not initialize. Check the developer console for details.";
  }
}

void startClient()
  .then((runtime) => {
    const handleBeforeUnload = (): void => runtime.destroy();
    window.addEventListener("beforeunload", handleBeforeUnload, { once: true });

    import.meta.hot?.dispose(() => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      runtime.destroy();
    });
  })
  .catch(reportInitializationFailure);
