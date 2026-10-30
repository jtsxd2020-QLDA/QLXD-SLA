import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {geometryBounds,type BoundaryCollection} from '../lib/geometry';
import {resolveCommune} from '../lib/geo-server';
import type {Position} from '../lib/types';
import {POST} from '../app/api/public/reports/route';

const directory=mkdtempSync(join(tmpdir(),'ttxd-public-report-api-'));
process.env.TTXD_DATA_DIR=directory;
writeFileSync(join(directory,'secret.key'),randomBytes(32),{mode:0o600});
after(()=>rmSync(directory,{recursive:true,force:true}));

function fixture(){
  const data=JSON.parse(readFileSync('geodata/sonla.full.geojson','utf8')) as BoundaryCollection;
  const feature=data.features[0];
  const [[west,south],[east,north]]=geometryBounds(feature.geometry);
  for(let x=1;x<20;x++)for(let y=1;y<20;y++){
    const point:Position={lng:west+(east-west)*x/20,lat:south+(north-south)*y/20};
    const commune=resolveCommune(point);
    if(commune?.code===feature.properties.communeCode)return{point,commune};
  }
  throw new Error('Could not find a stable report location fixture.');
}

test('public report API confirms the destination locality using the validated map location',async()=>{
  process.env.TTXD_STORAGE_BACKEND='sqlite';
  delete process.env.VERCEL;
  delete process.env.TTXD_PUBLIC_ORIGIN;
  const {point,commune}=fixture();
  const response=await POST(new Request('http://localhost/api/public/reports',{
    method:'POST',
    headers:{host:'localhost',origin:'http://localhost','content-type':'application/json'},
    body:JSON.stringify({title:'Phản ánh kiểm thử định tuyến',content:'Nội dung kiểm thử xác nhận nơi tiếp nhận phản ánh.',category:'unlicensed',reporterName:'Người gửi kiểm thử',reporterPhone:'0987654321',address:'Địa chỉ kiểm thử',communeCode:commune.code,lat:point.lat,lng:point.lng}),
  }));
  assert.equal(response.status,201,await response.clone().text());
  const envelope=await response.json() as {data:Record<string,string>};
  assert.equal(envelope.data.communeCode,commune.code);
  assert.equal(envelope.data.communeName,commune.name);
  assert.match(envelope.data.publicCode,/^PA-[A-F0-9]+$/);
  assert.ok(envelope.data.receivedAt);
  assert.deepEqual(Object.keys(envelope.data).sort(),['communeCode','communeName','publicCode','receivedAt']);
  assert.equal(JSON.stringify(envelope).includes('0987654321'),false);
  assert.equal(JSON.stringify(envelope).includes('Người gửi kiểm thử'),false);
});
