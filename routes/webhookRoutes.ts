import express, { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createSubscription,
  listSubscriptions,
  listDeliveries,
} from "../controllers/webhookController.js";

const router: Router = express.Router();

router.use(authenticate);

router.post("/webhooks/subscriptions", createSubscription);
router.get("/webhooks/subscriptions", listSubscriptions);
router.get("/webhooks/deliveries", listDeliveries);

export default router;

