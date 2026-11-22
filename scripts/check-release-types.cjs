const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const root=process.cwd()
const key=file=>path.resolve(file).toLowerCase()
const tracked=new Set(execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split(/\r?\n/).map(key))
const modified=execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(f=>/\.(ts|tsx|json)$/.test(f))
const originals=new Map(modified.map(f=>[key(f),execFileSync('git',['show',`HEAD:${f.replace(/\\/g,'/')}`],{encoding:'utf8',maxBuffer:8*1024*1024})]))
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile).config
config.include=['**/*.ts','**/*.tsx','next-env.d.ts'];config.exclude=['node_modules','.next','.release-web','out','ios','android']
const parsed=ts.parseJsonConfigFileContent(config,ts.sys,root)
function diagnostics(baseline){
 const host=ts.createCompilerHost({...parsed.options,incremental:false})
 const actualRead=host.readFile.bind(host)
 host.readFile=file=>baseline&&originals.has(key(file))?originals.get(key(file)):actualRead(file)
 const getSource=host.getSourceFile.bind(host)
 host.getSourceFile=(file,languageVersion,...rest)=>baseline&&originals.has(key(file))?ts.createSourceFile(file,originals.get(key(file)),languageVersion,true):getSource(file,languageVersion,...rest)
 const files=baseline?parsed.fileNames.filter(file=>tracked.has(key(file))||path.basename(file)==='next-env.d.ts'):parsed.fileNames
 const program=ts.createProgram(files,{...parsed.options,incremental:false},host)
 return ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?path.relative(root,d.file.fileName).replace(/\\/g,'/'):'',code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}))
}
const baseline=diagnostics(true),current=diagnostics(false)
const signature=d=>`${d.file}:${d.code}:${d.message.replace(/"[^"]+"(?:\s*\|\s*"[^"]+")+/g, value => value.match(/"[^"]+"/g).sort().join(" | "))}`
const prior=new Set(baseline.map(signature));const added=current.filter(d=>!prior.has(signature(d)))
fs.mkdirSync('.release-check',{recursive:true})
fs.writeFileSync('.release-check/type-comparison.json',JSON.stringify({baseline,current,added},null,2))
console.log(`TypeScript: ${baseline.length} baseline errors, ${current.length} current errors, ${added.length} new errors`)
for(const d of added)console.log(`${d.file}: TS${d.code} ${d.message}`)
process.exitCode=added.length?1:0
