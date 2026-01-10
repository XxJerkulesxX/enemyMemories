// src/core/events.js
export class EventBus {
  constructor() { this.listeners = new Map(); }
  on(eventName, fn) {
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, []);
    this.listeners.get(eventName).push(fn);
    return () => this.off(eventName, fn);
  }
  off(eventName, fn) {
    const arr = this.listeners.get(eventName) || [];
    this.listeners.set(eventName, arr.filter(x => x !== fn));
  }
  emit(eventName, payload) {
    const arr = this.listeners.get(eventName) || [];
    for (const fn of arr) fn(payload);
  }
}