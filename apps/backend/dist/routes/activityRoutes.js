"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activityController_1 = require("../controllers/activityController");
const router = (0, express_1.Router)();
router.get('/', activityController_1.getActivities);
exports.default = router;
