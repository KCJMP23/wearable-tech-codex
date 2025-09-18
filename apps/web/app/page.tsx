import { redirect } from 'next/navigation';
import { loadEnv } from '@affiliate-factory/sdk';

export default function IndexPage() {
  const env = loadEnv();
  redirect(`/${env.DEFAULT_TENANT_SLUG}`);
}
