# Command Charger UI

A lightweight web interface for composing and publishing charger configuration commands to the RabbitMQ exchange `evmswss_command`.

## Getting Started

1. Ensure the RabbitMQ Management API is reachable. By default the application targets:
   - Host: `0.0.0.0`
   - Port: `15672`
   - User: `gust`
   - Password: `gust`
   - Exchange: `command`
   - VHost: `/`

   These can be overridden with environment variables (`RABBITMQ_HOST`, `RABBITMQ_HTTP_PORT`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD`, `RABBITMQ_EXCHANGE`, `RABBITMQ_VHOST`).

2. Install Node.js 18+ (Node 20 LTS recommended).

3. Start the application:

   ```bash
   npm start
   ```

4. Open the interface in your browser at [http://localhost:3000](http://localhost:3000).

## Features

- Guided form for `get_config` and `set_config` commands with automatic JSON preview.
- Validation for IP address, command type, and key requirements.
- Optional custom JSON editor when advanced control is needed.
- One-click copy of the generated JSON payload.
- Publishes commands to RabbitMQ via the Management HTTP API.
