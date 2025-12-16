import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/authRoutes";
import { openApiSpec } from "./docs/openapi";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Educarize backend rodando na porta ${PORT}`);
});


