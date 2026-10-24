/** Local release tooling: create a private key once without exposing passwords in arguments. */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const key=resolve(root,'keys/real_time-release.jks'),properties=resolve(root,'keystore.properties');
const recover=process.argv.includes('--record-certificate');
if(!recover&&(existsSync(key)||existsSync(properties)))throw new Error('Signing material exists. Refusing to replace it. Use --record-certificate only to recover a missing public fingerprint.');
mkdirSync(dirname(key),{recursive:true,mode:0o700});
const password=recover?/^storePassword=(.+)$/m.exec(readFileSync(properties,'utf8'))?.[1]:randomBytes(32).toString('hex');
if(!password)throw new Error('Existing signing properties are incomplete.');
// keytool reads the secret through the child's environment, never its command line.
if(!recover){
  execFileSync('keytool',['-genkeypair','-keystore',key,'-storetype','JKS','-alias','real_time','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=real_time','-storepass:env','REAL_TIME_KEY_PASSWORD','-keypass:env','REAL_TIME_KEY_PASSWORD'],{env:{...process.env,REAL_TIME_KEY_PASSWORD:password},stdio:['ignore','ignore','pipe']});
  writeFileSync(properties,`# Local signing secrets. Back up this file and keys/ together.\nstoreFile=keys/real_time-release.jks\nstorePassword=${password}\nkeyAlias=real_time\nkeyPassword=${password}\n`,{mode:0o600,flag:'wx'});
}
const certificate=execFileSync('keytool',['-list','-v','-keystore',key,'-alias','real_time','-storepass:env','REAL_TIME_KEY_PASSWORD'],{env:{...process.env,REAL_TIME_KEY_PASSWORD:password},encoding:'utf8'});
const digest=/SHA256:\s*([A-F0-9:]+)/i.exec(certificate)?.[1];
if(!digest)throw new Error('Could not read the signing certificate fingerprint.');
writeFileSync(resolve(root,'signing-certificate.sha256'),digest.replaceAll(':','').toLowerCase()+'\n',{flag:'wx'});
console.log('Local release key created. Back up keys/ and keystore.properties together; they are gitignored.');
