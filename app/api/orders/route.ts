import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime="nodejs";
const catalog:Record<string,{name:string;price:number}>={"vel-001":{name:"Amber Veil",price:1890},"vel-002":{name:"Petal No. 5",price:1590},"vel-003":{name:"Santal Dusk",price:2190},"vel-004":{name:"Sunday Linen",price:1290},"vel-005":{name:"Golden Hour",price:1790},"vel-006":{name:"Midnight Cedar",price:1990}};
export async function POST(req:Request){try{
const body=await req.json(),c=body.customer,items=body.items;
if(!c?.name||!c?.email||!c?.phone||!c?.address||!c?.city)return NextResponse.json({error:"Complete all delivery details."},{status:400});
if(!Array.isArray(items)||!items.length||items.length>20)return NextResponse.json({error:"Your bag is empty or invalid."},{status:400});
const checked=items.map((x:{product_id:string;quantity:number})=>{const p=catalog[x.product_id],q=Number(x.quantity);if(!p||!Number.isInteger(q)||q<1||q>20)throw Error("Invalid product or quantity.");return {product_id:x.product_id,name:p.name,unit_price:p.price,quantity:q,line_total:p.price*q}});
const total=checked.reduce((s,x)=>s+x.line_total,0);if(total<=0||total>1000000)return NextResponse.json({error:"Invalid total."},{status:400});
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({error:"Database not configured. Set Supabase environment variables and run supabase/schema.sql."},{status:503});
const db=createClient(url,key,{auth:{persistSession:false}}),orderNumber="VL-"+Date.now().toString().slice(-8);
const {data:order,error}=await db.from("orders").insert({order_number:orderNumber,customer_name:String(c.name).slice(0,120),email:String(c.email).slice(0,200),phone:String(c.phone).slice(0,40),delivery_address:String(c.address).slice(0,500),city:String(c.city).slice(0,120),payment_method:body.payment_method==="online"?"online":"cod",payment_status:"pending",order_status:"pending",total_amount:total,items:checked}).select("id,order_number").single();
if(error||!order){console.error(error?.message);return NextResponse.json({error:"Could not save order. Try again later."},{status:500})}
if(body.payment_method==="online"){
const secret=process.env.PAYMONGO_SECRET_KEY;if(!secret||secret.includes("replace_me"))return NextResponse.json({orderNumber:order.order_number,message:"Order saved but online payment is not configured. Add your PayMongo test secret key."});
const site=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
const payload={data:{attributes:{line_items:checked.map(x=>({currency:"PHP",amount:x.unit_price*100,name:x.name,quantity:x.quantity,description:"Veloura fragrance"})),payment_method_types:["gcash","qrph","card"],description:`Veloura order ${order.order_number}`,success_url:`${site}/?payment=success&order=${order.order_number}`,cancel_url:`${site}/?payment=cancelled&order=${order.order_number}`}}};
const r=await fetch("https://api.paymongo.com/v2/checkout_sessions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Basic "+Buffer.from(secret+":").toString("base64")},body:JSON.stringify(payload)}),data=await r.json(),checkoutUrl=data?.data?.attributes?.checkout_url;
if(!r.ok||!checkoutUrl){console.error(data);return NextResponse.json({error:"Order saved but checkout could not start. Choose COD or contact the shop."},{status:502})}
await db.from("orders").update({payment_reference:data.data.id}).eq("id",order.id);return NextResponse.json({orderNumber:order.order_number,checkoutUrl});
}
return NextResponse.json({orderNumber:order.order_number});
}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unexpected error."},{status:400})}}