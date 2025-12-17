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

export interface LessonComment {
  id: string;
  content: string;
  parentId?: string | null;
  userId: string;
  lessonId: string;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, "id" | "name" | "avatarUrl">;
  replies?: LessonComment[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: string;
  options: string[];
  correctAnswer: number;
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  passingScore: number;
  moduleId: string;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  answers: { [questionId: string]: number };
  score: number;
  passed: boolean;
  completedAt: string;
}

export interface Certificate {
  id: string;
  pdfUrl: string;
  userId: string;
  courseId: string;
  issuedAt: string;
  course?: {
    id: string;
    title: string;
    coverImageUrl?: string | null;
    durationHours: number;
    instructor: {
      name: string;
    };
  };
}

