import { prisma } from "../config/database";

export interface SearchFilters {
  query?: string;
  categoryId?: string;
  difficulty?: string;
  status?: string;
  tags?: string[];
  minRating?: number;
  instructorId?: string;
}

export class SearchService {
  async advancedSearch(filters: SearchFilters, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = "PUBLISHED";
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.instructorId) {
      where.instructorId = filters.instructorId;
    }

    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query } },
        { description: { contains: filters.query } },
      ];
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: {
              in: filters.tags.map(t => t.toLowerCase().trim()),
            },
          },
        },
      };
    }

    let courseIdsByRating: string[] | null = null;
    if (filters.minRating !== undefined) {
      const coursesWithRating = await prisma.courseReview.groupBy({
        by: ["courseId"],
        having: {
          rating: {
            _avg: {
              gte: filters.minRating,
            },
          },
        },
        _avg: {
          rating: true,
        },
      });

      courseIdsByRating = coursesWithRating.map((c) => c.courseId);
    }

    if (courseIdsByRating !== null) {
      where.id = { in: courseIdsByRating };
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              modules: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.course.count({ where }),
    ]);

    const ratingStats = await prisma.courseReview.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courses.map((c) => c.id) } },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const ratingsByCourse = new Map(ratingStats.map((r) => [r.courseId, r]));

    const coursesWithRatings = courses.map((course) => {
      const stats = ratingsByCourse.get(course.id);
      return {
        ...course,
        averageRating: Math.round((stats?._avg.rating ?? 0) * 10) / 10,
        totalReviews: stats?._count._all ?? 0,
      };
    });

    return {
      courses: coursesWithRatings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchLessons(query: string, courseId?: string) {
    const where: any = {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
      ],
      module: {
        course: { status: "PUBLISHED" },
        ...(courseId && { courseId }),
      },
    };

    const lessons = await prisma.lesson.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        durationMinutes: true,
        order: true,
        moduleId: true,
        module: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
                instructor: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 50,
    });

    return lessons;
  }

  async searchNotes(query: string, userId: string) {
    const notes = await prisma.note.findMany({
      where: {
        userId,
        content: {
          contains: query,
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            module: {
              select: {
                id: true,
                title: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 50,
    });

    return notes;
  }

  async getPopularTags(limit: number = 20) {
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

  async getSearchSuggestions(query: string) {
    const [courses, tags] = await Promise.all([
      prisma.course.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          title: true,
        },
        take: 5,
      }),
      prisma.tag.findMany({
        where: {
          name: {
            contains: query,
          },
        },
        select: {
          id: true,
          name: true,
        },
        take: 5,
      }),
    ]);

    return {
      courses,
      tags,
    };
  }
}

