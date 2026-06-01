import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { WhatsappService } from './whatsapp.service';

interface QueuedMessage {
  to: string;
  content: string;
}

@Injectable()
export class AntiBotService {
  private readonly logger = new Logger(AntiBotService.name);
  private readonly QUEUE_KEY = 'whatsapp:message_queue';
  private processing = false;

  constructor(
    private readonly redisService: RedisService,
    private readonly whatsappService: WhatsappService,
  ) {
    this.startProcessingLoop();
  }

  async queueMessage(to: string, content: string) {
    const redis = this.redisService.getClient();
    await redis.lpush(this.QUEUE_KEY, JSON.stringify({ to, content }));
    this.logger.log(`Message queued for ${to}`);
  }

  private async startProcessingLoop() {
    if (this.processing) return;
    this.processing = true;

    while (true) {
      try {
        const redis = this.redisService.getClient();
        // Wait for a message in the queue
        const result = await redis.brpop(this.QUEUE_KEY, 5); // wait up to 5 seconds
        
        if (result) {
          const [, messageStr] = result;
          const msg: QueuedMessage = JSON.parse(messageStr);
          
          const client = this.whatsappService.getClient();
          if (client) {
            // Jitter: random delay between 2 and 6 seconds to simulate human typing
            const jitter = Math.floor(Math.random() * 4000) + 2000;
            this.logger.debug(`Applying jitter delay of ${jitter}ms for message to ${msg.to}`);
            await new Promise((resolve) => setTimeout(resolve, jitter));
            
            const formattedTo = msg.to.includes('@') ? msg.to : `${msg.to}@c.us`;

            // Simulate typing state
            await client.simulateTyping(formattedTo as any, true);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await client.simulateTyping(formattedTo as any, false);
            
            // Send the message
            await client.sendText(formattedTo as any, msg.content);
            this.logger.log(`Message sent to ${formattedTo}`);
          }
        }
      } catch (error) {
        this.logger.error('Error in anti-bot processing loop', error);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait before retrying on error
      }
    }
  }
}
