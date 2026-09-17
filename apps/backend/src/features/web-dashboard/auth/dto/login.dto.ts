import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  //menvalidasi format penulisan email
  @IsEmail({}, { message: 'Format penulisan alamat email tidak valid.' })
  //menvalidasi email tidak kosong
  @IsNotEmpty({ message: 'Kolom email wajib diisi.' })
  email: string;

  @IsNotEmpty({ message: 'Kolom password wajib diisi.' })
  passwordPlain: string;
}
