const assert = require('node:assert/strict')
const {initializeApp, deleteApp} = require('firebase/app')
const {getAuth,connectAuthEmulator,createUserWithEmailAndPassword} = require('firebase/auth')
const {getFirestore,connectFirestoreEmulator,doc,setDoc,getDoc,terminate} = require('firebase/firestore')
const {getStorage,connectStorageEmulator,ref,uploadBytes} = require('firebase/storage')
const admin = require('firebase-admin')
const projectId='demo-servido-release'
assert.equal(process.env.GCLOUD_PROJECT || projectId, projectId)
assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run only through emulators:exec')
assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator is required')
assert.ok(process.env.FIREBASE_STORAGE_EMULATOR_HOST, 'Storage emulator is required')
const seedApp=admin.initializeApp({projectId,storageBucket:`${projectId}.appspot.com`},'release-rules-seed')
const seed=seedApp.firestore()
const sessions=[]
async function session(name){
 const app=initializeApp({projectId,apiKey:'fake-emulator-api-key',storageBucket:`${projectId}.appspot.com`},name)
 const auth=getAuth(app);connectAuthEmulator(auth,`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,{disableWarnings:true})
 const user=(await createUserWithEmailAndPassword(auth,`${name}@example.invalid`,'test-password-123')).user
 const db=getFirestore(app);const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');connectFirestoreEmulator(db,host,Number(port))
 const storage=getStorage(app);const [sh,sp]=process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':');connectStorageEmulator(storage,sh,Number(sp))
 await seed.doc(`users/${user.uid}`).set({uid:user.uid,role:'seller',isActive:true})
 const result={app,auth,uid:user.uid,db,storage};sessions.push(result);return result
}
async function denied(promise,label){await assert.rejects(promise,e=>String(e.code).includes('permission')||String(e.code).includes('unauthorized'),label);console.log('PASS denied:',label)}
async function main(){
 const a=await session('release-a'),b=await session('release-b'),c=await session('release-c')
 const chat={buyerId:a.uid,sellerId:b.uid,participantIds:[a.uid,b.uid],type:'seller'}
 await setDoc(doc(a.db,'chats/test-chat'),chat)
 await setDoc(doc(a.db,'chats/test-chat/messages/before'),{senderId:a.uid,text:'Hola'})
 await denied(setDoc(doc(a.db,`users/${a.uid}/blockedUsers/${b.uid}`),{}),'client cannot forge block records')
 await seed.doc(`users/${a.uid}/blockedUsers/${b.uid}`).set({createdAt:new Date()})
 await denied(setDoc(doc(b.db,'chats/test-chat/messages/blocked'),{senderId:b.uid,text:'Hola'}),'blocked sender cannot contact blocker')
 await denied(setDoc(doc(a.db,'chats/test-chat/messages/blocked-reverse'),{senderId:a.uid,text:'Hola'}),'blocker cannot bypass their own block')
 await denied(setDoc(doc(a.db,'chats/new-blocked'),chat),'blocked chat cannot be recreated')
 await denied(setDoc(doc(a.db,'chats/test-chat'),{...chat,sellerId:c.uid,participantIds:[a.uid,c.uid]}),'participants cannot be swapped to bypass block')
 assert.equal((await getDoc(doc(a.db,`users/${a.uid}/blockedUsers/${b.uid}`))).exists(),true)
 await denied(getDoc(doc(b.db,`users/${a.uid}/blockedUsers/${b.uid}`)),'other users cannot read private block lists')
 await denied(setDoc(doc(a.db,'contentReports/forged'),{authorId:c.uid}),'reports are server-only')
 await denied(setDoc(doc(a.db,`users/${a.uid}`),{uid:a.uid,role:'seller',deleted:true}),'client cannot set deletion state')
 await seed.doc(`users/${a.uid}/blockedUsers/${b.uid}`).delete()
 await setDoc(doc(b.db,'chats/test-chat/messages/unblocked'),{senderId:b.uid,text:'Hola otra vez'})
 await setDoc(doc(a.db,'products/allowed'),{sellerId:a.uid,name:'Mesa',description:'Buen estado'})
 await denied(setDoc(doc(a.db,'products/disallowed'),{sellerId:a.uid,name:'te voy a matar'}),'objectionable publication rejected at write boundary')
 await uploadBytes(ref(a.storage,`users/${a.uid}/profile/test.png`),new Uint8Array([1,2,3]),{contentType:'image/png'})
 await seed.doc(`users/${a.uid}`).update({deletionStatus:'processing'})
 assert.equal((await getDoc(doc(a.db,`users/${a.uid}`))).data().deletionStatus,'processing')
 console.log('PASS interrupted deletion can read its own profile to retry')
 await denied(setDoc(doc(a.db,'products/deleted-user'),{sellerId:a.uid,name:'Mesa'}),'deleting account cannot publish with an old token')
 await denied(uploadBytes(ref(a.storage,`users/${a.uid}/profile/after.png`),new Uint8Array([1,2,3]),{contentType:'image/png'}),'deleting account cannot upload files')
 console.log('PASS emulator rules: chat blocking, privacy, moderation, deletion and storage')
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 await Promise.all(sessions.map(async s=>{await terminate(s.db);await deleteApp(s.app)}));await seedApp.delete()
})
