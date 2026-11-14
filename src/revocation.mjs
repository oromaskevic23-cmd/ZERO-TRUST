import {verify} from 'node:crypto';
export function revocationBytes(p) {
  if (!p || Object.keys(p).length!==6 || !['v','org','epoch','iat','exp','revoked'].every(k=>Object.hasOwn(p,k)) || p.v!==1 || typeof p.org!=='string' || !p.org || ![p.epoch,p.iat,p.exp].every(Number.isSafeInteger) || p.epoch<0 || p.exp<=p.iat || p.exp-p.iat>60 || !Array.isArray(p.revoked) || p.revoked.length>10000 || p.revoked.some(x=>typeof x!=='string'||!x||x.length>128) || new Set(p.revoked).size!==p.revoked.length) throw Error('snapshot');
  return Buffer.from('IMPERIAL:revocation:v1\n'+JSON.stringify([p.v,p.org,p.epoch,p.iat,p.exp,[...p.revoked].sort()]));
}
// Caller supplies a pinned authority key and independently maintained minimum epoch.
export function checkRevocation(envelope,key,org,subject,minimumEpoch,now) {
  try {
    const {payload:p,signature:s}=envelope, bytes=revocationBytes(p);
    if (key.asymmetricKeyType!=='ed25519'||typeof s!=='string'||!/^[a-f0-9]{128}$/.test(s)||!verify(null,bytes,key,Buffer.from(s,'hex'))) return false;
    if (typeof subject!=='string'||!subject||p.org!==org||!Number.isSafeInteger(minimumEpoch)||minimumEpoch<0||p.epoch<minimumEpoch||!Number.isSafeInteger(now)||now<p.iat||now>=p.exp) return false;
    return !p.revoked.includes(subject);
  } catch {return false;}
}
