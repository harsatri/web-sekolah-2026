import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function fixMySQLAuth() {
  console.log('🔧 Memeriksa konfigurasi MySQL autentikasi...')
  
  const host = process.env.MYSQL_HOST || 'localhost'
  const port = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || ''
  
  try {
    // Coba koneksi tanpa database terlebih dahulu
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      authPlugins: {
        mysql_clear_password: () => () => Buffer.from(password + '\0'),
      }
    })
    
    console.log('✅ Berhasil terhubung ke MySQL server!')
    
    // Periksa plugin autentikasi user
    console.log('\n📋 Plugin autentikasi untuk user:', user)
    const [users] = await connection.execute(
      "SELECT user, host, plugin FROM mysql.user WHERE user = ?",
      [user]
    )
    
    console.table(users)
    
    // Ubah ke mysql_native_password jika perlu
    for (const u of users) {
      if (u.plugin !== 'mysql_native_password') {
        console.log(`\n🔄 Mengubah plugin autentikasi untuk ${u.user}@${u.host} menjadi mysql_native_password...`)
        await connection.execute(
          `ALTER USER '${u.user}'@'${u.host}' IDENTIFIED WITH mysql_native_password BY ?`,
          [password]
        )
        await connection.execute('FLUSH PRIVILEGES')
        console.log('✅ Plugin autentikasi berhasil diubah!')
      }
    }
    
    await connection.end()
    console.log('\n🎉 Selesai! Silakan coba jalankan npm run dev kembali.')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Tips: Pastikan MYSQL_USER dan MYSQL_PASSWORD di file .env sudah benar!')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Tips: Pastikan MySQL server sudah berjalan di localhost:3306!')
    }
  }
}

fixMySQLAuth()
