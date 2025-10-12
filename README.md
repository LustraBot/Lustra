<div align="center">
  <img src="icon.jpg" alt="Lustra" width="240" height="240">
  <h1>Lustra</h1>
  <p>Efficient Discord bot for quick content access</p>

  ![Version](https://img.shields.io/badge/version-1.1.0-purple)
  ![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
  ![License](https://img.shields.io/badge/license-Proprietary-red)
  ![Last Updated](https://img.shields.io/badge/last%20updated-2025-orange)
</div>

---

## About

Lustra is a Discord bot designed to streamline content delivery with efficient response times and smart rate limiting. Built for communities that value speed and reliability.

## Features

- Fast image and GIF delivery from multiple sources
- Intelligent rate limiting to prevent spam
- NSFW channel detection and enforcement
- Clean embed-based responses
- Multiple content batch processing
- Real-time latency monitoring

## Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/ping` | Check bot latency and response time | `/ping` |
| `/hentai` | Access NSFW content with type and count options | `/hentai type:image count:3` |
| `/help` | Display help information and command list | `/help commands:true` |
| `/about` | Show bot information and links | `/about` |
| `/setup` | Configuration and setup options | `/setup` |

## Installation

### Prerequisites
- Node.js 16.0.0 or higher
- Discord Bot Token
- Git

### Setup
1. Clone the repository
```bash
git clone https://github.com/brutiv/Lustra.git
cd Lustra
```

2. Install dependencies
```bash
npm install
```

3. Create environment file
```bash
cp .env.example .env
```

4. Configure your Discord bot token in `.env`
```
DISCORD_TOKEN=your_bot_token_here
```

5. Start the bot
```bash
npm start
```

## Configuration

The bot uses environment variables for configuration:

- `DISCORD_TOKEN` - Your Discord bot token (required)

## API Sources

- **Images**: waifu.pics API for reliable image delivery
- **GIFs**: waifu.im API with dynamic limit support

## Rate Limiting

- 5-second cooldown per user for content commands
- Automatic delay between multiple messages to prevent Discord rate limits
- Smart batch processing for multiple items

## Requirements

- NSFW commands require channels marked as NSFW
- Bot requires appropriate permissions in target channels
- Stable internet connection for API requests

## Support

- Join our [Discord server](https://discord.gg/W7MttaRT) for support
- Report issues on [GitHub](https://github.com/brutiv/Lustra/issues)
- Check the wiki for detailed documentation

## License

Copyright © 2025 Lustra.
All rights reserved.
This code is proprietary and may not be used, copied, modified,
or distributed without written permission.

## Contributing

Contributions are welcome. Please ensure your code follows the project's coding standards and includes appropriate tests.

---

<div align="center">
  <p>Made with dedication for efficient content delivery</p>
</div>

