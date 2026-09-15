"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPosSale = exports.recordInventoryTransfer = exports.recordInventoryAdjustment = exports.recordInventoryReturn = exports.recordInventorySale = exports.recordInventoryPurchaseReceipt = void 0;
var inventoryMovements_1 = require("./inventoryMovements");
Object.defineProperty(exports, "recordInventoryPurchaseReceipt", { enumerable: true, get: function () { return inventoryMovements_1.recordInventoryPurchaseReceipt; } });
Object.defineProperty(exports, "recordInventorySale", { enumerable: true, get: function () { return inventoryMovements_1.recordInventorySale; } });
Object.defineProperty(exports, "recordInventoryReturn", { enumerable: true, get: function () { return inventoryMovements_1.recordInventoryReturn; } });
Object.defineProperty(exports, "recordInventoryAdjustment", { enumerable: true, get: function () { return inventoryMovements_1.recordInventoryAdjustment; } });
Object.defineProperty(exports, "recordInventoryTransfer", { enumerable: true, get: function () { return inventoryMovements_1.recordInventoryTransfer; } });
var posInventory_1 = require("./posInventory");
Object.defineProperty(exports, "recordPosSale", { enumerable: true, get: function () { return posInventory_1.recordPosSale; } });
//# sourceMappingURL=index.js.map