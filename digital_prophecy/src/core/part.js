// src/core/part.js
export class Part {
  constructor({ id, name }) {
    this.id = id;
    this.name = name;
    this.status = "OK";            // OK | WARN | FAIL
    this.notes = [];
  }
  diagnose() {
    return { id: this.id, name: this.name, status: this.status, notes: [...this.notes] };
  }
  addNote(note) { this.notes.push(note); }
}