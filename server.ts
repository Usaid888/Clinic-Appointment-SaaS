import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { db } from "./src/db/index.ts";
import { users, organizations, appointments, waitlistEntries, services } from "./src/db/schema.ts";
import { eq, and, desc, inArray } from "drizzle-orm";
import twilio from "twilio";
import crypto from "crypto";

// Lazy initialize Twilio to avoid crashes if keys are missing
function getTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.warn("Twilio credentials not found, falling back to mock messaging.");
    return null;
  }
  return twilio(sid, token);
}

const sendWhatsApp = async (to: string, message: string) => {
  const client = getTwilio();
  const from = process.env.TWILIO_PHONE_NUMBER || "+1234567890";
  if (client) {
    try {
      await client.messages.create({
        body: message,
        from: `whatsapp:${from}`,
        to: `whatsapp:${to}`
      });
      console.log(`WhatsApp sent to ${to}`);
    } catch (e) {
      console.error("Twilio error:", e);
    }
  } else {
    console.log(`[MOCK WHATSAPP to ${to}]: ${message}`);
  }
};

const sendSMS = async (to: string, message: string) => {
  const client = getTwilio();
  const from = process.env.TWILIO_PHONE_NUMBER || "+1234567890";
  if (client) {
    try {
      await client.messages.create({
        body: message,
        from,
        to
      });
      console.log(`SMS sent to ${to}`);
    } catch (e) {
      console.error("Twilio error:", e);
    }
  } else {
    console.log(`[MOCK SMS to ${to}]: ${message}`);
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Registration route (upsert user)
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || "";
      
      const result = await db.insert(users)
        .values({ uid, email })
        .onConflictDoUpdate({
          target: users.uid,
          set: { email }
        })
        .returning();
      
      res.json(result[0]);
    } catch (e: any) {
      console.error("Sync error:", e);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // Get current user's organization
  app.get("/api/organization", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const user = await db.query.users.findFirst({
        where: eq(users.uid, uid),
        with: { organization: true }
      });
      res.json(user?.organization || null);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch org" });
    }
  });

  // Create organization
  app.post("/api/organization", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { name } = req.body;
      const org = await db.insert(organizations).values({ name }).returning();
      await db.update(users).set({ orgId: org[0].id, role: 'ADMIN' }).where(eq(users.uid, uid));
      res.json(org[0]);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create org" });
    }
  });

  // Get appointments
  app.get("/api/appointments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const user = await db.query.users.findFirst({ where: eq(users.uid, uid) });
      if (!user?.orgId) return res.status(400).json({ error: "No organization" });

      const appts = await db.query.appointments.findMany({
        where: eq(appointments.orgId, user.orgId),
        with: { service: true }
      });
      res.json(appts);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Waitlist endpoints
  app.get("/api/waitlist", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const user = await db.query.users.findFirst({ where: eq(users.uid, uid) });
      if (!user?.orgId) return res.status(400).json({ error: "No organization" });

      const entries = await db.query.waitlistEntries.findMany({
        where: eq(waitlistEntries.orgId, user.orgId),
        with: { service: true },
        orderBy: [desc(waitlistEntries.createdAt)]
      });
      res.json(entries);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch waitlist" });
    }
  });

  // Services endpoints
  app.get("/api/services", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const user = await db.query.users.findFirst({ where: eq(users.uid, uid) });
      if (!user?.orgId) return res.status(400).json({ error: "No org" });
      
      const srvs = await db.query.services.findMany({ where: eq(services.orgId, user.orgId) });
      res.json(srvs);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/services", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const user = await db.query.users.findFirst({ where: eq(users.uid, uid) });
      if (!user?.orgId) return res.status(400).json({ error: "No org" });

      const { name, durationMinutes, price } = req.body;
      const srv = await db.insert(services).values({
        name, durationMinutes: parseInt(durationMinutes), price: parseInt(price), orgId: user.orgId
      }).returning();
      res.json(srv[0]);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create service" });
    }
  });
  
  app.post("/api/appointments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const user = await db.query.users.findFirst({ where: eq(users.uid, uid) });
      if (!user?.orgId) return res.status(400).json({ error: "No org" });

      const { patientName, patientPhone, serviceId, startTime, endTime } = req.body;
      const appt = await db.insert(appointments).values({
        patientName, patientPhone, serviceId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        orgId: user.orgId,
        status: 'BOOKED'
      }).returning();
      
      await db.insert(waitlistEntries).values({
        patientName, 
        phone: patientPhone, 
        serviceId, 
        orgId: user.orgId, 
        status: 'WAITING',
        createdAt: new Date(startTime)
      });

      res.json(appt[0]);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  app.post("/api/waitlist", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const user = await db.query.users.findFirst({ where: eq(users.uid, uid) });
      if (!user?.orgId) return res.status(400).json({ error: "No org" });

      const { patientName, phone, serviceId } = req.body;
      const entry = await db.insert(waitlistEntries).values({
        patientName, phone, serviceId, orgId: user.orgId
      }).returning();
      res.json(entry[0]);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create waitlist entry" });
    }
  });

  app.put("/api/waitlist/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { status } = req.body;
      const entryId = parseInt(req.params.id);
      
      const user = await db.query.users.findFirst({ where: eq(users.uid, uid) });
      if (!user?.orgId) return res.status(400).json({ error: "No org" });

      const updated = await db.update(waitlistEntries)
        .set({ status })
        .where(and(eq(waitlistEntries.id, entryId), eq(waitlistEntries.orgId, user.orgId)))
        .returning();
        
      res.json(updated[0]);
    } catch(e) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // CANCEL APPOINTMENT -> TRIGGER WAITLIST AUTO-FILL
  app.post("/api/appointments/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const apptId = parseInt(req.params.id);
      
      const user = await db.query.users.findFirst({ where: eq(users.uid, uid), with: { organization: true } });
      if (!user?.orgId) return res.status(400).json({ error: "No org" });

      // Cancel appointment
      await db.update(appointments)
        .set({ status: 'CANCELED' })
        .where(and(eq(appointments.id, apptId), eq(appointments.orgId, user.orgId)));

      const appt = await db.query.appointments.findFirst({ where: eq(appointments.id, apptId), with: { service: true } });
      if (!appt) return res.status(404).json({ error: "Appointment not found" });

      // Get top 3 waitlist patients for this service
      const topPatients = await db.query.waitlistEntries.findMany({
        where: and(
          eq(waitlistEntries.orgId, user.orgId),
          eq(waitlistEntries.status, 'WAITING'),
          eq(waitlistEntries.serviceId, appt.serviceId)
        ),
        orderBy: (entries, { asc }) => [asc(entries.createdAt)],
        limit: 3
      });

      if (topPatients.length > 0) {
        // Generate tokens and send WhatsApp messages
        const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
        
        for (const patient of topPatients) {
          const token = crypto.randomBytes(16).toString("hex");
          await db.update(waitlistEntries)
            .set({ status: 'PENDING', claimToken: token })
            .where(eq(waitlistEntries.id, patient.id));
          
          const claimLink = `${baseUrl}/claim/${token}`;
          const message = `Hello ${patient.patientName}, a last-minute slot opened up at ${user.organization?.name} for ${appt.service.name}! Click here to claim it now: ${claimLink}`;
          
          await sendWhatsApp(patient.phone, message);
        }
      }

      res.json({ success: true, notified: topPatients.length });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  });

  // CLAIM SLOT (Public Route)
  app.post("/api/claim/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const entry = await db.query.waitlistEntries.findFirst({
        where: eq(waitlistEntries.claimToken, token),
        with: { service: true, organization: true }
      });

      if (!entry) return res.status(404).json({ error: "Invalid claim link." });
      if (entry.status === 'CLAIMED') return res.status(400).json({ error: "This slot was already claimed by someone else." });
      if (entry.status !== 'PENDING') return res.status(400).json({ error: "This link is no longer active." });

      // Find other pending patients with same service and org to expire them
      const otherPending = await db.query.waitlistEntries.findMany({
        where: and(
          eq(waitlistEntries.orgId, entry.orgId),
          eq(waitlistEntries.status, 'PENDING'),
          eq(waitlistEntries.serviceId, entry.serviceId)
        )
      });

      // Mark this one as claimed
      await db.update(waitlistEntries)
        .set({ status: 'CLAIMED', claimToken: null })
        .where(eq(waitlistEntries.id, entry.id));

      // Create the new booked appointment
      // For simplicity, we just use the current time as the start time, 
      // in a real system we'd need to link the waitlist entry to the specific cancelled time slot.
      // We will just find the most recently canceled appointment for this service...
      const canceledAppt = await db.query.appointments.findFirst({
        where: and(
          eq(appointments.orgId, entry.orgId),
          eq(appointments.serviceId, entry.serviceId),
          eq(appointments.status, 'CANCELED')
        ),
        orderBy: (appts, { desc }) => [desc(appts.id)]
      });

      if (canceledAppt) {
        await db.update(appointments)
          .set({ 
            status: 'BOOKED', 
            patientName: entry.patientName, 
            patientPhone: entry.phone 
          })
          .where(eq(appointments.id, canceledAppt.id));
      }

      // Notify others
      for (const other of otherPending) {
        if (other.id !== entry.id) {
          await db.update(waitlistEntries)
            .set({ status: 'EXPIRED', claimToken: null })
            .where(eq(waitlistEntries.id, other.id));
          
          await sendSMS(other.phone, `Sorry ${other.patientName}, the slot at ${entry.organization?.name} has just been claimed by someone else. We'll keep you on the waitlist for next time!`);
          
          // Re-queue them as waiting
          await db.insert(waitlistEntries).values({
            patientName: other.patientName,
            phone: other.phone,
            serviceId: other.serviceId,
            orgId: other.orgId,
            status: 'WAITING'
          });
        }
      }

      res.json({ success: true, message: "Slot successfully claimed!" });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to claim slot" });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
