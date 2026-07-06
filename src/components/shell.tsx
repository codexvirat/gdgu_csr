import type { ReactNode } from "react";
import { Sidebar, type NavItem } from "@/components/sidebar";
import { logoutAction } from "@/lib/logout-action";
import type { SessionPayload } from "@/lib/auth";
import { can, isGlobalRole } from "@/lib/permissions";
import { CompanySwitcher } from "@/components/company-switcher";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  DIRECTOR: "Director",
  MANAGER: "Manager",
  TRAINER: "Trainer",
  PA: "PA / Data Entry",
  VOLUNTEER: "Volunteer",
  CLIENT: "Client",
};

export function Shell({
  session,
  companies,
  children,
}: {
  session: SessionPayload;
  companies: { id: string; name: string }[];
  children: ReactNode;
}) {
  const items: NavItem[] = [{ label: "Dashboard", href: "/dashboard" }];

  if (session.role === "TRAINER" || session.role === "PA") {
    items.push({ label: "My Schedule", href: "/dashboard/my-schedule" });
  }
  if (session.role === "VOLUNTEER" && session.volunteerEventId) {
    items.push({ label: "My Event", href: `/dashboard/events/${session.volunteerEventId}` });
  }
  if (session.role !== "CLIENT" && session.role !== "TRAINER" && session.role !== "VOLUNTEER" && session.role !== "PA") {
    items.push(
      { label: "Projects", href: "/dashboard/projects" },
      { label: "Events", href: "/dashboard/events" },
      { label: "Participants", href: "/dashboard/participants" }
    );
  }
  if (can(session.role, "markAttendance")) {
    items.push({ label: "Attendance", href: "/dashboard/attendance" });
  }
  if (can(session.role, "manageAssessments") || can(session.role, "conductScoreAssessments") || can(session.role, "publishAssessments")) {
    items.push({ label: "Assessments", href: "/dashboard/assessments" });
  }
  if (can(session.role, "manageFeedback") || can(session.role, "viewFeedback") || can(session.role, "publishFeedback")) {
    items.push({ label: "Feedback", href: "/dashboard/feedback" });
  }
  if (can(session.role, "manageCertificates") || can(session.role, "viewCertificates") || can(session.role, "publishCertificates")) {
    items.push({ label: "Certificates", href: "/dashboard/certificates" });
  }
  if (can(session.role, "assignTrainersManagers")) {
    items.push({ label: "Trainers", href: "/dashboard/trainers" });
  }
  if (can(session.role, "manageVenuesVendors")) {
    items.push({ label: "Venues", href: "/dashboard/venues" });
  }
  if (can(session.role, "viewReports")) {
    items.push({ label: "Reports", href: "/dashboard/reports" });
  }
  if (can(session.role, "manageClients")) {
    items.push({ label: "Clients", href: "/dashboard/clients" });
  }
  if (can(session.role, "manageUsers")) {
    items.push({ label: "Users", href: "/dashboard/users" });
  }
  if (can(session.role, "manageCompanies")) {
    items.push({ label: "Companies", href: "/dashboard/companies" });
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold text-slate-900">CSR Training ERP</p>
        </div>
        <Sidebar items={items} />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div>
            {isGlobalRole(session.role) ? (
              <CompanySwitcher companies={companies} selectedCompanyId={session.viewCompanyId} />
            ) : (
              <div className="text-sm text-slate-500">Signed in as</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{session.name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[session.role] ?? session.role}</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
