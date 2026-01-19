// src/parts/door_parts.js
import { Part } from "../core/part.js";

export class DoorLockActuator extends Part {
  constructor({ id, name = "Door Lock Actuator", strength = 1.0 }) {
    super({ id, name });
    this.strength = strength; // 0..1
  }
  actuate({ voltage, linkageFriction }) {
    // simplistic: if voltage low or friction high, it fails
    const effort = this.strength * (voltage / 12.0);
    return effort > linkageFriction;
  }
}

export class DoorLockLinkage extends Part {
  constructor({ id, name = "Door Lock Linkage", friction = 0.6 }) {
    super({ id, name });
    this.friction = friction; // 0..1 (higher = harder to move)
  }
}

export class Door extends Part {
  constructor({ id, name }) {
    super({ id, name });
    this.locked = true;
    this.actuatorId = null;
    this.linkageId = null;
  }
  connect({ actuatorId, linkageId }) {
    this.actuatorId = actuatorId;
    this.linkageId = linkageId;
  }
}
