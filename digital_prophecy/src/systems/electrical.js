// src/systems/electrical.js
import { System } from "../core/system.js";

export class ElectricalSystem extends System {
  constructor({ bus }) {
    super({ name: "Electrical", bus });
    this.circuits = new Map(); 
    // circuitName -> { fuseId, loads: [loadId], enabledWhen: (state)=>bool }
  }

  defineCircuit(circuitName, { fuseId, loadIds, enabledWhen }) {
    this.circuits.set(circuitName, { fuseId, loadIds, enabledWhen });
  }

  tick(dt, state) {
    // set battery voltage in state (for display) if battery exists
    const battery = [...this.parts.values()].find(p => p.constructor.name === "Battery");
    if (battery) state.batteryVoltage = battery.voltage;

    for (const [name, c] of this.circuits.entries()) {
      const fuse = this.getPart(c.fuseId);
      const enabled = c.enabledWhen?.(state) ?? true;
      if (!enabled) {
        for (const loadId of c.loadIds) {
          const load = this.getPart(loadId);
          if (load) load.powered = false;
        }
        continue;
      }

      // Determine current draw, validate fuse, set powered state
      let totalAmps = 0;
      const v = battery ? battery.supplyVoltage(0) : state.batteryVoltage;

      for (const loadId of c.loadIds) {
        const load = this.getPart(loadId);
        if (!load) continue;
        totalAmps += load.draw(v);
      }

      const allowed = fuse?.passCurrent(totalAmps) ?? true;
      for (const loadId of c.loadIds) {
        const load = this.getPart(loadId);
        if (!load) continue;
        load.powered = allowed;
        load.lastVoltage = allowed ? v : 0;
      }

      if (!allowed) this.bus.emit("electrical:fuseBlown", { circuit: name, fuse: fuse?.name });
    }
  }
}
