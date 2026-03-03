import "dotenv/config";
import express from "express";
import cors from "cors";
import walletRoutes from "./routes/walletRoutes.js";
import { PORT, SUCCESS_MESSAGES } from "./constants.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", walletRoutes);

app.listen(Number(PORT), () => {
  console.log(SUCCESS_MESSAGES.SERVER_STARTED(Number(PORT), "SQLite"));
});
