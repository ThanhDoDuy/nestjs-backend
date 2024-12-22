import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import RegisterDto from './dto/register.dto';
import { LocalAuthenticationGuard } from './guards/localAuthentication.guard';
import RequestWithUser from 'src/interfaces/requestWithUser.interface';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  @Post('register')
  async register(@Body() registrationData: RegisterDto) {
    return this.authService.register(registrationData);
  }

  @HttpCode(200)
  @UseGuards(LocalAuthenticationGuard)
  @Post('log-in')
  async logIn(@Req() request: RequestWithUser) {
    const { user } = request;
  
    const { accessToken, refreshToken } = this.authService.getCookieWithJwtToken(user.id);
    await this.authService.saveRefreshToken(user.id, refreshToken);
    // Set cookies using response helper
    request.res.cookie('Authentication', accessToken, {
      httpOnly: true,
      maxAge: 3600000,
    });
    request.res.cookie('Refresh', refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  
    user.password = undefined;
    return { accessToken, refreshToken };
  }
  

  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() request: Request, @Res() response: Response) {
    const refreshToken = request.cookies?.Refresh;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      console.log(payload);
      const isValid = await this.authService.validateRefreshToken(payload.userId, refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const { accessToken, refreshToken: newRefreshToken } =
        this.authService.getCookieWithJwtToken(payload.userId);

      // Lưu refresh token mới vào database
      await this.authService.saveRefreshToken(
        payload.userId,
        newRefreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      response.cookie('Authentication', accessToken, {
        httpOnly: true,
        maxAge: 30 * 60 * 1000,
      });

      response.cookie('Refresh', newRefreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return response.send({ accessToken });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @HttpCode(200)
  @Post('log-out')
  async logOut(@Req() request: Request, @Res() response: Response) {
    const refreshToken = request.cookies?.Refresh;
    if (refreshToken) {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      await this.authService.deleteRefreshToken(payload.userId);
    }

    // clear cookies
    response.clearCookie('Authentication');
    response.clearCookie('Refresh');
    return response.send({ message: 'Logged out successfully' });
  }

}
