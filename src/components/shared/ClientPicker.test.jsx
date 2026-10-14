import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {expect,it,vi} from 'vitest';
import ClientPicker from './ClientPicker';
import {clientService} from '@/services/clientService';
vi.mock('@/context/AppContext',()=>({useAppContext:()=>({clients:[],showError:vi.fn()})}));
it('un error de búsqueda ofrece retry sin sugerir que el cliente no existe',async()=>{
 const spy=vi.spyOn(clientService,'list').mockRejectedValueOnce(new Error('network')).mockResolvedValue({items:[{id:'c1',name:'Cliente encontrado'}]});
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ClientPicker onSelect={vi.fn()} /></QueryClientProvider>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Cliente'}});
 await screen.findByRole('alert');expect(screen.queryByText(/Sin coincidencias/)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));
 await screen.findByRole('button',{name:/Cliente encontrado/});expect(spy).toHaveBeenCalledTimes(2);spy.mockRestore();
});
