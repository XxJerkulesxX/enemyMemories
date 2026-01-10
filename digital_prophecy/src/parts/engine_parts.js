// src/parts/engine_parts.js
import { Part } from "../core/part.js";

export class StarterMotor extends Part {
  constructor({ id, name = "Starter Motor", crankRPM = 250 }) {
    super({ id, name });
    this.crankRPM = crankRPM;
    this.engaged = false;
  }
}

export class Engine extends Part {
  constructor({
    id,
    name = "I4 Engine",
    displacementL = 2.4,
    cylinders = 4,
    idleRPM = 750
  }) {
    super({ id, name });
    this.displacementL = displacementL;
    this.cylinders = cylinders;
    this.idleRPM = idleRPM;

    this.running = false;
    this.throttle = 0; // 0..1
  }
}
