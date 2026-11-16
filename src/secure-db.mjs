import {openSync,closeSync,lstatSync} from 'node:fs';

// Protects a local file under a trusted parent directory; it is not OS isolation.
export function ensurePrivateDatabaseFile(path) {
  if(typeof path!=='string'||!path||path===':memory:'||path.startsWith('file:'))throw Error('persistent path required');
  try {
    const fd=openSync(path,'wx',0o600);
    closeSync(fd);
  } catch(error) {
    if(error.code!=='EEXIST')throw error;
    const stat=lstatSync(path);
    if(!stat.isFile()||stat.isSymbolicLink())throw Error('regular database file required');
    if(process.platform!=='win32'&&(stat.mode&0o077)!==0)throw Error('database file permissions are too broad');
  }
}
