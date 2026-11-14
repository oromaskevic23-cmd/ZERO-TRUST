import { verify } from 'node:crypto';
const fields = ['v','kid','sub','org','aud','cap','iat','exp'];
export function passportBytes(p) {
  if (!p || Object.keys(p).length !== fields.length || fields.some(k=>!Object.hasOwn(p,k))) throw Error('shape');
  if (p.v!==1 || !['kid','sub','org','aud','cap'].every(k=>typeof p[k]==='string' && p[k].length>0 && p[k].length<=128) || !Number.isSafeInteger(p.iat) || !Number.isSafeInteger(p.exp)) throw Error('fields');
  return Buffer.from('IMPERIAL:passport:v1\n'+JSON.stringify(fields.map(k=>p[k])));
}
export function verifyIdentity(envelope, trustedKeys, expected, now) {
  try {
    const {payload:p, signature:s}=envelope;
    const bytes=passportBytes(p);
    if (!Number.isSafeInteger(now) || p.iat>now || p.exp<=now || p.exp-p.iat>300 || p.exp<=p.iat) return false;
    if (!['sub','org','aud','cap'].every(k=>typeof expected[k]==='string' && expected[k]===p[k])) return false;
    const key=trustedKeys.get(p.kid);
    if (!key || key.asymmetricKeyType!=='ed25519' || typeof s!=='string' || !/^[a-f0-9]{128}$/.test(s)) return false;
    return verify(null,bytes,key,Buffer.from(s,'hex'));
  } catch { return false; }
}
