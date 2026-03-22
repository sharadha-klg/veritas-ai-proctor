import { createContext, useContext, useState, ReactNode } from "react";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: "student" | "admin";
  collegeName?: string;
  department?: string;
  studentId?: string;
  organization?: string;
  adminRole?: string;
  contactNumber?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: "student" | "admin") => boolean;
  register: (userData: Omit<User, "id"> & { password: string }) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

// Simple localStorage-based auth for now (will move to Lovable Cloud)
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("veritas_user");
    return saved ? JSON.parse(saved) : null;
  });

  const register = (userData: Omit<User, "id"> & { password: string }) => {
    const users = JSON.parse(localStorage.getItem("veritas_users") || "[]");
    if (users.find((u: any) => u.email === userData.email)) return false;
    const newUser = { ...userData, id: crypto.randomUUID() };
    users.push(newUser);
    localStorage.setItem("veritas_users", JSON.stringify(users));
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword as User);
    localStorage.setItem("veritas_user", JSON.stringify(userWithoutPassword));
    return true;
  };

  const login = (email: string, password: string, role: "student" | "admin") => {
    const users = JSON.parse(localStorage.getItem("veritas_users") || "[]");
    const found = users.find((u: any) => u.email === email && u.password === password && u.role === role);
    if (!found) return false;
    const { password: _, ...userWithoutPassword } = found;
    setUser(userWithoutPassword as User);
    localStorage.setItem("veritas_user", JSON.stringify(userWithoutPassword));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("veritas_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
