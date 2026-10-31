import propertiesService from "@/services/propertiesService";

// Alta de persona + vínculo como un solo paso. Si el vínculo falla, la persona
// recién creada se archiva: sin esto cada reintento dejaba otra persona sin
// unidad y con datos a medias en el directorio.
export async function withPersona(existingId, d, link) {
  if (existingId) {
    await link(existingId);
    return existingId;
  }
  const person = await propertiesService.personas.create({
    nombre: d.name.trim(),
    correo: d.email?.trim() || null,
    telefono: d.phone?.trim() || null,
    direccion: null,
  });
  try {
    await link(person.id);
  } catch (error) {
    await propertiesService.personas.archive(person.id).catch(() => {});
    throw error;
  }
  return person.id;
}
