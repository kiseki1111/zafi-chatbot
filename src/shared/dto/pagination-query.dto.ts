import { IsOptional, IsString } from 'class-validator';

export class PaginationQueryDto {
    //menentukan halaman aktif (berikan nilai bawaan string '1' jika kosong)
    @IsOptional()
    @IsString()
    page?: string = '1';

    //menentukan batasan data per halaman (berikan nilai bawaan string '10' jika kosong)
    @IsOptional()
    @IsString()
    limit?: string = '10';

    //kata kunci pencarian berdasarkan nama atau email pengguna
    @IsOptional()
    @IsString()
    search?: string;
}