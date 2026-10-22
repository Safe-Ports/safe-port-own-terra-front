export const COMMUNITY_IMAGES = [
  {
    "src": "/properties/community-images/comunidad-1.jpg",
    "filename": "1625338881.jpg",
    "label": "Imagen 1"
  },
  {
    "src": "/properties/community-images/comunidad-2.jpg",
    "filename": "1636406582.jpg",
    "label": "Imagen 2"
  },
  {
    "src": "/properties/community-images/comunidad-3.jpg",
    "filename": "378070762.jpg",
    "label": "Imagen 3"
  },
  {
    "src": "/properties/community-images/comunidad-4.jpg",
    "filename": "8d49e1f42a25f39552b52fa6de90477e.jpg",
    "label": "Imagen 4"
  },
  {
    "src": "/properties/community-images/comunidad-5.jpg",
    "filename": "Ley-de-condominios-scaled-1.jpg",
    "label": "Imagen 5"
  },
  {
    "src": "/properties/community-images/comunidad-6.jpeg",
    "filename": "images (1).jpeg",
    "label": "Imagen 6"
  },
  {
    "src": "/properties/community-images/comunidad-7.jpeg",
    "filename": "images.jpeg",
    "label": "Imagen 7"
  }
];

// Selección estable: la referencia no cambia al recargar ni reemplaza una foto guardada.
export const communityReferenceImage = id => COMMUNITY_IMAGES[[...String(id || "comunidad")].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 17) % COMMUNITY_IMAGES.length];
