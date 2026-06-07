import {
  HiBellAlert,
  HiCalculator,
  HiChartBarSquare,
  HiChatBubbleLeftRight,
  HiCalendarDays,
  HiCog6Tooth,
  HiDocumentDuplicate,
  HiHome,
  HiMap,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
  HiTicket,
  HiSun,
  HiUserCircle,
  HiWallet
} from "react-icons/hi2";

export const routeMeta = {
  "/ecosistema": { title: "Ecosistema", icon: HiHome },
  "/ecosistema/mi-dia": { title: "Mi Día", icon: HiSun },
  "/ecosistema/agenda": { title: "Calendario", icon: HiCalendarDays },
  "/dashboard": { title: "Dashboard", icon: HiHome },
  "/lotes": { title: "Lotes", icon: HiOutlineSquares2X2 },
  "/fraccionamientos": { title: "Fraccionamientos", icon: HiMap },
  "/clientes": { title: "Clientes", icon: HiOutlineUserGroup },
  "/ventas": { title: "Contratos", icon: HiWallet },
  "/contratos": { title: "Contratos", icon: HiWallet },
  "/documentos": { title: "Documentos", icon: HiDocumentDuplicate },
  "/alertas": { title: "Alertas", icon: HiBellAlert },
  "/asistente": { title: "Asistente", icon: HiChatBubbleLeftRight },
  "/bot-analytics": { title: "Bot Analytics", icon: HiChartBarSquare },
  "/pagos": { title: "Pagos", icon: HiBellAlert },
  "/tickets-soporte": { title: "Tickets de Soporte", icon: HiTicket },
  "/calculadora": { title: "Calculadora", icon: HiCalculator },
  "/perfil": { title: "Perfil", icon: HiUserCircle },
  "/configuracion": { title: "Configuración", icon: HiCog6Tooth },
};

export const desktopNav = [
  { path: "/ecosistema", label: "Ecosistema", icon: HiHome },
  { path: "/ecosistema/mi-dia", label: "Mi Día", icon: HiSun },
  { path: "/ecosistema/agenda", label: "Calendario", icon: HiCalendarDays },
  { path: "/dashboard", label: "Dashboard", icon: HiHome },
  { path: "/lotes", label: "Lotes", icon: HiOutlineSquares2X2 },
  { path: "/fraccionamientos", label: "Fraccionamientos", icon: HiMap },
  { path: "/clientes", label: "Clientes", icon: HiOutlineUserGroup },
  { path: "/contratos", label: "Contratos", icon: HiWallet },
  { path: "/documentos", label: "Documentos", icon: HiDocumentDuplicate },
  { path: "/pagos", label: "Pagos", icon: HiBellAlert },
  { path: "/asistente", label: "Asistente", icon: HiChatBubbleLeftRight },
  { path: "/bot-analytics", label: "Bot Analytics", icon: HiChartBarSquare },
  { path: "/tickets-soporte", label: "Tickets", icon: HiTicket },
  { path: "/calculadora", label: "Calculadora", icon: HiCalculator },
  { path: "/perfil", label: "Perfil", icon: HiUserCircle },
];

export const mobileNav = [
  { path: "/ecosistema/mi-dia", label: "Mi Día", icon: HiSun },
  { path: "/ecosistema/agenda", label: "Agenda", icon: HiCalendarDays },
  { path: "/dashboard", label: "Inicio", icon: HiHome },
  { path: "/lotes", label: "Lotes", icon: HiOutlineSquares2X2 },
  { path: "/clientes", label: "Clientes", icon: HiOutlineUserGroup },
  { path: "/pagos", label: "Pagos", icon: HiBellAlert },
  { path: "/perfil", label: "Perfil", icon: HiUserCircle },
];

export const secondaryMobileRoutes = [
  { path: "/ventas", label: "Ventas", icon: HiWallet },
  { path: "/contratos", label: "Contratos", icon: HiWallet },
  { path: "/documentos", label: "Documentos", icon: HiDocumentDuplicate },
  { path: "/fraccionamientos", label: "Fraccionamientos", icon: HiMap },
  { path: "/calculadora", label: "Calculadora", icon: HiCalculator },
  { path: "/asistente", label: "Asistente", icon: HiChatBubbleLeftRight },
  { path: "/bot-analytics", label: "Bot Analytics", icon: HiChartBarSquare },
  { path: "/tickets-soporte", label: "Tickets", icon: HiTicket },
  { path: "/configuracion", label: "Configuración", icon: HiCog6Tooth },
];
