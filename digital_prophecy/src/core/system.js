// src/core/system.js
export class System {
  constructor({ name, bus }) {
    this.name = name;
    this.bus = bus;
    this.parts = new Map(); // id -> Part
  }
  addPart(part) { this.parts.set(part.id, part); return part; }
  getPart(id) { return this.parts.get(id); }
  tick(dt, vehicleState) {
    // Optional per-system simulation step
  }
  diagnose() {
    return {
      system: this.name,
      parts: [...this.parts.values()].map(p => p.diagnose())
    };
  }
}
