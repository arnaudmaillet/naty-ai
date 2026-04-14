import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // On essaie juste de compter les utilisateurs
    const count = await prisma.user.count()
    console.log("✅ Connexion réussie !")
    console.log(`Nombre d'utilisateurs en base : ${count}`)
  } catch (e) {
    console.error("❌ Erreur de connexion :")
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()