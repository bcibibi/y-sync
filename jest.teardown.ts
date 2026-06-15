
import { execSync } from 'child_process';

export default async () => {
  console.log('Stopping Docker containers...');

  execSync('docker compose -f docker-compose.yml down', {
    stdio: 'inherit',
  });
};
