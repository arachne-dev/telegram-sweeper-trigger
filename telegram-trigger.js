// telegram-trigger.js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// 환경 변수
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RAILWAY_WEBHOOK = process.env.RAILWAY_WEBHOOK_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// 모니터링할 지갑 주소 (Sweeper Bot 지갑)
const WALLET_ADDRESS = '0x9838162275cf91905761b63Ff13C4a7479820c1C';
const WALLET_SHORT = '0x983816'; // Cielo 봇이 사용하는 축약형

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 텔레그램 Sweeper 트리거 봇 시작...');
console.log(`📍 모니터링 주소: ${WALLET_ADDRESS}`);

// 메시지 감지
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text || msg.caption || '';
    const from = msg.from?.username || msg.from?.first_name;

    // 전달된 메시지 확인 (Forwarded message from Cielo bot)
    const forwardFrom = msg.forward_from?.username || msg.forward_from?.first_name;

    // Cielo 봇 메시지만 처리 (직접 메시지 또는 전달된 메시지)
    const cieloBots = ['Cielo_free_9_bot', 'Cielo_free_5_bot'];
    const isCieloMessage = cieloBots.includes(from) || cieloBots.includes(forwardFrom);

    if (!isCieloMessage) return;

    console.log(`\n📩 Cielo 메시지 수신:`);
    console.log(text);
    console.log('---');

    // ATH 입금 감지
    // 패턴: "Transferred: 0.72 #ATH ($0.016) to 0xb992...c832d"
    const transferPattern = /Transferred:\s*(\d+\.?\d*)\s*#ATH/i;
    const match = text.match(transferPattern);

    // #0x983816 해시태그 확인 (우리 지갑 관련 트랜잭션)
    const isOurWallet = text.includes('#0x983816') ||
                        text.toLowerCase().includes(WALLET_ADDRESS.toLowerCase());

    if (match && isOurWallet) {
      const amount = parseFloat(match[1]);

      console.log(`🚨 ATH 트랜잭션 감지!`);
      console.log(`   금액: ${amount} ATH`);
      console.log(`   지갑: ${WALLET_SHORT}`);

      // Railway Sweeper Bot 트리거
      try {
        const payload = {
          action: 'sweep',
          amount: amount,
          wallet: WALLET_ADDRESS,
          timestamp: Date.now(),
          source: 'cielo_telegram',
          raw_message: text
        };

        console.log(`🔥 Sweeper Bot 트리거 중...`);
        console.log(`   URL: ${RAILWAY_WEBHOOK}`);

        const response = await axios.post(RAILWAY_WEBHOOK, payload, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'X-Trigger-Source': 'telegram-cielo',
            'X-Auth-Token': process.env.WEBHOOK_SECRET || 'default-secret'
          }
        });

        console.log('✅ Sweeper Bot 트리거 성공!');
        console.log('   응답:', response.data);

        // 관리자에게 성공 알림
        await bot.sendMessage(
          ADMIN_CHAT_ID,
          `🔥 *SWEEPER BOT 작동!*\n\n` +
          `💰 감지 금액: *${amount} ATH*\n` +
          `📍 지갑: \`${WALLET_SHORT}\`\n` +
          `⏰ 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n\n` +
          `✅ *트리거 성공*\n` +
          `응답: ${response.data.message || 'OK'}`,
          { parse_mode: 'Markdown' }
        );

      } catch (error) {
        console.error('❌ Sweeper Bot 트리거 실패!');
        console.error('   에러:', error.message);

        if (error.response) {
          console.error('   상태:', error.response.status);
          console.error('   데이터:', error.response.data);
        }

        // 관리자에게 에러 알림
        await bot.sendMessage(
          ADMIN_CHAT_ID,
          `⚠️ *SWEEPER BOT 트리거 실패!*\n\n` +
          `💰 감지 금액: ${amount} ATH\n` +
          `❌ 에러: \`${error.message}\`\n\n` +
          `🔍 Railway 로그를 확인하세요.`,
          { parse_mode: 'Markdown' }
        );
      }
    }

  } catch (error) {
    console.error('메시지 처리 오류:', error);
  }
});

// 봇 명령어
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `🤖 *ATH Sweeper 트리거 봇*\n\n` +
    `이 봇은 Cielo 봇의 ATH 입금 알림을 감지하여\n` +
    `자동으로 Sweeper Bot을 작동시킵니다.\n\n` +
    `📍 모니터링 지갑: \`${WALLET_SHORT}\`\n` +
    `🔗 Railway Webhook: ${RAILWAY_WEBHOOK ? '✅ 설정됨' : '❌ 미설정'}\n\n` +
    `명령어:\n` +
    `/status - 봇 상태 확인\n` +
    `/test - 테스트 트리거`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/status/, async (msg) => {
  try {
    const response = await axios.get(RAILWAY_WEBHOOK.replace('/trigger', '/'), {
      timeout: 5000
    });

    bot.sendMessage(
      msg.chat.id,
      `✅ *봇 상태: 정상*\n\n` +
      `🤖 모니터 봇: 실행 중\n` +
      `🚀 Sweeper Bot: ${response.data.status || '확인됨'}\n` +
      `⏱ Uptime: ${Math.floor((response.data.uptime || 0) / 60)}분`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    bot.sendMessage(
      msg.chat.id,
      `⚠️ *상태 확인 실패*\n\n` +
      `에러: ${error.message}`,
      { parse_mode: 'Markdown' }
    );
  }
});

bot.onText(/\/test/, async (msg) => {
  try {
    const response = await axios.post(RAILWAY_WEBHOOK, {
      action: 'sweep',
      amount: 0.001,
      wallet: WALLET_ADDRESS,
      timestamp: Date.now(),
      source: 'manual_test'
    }, { timeout: 10000 });

    bot.sendMessage(
      msg.chat.id,
      `✅ *테스트 트리거 성공*\n\n${JSON.stringify(response.data, null, 2)}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    bot.sendMessage(
      msg.chat.id,
      `❌ *테스트 실패*\n\n${error.message}`,
      { parse_mode: 'Markdown' }
    );
  }
});

// 에러 핸들링
bot.on('polling_error', (error) => {
  console.error('⚠️ Polling 오류:', error.code, error.message);
});

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n👋 봇 종료 중...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 봇 종료 중...');
  bot.stopPolling();
  process.exit(0);
});
