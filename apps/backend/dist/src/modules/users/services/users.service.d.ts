import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: UsersRepository);
    getAllUsers(): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        email: string;
    }[]>;
    getUserById(id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        email: string;
    }>;
    createUser(dto: CreateUserDto): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        email: string;
    }>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
        id: string;
        updatedAt: Date;
        name: string | null;
        email: string;
    }>;
    softDeleteUser(id: string): Promise<{
        id: string;
        updatedAt: Date;
        name: string | null;
        email: string;
    }>;
}
