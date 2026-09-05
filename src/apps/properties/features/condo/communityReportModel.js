const PERIOD_DAYS={day:1,week:7,month:31,year:366};
const anchor=new Date("2026-08-26T23:59:59");

const inPeriod=(value,period)=>{
  if(!value)return false;
  const date=new Date(value.length===10?`${value}T12:00:00`:value);
  const start=new Date(anchor);start.setDate(start.getDate()-PERIOD_DAYS[period]+1);start.setHours(0,0,0,0);
  return date>=start&&date<=anchor;
};

export const REPORT_PERIOD_LABEL={day:"Hoy",week:"Últimos 7 días",month:"Este mes",year:"Este año"};

export function buildCommunityReport({community,units=[],charges=[],announcements=[],reservations=[],votes=[],services=[],readings=[],tickets=[],people=[],relations=[]},period="month"){
  const propertyUnits=units.filter(item=>item.status!=="archived");
  const occupied=propertyUnits.filter(item=>item.status==="rented").length;
  const billed=charges.filter(item=>inPeriod(item.createdAt,period)).reduce((sum,item)=>sum+item.amount,0);
  const collected=charges.filter(item=>item.status==="paid"&&inPeriod(item.paidAt||item.createdAt,period)).reduce((sum,item)=>sum+item.amount,0);
  const overdue=charges.filter(item=>item.status==="overdue").reduce((sum,item)=>sum+item.amount,0);
  const periodAnnouncements=announcements.filter(item=>inPeriod(item.publishedAt,period));
  const periodReservations=reservations.filter(item=>inPeriod(item.date,period));
  const periodReadings=readings.filter(item=>inPeriod(item.recordedAt,period));
  const periodTickets=tickets.filter(item=>inPeriod(item.updatedAt||item.createdAt,period));
  const activeTickets=tickets.filter(item=>item.status!=="resolved");
  const resolvedTickets=tickets.filter(item=>item.status==="resolved"&&inPeriod(item.updatedAt,period));
  const serviceAmount=services.reduce((sum,item)=>sum+Number(item.amount||0),0);
  const evidencePending=services.filter(item=>item.status==="pending_evidence").length;
  const anomalies=services.filter(item=>item.anomaly||item.status==="incident").length;
  const activePeople=new Set(relations.filter(item=>item.status!=="archived").map(item=>item.personId));
  return {
    communityId:community?.id,
    period,
    units:{total:propertyUnits.length,occupied,available:propertyUnits.filter(item=>item.status==="available").length,maintenance:propertyUnits.filter(item=>item.status==="maintenance").length,occupancy:propertyUnits.length?Math.round(occupied/propertyUnits.length*100):0},
    finance:{billed,collected,overdue,collectionRate:billed?Math.round(collected/billed*100):0},
    utilities:{count:services.length,amount:serviceAmount,evidencePending,anomalies,readings:periodReadings.length,verified:services.filter(item=>item.status==="verified").length},
    maintenance:{active:activeTickets.length,resolved:resolvedTickets.length,urgent:activeTickets.filter(item=>["urgent","high"].includes(item.priority)).length,periodActivity:periodTickets.length},
    community:{people:activePeople.size||people.filter(item=>item.status!=="archived").length,announcements:periodAnnouncements.length,reads:periodAnnouncements.reduce((sum,item)=>sum+item.readCount,0),amenityReservations:periodReservations.length,openVotes:votes.filter(item=>item.status==="open").length},
  };
}

export function trend(current,previous){
  if(!previous)return current?100:0;
  return Math.round((current-previous)/previous*100);
}
