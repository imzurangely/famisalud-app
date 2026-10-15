import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import familyRoutes from './modules/family/family.routes.js';
import vitalSignsRoutes from './modules/vital-signs/vitalSigns.routes.js';
import epsRoutes from './modules/eps/eps.routes.js';
import emergencyContactsRoutes from './modules/emergency-contacts/emergencyContact.routes.js';
import vaccinesRoutes from './modules/vaccines/vaccine.routes.js';
import conditionsRoutes from './modules/medical-conditions/medicalCondition.routes.js';
import allergiesRoutes from './modules/allergies/allergy.routes.js';
import medicationRoutes from './modules/medications/medication.routes.js';
import medicationProcessRoutes from './modules/medication-process/medicationProcess.routes.js';
import medicalAppointmentRoutes from './modules/medical-appointments/medicalAppointment.routes.js';
import documentRoutes from './modules/documents/document.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import deviceRoutes from './modules/devices/device.routes.js';
import reminderRoutes from './modules/reminders/reminder.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';

export const app = express();

app.disable('x-powered-by');

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/health', async (req, res) => {
  res.json({
    success: true,
    service: 'famisalud-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.use(env.API_PREFIX, authRoutes);
app.use(env.API_PREFIX, familyRoutes);
app.use(env.API_PREFIX, vitalSignsRoutes);
app.use(env.API_PREFIX, epsRoutes);
app.use(env.API_PREFIX, emergencyContactsRoutes);
app.use(env.API_PREFIX, vaccinesRoutes);
app.use(env.API_PREFIX, conditionsRoutes);
app.use(env.API_PREFIX, allergiesRoutes);
app.use(env.API_PREFIX, medicationRoutes);
app.use(env.API_PREFIX, medicationProcessRoutes);
app.use(env.API_PREFIX, medicalAppointmentRoutes);
app.use(env.API_PREFIX, documentRoutes);
app.use(env.API_PREFIX, notificationRoutes);
app.use(env.API_PREFIX, deviceRoutes);
app.use(env.API_PREFIX, reminderRoutes);

app.use(notFound);
app.use(errorHandler);
