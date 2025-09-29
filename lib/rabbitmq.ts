import amqp from 'amqplib';

let channelPromise: Promise<amqp.Channel> | null = null;

export function getRabbitChannel() {
  if (!channelPromise) {
    const { RABBIT_URL, RABBIT_EXCHANGE, RABBIT_EXCHANGE_TYPE } = process.env;
    if (!RABBIT_URL || !RABBIT_EXCHANGE || !RABBIT_EXCHANGE_TYPE) {
      throw new Error('RabbitMQ environment variables are not fully defined');
    }

    channelPromise = (async () => {
      const connection = await amqp.connect(RABBIT_URL);
      const channel = await connection.createChannel();
      await channel.assertExchange(RABBIT_EXCHANGE, RABBIT_EXCHANGE_TYPE as amqp.Options.AssertExchange['type'], {
        durable: true
      });
      return channel;
    })();
  }
  return channelPromise;
}

export async function publishJson(payload: unknown) {
  const { RABBIT_EXCHANGE, RABBIT_ROUTING_KEY } = process.env;
  if (!RABBIT_EXCHANGE) {
    throw new Error('RabbitMQ exchange is not defined');
  }
  const channel = await getRabbitChannel();
  const content = Buffer.from(JSON.stringify(payload));
  const routingKey = RABBIT_ROUTING_KEY ?? '';
  const published = channel.publish(RABBIT_EXCHANGE, routingKey, content, {
    contentType: 'application/json',
    persistent: true
  });
  if (!published) {
    throw new Error('ไม่สามารถส่งคำสั่งไปยัง RabbitMQ ได้');
  }
}
