// src/parts/audio_parts.js
import { Part } from "../core/part.js";

export class HeadUnit extends Part {
  constructor({
    id,
    name = "OEM Honda Accord Head Unit",
    peakWatts = 120,
    rmsWattsPerChannel = 15,
    channels = 4,
    efficiency = 0.65
  }) {
    super({ id, name });

    this.peakWatts = peakWatts;
    this.rmsWattsPerChannel = rmsWattsPerChannel;
    this.channels = channels;
    this.efficiency = efficiency;
    this.powered = false;
    this.volume = 0; // 0 to 1
  }

  totalRmsWatts() {
    return this.rmsWattsPerChannel * this.channels;
  }

  estimatedPowerDrawWatts() {
    // Volume is not linear in real audio systems, but this is useful for learning.
    const audioOutputWatts = this.totalRmsWatts() * this.volume;
    return audioOutputWatts / this.efficiency;
  }

  estimatedPeakCurrentAmps(voltage) {
    return this.peakWatts / voltage;
  }

  estimatedCurrentDrawAmps(voltage) {
    return this.estimatedPowerDrawWatts() / voltage;
  }
}

export class Speaker extends Part {
  constructor({
    id,
    name,
    location,
    impedanceOhms = 4,
    rmsWatts = 15,
    peakWatts = 30,
    size = "Unknown"
  }) {
    super({ id, name });

    this.location = location;
    this.impedanceOhms = impedanceOhms;
    this.rmsWatts = rmsWatts;
    this.peakWatts = peakWatts;
    this.size = size;
    this.receivingWatts = 0;
  }

  receivePower(watts) {
    this.receivingWatts = watts;

    if (watts > this.peakWatts) {
      this.status = "FAIL";
      this.addNote(`Speaker exceeded peak rating: ${watts.toFixed(1)}W > ${this.peakWatts}W`);
    } else if (watts > this.rmsWatts) {
      this.status = "WARN";
      this.addNote(`Speaker above RMS rating: ${watts.toFixed(1)}W > ${this.rmsWatts}W`);
    }
  }
};