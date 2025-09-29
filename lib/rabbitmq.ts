import amqp from 'amqplib';

let channelPromise: Promise<amqp.Channel> | null = null;

export function getRabbitChannel() {
  if (!channelPromise) {
    const {
      RABBIT_HOST,
      RABBIT_PORT,
      RABBIT_USER,
      RABBIT_PASSWORD,
      RABBIT_VHOST,
      RABBIT_EXCHANGE,
      RABBIT_EXCHANGE_TYPE,
    } = process.env;

    if (!RABBIT_HOST || !RABBIT_USER || !RABBIT_PASSWORD || !RABBIT_EXCHANGE || !RABBIT_EXCHANGE_TYPE) {
      throw new Error('RabbitMQ environment variables are not fully defined');
    }

    channelPromise = (async () => {
      const port = RABBIT_PORT ? Number(RABBIT_PORT) : 5672;
      if (Number.isNaN(port)) {
        throw new Error('RabbitMQ port must be a valid number');
      }

      const connection = await amqp.connect({
        protocol: 'amqp',
        hostname: RABBIT_HOST,
        port,
        username: RABBIT_USER,
        password: RABBIT_PASSWORD,
        vhost: RABBIT_VHOST ?? '/',
      });

      const channel = await connection.createChannel();
      await channel.assertExchange(
        RABBIT_EXCHANGE,
        RABBIT_EXCHANGE_TYPE as amqp.Options.AssertExchange['type'],
        { durable: true },
      );
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
  const routingKey = RABBIT_ROUTING_KEY ?? ''; // fanout: ปล่อยว่าง

  const ok = channel.publish(RABBIT_EXCHANGE, routingKey, content, {
    contentType: 'application/json',
    persistent: true,
  });

  if (!ok) {
    throw new Error('ไม่สามารถส่งคำสั่งไปยัง RabbitMQ ได้');
  }
}
