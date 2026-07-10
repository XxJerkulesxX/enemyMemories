// src/systems/audio.js
import { Systems } from "../core/systems.js";

export class AudioSystem extends System {
  constructor({ bus }) {
    super({ name: "Audio", bus });

    this.headUnitId = null;
    this.speakerIds = [];
    this.fuseRatingAmps = 15;
    this.lastCurrentDrawAmps = 0;
    this.lastVoltage = 0;
  }

  connect({ headUnitId, speakerIds, fuseRatingAmps = 15 }) {
    this.headUnitId = headUnitId;
    this.speakerIds = speakerIds;
    this.fuseRatingAmps = fuseRatingAmps;
  }

  setVolume(volume) {
    const headUnit = this.getPart(this.headUnitId);
    if (!headUnit) return;

    headUnit.volume = Math.max(0, Math.min(1, volume));
  }

  tick(dt, state) {
    const headUnit = this.getPart(this.headUnitId);
    if (!headUnit) return;

    const voltage = state.engineRPM > 0 ? 14.4 : state.batteryVoltage;
    this.lastVoltage = voltage;

    const keyAllowsAudio =
      state.keyPosition === "ACC" ||
      state.keyPosition === "ON" ||
      state.keyPosition === "START";

    headUnit.powered = keyAllowsAudio;

    if (!headUnit.powered) {
      this.lastCurrentDrawAmps = 0;
      return;
    }

    const currentDraw = headUnit.estimatedCurrentDrawAmps(voltage);
    this.lastCurrentDrawAmps = currentDraw;

    if (currentDraw > this.fuseRatingAmps) {
      this.bus.emit("audio:fuseOverload", {
        currentDraw,
        fuseRating: this.fuseRatingAmps
      });
    }

    const wattsPerSpeaker =
      (headUnit.totalRmsWatts() * headUnit.volume) / this.speakerIds.length;

    for (const speakerId of this.speakerIds) {
      const speaker = this.getPart(speakerId);
      if (speaker) speaker.receivePower(wattsPerSpeaker);
    }
  }

  audioReport() {
    const headUnit = this.getPart(this.headUnitId);

    return {
      headUnit: headUnit?.diagnose(),
      volume: headUnit?.volume,
      totalRmsWatts: headUnit?.totalRmsWatts(),
      peakWatts: headUnit?.peakWatts,
      voltage: this.lastVoltage,
      currentDrawAmps: this.lastCurrentDrawAmps,
      fuseRatingAmps: this.fuseRatingAmps,
      speakers: this.speakerIds.map(id => this.getPart(id)?.diagnose())
    };
  }
};
