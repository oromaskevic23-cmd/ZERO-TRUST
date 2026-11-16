import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {passportBytes} from '../src/index.mjs';
import {revocationBytes} from '../src/revocation.mjs';
import {RevocationFloor} from '../src/revocation-floor.mjs';

const identity=generateKeyPairSync('ed25519'),revoker=generateKeyPairSync('ed25519'),other=generateKeyPairSync('ed25519');
const scope={sub:'agent',org:'demo',aud:'worker',cap:'read'};
const signed=(payload,bytes,key)=>({payload,signature:sign(null,bytes(payload),key.privateKey).toString('hex')});
const claim=signed({v:1,kid:'id',...scope,iat:100,exp:300},passportBytes,identity);
const snapshot=(epoch,revoked=[],iat=100,key=revoker)=>signed({v:1,org:'demo',epoch,iat,exp:iat+60,revoked},revocationBytes,key);
const trust={identityKeys:new Map([['id',identity.publicKey]]),revocationKey:revoker.publicKey,minimumEpoch:1};
function fixture(fn){const dir=mkdtempSync(join(tmpdir(),'revocation-floor-'));try{fn(join(dir,'floor.db'));}finally{rmSync(dir,{recursive:true,force:true});}}

test('verified admission and revocation survive restart',()=>fixture(path=>{
  let store=new RevocationFloor(path);try{assert.equal(store.admit(claim,snapshot(1),trust,scope,120).sub,'agent');assert.equal(store.admit(claim,snapshot(2,['agent'],110),trust,scope,120),null);}finally{store.close();}
  store=new RevocationFloor(path);try{assert.equal(store.admit(claim,snapshot(1),trust,scope,120),null);assert.equal(store.admit(claim,snapshot(2,['agent'],110),trust,scope,120),null);}finally{store.close();}
}));
test('same epoch cannot silently change the revocation set',()=>fixture(path=>{
  const s=new RevocationFloor(path);try{assert.equal(s.observe(snapshot(2,['agent']),trust,'demo',120),true);assert.equal(s.observe(snapshot(2,[],110),trust,'demo',120),false);assert.equal(s.observe(snapshot(3,[],110),trust,'demo',120),true);}finally{s.close();}
}));
test('older signed snapshot and tampering are rejected',()=>fixture(path=>{
  const s=new RevocationFloor(path);try{assert.equal(s.observe(snapshot(2,[],110),trust,'demo',120),true);assert.equal(s.observe(snapshot(2,[],100),trust,'demo',120),false);const bad=snapshot(3,[],110);bad.payload.revoked.push('agent');assert.equal(s.observe(bad,trust,'demo',120),false);}finally{s.close();}
}));
test('wrong authority, tenant, expired state and untrusted passport fail closed',()=>fixture(path=>{
  const s=new RevocationFloor(path);try{assert.equal(s.observe(snapshot(2,[],100,other),trust,'demo',120),false);assert.equal(s.observe(snapshot(2),trust,'other',120),false);assert.equal(s.observe(snapshot(2),trust,'demo',160),false);assert.equal(s.admit({...claim,signature:'0'.repeat(128)},snapshot(2),trust,scope,120),null);}finally{s.close();}
}));
test('connections share floor and signer changes require explicit rotation',()=>fixture(path=>{
  const a=new RevocationFloor(path),b=new RevocationFloor(path);try{assert.equal(a.observe(snapshot(3),trust,'demo',120),true);assert.equal(b.observe(snapshot(2),trust,'demo',120),false);const changed={...trust,revocationKey:other.publicKey};assert.equal(b.observe(snapshot(4,[],110,other),changed,'demo',120),false);}finally{a.close();b.close();}
}));
test('memory and invalid ranges are rejected',()=>{assert.throws(()=>new RevocationFloor(':memory:'));assert.throws(()=>new RevocationFloor('file::memory:?cache=shared'));assert.throws(()=>revocationBytes({v:1,org:'x'.repeat(129),epoch:1,iat:100,exp:120,revoked:[]}));});
test('storage failure denies admission',()=>fixture(path=>{
  const s=new RevocationFloor(path),db=new DatabaseSync(path);try{db.exec("CREATE TRIGGER reject_floor BEFORE INSERT ON revocation_floor BEGIN SELECT RAISE(ABORT,'failure'); END;");assert.equal(s.admit(claim,snapshot(1),trust,scope,120),null);}finally{db.close();s.close();}
}));
