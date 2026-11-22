const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

// Compile isolated TS modules with explicit mocks. No Firebase or payment calls.
function load(path, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  const module = { exports: {} }
  const sandbox = { module, exports: module.exports, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name]
    if (name.startsWith('@/') || ['firebase-admin/firestore', 'mercadopago', 'next/server'].includes(name)) throw new Error('Missing mock: '+name)
    return require(name)
  }, console, process: { env: { MERCADOPAGO_ACCESS_TOKEN: 'fake-test-token' } }, Date, Set, Map, Buffer, Request, Response }
  vm.runInNewContext(source, sandbox, { filename: path })
  return module.exports
}
function memoryDb(seed = {}) {
  const records = new Map(Object.entries(seed))
  const snapshot = path => ({ id: path.split('/').at(-1), ref: doc(path), exists: records.has(path), data: () => records.get(path) })
  function query(path, filters = [], max = Infinity) {
    return { where: (field, op, value) => query(path, [...filters, [field, op, value]], max), limit: size => query(path, filters, size),
      get: async () => {
        const prefix = path+'/'
        const docs = [...records.keys()].filter(key => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
          .filter(key => filters.every(([field, op, value]) => op === '==' ? records.get(key)[field] === value : value.includes(records.get(key)[field])))
          .slice(0,max).map(snapshot)
        return { docs, empty: docs.length === 0 }
      }, doc: id => doc(path+'/'+id) }
  }
  function doc(path) {
    return { path, id: path.split('/').at(-1), collection: name => query(path+'/'+name), get: async () => snapshot(path),
      set: async (data, options) => records.set(path, options?.merge ? { ...records.get(path), ...data } : data),
      update: async data => { if(!records.has(path))throw Error('missing document');records.set(path,{...records.get(path),...data}) },
      delete: async () => records.delete(path),
      listCollections: async () => [...new Set([...records.keys()].filter(key=>key.startsWith(path+'/')).map(key=>key.slice(path.length+1).split('/')[0]))].map(name=>query(path+'/'+name)) }
  }
  const db = { collection: query, doc, getAll: async (...refs) => Promise.all(refs.map(ref=>ref.get())),
    recursiveDelete: async ref => { for(const key of records.keys())if(key===ref.path||key.startsWith(ref.path+'/'))records.delete(key) },
    runTransaction: async fn => fn({ get: ref=>ref.get(),set:(ref,data,options)=>ref.set(data,options) }) }
  return { db, records }
}
const fieldValues = { FieldValue: { serverTimestamp: () => new Date(), delete: () => null } }
const policy = load('lib/safety-policy.ts')

test('report validation rejects traversal, unknown kinds and oversized evidence', () => {
  for(const targetId of ['../users/admin','user/name','', 'x'.repeat(129)]) assert.throws(()=>policy.parseReport({kind:'user',targetId,reason:'spam'}))
  assert.throws(()=>policy.parseReport({kind:'unknown',targetId:'valid',reason:'spam'}))
  assert.throws(()=>policy.parseReport({kind:'product',targetId:'valid',reason:'spam',details:'x'.repeat(1001)}))
  assert.equal(policy.parseReport({kind:'product',targetId:'valid-id',reason:'fraud',details:' proof '}).details,'proof')
})

test('report author comes from stored content; private chats require participation', async () => {
  const {db}=memoryDb({'products/p':{sellerId:'seller',name:'item',secret:'must not leak'},'chats/c':{buyerId:'buyer',sellerId:'seller'}})
  const safety=load('lib/safety-server.ts',{'@/lib/firebase-admin':{db,auth:{}},'@/lib/safety-policy':policy})
  const target=await safety.resolveReportTarget('product','p','buyer')
  assert.equal(target.authorId,'seller');assert.equal(target.evidence.secret,undefined)
  await assert.rejects(safety.resolveReportTarget('chat','c','outsider'),/FORBIDDEN/)
  await assert.rejects(safety.resolveReportTarget('product','p','seller'),/INVALID_TARGET/)
})

test('blocking is mutual at the server boundary', async () => {
  const {db}=memoryDb({'users/alice/blockedUsers/bob':{}})
  const safety=load('lib/safety-server.ts',{'@/lib/firebase-admin':{db,auth:{}},'@/lib/safety-policy':policy})
  assert.equal(await safety.hasBlockedInteraction('alice','bob'),true)
  assert.equal(await safety.hasBlockedInteraction('bob','alice'),true)
  assert.equal(await safety.hasBlockedInteraction('alice','carol'),false)
})

test('ordinary users cannot access the moderation queue', async () => {
  const route=load('app/api/admin/content-reports/route.ts',{
    'next/server':{NextResponse:{json:(data, options)=>new Response(JSON.stringify(data),options)}},
    'firebase-admin/firestore':fieldValues,'@/lib/firebase-admin':{},
    '@/lib/lives-auth':{requireBearerUid:async()=>({uid:'buyer'})},'@/lib/safety-policy':policy,
    '@/lib/safety-server':{requireSafetyAdmin:async()=>false},
  })
  assert.equal((await route.GET(new Request('https://test.invalid'))).status,403)
})

function deletionHarness(cancel = async () => {}) {
  const mem=memoryDb({
    'users/u':{uid:'u',role:'seller',email:'private',address:'private',cbu:'private',newPersonalField:'private',restaurantId:'not-owned'},
    'users/u/pushTokens/token':{},'users/u/addresses/address':{},'pushTokenOwners/token':{userId:'u'},
    'products/p':{sellerId:'u'},'products/keep':{sellerId:'other'},'stories/s':{authorId:'u'},
    'lives/l':{sellerId:'u'},'lives/l/messages/m':{text:'private'},'favorites/f':{userId:'u'},
    'follows/f':{userId:'other',targetUserId:'u'},'restaurants/not-owned':{ownerId:'other',name:'keep'},
    'restaurants/owned':{ownerId:'u',address:'private',phone:'private'},'menuItems/item':{restaurantId:'owned'},
    'chats/c':{buyerId:'u',sellerId:'other',buyerName:'Private'},
    'chats/c/messages/own':{senderId:'u',text:'private'},'chats/c/messages/other':{senderId:'other',text:'keep'},
    'purchases/order':{buyerId:'u',status:'paid'},
  })
  const events=[]
  const fn=load('lib/account-deletion.ts',{
    'firebase-admin/firestore':fieldValues,
    '@/lib/firebase-admin':{db:mem.db,auth:{deleteUser:async uid=>events.push('auth:'+uid)},getAdminStorageBucket:()=>({deleteFiles:async ({prefix})=>events.push('storage:'+prefix)})},
    '@/lib/mercadopago-subscriptions':{cancelSubscriptionsForDeletion:async(...args)=>{events.push('cancel');await cancel(...args)}},
  })
  return {...mem,...fn,events}
}

test('deletion cancels billing, erases nested/private data and keeps transactional records', async () => {
  const h=deletionHarness();await h.deleteUserAccount('u')
  const user=h.records.get('users/u')
  assert.equal(user.deleted,true);assert.equal(user.email,undefined);assert.equal(user.cbu,undefined);assert.equal(user.newPersonalField,undefined)
  for(const key of ['users/u/pushTokens/token','users/u/addresses/address','pushTokenOwners/token','products/p','stories/s','lives/l/messages/m','menuItems/item','chats/c/messages/own'])assert.equal(h.records.has(key),false,key)
  assert.equal(h.records.get('restaurants/not-owned').name,'keep')
  assert.equal(h.records.get('restaurants/owned').address,undefined)
  assert.ok(h.records.has('products/keep'));assert.ok(h.records.has('purchases/order'));assert.ok(h.records.has('chats/c/messages/other'))
  assert.equal(h.events[0],'cancel');assert.equal(h.events.at(-1),'auth:u')
  await h.deleteUserAccount('u') // retry must not resurrect data
  assert.equal(h.records.get('users/u').deleted,true)
})

test('failed recurring cancellation leaves account and content intact', async () => {
  const h=deletionHarness(async()=>{throw Error('payment unavailable')})
  await assert.rejects(h.deleteUserAccount('u'),/payment unavailable/)
  assert.equal(h.records.get('users/u').email,'private');assert.ok(h.records.has('products/p'))
  assert.equal(h.events.length,1)
})

test('deletion requires a recent login, even with a freshly issued token', async () => {
  let called=false
  const route=load('app/api/account/delete/route.ts',{
    'next/server':{NextResponse:{json:(data,options)=>new Response(JSON.stringify(data),options)}},
    '@/lib/firebase-admin':{auth:{verifyIdToken:async()=>({uid:'u',auth_time:Math.floor(Date.now()/1000)-3600})}},
    '@/lib/account-deletion':{deleteUserAccount:async()=>{called=true}},
  })
  const response=await route.POST(new Request('https://test.invalid',{method:'POST',headers:{authorization:'Bearer fake'},body:JSON.stringify({confirm:'ELIMINAR'})}))
  assert.equal(response.status,401);assert.equal((await response.json()).code,'REAUTH_REQUIRED');assert.equal(called,false)
})

test('recurring cancellation confirms actual status and includes pending subscriptions', async () => {
  const {db,records}=memoryDb({'subscriptionPreapprovals/pending':{userId:'u'}})
  const calls=[]
  const billing=load('lib/mercadopago-subscriptions.ts',{
    mercadopago:{MercadoPagoConfig:class{},PreApproval:class{async get({id}){return{status:id==='old'?'cancelled':'pending',external_reference:'subscription_u_basic'}}async update({id}){calls.push(id);return{status:'cancelled'}}}},
    '@/lib/firebase-admin':{db,auth:{}},'@/lib/mercadopago':{},
  })
  await billing.cancelSubscriptionsForDeletion('u',{subscription:{preapprovalId:'old'}})
  assert.deepEqual(calls,['pending']);assert.equal(records.get('subscriptionPreapprovals/pending').status,'cancelled')
})

test('late approved payment cannot reactivate a deleted profile', async () => {
  const {db,records}=memoryDb({'users/u':{deleted:true,isActive:false}})
  const billing=load('lib/mercadopago-subscriptions.ts',{
    mercadopago:{MercadoPagoConfig:class{},PreApproval:class{}},'@/lib/firebase-admin':{db,auth:{}},'@/lib/mercadopago':{},
  })
  await billing.activateUserSubscription({userId:'u',paymentId:'late'})
  assert.equal(records.get('users/u').deleted,true);assert.equal(records.get('users/u').isSubscribed,undefined)
  assert.equal(records.has('subscriptions/late'),false)
})

test('baseline text policy rejects threats and preserves ordinary catalog text', () => {
  const policy=load('lib/content-policy.ts')
  assert.equal(policy.isAllowedContentText('Mesa de comedor en buen estado'),true)
  assert.equal(policy.isAllowedContentText('TE VOY A MATAR'),false)
  assert.equal(policy.isAllowedContentText('vou te matar'),false)
  assert.equal(policy.isAllowedContentText('x'.repeat(20001)),false)
})

test('tampered profile cannot cancel another users subscription', async () => {
  const {db}=memoryDb();let changed=false
  const billing=load('lib/mercadopago-subscriptions.ts',{
    mercadopago:{MercadoPagoConfig:class{},PreApproval:class{async get(){return{status:'authorized',external_reference:'subscription_other_basic'}}async update(){changed=true;return{status:'cancelled'}}}},
    '@/lib/firebase-admin':{db,auth:{}},'@/lib/mercadopago':{},
  })
  await assert.rejects(billing.cancelSubscriptionsForDeletion('u',{subscription:{preapprovalId:'someone-else'}}),/no asociada/)
  assert.equal(changed,false)
})

test('ordinary cancellation does not treat a cancellation error as success', async () => {
  const {db,records}=memoryDb({'users/u':{subscription:{preapprovalId:'p'}}})
  const billing=load('lib/mercadopago-subscriptions.ts',{
    mercadopago:{MercadoPagoConfig:class{},PreApproval:class{async get(){return{status:'authorized',external_reference:'subscription_u_basic'}}async update(){throw Error('cannot cancel payment')}}},
    '@/lib/firebase-admin':{db,auth:{verifyIdToken:async()=>({uid:'u'})}},'@/lib/mercadopago':{},
  })
  await assert.rejects(billing.cancelRecurringSubscription(new Request('https://test.invalid',{headers:{authorization:'Bearer fake'}})),/No se pudo cancelar/)
  assert.equal(records.get('users/u').subscription.cancelAtPeriodEnd,undefined)
})
