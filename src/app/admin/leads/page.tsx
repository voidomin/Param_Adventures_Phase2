import { prisma } from "@/lib/db";
import { LeadStatus } from "@prisma/client";
import { format } from "date-fns";
import {
  Users,
  Mail,
  Phone,
  FileText,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import LeadActions from "./LeadActions";

type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  requirements: string;
  createdAt: Date;
  adminNotes: string | null;
  status: string;
};

function getStatusStyles(status: string) {
  switch (status) {
    case "NEW":
      return "bg-blue-500/10 text-blue-500";
    case "CONTACTED":
      return "bg-yellow-500/10 text-yellow-500";
    case "CONVERTED":
      return "bg-green-500/10 text-green-500";
    case "CLOSED":
      return "bg-gray-500/10 text-gray-500";
    case "DISCARDED":
      return "bg-red-500/10 text-red-500";
    default:
      return "bg-foreground/10 text-foreground/60";
  }
}

export default async function AdminLeadsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ status?: string }>;
}>) {
  const resolvedSearchParams = await searchParams;
  const showAll = resolvedSearchParams.status === "all";
  const hiddenStatuses: LeadStatus[] = ["DISCARDED", "CLOSED"];

  // By default, filter out DISCARDED and CLOSED leads to keep the "front end" clean
  // while keeping them in the DB.
  const leads = await prisma.customLead.findMany({
    where: showAll
      ? {}
      : {
          status: {
            notIn: hiddenStatuses,
          },
        },
    orderBy: { createdAt: "desc" },
  });

  const totalLeads = await prisma.customLead.count();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-black text-foreground uppercase tracking-tight">
            Custom Trip Leads
          </h1>
          <p className="text-foreground/60 mt-2">
            Manage incoming requests and record inquiry results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/leads"
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              showAll
                ? "bg-card border border-border text-foreground hover:bg-foreground/5"
                : "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            }`}
          >
            Active Leads
          </a>
          <a
            href="/admin/leads?status=all"
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              showAll
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-card border border-border text-foreground hover:bg-foreground/5"
            }`}
          >
            All Archive
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-wider mb-2">
            Inbox (Active)
          </h3>
          <p className="text-4xl font-black">{leads.length}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-wider mb-2">
            Total Ever
          </h3>
          <p className="text-4xl font-black text-primary">{totalLeads}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-foreground/2 border-b border-border text-sm text-foreground/60">
                <th className="p-6 font-semibold">Contact Info</th>
                <th className="p-6 font-semibold">Requirements</th>
                <th className="p-6 font-semibold">Admin Notes</th>
                <th className="p-6 font-semibold">Status</th>
                <th className="p-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-foreground/50"
                  >
                    No active leads found. Check the archive or wait for new
                    requests.
                  </td>
                </tr>
              ) : (
                leads.map((lead: LeadRow) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-foreground/2 transition-colors"
                  >
                    <td className="p-6">
                      <div className="font-bold text-foreground mb-1 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        {lead.name}
                      </div>
                      <div className="text-sm text-foreground/60 flex items-center gap-2 mb-1">
                        <Mail className="w-3.5 h-3.5" />
                        <a
                          href={`mailto:${lead.email}`}
                          className="hover:text-primary transition-colors hover:underline"
                        >
                          {lead.email}
                        </a>
                      </div>
                      <div className="text-sm text-foreground/60 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        <a
                          href={`tel:${lead.phone}`}
                          className="hover:text-primary transition-colors hover:underline"
                        >
                          {lead.phone}
                        </a>
                      </div>
                    </td>
                    <td className="p-6 max-w-sm">
                      <div className="text-sm text-foreground/80 flex items-start gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          {lead.requirements}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-foreground/40 uppercase font-black">
                        <CalendarDays className="w-3 h-3" />
                        Received{" "}
                        {format(new Date(lead.createdAt), "MMM d, HH:mm")}
                      </div>
                    </td>
                    <td className="p-6 max-w-xs">
                      {lead.adminNotes ? (
                        <div className="text-sm text-foreground/70 flex items-start gap-2 bg-primary/5 p-3 rounded-xl border border-primary/10">
                          <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="italic">&quot;{lead.adminNotes}&quot;</span>
                        </div>
                      ) : (
                        <span className="text-xs text-foreground/30 italic">
                          No notes yet
                        </span>
                      )}
                    </td>
                    <td className="p-6">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${getStatusStyles(
                          lead.status,
                        )}`}
                      >
                        {lead.status}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end">
                        <LeadActions
                          leadId={lead.id}
                          currentStatus={lead.status}
                          currentNotes={lead.adminNotes || ""}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
