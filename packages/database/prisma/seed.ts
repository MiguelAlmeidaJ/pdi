import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, SystemRole } from '@prisma/client';
import * as argon2 from 'argon2';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main() {
  const connectionString = required('DATABASE_URL');
  const adminName = required('ADMIN_NAME');
  const adminEmail = required('ADMIN_EMAIL').toLowerCase();
  const adminPassword = required('ADMIN_PASSWORD');
  const bootstrapTeamName = process.env.ADMIN_TEAM_NAME?.trim() || 'Administração';

  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must have at least 12 characters');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (existing) {
      if (existing.systemRole !== SystemRole.ADMIN) {
        throw new Error(`User ${adminEmail} already exists but is not an ADMIN. Seed aborted.`);
      }
      console.log(`Admin already exists: ${adminEmail}. Nothing changed.`);
      return;
    }

    const adminCount = await prisma.user.count({
      where: { systemRole: SystemRole.ADMIN },
    });

    if (adminCount > 0 && process.env.ALLOW_ADDITIONAL_ADMIN_SEED !== 'true') {
      throw new Error(
        'An ADMIN already exists. Refusing to seed another one. Set ALLOW_ADDITIONAL_ADMIN_SEED=true only for an intentional recovery operation.',
      );
    }

    const slugBase = bootstrapTeamName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const passwordHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const admin = await prisma.$transaction(async (tx) => {
      const team = await tx.team.upsert({
        where: { slug: slugBase || 'administracao' },
        update: {},
        create: {
          name: bootstrapTeamName,
          slug: slugBase || 'administracao',
        },
      });

      return tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash,
          systemRole: SystemRole.ADMIN,
          hiredAt: new Date(),
          teamId: team.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          systemRole: true,
        },
      });
    });

    console.log(`Bootstrap admin created: ${admin.email} (${admin.id})`);
    console.log('For security, remove ADMIN_PASSWORD from .env after validating login.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
