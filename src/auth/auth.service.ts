import { HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { PostgresErrorCode } from 'src/database/postgresErrorCodes.enum';
import RegisterDto from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from 'src/interfaces/tokenPayload.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshTokenEntity } from './entities/RefreshToken.Entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,

  ) { }

  public async register(registrationData: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registrationData.password, 10);
    console.log(hashedPassword);
    try {
      const createdUser = await this.usersService.create({
        ...registrationData,
        password: hashedPassword,
      });
      createdUser.password = undefined;
      return createdUser;
    } catch (error) {
      if (error?.code === PostgresErrorCode.UniqueViolation) {
        throw new HttpException(
          'User with that email already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async getAuthenticatedUser(email: string, hashedPassword: string) {
    try {
      const user = await this.usersService.getByEmail(email);
      const isPasswordMatching = await bcrypt.compare(
        hashedPassword,
        user.password,
      );
      if (!isPasswordMatching) {
        throw new HttpException(
          'Wrong credentials provided',
          HttpStatus.BAD_REQUEST,
        );
      }
      user.password = undefined;
      return user;
    } catch (error) {
      this.logger.error(error.message);
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  public getCookieWithJwtToken(userId: number) {
    const payload: TokenPayload = { userId };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: '30m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async saveRefreshToken(
    userId: number,
    refreshToken: string,
    expiresAt: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ) {
    const hashedToken = await bcrypt.hash(refreshToken, 10); // Mã hóa token
    const refreshTokenEntity = this.refreshTokenRepository.create({
      user: { id: userId },
      token: hashedToken,
      expiresAt, // Sử dụng giá trị expiresAt đã được truyền hoặc mặc định
    });
  
    return this.refreshTokenRepository.save(refreshTokenEntity);
  }
  

  async validateRefreshToken(userId: number, refreshToken: string): Promise<boolean> {
    const refreshTokenEntity = await this.refreshTokenRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!refreshTokenEntity) {
      return false;
    }

    // So sánh refresh token
    return bcrypt.compare(refreshToken, refreshTokenEntity.token);
  }

  async deleteRefreshToken(userId: number): Promise<void> {
    const result = await this.refreshTokenRepository.delete({ user: { id: userId } });
    console.log(`Deleted refresh tokens for user ID ${userId}:`, result);
    if (result.affected === 0) {
      throw new NotFoundException(`No refresh tokens found for user with ID ${userId}`);
    }
  }
}

