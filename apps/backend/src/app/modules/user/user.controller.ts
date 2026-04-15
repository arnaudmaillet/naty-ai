import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { SaveKeyDto } from './dto/save-key.dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.userService.getProfile(req.user.id);
  }

  @Post('keys')
  saveKey(@Req() req: any, @Body() dto: SaveKeyDto) {
    return this.userService.updateApiKey(req.user.id, dto.provider, dto.key);
  }
}