import express, { Router } from "express";
import {
  setupWallet,
  createTransaction,
  getTransactions,
  getWallet,
} from "../controllers/walletController.js";

const router: Router = express.Router();

router.post("/setup", setupWallet);

router.post("/transact/:walletId", createTransaction);

router.get("/transactions", getTransactions);

router.get("/wallet/:id", getWallet);

export default router;
