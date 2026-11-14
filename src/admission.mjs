import {verifyIdentity} from './index.mjs';
import {checkRevocation} from './revocation.mjs';
// All trust configuration, including the expected scope and epoch floor, comes from the host.
export function admitIdentity(passport,revocation,trust,expected,now) {
  try {
    if (!verifyIdentity(passport,trust.identityKeys,expected,now)) return null;
    if (!checkRevocation(revocation,trust.revocationKey,expected.org,expected.sub,trust.minimumEpoch,now)) return null;
    return Object.freeze({sub:expected.sub,org:expected.org,aud:expected.aud,cap:expected.cap,epoch:revocation.payload.epoch});
  } catch {return null;}
}
