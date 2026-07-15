import { execSync } from 'child_process';
import path from 'path';

process.env.DEBUG = "y-sync:*,y-utils:*";

const cwd = path.join(import.meta.dirname, '..');

export default async () => {
    console.log("Building the project before running tests...");
    execSync('npm run build', {
        stdio: 'inherit',
        cwd
    });
};
