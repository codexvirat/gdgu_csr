import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { encryptAadhaar, encryptPin } from "../src/lib/crypto";
import { buildAttendanceQrValue } from "../src/lib/qrcode";

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = new PrismaClient({ adapter });

async function main() {
  const company = await db.company.create({
    data: { name: "GDGU CSR Foundation", address: "New Delhi, India", gstin: "07ABCDE1234F1Z5" },
  });

  // Second company, used only to prove company A / company B isolation: its Admin must never
  // see anything created under `company` above, and vice versa.
  const companyB = await db.company.create({
    data: { name: "GDGU CSR Foundation — Company B", address: "Mumbai, India", gstin: "27ZYXWV9876G1Z3" },
  });

  const password = await bcrypt.hash("Passw0rd!", 10);

  const [superAdmin, admin, director, manager, pa, adminB] = await Promise.all([
    db.user.create({ data: { companyId: company.id, name: "Sana SuperAdmin", email: "superadmin@gdgucsr.local", passwordHash: password, role: "SUPER_ADMIN" } }),
    db.user.create({ data: { companyId: company.id, name: "Asha Admin", email: "admin@gdgucsr.local", passwordHash: password, role: "ADMIN" } }),
    db.user.create({ data: { companyId: company.id, name: "Devika Director", email: "director@gdgucsr.local", passwordHash: password, role: "DIRECTOR" } }),
    db.user.create({ data: { companyId: company.id, name: "Eshan Manager", email: "manager@gdgucsr.local", passwordHash: password, role: "MANAGER" } }),
    db.user.create({ data: { companyId: company.id, name: "Priya PA", email: "pa@gdgucsr.local", passwordHash: password, role: "PA" } }),
    db.user.create({ data: { companyId: companyB.id, name: "Bilal Admin (Company B)", email: "admin.b@gdgucsr.local", passwordHash: password, role: "ADMIN" } }),
  ]);

  const client = await db.client.create({
    data: {
      companyId: company.id,
      name: "Havells India Ltd.",
      industry: "Electrical Equipment",
      primaryContact: "Rohan Mehta — CSR Lead",
      address: "Noida, Uttar Pradesh",
    },
  });

  const project = await db.project.create({
    data: {
      companyId: company.id,
      clientId: client.id,
      name: "Electrician Skill Upgradation 2026",
      targetCount: 200,
      tradeCategory: "Electrician",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-12-31"),
      status: "ACTIVE",
      budgetTotal: 4_500_000,
      createdById: manager.id,
      cities: {
        create: [
          { city: "Delhi", targetCount: 100 },
          { city: "Pune", targetCount: 100 },
        ],
      },
    },
    include: { cities: true },
  });

  const delhi = project.cities.find((c) => c.city === "Delhi")!;
  const pune = project.cities.find((c) => c.city === "Pune")!;

  const venue = await db.venue.create({
    data: {
      companyId: company.id,
      name: "Community Skill Centre, Rohini",
      address: "Sector 9, Rohini",
      city: "Delhi",
      contactPerson: "Site Caretaker",
      contactPhone: "9810000000",
      capacity: 60,
    },
  });

  const eventDelhi = await db.event.create({
    data: {
      projectId: project.id,
      projectCityId: delhi.id,
      venueId: venue.id,
      name: "Delhi Batch 1",
      eventDateStart: new Date("2026-05-05"),
      eventDateEnd: new Date("2026-05-09"),
      targetCount: 50,
      status: "IN_PROGRESS",
      opsManagerId: manager.id,
    },
  });

  const eventPune = await db.event.create({
    data: {
      projectId: project.id,
      projectCityId: pune.id,
      name: "Pune Batch 1",
      eventDateStart: new Date("2026-06-01"),
      eventDateEnd: new Date("2026-06-05"),
      targetCount: 50,
      status: "SCHEDULED",
      opsManagerId: manager.id,
    },
  });

  const trainerUser = await db.user.create({
    data: { companyId: company.id, name: "Tara Trainer", email: "trainer@gdgucsr.local", passwordHash: password, role: "TRAINER" },
  });
  const trainerProfile = await db.trainer.create({
    data: { companyId: company.id, userId: trainerUser.id, name: "Tara Trainer", skills: "Electrician", status: "ACTIVE" },
  });
  await db.eventTrainer.create({ data: { eventId: eventDelhi.id, trainerId: trainerProfile.id, roleInEvent: "Lead trainer" } });

  const assessment = await db.assessment.create({
    data: {
      projectId: project.id,
      tradeCategory: "Electrician",
      title: "Electrician Safety MCQ",
      passMark: 1,
      totalMarks: 50,
      questions: {
        create: [
          { questionText: "Which PPE is mandatory before working on live wiring?", options: JSON.stringify(["Sunglasses", "Insulated gloves", "Sandals", "None"]), correctOption: "1" },
          { questionText: "What is the standard household voltage in India?", options: JSON.stringify(["110V", "230V", "440V", "12V"]), correctOption: "1" },
        ],
      },
    },
  });
  // Same paper allotted to both batches of this project — Delhi is live for participants,
  // Pune is still in draft until its trainer/manager publishes it.
  await db.eventAssessment.create({ data: { assessmentId: assessment.id, eventId: eventDelhi.id, isPublished: true, publishedAt: new Date() } });
  await db.eventAssessment.create({ data: { assessmentId: assessment.id, eventId: eventPune.id } });

  const feedbackForm = await db.feedbackForm.create({
    data: {
      projectId: project.id,
      title: "Post-training feedback",
      questions: {
        create: [
          { questionText: "How would you rate the trainer?", type: "RATING" },
          { questionText: "Any suggestions for improvement?", type: "TEXT" },
        ],
      },
    },
  });
  await db.eventFeedback.create({ data: { feedbackFormId: feedbackForm.id, eventId: eventDelhi.id, isPublished: true, publishedAt: new Date() } });
  await db.eventFeedback.create({ data: { feedbackFormId: feedbackForm.id, eventId: eventPune.id } });

  const certificateTemplate = await db.certificateTemplate.create({
    data: {
      projectId: project.id,
      tradeCategory: "Electrician",
      title: "Certificate of Completion",
      bodyText: 'This is to certify that {{name}} has successfully completed training in {{tradeCategory}} under the "{{project}}" program at {{event}}, issued on {{date}}.',
      signatoryName: "Rohan Mehta",
      signatoryTitle: "CSR Lead, Havells India Ltd.",
    },
  });
  await db.eventCertificate.create({ data: { certificateTemplateId: certificateTemplate.id, eventId: eventDelhi.id, isPublished: true, publishedAt: new Date() } });
  await db.eventCertificate.create({ data: { certificateTemplateId: certificateTemplate.id, eventId: eventPune.id } });

  const volunteer = await db.user.create({
    data: {
      companyId: company.id,
      name: "Vinod Volunteer",
      email: "volunteer@gdgucsr.local",
      passwordHash: password,
      role: "VOLUNTEER",
      volunteerEventId: eventPune.id,
    },
  });

  const sampleParticipants = [
    { name: "Ramesh Kumar", aadhaar: "234567890123", mobile: "9876543210", event: eventDelhi, checkedIn: true, withPin: true },
    { name: "Suresh Yadav", aadhaar: "234567890124", mobile: "9876543211", event: eventDelhi, checkedIn: true, withPin: false },
    { name: "Geeta Sharma", aadhaar: "234567890125", mobile: "9876543212", event: eventDelhi, checkedIn: false, withPin: false },
    { name: "Vikas Singh", aadhaar: "234567890126", mobile: "9876543213", event: eventPune, checkedIn: false, withPin: false },
  ];

  const traineePin = randomPin();
  await db.event.update({
    where: { id: eventDelhi.id },
    data: { eventPinHash: await bcrypt.hash(traineePin, 10), eventPinEncrypted: encryptPin(traineePin) },
  });

  for (const p of sampleParticipants) {
    const { aadhaarEncrypted, aadhaarHash, aadhaarLast4 } = encryptAadhaar(p.aadhaar);

    const participant = await db.participant.create({
      data: {
        projectId: project.id,
        eventId: p.event.id,
        name: p.name,
        aadhaarEncrypted,
        aadhaarHash,
        aadhaarLast4,
        mobile: p.mobile,
        tradeCategory: "Electrician",
        experienceYears: 2,
        status: p.checkedIn ? "TRAINED" : "REGISTERED",
        registeredById: pa.id,
        managerId: manager.id,
      },
    });

    if (p.checkedIn) {
      await db.attendance.create({
        data: {
          participantId: participant.id,
          eventId: p.event.id,
          checkInAt: new Date(),
          qrCodeValue: buildAttendanceQrValue(participant.id, p.event.id),
          clientUuid: crypto.randomUUID(),
        },
      });
    }
  }

  console.log("Seed complete. Login with any of:");
  for (const u of [superAdmin, admin, director, manager, pa, trainerUser, volunteer, adminB]) {
    console.log(`  ${u.email} / Passw0rd!  (${u.role})`);
  }
  console.log(`  Trainee login: mobile 9876543210 / PIN ${traineePin}  (Ramesh Kumar)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
