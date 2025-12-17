import { ActivityLogService, CreateActivityLogData } from "../services/activityLogService";

const activityLogService = new ActivityLogService();

export async function logActivity(data: CreateActivityLogData): Promise<void> {
  try {
    await activityLogService.createLog(data);
  } catch (error) {
    console.error("Erro ao criar log de atividade:", error);
  }
}

