import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';

import { User, UserRole, UserStatus } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { RegisterDto, LoginDto, AuthTokensDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const handle = dto.handle.startsWith('@') ? dto.handle : `@${dto.handle}`;
    const existing = await this.users.findOne({ where: [{ email: dto.email }, { handle }] });
    if (existing) throw new ConflictException('Email or handle already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.save(
      this.users.create({
        name: dto.name,
        handle,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
    );

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Account is not active');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    user.lastLoginAt = new Date();
    await this.users.save(user);

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const hash = this.hashToken(refreshToken);
    const record = await this.tokens.findOne({
      where: { tokenHash: hash, expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    });
    if (!record || record.revokedAt) throw new UnauthorizedException('Invalid refresh token');

    record.revokedAt = new Date();
    await this.tokens.save(record);

    return this.issueTokens(record.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    await this.tokens.update({ tokenHash: hash }, { revokedAt: new Date() });
  }

  async validateUser(userId: number): Promise<User | null> {
    return this.users.findOne({ where: { id: userId } });
  }

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, sebi: user.sebi, sebiVerified: user.sebiVerified },
      {
        secret: this.cfg.get('JWT_ACCESS_SECRET'),
        expiresIn: this.cfg.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );
    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.tokens.save(
      this.tokens.create({ userId: user.id, tokenHash: this.hashToken(refreshToken), expiresAt }),
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        handle: user.handle,
        email: user.email,
        role: user.role,
        sebi: user.sebi,
        sebiVerified: user.sebiVerified,
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
