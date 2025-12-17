import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/authRoutes";
import courseRoutes from "./routes/courseRoutes";
import moduleRoutes from "./routes/moduleRoutes";
import lessonRoutes from "./routes/lessonRoutes";
import enrollmentRoutes from "./routes/enrollmentRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import progressRoutes from "./routes/progressRoutes";
import commentRoutes from "./routes/commentRoutes";
import quizRoutes from "./routes/quizRoutes";
import adminRoutes from "./routes/adminRoutes";
import certificateRoutes from "./routes/certificateRoutes";
import activityLogRoutes from "./routes/activityLogRoutes";
import { openApiSpec } from "./docs/openapi";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("certificates")); // Servir arquivos de certificados estaticamente

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/courses", courseRoutes);
app.use("/modules", moduleRoutes);
app.use("/lessons", lessonRoutes);
app.use("/enrollments", enrollmentRoutes);
app.use("/categories", categoryRoutes);
app.use("/progress", progressRoutes);
app.use("/comments", commentRoutes);
app.use("/quizzes", quizRoutes);
app.use("/admin", adminRoutes);
app.use("/certificates", certificateRoutes);
app.use("/activity-logs", activityLogRoutes);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default app;

