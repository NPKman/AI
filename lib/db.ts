import mysql, { type Pool } from 'mysql2/promise';

let pool: Pool;

export function getPool() {
  if (!pool) {
    const {
      MYSQL_HOST,
      MYSQL_PORT,
      MYSQL_USER,
      MYSQL_PASSWORD,
      MYSQL_DATABASE,
      MYSQL_TIMEZONE
    } = process.env;

    if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
      throw new Error('MySQL environment variables are not fully defined');
    }

    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT ? Number(MYSQL_PORT) : 3306,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      timezone: MYSQL_TIMEZONE ?? 'Asia/Bangkok',
      connectionLimit: 10,
      dateStrings: true
    });
  }

  return pool;
}

export async function query<T>(sql: string, params: (string | number | null)[] = []) {
  const [rows] = await getPool().execute<T[]>(sql, params);
  return rows;
}
