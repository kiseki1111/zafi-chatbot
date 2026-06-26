import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// DTO untuk memvalidasi pembuatan peran baru di sistem
export class CreateRoleDto {
    @IsString({ message: 'Nama peran harus berupa teks.' })
    @IsNotEmpty({ message: 'Kolom nama peran wajib diisi.' })
    // Baris Kompleks: Mengunci format nama peran agar hanya menerima huruf kapital dan garis bawah (snake_case/UPPERCASE) sesuai standar industri, contoh: ADMIN_PROPERTI
    @Matches(/^[A-Z_]+$/, { message: 'Nama peran harus berupa huruf kapital dan hanya boleh dipisahkan oleh garis bawah (_).' })
    name: string;

    @IsString({ message: 'Deskripsi harus berupa teks.' })
    @IsOptional()
    description?: string;
}