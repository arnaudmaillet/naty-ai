import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit faire au moins 6 caractères' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom complet est obligatoire' })
  fullName!: string;
}