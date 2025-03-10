import firebase from "firebase/compat/app";
import "firebase/compat/database";

const firebaseConfig = {
  apiKey: "AIzaSyAto25h5ZeIJ6GPlIsyuXAdc4igrgMgzhk",
  authDomain: "bar-do-cesar.firebaseapp.com",
  databaseURL: "https://bar-do-cesar-default-rtdb.firebaseio.com",
  projectId: "bar-do-cesar",
  storageBucket: "bar-do-cesar.firebasestorage.app",
  messagingSenderId: "525946263891",
  appId: "1:525946263891:web:6179063c88e3f45d2c29a6",
  measurementId: "G-7SZT212JXN",
};

let db = null;

export const ensureFirebaseInitialized = async () => {
  try {
    if (!firebase.apps.length) {
      console.log("(NOBRIDGE) LOG Inicializando Firebase...");
      await firebase.initializeApp(firebaseConfig);
      console.log(
        "(NOBRIDGE) LOG Firebase inicializado com sucesso em firebase.js"
      );
    } else {
      console.log("(NOBRIDGE) LOG Firebase já inicializado.");
    }
    const db = firebase.database();
    if (!db) {
      throw new Error("Falha ao obter referência do banco de dados Firebase.");
    }
    return db;
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Erro ao inicializar Firebase:", error);
    throw error;
  }
};

export { db };
