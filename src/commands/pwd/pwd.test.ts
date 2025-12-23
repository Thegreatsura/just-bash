import { describe, it, expect } from 'vitest';
import { BashEnv } from '../../BashEnv.js';

describe('pwd', () => {
  it('should show default home directory', async () => {
    const env = new BashEnv();
    const result = await env.exec('pwd');
    expect(result.stdout).toBe('/home/user\n');
    expect(result.exitCode).toBe(0);
  });

  it('should show root directory when cwd is /', async () => {
    const env = new BashEnv({ cwd: '/' });
    const result = await env.exec('pwd');
    expect(result.stdout).toBe('/\n');
    expect(result.exitCode).toBe(0);
  });

  it('should show current directory', async () => {
    const env = new BashEnv({ cwd: '/home/user' });
    const result = await env.exec('pwd');
    expect(result.stdout).toBe('/home/user\n');
  });

  it('should reflect cd changes', async () => {
    const env = new BashEnv({
      files: { '/home/user/.keep': '' },
    });
    await env.exec('cd /home/user');
    const result = await env.exec('pwd');
    expect(result.stdout).toBe('/home/user\n');
  });

  it('should work after multiple cd commands', async () => {
    const env = new BashEnv({
      files: {
        '/a/.keep': '',
        '/b/.keep': '',
        '/c/.keep': '',
      },
    });
    await env.exec('cd /a');
    await env.exec('cd /b');
    await env.exec('cd /c');
    const result = await env.exec('pwd');
    expect(result.stdout).toBe('/c\n');
  });

  it('should work after cd ..', async () => {
    const env = new BashEnv({
      files: { '/parent/child/.keep': '' },
      cwd: '/parent/child',
    });
    await env.exec('cd ..');
    const result = await env.exec('pwd');
    expect(result.stdout).toBe('/parent\n');
  });

  it('should ignore arguments', async () => {
    const env = new BashEnv({ cwd: '/test' });
    const result = await env.exec('pwd ignored args');
    expect(result.stdout).toBe('/test\n');
  });
});
