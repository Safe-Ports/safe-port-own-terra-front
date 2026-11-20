import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import LotsCalculator from './LotsCalculator';

const total=()=>screen.getByText(/Te conviene el plan/).parentElement.querySelector('.pp-amount').textContent;
const lotsInput=()=>screen.getByLabelText(/Cuántos lotes/);

it('recomienda Estándar a operaciones chicas y Empresarial a medianas',()=>{
 render(<LotsCalculator initialLots={30}/>);
 expect(screen.getByText(/Te conviene el plan Estándar/)).toBeTruthy();
 expect(total()).toMatch(/\$6,000/);
 fireEvent.change(lotsInput(),{target:{value:'400'}});
 expect(screen.getByText(/Te conviene el plan Empresarial/)).toBeTruthy();
 expect(total()).toMatch(/\$8,000/);
});

it('arriba de 500 suma paquetes con descuento por volumen',()=>{
 render(<LotsCalculator initialLots={1000}/>);
 expect(total()).toMatch(/\$8,840/);
 expect(screen.getByText(/Descuento por operación grande/)).toBeTruthy();
});

it('cotiza hasta 5,000 lotes; más allá pide cotización personalizada',()=>{
 render(<LotsCalculator initialLots={5000}/>);
 const at5000=total();
 fireEvent.change(lotsInput(),{target:{value:'8000'}});
 expect(total()).toBe(at5000);
 expect(screen.getByText(/solicita una cotización personalizada/)).toBeTruthy();
});

it('solicitar cotización entrega el estimado a ventas',()=>{
 const onQuote=vi.fn();
 render(<LotsCalculator initialLots={800} onQuote={onQuote}/>);
 fireEvent.click(screen.getByRole('button',{name:/Solicitar cotización/}));
 expect(onQuote).toHaveBeenCalledWith(expect.objectContaining({requestedLots:800,packages:6,total:8520}));
});
