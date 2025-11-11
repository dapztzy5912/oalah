const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function startBot() {
    console.log('🚀 Starting WhatsApp Bot...');
    
    // Auth state
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    
    // Create socket
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    // QR Code
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        
        if (qr) {
            console.log('📱 Scan QR Code ini dengan WhatsApp:');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            console.log('✅ Bot berhasil terhubung!');
        }
        
        if (connection === 'close') {
            console.log('❌ Koneksi terputus, restart bot...');
            startBot();
        }
    });

    // Save credentials
    sock.ev.on('creds.update', saveCreds);

    // Handle messages
    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        
        // Skip if message is from status broadcast or if no message
        if (message.key.remoteJid === 'status@broadcast' || !message.message) return;
        
        const text = message.message.conversation || 
                    message.message.extendedTextMessage?.text || 
                    message.message.imageMessage?.caption || '';
        
        const sender = message.key.remoteJid;
        const command = text.toLowerCase().trim();
        
        console.log(`📨 Pesan dari ${sender}: ${text}`);
        
        // Simple commands
        if (command === '!ping') {
            await sock.sendMessage(sender, { text: '🏓 Pong!' });
        }
        else if (command === '!menu') {
            const menu = `🤖 *BOT MENU*

📝 *Perintah yang tersedia:*
• !ping - Test bot
• !menu - Menu bot
• !info - Info bot
• !owner - Pemilik bot

📌 Bot sederhana by GitHub`;
            await sock.sendMessage(sender, { text: menu });
        }
        else if (command === '!info') {
            await sock.sendMessage(sender, { 
                text: '🤖 Bot WhatsApp Sederhana\nDibuat dengan Baileys\nHost: Termux' 
            });
        }
        else if (command === '!owner') {
            await sock.sendMessage(sender, { 
                text: '👨‍💻 Owner: Your Name\n📧 Contact: your@email.com' 
            });
        }
        else if (command.startsWith('!say ')) {
            const sayText = text.substring(5);
            if (sayText) {
                await sock.sendMessage(sender, { text: sayText });
            }
        }
    });

    // Handle errors
    sock.ev.on('connection.update', (update) => {
        const { lastDisconnect } = update;
        if (lastDisconnect?.error?.output?.statusCode !== 401) {
            startBot();
        }
    });
}

// Start bot
startBot().catch(console.error);
