# Telegram ATH Sweeper Trigger Bot

텔레그램 기반 ATH Sweeper 자동 트리거 봇

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new?template=https://github.com/arachne-dev/telegram-sweeper-trigger)

## 기능

- Cielo 봇의 ATH 입금 알림 감지
- Railway Sweeper Bot 자동 트리거
- 실시간 텔레그램 알림

## 사용 방법

1. Cielo 봇이 ATH 입금 알림을 보냄
2. 해당 메시지를 이 봇에게 전달(Forward)
3. 자동으로 Sweeper Bot이 작동하여 ATH 전송

## 환경 변수

```
TELEGRAM_BOT_TOKEN=your_bot_token
RAILWAY_WEBHOOK_URL=your_railway_sweeper_bot_url/trigger
ADMIN_CHAT_ID=your_telegram_chat_id
WEBHOOK_SECRET=your_secret
```

## 명령어

- `/start` - 봇 정보
- `/status` - 시스템 상태 확인
- `/test` - 테스트 트리거
