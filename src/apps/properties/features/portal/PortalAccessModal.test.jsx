import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import PortalAccessModal from './PortalAccessModal';

const context = vi.hoisted(() => ({
  portalIdentities: [], personUnitRelations: [{personId: 'person', unitId: 'unit', status: 'active'}],
  invitePortal: vi.fn(), grantPortalAccess: vi.fn(), suspendPortal: vi.fn(), revokePortalGrant: vi.fn(), portalGrants: vi.fn(),
}));
vi.mock('@/context/AppContext', () => ({useAppContext: () => ({showToast: vi.fn(), canUseFeature: () => true})}));
vi.mock('../../data/PropertiesDataContext', () => ({usePropertiesData: () => context}));
const person = {id: 'person', name: 'QA Residente', email: 'qa@example.com'};
const setup = () => render(<PortalAccessModal person={person} units={[{id: 'unit', identifier: 'QA Casa'}]} onClose={vi.fn()}/>);

describe('Administración de acceso al portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.portalIdentities = [{id: 'identity', persona_id: 'person', email: 'qa@example.com', status: 'active'}];
    context.portalGrants.mockResolvedValue([]);
  });
  it('muestra fallo de consulta sin presentarlo como ausencia de accesos y permite reintentar', async () => {
    context.portalGrants.mockRejectedValueOnce({response: {data: {error: {message: 'Consulta no disponible'}}}});
    setup(); expect(await screen.findByRole('alert')).toHaveTextContent('Consulta no disponible');
    expect(screen.getByRole('button', {name: 'Dar acceso'})).toBeDisabled();
    expect(screen.queryByText(/No tiene permisos adicionales/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Reintentar accesos'}));
    expect(await screen.findByText(/No tiene permisos adicionales/)).toHaveTextContent('relaciones vigentes');
    expect(screen.getByRole('button', {name: 'Dar acceso'})).toBeEnabled();
  });
  it('no genera un enlace inválido cuando Core devuelve una cuenta ya activa', async () => {
    context.portalIdentities = [];
    context.invitePortal.mockResolvedValue({status: 'active', invite_token: ''});
    setup(); fireEvent.click(screen.getByRole('button', {name: 'Crear invitación'}));
    expect(await screen.findByRole('status')).toHaveTextContent('La cuenta ya está activa');
    expect(screen.queryByRole('button', {name: /Copiar/})).not.toBeInTheDocument();
  });
  it('explica el alcance global de suspensión y cancelar no modifica la cuenta', async () => {
    setup(); await screen.findByText(/No tiene permisos adicionales/);
    fireEvent.click(screen.getByRole('button', {name: 'Suspender'}));
    expect(await screen.findByText(/todas las comunidades y verticales/)).toBeVisible();
    expect(context.suspendPortal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Cancelar', exact: true}));
    await waitFor(() => expect(screen.queryByText(/todas las comunidades y verticales/)).not.toBeInTheDocument());
    expect(context.suspendPortal).not.toHaveBeenCalled();
  });
});
