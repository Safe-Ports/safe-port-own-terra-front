import { seedSession, mockCoreEndpoints, API } from './session.js';
export const clients = Array.from({length:130},(_,i)=>({id:`c${i+1}`,name:`Cliente ${String(i+1).padStart(3,'0')}`,email:`cliente${i+1}@example.com`,phone:`+52550000${String(i+1).padStart(4,'0')}`,type:'buyer'}));
export const lots = Array.from({length:30},(_,i)=>({id:`l${i+1}`,code:`N-${i+1}`,inmueble_id:'f1',status:'available',area_m2:200,price_contado:200000,price_financiado:240000}));
export const contracts = Array.from({length:130},(_,i)=>({id:`ct${i+1}`,contract_number:`CT-${String(i+1).padStart(3,'0')}`,type:'sale',client:clients[i],lot:lots[i%30],amount:240000,down_payment:0,status:'active',payments_summary:{paid:1,total:12},total_months:12}));
export const calculator = {id:'calc',name:'Plan aprobado',formula:'CAPITAL * (1 + TASA_ANUAL / 100) / MESES',variables:['CAPITAL','TASA_ANUAL','MESES']};
const paginate=(items,u)=>{const limit=Number(u.searchParams.get('limit')||20),page=Number(u.searchParams.get('page')||1);return {items:items.slice((page-1)*limit,page*limit),total:items.length,page,limit,pages:Math.max(1,Math.ceil(items.length/limit))}};
export async function prepareLands(page, overrides={}) {
 await seedSession(page,overrides); await mockCoreEndpoints(page);
 await page.route(`${API}/**`,async route=>{
  const req=route.request();if(req.method()!=='GET')return route.abort();
  const u=new URL(req.url()),p=u.pathname.replace(/^.*\/api\/v1/,'');let body;
  if(p==='/auth/me')body={user:{id:'u1',name:'Test User',role:'admin',apps:['core','lands'],permissions:[],tours_seen:[],...overrides},organization:{id:'org1',name:'Test Org'}};
  else if(p.startsWith('/appointments'))body=[];
  else if(p==='/clients') { const search=(u.searchParams.get('search')||'').toLowerCase();body=paginate(clients.filter(c=>`${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(search)&&(!u.searchParams.get('type')||c.type===u.searchParams.get('type'))),u); }
  else if(/^\/clients\/[^/]+\/apps$/.test(p))body={apps:['lands']};
  else if(/^\/clients\/[^/]+$/.test(p))body={...clients.find(c=>p.endsWith(`/${c.id}`)),summary:{total_paid:20000,balance:220000,contracts_count:1,overdue_payments:0,pending_payments:11}};
  else if(p.endsWith('/contracts')&&p.startsWith('/clients/'))body={items:contracts.filter(c=>p.includes(`/${c.client.id}/`))};
  else if(p==='/inmuebles')body={items:[{id:'f1',name:'Proyecto Norte',is_archived:false,available:30}],total:1};
  else if(p==='/contracts/releases')body=[];
  else if(/^\/contracts\/[^/]+$/.test(p))body=contracts.find(c=>p.endsWith(`/${c.id}`));
  else if(p==='/contracts')body=paginate(contracts.filter(c=>(!u.searchParams.get('search')||c.contract_number.toLowerCase().includes(u.searchParams.get('search').toLowerCase()))&&(!u.searchParams.get('status')||c.status===u.searchParams.get('status'))&&(!u.searchParams.get('client_id')||c.client.id===u.searchParams.get('client_id'))),u);
  else if(p==='/lots')body={items:lots,total:30,pages:1};
  else if(/^\/lots\/[^/]+$/.test(p))body=lots.find(l=>p.endsWith(`/${l.id}`));
  else if(p==='/document-folders'||p==='/documents/for-entity')body=[];
  else if(p==='/calculators/active')body=calculator;
  else if(p==='/payments'&&u.searchParams.get('contract_id'))body={items:[{id:'p1',installment_n:1,amount:1000,amount_paid:0,status:'pending',due_date:'2026-10-10'}],total:1};
  else return route.fallback();
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body??{})});
 });
}
