import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge, Card } from "@/components/ui";

export default async function VerifyCertificatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const certificate = await db.certificate.findUnique({
    where: { verifyToken: token },
    include: { participant: true, event: { include: { project: true } } },
  });
  if (!certificate) notFound();

  const valid = certificate.status === "ACTIVE";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <Badge tone={valid ? "green" : "red"}>{valid ? "Valid certificate" : "Revoked"}</Badge>
        <h1 className="mt-3 text-lg font-semibold text-slate-900">{certificate.participant.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {certificate.event.project.name} · {certificate.event.name}
        </p>
        <p className="mt-3 text-xs text-slate-400">Certificate No: {certificate.certificateNumber}</p>
        <p className="text-xs text-slate-400">Issued {certificate.issuedAt.toLocaleDateString()}</p>
      </Card>
    </div>
  );
}
