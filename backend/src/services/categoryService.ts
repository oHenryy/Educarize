import { prisma } from "../config/database";
import { HttpError } from "../utils/httpError";

export class CategoryService {
  async list() {
    return await prisma.courseCategory.findMany({
      include: {
        _count: {
          select: { courses: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async create(name: string, description?: string) {
    try {
      return await prisma.courseCategory.create({
        data: { name, description },
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new HttpError(409, "Categoria já existe");
      }
      throw error;
    }
  }
}

