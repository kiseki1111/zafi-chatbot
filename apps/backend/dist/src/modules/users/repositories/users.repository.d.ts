import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class UsersRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        email: string;
    }[]>;
    findByEmail(email: string): Promise<{
        id: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        email: string;
        password: string;
        isActive: boolean;
        lastLogin: Date | null;
        role: string;
        deletedAt: Date | null;
    } | null>;
    findById(id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        email: string;
    } | null>;
    create(data: Prisma.UserCreateInput): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        email: string;
    }>;
    update(id: string, data: Prisma.UserUpdateInput): Promise<{
        id: string;
        updatedAt: Date;
        name: string | null;
        email: string;
    }>;
}
