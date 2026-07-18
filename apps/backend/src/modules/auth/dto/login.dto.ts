import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
    //menvalidasi format penulisan email
    @IsEmail({}, { message: 'Format penulisan alamat email tidak valid.' })
    //menvalidasi email tidak kosong
    @IsNotEmpty({ message: 'Kolom email wajib diisi.' })
    email: string;

    //menvalidasi password tidak kosong
    @IsNotEmpty({ message: 'Kolom password wajib diisi.' })
    //menvalidasi panjang password minimal 8 karakter
    @MinLength(8, { message: 'Password minimal harus sepanjang 8 karakter.' })
    passwordPlain: string;
}