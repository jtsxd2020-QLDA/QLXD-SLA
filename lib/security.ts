import {WorkflowError} from './workflow';
import { createHash, timingSafeEqual } from 'node:crypto';
import { findAdminSession,cloudEnabled,consumeCloudRateLimit } from './persistence';
import type { AuthSession } from './types';
export class ApiError extends Error { constructor(public status:number,message:string,public fields?:Record<string,string>) {super(message);} }
export const COOKIE_NAME='ttxd_admin_session';
export function checkSameOriginRequest(request: Request, mutation=false) {
  const host=request.headers.get('host');
  if (!host) throw new ApiError(403,'Thiếu tên miền yêu cầu.');
  let expectedOrigin:string;
  const configuredOrigin=process.env.TTXD_PUBLIC_ORIGIN;
  if(configuredOrigin){
    let configured:URL;
    try{configured=new URL(configuredOrigin);}catch{throw new ApiError(503,'Cấu hình tên miền của phần mềm không hợp lệ.');}
    if(!['http:','https:'].includes(configured.protocol)||configured.pathname!=='/'||configured.search||configured.hash) throw new ApiError(503,'Cấu hình tên miền không hợp lệ.');
    const deploymentHost=process.env.VERCEL==='1'?process.env.VERCEL_URL:undefined;
    if(configured.host.toLowerCase()===host.toLowerCase())expectedOrigin=configured.origin;
    else if(deploymentHost&&host.toLowerCase()===deploymentHost.toLowerCase())expectedOrigin=`https://${deploymentHost}`;
    else throw new ApiError(403,'Tên miền không thuộc cấu hình của phần mềm.');
  }else if(process.env.VERCEL!=='1'&&/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host)) expectedOrigin=`http://${host}`;
  else throw new ApiError(403,'Tên miền chưa được cấu hình cho phần mềm.');
  const origin=request.headers.get('origin');
  if (origin && origin !== expectedOrigin) throw new ApiError(403,'Nguồn yêu cầu không hợp lệ.');
  if (mutation && !origin) throw new ApiError(403,'Thiếu nguồn yêu cầu.');
  const site=request.headers.get('sec-fetch-site');
  if (site==='cross-site') throw new ApiError(403,'Không cho phép yêu cầu từ trang khác.');
}
export function secureCookie(request:Request){return process.env.TTXD_PUBLIC_ORIGIN?.startsWith('https://')===true||request.headers.get('x-forwarded-proto')?.split(',')[0].trim()==='https'||request.headers.get('origin')?.startsWith('https://')===true||new URL(request.url).protocol==='https:';}
export function sessionToken(request: Request) { return request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE_NAME+'='))?.slice(COOKIE_NAME.length+1) || ''; }
export async function requireSession(request:Request,mutation=false):Promise<AuthSession> {
  checkSameOriginRequest(request,mutation); const token=sessionToken(request), session=token ? await findAdminSession(token):undefined;
  if(!session) throw new ApiError(401,'Vui lòng đăng nhập tài khoản quản lý.');
  if(mutation) {const csrf=request.headers.get('x-csrf-token')||'';const hash=(s:string)=>createHash('sha256').update(s).digest();if(!timingSafeEqual(hash(csrf),hash(session.csrf))) throw new ApiError(403,'Phiên xác nhận không hợp lệ. Vui lòng tải lại trang.');}
  rateLimit('session:'+token, mutation?60:300); return session;
}
const limits=new Map<string,{count:number;until:number}>();
export function clientIP(request:Request){return process.env.VERCEL==='1'?(request.headers.get('x-forwarded-for')?.split(',')[0].trim()||request.headers.get('x-real-ip')||'unknown'):'local-network';}
export async function persistentRateLimit(key:string,max:number,windowMs=60_000){if(cloudEnabled()){if(!await consumeCloudRateLimit(key,max,windowMs))throw new ApiError(429,'Quá nhiều yêu cầu. Vui lòng thử lại sau.');}else rateLimit(key,max,windowMs);}
export function rateLimit(key:string,max:number,windowMs=60_000) {
  const now=Date.now(); if(limits.size>2000) for(const [k,v] of limits) if(v.until<now) limits.delete(k);
  const current=limits.get(key); if(!current || current.until<now) {limits.set(key,{count:1,until:now+windowMs});return;}
  if(++current.count>max) throw new ApiError(429,'Quá nhiều yêu cầu. Vui lòng thử lại sau.');
}
export async function readJson(request:Request):Promise<unknown> {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(415,'Yêu cầu phải dùng JSON.');
  const max=32*1024;const stated=Number(request.headers.get('content-length')||0);if(stated>max) throw new ApiError(413,'Nội dung quá lớn.');
  const reader=request.body?.getReader();if(!reader) throw new ApiError(400,'Thiếu nội dung.');
  let size=0;const chunks:Uint8Array[]=[];
  while(true) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new ApiError(413,'Nội dung quá lớn.');}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ApiError(400,'Nội dung JSON không hợp lệ.');}
}
export function json(data:unknown,status=200,headers?:HeadersInit) {return Response.json({data},{status,headers:{'Cache-Control':'no-store',...headers}});}
export function errorResponse(error:unknown) {
  if(error instanceof WorkflowError)return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});
  if(error instanceof ApiError) return Response.json({error:error.message,...(error.fields?{fields:error.fields}:{})},{status:error.status,headers:{'Cache-Control':'no-store'}});
  if(error instanceof Error && (error.message.includes('UNIQUE constraint failed: permits.duplicate_key')||error.message==='TTXD_DUPLICATE_PERMIT')) return Response.json({error:'Số giấy phép đã tồn tại trong cùng năm và cơ quan cấp.'},{status:409,headers:{'Cache-Control':'no-store'}});
  return Response.json({error:'Không thể xử lý yêu cầu. Vui lòng thử lại.'},{status:500,headers:{'Cache-Control':'no-store'}});
}
