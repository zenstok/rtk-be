import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

let container: StartedTestContainer;

export interface TestDbConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export async function startTestDb(): Promise<TestDbConfig> {
  container = await new GenericContainer('postgres:17.5')
    .withEnvironment({
      POSTGRES_DB: 'rtk_test_db',
      POSTGRES_USER: 'rtk_user',
      POSTGRES_PASSWORD: 'rtk_password',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
    .start();

  return {
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: 'rtk_user',
    password: 'rtk_password',
    database: 'rtk_test_db',
  };
}

export async function stopTestDb(): Promise<void> {
  if (container) {
    await container.stop();
  }
}
