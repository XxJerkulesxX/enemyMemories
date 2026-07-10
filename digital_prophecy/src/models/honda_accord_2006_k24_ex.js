// src/models/honda_accord_2006_k24_ex.js
import { EventBus } from "../core/events.js";
import { Vehicle } from "../core/vehicle.js";

import { ElectricalSystem } from "../systems/electrical.js";
import { PowertrainSystem } from "../systems/powertrain.js";
import { BodySystem } from "../systems/body.js";
import { SteeringSystem } from "../systems/steering.js";

import { Battery, Fuse, CigaretteLighterSocket } from "../parts/electrical_parts.js";
import { Engine, StarterMotor } from "../parts/engine_parts.js";
import { Door, DoorLockActuator, DoorLockLinkage } from "../parts/door_parts.js";

import { AudioSystem } from "../systems/audio.js";
import { HeadUnit, Speaker} from "../parts/audio_parts.js";

import { Taxonomy } from "./specs.js";

export function buildAccord2006EX_2p4() {
  const bus = new EventBus();

  const spec = {
    make: "Honda",
    model: "Accord",
    year: 2006,
    trim: "EX",
    taxonomy: {
      segment: Taxonomy.segment.midsize,
      bodyStyle: Taxonomy.bodyStyle.sedan4,
      layout: Taxonomy.layout.ff
    },
    engine: {
      displacementL: 2.4,
      cylinders: 4
    }
  };

  const v = new Vehicle({ vin: "SIM-ACCORD-2006-EX", spec, bus });

  // Systems
  const electrical = v.addSystem(new ElectricalSystem({ bus }));
  const powertrain = v.addSystem(new PowertrainSystem({ bus }));
  const body = v.addSystem(new BodySystem({ bus }));
  const steering = v.addSystem(new SteeringSystem({ bus }));

  // Electrical parts
  electrical.addPart(new Battery({ id: "bat1", voltage: 12.6 }));
  electrical.addPart(new Fuse({ id: "f_cig", name: "CIG / ACC Socket Fuse", ratingAmps: 15 }));
  electrical.addPart(new CigaretteLighterSocket({ id: "sock_cig" }));

  electrical.defineCircuit("cigaretteLighter", {
    fuseId: "f_cig",
    loadIds: ["sock_cig"],
    enabledWhen: (state) => state.keyPosition === "ACC" || state.keyPosition === "ON"
  });

  // Powertrain parts
  powertrain.addPart(new Engine({ id: "eng1", name: "Honda 2.4L I4", displacementL: 2.4, cylinders: 4, idleRPM: 750 }));
  powertrain.addPart(new StarterMotor({ id: "st1", crankRPM: 250 }));
  powertrain.connect({ engineId: "eng1", starterId: "st1" });

  // Steering parts
  const pump = steering.addPowerSteeringPump({ id: "ps1", efficiency: 0.75 }); // simulate wear
  steering.connect({ pumpId: pump.id });

  // Body / Doors (front left + front right)
  const fl = body.addPart(new Door({ id: "door_FL", name: "Front Left Door" }));
  body.addPart(new DoorLockActuator({ id: "act_FL", strength: 0.9 }));
  body.addPart(new DoorLockLinkage({ id: "link_FL", friction: 0.65 }));
  fl.connect({ actuatorId: "act_FL", linkageId: "link_FL" });

  const fr = body.addPart(new Door({ id: "door_FR", name: "Front Right Door" }));
  body.addPart(new DoorLockActuator({ id: "act_FR", strength: 0.8 }));
  body.addPart(new DoorLockLinkage({ id: "link_FR", friction: 0.55 }));
  fr.connect({ actuatorId: "act_FR", linkageId: "link_FR" });

  // Helpful event logs
  bus.on("electrical:fuseBlown", (e) => console.log("[EVENT] Fuse blown:", e));
  bus.on("engine:started", (e) => console.log("[EVENT] Engine started:", e));
  bus.on("steering:lowAssist", (e) => console.log("[EVENT] Low steering assist:", e));
  bus.on("door:unlockFailed", (e) => console.log("[EVENT] Door unlock failed:", e));

  return v;
}
