// src/systems/body.js
import { System } from "../core/system.js";

export class BodySystem extends System {
  constructor({ bus }) {
    super({ name: "Body", bus });
    this.doors = new Map(); // doorId -> doorPartId (or store ids directly)
  }

  lockDoor(doorId) {
    const door = this.getPart(doorId);
    if (door) door.locked = true;
  }

  unlockDoor(doorId, { voltage = 12.0 } = {}) {
    const door = this.getPart(doorId);
    if (!door) return { ok: false, reason: "No such door" };

    const actuator = this.getPart(door.actuatorId);
    const linkage = this.getPart(door.linkageId);

    const ok = actuator?.actuate({ voltage, linkageFriction: linkage?.friction ?? 0.5 }) ?? false;
    if (ok) {
      door.locked = false;
      this.bus.emit("door:unlocked", { doorId, doorName: door.name });
      return { ok: true };
    } else {
      this.bus.emit("door:unlockFailed", { doorId, doorName: door.name, voltage });
      return { ok: false, reason: "Actuator couldn't overcome linkage friction or voltage too low" };
    }
  }
}
