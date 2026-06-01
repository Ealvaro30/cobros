import { Injectable, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local from the project root (works in both ts-node and compiled dist/)
const envPaths = [
  path.join(process.cwd(), '.env.local'),
  path.join(__dirname, '../../.env.local'),
  path.join(__dirname, '../../../.env.local'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    new Logger('ConfigService').log(`Loaded env from: ${envPath}`);
    break;
  }
}

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  get(key: string): string {
    return process.env[key] || '';
  }

  getSupabaseUrl(): string {
    const val = this.get('NEXT_PUBLIC_SUPABASE_URL');
    if (!val) this.logger.warn('NEXT_PUBLIC_SUPABASE_URL is not set');
    return val;
  }

  getSupabaseKey(): string {
    return this.get('SUPABASE_SERVICE_ROLE_KEY') || this.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}
