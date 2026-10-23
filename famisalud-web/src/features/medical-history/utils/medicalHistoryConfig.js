import { Activity, ClipboardCheck, HeartPulse, ShieldAlert } from 'lucide-react';

export const HISTORY_SECTIONS = [
  { id: 'allergies', label: 'Alergias', icon: ShieldAlert, description: 'Alergias conocidas y reacciones registradas.' },
  { id: 'conditions', label: 'Condiciones', icon: HeartPulse, description: 'Diagnósticos y condiciones médicas.' },
  { id: 'vaccines', label: 'Vacunas', icon: ClipboardCheck, description: 'Dosis aplicadas y próximas dosis.' },
  { id: 'vital-signs', label: 'Signos vitales', icon: Activity, description: 'Mediciones registradas a lo largo del tiempo.' },
];

export const SECTION_FIELDS = {
  allergies: [
    { name: 'allergen', label: 'Alergeno', type: 'text', required: true, maxLength: 150, placeholder: 'Ej. Polen, penicilina, maní' },
    { name: 'reaction', label: 'Reacción (opcional)', type: 'textarea', maxLength: 1000, placeholder: 'Describe qué reacción presenta' },
    { name: 'severity', label: 'Severidad', type: 'select', required: true, options: [
      { value: 'LEVE', label: 'Leve' }, { value: 'MODERADA', label: 'Moderada' }, { value: 'GRAVE', label: 'Grave' },
    ] },
  ],
  conditions: [
    { name: 'name', label: 'Condición o diagnóstico', type: 'text', required: true, maxLength: 150, placeholder: 'Ej. Asma' },
    { name: 'diagnosisDate', label: 'Fecha del diagnóstico', type: 'date' },
    { name: 'status', label: 'Estado', type: 'select', required: true, options: [
      { value: 'ACTIVA', label: 'Activa' }, { value: 'EN_TRATAMIENTO', label: 'En tratamiento' }, { value: 'RESUELTA', label: 'Resuelta' },
    ] },
    { name: 'notes', label: 'Notas (opcional)', type: 'textarea', maxLength: 2000, placeholder: 'Observaciones o información adicional' },
  ],
  vaccines: [
    { name: 'vaccineName', label: 'Nombre de la vacuna', type: 'text', required: true, maxLength: 150, placeholder: 'Ej. Influenza' },
    { name: 'dose', label: 'Dosis', type: 'text', maxLength: 50, placeholder: 'Ej. Primera dosis, refuerzo' },
    { name: 'applicationDate', label: 'Fecha de aplicación', type: 'date' },
    { name: 'nextDose', label: 'Próxima dosis', type: 'date' },
    { name: 'provider', label: 'IPS o proveedor', type: 'text', maxLength: 150, placeholder: 'Lugar donde se aplicó' },
  ],
  'vital-signs': [
    { name: 'systolicPressure', label: 'Presión sistólica (mmHg)', type: 'number', min: 1, max: 350, step: 1 },
    { name: 'diastolicPressure', label: 'Presión diastólica (mmHg)', type: 'number', min: 1, max: 250, step: 1 },
    { name: 'heartRate', label: 'Frecuencia cardíaca (lpm)', type: 'number', min: 1, max: 350, step: 1 },
    { name: 'respiratoryRate', label: 'Frecuencia respiratoria (rpm)', type: 'number', min: 1, max: 100, step: 1 },
    { name: 'oxygenSaturation', label: 'Saturación de oxígeno (%)', type: 'number', min: 0, max: 100, step: 0.1 },
    { name: 'bloodGlucose', label: 'Glucosa en sangre (mg/dL)', type: 'number', min: 0, max: 1500, step: 0.1 },
    { name: 'temperature', label: 'Temperatura (°C)', type: 'number', min: 0.1, max: 50, step: 0.1 },
    { name: 'weightKg', label: 'Peso (kg)', type: 'number', min: 0.1, max: 1000, step: 0.1 },
    { name: 'recordedAt', label: 'Fecha y hora del registro', type: 'datetime-local' },
    { name: 'notes', label: 'Notas (opcional)', type: 'textarea', maxLength: 1000, placeholder: 'Contexto de la medición' },
  ],
};

export const RECORD_INITIAL_VALUES = {
  allergies: { allergen: '', reaction: '', severity: 'MODERADA' },
  conditions: { name: '', diagnosisDate: '', status: 'ACTIVA', notes: '' },
  vaccines: { vaccineName: '', dose: '', applicationDate: '', nextDose: '', provider: '' },
  'vital-signs': {
    systolicPressure: '', diastolicPressure: '', heartRate: '', respiratoryRate: '',
    oxygenSaturation: '', bloodGlucose: '', temperature: '', weightKg: '', recordedAt: '', notes: '',
  },
};

export const STATUS_LABELS = {
  ACTIVA: 'Activa', EN_TRATAMIENTO: 'En tratamiento', RESUELTA: 'Resuelta',
  LEVE: 'Leve', MODERADA: 'Moderada', GRAVE: 'Grave',
};
