import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { StringDecoder } from 'node:string_decoder';

const MODEL='custom/deepseek-v4.1-flash';
const clean=value=>String(value??'').replace(/\/_codex-router\/[A-Za-z0-9_-]+(?=\/|\b)/g,'/_codex-router/[REDACTED]').replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g,'[REDACTED]').replace(/(Bearer\s+)[A-Za-z0-9._-]{16,}/gi,'$1[REDACTED]');
const emit=report=>console.log(JSON.stringify(report,null,2));
function fail(message){throw new Error(message);}
function binary(){
  if(process.env.CODEX_BINARY){const p=path.resolve(process.env.CODEX_BINARY);if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;fail('CODEX_BINARY is not an existing executable.');}
  for(const dir of (process.env.PATH??'').split(path.delimiter)){
    const file=path.join(dir,process.platform==='win32'?'codex.exe':'codex');
    if(fs.existsSync(file)&&fs.statSync(file).isFile())return file;
  }
  if(process.platform==='win32'){
    const base=path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'AppData','Local'),'OpenAI','Codex','bin');
    if(fs.existsSync(base)){
      const candidates=fs.readdirSync(base,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>path.join(base,d.name,'codex.exe')).filter(fs.existsSync).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
      if(candidates[0])return candidates[0];
    }
  }
  fail('No Codex CLI executable found in this environment.');
}
function within(root,target){const r=path.relative(root,target);return r===''||(!r.startsWith(`..${path.sep}`)&&r!=='..'&&!path.isAbsolute(r));}
function resolvedTarget(target){if(fs.existsSync(target))return fs.realpathSync(target);const parent=path.dirname(target);return path.join(resolvedTarget(parent),path.basename(target));}

async function main(){
  const [major,minor]=process.versions.node.split('.').map(Number);
  if(major<24||(major===24&&minor<15))fail('Use an existing Node.js 24.15+ runtime; no runtime was installed or changed.');
  const {values:v,positionals}=parseArgs({options:{project:{type:'string'},brief:{type:'string'},'run-dir':{type:'string'},profile:{type:'string',default:'crack-astra-relay'},provider:{type:'string',default:'codex-router-crack-worker'},resume:{type:'string'},'read-only':{type:'boolean',default:false}},allowPositionals:true,strict:true});
  if(positionals.length!==1||!['check','run'].includes(positionals[0]))fail('Use check or run.');
  for(const [k,value] of [['profile',v.profile],['provider',v.provider]])if(!/^[A-Za-z0-9_-]+$/.test(value))fail(`Invalid ${k} name.`);
  if(v.resume&&!/^[a-f0-9-]{36}$/i.test(v.resume))fail('Resume requires a thread UUID.');
  const project=fs.realpathSync(path.resolve(v.project??process.cwd()));
  if(!fs.statSync(project).isDirectory())fail('Project must be a directory.');
  const codexHome=process.env.CODEX_HOME??path.join(os.homedir(),'.codex');
  if(!fs.existsSync(path.join(codexHome,`${v.profile}.config.toml`)))fail('The required standalone workflow profile is missing in this environment; no configuration was created.');
  const exe=binary();
  const env={...process.env,CODEX_HOME:codexHome};
  env.PATH=`${path.dirname(process.execPath)}${path.delimiter}${env.PATH??''}`;
  env.NO_PROXY=['127.0.0.1','localhost','::1',env.NO_PROXY,env.no_proxy].filter(Boolean).join(',');env.no_proxy=env.NO_PROXY;
  delete env.OPENAI_API_KEY;
  const common=['--profile',v.profile,'--model',MODEL,'--cd',project,'-c',`model_provider="${v.provider}"`,'-c','model_reasoning_effort="high"','-c','agents.enabled=false','-c','features.multi_agent_v2.enabled=false'];
  if(positionals[0]==='check'){
    const probe=spawnSync(exe,[...common,'debug','prompt-input'],{cwd:project,env,encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});
    if(probe.error||probe.status!==0)fail(clean(probe.stderr||probe.error?.message||'Native worker configuration did not load.'));
    emit({ok:true,mode:'independent-codex-cli-worker',native_config_loaded:true,requested_model:MODEL,requested_provider:v.provider,requested_effort:'high',profile:v.profile,inference_request_made:false,runtime_route_verified:false});return;
  }
  if(!v.brief||!v['run-dir'])fail('run requires --brief and --run-dir.');
  const briefFile=fs.realpathSync(path.resolve(v.brief));
  const out=resolvedTarget(path.resolve(v['run-dir']));
  if(!within(project,briefFile)||!within(project,out)||out===project)fail('Brief and task output directory must stay inside the project.');
  const relative=path.relative(project,out).split(path.sep);
  if(relative.some(p=>['.git','.codex','node_modules'].includes(p)))fail('Use a task directory outside .git, .codex and node_modules.');
  const brief=fs.readFileSync(briefFile,'utf8').trim();
  if(!brief)fail('The assignment brief is empty.');
  fs.mkdirSync(out,{recursive:true,mode:0o700});
  const eventPath=path.join(out,'worker-events.jsonl');
  for(const name of ['worker-events.jsonl','worker-result.md','worker-run.json'])if(fs.existsSync(path.join(out,name)))fail('Output already exists; use a fresh task directory for each run.');
  const eventFd=fs.openSync(eventPath,'wx',0o600);
  const instruction='You are the DeepSeek implementation Worker for a GPT-6 Astra lead. Follow the assignment and repository AGENTS.md. Work only in assigned paths; preserve existing edits. Implement, test, debug and report evidence for lead acceptance. Do not invoke orchestration skills, delegate, start another coding CLI, change credentials, read credential stores, change model, commit, push or deploy. File scope is an instruction, not an extra sandbox.\n\n';
  const args=['exec',...common,'--skip-git-repo-check','--sandbox',v['read-only']?'read-only':'workspace-write','--color','never','--json'];
  if(v.resume)args.push('resume',v.resume);
  args.push('-');
  let buffer='',sessionId=v.resume??null,lastMessage='',stderr='',exited=false;
  const event=line=>{
    fs.writeSync(eventFd,`${clean(line)}\n`);
    try{const item=JSON.parse(line);if(item.type==='thread.started')sessionId=item.thread_id;
      if(item.type==='item.completed'&&item.item?.type==='agent_message')lastMessage=item.item.text??lastMessage;
    }catch{}
  };
  const child=spawn(exe,args,{cwd:project,env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  const forward=signal=>{if(!exited)child.kill(signal);};
  const onInt=()=>forward('SIGINT'),onTerm=()=>forward('SIGTERM');
  process.once('SIGINT',onInt);process.once('SIGTERM',onTerm);
  const decoder=new StringDecoder('utf8');
  child.stdout.on('data',bytes=>{buffer+=decoder.write(bytes);let i;while((i=buffer.indexOf('\n'))>=0){event(buffer.slice(0,i).replace(/\r$/,''));buffer=buffer.slice(i+1);}});
  child.stderr.on('data',bytes=>{stderr=(stderr+clean(bytes.toString('utf8'))).slice(-12000);});
  child.stdin.on('error',()=>{});child.stdin.end(instruction+brief);
  const result=await new Promise(resolve=>{child.once('error',e=>resolve({code:1,error:clean(e.message)}));child.once('close',(code,signal)=>resolve({code:code??1,signal}));});
  exited=true;process.removeListener('SIGINT',onInt);process.removeListener('SIGTERM',onTerm);
  buffer+=decoder.end();if(buffer.trim())event(buffer.trim());fs.closeSync(eventFd);
  fs.writeFileSync(path.join(out,'worker-result.md'),clean(lastMessage),{flag:'wx',mode:0o600});
  const report={ok:result.code===0&&!!sessionId,mode:'independent-codex-cli-worker',session_id:sessionId,resumed_session:!!v.resume,requested_model:MODEL,requested_provider:v.provider,requested_effort:'high',exit_code:result.code,error:result.error??null,diagnostics:stderr||null,events_file:eventPath,result_file:path.join(out,'worker-result.md'),runtime_route_verified:false,inference_request_made:true};
  fs.writeFileSync(path.join(out,'worker-run.json'),JSON.stringify(report,null,2),{flag:'wx',mode:0o600});
  emit({...report,diagnostics:stderr?clean(stderr).slice(-1800):null});process.exitCode=report.ok?0:1;
}
main().catch(e=>{emit({ok:false,error:clean(e.message),note:'No credentials or global configuration were created or replaced.'});process.exitCode=1;});
