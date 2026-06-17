import { create } from "zustand";
import type { Organization, OrgMember } from "@/types/database";

interface OrgState {
  org: Organization | null;
  membership: OrgMember | null;
  setOrg: (org: Organization | null) => void;
  setMembership: (membership: OrgMember | null) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  org: null,
  membership: null,
  setOrg: (org) => set({ org }),
  setMembership: (membership) => set({ membership }),
}));
