import { DEFAULT_LOCALE } from '../../../shared/constants/app.js';
import { RELATIONSHIPS } from './familyConstants.js';

export function valueOf(item, camel, snake = camel) {
  return item?.[camel] ?? item?.[snake] ?? '';
}

export function relationshipLabel(value, customValue) {
  if (value === 'OTRO') return customValue || 'Otro';
  return RELATIONSHIPS.find(([key]) => key === value)?.[1] || value || 'Sin parentesco';
}

export function personName(person) {
  return [valueOf(person, 'firstName', 'first_name'), valueOf(person, 'lastName', 'last_name')]
    .filter(Boolean).join(' ') || 'Persona sin nombre';
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(DEFAULT_LOCALE, { dateStyle: 'medium' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(DEFAULT_LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
}

export function statusStyle(status) {
  if (status === 'ACEPTADA') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
  if (status === 'RECHAZADA' || status === 'EXPIRADA') return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
}

export function extractFamilyName(invitation) {
  return invitation?.familyName || invitation?.family_name || '';
}
