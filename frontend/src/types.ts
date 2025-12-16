export type Role = "ADMIN" | "INSTRUCTOR" | "STUDENT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  durationMinutes?: number;
  order?: number;
}

export interface Module {
  id: string;
  title: string;
  description?: string | null;
  order?: number;
  lessons?: Lesson[];
}

export interface CourseCategory {
  id: string;
  name: string;
  description?: string | null;
}

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  durationHours?: number;
  difficulty?: string;
  status?: string;
  category?: CourseCategory | null;
  instructor?: Pick<User, "id" | "name" | "avatarUrl">;
  modules?: Module[];
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  lessons: LessonProgress[];
}

