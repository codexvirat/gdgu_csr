import { UserRole } from "@/generated/prisma/enums";

export type Capability =
  | "manageCompanies"
  | "manageUsers"
  | "manageClients"
  | "manageProjects"
  | "manageEvents"
  | "assignTrainersManagers"
  | "manageVenuesVendors"
  | "registerParticipants"
  | "editParticipants"
  | "unmaskAadhaar"
  | "markAttendance"
  | "manageAssessments"
  | "conductScoreAssessments"
  | "publishAssessments"
  | "manageFeedback"
  | "publishFeedback"
  | "viewFeedback"
  | "manageCertificates"
  | "publishCertificates"
  | "viewCertificates"
  | "viewFinancials"
  | "viewReports"
  | "viewClientPortal"
  | "deleteRecords";

// Baseline role-permission matrix. Exact permissions are expected to evolve;
// this table is the single place that encodes the matrix.
//
// Trainer, Volunteer, and PA capabilities are further restricted to the
// specific event(s) they're attached to — see lib/event-access.ts. Every
// other role below is company-wide (no per-event restriction). Super Admin
// is the only cross-company role — see isGlobalRole.
//
// "deleteRecords" is intentionally Super-Admin-only — hard deletes cascade
// through child records (see lib/cascade-delete.ts) and even Admins don't
// get that blast radius by default.
const MATRIX: Record<UserRole, Capability[]> = {
  SUPER_ADMIN: [
    "manageCompanies",
    "manageUsers",
    "manageClients",
    "manageProjects",
    "manageEvents",
    "assignTrainersManagers",
    "manageVenuesVendors",
    "registerParticipants",
    "editParticipants",
    "unmaskAadhaar",
    "markAttendance",
    "manageAssessments",
    "conductScoreAssessments",
    "publishAssessments",
    "manageFeedback",
    "publishFeedback",
    "manageCertificates",
    "publishCertificates",
    "viewFinancials",
    "viewReports",
    "deleteRecords",
  ],
  ADMIN: [
    "manageUsers",
    "manageClients",
    "manageProjects",
    "manageEvents",
    "assignTrainersManagers",
    "manageVenuesVendors",
    "registerParticipants",
    "editParticipants",
    "unmaskAadhaar",
    "markAttendance",
    "manageAssessments",
    "conductScoreAssessments",
    "publishAssessments",
    "manageFeedback",
    "publishFeedback",
    "manageCertificates",
    "publishCertificates",
    "viewFinancials",
    "viewReports",
  ],
  DIRECTOR: [
    "manageClients",
    "manageProjects",
    "manageEvents",
    "assignTrainersManagers",
    "manageVenuesVendors",
    "unmaskAadhaar",
    "manageAssessments",
    "manageFeedback",
    "manageCertificates",
    "viewFinancials",
    "viewReports",
  ],
  MANAGER: [
    "manageClients",
    "manageProjects",
    "manageEvents",
    "assignTrainersManagers",
    "manageVenuesVendors",
    "registerParticipants",
    "editParticipants",
    "markAttendance",
    "manageAssessments",
    "conductScoreAssessments",
    "publishAssessments",
    "manageFeedback",
    "publishFeedback",
    "manageCertificates",
    "publishCertificates",
    "viewFinancials",
    "viewReports",
  ],
  TRAINER: [
    "registerParticipants",
    "editParticipants",
    "markAttendance",
    "conductScoreAssessments",
    "publishAssessments",
    "publishFeedback",
    "viewFeedback",
    "publishCertificates",
    "viewCertificates",
  ],
  PA: ["registerParticipants", "editParticipants", "markAttendance", "manageAssessments", "manageFeedback", "viewFeedback", "manageCertificates", "viewCertificates"],
  VOLUNTEER: ["registerParticipants", "editParticipants", "markAttendance", "viewFeedback", "viewCertificates"],
  CLIENT: ["viewClientPortal"],
};

export function can(role: UserRole, capability: Capability): boolean {
  return MATRIX[role]?.includes(capability) ?? false;
}

export function requireCapability(role: UserRole, capability: Capability) {
  if (!can(role, capability)) {
    throw new Error(`Role ${role} lacks capability "${capability}"`);
  }
}

/** Super Admin operates across all companies; every other role is scoped to its own (allotted) company. */
export function isGlobalRole(role: UserRole) {
  return role === "SUPER_ADMIN";
}

/** Roles restricted to a specific event (or set of events) rather than the whole company. */
export function isEventScopedRole(role: UserRole) {
  return role === "TRAINER" || role === "VOLUNTEER" || role === "PA";
}

export const DASHBOARD_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "MANAGER", "TRAINER", "PA", "VOLUNTEER"];

/** Roles allowed to see a participant's trainee-login PIN in plain form (not just at generation time). */
const PIN_VISIBLE_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "TRAINER", "VOLUNTEER", "PA"];

export function canViewParticipantPin(role: UserRole) {
  return PIN_VISIBLE_ROLES.includes(role);
}
