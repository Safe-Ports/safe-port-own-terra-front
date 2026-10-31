import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import useChimeOnIncrease from "@/hooks/useChimeOnIncrease";
import { formService } from "@/services/formService";
import { installAudioUnlock } from "@/utils/sounds";

const sumSubmissions = (templates) =>
  (Array.isArray(templates) ? templates : templates?.items || []).reduce((total, t) => total + (t.submission_count || 0), 0);

/**
 * Aviso sonoro de lo que llega mientras usas la app: notificaciones nuevas y
 * respuestas de formularios. Las respuestas de soporte las suena el propio
 * widget de soporte, que es quien sabe cuándo llegan.
 *
 * El backend todavía no crea una notificación por cada respuesta de formulario,
 * así que se vigila el total de respuestas de la lista de formularios.
 */
function NotificationSounds() {
  const { currentUser, authHydrating, notificationCount, canUseFeature } = useAppContext();
  const signedIn = Boolean(currentUser) && !authHydrating;
  useEffect(() => installAudioUnlock(), []);

  const { data: submissions } = useQuery({
    queryKey: ["forms-submission-total"],
    queryFn: () => formService.list().then(sumSubmissions),
    enabled: signedIn && canUseFeature("core.forms"),
    refetchInterval: 60_000,
    retry: 0,
  });

  useChimeOnIncrease(signedIn ? notificationCount : undefined);
  useChimeOnIncrease(submissions);
  return null;
}

export default NotificationSounds;
