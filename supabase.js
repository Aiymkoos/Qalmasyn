'use strict';
// Lightweight Supabase REST client. It works without an npm build step.
// The public anon key is safe in a frontend; database permissions are defined in supabase.sql.
(function(){
  const config=window.QALMASYN_CONFIG||{};
  const url=String(config.supabaseUrl||'').replace(/\/$/,'');
  const key=String(config.supabaseAnonKey||'');
  const enabled=Boolean(url&&key);
  const headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
  async function request(path,options={}){
    const res=await fetch(url+path,{...options,headers:{...headers,...options.headers}});
    if(!res.ok)throw new Error('Supabase '+res.status);
    if(res.status===204)return null;
    return res.json();
  }
  function fromDb(row){return {...row,oldPrice:row.old_price,pickupStart:row.pickup_start};}
  function toDb(o){return {restaurant:o.restaurant,dish:o.dish,category:o.category,old_price:o.oldPrice,price:o.startPrice??o.price,floor:o.floor||null,portions:o.portions,pickup_start:o.pickupStart,pickup:o.pickup,address:o.address,district:o.district,photo:o.photo||null,description:o.description};}
  window.QalmasynDB={enabled,
    async loadOffers(){const rows=await request('/rest/v1/offers?select=*&order=id.asc');return rows.map(fromDb);},
    async createOffer(offer){const rows=await request('/rest/v1/offers',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(toDb(offer))});return rows[0]?fromDb(rows[0]):null;},
    async createBooking(booking){const rows=await request('/rest/v1/rpc/create_booking',{method:'POST',body:JSON.stringify({p_offer_id:booking.id,p_guest_name:booking.name,p_phone:booking.phone,p_price:booking.price,p_code:booking.code})});return Array.isArray(rows)?rows[0]:rows;},
    async cancelBooking(code){return request('/rest/v1/rpc/cancel_booking',{method:'POST',body:JSON.stringify({p_code:code})});}
  };
})();
