import {act,renderHook} from '@testing-library/react';
import {beforeEach,expect,it} from 'vitest';
import usePendingReceipts from './usePendingReceipts';
beforeEach(()=>sessionStorage.clear());
it('conserva pendientes al regresar sin exponer registros de otra organización o usuario',()=>{
 const user={id:'admin',organization:{id:'org1'}};
 const {result,rerender,unmount}=renderHook(({user})=>usePendingReceipts(user),{initialProps:{user}});
 act(()=>result.current.add({kind:'payment',id:'p1'}));
 rerender({user:{...user,organization:{id:'org2'}}});expect(result.current.issues).toEqual([]);
 rerender({user:{id:'other',organization:{id:'org1'}}});expect(result.current.issues).toEqual([]);
 unmount();
 const recovered=renderHook(()=>usePendingReceipts(user));expect(recovered.result.current.issues).toHaveLength(1);
 act(()=>recovered.result.current.remove({kind:'payment',id:'p1'}));expect(recovered.result.current.issues).toEqual([]);
});
