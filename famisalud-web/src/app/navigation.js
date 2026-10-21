import {
  Bell,
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Pill,
  UsersRound,
} from 'lucide-react';

export const mainNavigation = [
  { label: 'Inicio', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Mi familia', to: '/familia', icon: UsersRound },
  { label: 'Historia clínica', to: '/historia-clinica', icon: HeartPulse },
  { label: 'Medicamentos y trámites', to: '/medicamentos', icon: Pill },
  { label: 'Citas médicas', to: '/citas', icon: CalendarDays },
  { label: 'Documentos', to: '/documentos', icon: FileText },
  { label: 'Notificaciones', to: '/notificaciones', icon: Bell, badge: '3' },
];

export const historySections = [
  { label: 'Resumen clínico', icon: ClipboardList },
  { label: 'Registros médicos', icon: HeartPulse },
];
