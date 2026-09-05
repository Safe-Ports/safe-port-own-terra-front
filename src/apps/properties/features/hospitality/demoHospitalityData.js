export const demoHospitalityReservations = [
  {id:"stay-1",folio:"OT-H-1042",guestName:"Mariana Salgado",guestEmail:"mariana@demo.mx",guestPhone:"33 5510 8821",unitId:"unit-brisa",checkIn:"2026-08-25",checkOut:"2026-08-28",guests:2,channel:"Directa",nightlyRate:2450,nights:3,total:7350,paid:7350,deposit:1500,status:"checked_in",notes:"Aniversario; preparar detalle de bienvenida."},
  {id:"stay-2",folio:"OT-H-1048",guestName:"Familia Cárdenas",guestEmail:"cardenas@demo.mx",guestPhone:"55 2270 1884",unitId:"unit-pino",checkIn:"2026-08-26",checkOut:"2026-08-30",guests:5,channel:"Booking",nightlyRate:3800,nights:4,total:15200,paid:7600,deposit:2000,status:"confirmed",notes:"Llegada estimada 18:30."},
  {id:"stay-3",folio:"OT-H-1051",guestName:"Luis y Fernanda",guestEmail:"luisf@demo.mx",guestPhone:"81 9012 7711",unitId:"unit-niebla",checkIn:"2026-08-28",checkOut:"2026-08-31",guests:2,channel:"Airbnb",nightlyRate:2950,nights:3,total:8850,paid:8850,deposit:1000,status:"confirmed",notes:"Solicitan leña adicional."},
  {id:"stay-4",folio:"OT-H-1037",guestName:"Claudia Estrada",guestEmail:"claudia@demo.mx",guestPhone:"33 8471 0031",unitId:"unit-roble",checkIn:"2026-08-22",checkOut:"2026-08-25",guests:3,channel:"Directa",nightlyRate:2850,nights:3,total:8550,paid:8550,deposit:1500,status:"checked_out",notes:"Salida completada."},
];

export const demoHousekeeping = [
  {id:"clean-brisa",unitId:"unit-brisa",status:"dirty",assignee:"Lucía",due:"28 ago · 12:00",note:"Salida y nueva llegada el mismo día"},
  {id:"clean-pino",unitId:"unit-pino",status:"ready",assignee:"Marta",due:"26 ago · 15:00",note:"Inspección aprobada"},
  {id:"clean-niebla",unitId:"unit-niebla",status:"cleaning",assignee:"Lucía",due:"28 ago · 14:00",note:"Preparar leña adicional"},
  {id:"clean-roble",unitId:"unit-roble",status:"inspection",assignee:"Raúl",due:"26 ago · 11:00",note:"Revisar humedad junto a chimenea"},
];

export const demoHospitalityRates = [
  {id:"rate-brisa",unitId:"unit-brisa",weekday:2200,weekend:2750,minNights:2,capacity:2},
  {id:"rate-roble",unitId:"unit-roble",weekday:2600,weekend:3200,minNights:2,capacity:4},
  {id:"rate-niebla",unitId:"unit-niebla",weekday:2800,weekend:3450,minNights:2,capacity:4},
  {id:"rate-pino",unitId:"unit-pino",weekday:3400,weekend:4200,minNights:2,capacity:6},
];
