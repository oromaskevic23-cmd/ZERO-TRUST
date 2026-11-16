import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,statSync,symlinkSync,writeFileSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RevocationFloor as Store} from '../src/revocation-floor.mjs';
function fixture(fn){const d=mkdtempSync(join(tmpdir(),'private-db-'));try{fn(d);}finally{rmSync(d,{recursive:true,force:true});}}
test('new SQLite database is private on POSIX', {skip:process.platform==='win32'},()=>fixture(d=>{const path=join(d,'db');const s=new Store(path);try{assert.equal(statSync(path).mode&0o077,0);}finally{s.close();}}));
test('symlink database is rejected', {skip:process.platform==='win32'},()=>fixture(d=>{const target=join(d,'target'),link=join(d,'link');writeFileSync(target,'',{mode:0o600});symlinkSync(target,link);assert.throws(()=>new Store(link));}));
test('existing database with broad POSIX permissions is rejected', {skip:process.platform==='win32'},()=>fixture(d=>{const path=join(d,'db');writeFileSync(path,'',{mode:0o600});chmodSync(path,0o644);assert.throws(()=>new Store(path));}));
