import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import CommunityOnboarding from './CommunityOnboarding';
const api=vi.hoisted(()=>({addProperty:vi.fn(),addUnit:vi.fn(),addCommunity:vi.fn(),showToast:vi.fn()}));
vi.mock('@/context/AppContext',()=>({useAppContext:()=>({showToast:api.showToast})}));
vi.mock('../../data/PropertiesDataContext',()=>({usePropertiesData:()=>api}));
beforeEach(()=>{Object.values(api).forEach(fn=>fn.mockReset());api.addProperty.mockResolvedValue({id:'prop-1',inmuebleId:'root-1'});api.addUnit.mockResolvedValue({id:'unit-1'});});
describe('Alta guiada de comunidad',()=>{
 it('reintenta el último paso sin duplicar el inmueble ni la unidad',async()=>{
  api.addCommunity.mockRejectedValueOnce(new Error('Falló conexión')).mockResolvedValueOnce({id:'community-1'});
  render(<CommunityOnboarding/>);
  for(const [label,value] of [['Nombre de la comunidad','Condominio Norte'],['Dirección','Calle 1'],['Ciudad o municipio','Monterrey'],['Estado','Nuevo León']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
  fireEvent.click(screen.getByRole('button',{name:/Continuar/}));await waitFor(()=>expect(screen.getByRole('button',{name:/Es una sola unidad/})).toBeVisible());
  fireEvent.click(screen.getByRole('button',{name:/Es una sola unidad/}));fireEvent.change(screen.getByLabelText('Identificador de la unidad'),{target:{value:'Casa 1'}});
  fireEvent.click(screen.getByRole('button',{name:/Continuar/}));await waitFor(()=>expect(screen.getByRole('button',{name:/Crear comunidad/})).toBeVisible());
  fireEvent.click(screen.getByRole('button',{name:/Crear comunidad/}));expect(await screen.findByRole('alert')).toBeVisible();
  expect(api.addProperty).toHaveBeenCalledOnce();expect(api.addUnit).toHaveBeenCalledOnce();expect(screen.getByRole('button',{name:/Atrás/})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:/Crear comunidad/}));await waitFor(()=>expect(api.addCommunity).toHaveBeenCalledTimes(2));
  expect(api.addProperty).toHaveBeenCalledOnce();expect(api.addUnit).toHaveBeenCalledOnce();expect(api.addUnit.mock.invocationCallOrder[0]).toBeLessThan(api.addCommunity.mock.invocationCallOrder[0]);
 });
});
