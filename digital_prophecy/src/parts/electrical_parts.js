// src/parts/electrical_parts.js
import { Part } from "../core/part.js";

export class Battery extends Part {
  constructor({ id, name = "12V Battery", voltage = 12.6, internalResistance = 0.02 }) {
    super({ id, name });
    this.voltage = voltage;
    this.internalResistance = internalResistance;
  }
  supplyVoltage(loadAmps) {
    // Very simplified: Vdrop = I*R
    const drop = loadAmps * this.internalResistance;
    return Math.max(0, this.voltage - drop);
  }
}

export class Fuse extends Part {
  constructor({ id, name, ratingAmps }) {
    super({ id, name });
    this.ratingAmps = ratingAmps;
    this.blown = false;
  }
  passCurrent(amps) {
    if (this.blown) return false;
    if (amps > this.ratingAmps) {
      this.blown = true;
      this.status = "FAIL";
      this.addNote(`Fuse blown: ${amps.toFixed(1)}A > ${this.ratingAmps}A`);
      return false;
    }
    return true;
  }
}

export class ElectricalLoad extends Part {
  constructor({ id, name, ampsAt12V = 1.0 }) {
    super({ id, name });
    this.ampsAt12V = ampsAt12V;
    this.powered = false;
    this.lastVoltage = 0;
  }
  draw(voltage) {
    // simplistic: current scales with voltage
    const amps = this.ampsAt12V * (voltage / 12.0);
    return Math.max(0, amps);
  }
}

export class CigaretteLighterSocket extends ElectricalLoad {
  constructor({ id, name = "Cigarette Lighter Socket" }) {
    super({ id, name, ampsAt12V: 10.0 }); // can be high depending on accessory
  }
}
