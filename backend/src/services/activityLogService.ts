import { prisma } from "../config/database";

export type ActivityAction =
  | "COURSE_CREATED"
  | "COURSE_UPDATED"
  | "COURSE_DELETED"
  | "LESSON_CREATED"
  | "LESSON_UPDATED"
  | "LESSON_DELETED"
  | "MODULE_CREATED"
  | "MODULE_UPDATED"
  | "MODULE_DELETED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "ENROLLMENT_CREATED"
  | "ENROLLMENT_DELETED"
  | "QUIZ_CREATED"
  | "QUIZ_UPDATED"
  | "QUIZ_DELETED"
  | "CERTIFICATE_GENERATED"
  | "LEARNING_PATH_CREATED"
  | "LEARNING_PATH_UPDATED"
  | "LEARNING_PATH_DELETED"
  | "LEARNING_PATH_ENROLLMENT_CREATED";

export type ResourceType =
  | "COURSE"
  | "LESSON"
  | "MODULE"
  | "USER"
  | "ENROLLMENT"
  | "QUIZ"
  | "CERTIFICATE"
  | "LEARNING_PATH"
  | "LEARNING_PATH_ENROLLMENT";

export interface CreateActivityLogData {
  action: ActivityAction;
  description?: string;
  resourceId?: string;
  resourceType?: ResourceType;
  userId?: string;
}

export class ActivityLogService {
  async createLog(data: CreateActivityLogData) {
    return await prisma.activityLog.create({
      data: {
        action: data.action,
        description: data.description,
        resourceId: data.resourceId,
        resourceType: data.resourceType,
        userId: data.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getLogs(page: number = 1, limit: number = 50, filters?: { action?: ActivityAction; resourceType?: ResourceType; userId?: string }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.resourceType) {
      where.resourceType = filters.resourceType;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLogById(id: string) {
    return await prisma.activityLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}

