import express, { Router } from "express";
import {
  setupWallet,
  createTransaction,
  getTransactions,
  getWallet,
} from "../controllers/walletController.js";
import { authenticate } from "../middleware/auth.js";

const router: Router = express.Router();

router.use(authenticate);

router.post("/setup", setupWallet);
router.post("/transact/:walletId", createTransaction);
router.get("/transactions", getTransactions);
router.get("/wallet/:id", getWallet);

export default router;
