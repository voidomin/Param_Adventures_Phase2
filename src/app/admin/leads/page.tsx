import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { Users, Mail, Phone, FileText, CalendarDays } from "lucide-react";

function getStatusStyles(status: string) {
  switch (status) {
    case "NEW":
      return "bg-blue-500/10 text-blue-500";
    case "CONTACTED":
      return "bg-yellow-500/10 text-yellow-500";
    case "CONVERTED":
      return "bg-green-500/10 text-green-500";
    default:
      return "bg-foreground/10 text-foreground/60";
  }
}

export default async function AdminLeadsPage() {
  // @ts-ignore - Prisma client needs restart to pick up CustomLead
  const leads = await prisma.customLead.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-black text-foreground">
          Custom Trip Leads
        </h1>
        <p className="text-foreground/60 mt-2">
          Manage incoming requests from the homepage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-wider mb-2">
            Total Leads
          </h3>
          <p className="text-4xl font-black">{leads.length}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-wider mb-2">
            New
          </h3>
          <p className="text-4xl font-black text-primary">
            {leads.filter((l: any) => l.status === "NEW").length}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-foreground/[0.02] border-b border-border text-sm text-foreground/60">
                <th className="p-6 font-semibold">Contact Info</th>
                <th className="p-6 font-semibold">Requirements</th>
                <th className="p-6 font-semibold">Received</th>
                <th className="p-6 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-10 text-center text-foreground/50"
                  >
                    No leads found yet.
                  </td>
                </tr>
              ) : (
                leads.map((lead: any) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-foreground/[0.02] transition-colors"
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
                      <div className="text-sm text-foreground/80 flex items-start gap-2 line-clamp-3">
                        <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          {lead.requirements}
                        </span>
                      </div>
                    </td>
                    <td className="p-6 text-sm text-foreground/60 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        {format(new Date(lead.createdAt), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="p-6">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusStyles(
                          lead.status,
                        )}`}
                      >
                        {lead.status}
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
