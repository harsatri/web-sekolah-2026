import bcrypt from 'bcrypt'

const passwords = ['super123', 'kranji123', 'sokanegara123', 'user123']

async function generateHashes() {
  console.log('Generating bcrypt hashes...')
  for (const password of passwords) {
    const hash = await bcrypt.hash(password, 10)
    console.log(`Password: ${password} → Hash: ${hash}`)
  }
}

generateHashes()
