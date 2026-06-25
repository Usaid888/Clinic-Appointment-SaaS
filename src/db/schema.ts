import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['ADMIN', 'STAFF']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['BOOKED', 'CANCELED', 'COMPLETED']);
export const waitlistStatusEnum = pgEnum('waitlist_status', ['WAITING', 'PENDING', 'CLAIMED', 'EXPIRED']);

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').default('UTC'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: roleEnum('role').default('ADMIN'),
  orgId: integer('org_id').references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  price: integer('price').notNull(),
  orgId: integer('org_id').references(() => organizations.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: appointmentStatusEnum('status').default('BOOKED'),
  patientName: text('patient_name').notNull(),
  patientPhone: text('patient_phone').notNull(),
  serviceId: integer('service_id').references(() => services.id).notNull(),
  orgId: integer('org_id').references(() => organizations.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const waitlistEntries = pgTable('waitlist_entries', {
  id: serial('id').primaryKey(),
  patientName: text('patient_name').notNull(),
  phone: text('phone').notNull(),
  serviceId: integer('service_id').references(() => services.id).notNull(),
  status: waitlistStatusEnum('status').default('WAITING'),
  orgId: integer('org_id').references(() => organizations.id).notNull(),
  claimToken: text('claim_token'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const orgRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  services: many(services),
  appointments: many(appointments),
  waitlistEntries: many(waitlistEntries),
}));

export const userRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
}));

export const serviceRelations = relations(services, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [services.orgId],
    references: [organizations.id],
  }),
  appointments: many(appointments),
  waitlistEntries: many(waitlistEntries),
}));

export const appointmentRelations = relations(appointments, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointments.orgId],
    references: [organizations.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));

export const waitlistRelations = relations(waitlistEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [waitlistEntries.orgId],
    references: [organizations.id],
  }),
  service: one(services, {
    fields: [waitlistEntries.serviceId],
    references: [services.id],
  }),
}));
