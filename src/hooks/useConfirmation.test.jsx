import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useConfirmation from './useConfirmation';
function Subject({remove}) {
  const {requestConfirmation,confirmationDialog}=useConfirmation();
  return <><button onClick={async()=>{if(await requestConfirmation('Eliminar este registro'))remove()}}>Eliminar</button>{confirmationDialog}</>;
}
describe('Confirmación accesible',()=>{
  it('cancelar conserva el registro y confirmar ejecuta una sola acción',async()=>{
    const remove=vi.fn();render(<Subject remove={remove}/>);
    fireEvent.click(screen.getByRole('button',{name:'Eliminar'}));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Eliminar'}));
    fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));
    await waitFor(()=>expect(remove).toHaveBeenCalledOnce());
  });
  it('salir de la pantalla cancela la acción pendiente',async()=>{
    const remove=vi.fn();const {unmount}=render(<Subject remove={remove}/>);
    fireEvent.click(screen.getByRole('button',{name:'Eliminar'}));unmount();await Promise.resolve();expect(remove).not.toHaveBeenCalled();
  });
});
