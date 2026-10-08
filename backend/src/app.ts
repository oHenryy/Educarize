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
import favoriteRoutes from "./routes/favoriteRoutes";
import tagRoutes from "./routes/tagRoutes";
import noteRoutes from "./routes/noteRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import instructorRoutes from "./routes/instructorRoutes";
import searchRoutes from "./routes/searchRoutes";
import learningPathRoutes from "./routes/learningPathRoutes";
import messageRoutes from "./routes/messageRoutes";
import { openApiSpec } from "./docs/openapi";

const app = express();

app.use(cors());
app.use(express.json());

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
app.use("/favorites", favoriteRoutes);
app.use("/tags", tagRoutes);
app.use("/notes", noteRoutes);
app.use("/reviews", reviewRoutes);
app.use("/notifications", notificationRoutes);
app.use("/instructor", instructorRoutes);
app.use("/search", searchRoutes);
app.use("/learning-paths", learningPathRoutes);
app.use("/messages", messageRoutes);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default app;

