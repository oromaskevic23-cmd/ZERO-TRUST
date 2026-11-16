import {DatabaseSync} from 'node:sqlite';
import {createHash,verify} from 'node:crypto';
import {verifyIdentity} from './index.mjs';
import {revocationBytes} from './revocation.mjs';
import {admitIdentity} from './admission.mjs';
import {ensurePrivateDatabaseFile} from './secure-db.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');

// Local monotonic state. The host must protect the DB and trusted key from replacement.
export class RevocationFloor {
  #db;
  constructor(path) {
    ensurePrivateDatabaseFile(path);
    this.#db=new DatabaseSync(path);
    this.#db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS revocation_floor (org TEXT PRIMARY KEY, issuer TEXT NOT NULL, epoch INTEGER NOT NULL, issued_at INTEGER NOT NULL, revoked_hash TEXT NOT NULL) STRICT;');
  }
  observe(envelope,trust,org,now) {
    try {
      const p=structuredClone(envelope.payload),s=envelope.signature,key=trust.revocationKey;
      const bytes=revocationBytes(p);
      if(typeof org!=='string'||p.org!==org||!Number.isSafeInteger(now)||now<p.iat||now>=p.exp||!Number.isSafeInteger(trust.minimumEpoch)||trust.minimumEpoch<0||p.epoch<trust.minimumEpoch)return false;
      if(!key||key.type!=='public'||key.asymmetricKeyType!=='ed25519'||typeof s!=='string'||!/^[a-f0-9]{128}$/.test(s)||!verify(null,bytes,key,Buffer.from(s,'hex')))return false;
      const issuer=hash(key.export({type:'spki',format:'der'}));
      const revokedHash=hash(JSON.stringify([...p.revoked].sort()));
      this.#db.exec('BEGIN IMMEDIATE');
      try {
        const old=this.#db.prepare('SELECT issuer,epoch,issued_at,revoked_hash FROM revocation_floor WHERE org=?').get(org);
        if(old&&(old.issuer!==issuer||p.epoch<old.epoch||p.iat<old.issued_at||(p.epoch===old.epoch&&old.revoked_hash!==revokedHash))){this.#db.exec('ROLLBACK');return false;}
        this.#db.prepare('INSERT INTO revocation_floor(org,issuer,epoch,issued_at,revoked_hash) VALUES(?,?,?,?,?) ON CONFLICT(org) DO UPDATE SET issuer=excluded.issuer,epoch=excluded.epoch,issued_at=excluded.issued_at,revoked_hash=excluded.revoked_hash').run(org,issuer,p.epoch,p.iat,revokedHash);
        this.#db.exec('COMMIT');return true;
      }catch(error){try{this.#db.exec('ROLLBACK');}catch{}throw error;}
    }catch{return false;}
  }
  admit(passport,revocation,trust,expected,now) {
    try {
      const scope=structuredClone(expected),claim=structuredClone(passport),snapshot=structuredClone(revocation);
      if(!verifyIdentity(claim,trust.identityKeys,scope,now)||!this.observe(snapshot,trust,scope.org,now))return null;
      return admitIdentity(claim,snapshot,trust,scope,now);
    }catch{return null;}
  }
  close(){this.#db.close();}
}
