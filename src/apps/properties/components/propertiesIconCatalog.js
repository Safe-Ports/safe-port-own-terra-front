import {
  HiArchiveBox,
  HiArrowLeft,
  HiArrowRight,
  HiBanknotes,
  HiBuildingOffice2,
  HiBuildingStorefront,
  HiChatBubbleLeftRight,
  HiHomeModern,
  HiKey,
  HiMagnifyingGlass,
  HiMegaphone,
  HiOutlineSquares2X2,
  HiPaperAirplane,
  HiPencilSquare,
  HiPlus,
  HiQrCode,
  HiScale,
  HiTag,
  HiTicket,
  HiUserGroup,
  HiWrenchScrewdriver,
  HiXMark,
} from "react-icons/hi2";

// Reuse an action icon only when the action means the same thing. Entity and
// domain icons intentionally stay unique so users can recognize them quickly.
export const PROPERTY_ACTION_ICONS = Object.freeze({
  archive: HiArchiveBox,
  back: HiArrowLeft,
  close: HiXMark,
  create: HiPlus,
  edit: HiPencilSquare,
  open: HiArrowRight,
  search: HiMagnifyingGlass,
  send: HiPaperAirplane,
});

export const PROPERTY_ENTITY_ICONS = Object.freeze({
  access: HiQrCode,
  commercial: HiMegaphone,
  community: HiBuildingStorefront,
  governance: HiScale,
  operations: HiWrenchScrewdriver,
  owner: HiUserGroup,
  payments: HiBanknotes,
  portfolio: HiOutlineSquares2X2,
  property: HiBuildingOffice2,
  relationships: HiChatBubbleLeftRight,
  rent: HiKey,
  sale: HiTag,
  ticket: HiTicket,
  unit: HiHomeModern,
});
