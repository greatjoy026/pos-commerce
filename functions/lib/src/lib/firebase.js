"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.auth = exports.db = exports.app = void 0;
exports.testConnection = testConnection;
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const auth_1 = require("firebase/auth");
const firebase_applet_config_json_1 = __importDefault(require("../../firebase-applet-config.json"));
// Initialize Firebase App singleton
exports.app = (0, app_1.getApps)().length === 0 ? (0, app_1.initializeApp)(firebase_applet_config_json_1.default) : (0, app_1.getApp)();
// Initialize Firestore singleton with designated databaseId
exports.db = (0, firestore_1.getFirestore)(exports.app, firebase_applet_config_json_1.default.firestoreDatabaseId);
exports.auth = (0, auth_1.getAuth)(exports.app);
exports.config = firebase_applet_config_json_1.default;
// Test Firestore connection on boot as mandated by Firebase specification
async function testConnection() {
    try {
        await (0, firestore_1.getDocFromServer)((0, firestore_1.doc)(exports.db, 'test', 'connection'));
        return true;
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('the client is offline') || error.message.includes('closing') || error.message.includes('hidden')) {
                console.info("Firestore operating with cached local storage.");
            }
        }
        return false;
    }
}
// Graceful background verification
testConnection().catch(() => { });
exports.default = exports.app;
//# sourceMappingURL=firebase.js.map