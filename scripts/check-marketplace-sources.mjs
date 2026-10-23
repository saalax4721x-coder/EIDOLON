// Reachability audit only. Editorial review is required before changing profile claims/dates.
// Fixed catalog URLs; no user-provided destinations, credentials or scraping of private pages.
import {readFile,writeFile} from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';
const source=await readFile(new URL('../lib/marketplace.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const module={exports:{}};vm.runInNewContext(js,{exports:module.exports,module,URL});
const results=[];
for(const profile of module.exports.marketProfiles){
  let result;try{const response=await fetch(profile.source,{signal:AbortSignal.timeout(15000),redirect:'error',headers:{'User-Agent':'EIDOLON-public-source-check/1.0'}});await response.body?.cancel();result={id:profile.id,source:profile.source,status:response.status,reachable:response.ok};}catch{result={id:profile.id,source:profile.source,status:null,reachable:false};}
  results.push(result);console.log(`${result.id}: ${result.status??'unavailable'}`);
}
const report={checkedAt:new Date().toISOString(),claimReviewPerformed:false,results};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
if(results.some(result=>!result.reachable))process.exitCode=1;
