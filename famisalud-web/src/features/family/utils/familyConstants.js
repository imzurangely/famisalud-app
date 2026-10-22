import { Mail, Send, ShieldCheck, UsersRound } from 'lucide-react';

export const RELATIONSHIPS = [
  ['YO_MISMO', 'Yo mismo/a'], ['PADRE', 'Padre'], ['MADRE', 'Madre'], ['HIJO', 'Hijo'], ['HIJA', 'Hija'],
  ['HERMANO', 'Hermano'], ['HERMANA', 'Hermana'], ['ABUELO', 'Abuelo'], ['ABUELA', 'Abuela'],
  ['ESPOSO', 'Esposo'], ['ESPOSA', 'Esposa'], ['CUIDADOR', 'Cuidador/a'], ['OTRO', 'Otro'],
];

export const GENDERS = [
  ['MASCULINO', 'Masculino'], ['FEMENINO', 'Femenino'], ['NO_BINARIO', 'No binario'],
  ['OTRO', 'Otro'], ['PREFIERO_NO_DECIR', 'Prefiero no decirlo'],
];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const FAMILY_TABS = [
  { id: 'members', label: 'Miembros', icon: UsersRound },
  { id: 'sent', label: 'Invitaciones enviadas', icon: Send, adminOnly: true },
  { id: 'received', label: 'Invitaciones recibidas', icon: Mail },
  { id: 'admin', label: 'Administración', icon: ShieldCheck, adminOnly: true },
];

export const EMPTY_MEMBER_FORM = {
  firstName: '', lastName: '', relationship: 'HIJO', customRelationship: '', birthDate: '',
  gender: '', customGender: '', bloodType: '', phone: '', sisben: '', stratum: '',
};

export const EMPTY_INVITE_FORM = { email: '', relationship: 'HIJO', customRelationship: '', memberId: '' };
