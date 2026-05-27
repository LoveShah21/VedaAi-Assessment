"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/backend/src/routes/resultRoutes.ts
const express_1 = require("express");
const resultController_1 = require("../controllers/resultController");
const router = (0, express_1.Router)();
router.get('/:id/pdf', resultController_1.streamPdf);
router.get('/:id', resultController_1.getResult); // standalone result fetch
router.get('/legacy/:id', resultController_1.getResultById); // legacy alias
exports.default = router;
