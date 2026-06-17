import { create } from "zustand";
import type { ValidationRequest, ValidationResult } from "@/types/database";

interface ValidationState {
  activeRequest: ValidationRequest | null;
  activeResult: ValidationResult | null;
  setActiveRequest: (req: ValidationRequest | null) => void;
  setActiveResult: (res: ValidationResult | null) => void;
}

export const useValidationStore = create<ValidationState>((set) => ({
  activeRequest: null,
  activeResult: null,
  setActiveRequest: (req) => set({ activeRequest: req }),
  setActiveResult: (res) => set({ activeResult: res }),
}));
