/* Enlaces para mandar la invitación al portal por WhatsApp o por correo.
 * properties-back todavía no envía correos, así que la administración la
 * manda desde su propio WhatsApp o cliente de correo con el texto ya escrito. */

/** Teléfono → número de wa.me: sólo dígitos; 10 dígitos se asumen de México (52). */
export function whatsappNumber(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  return digits.length >= 11 ? digits : "";
}

export const inviteMessage = ({ name = "", url }) => `Hola${name ? ` ${name.split(" ")[0]}` : ""}, te damos acceso al portal de residentes de Own Terra. Ahí puedes ver tu estado de cuenta, reportar pagos, registrar visitas y recibir avisos. Activa tu cuenta con este enlace (es de un solo uso): ${url}`;

/** Sin número válido abre WhatsApp para elegir el contacto a mano. */
export function whatsappUrl({ phone, text }) {
  const number = whatsappNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl({ email = "", subject, body }) {
  return `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
