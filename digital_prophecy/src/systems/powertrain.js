// src/systems/powertrain.js
import { System } from "../core/system.js";

export class PowertrainSystem extends System {
  constructor({ bus }) {
    super({ name: "Powertrain", bus });
    this.engineId = null;
    this.starterId = null;

    this.requirements = {
      hasSpark: true,
      hasFuel: true,
      hasCompression: true
    };
  }

  connect({ engineId, starterId }) {
    this.engineId = engineId;
    this.starterId = starterId;
  }

  setRequirement(name, value) {
    this.requirements[name] = value;
  }

  tick(dt, state) {
    const engine = this.getPart(this.engineId);
    const starter = this.getPart(this.starterId);
    if (!engine || !starter) return;

    const canRun = this.requirements.hasSpark && this.requirements.hasFuel && this.requirements.hasCompression;

    if (state.keyPosition === "START") {
      starter.engaged = true;
      // Crank the engine
      state.engineRPM = Math.max(state.engineRPM, starter.crankRPM);

      // If requirements met, it catches
      if (canRun) {
        engine.running = true;
        this.bus.emit("engine:started", { rpm: state.engineRPM });
      }
    } else {
      starter.engaged = false;
    }

    // If running, settle toward idle or respond to throttle
    if (engine.running) {
      const target = engine.idleRPM + engine.throttle * 2500; // simple model
      // Smooth approach
      const rate = 4.0; // responsiveness
      state.engineRPM += (target - state.engineRPM) * (1 - Math.exp(-rate * dt));

      // If key OFF, engine stops
      if (state.keyPosition === "OFF") {
        engine.running = false;
        state.engineRPM = 0;
        this.bus.emit("engine:stopped", {});
      }
    } else {
      // Not running, decay RPM if previously cranking
      state.engineRPM *= Math.exp(-6.0 * dt);
      if (state.engineRPM < 10) state.engineRPM = 0;
    }
  }
}
