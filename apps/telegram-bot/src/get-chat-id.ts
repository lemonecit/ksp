/**
 * Enkel bot som visar ditt chat ID när du skriver till den
 */

import { Telegraf } from 'telegraf'

const BOT_TOKEN = '8126807418:AAEPb8GWZkA4QeZL05vq-TAdM9Kub5GGWgY'
const bot = new Telegraf(BOT_TOKEN)

bot.on('message', (ctx) => {
  const chatId = ctx.chat.id
  const name = ctx.from?.first_name || 'Unknown'
  
  console.log(`\n✅ Meddelande från ${name}!`)
  console.log(`📱 Ditt Chat ID: ${chatId}`)
  console.log(`\n👆 Kopiera detta ID och ge det till mig!\n`)
  
  ctx.reply(`שלום ${name}! 👋\n\nה-Chat ID שלך: ${chatId}\n\nתעתיק את המספר הזה!`)
})

console.log('🤖 Väntar på meddelanden...')
console.log('📱 Öppna Telegram och skriv till @MivtzeiKSP_bot')
console.log('')

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
