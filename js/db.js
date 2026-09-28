const DB_NAME = "iron-log-db";
const DB_VERSION = 2;
const STORE = "entries";
const WORKOUT_STORE = "workouts";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("date", "date", { unique: false });
      }
      if (!db.objectStoreNames.contains(WORKOUT_STORE)) {
        const wstore = db.createObjectStore(WORKOUT_STORE, { keyPath: "id" });
        wstore.createIndex("date", "date", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const IronDB = {
  async saveEntry(entry) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve(entry);
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteEntry(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = req.result || [];
        rows.sort((a, b) => new Date(a.date) - new Date(b.date));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async exportJSON() {
    const rows = await this.getAll();
    const workouts = await this.getAllWorkouts();
    return JSON.stringify({ entries: rows, workouts }, null, 2);
  },

  async importJSON(json) {
    const data = JSON.parse(json);
    const rows = Array.isArray(data) ? data : (data.entries || []);
    const workouts = Array.isArray(data) ? [] : (data.workouts || []);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE, WORKOUT_STORE], "readwrite");
      const store = tx.objectStore(STORE);
      const wstore = tx.objectStore(WORKOUT_STORE);
      rows.forEach((r) => store.put(r));
      workouts.forEach((w) => wstore.put(w));
      tx.oncomplete = () => resolve(rows.length + workouts.length);
      tx.onerror = () => reject(tx.error);
    });
  },

  // ---- Workouts ----
  async saveWorkout(session) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKOUT_STORE, "readwrite");
      tx.objectStore(WORKOUT_STORE).put(session);
      tx.oncomplete = () => resolve(session);
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteWorkout(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKOUT_STORE, "readwrite");
      tx.objectStore(WORKOUT_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAllWorkouts() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKOUT_STORE, "readonly");
      const req = tx.objectStore(WORKOUT_STORE).getAll();
      req.onsuccess = () => {
        const rows = req.result || [];
        rows.sort((a, b) => new Date(a.date) - new Date(b.date));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  }
};