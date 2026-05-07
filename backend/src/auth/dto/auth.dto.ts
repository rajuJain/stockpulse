import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString() @MaxLength(120) name: string;
  @IsString() @MinLength(3) @MaxLength(50) @Matches(/^@?[a-zA-Z0-9_]+$/) handle: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(100) password: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class RefreshTokenDto {
  @IsString() refreshToken: string;
}

export class AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    name: string;
    handle: string;
    email: string;
    role: string;
    sebi: boolean;
    sebiVerified: boolean;
  };
}
