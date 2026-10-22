import Modal from '../../../shared/components/ui/Modal.jsx';
import { GENDERS } from '../utils/familyConstants.js';
import { formatDate, personName, relationshipLabel, valueOf } from '../utils/familyUtils.js';

export default function MemberDetailsModal({ member, isOwn, onClose }) {
  const details = [
    ['Nombre completo', personName(member)],
    ['Parentesco en esta familia', relationshipLabel(valueOf(member, 'relationship'), valueOf(member, 'customRelationship', 'custom_relationship'))],
    ['Fecha de nacimiento', formatDate(valueOf(member, 'birthDate', 'birth_date'))],
    ['Género', valueOf(member, 'gender') === 'OTRO' ? valueOf(member, 'customGender', 'custom_gender') : (GENDERS.find(([key]) => key === valueOf(member, 'gender'))?.[1] || 'Sin especificar')],
    ['Grupo sanguíneo', valueOf(member, 'bloodType', 'blood_type') || 'Sin especificar'],
    ['Teléfono', valueOf(member, 'phone') || 'Sin registrar'],
    ['Sisbén', valueOf(member, 'sisben') || 'Sin registrar'],
    ['Estrato', valueOf(member, 'stratum') || 'Sin registrar'],
    ['Cuenta', valueOf(member, 'linkedUserId', 'linked_user_id') ? (isOwn ? 'Vinculada a tu cuenta' : 'Cuenta vinculada') : 'Perfil sin cuenta vinculada'],
  ];

  return (
    <Modal title="Detalle del perfil" description="Información personal de la persona y su relación dentro de esta familia." onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1.5 wrap-break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end"><button type="button" className="primary-button" onClick={onClose}>Cerrar detalle</button></div>
    </Modal>
  );
}
