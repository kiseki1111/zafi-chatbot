import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// DTO untuk memvalidasi perubahan data pengguna (opsional otomatis via PartialType)
export class UpdateUserDto extends PartialType(CreateUserDto) {}