import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error("useAuth must be used within AuthProvider");
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
