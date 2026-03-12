// src/systems/steering.js
import { System } from "../core/system.js";
import { Part } from "../core/part.js";

class PowerSteeringPump extends Part {
  constructor({ id, name = "Power Steering Pump", efficiency = 1.0 }) {
    super({ id, name });
    this.efficiency = efficiency; // worn pump => lower
  }
  flow(engineRPM) {
    // simple: proportional to RPM and efficiency
    return (engineRPM / 1000) * this.efficiency;
  }
}



export class SteeringSystem extends System {
  constructor({ bus }) {
    super({ name: "Steering", bus });
    this.pumpId = null;
    this.assistLevel = 0; // 0..1
  }
  connect({ pumpId }) { this.pumpId = pumpId; }
  addPowerSteeringPump(opts) { return this.addPart(new PowerSteeringPump(opts)); }

  tick(dt, state) {
    const pump = this.getPart(this.pumpId);
    if (!pump) return;

    const flow = pump.flow(state.engineRPM);
    // map flow to assist 0..1
    this.assistLevel = Math.max(0, Math.min(1, flow / 2.0)); // arbitrary scale

    if (this.assistLevel < 0.35 && state.engineRPM > 0) {
      this.bus.emit("steering:lowAssist", { rpm: state.engineRPM, assist: this.assistLevel });
    }
  }
}

