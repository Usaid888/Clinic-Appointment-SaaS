export type Organization = {
  id: number;
  name: string;
  timezone: string;
};

export type User = {
  id: number;
  uid: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  orgId: number | null;
};

export type Service = {
  id: number;
  name: string;
  durationMinutes: number;
  price: number;
  orgId: number;
};

export type Appointment = {
  id: number;
  startTime: string;
  endTime: string;
  status: 'BOOKED' | 'CANCELED' | 'COMPLETED';
  patientName: string;
  patientPhone: string;
  serviceId: number;
  orgId: number;
  service?: Service;
};

export type WaitlistEntry = {
  id: number;
  patientName: string;
  phone: string;
  serviceId: number;
  status: 'WAITING' | 'PENDING' | 'CLAIMED' | 'EXPIRED';
  orgId: number;
  service?: Service;
  createdAt: string;
};
