// src/sim/demo.js
import { buildAccord2006EX_2p4 } from "../models/honda_accord_2006_k24_ex.js";

const car = buildAccord2006EX_2p4();

function step(seconds, dt = 0.1) {
  const n = Math.ceil(seconds / dt);
  for (let i = 0; i < n; i++) car.tick(dt);
}

console.log("=== Key to ACC, test cigarette lighter ===");
car.state.keyPosition = "ACC";
step(0.5);
console.log("Socket powered:", car.sys("Electrical").getPart("sock_cig").powered);

console.log("\n=== Start engine ===");
car.state.keyPosition = "START";
step(0.8);
car.state.keyPosition = "ON";
step(2.0);
console.log("Engine RPM:", car.state.engineRPM.toFixed(0));

console.log("\n=== Low RPM steering assist test ===");
car.state.engineRPM = 650; // simulate bog/low idle
step(0.2);
console.log("Assist:", car.sys("Steering").assistLevel.toFixed(2));

console.log("\n=== Door unlock test (front left) ===");
const res = car.sys("Body").unlockDoor("door_FL", { voltage: car.state.batteryVoltage });
console.log("Unlock result:", res);

console.log("\n=== Diagnose snapshot ===");
console.dir(car.diagnoseAll(), { depth: 6 });
