// src/core/vehicle.js
export class Vehicle {
  constructor({ vin = "SIM-VIN", spec, bus }) {
    this.vin = vin;
    this.spec = spec; // taxonomy + dimensions + trims + etc
    this.bus = bus;

    this.systems = new Map(); // name -> System
    this.state = {
      time: 0,
      keyPosition: "OFF", // OFF | ACC | ON | START
      engineRPM: 0,
      vehicleSpeedKph: 0,
      batteryVoltage: 12.6,
      dtc: [] // diagnostic trouble codes (later)
    };
  }

  addSystem(system) { this.systems.set(system.name, system); return system; }
  sys(name) { return this.systems.get(name); }

  tick(dt) {
    this.state.time += dt;
    for (const system of this.systems.values()) system.tick(dt, this.state);
  }

  diagnoseAll() {
    return {
      vin: this.vin,
      spec: this.spec,
      state: this.state,
      systems: [...this.systems.values()].map(s => s.diagnose())
    };
  }
}
