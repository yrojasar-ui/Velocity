import ammoFallbackUrl from "ammojs3/builds/ammo.js?url";
import ammoGlueUrl from "ammojs3/builds/ammo.wasm.js?url";
import ammoWasmUrl from "ammojs3/builds/ammo.wasm.wasm?url";
import { AmmoPhysicsWorld, WasmModule } from "playcanvas";

const PHYSICS_LOAD_TIMEOUT_MILLISECONDS = 15_000;

type GlobalWithAmmo = typeof globalThis & { Ammo?: unknown };

export async function initializePhysics(): Promise<AmmoPhysicsWorld> {
  const ammoInstance = await loadAmmoModule();
  (globalThis as GlobalWithAmmo).Ammo = ammoInstance;

  return new AmmoPhysicsWorld();
}

function loadAmmoModule(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      fail("Ammo/WASM initialization timed out.");
    }, PHYSICS_LOAD_TIMEOUT_MILLISECONDS);

    const succeed = (instance: unknown): void => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      resolve(instance);
    };

    const fail = (message: string): void => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      reject(new Error(message));
    };

    WasmModule.setConfig("Ammo", {
      glueUrl: ammoGlueUrl,
      wasmUrl: ammoWasmUrl,
      fallbackUrl: ammoFallbackUrl,
      errorHandler: fail,
    });
    WasmModule.getInstance("Ammo", succeed);
  });
}
