import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  async findMe(@Req() request: Request) {
    // Récupérer l'utilisateur depuis le contexte de requête (défini par JwtStrategy)
    const user = request.user as any;
    
    // La stratégie JWT ajoute l'utilisateur avec 'id' et non 'sub'
    if (!user || !user.id) {
      throw new Error('Utilisateur non authentifié ou informations manquantes');
    }
    
    console.log(`Accès au profil utilisateur avec ID: ${user.id}, email: ${user.email}`);
    const userProfile = await this.usersService.findOne(user.id);
    
    // Supprimer le password_hash de la réponse pour des raisons de sécurité
    const { password_hash, ...userWithoutSensitiveData } = userProfile;
    
    return userWithoutSensitiveData;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
