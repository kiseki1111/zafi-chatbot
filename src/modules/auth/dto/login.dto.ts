import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
    @IsEmail({}, { message: 'Format penulisan alamat email tidak valid.' })
    @IsNotEmpty({ message: 'Kolom email wajib diisi.' })
    email: string;

    @IsNotEmpty({ message: 'Kolom password wajib diisi.' })
    @MinLength(8, { message: 'Password minimal harus sepanjang 8 karakter.' })
    passwordPlain: string;
}