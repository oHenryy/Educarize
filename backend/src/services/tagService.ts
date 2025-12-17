import { prisma } from "../config/database";

export class TagService {
  async createTag(name: string) {
    const existing = await prisma.tag.findUnique({
      where: { name: name.toLowerCase().trim() },
    });

    if (existing) {
      throw new Error("Tag já existe");
    }

    return await prisma.tag.create({
      data: { name: name.toLowerCase().trim() },
    });
  }

  async getAllTags() {
    return await prisma.tag.findMany({
      include: {
        _count: {
          select: { courses: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async getPopularTags(limit: number = 10) {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { courses: true },
        },
      },
      orderBy: {
        courses: {
          _count: "desc",
        },
      },
      take: limit,
    });

    return tags;
  }

  async addTagToCourse(courseId: string, tagName: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error("Curso não encontrado");
    }

    let tag = await prisma.tag.findUnique({
      where: { name: tagName.toLowerCase().trim() },
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: { name: tagName.toLowerCase().trim() },
      });
    }

    const existing = await prisma.courseTag.findUnique({
      where: {
        courseId_tagId: { courseId, tagId: tag.id },
      },
    });

    if (existing) {
      throw new Error("Tag já está associada a este curso");
    }

    return await prisma.courseTag.create({
      data: { courseId, tagId: tag.id },
      include: {
        tag: true,
        course: {
          select: { id: true, title: true },
        },
      },
    });
  }

  async removeTagFromCourse(courseId: string, tagId: string) {
    const courseTag = await prisma.courseTag.findUnique({
      where: {
        courseId_tagId: { courseId, tagId },
      },
    });

    if (!courseTag) {
      throw new Error("Tag não está associada a este curso");
    }

    await prisma.courseTag.delete({
      where: {
        courseId_tagId: { courseId, tagId },
      },
    });

    return { message: "Tag removida do curso com sucesso" };
  }

  async getCourseTags(courseId: string) {
    return await prisma.courseTag.findMany({
      where: { courseId },
      include: {
        tag: true,
      },
    });
  }

  async getCoursesByTag(tagId: string) {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new Error("Tag não encontrada");
    }

    const courseTags = await prisma.courseTag.findMany({
      where: { tagId },
      include: {
        course: {
          include: {
            instructor: {
              select: { id: true, name: true, avatarUrl: true },
            },
            category: true,
            _count: {
              select: { enrollments: true },
            },
          },
        },
      },
    });

    return courseTags.map((ct) => ct.course);
  }
}

