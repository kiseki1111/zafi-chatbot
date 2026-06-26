import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Fungsi penanda rute publik (Bypass guard keamanan)
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);