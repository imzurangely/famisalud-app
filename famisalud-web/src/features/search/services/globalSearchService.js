import { listFamilyMembers } from '../../family/services/familyMemberService.js';
import { listAppointments } from '../../appointments/services/appointmentsService.js';
import { listDocuments } from '../../documents/services/documentsService.js';
import { listMedications } from '../../medications/services/medicationsService.js';
import { listAllergies } from '../../medical-history/services/allergiesService.js';
import { listConditions } from '../../medical-history/services/conditionsService.js';
import { listVaccines } from '../../medical-history/services/vaccinesService.js';
import { listVitalSigns } from '../../medical-history/services/vitalSignsService.js';

const text = (value) => String(value ?? '').trim();
const lower = (value) => text(value).toLocaleLowerCase('es-CO');

function field(record, camel, snake = camel) {
  return record?.[camel] ?? record?.[snake] ?? null;
}

function personIdOf(member) {
  return field(member, 'personId', 'person_id') ?? field(member?.person, 'id') ?? '';
}

function memberName(member) {
  const person = member?.person ?? member;
  return [field(person, 'firstName', 'first_name'), field(person, 'lastName', 'last_name')]
    .filter(Boolean).join(' ') || 'Perfil sin nombre';
}

function searchableText(record) {
  if (!record || typeof record !== 'object') return lower(record);
  return Object.entries(record)
    .filter(([key, value]) => !/(^id$|_id$|Url$|_url$|password|token|deletedAt|deleted_at)/i.test(key) && value !== null && typeof value !== 'object')
    .map(([, value]) => text(value))
    .join(' ')
    .toLocaleLowerCase('es-CO');
}

function pathFor(type, family, member, record = {}) {
  const params = new URLSearchParams();
  if (family?.id) params.set('familyId', String(family.id));
  if (member?.id) params.set('memberId', String(member.id));
  if (personIdOf(member)) params.set('personId', String(personIdOf(member)));

  let pathname = '/historia-clinica';
  if (type === 'appointment') {
    pathname = '/citas';
    params.set('appointmentId', String(record.id));
  } else if (type === 'medication') {
    pathname = '/medicamentos';
    params.set('medicationId', String(record.id));
  } else if (type === 'document') {
    pathname = '/documentos';
    params.set('documentId', String(record.id));
    const appointmentId = field(record, 'appointmentId', 'appointment_id');
    if (appointmentId) params.set('appointmentId', String(appointmentId));
  } else if (type === 'history') {
    pathname = '/historia-clinica';
    params.set('section', String(record.searchSection));
    params.set('recordId', String(record.id));
  }
  return `${pathname}?${params.toString()}`;
}

function result(type, family, member, record, title, detail, sectionLabel) {
  return {
    id: `${type}:${family.id}:${member.id}:${record?.id ?? 'member'}`,
    type,
    typeLabel: sectionLabel,
    title: title || 'Registro sin título',
    detail: `${memberName(member)} · ${family.name || 'Familia'}` + (detail ? ` · ${detail}` : ''),
    familyId: family.id,
    path: pathFor(type, family, member, record || {}),
    score: 0,
  };
}

function matches(record, query) {
  return searchableText(record).includes(query);
}

async function loadForMember(family, member, query) {
  const requests = await Promise.allSettled([
    listAppointments(member.id),
    listMedications(member.id),
    listDocuments(member.id),
    listAllergies(member.id),
    listConditions(member.id),
    listVaccines(member.id),
    listVitalSigns(member.id),
  ]);
  const [appointments, medications, documents, allergies, conditions, vaccines, vitalSigns] = requests.map((item) => item.status === 'fulfilled' ? item.value : []);
  const output = [];

  if (matches(member, query) || lower(memberName(member)).includes(query)) {
    output.push(result('member', family, member, {}, memberName(member), 'Abrir historia clínica', 'Perfil'));
  }

  for (const item of appointments) {
    if (!matches(item, query)) continue;
    output.push(result('appointment', family, member, item, field(item, 'title') || 'Cita médica', field(item, 'startsAt', 'starts_at') ? new Date(field(item, 'startsAt', 'starts_at')).toLocaleDateString('es-CO') : '', 'Cita'));
  }
  for (const item of medications) {
    if (!matches(item, query)) continue;
    output.push(result('medication', family, member, item, field(item, 'name') || 'Medicamento', field(item, 'presentation') || field(item, 'clinicalStatus', 'clinical_status') || '', 'Medicamento'));
  }
  for (const item of documents) {
    if (!matches(item, query)) continue;
    output.push(result('document', family, member, item, field(item, 'title') || field(item, 'originalFileName', 'original_file_name') || 'Documento', field(item, 'category') || '', 'Documento'));
  }

  const historyGroups = [
    ['allergies', 'Alergia', allergies, (item) => field(item, 'allergen') || 'Alergia'],
    ['conditions', 'Condición médica', conditions, (item) => field(item, 'name') || 'Condición médica'],
    ['vaccines', 'Vacuna', vaccines, (item) => field(item, 'vaccineName', 'vaccine_name') || 'Vacuna'],
    ['vital-signs', 'Signo vital', vitalSigns, () => 'Registro de signos vitales'],
  ];
  for (const [section, label, items, titleOf] of historyGroups) {
    for (const item of items) {
      if (!matches(item, query)) continue;
      output.push(result('history', family, member, { ...item, searchSection: section }, titleOf(item), field(item, 'recordedAt', 'recorded_at') || field(item, 'applicationDate', 'application_date') || '', label));
    }
  }
  return output;
}

/** Busca en los módulos accesibles al usuario, sin crear un endpoint de búsqueda paralelo. */
export async function searchAcrossFamiSalud(value, families = []) {
  const query = lower(value);
  if (query.length < 2) return [];
  const familyResults = await Promise.allSettled(
    families.map(async (family) => ({ family, members: await listFamilyMembers(family.id) })),
  );
  const groups = familyResults.filter((item) => item.status === 'fulfilled').map((item) => item.value);
  if (!groups.length) throw new Error('No pudimos consultar tus espacios. Inténtalo de nuevo.');

  const nested = await Promise.all(groups.flatMap(({ family, members }) =>
    members.map((member) => loadForMember(family, member, query).catch(() => [])),
  ));
  const results = nested.flat().map((item) => ({
    ...item,
    score: lower(item.title).startsWith(query) ? 0 : lower(item.title).includes(query) ? 1 : 2,
  }));
  results.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title, 'es'));
  return results.slice(0, 40);
}
