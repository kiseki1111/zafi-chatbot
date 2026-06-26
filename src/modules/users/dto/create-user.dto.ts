import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    //memastikan input adalah format email yang valid dan tidak boleh kosong
    @IsEmail({}, { message: 'Format email yang dimasukkan tidak valid' })
    @IsNotEmpty({ message: 'Email tidak boleh kosong' })
    email!: string;

    //memastikan kata sandi berupa string dengan panjang minimal 8 karakter
    @IsString({ message: 'Kata sandi harus berupa teks' })
    @MinLength(8, { message: 'Kata sandi minimal harus berisikan 8 karakter' })
    passwordPlain!: string;

    //memastikan nama berupa teks murni dan tidak kosong
    @IsString({ message: 'Nama harus berupa teks' })
    @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
    name!: string;
}