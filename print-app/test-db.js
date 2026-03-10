const admin = require('firebase-admin')
const fs = require('fs')

const serviceAccount = JSON.parse(fs.readFileSync('./src/main/serviceAccountKey.json', 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

async function test() {
  try {
    const snap = await db.collection('cuaHang').orderBy('ngayTao', 'desc').get()
    console.log("Found", snap.size, "stores")
    snap.docs.forEach(doc => console.log(doc.id, doc.data()))
  } catch(e) {
    console.error("Error querying with orderBy:", e)
  }

  try {
    const snap2 = await db.collection('cuaHang').get()
    console.log("\nFound without orderBy", snap2.size, "stores")
    snap2.docs.forEach(doc => console.log(doc.id, doc.data()))
  } catch(e) {
    console.error("Error querying without orderBy:", e)
  }
}

test()
