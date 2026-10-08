import { createContext } from "react";
import type { User } from "../types";

export type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (data: { user: User; token: string }) => void;
  logout: () => void;
  updateUser: (user: User) => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
