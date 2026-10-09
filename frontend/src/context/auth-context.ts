import { createContext } from "react";
import type { User } from "../types";

export type AuthContextType = {
  user: User | null;
  /** true enquanto a sessão é confirmada com o servidor na abertura do app. */
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: User | null) => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
