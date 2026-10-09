import propertiesApi from "./propertiesApi";

const data = (request) => request.then((response) => response.data);

export const propertiesService = {
  roles: () => data(propertiesApi.get("/roles")),
  personas: {
    list: (params = {}) => data(propertiesApi.get("/personas", { params: { limit: 2000, ...params } })),
    create: (body) => data(propertiesApi.post("/personas", body)),
    update: (id, body) => data(propertiesApi.patch(`/personas/${id}`, body)),
    archive: (id) => data(propertiesApi.delete(`/personas/${id}`)),
    assignRole: (id, roleId) => data(propertiesApi.post(`/personas/${id}/roles`, { role_id: roleId })),
    removeRole: (id, roleId) => data(propertiesApi.delete(`/personas/${id}/roles/${roleId}`)),
    statement: (id) => data(propertiesApi.get(`/personas/${id}/statement`)),
  },
  properties: {
    list: (params = {}) => data(propertiesApi.get("/properties", { params: { limit: 2000, ...params } })),
    createRoot: (body) => data(propertiesApi.post("/properties/root", body)),
    create: (body) => data(propertiesApi.post("/properties", body)),
    update: (id, body) => data(propertiesApi.patch(`/properties/${id}`, body)),
    archive: (id) => data(propertiesApi.delete(`/properties/${id}`)),
    changeStatus: (id, estado, descripcion) => data(propertiesApi.post(`/properties/${id}/estados`, { estado, descripcion })),
  },
  // Ficha técnica del edificio (una por inmueble). Sin ficha el backend responde
  // 404: se trata como "vacía", no como error.
  specs: {
    get: (inmuebleId) => data(propertiesApi.get(`/inmuebles/${inmuebleId}/specs`)).catch((error) => { if (error.response?.status === 404) return null; throw error; }),
    save: (inmuebleId, body) => data(propertiesApi.put(`/inmuebles/${inmuebleId}/specs`, body)),
  },
  relations: {
    list: (params = {}) => data(propertiesApi.get("/property-relations", { params })),
    create: (body) => data(propertiesApi.post("/property-relations", body)),
    update: (id, body) => data(propertiesApi.patch(`/property-relations/${id}`, body)),
    end: (id, endDate) => data(propertiesApi.post(`/property-relations/${id}/end`, { end_date: endDate || null })),
  },
  communities: {
    list: () => data(propertiesApi.get("/communities")),
    create: (body) => data(propertiesApi.post("/communities", body)),
    update: (id, body) => data(propertiesApi.patch(`/communities/${id}`, body)),
    dashboard: (id) => data(propertiesApi.get(`/communities/${id}/dashboard`)),
    quotaPlans: (id) => data(propertiesApi.get(`/communities/${id}/quota-plans`)),
    createQuotaPlan: (id, body) => data(propertiesApi.post(`/communities/${id}/quota-plans`, body)),
    generateQuota: (communityId, planId, body) => data(propertiesApi.post(`/communities/${communityId}/quota-plans/${planId}/generate`, body)),
  },
  charges: {
    list: (params = {}) => data(propertiesApi.get("/ledger/charges", { params: { limit: 2000, ...params } })),
    create: (body) => data(propertiesApi.post("/ledger/charges", body)),
    settle: (id, body) => data(propertiesApi.post(`/ledger/charges/${id}/settlements`, body)),
    waive: (id, reason) => data(propertiesApi.post(`/ledger/charges/${id}/waive`, { reason })),
    arrears: (communityId) => data(propertiesApi.get("/ledger/arrears", { params: { community_id: communityId } })),
  },
  announcements: {
    list: (communityId) => data(propertiesApi.get(`/communities/${communityId}/announcements`)),
    create: (communityId, body) => data(propertiesApi.post(`/communities/${communityId}/announcements`, body)),
    publish: (id) => data(propertiesApi.post(`/announcements/${id}/publish`)),
    receipts: (id) => data(propertiesApi.get(`/announcements/${id}/receipts`)),
  },
  amenities: {
    list: (communityId) => data(propertiesApi.get(`/communities/${communityId}/amenities`)),
    create: (communityId, body) => data(propertiesApi.post(`/communities/${communityId}/amenities`, body)),
    update: (id, body) => data(propertiesApi.patch(`/amenities/${id}`, body)),
    reservations: (id, params = {}) => data(propertiesApi.get(`/amenities/${id}/reservations`, { params })),
    reserve: (id, body) => data(propertiesApi.post(`/amenities/${id}/reservations`, body)),
    confirm: (id) => data(propertiesApi.post(`/reservations/${id}/confirm`)),
    cancel: (id, reason) => data(propertiesApi.post(`/reservations/${id}/cancel`, { reason })),
    noShow: (id) => data(propertiesApi.post(`/reservations/${id}/no-show`)),
  },
  votes: {
    list: (communityId) => data(propertiesApi.get(`/communities/${communityId}/votes`)),
    create: (communityId, body) => data(propertiesApi.post(`/communities/${communityId}/votes`, body)),
    open: (id) => data(propertiesApi.post(`/votes/${id}/open`)),
    ballot: (id, relationId, optionId) => data(propertiesApi.post(`/votes/${id}/ballots`, { relation_id: relationId, option_id: optionId })),
    close: (id) => data(propertiesApi.post(`/votes/${id}/close`)),
  },
  packages: {
    list: (communityId, params = {}) => data(propertiesApi.get(`/communities/${communityId}/packages`, { params })),
    create: (communityId, body) => data(propertiesApi.post(`/communities/${communityId}/packages`, body)),
    deliver: (id, body) => data(propertiesApi.post(`/packages/${id}/deliver`, body)),
  },
  portalAdmin: {
    identities: () => data(propertiesApi.get("/portal-identities")),
    invite: (body) => data(propertiesApi.post("/portal-identities", body)),
    suspend: (id) => data(propertiesApi.post(`/portal-identities/${id}/suspend`)),
    grants: (id) => data(propertiesApi.get(`/portal-identities/${id}/grants`)),
    grant: (body) => data(propertiesApi.post("/access-grants", body)),
    revoke: (id) => data(propertiesApi.delete(`/access-grants/${id}`)),
  },
  serviceNetwork: {
    specialties: (params = {}) => data(propertiesApi.get("/service-specialties", { params })),
    providers: {
      list: (params = {}) => data(propertiesApi.get("/service-providers", { params })),
      get: (id) => data(propertiesApi.get(`/service-providers/${id}`)),
      create: (body) => data(propertiesApi.post("/service-providers", body)),
      update: (id, body) => data(propertiesApi.patch(`/service-providers/${id}`, body)),
      suspend: (id, reason) => data(propertiesApi.post(`/service-providers/${id}/suspend`, { reason })),
      reactivate: (id) => data(propertiesApi.post(`/service-providers/${id}/reactivate`)),
      archive: (id, reason) => data(propertiesApi.post(`/service-providers/${id}/archive`, { reason })),
      scopes: (id) => data(propertiesApi.get(`/service-providers/${id}/scopes`)),
      addScope: (id, body) => data(propertiesApi.post(`/service-providers/${id}/scopes`, body)),
      endScope: (scopeId) => data(propertiesApi.delete(`/service-provider-scopes/${scopeId}`)),
      contacts: (id) => data(propertiesApi.get(`/service-providers/${id}/contacts`)),
      addContact: (id, body) => data(propertiesApi.post(`/service-providers/${id}/contacts`, body)),
    },
    contacts: {
      update: (id, body) => data(propertiesApi.patch(`/service-provider-contacts/${id}`, body)),
      invite: (id) => data(propertiesApi.post(`/service-provider-contacts/${id}/invite`)),
      resendInvite: (id) => data(propertiesApi.post(`/service-provider-contacts/${id}/resend-invite`)),
      revokeInvite: (id) => data(propertiesApi.post(`/service-provider-contacts/${id}/revoke-invite`)),
      suspend: (id) => data(propertiesApi.post(`/service-provider-contacts/${id}/suspend`)),
      reactivate: (id) => data(propertiesApi.post(`/service-provider-contacts/${id}/reactivate`)),
    },
    enrollmentLinks: {
      list: () => data(propertiesApi.get("/service-enrollment-links")),
      create: (body = {}) => data(propertiesApi.post("/service-enrollment-links", body)),
      revoke: (id) => data(propertiesApi.post(`/service-enrollment-links/${id}/revoke`)),
    },
    applications: {
      list: (params = {}) => data(propertiesApi.get("/service-provider-applications", { params })),
      get: (id) => data(propertiesApi.get(`/service-provider-applications/${id}`)),
      approve: (id, body = {}) => data(propertiesApi.post(`/service-provider-applications/${id}/approve`, body)),
      reject: (id, reason) => data(propertiesApi.post(`/service-provider-applications/${id}/reject`, { reason })),
    },
    // Sin sesión: la pantalla pública de registro de proveedores vive detrás
    // de un enlace de inscripción (token en la URL), no de un login.
    public: {
      info: (token) => data(propertiesApi.get(`/public/service-enrollment/${token}`)),
      apply: (token, body) => data(propertiesApi.post(`/public/service-enrollment/${token}/applications`, body)),
    },
  },
  media: {
    list: (entityType, entityId) => data(propertiesApi.get(`/media/${entityType}/${entityId}`)),
    upload: (entityType, entityId, file) => { const body = new FormData(); body.append("file", file); return data(propertiesApi.post(`/media/${entityType}/${entityId}`, body)); },
    reorder: (entityType, entityId, assetIds) => data(propertiesApi.put(`/media/${entityType}/${entityId}/order`, { asset_ids: assetIds })),
    remove: (assetId) => data(propertiesApi.delete(`/media/asset/${assetId}`)),
  },
};

export default propertiesService;
