import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: UsersRepository);
    getAllUsers(): Promise<{
        id: string;
        name: string | null;
        email: string;
        createdAt: Date;
    }[]>;
    getUserById(id: string): Promise<{
        id: string;
        name: string | null;
        email: string;
        createdAt: Date;
    }>;
    createUser(dto: CreateUserDto): Promise<{
        id: string;
        name: string | null;
        email: string;
        createdAt: Date;
    }>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
        id: string;
        name: string | null;
        email: string;
        updatedAt: Date;
    }>;
    softDeleteUser(id: string): Promise<{
        id: string;
        name: string | null;
        email: string;
        updatedAt: Date;
    }>;
}
