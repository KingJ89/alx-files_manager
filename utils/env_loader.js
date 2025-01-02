import { existsSync, readFileSync } from 'fs';

/**
 * Loads environment variables based on the current execution context.
 */
const loadEnvironmentVariables = () => {
  const currentEvent = process.env.npm_lifecycle_event || 'development';
  const envFilePath = currentEvent.includes('test') || currentEvent.includes('coverage') ? '.env.test' : '.env';

  if (existsSync(envFilePath)) {
    const envFileData = readFileSync(envFilePath, 'utf-8').trim().split('\n');

    for (const line of envFileData) {
      const delimiterIndex = line.indexOf('=');
      const envVariable = line.substring(0, delimiterIndex);
      const envValue = line.substring(delimiterIndex + 1);
      process.env[envVariable] = envValue;
    }
  }
};

export default loadEnvironmentVariables;

