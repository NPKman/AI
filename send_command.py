import json
import pika

RABBITMQ_HOST = '10.101.1.35'
RABBITMQ_PORT = 5672
RABBITMQ_USER = 'administrator'
RABBITMQ_PASS = 'EVEFT@tc'
EXCHANGE = 'evmswss_command'


def main():
    # Read keys from key.txt, ignoring blank lines
    with open('key.txt', 'r') as f:
        keys = [line.strip() for line in f if line.strip()]

    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    connection_params = pika.ConnectionParameters(host=RABBITMQ_HOST,
                                                  port=RABBITMQ_PORT,
                                                  credentials=credentials)

    connection = pika.BlockingConnection(connection_params)
    channel = connection.channel()

    for key in keys:
        payload = {
            "charger": {
                "ipaddress": "10.112.7.65",
                "command": "get_config",
                "key_name": key
            }
        }
        channel.basic_publish(exchange=EXCHANGE, routing_key='', body=json.dumps(payload))
        print(f"Sent command for key: {key}")

    connection.close()


if __name__ == '__main__':
    main()
