# AI

Project Test For AI

## send_command.py

A script to send `get_config` commands to a RabbitMQ exchange for each key listed in `key.txt`.

### Usage

1. Install dependencies:
   ```bash
   pip install pika
   ```
2. Edit `key.txt` to list the desired keys (it is pre-populated with common charger configuration keys).
3. Run the script:
   ```bash
   python send_command.py
   ```

The script will send one message per key to the `evmswss_command` exchange on the configured RabbitMQ server.
